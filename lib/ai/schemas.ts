import { z } from "zod";
import type {
  AppLanguage,
  BoardOperation,
  NarrationStep,
  DetectiveOutcome,
} from "@/types";

/** Approved board operation types. */
export const boardOpTypeSchema = z.enum([
  "add_text",
  "add_shape",
  "update_label",
  "highlight",
  "clear_highlight",
]);

/** Board op payload is flexible; the renderer validates required fields. */
export const boardOperationSchema: z.ZodType<BoardOperation> = z.object({
  type: boardOpTypeSchema,
  payload: z.record(z.string(), z.unknown()),
});

/**
 * Coerce the `operation` field in each step before Zod validates it.
 *
 * Gemini sometimes returns operation as:
 *   - A bare string:  "add_text"
 *     → coerce to { type: "add_text", payload: {} }
 *   - An object missing payload: { type: "add_text" }
 *     → add payload: {}
 *   - A fully-formed object: { type: "add_text", payload: { ... } }
 *     → leave unchanged
 */
function coerceOperation(raw: unknown, stepPayload?: unknown): unknown {
  if (typeof raw === "string") {
    const payload =
      stepPayload && typeof stepPayload === "object" && !Array.isArray(stepPayload)
        ? stepPayload
        : {};
    return { type: raw, payload };
  }
  if (raw !== null && typeof raw === "object" && !Array.isArray(raw)) {
    const op = raw as Record<string, unknown>;
    if (op.payload === undefined || op.payload === null) {
      return { ...op, payload: {} };
    }
  }
  return raw;
}

/**
 * A single narrated step. Gemini occasionally uses alternate names, omits
 * metadata, nests a step, or returns only the caption. Normalize those shapes
 * before the existing strict operation/type validation runs. The merge layer
 * supplies the authoritative seeded operation for caption-only steps.
 */
export const narrationStepSchema: z.ZodType<NarrationStep> = z.preprocess(
  (raw) => normalizeNarrationStep(raw),
  z.object({
    order: z.number().int().nonnegative(),
    operation: boardOperationSchema,
    spokenLine: z.string().max(160),
    language: z.enum(["en", "ur"]),
  }),
) as z.ZodType<NarrationStep>;

function normalizeNarrationStep(raw: unknown, index = 0): unknown {
  if (typeof raw === "string") {
    return {
      order: index,
      operation: { type: "highlight", payload: {} },
      spokenLine: raw,
      language: "en" satisfies AppLanguage,
    };
  }
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) return raw;

  const value = raw as Record<string, unknown>;
  // Some responses wrap each item as { step: {...} } or { narration: {...} }.
  const nested = value.step ?? value.narration ?? value.item;
  if (nested !== undefined && nested !== value) {
    return normalizeNarrationStep(nested, index);
  }
  const spokenLine = value.spokenLine ?? value.spoken_line ?? value.caption;
  const operation = value.operation ?? value.op;
  return {
    ...value,
    order: value.order ?? index,
    operation: coerceOperation(operation ?? "highlight", value.payload),
    spokenLine: spokenLine ?? "",
    language: value.language === "ur" ? "ur" : "en",
  };
}

/**
 * Board Tutor response: ≤6 validated steps + optional notes.
 *
 * Gemini sometimes returns a raw array of steps instead of the canonical
 * `{ "steps": [...] }` object. The preprocess coerces an array to the right
 * shape before Zod validates it, so the schema is resilient to both forms.
 */
export const boardTutorResponseSchema = z.preprocess(
  (v) => normalizeBoardTutorResponse(v),
  z.object({
    steps: z.array(narrationStepSchema).max(6),
    notes: z.string().max(500).optional(),
  }),
);

function normalizeBoardTutorResponse(raw: unknown): unknown {
  if (Array.isArray(raw)) {
    return { steps: raw.map((step, index) => normalizeNarrationStep(step, index)) };
  }
  if (raw === null || typeof raw !== "object") return raw;

  const value = raw as Record<string, unknown>;
  const rawSteps = value.steps ?? value.narrationSteps ?? value.items ?? [];
  if (!Array.isArray(rawSteps)) return { ...value, steps: [] };
  return {
    ...value,
    steps: rawSteps.map((step, index) => normalizeNarrationStep(step, index)),
  };
}

export type BoardTutorResponse = z.infer<typeof boardTutorResponseSchema>;

/**
 * Detective probe: a short follow-up question. Gemini sometimes returns a bare
 * string instead of {question}; coerce strings to the canonical object shape.
 */
export const detectiveProbeSchema = z.preprocess(
  (v) => (typeof v === "string" ? { question: v.trim() } : v),
  z.object({
    question: z.string().min(1).max(200),
  }),
);

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

export type DetectiveResultSchema = z.infer<typeof detectiveOutcomeSchema>;

/** Quiz Coach response: explanation after deterministic app grading. */
export const quizCoachResponseSchema = z.object({
  explanation: z.string().max(500),
  // true if the coach refused to give a hint (quiz must stay no-hint)
  hint_denied: z.boolean().optional(),
});

export type QuizCoachResponse = z.infer<typeof quizCoachResponseSchema>;

/** Mid-lesson text-question answer from Board Tutor. */
export const boardAnswerResponseSchema = z.object({
  answer: z.string().max(500),
  steps: z.array(narrationStepSchema).max(3).optional(),
});

export type BoardAnswerResponse = z.infer<typeof boardAnswerResponseSchema>;

// Re-export canonical runtime types so callers can import schema + type from one place.
export type { DetectiveOutcome, BoardOperation, NarrationStep } from "@/types";
