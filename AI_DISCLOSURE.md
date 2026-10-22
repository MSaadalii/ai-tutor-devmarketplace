# AI Disclosure — Visual AI Tutor

This document lists the AI services, models, and tools used in the product.

## Runtime AI / ML services

| Service | Model / capability | Purpose |
|---------|-------------------|---------|
| Google Gemini API | `gemini-2.5-flash-preview-05-20` (default, override via `GEMINI_MODEL`) | Misconception diagnosis, board tutoring, quiz explanation |
| Web Speech API | Browser-native `speechSynthesis` | Core narration TTS in English and Urdu |
| Web Speech API | Browser-native `SpeechRecognition` (may be processed by the browser vendor's cloud service) | Raise hand voice questions; transcript is sent to the board tutor |
| Google Gemini API | Same model, `teach_ai` role | Teach the AI: plays a confused learner (briefs), scores the student's correction; output is Zod-validated and never shown as a hardcoded result |
| Vapi | Voice assistant (websocket transport, optional via `VAPI_API_KEY` + `VAPI_ASSISTANT_ID`, server-only) | Narrates Play `spokenLine`s; falls back to Web Speech on any failure |
| Uplift AI | Cloud TTS (optional, when `UPLIFT_AI_API_KEY` configured) | Urdu TTS fallback when browser voices are unavailable |

## Coding tools

- DevMarketplace coding agents used to implement this repo during the event.
- Cursor / other assistants may have helped draft planning docs before the build window.

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
