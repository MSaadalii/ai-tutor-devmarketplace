# Visual AI Tutor — Technology Document

This document lists the **chosen stack**, **why each piece is used**, **fallback options**, and **recommended supporting tools** for the four-day Devmarketplace × NED build (19–22 October 2026).

Product code starts only after **9:00 AM PKT on 19 October**. Until then this file is documentation only.

---

## 1. Locked Core Stack

| Layer | Choice | Role |
|-------|--------|------|
| Application | **Next.js** (App Router) + **TypeScript** | Web UI, API routes, server actions |
| Styling | **Tailwind CSS** + **shadcn/ui** | Fast, consistent UI without custom design system work |
| Whiteboard | **Excalidraw** (`@excalidraw/excalidraw`) | Interactive area-model board and element selection |
| Whiteboard fallback | **React + SVG** area-model renderer | Same validated operation schema if Excalidraw slips |
| Auth | **Supabase Auth** with **TOTP 2FA** | Sign-up, sign-in, mandatory 2FA (M3) |
| Database | **Supabase Postgres** | Persistent sessions, attempts, board state (M2) |
| Authorization | **Row Level Security (RLS)** + server checks | Per-account isolation |
| Storage | **Supabase Storage** | Optional assets / exports later |
| AI | **Google Gemini API** — **Gemini 2.5 Flash** | Live diagnosis, narrated board steps, transfer explanation (M1) |
| Output validation | **Zod** | Structured JSON schemas for Detective, Board Tutor, Transfer Coach |
| Algebra | **mathjs** | Parse/evaluate expressions; app code owns completion + coefficient checks |
| Narration | **Web Speech API** (`speechSynthesis`) | English/Urdu text-to-speech with always-on captions |
| Hosting | **Vercel** (app) + **Supabase** (data/auth) | Deployed judge URL |
| Package manager | **pnpm** or **npm** | Team picks one and sticks to it |
| Repo | Public **GitHub** | SPEC, README, AI_DISCLOSURE, regular commits |

---

## 2. Why These Choices

### Next.js + TypeScript
- One codebase for UI and API.
- Fast Vercel deploy for the judge URL.
- Strong TypeScript types for Zod schemas and board operations.

### Supabase
- Managed Postgres, Auth, Storage, and RLS in one place.
- TOTP 2FA is the event’s hardest pass/fail item — prefer a managed provider over a custom 2FA build.
- Free-tier friendly for a four-day hackathon.

### Gemini 2.5 Flash
- Hosted model (counts for M1).
- Free-tier quotas suitable for demo volume.
- Fast enough for live diagnose → board → transfer loops.
- Structured JSON responses validated with Zod.

### Excalidraw
- Battle-tested canvas for draw/highlight/select.
- Scene JSON is easy to persist as `BoardState`.
- Fallback SVG renderer keeps Core alive if integration costs too much time.

### mathjs + application grading
- LLM must not invent algebra results.
- mathjs parses and evaluates; the app checks:
  1. **Completion** — expanded form (no parentheses / powers of sums).
  2. **Correctness** — coefficients match the expected expansion.

### Web Speech API
- Zero extra Gemini cost for narration.
- Captions always shown; audio is progressive enhancement.
- Cloud TTS only for Urdu if browser voices fail (must be disclosed).

---

## 3. AI Roles and Tooling

| Role | Model | App-side tools |
|------|-------|----------------|
| Misconception Detective | Gemini 2.5 Flash | Curriculum pack IDs, probe limit (≤2), Zod outcome schema |
| Board Tutor | Gemini 2.5 Flash | Approved board ops, narration steps (≤6), Zod step schema |
| Transfer Coach | Gemini 2.5 Flash | Explains grade **after** deterministic scoring |

**Not AI:** board-task grading (template element IDs), transfer completion/correctness checks, auth, RLS, persistence.

**Session limits:** ≤2 diagnostic probes, ≤6 Gemini calls per session, ≤10 new sessions per account per hour.

---

## 4. Recommended Libraries and Packages

### Must install (Core)

| Package | Purpose |
|---------|---------|
| `next` | Application framework |
| `react` / `react-dom` | UI |
| `typescript` | Types |
| `tailwindcss` | Styling |
| `@supabase/supabase-js` | Client |
| `@supabase/ssr` | Cookie/session helpers for Next.js |
| `zod` | Schema validation |
| `mathjs` | Expression parsing/evaluation |
| `@excalidraw/excalidraw` | Whiteboard |
| `class-variance-authority` / `clsx` / `tailwind-merge` | shadcn/ui helpers |

### Strongly recommended

| Package / tool | Purpose |
|----------------|---------|
| `vitest` or `jest` | Unit tests for grading fixtures |
| Playwright / Cypress | Judge Test Path + isolation E2E |
| `eslint` + `prettier` | Consistent code |
| Environment via `.env.local` | Secrets never committed |

### Stretch / optional

| Package / service | Purpose |
|-------------------|---------|
| Cloud TTS (e.g. Google Cloud TTS) | Urdu-only fallback if browser voices fail |
| PDF lib (`@react-pdf/renderer` or similar) | Roadmap PDF notes |
| Browser STT / Web Speech Recognition | Roadmap speech-to-text **input** |

