import type { BinomialPack } from "@/lib/packs/binomial_square";
import type {
  AppLanguage,
  BoardOperation,
  NarrationStep,
} from "@/types";

export const RESULT_LABEL_ID = "result_label";
export const RESULT_LABEL_TEXT = "x^2 + 6x + 9";
export const TEACH_STEP_COUNT = 6;

/** Element ids that exist in the default area-model scene. */
function knownElementIds(pack: BinomialPack): Set<string> {
  return new Set<string>([
    ...Object.values(pack.areaModel.regionIds),
    RESULT_LABEL_ID,
    "label_a_side",
    "label_b_side",
    "label_a_side_left",
    "label_b_side_left",
  ]);
}

/**
 * Deterministic 6-step operation script seeded from the pack's region ids.
 * Every op carries payload.elementId (and text for update_label).
 */
export function buildSeededOps(pack: BinomialPack): BoardOperation[] {
  const r = pack.areaModel.regionIds;
  return [
    { type: "highlight", payload: { elementId: r.a2 } },
    { type: "highlight", payload: { elementId: r.ab1 } },
    { type: "highlight", payload: { elementId: r.ab2 } },
    { type: "highlight", payload: { elementId: r.b2 } },
    // applyOperation resets prior selection each step; label reveals the result.
    {
      type: "update_label",
      payload: { elementId: RESULT_LABEL_ID, text: RESULT_LABEL_TEXT },
    },
    { type: "highlight", payload: { elementId: r.ab1 } },
  ].slice(0, TEACH_STEP_COUNT) as BoardOperation[];
}

function nonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function finiteNum(v: unknown): boolean {
  if (v === null || v === "" || typeof v === "boolean") return false;
  return Number.isFinite(Number(v));
}

/** True only if the op carries a payload the renderer can actually use. */
export function hasRealPayload(
  op: BoardOperation | undefined,
  known: Set<string>,
): boolean {
  if (!op || typeof op !== "object") return false;
  const p = op.payload as Record<string, unknown> | undefined;
  if (!p || typeof p !== "object") return false;

  switch (op.type) {
    case "highlight":
    case "clear_highlight":
      return nonEmptyString(p.elementId) && known.has(p.elementId);
    case "update_label":
      return (
        nonEmptyString(p.elementId) &&
        known.has(p.elementId) &&
        typeof p.text === "string"
      );
    case "add_text":
      return nonEmptyString(p.text) && finiteNum(p.x) && finiteNum(p.y);
    case "add_shape":
      return (
        nonEmptyString(p.elementId) &&
        (known.has(p.elementId) ||
          (finiteNum(p.x) && finiteNum(p.y)))
      );
    default:
      return false;
  }
}

/**
 * Merge Gemini teach steps with the pack-seeded script. Always returns steps
 * ordered 0..5. Per step i: operation = Gemini's if it has real payload fields,
 * else seeded[i]; spokenLine = Gemini's or pack.narrationSeeds[language][i].
 */
export function mergeTeachSteps(
  geminiSteps: NarrationStep[],
  pack: BinomialPack,
  language: AppLanguage,
): NarrationStep[] {
  const seeded = buildSeededOps(pack);
  const known = knownElementIds(pack);
  const seeds = pack.narrationSeeds[language] ?? pack.narrationSeeds.en;

  // Order by Gemini's `order` (stable), then address by position.
  const ordered = geminiSteps
    .map((s, idx) => ({ s, idx }))
    .sort((a, b) => (a.s.order ?? 0) - (b.s.order ?? 0) || a.idx - b.idx)
    .map((x) => x.s);

  const out: NarrationStep[] = [];
  for (let i = 0; i < seeded.length; i++) {
    const g = ordered[i];
    const useGemini = g ? hasRealPayload(g.operation, known) : false;
    const line = g?.spokenLine?.trim()
      ? g.spokenLine.trim()
      : (seeds[i] ?? seeds[seeds.length - 1] ?? "");
    out.push({
      order: i,
      operation: useGemini
        ? {
            type: g!.operation.type,
            payload: { ...g!.operation.payload },
          }
        : {
            type: seeded[i].type,
            payload: { ...seeded[i].payload },
          },
      spokenLine: line.slice(0, 160),
      language,
    });
  }
  return out;
}
