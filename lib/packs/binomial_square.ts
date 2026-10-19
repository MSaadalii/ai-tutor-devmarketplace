import v1 from "@/content/packs/binomial_square/v1.json";
import type { AppLanguage } from "@/types";

export type Misconception = {
  id: string;
  label: string;
  probes: string[];
};

export type QuizItem = {
  seed: string;
  prompt: string;
  urduPrompt: string;
  expected: string;
  type: "input";
};

export type BinomialPack = {
  id: string;
  version: string;
  title: string;
  examplePrompt: string;
  commonWrong: string;
  language: AppLanguage;
  areaModel: {
    aLabel: string;
    bLabel: string;
    regionIds: {
      a2: string;
      ab1: string;
      ab2: string;
      b2: string;
    };
  };
  misconceptions: Misconception[];
  boardTaskElementIds: string[];
  quiz: QuizItem[];
  narrationSeeds: Record<AppLanguage, string[]>;
  notes: string;
};

export const BINOMIAL_SQUARE_PACK: BinomialPack = v1 as BinomialPack;

export const BINOMIAL_SQUARE_ID = "binomial_square";

export function getPack(): BinomialPack {
  return BINOMIAL_SQUARE_PACK;
}

export function getQuizItem(seed: string): QuizItem | undefined {
  return BINOMIAL_SQUARE_PACK.quiz.find((q) => q.seed === seed);
}

export function getMisconception(id: string): Misconception | undefined {
  return BINOMIAL_SQUARE_PACK.misconceptions.find((m) => m.id === id);
}
