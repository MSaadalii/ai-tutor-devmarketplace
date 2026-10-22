import { z } from "zod";
import { boardOperationSchema } from "@/lib/ai/schemas";
import type { BoardOperation } from "@/types";

export const plantedSchema = z.object({
  statement: z.string().min(5).max(300),
  misconception_id: z.string().max(64).optional(),
});
export type Planted = z.infer<typeof plantedSchema>;

export const teachRubricSchema = z.object({
  pass: z.boolean(),
  feedback: z.string().min(1).max(300),
  confidence: z.number().min(0).max(1),
});
export type TeachRubric = z.infer<typeof teachRubricSchema>;

const num = z.number().finite().min(0).max(1000);

/** Only simple, bounded text labels may be drawn from teach-back output. */
const drawableOp = boardOperationSchema.refine((op: BoardOperation) => {
  const p = op.payload;
  return (
    op.type === "add_text" &&
    typeof p.text === "string" &&
    p.text.length > 0 &&
    p.text.length <= 80 &&
    num.safeParse(p.x).success &&
    num.safeParse(p.y).success &&
    typeof p.id === "string" &&
    p.id.length <= 40
  );
}, "Only bounded add_text ops are allowed");

export const teachScoreSchema = z.object({
  rubric: teachRubricSchema,
  ops: z.array(z.unknown()).optional(),
});

/** Keep at most 2 ops that individually validate; drop everything else. */
export function validOps(raw: unknown[] | undefined): BoardOperation[] {
  const out: BoardOperation[] = [];
  for (const r of raw ?? []) {
    const parsed = drawableOp.safeParse(r);
    if (parsed.success) out.push(parsed.data);
    if (out.length >= 2) break;
  }
  return out;
}
