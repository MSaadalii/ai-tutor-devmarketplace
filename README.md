# Visual AI Tutor

Live whiteboard tutor for STEM students: Gemini returns validated board steps, the lesson draws them with captions and optional Web Speech narration, then continues through board Q&A, the 2bx task, quiz, and summary.

## Run

```bash
npm install
npm run dev
```

Open http://localhost:3000. Use `npm run build` to verify a production build.

## Secrets (names only — never commit values)

Add these in the workspace **Secrets** panel (local dev: your shell env / `.env.local`, which is git-ignored). `.env.example` lists every name with an empty value.

| Name | Required | Where used |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | yes | browser + server (safe to expose) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | browser + server (safe to expose; RLS protects data) |
| `SUPABASE_SERVICE_ROLE_KEY` | not needed by the current Core flow | **server only**, bypasses RLS — never `NEXT_PUBLIC_` |
| `GEMINI_API_KEY` | yes (diagnose, board, quiz coach) | **server only** |
| `GEMINI_MODEL` | optional | defaults to `gemini-2.5-flash` when empty |
| `UPLIFT_AI_API_KEY` | optional, later phase | **server only**; Web Speech is used when empty |

**Missing config is shown on screen, not as a blank page:**

- Supabase: a red notice on `/login`, `/signup`, `/verify-2fa` and `/app` (and the lesson page).
- Gemini: API routes return JSON `{ "error": "...", "code": "missing_config" }` (HTTP 503); the lesson page shows that message in a red notice, and also warns on load via `GET /api/health` (booleans only, no values).

## Database: apply exactly ONE migration

Apply **`supabase/migrations/0001_core_schema.sql`** (Supabase Dashboard → SQL Editor → paste → Run, or `supabase db push`). It is idempotent and creates all tables, indexes, triggers and the RLS policies.

`0001_core_placeholder.sql` and `20261019072223_create_core_schema.sql` are now **no-op stubs** (`select 1;`) kept only so history is readable — applying them is harmless; delete them with `git rm` if you prefer.

Then verify isolation: sign up two accounts and run `supabase/tests/rls_isolation.sql` in the SQL Editor (expects `RLS ISOLATION: PASS`). Details in `CONTEXT.md`.

## Auth setup (Supabase)

1. Authentication → Providers: enable **Email** (email/password). Enable **MFA (TOTP)** under Authentication → Multi-Factor (on by default for new projects).
2. If "Confirm email" is on, the user must click the inbox link before signing in. For a fast judge demo you may turn it off.
3. Authentication → URL Configuration: set **Site URL** to the deployed URL and add `https://<your-app>.vercel.app/**` and `http://localhost:3000/**` to **Redirect URLs**.

## Deploy to Vercel

### Before you push
```bash
npm install
npm run build   # fix any TypeScript/lint errors first
npm run dev     # walk the demo click path locally
```

### Steps
1. Push the repo to GitHub → Vercel → **Add New Project** → import it (framework: Next.js; build command `npm run build`; no output directory override).
2. Project Settings → Environment Variables → add for **Production + Preview**:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `GEMINI_API_KEY`
   - `GEMINI_MODEL` (optional — defaults to `gemini-2.5-flash`)
   - Do **not** add `SUPABASE_SERVICE_ROLE_KEY` unless a feature needs it.
3. Deploy, then add the resulting URL to Supabase **Redirect URLs** (Authentication → URL Configuration).
4. Smoke test the public URL: sign up → TOTP → `/app` → Start Binomial Squares → diagnose → Play (SVG board by default) → ask → 2bx task → quiz → summary. Sign out; sign in as a second account and confirm the first account's lessons are not listed.

**Live URL:** _fill in after the first Vercel deploy._

## Demo click path

1. Open **Start lesson** on `/` and create an account, or use **Sign in**.
2. Complete the authenticator setup/code at `/verify-2fa`.
3. On `/app`, choose **Binomial Squares → Start**.
4. On the lesson page, submit the diagnostic answer (`x^2+9` is pre-filled), then press **Play explanation**. Captions are always visible. The board defaults to SVG (always works). Press **Try Excalidraw ↗** to switch to the sketch renderer; it auto-falls back to SVG if the module fails to load.
5. Ask a board question, select the two `3x` regions, complete the quiz, and show the summary.

## Topic-brief path (Core Phase 5)

On `/app`, enter a nonblank topic brief (up to 2,000 characters) and choose **Start topic lesson**. The owned Supabase session stores `topic_brief` with `pack_id: null` using the existing schema. Press **Play explanation** immediately: no Detective, forced misconception, or pack board task. Gemini teaches from the stored brief on an initially empty SVG board (Excalidraw remains opt-in), with captions and optional Web Speech. Thin briefs should elicit stated assumptions/uncertainty; invalid drawings are retried once, then shown as a recoverable error, never replaced with binomial operations.

Ask a text question, or finish with **Ungraded summary** after viewing the explanation. Brief lessons have no quiz, score, or mastery claim; summaries quote saved narration. Saved brief narration can be replayed without another Gemini call after reopening; summaries are restored from Supabase. Existing Supabase configuration/migration is required; no new schema or secrets were added. Pack lessons retain the Judge path above.

Manual checks (human-run; no shell/browser verification was available during this change):
- Blank/whitespace brief cannot start; 2,000 characters accepted, input cannot exceed the limit.
- Try “photosynthesis, introductory biology” and a thin “physics” brief: no binomial scene, clear narration and uncertainty for the thin brief.
- Ask, pause/replay, finish: summary contains actual saved narration and an ungraded notice, with no pack scores.
- Reload/open the saved brief lesson; replay and summary remain available. A second account cannot open it.
- Missing Gemini config/invalid output shows an error, not a seeded pack lesson. A brief session cannot call either quiz API alias for pack grading.
- Regression: Binomial Squares → Diagnose → Play → Ask → 2bx task → Quiz → Summary.

## Key paths

- `components/layout/PageShell.tsx` — shared page chrome used by every page.
- `lib/apiError.ts` — `ConfigError` + `toErrorResponse` (clear JSON errors for missing Gemini/Supabase config, bad key, bad model, quota).
- `lib/routes/sessionGuard.ts` — every API route confirms the session belongs to the signed-in user.
- `components/board/*`, `lib/board/ops.ts` — Excalidraw/SVG board and shared op replay.
- `app/lesson/[id]/LessonClient.tsx` — lesson phases, playback, error display.

## Project docs

See [`SPEC.md`](./SPEC.md), [`AGENTS.md`](./AGENTS.md), [`TECH.md`](./TECH.md), and [`CONTEXT.md`](./CONTEXT.md).
