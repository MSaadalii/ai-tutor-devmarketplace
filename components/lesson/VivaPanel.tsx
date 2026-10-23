"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { speakLine, cancelSpeech } from "@/lib/voice/speech";
import { speakVapi, cancelVapi, connectVapi, isVapiReady } from "@/lib/voice/vapi";
import { listenOnce, isRecognitionSupported } from "@/lib/voice/recognize";
import type { VivaQuestion, VivaRubric } from "@/lib/ai/viva";
import type { AppLanguage } from "@/types";

type Item = {
  question: string;
  transcript: string;
  input: "mic" | "text" | "none";
  score: VivaRubric | null;
};
type Provider = "vapi" | "web_speech" | "captions";

const LIMIT_S = 60;

async function api<T>(body: Record<string, unknown>): Promise<T> {
  const res = await fetch("/api/ai/viva", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  let data: { error?: string } = {};
  try { data = await res.json(); } catch { /* non-JSON */ }
  if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
  return data as T;
}

export function VivaPanel({
  sessionId, language, isBrief, onCaption, onOpenChange,
}: {
  sessionId: string;
  language: AppLanguage;
  isBrief: boolean;
  onCaption: (t: string) => void;
  onOpenChange?: (open: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  useEffect(() => { onOpenChange?.(open); }, [open, onOpenChange]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<VivaQuestion[]>([]);
  const [idx, setIdx] = useState(0);
  const [text, setText] = useState("");
  const [listening, setListening] = useState(false);
  const [micNote, setMicNote] = useState<string | null>(null);
  const [left, setLeft] = useState(LIMIT_S);
  const [items, setItems] = useState<Item[]>([]);
  const [saveNote, setSaveNote] = useState<string | null>(null);
  const providerRef = useRef<Provider>("captions");
  const inputRef = useRef<"mic" | "text" | "none">("none");
  const stopListen = useRef<() => void>(() => {});
  const submitting = useRef(false);

  const done = open && questions.length > 0 && items.length === questions.length;
  const q = questions[idx];

  function speak(line: string) {
    onCaption(line);
    cancelSpeech();
    cancelVapi();
    const web = () => {
      speakLine(line, language, undefined, () => {});
      if (providerRef.current !== "vapi") providerRef.current = "web_speech";
    };
    if (isVapiReady()) {
      providerRef.current = "vapi";
      speakVapi(line, language, () => {}, web);
    } else {
      web();
    }
  }

  async function start() {
    setBusy(true); setError(null); setItems([]); setIdx(0); setText(""); setSaveNote(null);
    try {
      const data = await api<{ questions: VivaQuestion[] }>({ action: "questions", session_id: sessionId, language });
      setQuestions(data.questions);
      setOpen(true);
      await connectVapi().catch(() => false);
      speak(data.questions[0].question);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start the viva.");
    } finally {
      setBusy(false);
    }
  }

  async function submit(auto = false) {
    if (!q || submitting.current) return;
    submitting.current = true;
    stopListen.current(); setListening(false);
    cancelSpeech(); cancelVapi();
    const transcript = text.trim();
    const input = transcript ? inputRef.current === "none" ? "text" : inputRef.current : "none";
    setBusy(true);
    let score: VivaRubric | null = null;
    try {
      score = (await api<{ score: VivaRubric }>({ action: "score", session_id: sessionId, language, question: q, transcript })).score;
    } catch { score = null; }
    const next = [...items, { question: q.question, transcript, input, score } as Item];
    setItems(next);
    setText(""); inputRef.current = "none"; setMicNote(auto ? "Time was up for that question." : null);
    setBusy(false);
    submitting.current = false;
    if (next.length < questions.length) {
      setIdx(next.length);
      speak(questions[next.length].question);
    } else {
      onCaption(isBrief ? "Viva finished (ungraded topic practice)." : "Viva finished.");
      try {
        await api({ action: "save", session_id: sessionId, language, provider: providerRef.current, items: next });
        setSaveNote("Viva saved.");
      } catch {
        setSaveNote("Could not save the viva; your lesson is unaffected.");
      }
    }
  }
  const submitRef = useRef(submit);
  submitRef.current = submit;

  // Per-question countdown.
  useEffect(() => {
    if (!open || done || !q) return;
    setLeft(LIMIT_S);
    const t = setInterval(() => setLeft((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [open, done, idx, q]);
  useEffect(() => {
    if (left <= 0 && open && !done && !busy) void submitRef.current(true);
  }, [left, open, done, busy]);

  useEffect(() => () => { stopListen.current(); cancelSpeech(); cancelVapi(); }, []);

  function mic() {
    setMicNote(null);
    if (!isRecognitionSupported()) {
      setMicNote("Voice input is not supported here. Type your answer instead.");
      return;
    }
    cancelSpeech(); cancelVapi();
    setListening(true);
    stopListen.current = listenOnce(language, {
      onInterim: (t) => setText(t),
      onFinal: (t) => { setText(t); inputRef.current = "mic"; setListening(false); },
      onError: (m) => { setMicNote(m); setListening(false); },
    });
  }

  function endViva() {
    stopListen.current(); setListening(false);
    cancelSpeech(); cancelVapi();
    setOpen(false);
  }

  if (!open) {
    return (
      <div className="lesson-card space-y-2 p-4 text-sm">
        <p>{isBrief ? "Try a short oral viva on this topic (ungraded practice)." : "Try a short oral viva on what you learned."}</p>
        <Button onClick={() => void start()} disabled={busy}>{busy ? "Preparing…" : "Start viva"}</Button>
        {error ? <p className="text-red-700" role="alert">{error} The rest of the lesson still works.</p> : null}
      </div>
    );
  }

  return (
    <section className="lesson-card space-y-3 p-4 text-sm" aria-label="Viva">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-medium">Viva{isBrief ? " · Ungraded topic practice" : ""}</h2>
        <Button size="sm" variant="outline" onClick={endViva}>End viva</Button>
      </div>
      {listening ? <p className="font-medium text-teal-800" role="status">● Listening…</p> : null}
      {!done && q ? (
        <>
          <p className="text-xs text-stone-600">Question {idx + 1} of {questions.length} · {Math.max(0, left)}s left</p>
          <p className="font-medium" aria-live="polite">{q.question}</p>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => speak(q.question)}>Hear again</Button>
            <Button size="sm" variant="outline" onClick={mic} disabled={listening || busy}>{listening ? "Listening…" : "Answer by mic"}</Button>
          </div>
          <textarea
            className="w-full rounded-md border border-stone-300 p-2"
            rows={3} maxLength={1500} value={text} placeholder="Or type your answer…"
            onChange={(e) => { setText(e.target.value); if (inputRef.current === "none") inputRef.current = "text"; }}
          />
          {micNote ? <p className="text-stone-600">{micNote}</p> : null}
          <Button onClick={() => void submit()} disabled={busy}>{busy ? "Scoring…" : "Submit answer"}</Button>
        </>
      ) : null}
      {items.length ? (
        <ul className="space-y-2">
          {items.map((it, i) => (
            <li key={i} className="rounded-md bg-stone-50 p-2">
              <p className="font-medium">{it.question}</p>
              <p className="text-stone-600">Your answer: {it.transcript || "—"}</p>
              {it.score ? (
                <p>
                  <span className="font-medium">{it.score.verdict}</span> · {it.score.feedback}{" "}
                  <span className="text-stone-500">(confidence {Math.round(it.score.confidence * 100)}%)</span>
                </p>
              ) : (
                <p className="text-amber-800">Could not score this answer. No result is recorded as a pass.</p>
              )}
            </li>
          ))}
        </ul>
      ) : null}
      {done ? (
        <p className="text-stone-600">
          {isBrief ? "Ungraded topic practice: no mastery claim. " : ""}{saveNote}
        </p>
      ) : null}
      {error ? <p className="text-red-700">{error}</p> : null}
    </section>
  );
}
