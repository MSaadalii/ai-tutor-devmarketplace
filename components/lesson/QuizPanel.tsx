"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { QuizItem } from "@/lib/packs/binomial_square";
import type { AppLanguage } from "@/types";

export type QuizResult = {
  item_seed: string;
  prompt: string;
  answer: string;
  correct: boolean;
  completion: boolean;
  explanation: string;
};

export function QuizPanel({
  items,
  language,
  results,
  onSubmit,
  onFinish,
}: {
  items: QuizItem[];
  language: AppLanguage;
  results: QuizResult[];
  onSubmit: (seed: string, answer: string) => Promise<void>;
  onFinish: () => Promise<void>;
}) {
  const [index, setIndex] = useState(results.length);
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);

  const current = items[index];
  const finished = index >= items.length;

  async function handleSubmit() {
    if (!current) return;
    setLoading(true);
    await onSubmit(current.seed, answer);
    setLoading(false);
    setAnswer("");
    setIndex((i) => i + 1);
  }

  if (finished || !current) {
    return (
      <section className="space-y-2 rounded-lg border border-stone-200 bg-white p-4">
        <h2 className="font-medium">Quiz results</h2>
        {results.map((r) => (
          <div
            key={r.item_seed}
            className={`rounded-md p-2 text-sm ${
              r.correct ? "bg-teal-50 text-teal-900" : "bg-red-50 text-red-900"
            }`}
          >
            <p className="font-medium">{r.prompt}</p>
            <p>Your answer: {r.answer}</p>
            <p className="text-stone-600">{r.explanation}</p>
          </div>
        ))}
        <Button onClick={() => void onFinish()}>Show summary</Button>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-stone-200 bg-white p-4">
      <h2 className="font-medium">
        Quiz {index + 1} of {items.length}
      </h2>
      <p className="text-lg text-stone-800">
        {language === "ur" ? current.urduPrompt : current.prompt}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <input
          type="text"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Expanded form…"
          className="h-10 flex-1 rounded-md border border-stone-300 px-3 text-sm"
        />
        <Button onClick={() => void handleSubmit()} disabled={loading || !answer}>
          {loading ? "Submitting…" : "Submit"}
        </Button>
      </div>
    </section>
  );
}
