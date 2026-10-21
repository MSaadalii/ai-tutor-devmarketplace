import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function configured(): boolean {
  return Boolean(process.env.VAPI_API_KEY && process.env.VAPI_ASSISTANT_ID);
}

/** Booleans only. */
export async function GET() {
  return NextResponse.json({ enabled: configured() });
}

/**
 * Creates a Vapi websocket-transport call and returns only the one-time
 * websocket URL. VAPI_API_KEY / VAPI_ASSISTANT_ID never leave the server.
 */
export async function POST() {
  if (!configured()) {
    return NextResponse.json(
      { error: "Vapi is not configured (VAPI_API_KEY + VAPI_ASSISTANT_ID). Using Web Speech." },
      { status: 503 },
    );
  }
  try {
    const res = await fetch("https://api.vapi.ai/call", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.VAPI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        assistantId: process.env.VAPI_ASSISTANT_ID,
        transport: {
          provider: "vapi.websocket",
          audioFormat: { format: "pcm_s16le", container: "raw", sampleRate: 16000 },
        },
      }),
    });
    if (!res.ok) {
      return NextResponse.json({ error: `Vapi request failed (${res.status}).` }, { status: 502 });
    }
    const data = (await res.json()) as { transport?: { websocketCallUrl?: string } };
    const url = data.transport?.websocketCallUrl;
    if (!url) {
      return NextResponse.json({ error: "Vapi returned no websocket URL." }, { status: 502 });
    }
    return NextResponse.json({ websocketCallUrl: url });
  } catch {
    return NextResponse.json({ error: "Could not reach Vapi." }, { status: 502 });
  }
}
