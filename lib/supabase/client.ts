import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export const SUPABASE_CONFIG_MESSAGE =
  "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and " +
  "NEXT_PUBLIC_SUPABASE_ANON_KEY in the workspace Secrets panel, then reload.";

/**
 * Browser Supabase client with cookie-backed sessions (@supabase/ssr) so the
 * middleware and server components see the same auth state.
 */
export function getSupabaseBrowserClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    throw new Error(SUPABASE_CONFIG_MESSAGE);
  }

  if (!browserClient) {
    browserClient = createBrowserClient(url, anon);
  }

  return browserClient;
}
