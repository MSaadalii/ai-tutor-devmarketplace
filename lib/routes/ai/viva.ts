import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { callGeminiJson } from "@/lib/ai/gemini";
import {
  pickBank,
  vivaQuestionSchema,
  vivaQuestionsSchema,
  vivaRubricSchema,
} from "@/lib/ai/viva";
import { toErrorResponse } from "@/lib/apiError";
import { requireOwnedSession } from "@/lib/routes/sessionGuard";

const base = { session_id: z.string().uuid(), language: z.enum(["en", "ur"]).default("en") };
const requestSchema = z.discriminatedUnion("action", [
  z.object({ ...base, action: z.literal("questions") }),
  z.object({
    ...base,
    action: z.literal("score"),
    question: vivaQuestionSchema,
    transcript: z.string().max(1500),
  }),
  z.object({
    ...base,
    action: z.literal("save"),
    provider: z.enum(["vapi", "web_speech", "captions"]),
    items: z
      .array(
        z.object({
          question: z.string().max(300),
          transcript: z.string().max(1500),
          input: z.enum(["mic", "text", "none"]),
          score: vivaRubricSchema.nullable(),
        }),
      )
      .min(1)
      .max(3),
  }),
]);

const SYSTEM =
  "You are an oral-exam examiner for a school tutor. Reply with JSON only. Be strict and honest; never invent facts.";

export async function handleViva(request: Request) {
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
      .from("learning_sessions").select("pack_id, topic_brief, detective_outcome")
      .eq("id", req.session_id).eq("user_id", user.id).single();
    if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
    const isBrief = !session.pack_id;
    const langNote = req.language === "ur" ? "Write in Urdu." : "Write in English.";

    if (req.action === "questions") {
      if (!isBrief) {
        return NextResponse.json({ mode: "pack", source: "bank", questions: pickBank(session.detective_outcome ?? undefined) });
      }
      const { data: steps } = await supabase
        .from("narration_steps").select("spoken_line")
        .eq("session_id", req.session_id).eq("language", req.language)
        .order("step_order", { ascending: true });
      if (!steps?.length) {
        return NextResponse.json({ error: "Play the explanation first so the viva can use the narration." }, { status: 400 });
      }
      const lines = steps.map((s, i) => `${i + 1}. ${s.spoken_line}`).join("\n");
      const { output } = await callGeminiJson({
        sessionId: req.session_id, userId: user.id, role: "viva", supabase, system: SYSTEM,
        schema: vivaQuestionsSchema,
        prompt:
          `Topic brief:\n${session.topic_brief}\n\nNarration the student heard:\n${lines}\n\n` +
          `Write 2-3 short oral questions answerable ONLY from the brief and narration above. Do not add facts that are not in them. ` +
          `Each has "concepts": the key ideas a good answer contains. ${langNote}\n` +
          `JSON: {"questions":[{"question":"...","concepts":["..."]}]}`,
      });
      return NextResponse.json({ mode: "brief", source: "gemini", questions: output.questions });
    }

    if (req.action === "score") {
      if (!req.transcript.trim()) {
        return NextResponse.json({ score: { verdict: "incorrect", feedback: "No answer was given.", confidence: 1 } });
      }
      const { output } = await callGeminiJson({
        sessionId: req.session_id, userId: user.id, role: "viva", supabase, system: SYSTEM,
        schema: vivaRubricSchema,
        prompt:
          `Question: ${req.question.question}\nKey concepts expected: ${req.question.concepts.join("; ")}\n` +
          `Student answer (may be speech-to-text): ${req.transcript}\n\n` +
          `Grade against the key concepts only: "correct" (all main ideas), "partial" (some), "incorrect". ` +
          `One-line feedback, confidence 0-1. ${langNote}\n` +
          `JSON: {"verdict":"correct|partial|incorrect","feedback":"...","confidence":0.0}`,
      });
      return NextResponse.json({ score: output });
    }

    const { error } = await supabase.from("attempts").insert({
      session_id: req.session_id,
      user_id: user.id,
      phase: "viva",
      prompt: req.items.map((i) => i.question).join(" | "),
      response: req.items.map((i) => i.transcript).join(" | "),
      correct: null, // viva is never a mastery claim
      metadata: {
        kind: isBrief ? "brief" : "pack",
        ungraded: isBrief,
        provider: req.provider,
        language: req.language,
        questions: req.items.map((i) => i.question),
        items: req.items,
      },
    });
    if (error) return NextResponse.json({ saved: false, error: error.message });
    return NextResponse.json({ saved: true });
  } catch (error) {
    return toErrorResponse(error, "Viva failed");
  }
}
