import type { LessonPackMeta } from "@/types";

export const BINOMIAL_SQUARE_ID = "binomial_square";

export function listPacks(): LessonPackMeta[] {
  return [
    {
      id: BINOMIAL_SQUARE_ID,
      version: "1",
      title: "Binomial Squares",
    },
  ];
}

export async function loadPackJson(packId: string): Promise<unknown | null> {
  if (packId !== BINOMIAL_SQUARE_ID) return null;
  try {
    const data = await import("@/content/packs/binomial_square/v1.json");
    return data.default ?? data;
  } catch {
    return null;
  }
}
