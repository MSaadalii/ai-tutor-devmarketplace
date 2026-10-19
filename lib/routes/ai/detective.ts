import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { runDetective } from "@/lib/ai/detective";
import type { DetectiveOutcome } from "@/types";

const requestSchema = z.object({
  session_id: z.string().uuid(),
  problem: z.string().min(1).max(200),
  student_answer: z.string().min(1).max(500),
  prior_probes: z.array(z.string().max(300)).max(2).optional(),
  prior_responses: z.array(z.string().max(500)).max(2).optional(),
  language: z.enum(["en", "ur"]).default("en"),
});

export async function handleDetective(request: Request) {
  try {
    const supabase = await getSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.message },
        { status: 400 },
      );
    }

    const {
      session_id,
      problem,
      student_answer,
      prior_probes,
      prior_responses,
      language,
    } = parsed.data;

    const result = await runDetective({
      sessionId: session_id,
      userId: user.id,
      problem,
      studentAnswer: student_answer,
      priorProbes: prior_probes,
      priorResponses: prior_responses,
      language,
      supabase,
    });

    try {
      await supabase
        .from("learning_sessions")
        .update({
          detective_outcome: result.outcome as DetectiveOutcome,
          misconception_id: result.misconception_id ?? null,
          detective_confidence: result.confidence,
          updated_at: new Date().toISOString(),
        })
        .eq("id", session_id)
        .eq("user_id", user.id);

      await supabase.from("attempts").insert({
        session_id,
        user_id: user.id,
        phase: "diagnose",
        prompt: problem,
        response: student_answer,
        correct:
          result.outcome === "correct_answer" ||
          result.outcome === "arithmetic_slip",
        metadata: {
          outcome: result.outcome,
          misconception_id: result.misconception_id,
          confidence: result.confidence,
          probes: result.probes,
          explanation: result.explanation,
        },
      });
    } catch (persistError) {
      console.error("Failed to persist diagnosis:", persistError);
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Detective handler error:", error);
    const message =
      error instanceof Error ? error.message : "Diagnosis failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
