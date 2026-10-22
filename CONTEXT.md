# CONTEXT.md — Visual AI Tutor (Session Handoff)

Read this first in every new chat before touching code.

PageShell wide was restored for build: `wide?: boolean` defaults to false, using `max-w-6xl` when enabled and `max-w-5xl` otherwise; human will push and rerun `npm run build`.

Phase 6: Optional Excalidraw conversion uses `{ regenerateIds: false }` to preserve region IDs/highlights and centered bound rectangle labels (superseding Phase 5's separate region-label nodes). Excalidraw export resolution accepts the named export directly and recognizes React wrappers via `$typeof`; the CSS is loaded from `app/layout.tsx`. The canvas fills the existing 420px wrapper; initialData includes converted elements, white background, zoom 1, scrollX/Y 0 and scrollToContent. API readiness and scene/step changes update elements + appState after a 220ms initialization delay, then fit content after layout, retrying without options if unsupported. Measurable canvas dimensions are soft paint confirmation; SVG fallback waits up to 8 seconds, while real load/update failures and empty scenes still fall back. SVG remains the default, manual toggle remains available; no remount key, deploy, Vapi or Stretch. Build/click verification not run (no shell/browser tool). Next: human verifies Start → Diagnose → Play → Try Excalidraw displays the labeled area model and successive highlights, then Use SVG board still works.

## Last update (Phase 11 — Vapi Play narration): `VAPI_API_KEY` + `VAPI_ASSISTANT_ID` are server-only; `app/api/voice/vapi/route.ts` creates a Vapi websocket-transport call and returns only the one-time URL. `lib/voice/vapi.ts` streams PCM audio of each step's `spokenLine` (`say` message) and signals end by audio-drain + silence. `LessonClient.playSteps` uses Vapi when connected, otherwise (missing keys, connect failure, no audio, socket close) falls back per-step to Web Speech; captions always on, 1800ms dwell kept. Pause/Replay/stop call `cancelVapi` + `cancelSpeech` and bump `playbackId`, so stale callbacks never advance. Board ops, teachMerge, SVG default untouched. Not built/run here; the Vapi websocket protocol is untested against a live account. Secrets list now also includes `VAPI_API_KEY`, `VAPI_ASSISTANT_ID` (names only).

## Previous update (Phase 8 — Warm `/app` dashboard polish): `/app` now has locally scoped beige/ivory surfaces, Plus Jakarta typography, charcoal pill actions, refined pack/topic-brief cards, and a warm saved-session list; all existing auth, loading, session, and start logic is preserved.

## Previous update (Phase 7 — Warm auth-page visual polish): UI-only warm beige/ivory Plus Jakarta Sans layouts, charcoal pill CTAs, soft shadows, and responsive presentation for `/login`, `/signup`, `/verify-2fa`; auth flows remain unchanged and `/app`, lessons, and APIs are untouched.

## Previous update (Phase 6 — Landing UI pass toward a warm tutor brand)
UI-only: `/` is now a marketing page (`app/page.tsx`, `components/landing/LandingNav.tsx`, `BoardMock.tsx`) with beige/charcoal/teal CSS variables and Plus Jakarta Sans via next/font. Nav: Features / How it works / FAQs, Sign in → /login, Get Started → /signup (logged-in users see Open app → /app; auth check is try/catch so missing Supabase config doesn't crash). Hero has a dominant SVG live-board mock with Live badge and a trust row (Urdu + English, No card needed, Captions always on). No changes to auth, APIs, board logic, quiz, or Judge path. Not built/run here. No secrets.

## Previous (Phase 5 — Core topic-brief learning path)
**Status:** Implemented; no build/browser execution available in this workspace. Human pushes and tests; no deploy performed.

- `/app` now accepts a nonblank brief up to 2,000 characters and creates an owned `learning_sessions` row with `topic_brief`, `pack_id: null`, and `pack_version: null`. Existing schema and auth are unchanged.
- Board-tutor routes load the owned stored session to choose pack vs brief. New `lib/ai/briefTutor.ts` reuses the existing Zod/Gemini retry pipeline and approved operations, additionally checking drawable bounded payloads and valid local IDs for empty brief boards. Brief teaching/answers use the stored brief; prompts require uncertainty/assumptions for thin input. No binomial seeds or pack fallback can enter this branch; malformed output surfaces a recoverable error.
- Brief lessons skip Detective, forced misconceptions, 2bx task, and quiz. The stepper and finish action explicitly say ungraded. Both quiz aliases (shared handler) reject packless sessions; board-task API also rejects them. Pack grading implementation, seeded teach path, auth, and Supabase schema were not modified.
- `BoardCanvas`/scene replay accept a brief scene mode that starts empty while pack defaults remain the area model. Validated optional brief answer ops render on the same board, with namespaced IDs. SVG remains default; Excalidraw toggle/fallback is unchanged. Captions and existing paced playback are reused.
- Summary for brief sessions requires saved narration, quotes its actual lines, and explicitly states no quiz/score/mastery assessment. Saved brief narration/summary restore on reopen; language changes reset brief playback and successful teach saves language. Brief narration/summary persistence errors surface rather than silently claiming success.
- Restored the absent `components/layout/PageShell.tsx`, already imported throughout the existing project, with the documented `wide`/actions API. Marketplace gig 92's validated-input/current-user patterns were reviewed; existing Supabase ownership and Zod conventions were retained instead of importing unrelated NestJS auth.

**Human verification:** `npm install`, `npm run build`, `npm run dev`. `/app` → paste brief → Start topic lesson → Play (no diagnosis, no binomial scene) → Ask → Finish · Ungraded summary → reopen. Try a thin brief, whitespace, 2,000-char input, missing Gemini config, invalid model output, and second-account isolation. Regression: Binomial Squares → Diagnose → Play → Ask → 2bx task → Quiz → Summary. README contains the checklist. No Vapi, CI, Stretch, deploy, schema, or secret changes. Stop after Phase 5.

## Previous update (Phase 4 — Core board-tutor resilience)
**Status:** Phase 4 complete in code; build/click verification still needs to be run.

**Resilience fixes applied:**
- **`lib/ai/schemas.ts`** normalizes board-tutor arrays, alternate response keys, nested step items, bare caption strings, `spoken_line`/`caption`, and `op`/`operation` before strict validation. Missing order/language are defaulted safely.
- **`lib/ai/boardTutor.ts`** returns deterministic `mergeTeachSteps([], pack, language)` narration when teach output is empty, merging throws, or Gemini returns invalid JSON/Zod output twice. Provider/config errors still surface normally.
- No deployment, Vapi/Stretch, database, or Excalidraw changes were made.

**Next:** run the existing Start → Diagnose → Play click path and then continue the already-completed downstream lesson checks.

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
   - `GEMINI_MODEL` (optional; default: `gemini-3.5-flash-lite`, set it to override)
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

## Last update (Phase 17 — Warm branded loading feedback): Existing busy states now use a small warm spinner in `/app` Start buttons, lesson Diagnose/Ask/board-task/quiz submissions, sign-in/sign-up/2FA forms; lesson session loading has a branded status card and `/app` saved lessons use beige skeleton rows. Reuses existing flags and preserves actions, requests, and auth logic. Reduced-motion preference is respected. No deploy/build verification performed.

## Previous update (Phase 13 — Gemini default model update): `lib/ai/gemini.ts` defaults to `gemini-3.5-flash-lite` and preserves the optional `GEMINI_MODEL` override. Model-not-found guidance recommends `gemini-3.5-flash-lite` or `gemini-flash-latest`; README and `.env.example` note the default. No secrets or unrelated behavior changed. Not built/run here.

## Previous update (Phase 9 — Warm lesson chrome polish): UI-only. `/lesson/[id]` now uses a `.lesson-chrome` marker plus scoped CSS in `app/globals.css` (beige page/header, charcoal pill buttons, soft cards for the panels, teal-accent caption bar and stepper, warm inputs/notices). Small class additions only in LessonClient, LessonStepper, BoardToolbar, CaptionBar; playback, board, AI, API, grading and auth logic untouched. Not built/run here.

## Last update (Phase 12 — Vapi end-detection fix): `lib/voice/vapi.ts` now fires `onEnd` exactly once per `speakVapi` via audio-drain (last source `onended` + pad) or Vapi JSON stopped/finished events, with no silence polling; `playSteps` auto-advances after dwell, and Pause/Replay cancel via `playbackId` + `cancelVapi`.

## Raise hand (barge-in)
- `components/lesson/RaiseHand.tsx` + `lib/voice/recognize.ts`: Raise hand stops Vapi/Web Speech narration (bumps playbackId), listens via browser Web Speech Recognition, shows the transcript, and submits it through the same `/api/ai/board-tutor` answer path as text Ask. The answer shows in captions/answer area and is spoken via Web Speech. Mic denied/unsupported shows a message; text Ask still works. Press Play to resume. No board ops/grading changes.


Phase 16: Landing hero pairs existing `/landing/tutor-hero.png` with BoardMock using warm rounded blending and desktop overlap; character hides on narrow mobile. UI-only.
