import { z } from "zod";

export const vivaQuestionSchema = z.object({
  question: z.string().min(5).max(300),
  concepts: z.array(z.string().min(1).max(200)).min(1).max(5),
});
export const vivaQuestionsSchema = z.object({
  questions: z.array(vivaQuestionSchema).min(2).max(3),
});
export type VivaQuestion = z.infer<typeof vivaQuestionSchema>;

export const vivaRubricSchema = z.object({
  verdict: z.enum(["correct", "partial", "incorrect"]),
  feedback: z.string().min(1).max(300),
  confidence: z.number().min(0).max(1),
});
export type VivaRubric = z.infer<typeof vivaRubricSchema>;

/** Pack-aware bank for (x+3)^2 — used without needing a model call. */
export const BINOMIAL_VIVA_BANK: VivaQuestion[] = [
  {
    question: "Why is (x+3) squared not equal to x squared plus 9?",
    concepts: [
      "(x+3)^2 means (x+3)(x+3)",
      "there are two cross terms that are missed by x^2+9",
    ],
  },
  {
    question: "Explain where the 6x in x squared plus 6x plus 9 comes from.",
    concepts: ["two regions of area 3x in the area model", "3x + 3x = 6x, i.e. 2ab"],
  },
  {
    question: "Describe the four regions of the area model for (x+3) squared and their areas.",
    concepts: ["x^2 region", "two 3x regions", "a 3 by 3 region of area 9"],
  },
];

export function pickBank(diagnosisOutcome?: string): VivaQuestion[] {
  const bank = [...BINOMIAL_VIVA_BANK];
  // When the student had the misconception, lead with the "why not x^2+9" question.
  if (diagnosisOutcome && diagnosisOutcome !== "misconception_identified") bank.push(bank.shift()!);
  return bank.slice(0, 3);
}
