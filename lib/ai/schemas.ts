import { z } from "zod";

/** Approved board operation types. */
export const boardOpTypeSchema = z.enum([
  "add_text",
  "add_shape",
  "update_label",
  "highlight",
  "clear_highlight",
]);

/** Board op payload is flexible; the renderer validates required fields. */
export const boardOperationSchema = z.object({
  type: boardOpTypeSchema,
  payload: z.record(z.string(), z.unknown()),
});

/** A single narrated step: one board operation + one spoken caption line. */
export const narrationStepSchema = z.object({
  order: z.number().int().nonnegative(),
  operation: boardOperationSchema,
  spokenLine: z.string().max(160),
  language: z.enum(["en", "ur"]),
});

/** Board Tutor response: ≤6 validated steps + optional notes. */
export const boardTutorResponseSchema = z.object({
  steps: z.array(narrationStepSchema).max(6),
  notes: z.string().max(500).optional(),
});

/** Detective probe: a short follow-up question. */
export const detectiveProbeSchema = z.object({
  question: z.string().max(200),
});

/** Detective outcome for the pack path. */
export const detectiveOutcomeSchema = z.object({
  outcome: z.enum([
    "misconception_identified",
    "insufficient_evidence",
    "correct_answer",
    "arithmetic_slip",
    "unrecognized_reasoning",
  ]),
  misconception_id: z.string().max(64).optional(),
  confidence: z.number().min(0).max(1),
  probes: z.array(detectiveProbeSchema).max(2).optional(),
  explanation: z.string().max(500),
});

/** Quiz Coach response: explanation after deterministic app grading. */
export const quizCoachResponseSchema = z.object({
  explanation: z.string().max(500),
  // true if the coach refused to give a hint (quiz must stay no-hint)
  hint_denied: z.boolean().optional(),
});

/** Mid-lesson text-question answer from Board Tutor. */
export const boardAnswerResponseSchema = z.object({
  answer: z.string().max(500),
  steps: z.array(narrationStepSchema).max(3).optional(),
});

export type BoardOpType = z.infer<typeof boardOpTypeSchema>;
export type BoardOperation = z.infer<typeof boardOperationSchema>;
export type NarrationStep = z.infer<typeof narrationStepSchema>;
export type BoardTutorResponse = z.infer<typeof boardTutorResponseSchema>;
export type DetectiveProbe = z.infer<typeof detectiveProbeSchema>;
export type DetectiveOutcome = z.infer<typeof detectiveOutcomeSchema>;
export type QuizCoachResponse = z.infer<typeof quizCoachResponseSchema>;
export type BoardAnswerResponse = z.infer<typeof boardAnswerResponseSchema>;
