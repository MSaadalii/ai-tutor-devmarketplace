import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Confirms the learning session exists AND belongs to the signed-in user
 * before any AI call or write. RLS already hides other accounts' rows; this
 * gives account B a clean 404 instead of a silent no-op (and avoids spending
 * Gemini calls on someone else's session id).
 */
export async function requireOwnedSession(
  supabase: SupabaseClient,
  sessionId: string,
  userId: string,
): Promise<NextResponse | null> {
  const { data, error } = await supabase
    .from("learning_sessions")
    .select("id")
    .eq("id", sessionId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      {
        error:
          `Could not verify the lesson session (${error.message}). ` +
          "Apply supabase/migrations/0001_core_schema.sql to your Supabase project.",
        code: "db_not_ready",
      },
      { status: 500 },
    );
  }
  if (!data) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  return null;
}
