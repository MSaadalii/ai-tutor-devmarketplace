# Prior Work — Visual AI Tutor

**Team:** Muhammad Taha Farrukh, Muhammad Uzzam Siddiqui, Uzair Ahmed, Muhammad Saad  
**Event:** DevMarketplace × NED · build window starts **9:00 AM PKT, 19 October 2026**

This file discloses **pre-build** work only. **No product application code** from before the official start time is reused in the shipped repo unless listed below and re-implemented during the event.

---

## 1. What existed before coding started

| Item | Status | Notes |
|------|--------|--------|
| Product idea / pitch | Pre-existing | Visual AI Tutor (whiteboard teacher, not chatbot) |
| `SPEC.md` | Written before build | Scope, Core/Stretch, Judge path, M1–M6 mapping |
| `TECH.md` | Local notes only | Stack decisions; **not** required in public repo |
| `AGENTS.md` / skills | Prepared for AI readiness | Guides DevMarketplace agents during the build |
| Architecture decisions | Pre-planned | See §2–3 |
| Product Next.js app / DB / deploy | **None before 9:00 AM PKT 19 Oct** | All implementation during hackathon |
| Copied AgentHack / other hackathon codebases | **Not reused** | Original tutor product |

---

## 2. Excalidraw — prior research & planned setup (not shipped code)

Before the build we locked how Excalidraw will be used:

1. **Runtime (judges / Vercel):** `@excalidraw/excalidraw` npm package in the browser (`dynamic` import, `ssr: false`). Gemini returns **validated JSON board operations**; the app applies them live (draw + captions + TTS).
2. **Authoring only (optional):** Excalidraw MCP / DevMarketplace tooling may help *while coding* diagrams or templates. **Judges do not need MCP** — they use the public URL only.
3. **Fallback:** Same operation schema → React/SVG area-model if Excalidraw integration blocks the deadline.
4. **Ops we will implement:** `add_text`, `add_shape`, `update_label`, `highlight`, `clear_highlight` (Zod-validated).
5. **Persistence:** Excalidraw scene / element IDs stored as `BoardState`; pack `2bx` graded by template element IDs in app code.

No pre-built Excalidraw app binary or private board library is carried into the event repo.

---

## 3. Other locked decisions (prior planning)

- **AI:** Gemini 2.5 Flash + Zod structured output (Detective, Board Tutor, Quiz explain).
- **Auth / data:** Supabase Auth + TOTP 2FA, Postgres, RLS.
- **Grading:** mathjs + app completion/coefficient checks (not LLM grades).
- **Core voice:** Web Speech API + always-on captions; **Uplift AI** preferred for Urdu TTS when available on DevMarketplace / our keys.
- **Stretch (after Core):** Vapi for voice teach/viva; LiveKit stays Roadmap.
- **Deploy:** Vercel + Supabase public URL for judging.

---

## 4. What we will build during the event

Everything in SPEC **Core**: Next.js app, schema, auth, pack content, live board teach loop, Q&A, quiz, summary, README, `AI_DISCLOSURE.md`, two mid-build code gigs, public deploy.

Stretch only if Core Judge path is green.

---

## 5. AI tools disclosure (build-time)

- **Allowed for coding during the event:** DevMarketplace agents (per organizer rules).
- **Planning / docs before start:** Cursor and similar assistants may have been used for SPEC/pitch text only — not for shipping product code before 9:00 AM PKT 19 Oct 2026.
- Full model/tool list will also appear in `AI_DISCLOSURE.md` as we build.

---

## 6. Contact / ownership

All prior documents and decisions above are owned by the team listed at the top. If organizers need clarification on any row, we will update this file during the event.
