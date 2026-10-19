# Visual AI Tutor

Live whiteboard tutor for STEM students: Gemini returns validated board steps, the lesson draws them with captions and optional Web Speech narration, then continues through board Q&A, the 2bx task, quiz, and summary.

## Status

Core Phase 3 is complete: the lesson has client-only Excalidraw, an SVG area-model fallback, shared board operation replay, Play/Pause/Replay controls, always-on captions, and speech cancellation on pause/navigation. The next lane is Judge path E2E (diagnose → board → 2bx → quiz → summary) plus deploy.

## Run

```bash
npm install
npm run dev
```

Open http://localhost:3000. Use `npm run build` to verify a production build.

## Configuration

Add the names from `.env.example` in the workspace Secrets panel. Supabase and Gemini configuration errors are surfaced in the UI/API rather than silently producing a blank lesson. Do not commit secrets or a `.env` file.

For the Supabase demo, enable email/password auth. If email confirmation is enabled, confirm the inbox message before signing in. TOTP enrollment/challenge is required before `/app` and `/lesson/*`.

## Demo click path

1. Open **Start lesson** on `/` and create an account, or use **Sign in**.
2. Complete the authenticator setup/code at `/verify-2fa`.
3. On `/app`, choose **Binomial Squares → Start**.
4. On the lesson page, submit a diagnostic answer, then press **Play explanation**. Captions remain visible while Excalidraw draws; use **Use SVG fallback** if needed.
5. Ask a board question, select the two `3x` regions, complete the quiz, and show the summary.

## Key board paths

- `components/board/BoardCanvas.tsx` — dynamic `ssr: false` wrapper and automatic fallback.
- `components/board/ExcalidrawBoard.tsx` — runtime client-only Excalidraw loader.
- `components/board/SvgBoard.tsx` — fallback renderer.
- `lib/board/ops.ts` — shared `BoardScene` and `applyOperation` implementation.
- `app/lesson/[id]/LessonClient.tsx` — narration playback and cancellation.
- `lib/voice/speech.ts` — Web Speech API adapter.

## Project docs

See [`SPEC.md`](./SPEC.md), [`AGENTS.md`](./AGENTS.md), [`TECH.md`](./TECH.md), and [`CONTEXT.md`](./CONTEXT.md).
