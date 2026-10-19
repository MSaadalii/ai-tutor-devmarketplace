import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { gradeBinomialExpansion } from "@/lib/grading/algebra";
import { runQuizCoach } from "@/lib/ai/quizCoach";
import { getQuizItem } from "@/lib/packs/binomial_square";
import { toErrorResponse } from "@/lib/apiError";
import { requireOwnedSession } from "@/lib/routes/sessionGuard";

const requestSchema = z.object({
  session_id: z.string().uuid(),
  item_seed: z.string().min(1).max(64),
  answer: z.string().min(1).max(500),
  language: z.enum(["en", "ur"]).default("en"),
  explain: z.boolean().default(true),
});

export async function handleQuizExplain(request: Request) {
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

    const { session_id, item_seed, answer, language, explain } = parsed.data;

    const denied = await requireOwnedSession(supabase, session_id, user.id);
    if (denied) return denied;

    const item = getQuizItem(item_seed);
    if (!item) {
      return NextResponse.json(
        { error: `Unknown quiz item: ${item_seed}` },
        { status: 404 },
      );
    }

    const prompt = language === "ur" ? item.urduPrompt : item.prompt;
    const grade = gradeBinomialExpansion(item.expected, answer);

    let explanation = grade.message ?? "";
    if (explain && grade.completion) {
      try {
        const coach = await runQuizCoach({
          sessionId: session_id,
          userId: user.id,
          problem: prompt,
          studentAnswer: answer,
          grade,
          language,
          supabase,
        });
        explanation = coach.explanation;
      } catch (coachError) {
        console.error("Quiz coach failed:", coachError);
      }
    }

    try {
      await supabase.from("quiz_results").insert({
        session_id,
        user_id: user.id,
        item_seed,
        answer,
        completion: grade.completion,
        correct: grade.correctness,
        explanation,
      });

      await supabase.from("attempts").insert({
        session_id,
        user_id: user.id,
        phase: "quiz",
        prompt,
        response: answer,
        correct: grade.correctness,
        metadata: {
          item_seed,
          completion: grade.completion,
          explanation,
        },
      });
    } catch (persistError) {
      console.error("Failed to persist quiz result:", persistError);
    }

    return NextResponse.json({
      item_seed,
      prompt,
      answer,
      completion: grade.completion,
      correct: grade.correctness,
      explanation,
    });
  } catch (error) {
    return toErrorResponse(error, "Quiz grading failed");
  }
}
