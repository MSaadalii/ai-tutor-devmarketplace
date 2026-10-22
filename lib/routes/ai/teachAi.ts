import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { callGeminiJson } from "@/lib/ai/gemini";
import { plantedSchema, teachRubricSchema, teachScoreSchema, validOps } from "@/lib/ai/teachAi";
import { getPack, getMisconception } from "@/lib/packs/binomial_square";
import { toErrorResponse } from "@/lib/apiError";
import { requireOwnedSession } from "@/lib/routes/sessionGuard";

const base = { session_id: z.string().uuid(), language: z.enum(["en", "ur"]).default("en") };
const requestSchema = z.discriminatedUnion("action", [
  z.object({ ...base, action: z.literal("plant") }),
  z.object({
    ...base,
    action: z.literal("score"),
    planted: plantedSchema,
    explanation: z.string().min(1).max(1500),
  }),
  z.object({
    ...base,
    action: z.literal("save"),
    planted: plantedSchema,
    explanation: z.string().max(1500),
    input: z.enum(["mic", "text"]).default("text"),
    rubric: teachRubricSchema.nullable(),
  }),
]);

const SYSTEM =
  "You role-play a confused learner inside a school tutor and then grade the student's correction. Reply with JSON only. Be honest; never invent facts.";

export async function handleTeachAi(request: Request) {
  try {
    const supabase = await getSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const parsed = requestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request", details: parsed.error.message }, { status: 400 });
    }
    const req = parsed.data;
    const denied = await requireOwnedSession(supabase, req.session_id, user.id);
    if (denied) return denied;

    const { data: session } = await supabase
      .from("learning_sessions").select("pack_id, topic_brief, misconception_id")
      .eq("id", req.session_id).eq("user_id", user.id).single();
    if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
    const isBrief = !session.pack_id;
    const langNote = req.language === "ur" ? "Write in Urdu." : "Write in English.";

    if (req.action === "plant") {
      if (!isBrief) {
        const pack = getPack();
        const m = (session.misconception_id && getMisconception(session.misconception_id)?.claim
          ? getMisconception(session.misconception_id)
          : pack.misconceptions.find((x) => x.claim)) ?? null;
        if (!m?.claim) return NextResponse.json({ error: "This pack has no misconception catalog entry." }, { status: 404 });
        return NextResponse.json({ kind: "pack", source: "catalog", planted: { statement: m.claim, misconception_id: m.id } });
      }
      const { output } = await callGeminiJson({
        sessionId: req.session_id, userId: user.id, role: "teach_ai", supabase, system: SYSTEM,
        schema: plantedSchema,
        prompt:
          `Topic brief:\n${session.topic_brief}\n\n` +
          `Play a confused learner. State ONE plausible but wrong belief about this topic, in first person, 1-2 sentences, ` +
          `as a learner honestly might believe it. ${langNote}\nJSON: {"statement":"..."}`,
      });
      return NextResponse.json({ kind: "brief", source: "gemini", planted: { statement: output.statement } });
    }

    if (req.action === "score") {
      const { output } = await callGeminiJson({
        sessionId: req.session_id, userId: user.id, role: "teach_ai", supabase, system: SYSTEM,
        schema: teachScoreSchema,
        prompt:
          (isBrief ? `Topic brief:\n${session.topic_brief}\n\n` : `Topic: squaring binomials, e.g. (x+3)^2 = x^2 + 6x + 9.\n\n`) +
          `The confused learner said (WRONG): ${req.planted.statement}\n` +
          `The student's correction: ${req.explanation}\n\n` +
          `Pass only if the student clearly identifies why the claim is wrong and gives a correct fix. Otherwise fail. ` +
          `Feedback: one short sentence. confidence 0-1. Optionally "ops": at most 2 add_text board ops showing the fix, ` +
          `each {"type":"add_text","payload":{"id":"fix_1","text":"short text","x":40,"y":40}} (x,y between 0 and 1000). ${langNote}\n` +
          `JSON: {"rubric":{"pass":true,"feedback":"...","confidence":0.0},"ops":[]}`,
      });
      return NextResponse.json({ rubric: output.rubric, ops: validOps(output.ops) });
    }

    const { error } = await supabase.from("attempts").insert({
      session_id: req.session_id,
      user_id: user.id,
      phase: "teach_ai",
      prompt: req.planted.statement,
      response: req.explanation,
      correct: null, // teach-back is never a mastery claim
      metadata: {
        planted: req.planted,
        explanation: req.explanation,
        rubric: req.rubric,
        kind: isBrief ? "brief" : "pack",
        ungraded: isBrief,
        input: req.input,
        language: req.language,
      },
    });
    if (error) return NextResponse.json({ saved: false, error: error.message });
    return NextResponse.json({ saved: true });
  } catch (error) {
    return toErrorResponse(error, "Teach the AI failed");
  }
}
