# Visual AI Tutor — Product Specification

## 1. MVP at a Glance

- **Product vision:** a general student–teacher tutor. Topic or short brief in → **live AI teaching on Excalidraw** → student questions → quiz → lesson summary; Stretch adds Teach-the-AI and a **Vapi** voice-agent viva on the same deployed URL.
- **User:** STEM students (including NED) who need conceptual teaching, practice, and viva-style preparation.
- **Hackathon Core (what judges must complete):** `binomial_square` pack — sign up + TOTP 2FA → wrong answer → honest diagnosis → **live narrated Excalidraw whiteboard explanation by AI (draw + voice/captions)** → text question on board → `2bx` board task → interactive quiz/transfer → on-screen lesson summary → sign out/in with data intact.
- **Live whiteboard teaching is Core:** Gemini returns step-by-step board operations; the deployed app draws them live on Excalidraw (or SVG fallback) while speaking. Judges see this on the public URL without MCP.
- **Why a first pack:** four days need one deep, verifiable subject. Packs and topic briefs share one teach → ask → quiz → summary → save loop.
- **Stretch (after Core is green):** **Vapi** voice agent for teaching narration and oral viva; Teach-the-AI; barge-in. Core keeps Web Speech + captions as **fallback** so M1–M6 do not depend on Vapi.
- **Roadmap:** full syllabus upload, LiveKit multi-party classrooms, richer Vapi agent routing, test-prep engine, PDF notes, pack `round_robin_scheduler`.
- **Stack:** Next.js, TypeScript, Excalidraw npm package (SVG fallback), Supabase, Gemini 2.5 Flash, Zod, mathjs, Tailwind, shadcn/ui, Web Speech API, **Vapi** (Stretch), Vercel.
- **Differentiation:** one deployed product with Excalidraw board teaching, quiz, saved evidence, and (Stretch) Vapi voice + Teach-the-AI — chat is only for mid-lesson board questions.



## 2. Problem and Impact

Many AI tutoring products are chat-first: they return text answers and marks, without a board, spoken steps, interruption, teach-back, or a durable lesson record.

Students preparing for coursework and vivas need:

- **live visual explanation on a whiteboard**, not only paragraphs;
- spoken teaching they can pause or interrupt;
- mid-lesson questions;
- interactive quiz and test-style practice;
- teach-back (explain to someone who is wrong);
- live viva-style oral practice;
- a short lesson summary after class;
- saved evidence of attempts, not a vanishing chat.

