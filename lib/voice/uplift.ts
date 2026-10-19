/**
 * Optional Uplift AI Urdu TTS wrapper.
 *
 * The product Core works without this: the client falls back to Web Speech
 * (`speechSynthesis`) for Urdu and every other language. When an Uplift AI key
 * is configured, the server can proxy a single line of Urdu text to Uplift and
 * return an audio URL for the client to play.
 *
 * The exact Uplift endpoint/payload should be updated once the team receives
 * the provider's integration docs. Until then, this module returns `null` so
 * the client stays on Web Speech.
 */

export type UpliftTtsResult = {
  audioUrl: string;
} | null;

export async function synthesizeUrdu(_text: string): Promise<UpliftTtsResult> {
  const key = process.env.UPLIFT_AI_API_KEY;
  if (!key) {
    // No key configured: caller must fall back to browser Web Speech.
    return null;
  }

  // TODO: replace with the real Uplift AI TTS endpoint and payload shape.
  // Example placeholder (will not run without the real URL):
  // const res = await fetch("https://api.uplift.ai/v1/tts", {
  //   method: "POST",
  //   headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
  //   body: JSON.stringify({ text, language: "ur" }),
  // });
  // if (!res.ok) throw new Error(`Uplift TTS failed: ${res.status}`);
  // const data = await res.json();
  // return { audioUrl: data.audio_url };

  void key;
  return null;
}
