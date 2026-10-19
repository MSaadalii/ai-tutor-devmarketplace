# Visual AI Tutor

Live whiteboard tutor for STEM students: Gemini returns validated Excalidraw board JSON → draw + captions/TTS → board Q&A → quiz → lesson summary → Supabase Auth + TOTP.

Product spec: [`SPEC.md`](./SPEC.md) · Agent rules: [`AGENTS.md`](./AGENTS.md) · Stack: [`TECH.md`](./TECH.md) · Prior work: [`PRIOR_WORK.md`](./PRIOR_WORK.md)

## Status

**Phase 1 — Auth + TOTP 2FA (Uzair) done:** Supabase email/password sign up/in, mandatory TOTP enrollment + challenge, protected routes, and the Core Postgres schema (sessions, attempts, board state, narration, quiz, summary) with per-account RLS.

**Phase 2 — Gemini APIs + grading (Taha) done:**
- Zod-validated Gemini 2.5 Flash calls for Detective (≤2 probes, honest outcomes), Board Tutor (≤6 steps, spokenLine ≤160 chars), and Quiz Coach.
- mathjs-based completion/correctness grading for binomial expansion; re-entering `(x+3)^2` fails completion.
- 2bx board-task graded by template element IDs in app code.
- Web Speech API narration with always-on captions; optional Uplift AI Urdu TTS when configured.
- Full `binomial_square` pack with misconception catalog, probes, quiz items, and narration seeds.
- API routes: `/api/diagnose`, `/api/board-tutor`, `/api/board-task`, `/api/quiz`, `/api/summary`.
- Lesson orchestration page flows through diagnosis → board play → text question → 2bx task → quiz → summary.

Phase 3 (Uzzam) will replace the board placeholder with the live Excalidraw/SVG renderer.

## Stack

Next.js (App Router) · TypeScript · Tailwind · Supabase · Gemini 2.5 Flash · Zod · mathjs · Excalidraw (next) · Vercel

## Local setup

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Without secrets the app renders a clear "Supabase is not configured" notice instead of crashing.

### Secrets

Add every name from [`.env.example`](./.env.example) in the workspace **Secrets** panel (the preview injects them as environment variables). For local dev, copy `.env.example` to `.env.local` and fill it in — never commit it.

### Supabase setup (auth + data)

1. Create a Supabase project; copy the URL and anon key into secrets.
2. Apply the schema: Supabase Dashboard → **SQL Editor** → run [`supabase/migrations/0001_core_schema.sql`](./supabase/migrations/0001_core_schema.sql) (creates Core tables + RLS owner-only policies).
3. Auth settings (Dashboard → Authentication):
   - Email/password provider enabled.
   - For the hackathon demo, turn **Confirm email off** so sign-up goes straight to TOTP enrollment (if left on, users confirm email first and enroll 2FA at first sign-in — the app handles both).
   - TOTP (MFA) is built in — no extra config.

### Auth flow

- **Sign up** (`/signup`) → password session (AAL1) → **TOTP enrollment** (`/verify-2fa`, QR + manual secret) → app at AAL2.
- **Sign in** (`/login`) → password → **TOTP challenge** (`/verify-2fa`) → app.
- Middleware guards `/app` and `/lesson/*`: no session → `/login`; session without AAL2 → `/verify-2fa`.
- Data persistence/isolation: every Core table carries `user_id` with RLS `auth.uid() = user_id` policies — sign out/in restores sessions, and a second account cannot read them.

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Local dev |
| `npm run build` | Production build |
| `npm run start` | Serve build |
| `npm run lint` | ESLint |

## Live URL

_Add Vercel URL here after first deploy (Day 2)._

## Team lanes

| Person | Owns |
|--------|------|
| Uzair | Auth, schema, RLS, deploy |
| Taha | Gemini + Zod APIs, grading |
| Uzzam | Excalidraw / SVG board |
| Saad | Pack content, docs, gigs |
