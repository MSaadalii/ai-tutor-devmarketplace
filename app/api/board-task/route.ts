import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { gradeBoardTask } from "@/lib/grading/algebra";
import { getPack } from "@/lib/packs/binomial_square";

const requestSchema = z.object({
  session_id: z.string().uuid(),
  selected_element_ids: z.array(z.string().max(64)).min(1),
  language: z.enum(["en", "ur"]).default("en"),
});

export async function POST(request: Request) {
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

    const { session_id, selected_element_ids, language } = parsed.data;
    const pack = getPack();
    const grade = gradeBoardTask(
      pack.boardTaskElementIds,
      selected_element_ids,
    );

    try {
      await supabase.from("board_states").upsert(
        {
          session_id,
          user_id: user.id,
          selected_element_ids,
          scene: { board_task: grade },
          revision: 1,
        },
        { onConflict: "session_id" },
      );

      await supabase.from("attempts").insert({
        session_id,
        user_id: user.id,
        phase: "board_task",
        prompt: "Tap the two regions that make the 2bx term.",
        response: selected_element_ids.join(", "),
        correct: grade.correct,
        metadata: { language, grade },
      });
    } catch (persistError) {
      console.error("Failed to persist board task:", persistError);
    }

    return NextResponse.json({
      correct: grade.correct,
      hit_regions: grade.hitRegions,
      message: grade.message,
    });
  } catch (error) {
    console.error("Board task route error:", error);
    const message =
      error instanceof Error ? error.message : "Board task grading failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
