# Gig: Zod-validated board ops + narrated teach steps

**Devmarketplace title:** `Zod board ops + narration steps (whiteboard tutor)`

Drop-in TypeScript utilities for AI whiteboard tutors: coerce messy LLM JSON into `{ order, operation, spokenLine, language }`, then apply exclusive highlights / shapes / labels to a scene. Never draw unvalidated ops.

Extracted during the NED × Devmarketplace hackathon from Visual AI Tutor (SVG / Excalidraw teach loop).

## What you get

| File | Role |
|------|------|
| `types.ts` | `BoardOperation`, `NarrationStep` |
| `schemas.ts` | Zod coerce + validate; `parseNarrationSteps` |
| `applyOperation.ts` | Pure scene reducer + `buildSceneFromSteps` |

## Setup

```bash
npm i zod
```

```ts
import { parseNarrationSteps } from "./schemas";
import { buildSceneFromSteps, emptyScene } from "./applyOperation";

const steps = parseNarrationSteps(await llmJson); // throws if invalid
const scene = buildSceneFromSteps(steps, currentIndex, emptyScene());
// render scene.elements + scene.highlights with SVG or Excalidraw
```

### Op types

`add_text` · `add_shape` · `update_label` · `highlight` · `clear_highlight`

`spokenLine` max **160** chars, plain text. Prefer ≤6 steps per teach turn.

### Design rules baked in

- Coerce bare string ops / missing `payload` before strict parse.
- `highlight` clears prior highlights (exclusive focus).
- Call Zod **before** any renderer.

## Credits

Built in-event for **Visual AI Tutor** (NED × Devmarketplace, Oct 2026).

| Role | Name |
|------|------|
| Board UX / op applicator | Muhammad Uzzam Siddiqui |
| AI schemas / Gemini Zod | Muhammad Taha Farrukh |
| Auth / deploy | Uzair Ahmed |
| Curriculum / docs / gigs | Muhammad Saad |

Source repo: https://github.com/MTahaFarrukh/ai-tutor-devmarketplace  
Canonical paths: `lib/board/ops.ts`, `lib/ai/schemas.ts`, `types/index.ts`

## Licence

MIT — reuse freely; keep credit when publishing on Devmarketplace.
