"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { AuthNotice } from "@/components/auth/AuthNotice";
import {
  getSupabaseBrowserClient,
  isSupabaseConfigured,
  SUPABASE_CONFIG_MESSAGE,
} from "@/lib/supabase/client";
import { listPacks } from "@/lib/packs/loadPack";
import type { LearningSessionRow } from "@/types";

export default function AppHomePage() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<LearningSessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setError(SUPABASE_CONFIG_MESSAGE);
      setLoading(false);
      return;
    }
    const supabase = getSupabaseBrowserClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.replace("/login");
      return;
    }
    setEmail(user.email ?? null);
    setUserId(user.id);

    const { data, error: sessionsError } = await supabase
      .from("learning_sessions")
      .select("*")
      .order("created_at", { ascending: false });

    if (sessionsError) {
      setError(
        `Could not load sessions (${sessionsError.message}). ` +
          "Apply supabase/migrations/0001_core_schema.sql to your project.",
      );
    } else {
      setSessions((data ?? []) as LearningSessionRow[]);
    }
    setLoading(false);
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  async function startPack(packId: string, version: string) {
    if (!userId) return;
    setCreating(packId);
    setError(null);
    const supabase = getSupabaseBrowserClient();

    // Resume an unfinished session for this pack instead of creating duplicates.
    const { data: existing, error: lookupError } = await supabase
      .from("learning_sessions")
      .select("*")
      .eq("pack_id", packId)
      .eq("status", "in_progress")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (lookupError) {
      setCreating(null);
      setError(`Could not load your lesson (${lookupError.message}).`);
      return;
    }
    if (existing) {
      setCreating(null);
      router.push(`/lesson/${(existing as LearningSessionRow).id}`);
      return;
    }

    const { data, error: insertError } = await supabase
      .from("learning_sessions")
      .insert({
        user_id: userId,
        pack_id: packId,
        pack_version: version,
        language: "en",
      })
      .select()
      .single();

    setCreating(null);
    if (insertError) {
      setError(
        `Could not start the lesson (${insertError.message}). ` +
          "Apply supabase/migrations/0001_core_schema.sql to your project.",
      );
      return;
    }
    const row = data as LearningSessionRow;
    setSessions((prev) => [row, ...prev]);
    router.push(`/lesson/${row.id}`);
  }

  return (
    <PageShell actions={<SignOutButton />}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">My lessons</h1>
          <p className="text-sm text-stone-600">
            {email ? (
              <>
                Signed in as <span className="font-medium">{email}</span> ·{" "}
                <span className="text-teal-800">2FA on</span>
              </>
            ) : (
              "Loading account…"
            )}
          </p>
        </div>

        {error ? <AuthNotice kind="error">{error}</AuthNotice> : null}

        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">
            Start a lesson
          </h2>
          <ul className="space-y-3">
            {listPacks().map((pack) => (
              <li
                key={pack.id}
                className="flex items-center justify-between rounded-lg border border-stone-200 bg-white px-4 py-3"
              >
                <div>
                  <p className="font-medium">{pack.title}</p>
                  <p className="text-xs text-stone-500">
                    {pack.id} · v{pack.version}
                  </p>
                </div>
                <Button
                  size="sm"
                  disabled={creating !== null || !userId}
                  onClick={() => void startPack(pack.id, pack.version)}
                >
                  {creating === pack.id ? "Starting…" : "Start"}
                </Button>
              </li>
            ))}
          </ul>
          <div className="rounded-lg border border-dashed border-stone-300 bg-white/60 p-4 text-sm text-stone-600">
            Topic brief paste (≤2,000 chars) — wired in a later phase.
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">
            Saved sessions
          </h2>
          {loading ? (
            <p className="text-sm text-stone-500">Loading…</p>
          ) : sessions.length === 0 ? (
            <p className="text-sm text-stone-500">
              No sessions yet — start the Binomial Squares pack above.
            </p>
          ) : (
            <ul className="space-y-2">
              {sessions.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between rounded-lg border border-stone-200 bg-white px-4 py-2 text-sm"
                >
                  <div>
                    <p className="font-medium">
                      {s.pack_id ?? "Topic brief"}{" "}
                      <span className="text-xs font-normal text-stone-500">
                        {s.status} · {s.language}
                      </span>
                    </p>
                    <p className="text-xs text-stone-500">
                      {new Date(s.created_at).toLocaleString()}
                    </p>
                  </div>
                  <Link
                    href={`/lesson/${s.id}`}
                    className="text-sm font-medium text-teal-800 underline"
                  >
                    Open
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </PageShell>
  );
}
