# Prior Work — Visual AI Tutor

**Team:** Muhammad Taha Farrukh, Muhammad Uzzam Siddiqui, Uzair Ahmed, Muhammad Saad  
**Event:** DevMarketplace × NED · official product coding starts **9:00 AM PKT, 19 October 2026**

## Organizer note (eligibility)

Pre-build **documentation and planning** in this repo is intentional and allowed under typical event rules: *ideas and specs may exist before start; product application code may not.*

**What is in git before / at kickoff = docs only, not a working app.**

| Allowed before 9:00 AM PKT 19 Oct | Not present / not reused |
|----------------------------------|---------------------------|
| Idea, pitch, `SPEC.md` | Next.js / React app source |
| `TECH.md` (stack decisions) | Supabase migrations already applied as product DB |
| `AGENTS.md`, `.agents/skills/` (AI readiness) | Deployed Vercel product URL from before start |
| `PRIOR_WORK.md` (this file) | Copied AgentHack or other teams’ product code |
| `.gitignore` | Pre-built Excalidraw board library / private binary |

We are **not** submitting a finished product as “from scratch.” We disclose planning docs so judges and DevMarketplace agents share one source of truth. All **implementation** (UI, API, schema, board player, deploy) happens **during** the build window with allowed tools.

If anything here is unclear, we will correct this file immediately on request.

---

## 1. Files prepared before product coding

| File | Purpose | Product code? |
|------|---------|---------------|
| `SPEC.md` | Product scope, Core/Stretch, Judge path, M1–M6 | No |
| `TECH.md` | Locked stack, fallbacks, why each tool | No |
| `AGENTS.md` | Instructions for DevMarketplace coding agents | No |
| `.agents/skills/core-mvp/SKILL.md` | AI-readiness skill: Core MVP only | No |
| `PRIOR_WORK.md` | This disclosure | No |
| `.gitignore` | Keeps secrets / local notes out of git | No |

**Local only (not required in public git):** `BUILD_FLOW.md` (team day plan), `SPEC_AI_TUTOR.md` (local SPEC copy), prompt drafts humans paste into DevMarketplace.

---

## 2. Excalidraw — research & planned setup (not shipped code)

Before the build we decided *how* Excalidraw will be integrated; we did **not** ship a finished board app:

1. **Runtime (judges / Vercel):** `@excalidraw/excalidraw` via npm, client-only (`dynamic` import, `ssr: false`). Gemini returns **Zod-validated JSON board operations**; the app applies them live (draw + captions + TTS).
2. **Authoring only (optional):** Excalidraw MCP / IDE tooling may help while coding. **Judges do not use MCP** — only the public URL.
3. **Fallback:** Same operation schema → React/SVG area-model if Excalidraw blocks the deadline.
4. **Ops to implement during the event:** `add_text`, `add_shape`, `update_label`, `highlight`, `clear_highlight`.
5. **Persistence plan:** scene / element IDs as `BoardState`; pack `2bx` graded by template IDs in app code.

No pre-built Excalidraw product binary or private board package is imported as prior product code.

---

## 3. Other locked decisions (planning only)

- **AI:** Gemini 2.5 Flash + Zod (Detective, Board Tutor, Quiz explain).
- **Auth / data:** Supabase Auth + TOTP 2FA, Postgres, RLS.
- **Grading:** mathjs + app completion/coefficient checks.
- **Core voice:** Web Speech + always-on captions; **Uplift AI** preferred for Urdu TTS when available.
- **Stretch (after Core):** Vapi teach/viva; LiveKit = Roadmap.
- **Deploy:** Vercel + Supabase.

---

## 4. What we will build during the event

SPEC **Core:** Next.js app, schema, auth, pack content, live board teach loop, Q&A, quiz, summary, README, `AI_DISCLOSURE.md`, two mid-build code gigs, public deploy.

**Stretch** only if Core Judge path (SPEC §8) is green: Vapi, barge-in, Teach-the-AI, viva.

---

## 5. AI tools disclosure

- **During the event (coding):** DevMarketplace agents, per organizer rules (other coding agents only if organizers allow).
- **Before start (docs/pitch only):** Assistants such as Cursor may have helped draft SPEC / PRIOR_WORK / AGENTS text — **not** to produce shippable product application code before 9:00 AM PKT 19 October 2026.
- Runtime product AI (Gemini, Uplift, Vapi if used) will be listed in `AI_DISCLOSURE.md` as we build.

---

## 6. Ownership

All prior documents and decisions above are owned by the team listed at the top. We will update this file during the event if anything changes.
