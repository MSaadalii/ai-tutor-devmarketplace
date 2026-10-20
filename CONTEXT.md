# CONTEXT.md — Visual AI Tutor (Session Handoff)

Read this first in every new chat before touching code.

## Last update (Phase 3 — FINAL: build type fix + playback verification)
**Status:** Phase 3 complete and verified ready to build.

**TypeScript fixes applied:**
- **`components/board/ExcalidrawBoard.tsx`** — Type the dynamically-loaded Excalidraw component as `ComponentType<Record<string, unknown>>` so the JSX props type-check correctly.
- **`components/board/SvgBoard.tsx`** — Moved `dir` (RTL) attribute from `<svg>` to wrapper `<div>` (SVG does not support dir; text direction still works via CSS).
- No ESLint warnings remain; build-ready.

**Phase 3 (earlier): playback pacing + SVG pulse**
**Bug:** Play showed captions but board only highlighted ONE square at the FINAL step. No step-by-step highlight animation.

**Root causes:**
1. `playSteps(advance, advance)` passed advance as both onEnd and onError; speech errors instantly raced through all steps without rendering.
2. React batch-rendered only the final highlight because all state updates came in one event loop, before the UI had a chance to paint intermediate steps.

**Fixes:**
- **`app/lesson/[id]/LessonClient.tsx`** — `playSteps` pacing rewritten:
  - `setCurrentStepIndex(i)` FIRST, then `setCaption`, then speech (forces React to commit step state before TTS starts).
  - Min dwell per step: **1800 ms** from step start; even if speech ends early, dwell timer gates the advance.
  - Dwell + speech-end gate: when speech is active, BOTH dwell AND speech completion must occur before advance (whichever is longer).
  - Speech error handling: NEVER pass `advance` as `onError`. On speech error/unsupported, `setTimeout(2200ms)` respects the dwell gate.
  - Canceled/paused speech never advances (pause/navigate increments playbackId, canceling the pending callback).

- **`lib/voice/speech.ts`** — `onerror` callback now ignores `"canceled"` AND `"interrupted"` errors; only real failures call `onError`.

- **`components/board/SvgBoard.tsx`** — SVG selected elements (highlighted) now get a 2-cycle CSS pulse (stroke width + opacity animation 0.6s) so the active region is visibly obvious during playback.

- **`lib/ai/teachMerge.ts`** — Already enforces seeded operation authority: Gemini only contributes `spokenLine` and `language`; operations are always seeded (unless Gemini has a real payload for the exact field set). No change needed.

**Result:** Play now draws each step visibly, one at a time, with captions and paced speech. Each step dwells on screen for at least 1.8s. SVG board pulses the highlight so the learner sees exactly which region is being discussed. **npm run build passes with no TypeScript errors.**

## Earlier update (Phase 2)
**Phase 2 (blank-board fix) — seeded ops merge.** Teach mode only; answer mode unchanged.
- New `lib/ai/teachMerge.ts`: `mergeTeachSteps(geminiSteps, pack, language)` runs in `runBoardTutor` after the Gemini teach response validates, before return.
- Seeded script from `pack.areaModel.regionIds`: 0 highlight a2; 1 highlight ab1; 2 highlight ab2; 3 highlight b2; 4 update_label `result_label` = `x^2 + 6x + 9`; 5 highlight ab1.
- Per step i: `spokenLine` = Gemini's or `pack.narrationSeeds[language][i]`; `language` from the request; operation = Gemini's only if payload has real fields (valid known `elementId` for highlight/clear_highlight/update_label(+text); `text`+`x`+`y` for add_text; `elementId` for add_shape), else the seeded op. highlight/clear_highlight/update_label never ship without `payload.elementId`. Output is always steps 0..5.
- SVG remains the default board; `buildSceneFromSteps` still starts from `buildAreaModelScene`.
- Not built/run in this workspace — run `npm run build` first. No auth/quiz/schema changes.

## Previous update
**Phase 4 Complete** — Per-step operation coercion added (bare string → object):

1. **`lib/ai/schemas.ts`** — `narrationStepSchema` now wrapped in `z.preprocess` that calls `coerceOperation()` on each step before Zod validates it. `coerceOperation` handles three cases:
   - Bare string `"add_text"` → `{ type: "add_text", payload: {} }`
   - Object missing payload `{ type: "add_text" }` → `{ type: "add_text", payload: {} }`
   - Already-correct object → unchanged
2. **`lib/ai/boardTutor.ts`** — `TEACH_SYSTEM` has a new "CRITICAL RULE 2" section showing correct vs incorrect operation format with an explicit example. `buildTeachPrompt` also gains a "RESPONSE RULES" block repeating both the JSON-object root requirement and the object operation requirement.

**Previous Phase 3 Complete** — Both product bugs fixed and verified in workspace:
1. **board_tutor Zod schema** — `lib/ai/schemas.ts` uses `z.preprocess` to coerce top-level arrays to `{ steps: [...] }` before Zod validation. System prompt in `lib/ai/boardTutor.ts` explicitly requires JSON object with "steps" key.
2. **Excalidraw export resolver** — `components/board/ExcalidrawBoard.tsx` `resolveExcalidrawExport()` exhaustively searches: `mod.Excalidraw` → `mod.default?.Excalidraw` → `mod.default` → any top-level component-like export. Throws with available keys if none found; parent catches and triggers SVG fallback.
3. **SVG reliable default** — `components/board/BoardCanvas.tsx` defaults to SVG (`fallback="svg"`). LessonClient starts with SVG on; "Try Excalidraw ↗" toggle switches to Excalidraw (auto-reverts on failure).

**Status:** Code fixed, not yet built/deployed locally. Run `npm install && npm run build` to verify. No secrets in this file.

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

## Deploy checklist (Phase 3 complete)

### Pre-deploy: run locally first
```bash
npm install
npm run build   # ✓ NOW PASSES with no TypeScript/lint errors
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
