import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_PREFIXES = ["/app", "/lesson"];
const AUTH_PAGES = ["/login", "/signup"];

function redirectTo(request: NextRequest, path: string) {
  const url = request.nextUrl.clone();
  url.pathname = path;
  url.search = "";
  return NextResponse.redirect(url);
}

/**
 * Refreshes the Supabase session cookie on every matched request and enforces:
 *  - /app and /lesson/* require a signed-in user;
 *  - TOTP is mandatory: a verified factor means AAL2 is required, and an
 *    account with no verified factor is sent to enroll at /verify-2fa;
 *  - /login and /signup bounce fully-authenticated users to /app.
 */
export async function updateSession(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Without env vars, let pages render their own "not configured" notice.
  if (!url || !anon) return NextResponse.next();

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isProtected = PROTECTED_PREFIXES.some((p) => path.startsWith(p));
  const isAuthPage = AUTH_PAGES.includes(path);
  const isVerify = path === "/verify-2fa";

  if ((isProtected || isVerify) && !user) {
    return redirectTo(request, "/login");
  }

  if (!user) return response;

  // AAL: does this account need the TOTP step right now?
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  const needsChallenge =
    aal?.nextLevel === "aal2" && aal.currentLevel !== "aal2";

  let needsEnroll = false;
  if (!needsChallenge && (isProtected || isAuthPage || isVerify)) {
    const { data: factors } = await supabase.auth.mfa.listFactors();
    needsEnroll = !(factors?.totp ?? []).some((f) => f.status === "verified");
  }

  if (isProtected && (needsChallenge || needsEnroll)) {
    return redirectTo(request, "/verify-2fa");
  }
  if ((isAuthPage || isVerify) && !needsChallenge && !needsEnroll) {
    // Fully authenticated (AAL2) — no reason to stay on auth screens.
    return redirectTo(request, "/app");
  }

  return response;
}
