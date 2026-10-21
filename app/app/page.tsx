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
      <div className="dashboard">
        <section className="dashboard-hero">
          <div>
            <span className="dashboard-eyebrow">YOUR LEARNING SPACE</span>
            <h1>Make a little progress today.</h1>
            <p>Clear explanations, one thoughtful step at a time.</p>
          </div>
          <div className="dashboard-account">
            <span className="dashboard-avatar" aria-hidden="true">✳</span>
            <div>
              <span className="dashboard-account-label">SIGNED IN AS</span>
              <p>{email ?? "Loading account…"}</p>
              {email ? <span className="dashboard-security">✓ Secure sign-in · 2FA on</span> : null}
            </div>
          </div>
        </section>

        {error ? <AuthNotice kind="error">{error}</AuthNotice> : null}

        <section className="dashboard-start" aria-label="Start learning">
          <div className="dashboard-section-heading">
            <div><span className="dashboard-eyebrow">PICK UP SOMETHING NEW</span><h2>Where shall we begin?</h2></div>
            <span className="dashboard-heading-note">A good question is a great start.</span>
          </div>
          <div className="dashboard-start-grid">
            <div className="dashboard-pack-list">
              {listPacks().map((pack, index) => (
                <article key={pack.id} className="dashboard-pack-card">
                  <div className="dashboard-pack-symbol" aria-hidden="true">{index === 0 ? "▱" : "✦"}</div>
                  <div className="dashboard-pack-copy">
                    <span className="dashboard-card-kicker">GUIDED LESSON</span>
                    <h3>{pack.title}</h3>
                    <p>{pack.id} <span aria-hidden="true">·</span> Version {pack.version}</p>
                  </div>
                  <Button className="dashboard-cta" size="sm" disabled={creating !== null || !userId}
                    onClick={() => void startPack(pack.id, pack.version)}>
                    {creating === pack.id ? "Starting…" : "Start lesson"}<span aria-hidden="true">↗</span>
                  </Button>
                </article>
              ))}
            </div>

            <form className="dashboard-brief" onSubmit={(event) => { event.preventDefault(); void startBrief(); }}>
              <div className="dashboard-brief-icon" aria-hidden="true">✎</div>
              <span className="dashboard-card-kicker">YOUR CURIOSITY, YOUR WAY</span>
              <label htmlFor="topic-brief">Start from a topic</label>
              <p>Tell your tutor what you’re working on or what feels confusing.</p>
              <textarea id="topic-brief" required maxLength={2000} rows={4}
                value={topicBrief} onChange={(event) => setTopicBrief(event.target.value)}
                placeholder="For example: I’m learning about…"
                className="dashboard-textarea" />
              <div className="dashboard-brief-footer">
                <span>{topicBrief.length}/2000 · Introductory lesson, no grades</span>
                <Button type="submit" className="dashboard-cta" disabled={!userId || creating !== null || !topicBrief.trim()}>
                  {creating === "topic-brief" ? "Starting…" : "Start topic lesson"}<span aria-hidden="true">↗</span>
                </Button>
              </div>
            </form>
          </div>
        </section>

        <section className="dashboard-sessions">
          <div className="dashboard-section-heading dashboard-session-heading">
            <div><span className="dashboard-eyebrow">YOUR JOURNEY SO FAR</span><h2>Saved lessons</h2></div>
            {!loading && sessions.length > 0 ? <span className="dashboard-session-count">{sessions.length} {sessions.length === 1 ? "lesson" : "lessons"}</span> : null}
          </div>
          {loading ? (
            <div className="dashboard-empty">Gathering your lessons…</div>
          ) : sessions.length === 0 ? (
            <div className="dashboard-empty"><span aria-hidden="true">✧</span><p>Your learning journey starts here.</p><small>Start a guided lesson or bring your own topic above.</small></div>
          ) : (
            <ul className="dashboard-session-list">
              {sessions.map((s) => (
                <li key={s.id} className="dashboard-session-row">
                  <span className="dashboard-session-icon" aria-hidden="true">{s.pack_id ? "▱" : "✎"}</span>
                  <div className="dashboard-session-copy">
                    <p>{s.pack_id ?? "Topic brief"}</p>
                    <span>{new Date(s.created_at).toLocaleString()} <i>·</i> {s.language}</span>
                  </div>
                  <span className={`dashboard-status ${s.status === "in_progress" ? "is-progress" : ""}`}>{s.status.replaceAll("_", " ")}</span>
                  <Link href={`/lesson/${s.id}`} className="dashboard-open">Continue <span aria-hidden="true">→</span></Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </PageShell>
  );
}
