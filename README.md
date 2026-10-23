# Visual AI Tutor

[![Live demo](https://img.shields.io/badge/Live-ai--tutor--devmarketplace.vercel.app-0D9488?style=for-the-badge&logo=vercel)](https://ai-tutor-devmarketplace.vercel.app/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Auth_+_Postgres_+_RLS-3FCF8E?style=flat-square&logo=supabase&logoColor=white)](https://supabase.com/)
[![Gemini](https://img.shields.io/badge/Google-Gemini_2.5_/_3.5-4285F4?style=flat-square&logo=google&logoColor=white)](https://ai.google.dev/)
[![Vercel](https://img.shields.io/badge/Deploy-Vercel-000000?style=flat-square&logo=vercel)](https://ai-tutor-devmarketplace.vercel.app/)
[![Devpost](https://img.shields.io/badge/Devpost-Build_Next_Big_Thing-003E54?style=flat-square)](https://build-next-big-thing-with-ai.devpost.com/)

STEM whiteboard tutor: a student picks a pack or pastes a topic → **Gemini** returns Zod-validated Excalidraw/SVG board ops → live draw + captions (Vapi / Web Speech; Urdu via Web Speech) → board Q&A → 2bx task → quiz → summary → optional viva / Teach-the-AI. Auth is **Supabase email + TOTP 2FA** with RLS isolation.

| | |
|---|---|
| **Live app** | https://ai-tutor-devmarketplace.vercel.app/ |
| **Repository** | https://github.com/MTahaFarrukh/ai-tutor-devmarketplace |
| **Hackathon** | [Build the Next Big Thing with AI](https://build-next-big-thing-with-ai.devpost.com/) · NED / DevMarketplace |

## Judge path (Core — M1–M4)

Private window → live URL → **Sign up** → set up **TOTP 2FA** → `/app` → **Binomial Squares → Start** → submit pre-filled `x^2 + 9` → **Play explanation** → **Ask** a board question → select both `3x` regions (2bx) → **quiz** → **summary** → sign out → sign back in (data still there). Optional: **Start viva** / **Teach the AI**. Second account must not see the first account’s lessons.

## Stack

| Layer | Choice |
|-------|--------|
| App | Next.js (App Router), TypeScript, Tailwind, shadcn/ui |
| Auth + DB | Supabase Auth (email + TOTP MFA), Postgres, RLS |
| AI | Google Gemini (Zod-validated JSON), mathjs for pack grading |
| Board | SVG default; optional `@excalidraw/excalidraw` |
| Voice | Vapi (optional) → Web Speech fallback; captions always on |
| Host | Vercel |

## DevMarketplace gigs (M6 — ≥2 published)

1. [Supabase TOTP MFA gate](https://beta.devmarketplace.com/gig/f77395e7-1a49-4a2a-8d6c-ad3efaaac3c9) — `gigs/01-supabase-totp-gate/`
2. [Zod-validated board ops + narration](https://beta.devmarketplace.com/gig/a69aec46-bd62-4a70-9128-9d18db35d122) — `gigs/02-zod-board-ops-narration/`

## Project docs (M5)

| File | Role |
|------|------|
| [`SPEC.md`](./SPEC.md) | Product scope (Core / Stretch / Roadmap) |
| [`AI_DISCLOSURE.md`](./AI_DISCLOSURE.md) | Models, tools, OSS components |
| [`PRIOR_WORK.md`](./PRIOR_WORK.md) | Pre-build decisions / declarations |
| [`TECH.md`](./TECH.md) | Locked stack and fallbacks |
| [`AGENTS.md`](./AGENTS.md) | Agent build rules |
| [`CONTEXT.md`](./CONTEXT.md) | Session handoff |

## Run locally

```bash
npm install
cp .env.example .env.local   # fill secrets (names below)
npm run dev                  # http://localhost:3000
npm run build                # production check
```

## Secrets (names only — never commit values)

| Name | Required | Where |
|------|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | yes | browser + server |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | browser + server (RLS) |
| `SUPABASE_SERVICE_ROLE_KEY` | not needed for Core | server only |
| `GEMINI_API_KEY` | yes | server only |
| `GEMINI_MODEL` | optional | defaults to `gemini-3.5-flash-lite` |
| `VAPI_API_KEY` / `VAPI_ASSISTANT_ID` | optional | server only; Web Speech if empty |
| `UPLIFT_AI_API_KEY` | optional | stub / later; Web Speech if empty |

Missing config shows on-screen notices (not a blank page). `GET /api/health` returns booleans only.

## Database

Apply **`supabase/migrations/0001_core_schema.sql`** once (Dashboard SQL Editor or `supabase db push`). Idempotent. Then optionally run `supabase/tests/rls_isolation.sql` (expects `RLS ISOLATION: PASS`).

Older migration filenames in the folder are no-op stubs for history only.

## Auth (Supabase)

1. Enable **Email** provider and **MFA (TOTP)**.
2. For a fast judge demo you may turn off “Confirm email”.
3. Site URL + Redirect URLs: deployed origin and `http://localhost:3000/**`.

## Deploy (Vercel)

1. Import the GitHub repo (Next.js, `npm run build`).
2. Set Production + Preview env: `NEXT_PUBLIC_SUPABASE_*`, `GEMINI_API_KEY`, optional `GEMINI_MODEL` / Vapi keys. Do not expose service role to the client.
3. Add the Vercel URL to Supabase Redirect URLs.
4. Smoke the **Judge path** above on the public URL.

**Live URL:** https://ai-tutor-devmarketplace.vercel.app/

## Demo click path

1. **Start lesson** / **Sign in** → TOTP at `/verify-2fa`.
2. `/app` → **Binomial Squares → Start**.
3. Diagnose (`x^2+9`) → **Play explanation** (captions on; SVG board default; **Try Excalidraw** optional).
4. Ask → select both `3x` regions → quiz → summary.
5. Language toggle: switch EN/UR, then **Play again** for narration in that language (board labels may stay English).

## Topic-brief path

On `/app`, paste a brief (≤2,000 chars) → **Start topic lesson**. No Detective / 2bx / quiz; Gemini teaches from the brief on an empty board; **Ungraded summary**. Pack Judge path unchanged.

## Key paths

- `app/lesson/[id]/LessonClient.tsx` — lesson phases, playback, language toggle
- `components/board/*`, `lib/board/ops.ts` — SVG / Excalidraw + op replay
- `lib/ai/*` — Gemini roles + Zod schemas + teachMerge
- `lib/routes/sessionGuard.ts` — ownership on API routes
- `lib/apiError.ts` — clear config / provider errors
