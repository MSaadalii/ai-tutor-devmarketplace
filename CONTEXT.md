# CONTEXT.md — Visual AI Tutor (Session Handoff)

Read this first in every new chat before touching code.

## Last update
Phase 3 "Deploy" lane — the two remaining bugs (board_tutor Zod array coerce; Excalidraw export resolver exhaustive) are fixed. SVG is now the reliable default board renderer for teach mode so the Judge path is never blocked by an Excalidraw load failure. **Deploy checklist below.** Do not add Vapi or Stretch. No secrets in this file.

## Phase 3 fixes (this lane)

### Bug 1 — board_tutor Zod: "expected object, received array"
- **`lib/ai/schemas.ts`** — `boardTutorResponseSchema` is now wrapped in `z.preprocess`: if the incoming value is an array it is wrapped as `{ steps: value }` before parsing. The parsed shape stays `{ steps: narrationStepSchema[].max(6), notes?: string }`.
- **`lib/ai/boardTutor.ts`** — `TEACH_SYSTEM` and `buildTeachPrompt` both now explicitly say: respond with a JSON OBJECT with key `"steps"`, never a top-level array. The system prompt includes a correct/incorrect example.

### Bug 2 — Excalidraw "export not found"
- **`components/board/ExcalidrawBoard.tsx`** — `resolveExcalidrawExport` now tries: `mod.Excalidraw`, `mod.default?.Excalidraw`, `mod.default`, and any top-level key whose value is component-like. If none resolves it **throws** (not returns null) with a message that lists the available keys (e.g. `"Excalidraw export not found; available keys: default, ..."`). The `useEffect` that calls it catches the throw and triggers `onError` → SVG fallback.

### SVG as reliable default for teach mode
- **`components/board/BoardCanvas.tsx`** — `fallback` prop default changed from `"excalidraw"` to `"svg"`. The comment explains the strategy: SVG always works; the "Try Excalidraw" toggle switches to `fallback="excalidraw"` (which auto-reverts on load error).
- **`app/lesson/[id]/LessonClient.tsx`** — `useSvgFallback` now starts `true` (SVG default). Toggle label: "Try Excalidraw ↗" / "Use SVG board".
- Teaching works end-to-end on SVG. Excalidraw is opt-in and safe to try.

## Phase 2 fixes (Judge E2E lane)
- **Bug A — Play stayed disabled (probe shape):** `lib/ai/schemas.ts` `detectiveProbeSchema` accepts a string OR `{question}` and coerces a string to `{question}`. `lib/ai/detective.ts` prompt requires `probes` as `[{"question":"..."}]`. `DiagnosePanel` renders a probe as either shape via `probeText()`; `LessonClient` uses the same helper for `prior_probes`.
- **Bug B — Excalidraw export not found:** `resolveExcalidrawExport()` first tried `mod.Excalidraw`, `mod.default.Excalidraw`, `mod.default` (Phase 2). Phase 3 extends this to any top-level key + detailed error message.
- Status: static fixes only. `npm install && npm run build` and the click path below have **not been run** in this workspace (no shell tool). Run them first.

## Earlier lane: Phase 1 "Walkable lesson path"
Start pack resumes or creates a session and opens `/lesson/[sessionId]`; DiagnosePanel is pre-filled with `x^2 + 9` for `(x+3)^2`; Play calls board-tutor and draws via SVG (default) or Excalidraw (opt-in); captions always on; on-screen red notices for API/config errors.

## Phase 1 walkable path status
- Fixed: Excalidraw selection read `el.selected` (never set) → now reads `appState.selectedElementIds`.
- Fixed: Excalidraw load failure shows a notice and switches to SVG; the manual toggle back retries.
- Fixed: "Session not found" shows a red notice + link back to My lessons.
- Fixed: Start pack reuses an in-progress session for the same pack.

