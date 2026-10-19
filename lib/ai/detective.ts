import { detectiveOutcomeSchema } from "@/lib/ai/schemas";
import { callGeminiJson, type GeminiRole } from "@/lib/ai/gemini";
import { getPack } from "@/lib/packs/binomial_square";
import type { DetectiveOutcome } from "@/types";
import type { SupabaseClient } from "@supabase/supabase-js";

export type DetectiveInput = {
  sessionId: string;
  userId: string;
  problem: string;
  studentAnswer: string;
  priorProbes?: string[];
  priorResponses?: string[];
  language: "en" | "ur";
  supabase?: SupabaseClient;
};

export type DetectiveResult = {
  outcome: DetectiveOutcome;
  misconception_id?: string;
  confidence: number;
  probes?: { question: string }[];
  explanation: string;
};

const ROLE: GeminiRole = "detective";

export async function runDetective(
  input: DetectiveInput,
): Promise<DetectiveResult> {
  const pack = getPack();
  const prompt = buildPrompt(input, pack.misconceptions);

  const { output } = await callGeminiJson({
    sessionId: input.sessionId,
    userId: input.userId,
    role: ROLE,
    prompt,
    schema: detectiveOutcomeSchema,
    system: SYSTEM,
    supabase: input.supabase,
  });

  return {
    outcome: output.outcome,
    misconception_id: output.misconception_id,
    confidence: output.confidence,
    probes: output.probes,
    explanation: output.explanation,
  };
}

const SYSTEM = `
You are a careful middle-school math tutor diagnosing why a student answered incorrectly.
You may ask at most 2 short follow-up probes. You must choose one honest outcome:
- misconception_identified: only when the evidence strongly points to a listed misconception.
- insufficient_evidence: when you genuinely cannot tell.
- correct_answer: when the answer is actually right.
- arithmetic_slip: a small calculation error, not a conceptual mistake.
- unrecognized_reasoning: the reasoning is unclear or unusual.
Never force a named misconception. Reply in JSON matching the requested schema.
`;

function buildPrompt(
  input: DetectiveInput,
  misconceptions: { id: string; label: string; probes: string[] }[],
): string {
  const catalog = misconceptions
    .map((m) => `- ${m.id}: ${m.label}`)
    .join("\n");

  const history = (input.priorProbes ?? [])
    .map((q, i) => `Probe ${i + 1}: ${q}\nStudent: ${input.priorResponses?.[i] ?? ""}`)
    .join("\n");

  const languageNote =
    input.language === "ur"
      ? "Respond in Urdu (use simple, clear language suitable for students)."
      : "Respond in English.";

  return `
Problem: expand ${input.problem}.
Student answer: ${input.studentAnswer}.

Known misconceptions for this pack:
${catalog}

${history ? `Prior probes and responses:\n${history}\n` : ""}
${languageNote}

Return JSON with:
- outcome (one of the five allowed values)
- misconception_id (only if outcome is misconception_identified; must be one of the catalog IDs)
- confidence (0.0 to 1.0)
- probes (array of up to 2 follow-up questions; omit if no probe needed)
- explanation (short, honest rationale, max 500 chars)
`;
}
