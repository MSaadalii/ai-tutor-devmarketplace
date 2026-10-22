"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  getSupabaseBrowserClient,
  isSupabaseConfigured,
  SUPABASE_CONFIG_MESSAGE,
} from "@/lib/supabase/client";
import { destinationAfterPasswordAuth } from "@/lib/auth/mfa";
import { Button } from "@/components/ui/button";
import { AuthNotice } from "./AuthNotice";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isSupabaseConfigured()) {
    return <AuthNotice kind="error">{SUPABASE_CONFIG_MESSAGE}</AuthNotice>;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const supabase = getSupabaseBrowserClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError) {
      setError("Invalid email or password.");
      setBusy(false);
      return;
    }

    const destination = await destinationAfterPasswordAuth(supabase);
    router.push(destination);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="auth-form space-y-4">
      {error ? <AuthNotice kind="error">{error}</AuthNotice> : null}
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
        placeholder="Password"
        type="password"
        autoComplete="current-password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <Button type="submit" className="auth-submit w-full" disabled={busy}>
        {busy ? <><span className="warm-spinner" aria-hidden="true" /> Signing in…</> : "Continue"}
      </Button>
    </form>
  );
}
