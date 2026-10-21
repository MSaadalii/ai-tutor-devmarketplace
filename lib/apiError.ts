import { NextResponse } from "next/server";

/** Thrown when a required environment variable is missing (names only). */
export class ConfigError extends Error {
  readonly missing: string[];
  constructor(message: string, missing: string[]) {
    super(message);
    this.name = "ConfigError";
    this.missing = missing;
  }
}

/**
 * Turn any thrown error into a clear JSON response the lesson UI can show.
 * Missing configuration → 503 with `code: "missing_config"`.
 */
export function toErrorResponse(error: unknown, fallback: string) {
  if (error instanceof ConfigError) {
    return NextResponse.json(
      { error: error.message, code: "missing_config", missing: error.missing },
      { status: 503 },
    );
  }

  const raw = error instanceof Error ? error.message : fallback;
  console.error(`${fallback}:`, error);

  let message = raw;
  let code = "server_error";
  if (/API key not valid|API_KEY_INVALID|PERMISSION_DENIED/i.test(raw)) {
    code = "gemini_auth";
    message =
      "Gemini rejected GEMINI_API_KEY. Check the key in the workspace Secrets panel.";
  } else if (/not found/i.test(raw) && /model/i.test(raw)) {
    code = "gemini_model";
    message =
      "Gemini model not found. Check GEMINI_MODEL or try gemini-2.0-flash " +
      "or gemini-flash-latest.";
  } else if (/429|quota|RESOURCE_EXHAUSTED/i.test(raw)) {
    code = "gemini_quota";
    message = "Gemini rate/quota limit reached. Wait a moment and try again.";
  }

  return NextResponse.json({ error: message, code }, { status: 500 });
}
