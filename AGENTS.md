# AGENTS.md — Visual AI Tutor

Instructions for **DevMarketplace coding agents** working in this repo. Humans provide short task prompts at runtime (not stored as a prompt dump in git). Read `SPEC.md` and `PRIOR_WORK.md` before large changes.

## Product (one sentence)

STEM tutor: topic/pack in → Gemini returns validated Excalidraw board JSON → live draw + Web Speech/captions (Uplift AI for Urdu when configured) → board text Q&A → quiz → lesson summary → saved under Supabase Auth + TOTP 2FA.

## Source of truth

| File | Role |
|------|------|
| `CONTEXT.md` | **Read first in every new chat; update before every push** |
| `SPEC.md` | Product scope: Core vs Stretch vs Roadmap |
| `PRIOR_WORK.md` | Pre-build decisions (Excalidraw setup plan, no pre-start product code) |
| `TECH.md` | Locked stack, fallbacks, why each tool |
| `AGENTS.md` | How agents must build |
| `.agents/skills/` | Focused skills (e.g. core-mvp) |
| `AI_DISCLOSURE.md` | Create during build; list models/tools |

**Core only until Judge Test Path (SPEC §8) is green on a public URL.** Stretch (Vapi, Teach-the-AI) only after Core is deployed.

## Stack (locked — do not substitute without asking)

Next.js (App Router) + TypeScript + Tailwind + shadcn/ui · Supabase (Auth TOTP, Postgres, RLS) · Gemini 2.5 Flash + Zod · `@excalidraw/excalidraw` (client-only; SVG fallback OK) · mathjs · Web Speech API · **Uplift AI** (Urdu TTS when available) · Vercel · **Vapi** (Stretch only).

## Team lanes (do not cross without merge plan)

| Person | Owns | Do not touch first |
|--------|------|-------------------|
| **Uzair** | Auth, schema, RLS, deploy, env | Board UI, pack content |
| **Taha** | Gemini roles, Zod schemas, API routes, grading | Auth UI polish |
| **Uzzam** | Excalidraw/SVG board, play/pause, selection Q&A UI | RLS policies |
| **Saad** | `binomial_square` pack JSON, Urdu seeds, README, gigs, E2E checklist | Infra secrets |

## Hard rules

1. **No product code before 9:00 AM PKT, 19 October 2026.** During the event, follow organizer rules for which coding agents are allowed.
2. Implement **SPEC Core** first. Do not start Vapi / Teach-the-AI / LiveKit until Core demo path works.
3. Gemini output must be **Zod-validated**. Never draw unvalidated board ops. Never pretend hardcoded text is a live model call.
4. Pack algebra + `2bx` hits graded in **app code** (mathjs + templates), not by Gemini.
5. Secrets only in env / Supabase; never commit `.env`.
6. Prefer small commits: one vertical slice per task (auth → schema → board → AI → quiz → summary → deploy).
7. Captions always on. Audio failure must not block the lesson.
8. Token discipline: one focused task per agent turn; reuse existing files; no drive-by refactors.

## Excalidraw setup (from PRIOR_WORK — implement during build)

- Package: `@excalidraw/excalidraw`, client-only (`ssr: false`).
- Input: Zod-validated ops from Board Tutor (`add_text`, `add_shape`, `update_label`, `highlight`, `clear_highlight`).
- MCP = optional authoring aid only; **not** required on the judge URL.
- Fallback: React/SVG area model with the same op applicator.

## Board narration step shape

`{ order, operation, spokenLine, language: "en" | "ur" }` — `spokenLine` ≤ 160 chars, plain text (no HTML).

## AI roles (Core)

| Role | Job |
|------|-----|
| Misconception Detective | Pack only; ≤2 probes; honest outcomes |
| Board Tutor | ≤6 validated steps + mid-lesson text Q answers |
| Quiz Coach | Explain after app grades |

## Definition of done (Core)

Judge can on **public URL**: sign up + TOTP → submit `x²+9` for `(x+3)²` → diagnosis → Play board explanation → text Q on selection → tap `2bx` → quiz → lesson summary → sign out/in with data; second account isolated.

## Stretch (later)

Vapi voice teach/viva + barge-in; Teach-the-AI. Web Speech / Uplift remain fallback. LiveKit = Roadmap only.
