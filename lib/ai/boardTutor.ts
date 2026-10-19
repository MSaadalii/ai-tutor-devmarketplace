import {
  boardTutorResponseSchema,
  boardAnswerResponseSchema,
} from "@/lib/ai/schemas";
import { callGeminiJson, type GeminiRole } from "@/lib/ai/gemini";
import { getPack } from "@/lib/packs/binomial_square";
import type { NarrationStep } from "@/types";
import type { SupabaseClient } from "@supabase/supabase-js";

export type BoardTutorMode = "teach" | "answer";

export type BoardTutorInput = {
  sessionId: string;
  userId: string;
  problem: string;
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

export async function runBoardTutor(
  input: BoardTutorInput,
): Promise<BoardTutorResult> {
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

  const { output } = await callGeminiJson({
    sessionId: input.sessionId,
    userId: input.userId,
    role: ROLE,
    prompt,
    schema: boardTutorResponseSchema,
    system: TEACH_SYSTEM,
    supabase: input.supabase,
  });

  return {
    steps: output.steps,
    notes: output.notes,
  };
}

const TEACH_SYSTEM = `
You are a board tutor explaining a math concept with live, step-by-step whiteboard moves.
Return at most 6 steps. Each step has:
- order: 0-based integer
- operation: one of {add_text, add_shape, update_label, highlight, clear_highlight}
- payload: object with required fields (x, y, text for add_text; x, y, width, height, elementId for add_shape; elementId, text for update_label; elementId for highlight/clear_highlight)
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

Return the JSON schema of board steps (max 6).
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