A documented failure mode motivates the first pack: a student writes `(x+3)² = x²+9`. A [2024 study of 119 students and 13 teachers](http://hdl.handle.net/1942/43792) found the exact error `(a+b)² = a²+b²` among recurring misconceptions. Showing the missing `6x` without diagnosis, board repair, and a fresh check rarely fixes the rule.

Impact for this event: replace passive chat with a **teacher workflow** that diagnoses when possible, teaches live on a narrated board, checks immediate application, supports teach-back and viva, leaves an on-screen summary, and stores the learning record. Framing NED/STEM students as primary users is a design assumption — no invented local interview claims.

## 3. Target User

Primary user: a STEM undergraduate (including NED) who wants a topic explained live on a board, practice for a test, teach-back, and confidence for oral/viva questions.

Secondary: any student who pastes a short topic brief and needs board-based teaching plus quiz.

The **first shipped pack** is `binomial_square` so diagnosis, visuals, and grading stay testable. The product is a **general tutor architecture**: packs and topic briefs plug into the same loop. Next named pack: `round_robin_scheduler` (response time vs turnaround time).

## 4. Product Differentiation

- **Live AI whiteboard teaching (Core):** Excalidraw draws step-by-step while voice + captions narrate in EN/UR — this is the main lesson, not a side chat.
- **Vapi voice agent (Stretch):** one chosen provider — **Vapi** — on the same public URL for conversational teaching narration and viva. LiveKit is Roadmap (multi-party rooms), not Stretch.
- **Teacher workflow:** board + voice + quiz + summary; Stretch adds Teach-the-AI and viva; chat only for mid-lesson questions.
- **Misconception diagnosis (pack):** ≤2 probes; honest outcomes; never force a named gap.
- **Student agency:** text questions on a selected region in Core; barge-in via Vapi / STT in Stretch.
- **Interactive quiz / transfer:** no-hint items; evidence of immediate independent application, not lasting mastery.
- **Teach-the-AI (Stretch):** AI plays a learner with a deliberate misconception; student must correct it on the board.
- **Live viva (Stretch):** timed oral exam with a **Vapi** voice agent (mic + optional camera); Gemini/agent rubric scores answers. Web Speech is the Core/offline fallback.
- **Lesson summary (Core lite):** on-screen bullets from validated narration steps — not an invented recap. PDF export is Roadmap.
- **Bounded AI:** Gemini plans teaching and dialogue; app code grades pack algebra and board-task hits.
- **Deployed-judge reality:** Excalidraw MCP (if used) is for authoring only. Judges use the public Vercel URL. Core path works with captions + Web Speech if Vapi is down; Stretch demo shows Vapi when shipped.



## 5. Core User Journey

1. Sign up, enroll TOTP 2FA, sign in to an isolated workspace.
2. Start a lesson: **Binomial Squares** pack **or** paste a short topic brief (≤2,000 characters). The Judge Test Path uses the pack.
3. **Pack path:** attempt `(x+3)²`. Detective runs ≤2 probes and returns `misconception_identified`, `insufficient_evidence`, `correct_answer`, `arithmetic_slip`, or `unrecognized_reasoning`. No forced misconception. `correct_answer` may skip repair and go to quiz. Weak evidence → neutral board walkthrough.
4. **Topic-brief path:** skip Detective catalog; Board Tutor teaches from the brief with validated ops and honest uncertainty when evidence is thin.
5. **Live whiteboard explanation:** Board Tutor opens Excalidraw (pack: area model). Student presses **Play explanation**. Gemini’s validated steps are applied **live** on the board one-by-one while TTS speaks and captions show (EN/UR; Urdu RTL, equations LTR). This is the core “AI teacher on whiteboard” experience.
6. Student selects a board element and asks a **text** question in EN/UR. Gemini returns a short answer plus optional validated board ops. Replay of saved narration needs no new Gemini call.
7. **Pack board task:** tap the two regions for the missing `2bx` term. App code grades against template element IDs — no Gemini. Saved as Attempt phase `board_task`.
8. **Interactive quiz:** 2–3 no-hint items (pack includes a fresh transfer expansion). App grades pack algebra with completion + correctness; Gemini explains only after submit.
9. **Lesson summary:** on-screen bullets from validated `NarrationStep` lines plus key quiz/diagnosis outcomes. No PDF in Core.
10. Session saves attempts, board, narration, questions, quiz, summary, and language.
11. Sign out, sign in with 2FA; history and summary intact. Second account cannot see this data.



### Stretch journeys (after Core) — on the same deployed URL

1. **Voice-agent teaching:** after Core board loop works, wire **Vapi** so Play explanation uses a live voice agent synced to board steps (not only `speechSynthesis`). Captions still always on.
2. **Teach-the-AI:** AI states a deliberate misconception on the board; student explains/corrects; session stores planted misconception, student explanation, and pass/fail rubric.
3. **Live viva (Vapi):** student joins a short viva session via **Vapi** (mic + optional camera). Agent asks timed oral questions; answers transcribed/scored with rubric; results saved.
4. **Barge-in:** student interrupts the teaching agent mid-step, asks aloud, teaching pauses and resumes after the answer.



## 6. Scope



### Core — must ship (pass/fail + scoring floor)

- Auth, TOTP 2FA, Supabase RLS, per-account isolation (M3).
- Lesson entry: pack picker + short topic-brief paste.
- Versioned `binomial_square` pack with misconception catalog.
- Honest Detective outcomes (pack mode).
- **Live AI topic/pack explanation on Excalidraw** with validated operations; React/SVG fallback if Excalidraw blocks the deadline.
- Narrated teaching: ordered `{operation, spoken line}` steps, **browser Web Speech TTS as Core voice**, always-on captions, play/pause/replay, EN/UR. (Stretch upgrades voice to **Vapi** on the same URL.)
- Mid-lesson **text** Q&A on a selected element.
- Constrained `2bx` board task (pack), app-graded.
- Interactive quiz (2–3 items) including transfer-style check; two-part algebra grading for pack items.
- On-screen lesson summary after lecture/quiz.
- 10 reviewed Urdu seed explanations (RTL + terminology).
- Persistence of all Core records (M2/M4).
- Public deploy on Vercel + Supabase; `README.md`, updated `SPEC.md`, `AI_DISCLOSURE.md`; commits spread across 19–22 Oct (M5).
- Two Devmarketplace code gigs published **during** the build, not only at the end (M6).



### Stretch — after Core is green (same deployed URL)

- **Vapi voice agent (chosen Stretch provider):** integrate **Vapi** on the public deploy for conversational teaching narration and viva. Rationale: one voice-agent API for speak + listen + barge-in; **LiveKit** deferred to Roadmap to keep focus.
- **Voice-agent teaching:** board steps stay Gemini/app-validated; Vapi speaks the spoken lines and handles interrupt/barge-in.
- **Live viva:** timed oral exam through Vapi (mic + optional camera); rubric scores saved.
- **Teach-the-AI:** deliberate misconception; student teaches back on the board; rubric stored.
- **Fallback rule:** if Vapi keys or browser permissions fail, Core Web Speech + captions + text Q&A still complete M1–M6. Never hard-gate the judge path on Vapi.

### Roadmap

- Full syllabus / PDF upload and multi-lesson plans.
- **LiveKit** multi-party classrooms / A/V rooms; multi-agent Vapi routing; richer proctoring UX.
- Short test-prep engine (3–5+ generated drills); adjustable simulations.
- Pack `round_robin_scheduler`; PDF export of lesson summary; teacher dashboard; learning map.

### Out of scope for the event

Unlimited open-domain tutoring with unverified diagrams, custom model training, real-time multiplayer classes, automated high-stakes exam certification, requiring MCP **or** requiring Vapi for the **Core** judge path (Stretch may use Vapi for the voice demo).

### Whiteboard fallback

If Excalidraw integration threatens Core, the same operation schema drives a React/SVG area model with clickable regions. Freehand drops; **live narrated teaching**, Q&A, board task, quiz, summary, and persistence remain.

## 7. AI Behavior and Guardrails

Gemini 2.5 Flash makes **live hosted calls** in the main journey (M1) — not AI used only to write code, and not hardcoded replies presented as model output.

- **Misconception Detective (pack):** honest outcomes, ≤2 probes, catalog IDs only when supported.
- **Board Tutor (Core):** ≤6 steps for **live whiteboard explanation**; each one approved op + spoken line (≤160 chars). Also answers mid-lesson text questions with optional ops.
- **Quiz Coach:** explains grades after app scoring.
- **Lesson summary:** app assembles bullets from saved narration + outcomes; optional one Gemini polish; no invented facts.
- **Teach-the-AI agent (Stretch):** plants one reviewed misconception; follows a teach-back rubric.
- **Viva / voice agent (Stretch):** Vapi agent asks oral questions; scores transcripts with a rubric and confidence; never silently invents a pass.

Zod validates all model JSON. Board ops: add text, add shape, update label, highlight, clear highlight. Spoken lines and STT transcripts are untrusted plain text — never HTML. Model cannot change grades, auth, or RLS.

Narration: one Board Tutor call per Play (no extra Gemini per spoken line). Pack grading: grammar `x`, integers, `+ - * ^`, parentheses; (a) completion — expanded form; (b) correctness — coefficients. Re-entering `(x+3)^2` or `(x+3)(x+3)` fails completion with a clear message. mathjs parses/evaluates; correctness is not mathjs symbolic equality alone. Board-task grading is template IDs only. Topic-brief teaching must surface uncertainty. Retry invalid JSON once; then recoverable error. UI shows real status — no fake “thinking.”

## 8. Judge Test Path

Judges use the **public deployed URL**. No Devmarketplace MCP required. Teach-the-AI, Vapi voice agent, and live viva are Stretch demos — not required to pass M1–M6.

1. Fresh account + TOTP 2FA.
2. Start **Binomial Squares** pack.
3. Submit `x²+9` for `(x+3)²`.
4. Complete Detective probes; inspect saved outcome.
5. **Play live whiteboard explanation** (EN or UR): board draws step-by-step with captions (and audio if a voice exists).
6. Ask one **text** question on a selected region; see reply on/near the board.
7. Tap both `2bx` regions; confirm `board_task` Attempt.
8. Finish interactive quiz (including transfer item) without hints.
9. Open on-screen lesson summary; bullets reflect narrated steps.
10. Sign out / sign in; history and summary remain.
11. Second account cannot access the session.

**If Stretch is shipped:** after Core, show **Vapi** voice-agent teaching and/or live viva, plus Teach-the-AI. Muted audio / Vapi down → captions + Web Speech fallback still completes Core.

## 9. Data Model

- **LessonPack:** concept key, version, examples, misconception IDs, quiz/transfer templates.
- **Misconception:** pack, ID, label, probes, board-template key.
- **LearningSession:** user, pack or topic-brief, language, status, detective outcome (nullable for topic-brief), optional misconception ID, confidence, times.
- **Attempt:** session, phase (`diagnose` | `board` | `board_task` | `question` | `quiz` | `teach_ai` | `viva` | `test_prep`), prompt, response, correctness, metadata, time.
- **BoardState:** session, scene JSON, selected element IDs, revision.
- **NarrationStep:** session, order, operation JSON, spoken line, language.
- **ModelRun:** session, role, model, validated output, latency, status, error.
- **QuizResult:** session, item seed, answer, completion/correctness, explanation.
- **LessonSummary:** session, bullet list, language, created time.
- **TeachAiRun (Stretch):** session, planted misconception ID, student explanation, rubric score, pass/fail.
- **VivaRun (Stretch):** session, questions JSON, transcripts, rubric scores, provider (`vapi` | `webspeech_fallback`), Vapi call ID, optional camera-used flag.
- **VoiceAgentSession (Stretch):** session, provider (`vapi`), external call ID, mode (`teach` | `viva`), status, times.
- **ActivityEvent:** user, session, event type, object ID, time.

Stretch may add `SpeechTurn` (transcript, barge-in flag). Roadmap adds LiveKit room metadata, `SyllabusDocument`, PDF export of `LessonSummary`.

Supabase Auth for identity; RLS + server-side checks on every user-owned row.

## 10. Technical Approach

- **App:** Next.js + TypeScript; Tailwind + shadcn/ui.
- **Live board runtime:** `@excalidraw/excalidraw` client-only (`ssr: false`). Optional Excalidraw MCP only while coding — **judges see the live npm board on Vercel**. SVG fallback (Section 6).
- **TTS (Core fallback):** `speechSynthesis` (`en-US`, `ur-PK`); Play requires user gesture; cancel on navigate/language change/barge-in.
- **Vapi voice agent (Stretch, on deployed URL):** **Vapi** for conversational teaching and viva. Board ops stay app-validated; agent speaks and listens. Secrets server-side; disclose in `AI_DISCLOSURE.md`. LiveKit is Roadmap only.
- **STT / barge-in (Stretch):** via Vapi transcripts primarily; Web Speech Recognition as fallback.
- **Lesson summary:** server builds from stored fields; optional Zod-validated Gemini polish.
- **Data:** Supabase Auth (TOTP), Postgres, Storage, RLS.
- **AI:** Gemini 2.5 Flash + Zod structured output.
- **Grading:** mathjs + app completion/coefficient checks; board-task by element IDs.
- **Deploy:** Vercel + Supabase. Deploy by end of Day 2 and keep live; keep Gemini credits active until winners are announced.
- **Tests:** algebra fixtures; schema tests; Judge Test Path + isolation E2E; Stretch: Vapi smoke + Teach-the-AI / viva; fallback path when Vapi unavailable.
- **Interface:** no placeholder/broken Core screens.

Urdu: `dir="rtl"` + Urdu-capable font; equations LTR. Optional cloud TTS for Urdu only if browser voices fail → `AI_DISCLOSURE.md`.

## 11. Security, Cost, and Reliability

- Secrets server-side only.
- Treat topic briefs, board labels, spoken lines, and STT transcripts as untrusted.
- TOTP, RLS, ownership checks, timeouts, input limits.
- ≤2 diagnostic probes and ≤8 Gemini calls per Core session; Stretch viva/teach-ai/voice-agent under separate per-session caps.
- Narration/agent interruptible; Vapi or speech failure must not block board, quiz, or summary (fall back to captions / Web Speech).
- Camera/mic permissions for Stretch Vapi teach/viva; Core works without them.
- Never draw/speak unvalidated steps; never present hardcoded output as a live model call.
- Keep Gemini and Vapi keys working until winners are announced.



## 12. Mandatory Requirements and Success Criteria


| ID     | How Core meets it                                                                                |
| ------ | ------------------------------------------------------------------------------------------------ |
| **M1** | Live Gemini drives diagnosis, **live board teaching**, Q&A, quiz explanation on the deployed app |
| **M2** | Supabase Postgres persists sessions, board, narration, questions, quiz, summary                  |
| **M3** | Sign-up/in, TOTP 2FA; two accounts isolated; demo shows 2FA                                      |
| **M4** | Section 8 journey on deployed URL; data survives sign-out/restart                                |
| **M5** | Public `README.md`, `SPEC.md`, `AI_DISCLOSURE.md`; commits across 19–22 Oct; live URL in README  |
| **M6** | Two in-event code gigs published mid-build with setup + credits                                  |


**Vapi**, Teach-the-AI, and live viva are Stretch additions after Core passes; they are not substitutes for M1–M6.

Core succeeds when a judge sees **live AI whiteboard teaching**, finishes quiz + summary, and recovers data after re-login — even if Vapi is unavailable (Web Speech + captions fallback). Stretch succeeds when the **same URL** runs a Vapi teach and/or viva session.

## 13. Four-Day Build Plan

- **Day 1:** Auth/TOTP, schema, RLS, lesson shell, grading fixtures. Kickoff checkpoint in Devmarketplace workspace.
- **Day 2:** Detective, Board Tutor JSON, **live Excalidraw/SVG teach loop**, persistence, **first Vercel deploy (keep live)**, Judge path green, gig #1.
- **Day 3:** Narration polish, text Q&A, `2bx` task, quiz, lesson summary, history, isolation, gig #2. If Core is green: start **Vapi** voice-agent teach + viva; Teach-the-AI if time.
- **Day 4:** Device/browser tests; Urdu + Vapi fallback; Stretch polish; docs; ≤3 min demo (Core + Vapi if live); Devpost by 11:00 PM PKT.

Commit throughout; stop at code freeze. No product code before 9:00 AM PKT on 19 October 2026.

## 14. Team Readiness

- **Muhammad Taha Farrukh — AI Orchestration and Backend:** APIs, Gemini roles, **Vapi** voice-agent wiring, Teach-the-AI / Viva orchestration.
- **Muhammad Uzzam Siddiqui — Excalidraw UX and Errors:** live board UI, selection, RTL/LTR, narration sync with Vapi, Teach-the-AI/viva UI.
- **Uzair Ahmed — Auth, Data, Integration and Deployment:** TOTP, RLS, persistence, E2E, Vercel/Supabase; mic/camera + Vapi secrets and webhooks.
- **Muhammad Saad — Curriculum, QA and Docs:** pack catalog, planted misconceptions, viva rubrics, Urdu review, gigs, demo narrative.

Daily integration. Reuse Next.js, Supabase, Excalidraw, mathjs, shadcn/ui, official SDKs; evaluate Devmarketplace gigs at kickoff.

## 15. Planned Code Gigs

1. **Misconception Detective Pack:** versioned catalog + Zod probe/outcome schemas.
2. **Validated Excalidraw Operation Renderer with Narration Playback:** board-op schema + speech-synced live step player.

Publish mid-event with setup instructions and teammate credits.

## 16. Prior Work and AI Disclosure

Ideas may be pre-existing; product code may not. All product code starts after 9:00 AM PKT on 19 October 2026. Bring `PRIOR_WORK.md` if anything pre-existing is reused. Disclose in `AI_DISCLOSURE.md`: Gemini, Web Speech TTS/STT, **Vapi**, any cloud TTS, LiveKit if later used, coding assistants, Excalidraw and other OSS with licences. Do not misrepresent hardcoded output as live model calls.

## 17. Final Demo

≤3 minutes on the **deployed** app: 2FA → wrong answer → diagnosis → **live AI Excalidraw teaching** → text question → `2bx` task → quiz → lesson summary → re-login.

If Stretch is live (target): same URL → **Vapi** teach and/or viva (+ Teach-the-AI if ready). Never fake features; never require MCP for the judge; never leave Core broken if Vapi is down.

## 18. Summary

Visual AI Tutor teaches **live on a whiteboard**: Gemini drives Excalidraw steps while voice narrates, then quiz and summary lock the learning record. Core meets M1–M6 with Web Speech + captions if needed. Stretch adds **Vapi** on the same deployed URL for teaching and viva, plus Teach-the-AI. LiveKit multi-party rooms and full syllabus stay on the roadmap.