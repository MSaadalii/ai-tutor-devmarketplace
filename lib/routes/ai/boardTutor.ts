import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { runBoardTutor } from "@/lib/ai/boardTutor";

const requestSchema = z.object({
  session_id: z.string().uuid(),
  problem: z.string().min(1).max(200).default("(x+3)^2"),
  misconception_id: z.string().max(64).optional(),
  mode: z.enum(["teach", "answer"]).default("teach"),
  question: z.string().max(500).optional(),
  selected_element_ids: z.array(z.string().max(64)).default([]),
  language: z.enum(["en", "ur"]).default("en"),
});

export async function handleBoardTutor(request: Request) {
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
      misconception_id,
      mode,
      question,
      selected_element_ids,
      language,
    } = parsed.data;

    const result = await runBoardTutor({
      sessionId: session_id,
      userId: user.id,
      problem,
      misconceptionId: misconception_id,
      mode,
      question,
      selectedElementIds: selected_element_ids,
      language,
      supabase,
    });

    try {
      if (mode === "teach" && result.steps.length > 0) {
        await supabase
          .from("narration_steps")
          .delete()
          .eq("session_id", session_id)
          .eq("language", language);

        const rows = result.steps.map((step, idx) => ({
          session_id,
          user_id: user.id,
          step_order: idx,
          operation: step.operation,
          spoken_line: step.spokenLine,
          language,
        }));

        await supabase.from("narration_steps").insert(rows);

        await supabase.from("attempts").insert({
          session_id,
          user_id: user.id,
          phase: "board",
          prompt: problem,
          response: `${result.steps.length} steps`,
          correct: null,
          metadata: { step_count: result.steps.length, notes: result.notes },
        });
      }

      if (mode === "answer") {
        await supabase.from("attempts").insert({
          session_id,
          user_id: user.id,
          phase: "question",
          prompt: question ?? "",
          response: result.notes ?? "",
          correct: null,
          metadata: { selected_element_ids },
        });
      }
    } catch (persistError) {
      console.error("Failed to persist board tutor result:", persistError);
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Board tutor handler error:", error);
    const message =
      error instanceof Error ? error.message : "Board tutor failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