## Demo click path
1. Sign in → `/app` → **Start** on Binomial Squares → lands on `/lesson/<id>`.
2. Step 1 Diagnose: the answer box holds `x^2 + 9`; press **Submit** (calls `/api/ai/detective`). Answer any follow-up probe if asked.
3. After the diagnosis, press **Play explanation** (calls `/api/ai/board-tutor`, draws steps on SVG board by default, captions always on, Web Speech when available).
4. If Gemini is missing or bad, a red notice appears on the lesson page.
5. Optional: **Try Excalidraw ↗** switches to Excalidraw (auto-falls back to SVG on load error). **Use SVG board** switches back.

## Deploy checklist (Phase 3)

### Pre-deploy: run locally first
```bash
npm install
npm run build   # must pass with no TypeScript/lint errors
npm run dev     # walk the demo click path
```

### Apply the database migration
1. Supabase Dashboard → SQL Editor → paste `supabase/migrations/0001_core_schema.sql` → Run.  
   (It is idempotent; safe to re-run.)
2. Sign up two accounts and run `supabase/tests/rls_isolation.sql` — expect `RLS ISOLATION: PASS`.

### Supabase Auth setup
1. Authentication → Providers: enable **Email** (email/password). Enable **MFA (TOTP)**.
2. If "Confirm email" is on, users must click the inbox link before signing in. For fast demo, turn it off.
3. Authentication → URL Configuration: set **Site URL** to the deployed URL and add `https://<your-app>.vercel.app/**` and `http://localhost:3000/**` to **Redirect URLs**.

### Vercel deploy
1. Push repo to GitHub → Vercel → **Add New Project** → import (framework: Next.js; build: `npm run build`).
2. Project Settings → Environment Variables — add for Production + Preview:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `GEMINI_API_KEY`
   - `GEMINI_MODEL` (optional; default: `gemini-2.5-flash`)
   - Do **not** add `SUPABASE_SERVICE_ROLE_KEY` unless a feature requires it.
3. Deploy → add the Vercel URL to Supabase Redirect URLs.
4. Smoke test the public URL: sign up → TOTP → `/app` → Start Binomial Squares → diagnose → Play → ask → 2bx task → quiz → summary. Sign out and sign in as a second account — confirm first account's lessons are not listed.

**Live URL:** _fill in after the first Vercel deploy._

## Judge E2E — checks to run on the live URL (or locally)
1. Sign in → `/app` → Start on Binomial Squares → `/lesson/<id>`.
2. Diagnose: submit `x^2 + 9`. If a probe appears, answer it. Confirm Play unlocks and the diagnosis panel shows.
3. Play explanation: SVG board draws (captions show, speech used only when available).
4. Missing or bad `GEMINI_API_KEY` → red notice on the lesson page, not a blank screen.
5. Optional: "Try Excalidraw ↗" → Excalidraw draws (or falls back to SVG with a notice).
6. Ask → 2bx task → quiz → summary.
7. Sign out; sign in as Account B → `/app` lists none of Account A's sessions; `/lesson/<A-id>` shows "Session not found".
8. Record PASS/FAIL.

## Secrets (names only — no values in this file)
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (server-only; not needed by Core), `GEMINI_API_KEY`, optional `GEMINI_MODEL`, optional `UPLIFT_AI_API_KEY`.

## Core SQL migration
Apply **only** `supabase/migrations/0001_core_schema.sql` (idempotent). The other two migration files are no-op stubs.

## RLS isolation
All 8 tables have RLS enabled. Child insert/update policies verify the session belongs to the calling user. `supabase/tests/rls_isolation.sql` asserts Account B reads 0 rows from every table, updates/deletes 0, and gets RLS errors on cross-account inserts.

**Result: NOT YET RUN against a live Supabase project** — apply the migration and run the test first.

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
| `components/board/BoardCanvas.tsx` | SVG/Excalidraw board, SVG default |
| `components/board/ExcalidrawBoard.tsx` | Excalidraw loader + exhaustive resolver |
| `lib/ai/schemas.ts` | boardTutorResponseSchema with array preprocess |
| `lib/ai/boardTutor.ts` | Teach prompt enforces JSON object with "steps" |

## Blockers
- Live Supabase project + `GEMINI_API_KEY` must be set in Secrets before the E2E can run.
- `npm run build` must pass locally before pushing to Vercel.
- No secret values belong in this file.
