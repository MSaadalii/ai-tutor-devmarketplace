import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Reports which required secrets are present (booleans only, never values).
 * Lets the lesson UI warn about missing Gemini config before the first call.
 */
export async function GET() {
  return NextResponse.json({
    supabase: Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    ),
    gemini: Boolean(process.env.GEMINI_API_KEY),
    serviceRole: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
  });
}
