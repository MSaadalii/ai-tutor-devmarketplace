import { z } from "zod";
import type { AppLanguage, BoardOperation, NarrationStep } from "./types";

export const boardOpTypeSchema = z.enum([
  "add_text",
  "add_shape",
  "update_label",
  "highlight",
  "clear_highlight",
]);

export const boardOperationSchema: z.ZodType<BoardOperation> = z.object({
  type: boardOpTypeSchema,
  payload: z.record(z.string(), z.unknown()),
});

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

export const narrationStepSchema: z.ZodType<NarrationStep> = z.preprocess(
  (raw) => normalizeNarrationStep(raw),
  z.object({
    order: z.number().int().nonnegative(),
    operation: boardOperationSchema,
    spokenLine: z.string().max(160),
    language: z.enum(["en", "ur"]),
  }),
) as z.ZodType<NarrationStep>;

export const narrationStepsSchema = z.preprocess((raw) => {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === "object") {
    const v = raw as Record<string, unknown>;
    return v.steps ?? v.narrationSteps ?? v.items ?? raw;
  }
  return raw;
}, z.array(narrationStepSchema).max(8));

/** Validate LLM JSON before any draw call. Never draw unvalidated ops. */
export function parseNarrationSteps(raw: unknown): NarrationStep[] {
  return narrationStepsSchema.parse(raw);
}
