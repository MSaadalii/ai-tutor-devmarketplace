import type { SupabaseClient } from "@supabase/supabase-js";

export interface TotpFactor {
  id: string;
  status: string;
}

/** The account's verified TOTP factor, if one exists. */
export async function getVerifiedTotpFactor(
  supabase: SupabaseClient,
): Promise<TotpFactor | null> {
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error) return null;
  const verified = (data?.totp ?? []).find((f) => f.status === "verified");
  return verified ?? null;
}

/**
 * Where to send the user right after a successful password sign-in.
 * TOTP is mandatory: challenge if a factor exists, enroll otherwise.
 */
export async function destinationAfterPasswordAuth(
  supabase: SupabaseClient,
): Promise<"/app" | "/verify-2fa"> {
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal?.nextLevel === "aal2" && aal.currentLevel !== "aal2") {
    return "/verify-2fa";
  }
  const factor = await getVerifiedTotpFactor(supabase);
  return factor ? "/app" : "/verify-2fa";
}
