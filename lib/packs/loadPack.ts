import { BINOMIAL_SQUARE_PACK, BINOMIAL_SQUARE_ID } from "@/lib/packs/binomial_square";
import type { LessonPackMeta } from "@/types";

export { BINOMIAL_SQUARE_ID } from "@/lib/packs/binomial_square";

export function listPacks(): LessonPackMeta[] {
  return [
    {
      id: BINOMIAL_SQUARE_ID,
      version: BINOMIAL_SQUARE_PACK.version,
      title: BINOMIAL_SQUARE_PACK.title,
    },
  ];
}

export async function loadPackJson(packId: string): Promise<unknown | null> {
  if (packId !== BINOMIAL_SQUARE_ID) return null;
  return BINOMIAL_SQUARE_PACK as unknown;
}
