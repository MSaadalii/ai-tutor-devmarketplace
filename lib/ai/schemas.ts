import { z } from "zod";

/** Board ops — expand during Taha AI lane. */
export const boardOperationSchema = z.object({
  type: z.enum([
    "add_text",
    "add_shape",
    "update_label",
    "highlight",
    "clear_highlight",
  ]),
  payload: z.record(z.string(), z.unknown()),
});

export const narrationStepSchema = z.object({
  order: z.number().int().nonnegative(),
  operation: boardOperationSchema,
  spokenLine: z.string().max(160),
  language: z.enum(["en", "ur"]),
});

export const boardTutorResponseSchema = z.object({
  steps: z.array(narrationStepSchema).max(6),
  notes: z.string().optional(),
});

export type BoardOperation = z.infer<typeof boardOperationSchema>;
export type NarrationStep = z.infer<typeof narrationStepSchema>;
export type BoardTutorResponse = z.infer<typeof boardTutorResponseSchema>;
