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
  const [topicBrief, setTopicBrief] = useState("");

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

  async function startBrief() {
    const brief = topicBrief.trim();
    if (!brief || topicBrief.length > 2000) {
      setError("Enter a topic brief of 1–2,000 characters.");
      return;
    }
    if (!userId || creating !== null) return;
    setCreating("topic-brief");
    setError(null);
    try {
      const { data, error: insertError } = await getSupabaseBrowserClient()
        .from("learning_sessions")
        .insert({ user_id: userId, topic_brief: brief, pack_id: null,
          pack_version: null, language: "en" })
        .select().single();
      if (insertError) throw new Error(insertError.message);
      router.push(`/lesson/${(data as LearningSessionRow).id}`);
    } catch (e) {
      setError(`Could not start topic lesson: ${e instanceof Error ? e.message : "Please retry."}`);
    } finally {
      setCreating(null);
    }
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
          <form className="space-y-3 rounded-lg border border-stone-300 bg-white p-4 text-sm"
            onSubmit={(event) => { event.preventDefault(); void startBrief(); }}>
            <label htmlFor="topic-brief" className="block font-medium">Or start from a topic brief</label>
            <textarea id="topic-brief" required maxLength={2000} rows={4}
              value={topicBrief} onChange={(event) => setTopicBrief(event.target.value)}
              placeholder="What would you like to learn? Add your level and what is confusing."
              className="w-full rounded-md border border-stone-300 p-3" />
            <p className="text-xs text-stone-500">{topicBrief.length}/2000 characters · Introductory AI lesson, no quiz or grades.</p>
            <Button type="submit" disabled={!userId || creating !== null || !topicBrief.trim()}>
              {creating === "topic-brief" ? "Starting…" : "Start topic lesson"}
            </Button>
          </form>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">
            Saved sessions
          </h2>
          {loading ? (
            <p className="text-sm text-stone-500">Loading…</p>
          ) : sessions.length === 0 ? (
            <p className="text-sm text-stone-500">
              No sessions yet — start a pack or enter a topic brief above.
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
