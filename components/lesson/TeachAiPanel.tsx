"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { speakLine, cancelSpeech } from "@/lib/voice/speech";
import { speakVapi, cancelVapi, connectVapi, isVapiReady } from "@/lib/voice/vapi";
import { listenOnce, isRecognitionSupported } from "@/lib/voice/recognize";
import type { Planted, TeachRubric } from "@/lib/ai/teachAi";
import type { AppLanguage, BoardOperation } from "@/types";

async function api<T>(body: Record<string, unknown>): Promise<T> {
  const res = await fetch("/api/ai/teach-ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  let data: { error?: string } = {};
  try { data = await res.json(); } catch { /* non-JSON */ }
  if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
  return data as T;
}

export function TeachAiPanel({
  sessionId, language, isBrief, onCaption, onBoardOps,
}: {
  sessionId: string;
  language: AppLanguage;
  isBrief: boolean;
  onCaption: (t: string) => void;
  onBoardOps?: (ops: BoardOperation[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [planted, setPlanted] = useState<Planted | null>(null);
  const [text, setText] = useState("");
  const [listening, setListening] = useState(false);
  const [micNote, setMicNote] = useState<string | null>(null);
  const [rubric, setRubric] = useState<TeachRubric | null>(null);
  const [scored, setScored] = useState(false);
  const [saveNote, setSaveNote] = useState<string | null>(null);
  const inputRef = useRef<"mic" | "text">("text");
  const stopListen = useRef<() => void>(() => {});

  function speak(line: string) {
    onCaption(line);
    cancelSpeech();
    cancelVapi();
    const web = () => speakLine(line, language, undefined, () => {});
    if (isVapiReady()) speakVapi(line, language, () => {}, web);
    else web();
  }

  async function start() {
    setBusy(true); setError(null); setRubric(null); setScored(false); setText(""); setSaveNote(null);
    try {
      const data = await api<{ planted: Planted }>({ action: "plant", session_id: sessionId, language });
      setPlanted(data.planted);
      setOpen(true);
      await connectVapi().catch(() => false);
      speak(data.planted.statement);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start Teach the AI.");
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    if (!planted || !text.trim() || busy) return;
    stopListen.current(); setListening(false);
    cancelSpeech(); cancelVapi();
    setBusy(true);
    let result: TeachRubric | null = null;
    try {
      const data = await api<{ rubric: TeachRubric; ops: BoardOperation[] }>({
        action: "score", session_id: sessionId, language, planted, explanation: text.trim(),
      });
      result = data.rubric;
      if (data.ops?.length) onBoardOps?.(data.ops);
    } catch { result = null; }
    setRubric(result);
    setScored(true);
    if (result) onCaption(result.feedback);
    try {
      await api({
        action: "save", session_id: sessionId, language, planted,
        explanation: text.trim(), input: inputRef.current, rubric: result,
      });
      setSaveNote("Attempt saved.");
    } catch {
      setSaveNote("Could not save this attempt; your lesson is unaffected.");
    }
    setBusy(false);
  }

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

  if (!open) {
    return (
      <div className="lesson-card space-y-2 p-4 text-sm">
        <p>Teach the AI: a confused learner makes a mistake. Can you correct it?{isBrief ? " (ungraded practice)" : ""}</p>
        <Button onClick={() => void start()} disabled={busy}>{busy ? "Preparing…" : "Teach the AI"}</Button>
        {error ? <p className="text-red-700" role="alert">{error} The rest of the lesson still works.</p> : null}
      </div>
    );
  }

  return (
    <section className="lesson-card space-y-3 p-4 text-sm" aria-label="Teach the AI">
      <h2 className="font-medium">Teach the AI{isBrief ? " · Ungraded practice" : ""}</h2>
      <p className="rounded-md bg-amber-50 p-2" aria-live="polite">
        <span className="font-medium">Confused learner:</span> {planted?.statement}
      </p>
      {!scored ? (
        <>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => planted && speak(planted.statement)}>Hear again</Button>
            <Button size="sm" variant="outline" onClick={mic} disabled={listening || busy}>{listening ? "Listening…" : "Answer by mic"}</Button>
          </div>
          <textarea
            className="w-full rounded-md border border-stone-300 p-2"
            rows={4} maxLength={1500} value={text} placeholder="Explain what is wrong and how to fix it…"
            onChange={(e) => { setText(e.target.value); inputRef.current = inputRef.current === "mic" ? "mic" : "text"; }}
          />
          {micNote ? <p className="text-stone-600">{micNote}</p> : null}
          <Button onClick={() => void submit()} disabled={busy || !text.trim()}>{busy ? "Scoring…" : "Submit correction"}</Button>
        </>
      ) : (
        <div className="space-y-1">
          <p className="text-stone-600">Your correction: {text}</p>
          {rubric ? (
            <p>
              <span className="font-medium">{rubric.pass ? "Pass" : "Not yet"}</span> · {rubric.feedback}{" "}
              <span className="text-stone-500">(confidence {Math.round(rubric.confidence * 100)}%)</span>
            </p>
          ) : (
            <p className="text-amber-800">Could not score this correction. No result is recorded as a pass.</p>
          )}
          {isBrief ? <p className="text-stone-600">Ungraded topic practice: no mastery claim.</p> : null}
          {saveNote ? <p className="text-stone-600">{saveNote}</p> : null}
        </div>
      )}
      {error ? <p className="text-red-700">{error}</p> : null}
    </section>
  );
}
