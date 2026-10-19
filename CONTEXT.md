# CONTEXT.md — Visual AI Tutor (Session Handoff)

Read this first in every new chat before touching code.

## Last update
2026-10-19 PKT — Phase 2 Gemini APIs + grading completed by Taha on owner account.

## Lane finished
Phase 2: Gemini APIs + grading (Taha)

## Done this session
Phase 1 (Uzair):
- Working email/password signup + login via Supabase SSR cookies.
- Mandatory TOTP 2FA: enrollment at signup, challenge at login.
- `/app` protected; unauthenticated users are redirected to `/login`.
- Middleware enforces AAL2 on `/app` and `/lesson/*`.
- Core Postgres schema (`learning_sessions`, `attempts`, `board_states`, `narration_steps`, `model_runs`, `quiz_results`, `lesson_summaries`, `activity_events`) per SPEC §9.
- Owner-only RLS policies on all Core tables.
- `/app` dashboard creates/lists sessions to verify persistence across sign out/in.

Phase 2 (Taha):
- Zod schemas: Detective, Board Tutor (≤6 steps, `spokenLine` ≤160), Quiz explain, board Q&A.
- `lib/ai/gemini.ts` + `lib/ai/detective.ts` / `boardTutor.ts` / `quizCoach.ts`; Zod validate + one invalid-JSON retry + recoverable error.
- Routes: `POST /api/ai/detective`, `/api/ai/board-tutor`, `/api/ai/quiz-explain` (old routes delegate to the same handlers).
- mathjs grading: completion + correctness; rejects re-entered `(x+3)^2` and `(x+3)(x+3)` as completion fail; 2bx task graded by template element IDs.
- Pack quiz answers fixed in `content/packs/binomial_square/v1.json`.
- `LessonClient` wired to `/api/ai/*` routes (UI board is still a stub — no Excalidraw yet).
- Optional `model_runs` logging when the table exists.
- `npm run build` passes.

## Important paths
| Path | Purpose |
|------|---------|
| `app/login/page.tsx` | Sign in + TOTP challenge |
| `app/signup/page.tsx` | Sign up + TOTP enrollment (QR scan) |
| `app/verify-2fa/page.tsx` | TOTP challenge for unenrolled returning users |
| `app/app/page.tsx` | Protected dashboard; creates `learning_sessions` rows |
| `app/lesson/[sessionId]/page.tsx` | Lesson page (LessonClient) |
| `middleware.ts` | Auth/AAL2 route guards |
| `lib/supabase/*.ts` | Supabase browser/server/middleware clients |
| `lib/ai/schemas.ts` | Zod schemas for AI outputs |
| `lib/ai/gemini.ts` | Gemini 2.5 Flash JSON caller + retry |
| `lib/ai/detective.ts`, `boardTutor.ts`, `quizCoach.ts` | Prompt builders |
| `lib/grading/algebra.ts` | mathjs grading functions |
| `lib/routes/ai/*.ts` | Shared AI route handlers |
| `app/api/ai/diagnose/route.ts` | Detective endpoint |
| `app/api/ai/board-tutor/route.ts` | Board Tutor endpoint |
| `app/api/ai/quiz-explain/route.ts` | Quiz/Transfer Coach endpoint |
| `app/api/board-task/route.ts` | 2bx grading endpoint |
| `supabase/migrations/0001_core_schema.sql` | Schema + RLS |
| `content/packs/binomial_square/v1.json` | Core pack data |

## Env / dashboard flags (no secrets)
Add these names in the workspace **Secrets** panel:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` — server-only, never exposed to browser
- `GEMINI_API_KEY` — required for AI routes (server-only)
- `UPLIFT_AI_API_KEY` — optional, later phases (server-only)

Supabase Auth dashboard setting recommended for hackathon demo:
- Turn **OFF** “Confirm email” so sign-up goes straight to TOTP enrollment.

## Blockers
None.

## Not done
- Excalidraw live board rendering
- Full Judge UI polish
- Public Vercel URL / deploy verification
- Vapi / Teach-the-AI / viva (Stretch)

## Exact next lane
**Phase 3: Live Excalidraw board (Uzzam).**
- Install `@excalidraw/excalidraw` client-only (`ssr: false`).
- Build `applyOperation` player for validated board steps.
- Captions always on + Web Speech narration.
- Wire the **Play** button to `/api/ai/board-tutor` steps.
- Do **NOT** start Vapi or any Stretch work.