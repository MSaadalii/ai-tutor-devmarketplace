# AI Disclosure — Visual AI Tutor

This document lists the AI services, models, and tools used in the product.

## Runtime AI / ML services

| Service | Model / capability | Purpose |
|---------|-------------------|---------|
| Google Gemini API | `gemini-3.5-flash-lite` (default `DEFAULT_GEMINI_MODEL`, override via `GEMINI_MODEL`) | Misconception diagnosis (`detective`), board tutoring (`board_tutor`), quiz explanation (`quiz_coach`), lesson summary (`summary`) |
| Google Gemini API | Same model, `viva` role | Live viva: generates questions from the topic brief / saved narration and scores spoken answers with a Zod-validated rubric (never a hardcoded pass) |
| Google Gemini API | Same model, `teach_ai` role | Teach the AI (teach-back): plays a confused learner with one planted misconception (brief), then scores the student's correction; output is Zod-validated and never shown as a hardcoded result |
| Vapi | Voice assistant (websocket transport, optional via `VAPI_API_KEY` + `VAPI_ASSISTANT_ID`, server-only) | Narrates Play `spokenLine`s and speaks raise-hand answers; falls back to Web Speech on any failure |
| Web Speech API | Browser-native `speechSynthesis` | Core narration / answer TTS in English and Urdu; fallback when Vapi is not configured |
| Web Speech API | Browser-native `SpeechRecognition` (may be processed by the browser vendor's cloud service) | Raise-hand voice questions and viva/teach-back mic input; the transcript is sent to the board tutor |
| Uplift AI | Cloud TTS (optional, when `UPLIFT_AI_API_KEY` configured) | Urdu TTS fallback when browser voices are unavailable |

## Coding tools

- **DevMarketplace coding agents** built and iterated on this repository during the event (vertical-slice phases: skeleton, SVG board polish, answer-append fix, Teach-the-AI, voice polish, docs/ship pass).
- Two DevMarketplace gigs were used as reusable source patterns (linked in `README.md`):
  - Supabase TOTP MFA gate — `gigs/01-supabase-totp-gate/`
  - Zod-validated board ops + narration — `gigs/02-zod-board-ops-narration/`
- Cursor / other assistants may have helped draft planning docs (`SPEC.md`, `TECH.md`) before the build window.

## Open-source libraries

- Next.js, React, TypeScript
- Tailwind CSS, shadcn/ui primitives
- Supabase (`@supabase/supabase-js`, `@supabase/ssr`)
- Zod
- mathjs
- `@google/generative-ai`
- `@excalidraw/excalidraw` (live whiteboard rendering, SVG fallback)

## Notes

- All Gemini JSON outputs are validated with Zod before being drawn or shown.
- Pack algebra and the 2bx board task are graded deterministically in app code; the LLM does not assign grades.
- No custom model training or fine-tuning is performed.
- Hardcoded text is never presented as a live model call.
