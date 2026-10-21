import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { runBoardTutor } from "@/lib/ai/boardTutor";
import { toErrorResponse } from "@/lib/apiError";
import { requireOwnedSession } from "@/lib/routes/sessionGuard";

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

    const denied = await requireOwnedSession(
      supabase,
      parsed.data.session_id,
      user.id,
    );
    if (denied) return denied;

    const {
      session_id,
      problem,
      misconception_id,
      mode,
      question,
      selected_element_ids,
      language,
    } = parsed.data;

    // The owned stored session is authoritative, never a client-supplied brief.
    const { data: session, error: sessionError } = await supabase
      .from("learning_sessions").select("pack_id, topic_brief")
      .eq("id", session_id).eq("user_id", user.id).single();
    if (sessionError || !session) throw new Error("Could not load the lesson context.");
    if (!session.pack_id && !session.topic_brief?.trim()) {
      return NextResponse.json({ error: "This lesson has no topic brief." }, { status: 400 });
    }

    let boardContext: unknown;
    if (!session.pack_id && mode === "answer") {
      const { data: narration, error: contextError } = await supabase
        .from("narration_steps").select("operation, spoken_line")
        .eq("session_id", session_id).eq("language", language)
        .order("step_order", { ascending: true });
      if (contextError) throw new Error("Could not load the topic board context.");
      boardContext = narration ?? [];
    }

    const result = await runBoardTutor({
      sessionId: session_id,
      userId: user.id,
      problem,
      topicBrief: session.pack_id ? undefined : session.topic_brief,
      misconceptionId: session.pack_id ? misconception_id : undefined,
      mode,
      question,
      selectedElementIds: selected_element_ids,
      boardContext,
      language,
      supabase,
    });

    try {
      if (mode === "teach" && result.steps.length > 0) {
        const { error: deleteError } = await supabase
          .from("narration_steps")
          .delete()
          .eq("session_id", session_id)
          .eq("language", language);

        if (deleteError && !session.pack_id) throw new Error(`Could not replace topic narration: ${deleteError.message}`);

        const rows = result.steps.map((step, idx) => ({
          session_id,
          user_id: user.id,
          step_order: idx,
          operation: step.operation,
          spoken_line: step.spokenLine,
          language,
        }));

        const { error: narrationError } = await supabase.from("narration_steps").insert(rows);
        if (narrationError && !session.pack_id) throw new Error(`Could not save topic narration: ${narrationError.message}`);

        if (!session.pack_id) {
          const { error: languageError } = await supabase.from("learning_sessions")
            .update({ language }).eq("id", session_id).eq("user_id", user.id);
          if (languageError) throw new Error(`Could not save lesson language: ${languageError.message}`);
        }

        await supabase.from("attempts").insert({
          session_id,
          user_id: user.id,
          phase: "board",
          prompt: session.pack_id ? problem : session.topic_brief,
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
      if (!session.pack_id) throw persistError;
      console.error("Failed to persist board tutor result:", persistError);
    }

    return NextResponse.json(result);
  } catch (error) {
    return toErrorResponse(error, "Board tutor failed");
  }
}
