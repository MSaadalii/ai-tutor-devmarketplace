import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { ConfigError } from "@/lib/apiError";

/**
 * Server-component / route-handler client bound to the request cookie store.
 * RLS applies — this acts as the signed-in user.
 */
export async function getSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    throw new ConfigError(
      "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and " +
        "NEXT_PUBLIC_SUPABASE_ANON_KEY in the workspace Secrets panel.",
      ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"],
    );
  }

  const cookieStore = await cookies();

  return createServerClient(url, anon, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Called from a Server Component — middleware refreshes sessions.
        }
      },
    },
  });
}

/**
 * Service-role client. Bypasses RLS — server-only, never import from client
 * components. Used later for admin/grading tasks.
 */
export function getSupabaseServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !service) {
    throw new ConfigError(
      "Supabase service role is not configured. Add SUPABASE_SERVICE_ROLE_KEY " +
        "(server-only) in the workspace Secrets panel.",
      ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"],
    );
  }

  return createClient(url, service, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
