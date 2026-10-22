"use client";

/**
 * Vapi narration over a websocket-transport call. The server route creates
 * the call (secrets stay server-side); the browser only gets a one-time URL.
 * Any failure rejects/errs so the caller falls back to Web Speech.
 */
import type { AppLanguage } from "@/types";

const RATE = 16000;
const SILENCE_MS = 150;
const FIRST_AUDIO_TIMEOUT_MS = 9000;

let ws: WebSocket | null = null;
let ctx: AudioContext | null = null;
let nextTime = 0;
let sources: AudioBufferSourceNode[] = [];
let disabled = false;
let pending: { token: number; onEnd: () => void; onError: (e: Error) => void } | null = null;
let timers: ReturnType<typeof setTimeout>[] = [];
let tokenSeq = 0;
let gotAudio = false;
let endTimer: ReturnType<typeof setTimeout> | null = null;

export function isVapiReady(): boolean {
  return !disabled && ws !== null && ws.readyState === WebSocket.OPEN;
}

function clearTimers() {
  timers.forEach(clearTimeout);
  timers = [];
}

export function cancelVapi(): void {
  pending = null;
  tokenSeq += 1;
  clearTimers();
  if (endTimer) clearTimeout(endTimer);
  endTimer = null;
  sources.forEach((s) => {
    s.onended = null;
    try {
      s.stop();
    } catch {
      /* already stopped */
    }
  });
  sources = [];
  if (ctx) nextTime = ctx.currentTime;
}

function teardown() {
  cancelVapi();
  try {
    ws?.close();
  } catch {
    /* ignore */
  }
  ws = null;
}

function fail(err: Error) {
  disabled = true;
  const p = pending;
  teardown();
  p?.onError(err);
}

function playChunk(buf: ArrayBuffer) {
  if (!ctx || buf.byteLength < 2) return;
  const pcm = new Int16Array(buf.slice(0, buf.byteLength - (buf.byteLength % 2)));
  const f = new Float32Array(pcm.length);
  for (let i = 0; i < pcm.length; i++) f[i] = pcm[i] / 32768;
  const ab = ctx.createBuffer(1, f.length, RATE);
  ab.copyToChannel(f, 0);
  const src = ctx.createBufferSource();
  src.buffer = ab;
  src.connect(ctx.destination);
  const start = Math.max(ctx.currentTime, nextTime);
  src.start(start);
  nextTime = start + ab.duration;
  sources.push(src);
  gotAudio = true;
  // New audio arrived: any pending end is stale (mid-utterance gap).
  if (endTimer) clearTimeout(endTimer);
  endTimer = null;
  src.onended = () => {
    sources = sources.filter((s) => s !== src);
    if (sources.length === 0) scheduleEnd(SILENCE_MS);
  };
}

/** Fires onEnd exactly once, only when no audio is queued or playing (debounced). */
function scheduleEnd(padMs: number) {
  const p = pending;
  if (!p) return;
  if (endTimer) clearTimeout(endTimer);
  const wait = Math.max(0, (nextTime - (ctx?.currentTime ?? 0)) * 1000) + padMs;
  endTimer = setTimeout(() => {
    endTimer = null;
    if (sources.length > 0 || (ctx && nextTime > ctx.currentTime + 0.01)) {
      scheduleEnd(padMs);
      return;
    }
    if (pending && pending.token === p.token) {
      pending = null;
      p.onEnd();
    }
  }, wait);
}

function handleJson(raw: string) {
  if (!pending || !gotAudio) return;
  try {
    const m = JSON.parse(raw) as { type?: string; status?: string; role?: string };
    const stopped =
      (m.type === "speech-update" && m.status === "stopped") ||
      (m.type === "status-update" && m.status === "stopped") ||
      m.type === "saying-finished" ||
      m.type === "say-finished";
    if (stopped && m.role !== "user") scheduleEnd(SILENCE_MS);
  } catch {
    /* ignore non-JSON */
  }
}

/** Opens the call once. Never throws; resolves false when unavailable. */
export async function connectVapi(): Promise<boolean> {
  if (isVapiReady()) return true;
  if (disabled || typeof window === "undefined") return false;
  try {
    const res = await fetch("/api/voice/vapi", { method: "POST" });
    if (!res.ok) throw new Error("Vapi unavailable");
    const { websocketCallUrl } = (await res.json()) as { websocketCallUrl: string };
    ctx = ctx ?? new AudioContext({ sampleRate: RATE });
    if (ctx.state === "suspended") await ctx.resume();
    nextTime = ctx.currentTime;
    const socket = new WebSocket(websocketCallUrl);
    socket.binaryType = "arraybuffer";
    await new Promise<void>((resolve, reject) => {
      const t = setTimeout(() => reject(new Error("Vapi connect timeout")), 6000);
      socket.onopen = () => {
        clearTimeout(t);
        resolve();
      };
      socket.onerror = () => {
        clearTimeout(t);
        reject(new Error("Vapi socket error"));
      };
    });
    socket.onmessage = (e) => {
      if (e.data instanceof ArrayBuffer) playChunk(e.data);
      else if (typeof e.data === "string") handleJson(e.data);
    };
    socket.onclose = () => {
      if (ws === socket) {
        ws = null;
        if (pending) fail(new Error("Vapi closed"));
      }
    };
    socket.onerror = () => fail(new Error("Vapi socket error"));
    ws = socket;
    return true;
  } catch {
    disabled = true;
    return false;
  }
}

/** Speaks one line via Vapi; onError means "use Web Speech instead". */
export function speakVapi(
  text: string,
  _language: AppLanguage,
  onEnd: () => void,
  onError: (e: Error) => void,
): void {
  void _language;
  if (!isVapiReady() || !ws) {
    onError(new Error("Vapi not connected"));
    return;
  }
  cancelVapi();
  const token = tokenSeq;
  pending = { token, onEnd, onError };
  gotAudio = false;
  ws.send(JSON.stringify({ type: "say", content: text, endCallAfterSpoken: false }));
  timers.push(
    setTimeout(() => {
      if (pending && pending.token === token && !gotAudio) fail(new Error("Vapi gave no audio"));
    }, FIRST_AUDIO_TIMEOUT_MS),
  );
}

export function closeVapi(): void {
  teardown();
}
