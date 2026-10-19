# AGENTS.md — Visual AI Tutor

Instructions for **DevMarketplace coding agents** working in this repo. Humans paste prompts from `HACKATHON_PROMPTS.md`. Read `SPEC.md` before large changes.

## Product (one sentence)

STEM tutor: topic/pack in → Gemini returns validated Excalidraw board JSON → live draw + Web Speech/captions → board text Q&A → quiz → lesson summary → saved under Supabase Auth + TOTP 2FA.

## Source of truth

| File | Role |
|------|------|
| `SPEC.md` | Product scope: Core vs Stretch vs Roadmap |
| `AGENTS.md` | How agents must build |
| `HACKATHON_PROMPTS.md` | Ordered human prompts per teammate |
| `AI_DISCLOSURE.md` | Create during build; list models/tools |

**Core only until Judge Test Path (SPEC §8) is green on a public URL.** Stretch (Vapi, Teach-the-AI) only after Core is deployed.

## Stack (do not substitute without asking)

Next.js (App Router) + TypeScript + Tailwind + shadcn/ui · Supabase (Auth TOTP, Postgres, RLS) · Gemini 2.5 Flash + Zod · `@excalidraw/excalidraw` (client-only; SVG fallback OK) · mathjs · Web Speech API · Vercel · **Urdu TTS:** prefer **Uplift AI** when available; else `speechSynthesis` + captions always on.

## Team lanes (do not cross without merge plan)

| Person | Owns | Do not touch first |
|--------|------|-------------------|
| **Uzair** | Auth, schema, RLS, deploy, env | Board UI, pack content |
| **Taha** | Gemini roles, Zod schemas, API routes, grading | Auth UI polish |
| **Uzzam** | Excalidraw/SVG board, play/pause, selection Q&A UI | RLS policies |
| **Saad** | `binomial_square` pack JSON, Urdu seeds, README, gigs, E2E checklist | Infra secrets |

## Hard rules

1. **No product code before 9:00 AM PKT, 19 Oct 2026** (event rule). After that, only DevMarketplace agents for coding (event rule).
2. Implement **SPEC Core** first. Do not start Vapi / Teach-the-AI / LiveKit until Core demo path works.
3. Gemini output must be **Zod-validated**. Never draw unvalidated board ops. Never pretend hardcoded text is a live model call.
4. Pack algebra + `2bx` hits graded in **app code** (mathjs + templates), not by Gemini.
5. Secrets only in env / Supabase; never commit `.env`.
6. Prefer small PRs/commits: one vertical slice per prompt (auth → schema → board → AI → quiz → summary → deploy).
7. Captions always on. Audio failure must not block the lesson.
8. Token discipline: one focused task per agent turn; reuse existing files; no drive-by refactors.

## Board operation schema (canonical)

Agents must generate/consume ops like:

- `add_text` | `add_shape` | `update_label` | `highlight` | `clear_highlight`

Each narration step: `{ order, operation, spokenLine, language: "en" | "ur" }` with `spokenLine` ≤ 160 chars, plain text (no HTML).

## AI roles (Core)

| Role | Job |
|------|-----|
| Misconception Detective | Pack only; ≤2 probes; honest outcomes |
| Board Tutor | ≤6 validated steps + mid-lesson text Q answers |
| Quiz Coach | Explain after app grades |

## Definition of done (Core)

Judge can on **public URL**: sign up + TOTP → submit `x²+9` for `(x+3)²` → diagnosis → Play board explanation → text Q on selection → tap `2bx` → quiz → lesson summary → sign out/in with data; second account isolated.

## Stretch (later)

Vapi voice teach/viva + barge-in; Teach-the-AI. Web Speech remains fallback. LiveKit = Roadmap only.
