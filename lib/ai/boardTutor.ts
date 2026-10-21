import {
  boardTutorResponseSchema,
  boardAnswerResponseSchema,
} from "@/lib/ai/schemas";
import { callGeminiJson, type GeminiRole } from "@/lib/ai/gemini";
import { getPack } from "@/lib/packs/binomial_square";
import { mergeTeachSteps } from "@/lib/ai/teachMerge";
import { runBriefTutor } from "@/lib/ai/briefTutor";
import type { NarrationStep } from "@/types";
import type { SupabaseClient } from "@supabase/supabase-js";

export type BoardTutorMode = "teach" | "answer";

export type BoardTutorInput = {
  sessionId: string;
  userId: string;
  problem: string;
  topicBrief?: string;
  boardContext?: unknown;
  misconceptionId?: string;
  mode: BoardTutorMode;
  question?: string;
  selectedElementIds?: string[];
  language: "en" | "ur";
  supabase?: SupabaseClient;
};

export type BoardTutorResult = {
  steps: NarrationStep[];
  notes?: string;
};

const ROLE: GeminiRole = "board_tutor";

function seededTeachResult(
  pack: ReturnType<typeof getPack>,
  language: BoardTutorInput["language"],
): BoardTutorResult {
  return {
    steps: mergeTeachSteps([], pack, language),
    notes: "Using the lesson's guided board steps.",
  };
}

function isExhaustedValidationFailure(error: unknown): boolean {
  return error instanceof Error && /invalid JSON twice/i.test(error.message);
}

export async function runBoardTutor(
  input: BoardTutorInput,
): Promise<BoardTutorResult> {
  if (input.topicBrief !== undefined) return runBriefTutor(input);
  const pack = getPack();
  const prompt =
    input.mode === "answer"
      ? buildAnswerPrompt(input, pack)
      : buildTeachPrompt(input, pack);

  if (input.mode === "answer") {
    const { output } = await callGeminiJson({
      sessionId: input.sessionId,
      userId: input.userId,
      role: ROLE,
      prompt,
      schema: boardAnswerResponseSchema,
      system: ANSWER_SYSTEM,
      supabase: input.supabase,
    });
    return {
      steps: output.steps ?? [],
      notes: output.answer,
    };
  }

  let output: { steps: NarrationStep[]; notes?: string };
  try {
    const result = await callGeminiJson({
      sessionId: input.sessionId,
      userId: input.userId,
      role: ROLE,
      prompt,
      schema: boardTutorResponseSchema,
      system: TEACH_SYSTEM,
      supabase: input.supabase,
    });
    output = result.output;
  } catch (error) {
    // callGeminiJson retries malformed JSON/Zod output once. A tutor lesson
    // must still be playable after both attempts fail; real config/provider
    // errors continue to the route so they remain visible to the learner.
    if (isExhaustedValidationFailure(error)) {
      return seededTeachResult(pack, input.language);
    }
    throw error;
  }

  if (!output.steps.length) return seededTeachResult(pack, input.language);

  // Deterministic merge: Gemini narration + pack-seeded ops with real payloads.
  try {
    return {
      steps: mergeTeachSteps(output.steps, pack, input.language),
      notes: output.notes,
    };
  } catch (error) {
    console.error("Board tutor merge failed; using seeded narration:", error);
    return seededTeachResult(pack, input.language);
  }
}

const TEACH_SYSTEM = `
You are a board tutor explaining a math concept with live, step-by-step whiteboard moves.

CRITICAL RULE 1 — Root shape:
  You MUST return a JSON OBJECT with the key "steps". NEVER return a top-level JSON array.
  Correct:   { "steps": [ ... ], "notes": "..." }
  Incorrect: [ { "order": 0, ... }, { "order": 1, ... } ]

CRITICAL RULE 2 — operation field:
  Each step's "operation" MUST be a JSON OBJECT with "type" and "payload" keys.
  NEVER return operation as a bare string.
  Correct:   "operation": { "type": "add_text", "payload": { "x": 10, "y": 20, "text": "x²" } }
  Incorrect: "operation": "add_text"

Root shape is exactly { "steps": [...], "notes"?: string }.
Return at most 6 steps inside the "steps" array. Each step has:
- order: 0-based integer
- operation: { "type": <one of add_text|add_shape|update_label|highlight|clear_highlight>, "payload": { ... } }
  payload fields: x, y, text (add_text); x, y, width, height, elementId (add_shape);
                  elementId, text (update_label); elementId (highlight/clear_highlight)
- spokenLine: plain text, max 160 chars, no HTML
- language: "en" or "ur" matching the request

Use the area model for (x+3)^2: draw a square split into x^2, two 3x rectangles, and 3^2.
Speak one short sentence per step. Do not include hints about later quiz answers.
`;

const ANSWER_SYSTEM = `
You answer a student's text question about the current whiteboard.
Return JSON with:
- answer: a concise explanation (max 500 chars)
- steps (optional): up to 3 board operations that illustrate the answer
Keep spoken lines under 160 chars and do not give away quiz answers.
`;

function buildTeachPrompt(
  input: BoardTutorInput,
  pack: ReturnType<typeof getPack>,
): string {
  const regionIds = pack.areaModel.regionIds;
  const languageNote =
    input.language === "ur"
      ? "Respond in Urdu. Equations stay in Latin/LTR."
      : "Respond in English.";

  return `
Teach the expansion of ${input.problem} on the board.
${input.misconceptionId ? `Known misconception: ${input.misconceptionId}. Address it visually.` : ""}

Area-model element IDs you may use:
${JSON.stringify(regionIds, null, 2)}

${languageNote}

RESPONSE RULES (both are mandatory):
1. Respond with a JSON OBJECT that has the key "steps" (array of up to 6 board steps).
   Do NOT return a top-level JSON array — the root MUST be {"steps": [...], "notes"?: string}.
2. Each step's "operation" MUST be a JSON object { "type": "...", "payload": { ... } }.
   NEVER use a bare string for operation (e.g. "add_text" is WRONG; use {"type":"add_text","payload":{...}}).
`;
}

function buildAnswerPrompt(
  input: BoardTutorInput,
  pack: ReturnType<typeof getPack>,
): string {
  const languageNote =
    input.language === "ur"
      ? "Respond in Urdu. Equations stay in Latin/LTR."
      : "Respond in English.";

  return `
The student selected these board elements: ${(input.selectedElementIds ?? []).join(", ") || "none"}.
Question: ${input.question ?? ""}
Current problem: ${input.problem}

Area-model element IDs:
${JSON.stringify(pack.areaModel.regionIds, null, 2)}

${languageNote}

Answer concisely and optionally add up to 3 board operations.
`;
}
