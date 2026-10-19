import { quizCoachResponseSchema } from "@/lib/ai/schemas";
import { callGeminiJson, type GeminiRole } from "@/lib/ai/gemini";
import type { AlgebraGrade } from "@/lib/grading/algebra";
import type { SupabaseClient } from "@supabase/supabase-js";

export type QuizCoachInput = {
  sessionId: string;
  userId: string;
  problem: string;
  studentAnswer: string;
  grade: AlgebraGrade;
  language: "en" | "ur";
  supabase?: SupabaseClient;
};

export type QuizCoachResult = {
  explanation: string;
  hintDenied?: boolean;
};

const ROLE: GeminiRole = "quiz_coach";

export async function runQuizCoach(
  input: QuizCoachInput,
): Promise<QuizCoachResult> {
  const prompt = buildPrompt(input);

  const { output } = await callGeminiJson({
    sessionId: input.sessionId,
    userId: input.userId,
    role: ROLE,
    prompt,
    schema: quizCoachResponseSchema,
    system: SYSTEM,
    supabase: input.supabase,
  });

  return {
    explanation: output.explanation,
    hintDenied: output.hint_denied,
  };
}

const SYSTEM = `
You are a quiz coach. The student's answer has already been graded by the app.
Your job is to give a short, encouraging explanation of why the answer is correct or wrong.
Do NOT give the answer away. Do NOT provide step-by-step hints that let the student solve the current item without thinking. If the user asks for a hint, politely decline and say the quiz has no hints.
`;

function buildPrompt(input: QuizCoachInput): string {
  const languageNote =
    input.language === "ur"
      ? "Respond in Urdu. Equations stay in Latin/LTR."
      : "Respond in English.";

  return `
Problem: ${input.problem}
Student answer: ${input.studentAnswer}
Completion: ${input.grade.completion ? "passed" : "failed"}
Correctness: ${input.grade.correctness ? "correct" : "incorrect"}
App message: ${input.grade.message ?? "none"}

${languageNote}

Return JSON with:
- explanation: concise feedback (max 500 chars)
- hint_denied: true (the quiz has no hints)
`;
}
