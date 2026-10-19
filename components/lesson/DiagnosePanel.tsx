"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export type Diagnosis = {
  outcome: string;
  explanation: string;
  probes?: { question: string }[];
  misconception_id?: string;
};

export function DiagnosePanel({
  problem,
  onDiagnose,
  diagnosis,
  probeAnswers,
}: {
  problem: string;
  onDiagnose: (answer: string, probeAnswers: string[]) => Promise<void>;
  diagnosis: Diagnosis | null;
  probeAnswers: string[];
}) {
  // Pre-filled with the example wrong answer so the first click is always valid.
  const [answer, setAnswer] = useState("x^2 + 9");
  const [currentProbeAnswer, setCurrentProbeAnswer] = useState("");
  const [loading, setLoading] = useState(false);

  const activeProbe =
    diagnosis?.probes && probeAnswers.length < diagnosis.probes.length
      ? diagnosis.probes[probeAnswers.length]
      : null;

  async function handleSubmit() {
    setLoading(true);
    if (activeProbe) {
      const nextAnswers = [...probeAnswers, currentProbeAnswer];
      // The parent commits the probe answers only after the API call succeeds.
      await onDiagnose(answer, nextAnswers);
      setCurrentProbeAnswer("");
    } else {
      await onDiagnose(answer, probeAnswers);
    }
    setLoading(false);
  }

  return (
    <section className="rounded-lg border border-stone-200 bg-white p-4">
      <h2 className="font-medium">Step 1 — Diagnose: expand {problem}</h2>
      <p className="text-sm text-stone-600">
        A student wrote <span className="font-mono">x^2 + 9</span> below. Submit it
        so the AI tutor can find the misconception. Play unlocks after the diagnosis.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <input
          type="text"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Type the expansion, e.g. x^2 + 6x + 9"
          aria-label="Student answer"
          className="h-10 flex-1 rounded-md border border-stone-300 px-3 text-sm"
        />
        <Button onClick={() => void handleSubmit()} disabled={loading || !answer}>
          {loading ? "Diagnosing…" : "Submit"}
        </Button>
      </div>

      {activeProbe ? (
        <div className="mt-4 space-y-3">
          <p className="text-sm font-medium">Follow-up probe</p>
          <p className="text-sm text-stone-700">{activeProbe.question}</p>
          <input
            type="text"
            value={currentProbeAnswer}
            onChange={(e) => setCurrentProbeAnswer(e.target.value)}
            placeholder="Your answer…"
            className="h-10 w-full rounded-md border border-stone-300 px-3 text-sm"
          />
          <Button onClick={() => void handleSubmit()} disabled={loading || !currentProbeAnswer}>
            {loading ? "Diagnosing…" : "Continue diagnosis"}
          </Button>
        </div>
      ) : null}
    </section>
  );
}
