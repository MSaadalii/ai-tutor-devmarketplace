import { GoogleGenerativeAI } from "@google/generative-ai";
import { z, type ZodTypeAny } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ConfigError } from "@/lib/apiError";

export const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";

/** Read at call time; an empty GEMINI_MODEL falls back to the default. */
export function getGeminiModelName(): string {
  return process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;
}

function getApiKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new ConfigError(
      "Gemini is not configured. Add GEMINI_API_KEY in the workspace Secrets panel " +
        "(optional: GEMINI_MODEL), then retry.",
      ["GEMINI_API_KEY"],
    );
  }
  return key;
}

export function getGeminiModel(system?: string) {
  const genAI = new GoogleGenerativeAI(getApiKey());
  return genAI.getGenerativeModel({
    model: getGeminiModelName(),
    systemInstruction: system
      ? { role: "system", parts: [{ text: system }] }
      : undefined,
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.2,
      // 2.5 models spend output tokens on thinking; leave headroom for the JSON.
      maxOutputTokens: 8192,
    },
  });
}

export type GeminiRole = "detective" | "board_tutor" | "quiz_coach" | "summary";

export type GeminiCallOptions<T extends ZodTypeAny> = {
  sessionId: string;
  userId: string;
  role: GeminiRole;
  prompt: string;
  schema: T;
  system?: string;
  supabase?: SupabaseClient;
};

export type GeminiCallResult<T extends ZodTypeAny> = {
  output: z.infer<T>;
  latencyMs: number;
};

/**
 * Call Gemini 2.5 Flash, parse JSON, Zod-validate, and retry once on invalid JSON.
 * Persists the run to model_runs when supabase is provided.
 */
export async function callGeminiJson<T extends ZodTypeAny>(
  options: GeminiCallOptions<T>,
): Promise<GeminiCallResult<T>> {
  const { sessionId, userId, role, prompt, schema, system, supabase } = options;

  const model = getGeminiModel(system);
  const contents = [{ role: "user" as const, parts: [{ text: prompt }] }];

  async function attempt(): Promise<{
    output: z.infer<T>;
    latencyMs: number;
    status: "ok" | "invalid_json";
    error?: string;
  }> {
    const start = Date.now();
    const raw = await model.generateContent({ contents });
    const latencyMs = Date.now() - start;
    const text = raw.response.text();

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      return {
        output: null as z.infer<T>,
        latencyMs,
        status: "invalid_json",
        error: `JSON parse error: ${e instanceof Error ? e.message : String(e)}`,
      };
    }

    const result = schema.safeParse(parsed);
    if (!result.success) {
      return {
        output: null as z.infer<T>,
        latencyMs,
        status: "invalid_json",
        error: `Zod validation error: ${result.error.message}`,
      };
    }

    return { output: result.data, latencyMs, status: "ok" };
  }

  const first = await attempt();
  if (first.status === "ok") {
    if (supabase) {
      await persistModelRun(supabase, {
        sessionId,
        userId,
        role,
        output: first.output,
        latencyMs: first.latencyMs,
        status: "ok",
      });
    }
    return { output: first.output, latencyMs: first.latencyMs };
  }

  // One retry for invalid JSON.
  const second = await attempt();
  if (second.status === "ok") {
    if (supabase) {
      await persistModelRun(supabase, {
        sessionId,
        userId,
        role,
        output: second.output,
        latencyMs: second.latencyMs,
        status: "ok",
      });
    }
    return { output: second.output, latencyMs: second.latencyMs };
  }

  if (supabase) {
    await persistModelRun(supabase, {
      sessionId,
      userId,
      role,
      output: null,
      latencyMs: second.latencyMs,
      status: "invalid_json",
      error: second.error,
    });
  }

  throw new Error(
    `Gemini returned invalid JSON twice for ${role}: ${second.error}`,
  );
}

type PersistInput = {
  sessionId: string;
  userId: string;
  role: GeminiRole;
  output: unknown;
  latencyMs: number;
  status: "ok" | "invalid_json" | "error";
  error?: string;
};

async function persistModelRun(
  supabase: SupabaseClient,
  input: PersistInput,
): Promise<void> {
  try {
    await supabase.from("model_runs").insert({
      session_id: input.sessionId,
      user_id: input.userId,
      role: input.role,
      model: getGeminiModelName(),
      output: input.output ?? {},
      latency_ms: input.latencyMs,
      status: input.status,
      error: input.error,
    });
  } catch {
    // Persistence failure must not break the user-facing call.
  }
}
