import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { toErrorResponse } from "@/lib/apiError";
import { requireOwnedSession } from "@/lib/routes/sessionGuard";

const requestSchema = z.object({
  session_id: z.string().uuid(),
  language: z.enum(["en", "ur"]).default("en"),
});

export async function POST(request: Request) {
  try {
    const supabase = await getSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.message },
        { status: 400 },
      );
    }

    const { session_id, language } = parsed.data;

    const denied = await requireOwnedSession(supabase, session_id, user.id);
    if (denied) return denied;

    // Fetch stored narration steps and quiz results.
    const { data: steps, error: stepsError } = await supabase
      .from("narration_steps")
      .select("spoken_line, step_order")
      .eq("session_id", session_id)
      .eq("language", language)
      .order("step_order", { ascending: true });

    const { data: quizzes } = await supabase
      .from("quiz_results")
      .select("item_seed, completion, correct")
      .eq("session_id", session_id)
      .order("created_at", { ascending: true });

    const { data: session, error: sessionError } = await supabase
      .from("learning_sessions")
      .select("detective_outcome, misconception_id, pack_id")
      .eq("id", session_id)
      .single();

    if (sessionError || !session) throw new Error("Could not load lesson context.");
    if (stepsError) throw new Error("Could not load saved narration for the summary.");
    const isBrief = session.pack_id === null;
    if (isBrief && !steps?.length) {
      return NextResponse.json({ error: "Play and save the topic explanation before creating a summary." }, { status: 400 });
    }
    const bullets: string[] = isBrief ? [language === "ur"
      ? "یہ سبق غیر درجہ بند ہے۔ کوئی کوئز یا اسکور نہیں؛ مہارت کی تصدیق نہیں کی گئی۔"
      : "Ungraded topic lesson. No quiz or score; understanding and mastery have not been assessed."] : [];

    if (!isBrief && session?.detective_outcome) {
      bullets.push(
        language === "ur"
          ? `تشخیص: ${session.detective_outcome}.`
          : `Diagnosis: ${session.detective_outcome}.`,
      );
    }

    (steps ?? []).forEach((step) => {
      if (step.spoken_line) bullets.push(step.spoken_line);
    });

    const quizSummary = (quizzes ?? []).map((q) =>
      language === "ur"
        ? `${q.item_seed}: ${q.correct ? "درست" : "غلط"}`
        : `${q.item_seed}: ${q.correct ? "correct" : "incorrect"}`,
    );

    if (!isBrief && quizSummary.length > 0) {
      bullets.push(
        language === "ur"
          ? `کویز کے نتائج: ${quizSummary.join(", ")}`
          : `Quiz results: ${quizSummary.join(", ")}`,
      );
    }

    const summary = {
      bullets,
      language,
      pack_id: session?.pack_id ?? null,
    };

    try {
      const { error: saveError } = await supabase.from("lesson_summaries").upsert(
        {
          session_id,
          user_id: user.id,
          bullets,
          language,
        },
        { onConflict: "session_id" },
      );

      if (isBrief && saveError) throw new Error(`Could not save summary: ${saveError.message}`);

      const { error: completeError } = await supabase
        .from("learning_sessions")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", session_id)
        .eq("user_id", user.id);
      if (isBrief && completeError) throw new Error(`Could not complete lesson: ${completeError.message}`);
    } catch (persistError) {
      if (isBrief) throw persistError;
      console.error("Failed to persist summary:", persistError);
    }

    return NextResponse.json(summary);
  } catch (error) {
    return toErrorResponse(error, "Summary failed");
  }
}
