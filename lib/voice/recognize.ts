"use client";

import type { AppLanguage } from "@/types";

/* eslint-disable @typescript-eslint/no-explicit-any */
function getCtor(): any {
  if (typeof window === "undefined") return null;
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export function isRecognitionSupported(): boolean {
  return getCtor() !== null;
}

/** Starts one-shot recognition. Returns a stop function. */
export function listenOnce(
  language: AppLanguage,
  handlers: {
    onInterim?: (t: string) => void;
    onFinal: (t: string) => void;
    onError: (message: string) => void;
  },
): () => void {
  const Ctor = getCtor();
  if (!Ctor) {
    handlers.onError("Voice input is not supported in this browser. Type your question instead.");
    return () => {};
  }
  const rec = new Ctor();
  rec.lang = language === "ur" ? "ur-PK" : "en-US";
  rec.interimResults = true;
  rec.continuous = false;
  let finalText = "";
  let done = false;
  const finish = (fn: () => void) => {
    if (done) return;
    done = true;
    fn();
  };
  rec.onresult = (e: any) => {
    let interim = "";
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i];
      if (r.isFinal) finalText += r[0].transcript;
      else interim += r[0].transcript;
    }
    handlers.onInterim?.((finalText + interim).trim());
  };
  rec.onerror = (e: any) => {
    const code = String(e?.error ?? "unknown");
    if (code === "aborted") return;
    const msg =
      code === "not-allowed" || code === "service-not-allowed"
        ? "Microphone access was denied. Allow the mic or type your question."
        : code === "no-speech"
          ? "I didn't hear anything. Try again or type your question."
          : `Voice input failed (${code}). Type your question instead.`;
    finish(() => handlers.onError(msg));
  };
  rec.onend = () => {
    finish(() => {
      const t = finalText.trim();
      if (t) handlers.onFinal(t);
      else handlers.onError("I didn't catch a question. Try again or type it.");
    });
  };
  try {
    rec.start();
  } catch {
    finish(() => handlers.onError("Could not start the microphone. Type your question instead."));
  }
  return () => {
    done = true;
    try {
      rec.abort();
    } catch {
      /* ignore */
    }
  };
}
