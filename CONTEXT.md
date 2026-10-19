# CONTEXT.md — Visual AI Tutor (Session Handoff)

Read this first in every new chat before touching code.

## Last update
Auth/data/deploy hardening lane (Uzair) — secrets docs, single migration, RLS tightened, clear env errors, build blockers fixed.

## Lane finished
**Auth / data / deploy hardening.** Phase 3 (board playback) is untouched: no Excalidraw rewrite, no Gemini prompt changes, no pack content changes, no Vapi/Stretch.

## What changed in this lane
- **Missing component fixed:** `components/layout/PageShell.tsx` did not exist but was imported by `/`, `/login`, `/signup`, `/verify-2fa`, `/app` and the lesson page — `next build` and `next dev` would fail. Created.
- **Gemini default model:** was the retired `gemini-2.5-flash-preview-05-20`; now `gemini-2.5-flash` (empty `GEMINI_MODEL` falls back). `maxOutputTokens` raised 2048 → 8192 so thinking tokens don't truncate the JSON.
- **Missing-env errors:** `lib/apiError.ts` (`ConfigError`, `toErrorResponse`). Missing `GEMINI_API_KEY` / Supabase vars → HTTP 503 `{error, code:"missing_config"}`; bad key / bad model / quota get readable messages. All AI + summary + board-task routes use it. `LessonClient` shows every API failure in the red notice (previously a failed call produced an unhandled rejection and a blank/stuck panel) and warns on load via `GET /api/health`.
- **Quiz/diagnose state:** a failed quiz submit no longer advances to the next item; probe answers are committed only after a successful diagnose call.
- **Lint/build nits:** unused vars (`_info`, `_text`), `let`→`const`, Excalidraw stylesheet import (`@excalidraw/excalidraw/index.css`).
- **Migrations resolved:** `0001_core_schema.sql` is the single source of truth. The other two files are `select 1;` no-op stubs.
- **`.env.example`:** dangling Uplift comment now has its variable (`UPLIFT_AI_API_KEY=`).
- **Ownership guard:** `lib/routes/sessionGuard.ts` — each API route checks the session belongs to the user before spending a Gemini call or writing (account B gets 404).

## Secrets (names only)
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (server-only, unused by Core), `GEMINI_API_KEY`, optional `GEMINI_MODEL`, optional `UPLIFT_AI_API_KEY`.

## Core SQL migration
Apply **only** `supabase/migrations/0001_core_schema.sql` (idempotent; safe to re-run — it drops the old broad `owner_all` policies and installs the new ones).

## RLS isolation

**Policy review (done, static):** all 8 tables (`learning_sessions, attempts, board_states, narration_steps, model_runs, quiz_results, lesson_summaries, activity_events`) have RLS enabled.
- Gap found: the old single `owner_all` policy only checked `auth.uid() = user_id`, so account B could insert a child row with its own `user_id` but A's `session_id` (and use a stolen session id to pollute A's data).
- Fix: separate select/insert/update/delete policies `to authenticated`; child insert/update `with check` also requires `exists (select 1 from learning_sessions s where s.id = session_id and s.user_id = auth.uid())`. `activity_events` does so when `session_id` is not null. Select/delete stay owner-only.

**Two-account test:** `supabase/tests/rls_isolation.sql` (run in SQL Editor after signing up two accounts; transactional, rolled back). It has A create a session plus a row in every child table, then asserts B: reads 0 rows from every table, updates/deletes 0 rows, and gets an RLS error when inserting attempts/quiz_results/narration_steps onto A's session or a session as A.

**Result: NOT YET RUN against a live Supabase project** — no database was reachable from this workspace, so the script and the policies are reviewed but unexecuted. First action for the next lane: apply the migration, create two users, run the script, and record `PASS` here. UI check: account B's `/app` lists none of A's sessions and `/lesson/<A-id>` shows "Session not found".

## Deploy status
- `npm run build` and `npm run dev` were **not executed** in this workspace session (no shell tool). The known blocker (`PageShell` missing) and the lint nits are fixed by inspection; run `npm install && npm run build` before pushing and fix anything the compiler reports.
- Vercel: not deployed. Exact steps (env vars, Supabase Site URL / Redirect URLs) are in `README.md`. Live URL placeholder is in the README.

## Persistence note
Data persists in Supabase Postgres (not in memory); it exists only after the migration is applied.

## Important paths

| Path | Purpose |
|---|---|
| `components/layout/PageShell.tsx` | Shared page chrome |
| `lib/apiError.ts` | Config/Gemini error → JSON response |
| `lib/routes/sessionGuard.ts` | Session ownership check for API routes |
| `app/api/health/route.ts` | Secret presence booleans |
| `supabase/migrations/0001_core_schema.sql` | The one migration |
| `supabase/tests/rls_isolation.sql` | Two-account isolation test |
| `app/lesson/[id]/LessonClient.tsx` | Lesson phases, playback, error display |
| `middleware.ts` / `lib/supabase/middleware.ts` | Auth and AAL2 route guards |

## Exact next lane
**Full Judge-path E2E smoke + Saad docs/gigs:** (1) apply migration + run RLS test, record PASS; (2) `npm run build`, deploy to Vercel, fill the live URL in README; (3) diagnose → board → ask → 2bx → quiz → summary on the public URL, including sign out/in as a second account; (4) Saad: docs and gig write-ups. Do not start Vapi, Stretch, or a new phase.

## Blockers
Live Supabase project + `GEMINI_API_KEY` must be set in Secrets before the E2E can run. No secret values belong in this file.
