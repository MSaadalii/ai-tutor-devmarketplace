"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { isRecognitionSupported, listenOnce } from "@/lib/voice/recognize";
import type { AppLanguage } from "@/types";

export function RaiseHand({
  language,
  onRaise,
  onQuestion,
}: {
  language: AppLanguage;
  /** Called when the hand is raised (pause narration). */
  onRaise: () => void;
  /** Submit the transcript via the board-tutor answer path. */
  onQuestion: (text: string) => Promise<void>;
}) {
  const [listening, setListening] = useState(false);
  const [busy, setBusy] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const stopRef = useRef<(() => void) | null>(null);

  useEffect(() => () => stopRef.current?.(), []);

  function raise() {
    onRaise();
    setMessage(null);
    setTranscript("");
    if (!isRecognitionSupported()) {
      setMessage("Voice input isn't supported in this browser. Type your question below.");
      return;
    }
    setListening(true);
    stopRef.current = listenOnce(language, {
      onInterim: setTranscript,
      onFinal: (t) => {
        setListening(false);
        setTranscript(t);
        setBusy(true);
        void onQuestion(t).finally(() => setBusy(false));
      },
      onError: (m) => {
        setListening(false);
        setMessage(m);
      },
    });
  }

  function cancel() {
    stopRef.current?.();
    setListening(false);
  }

  return (
    <div className="lesson-soft space-y-2 p-4 text-sm">
      <div className="flex flex-wrap items-center gap-3">
        {listening ? (
          <Button type="button" variant="outline" onClick={cancel}>
            Stop listening
          </Button>
        ) : (
          <Button type="button" onClick={raise} disabled={busy}>
            ✋ Raise hand
          </Button>
        )}
        <span className="text-stone-600" role="status">
          {listening
            ? "Listening… ask your question."
            : busy
              ? "Getting an answer…"
              : "Pauses the lesson and listens for your question."}
        </span>
      </div>
      {transcript ? (
        <p className="text-stone-700">
          <span className="font-medium">You asked:</span> “{transcript}”
        </p>
      ) : null}
      {message ? <p className="text-amber-800">{message}</p> : null}
    </div>
  );
}
