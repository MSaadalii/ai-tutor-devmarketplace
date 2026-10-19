"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function BoardTaskPanel({
  onSubmit,
  result,
}: {
  onSubmit: () => Promise<void>;
  result: { correct: boolean; message: string } | null;
}) {
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setLoading(true);
    await onSubmit();
    setLoading(false);
  }

  return (
    <section className="rounded-lg border border-stone-200 bg-white p-4">
      <h2 className="font-medium">Tap the two regions that make the 2bx term</h2>
      <p className="text-sm text-stone-600">
        In the area model, the middle term 6x comes from two rectangles.
      </p>
      <div className="mt-3 flex gap-2">
        <Button onClick={() => void handleSubmit()} disabled={loading}>
          {loading ? "Checking…" : "Check selection"}
        </Button>
      </div>
      {result ? (
        <p
          className={`mt-3 text-sm ${
            result.correct ? "text-teal-700" : "text-red-600"
          }`}
        >
          {result.message}
        </p>
      ) : null}
    </section>
  );
}
