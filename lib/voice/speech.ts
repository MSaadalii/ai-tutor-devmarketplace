"use client";

import type { AppLanguage } from "@/types";

function getVoices(): SpeechSynthesisVoice[] {
  if (typeof window === "undefined" || !window.speechSynthesis) return [];
  return window.speechSynthesis.getVoices();
}

export function getSpeechVoice(language: AppLanguage): SpeechSynthesisVoice | null {
  const voices = getVoices();
  if (voices.length === 0) return null;

  const prefer =
    language === "ur"
      ? ["ur-PK", "ur-IN", "ur"]
      : ["en-US", "en-GB", "en"];

  for (const code of prefer) {
    const match = voices.find((v) =>
      v.lang.toLowerCase().startsWith(code.toLowerCase()),
    );
    if (match) return match;
  }
  return null;
}

export function isSpeechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function speakLine(
  text: string,
  language: AppLanguage,
  onEnd?: () => void,
  onError?: (err: Error) => void,
): () => void {
  if (!isSpeechSupported()) {
    onError?.(new Error("Web Speech API is not supported in this browser."));
    return () => {};
  }

  const utter = new SpeechSynthesisUtterance(text);
  const voice = getSpeechVoice(language);
  if (voice) utter.voice = voice;
  utter.lang = language === "ur" ? "ur-PK" : "en-US";
  utter.rate = 0.95;
  utter.pitch = 1;

  utter.onend = () => onEnd?.();
  utter.onerror = (e) => {
    // Ignore "canceled" and "interrupted" — cancellation or pause never advances.
    // Only call onError for actual failures (e.g., synthesis unsupported).
    if (e.error !== "canceled" && e.error !== "interrupted") {
      onError?.(new Error(`Speech error: ${e.error}`));
    }
  };

  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utter);

  return () => window.speechSynthesis.cancel();
}

export function cancelSpeech(): void {
  if (isSpeechSupported()) {
    window.speechSynthesis.cancel();
  }
}
