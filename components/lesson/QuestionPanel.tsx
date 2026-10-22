"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function QuestionPanel({
  selectedElementIds,
  answerText,
  onAsk,
}: {
  selectedElementIds: string[];
  answerText: string | null;
  onAsk: (text: string) => Promise<void | string | null>;
}) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleAsk() {
    setLoading(true);
    await onAsk(text);
    setLoading(false);
    setText("");
  }

  return (
    <section className="rounded-lg border border-stone-200 bg-white p-4">
      <h2 className="font-medium">Ask about the board</h2>
      <p className="text-sm text-stone-600">
        Selected elements: {selectedElementIds.join(", ") || "none"}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Why are there two 3x rectangles?"
          className="h-10 flex-1 rounded-md border border-stone-300 px-3 text-sm"
        />
        <Button onClick={() => void handleAsk()} disabled={loading || !text}>
          {loading ? <><span className="warm-spinner" aria-hidden="true" /> Asking…</> : "Ask"}
        </Button>
      </div>
      {answerText ? (
        <p className="mt-3 text-sm text-stone-700">{answerText}</p>
      ) : null}
    </section>
  );
}