---

## 5. Services and Accounts to Provision Before Kickoff

Allowed before 9:00 AM on 19 Oct (environment setup only — **no product code**):

1. GitHub org/repo (public) with documentation only.
2. Supabase project (Auth, Postgres, Storage).
3. Google AI Studio / Gemini API key (free tier).
4. Vercel account linked to the repo (deploy after kickoff).
5. Individual Devmarketplace accounts for all four members.
6. Devpost registration for all four members.

**Do not commit** `.env`, service-role keys, or OAuth client secrets.

Suggested env names:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GEMINI_API_KEY=
# Optional Urdu fallback only:
# GOOGLE_TTS_API_KEY=
```

---

## 6. Architecture Sketch

```
Browser (Next.js client)
  ├─ Auth + TOTP UI
  ├─ Lesson shell
  ├─ Excalidraw / SVG board
  ├─ Captions + speechSynthesis playback
  └─ Transfer input
        │
        ▼
Next.js API routes / server logic
  ├─ Detective endpoint → Gemini + Zod
  ├─ Board Tutor endpoint → Gemini + Zod
  ├─ Board-task grader → template element IDs
  ├─ Transfer grader → mathjs + completion/correctness rules
  └─ Session / Attempt / BoardState persistence
        │
        ├─ Supabase Auth + Postgres + RLS
        └─ Gemini 2.5 Flash
```

---

## 7. Locales, Fonts, and Browser Support

| Concern | Recommendation |
|---------|----------------|
| English TTS | `en-US` via `speechSynthesis` |
| Urdu TTS | `ur-PK` when available; else captions-only notice |
| Urdu captions | `dir="rtl"` + Urdu-capable font (e.g. **Noto Nastaliq Urdu** or **Noto Sans Arabic**) |
| Equations | Always LTR inside RTL captions |
| Target browsers | Chrome + Safari (Day 4 narration tests on both) |
| Playback start | Only after user click (**Play explanation**) |

---

## 8. Fallbacks (Build Risk Controls)

| Risk | Fallback |
|------|----------|
| Excalidraw too slow to integrate | React/SVG area model with same operation schema |
| No Urdu browser voice | Visible notice + captions only |
| Unreliable Urdu voices in testing | Cloud TTS for Urdu only → list in `AI_DISCLOSURE.md` |
| Gemini timeout / bad JSON | One retry, then recoverable UI error; never fake a diagnosis |
| Stretch unfinished | Ship Core only; Stretch is optional |

---

## 9. Testing Stack

| Type | Tooling | What to cover |
|------|---------|---------------|
| Unit | Vitest/Jest | Correct expansion, unexpanded equivalent, typo, missing middle term, sign error, arithmetic slip, invalid characters |
| Schema | Zod + Vitest | Detective outcomes, narration steps (≤6, 160-char lines) |
| E2E | Playwright preferred | Full Judge Test Path, correct-answer skip path, two-account isolation |
| Manual | Two teammates | 10 Urdu seed explanations (RTL + terminology) |
| Device | Real phones/laptops | Narration sync, captions-only degradation |

---

## 10. Devmarketplace Code Gigs (Tech Artifacts)

Planned extractable gigs (written during the event):

1. **Misconception Detective Pack** — versioned catalog + Zod probe/outcome schemas.
2. **Validated Excalidraw Operation Renderer with Narration Playback** — board-op schema + speech-synced step player.

---

## 11. Explicitly Not Recommended for Core

| Avoid in Core | Reason |
|---------------|--------|
| OpenAI / Anthropic paid APIs as primary | Budget; Gemini free tier is enough |
| Ollama / local-only models | Harder to keep live for judges; may fail M1 if not hosted |
| NestJS / separate Express backend | Extra deploy surface for four days |
| Firebase as second cloud | Stick to one managed data platform |
| Baileys / WhatsApp / email | Not part of this product |
| LLM-invented simulation physics | Use verified/deterministic components only |
| Custom 2FA from scratch | Too risky for M3 |

---

## 12. Day-by-Day Tech Focus

| Day | Technology focus |
|-----|------------------|
| 1 | Supabase Auth/TOTP, schema, RLS, lesson shell, grading fixtures |
| 2 | Gemini Detective + Zod, persistence, first Vercel deploy |
| 3 | Excalidraw/SVG, narration loop, board task, transfer, second gig |
| 4 | Chrome/Safari device tests, Urdu fallback, docs, demo video |

---

## 13. Disclosure Checklist

List in `AI_DISCLOSURE.md` during the build:

- Gemini 2.5 Flash (and any other models)
- Cursor / coding assistants used
- Excalidraw, mathjs, shadcn/ui, Supabase, Next.js, etc. with licences/links
- Any cloud TTS used for Urdu
- Any Devmarketplace gigs reused

---

## 14. One-Line Stack Summary

**Next.js + TypeScript + Tailwind/shadcn + Excalidraw (SVG fallback) + Supabase (Auth/TOTP/Postgres/RLS) + Gemini 2.5 Flash + Zod + mathjs + Web Speech API + Vercel.**
