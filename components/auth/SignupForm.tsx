"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  getSupabaseBrowserClient,
  isSupabaseConfigured,
  SUPABASE_CONFIG_MESSAGE,
} from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { AuthNotice } from "./AuthNotice";

export function SignupForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  if (!isSupabaseConfigured()) {
    return <AuthNotice kind="error">{SUPABASE_CONFIG_MESSAGE}</AuthNotice>;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);

    const supabase = getSupabaseBrowserClient();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });

    if (signUpError) {
      setError(signUpError.message);
      setBusy(false);
      return;
    }

    if (!data.session) {
      // Email confirmation is enabled on the Supabase project.
      setInfo(
        "Account created. Check your email to confirm it, then sign in — " +
          "you'll set up 2FA on first sign-in.",
      );
      setBusy(false);
      return;
    }

    // Signed in at AAL1 — TOTP enrollment is mandatory before the app.
    router.push("/verify-2fa");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="auth-form space-y-4">
      {error ? <AuthNotice kind="error">{error}</AuthNotice> : null}
      {info ? <AuthNotice kind="info">{info}</AuthNotice> : null}
      <input
        className="auth-field w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
        placeholder="Email"
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
        placeholder="Password (min. 6 characters)"
        type="password"
        autoComplete="new-password"
        required
        minLength={6}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <Button type="submit" className="auth-submit w-full" disabled={busy}>
        {busy ? "Creating account…" : "Create account"}
      </Button>
      <p className="text-xs text-stone-500">
        Next step: secure the account with an authenticator app (TOTP 2FA).
      </p>
    </form>
  );
}
