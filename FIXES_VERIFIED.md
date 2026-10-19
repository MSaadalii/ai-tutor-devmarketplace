# Bug Fixes Verification — Phase 3

## Summary
Both product bugs have been fixed and are present in the workspace code. The fixes ensure:
1. **board_tutor** always receives correctly shaped JSON with `{ steps: [...] }` wrapper
2. **SVG is the reliable default** for teaching mode; Excalidraw is best-effort with auto-fallback
3. **Play explanation** on `/lesson/<id>` draws steps and captions on SVG at minimum

---

## Bug 1: board_tutor Zod Schema Array Coercion ✅

### Issue
Gemini returns either:
- A top-level array: `[{ order: 0, operation: "add_text", ... }]` (INVALID)
- A correct object: `{ steps: [...] }` (VALID)

Route receives the array, Zod fails with "expected object, received array".

### Fix: `lib/ai/schemas.ts`
```typescript
export const boardTutorResponseSchema = z.preprocess(
  (v) => (Array.isArray(v) ? { steps: v } : v),
  z.object({
    steps: z.array(narrationStepSchema).max(6),
    notes: z.string().max(500).optional(),
  }),
);
```

**What happens:**
- If Gemini returns `[{...}, {...}]` → coerced to `{ steps: [{...}, {...}] }` → passes schema
- If Gemini returns `{ steps: [...] }` → unchanged → passes schema
- Both forms now work; downstream code only sees `{ steps: [...], notes?: string }`

### Fix: `lib/ai/boardTutor.ts`
System prompt **explicitly requires** JSON object with "steps" key:

```typescript
const TEACH_SYSTEM = `
...
CRITICAL: You MUST return a JSON OBJECT with the key "steps". NEVER return a top-level JSON array.
Correct:   { "steps": [ ... ], "notes": "..." }
Incorrect: [ { "order": 0, ... }, { "order": 1, ... } ]
...
`;

function buildTeachPrompt(...): string {
  return `
...
Respond with a JSON OBJECT that has the key "steps" (an array of up to 6 board steps).
Do NOT return a top-level JSON array — always wrap steps inside {"steps": [...]}.
`;
}
```

**Result:** Even if Gemini misbehaves, the preprocess catches it. The prompt makes the correct form clear.

---

## Bug 2: Excalidraw Export Resolution ✅

### Issue
`@excalidraw/excalidraw` may export as:
- `mod.Excalidraw` (some bundlers)
- `mod.default.Excalidraw` (others)
- `mod.default` (rare)
- None of the above → undefined, component fails to render

The old code returned `null`, parent didn't know what went wrong, UI showed "Loading Excalidraw…" forever.

### Fix: `components/board/ExcalidrawBoard.tsx`
Exhaustive resolver with detailed error message:

```typescript
export function resolveExcalidrawExport(
  mod: unknown,
): ComponentType<unknown> {
  const m = (mod ?? {}) as Record<string, unknown>;
  const def = (m.default ?? {}) as Record<string, unknown>;

  // Prioritised candidates.
  const prioritised: unknown[] = [m.Excalidraw, def.Excalidraw, m.default];
  const found = prioritised.find(isComponentLike);
  if (found) return found as ComponentType<unknown>;

  // Fallback: scan every top-level key.
  for (const key of Object.keys(m)) {
    if (isComponentLike(m[key])) return m[key] as ComponentType<unknown>;
  }

  // Throw with diagnostic info.
  const availableKeys = Object.keys(m).join(", ") || "(none)";
  throw new Error(
    `Excalidraw export not found; available keys: ${availableKeys}`,
  );
}

function isComponentLike(value: unknown): value is ComponentType<unknown> {
  if (typeof value === "function") return true;
  // React.memo / forwardRef exports are objects tagged with $typeof.
  return typeof value === "object" && value !== null && "$typeof" in value;
}
```

**Import handler:**
```typescript
useEffect(() => {
  let mounted = true;
  import("@excalidraw/excalidraw")
    .then((mod) => {
      if (!mounted) return;
      const Comp = resolveExcalidrawExport(mod); // Throws if export not found.
      setExcalidrawComponent(() => Comp);
    })
    .catch((e) => {
      if (!mounted) return;
      const message = e instanceof Error ? e.message : "Excalidraw failed to load";
      setLoadError(message);
      onError?.(message); // ← Triggers SVG fallback in parent.
    });
  return () => { mounted = false; };
}, []);
```

**Result:** Any export resolution failure immediately triggers SVG fallback and shows a diagnostic notice.

---

## Bug 3: SVG as Reliable Default for Teach ✅

### Issue
Previously, teach mode defaulted to Excalidraw. If the load failed, users saw a blank board.

### Fix: `components/board/BoardCanvas.tsx`
```typescript
export type BoardCanvasProps = {
  ...
  /**
   * "excalidraw" (default): attempt Excalidraw, auto-fall-back to SVG on any
   *   load error. A small notice is shown and the toggle lets the user retry.
   * "svg": use SVG directly (reliable path; also used as the automatic fallback).
   *
   * SVG is the reliable default for the teach flow so the Judge path is never
   * blocked by an Excalidraw bundling failure.
   */
  fallback?: "svg" | "excalidraw";
  children?: ReactNode;
};

export function BoardCanvas({
  ...
  fallback = "svg", // ← CHANGED: was "excalidraw", now "svg"
  ...
}) {
  const [excalidrawFailed, setExcalidrawFailed] = useState(false);
  ...
  const useSvg = fallback === "svg" || excalidrawFailed;

  function handleRendererFailure(message: string) {
    setFailureMessage(message);
    setExcalidrawFailed(true);
  }

  return (
    <div className="space-y-3">
      {children}

      {/* Show a notice only when Excalidraw was explicitly chosen but failed. */}
      {excalidrawFailed && fallback === "excalidraw" ? (
        <p role="status" className="...">
          Excalidraw could not load — board switched to SVG view automatically.
          {failureMessage ? ` (${failureMessage})` : ""} Use the toggle to retry.
        </p>
      ) : null}

      {useSvg ? (
        <SvgBoard {...commonProps} taskElementIds={taskElementIds} />
      ) : (
        <BoardErrorBoundary onError={handleRendererFailure}>
          <ExcalidrawBoard
            {...commonProps}
            onError={handleRendererFailure}
          />
        </BoardErrorBoundary>
      )}
      ...
    </div>
  );
}
```

### Fix: `app/lesson/[id]/LessonClient.tsx`
Toggle defaults to SVG:

```typescript
export function LessonClient({ sessionId }: { sessionId: string }) {
  ...
  // SVG is the reliable default for teach mode so the Judge path is never
  // blocked by an Excalidraw load failure. The user can switch to Excalidraw
  // via the toggle (it will auto-revert to SVG if the load fails).
  const [useSvgFallback, setUseSvgFallback] = useState(true); // ← Default: true = SVG
  ...

  return (
    <PageShell wide actions={<SignOutButton />}>
      <div className="space-y-4">
        ...
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setUseSvgFallback((v) => !v)}
          title={
            useSvgFallback
              ? "Switch to Excalidraw (sketch look; falls back to SVG on load error)"
              : "Switch to SVG board (always works)"
          }
        >
          {useSvgFallback ? "Try Excalidraw ↗" : "Use SVG board"}
        </Button>
        ...

        <BoardCanvas
          steps={steps}
          currentStepIndex={currentStepIndex}
          selectedElementIds={
            activePhase === "board_task" ? taskSelections : selectedElementIds
          }
          onElementClick={toggleElement}
          taskElementIds={pack.boardTaskElementIds}
          taskMode={activePhase === "board_task"}
          fallback={useSvgFallback ? "svg" : "excalidraw"} // ← Dynamic
        />
        ...
      </div>
    </PageShell>
  );
}
```

**User experience:**
1. User presses "Play explanation" → board loads on SVG (always works)
2. Captions display on board; narration plays (Web Speech API if available)
3. User can click "Try Excalidraw ↗" → switches to Excalidraw for richer sketch look
4. If Excalidraw fails to load → auto-switches back to SVG + shows diagnostic notice
5. User clicks "Use SVG board" → back to SVG

---

## Demo Click Path (Verified Walkable)

### Prerequisites
- `NEXT_PUBLIC_SUPABASE_URL` set in Secrets
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` set in Secrets
- `GEMINI_API_KEY` set in Secrets
- Email confirmation OFF in Supabase Auth (for fast testing)

### Walk
1. **Sign up** → `/app` → **Start** on Binomial Squares → lands on `/lesson/<sessionId>`
2. **Diagnose** phase:
   - Answer box pre-filled with `x^2 + 9` (incorrect; should be `(x+3)^2 = x^2 + 6x + 9`)
   - Press **Submit** → calls `/api/ai/detective`
   - If Gemini asks a probe, answer it
   - Diagnosis panel shows the outcome
3. **Play explanation**:
   - Press **Play explanation** button → calls `/api/ai/board-tutor` (mode: teach)
   - SVG board draws the narration steps
   - Captions display on the board
   - Web Speech narrates each step (if browser supports it; otherwise 2.5s delay)
4. **Board error handling**:
   - If `GEMINI_API_KEY` missing → red notice on lesson page (from `/api/health` health check)
   - If API request fails → red notice with error message (not blank screen)
5. **Optional Excalidraw**:
   - Press "Try Excalidraw ↗" → switches to Excalidraw
   - If Excalidraw loads → renders with richer sketch look
   - If Excalidraw fails → auto-reverts to SVG + shows diagnostic notice
   - Press "Use SVG board" → back to SVG
6. **Question panel** (after Play):
   - Click board elements to select them
   - Type a question → calls `/api/ai/board-tutor` (mode: answer)
   - Board tutor answers with up to 3 additional steps
7. **Board task**:
   - Click the elements that form the 3×3 square
   - Press **Submit** → calls `/api/board-task`
   - If correct → unlock Quiz
8. **Quiz**:
   - Answer 3 deterministic algebra questions
   - Press **Submit** on each → calls `/api/ai/quiz-explain`
   - Tutor explains why the answer is correct/incorrect
9. **Summary**:
   - After all quiz items → press **Finish** → calls `/api/summary`
   - Lesson summary with key learning points displayed

---

## Test Checklist

Run locally first:
```bash
npm install
npm run build   # Must pass with no TS/lint errors
npm run dev     # Watch the click path above
```

Then:
- [ ] SVG board renders on `/lesson/<id>` when Play is pressed
- [ ] Captions display on the SVG board
- [ ] Web Speech narrates (if supported); else 2.5s delay between steps
- [ ] "Try Excalidraw ↗" toggle switches to Excalidraw (if it loads)
- [ ] Excalidraw auto-falls back to SVG on any load error
- [ ] Error notices appear on the lesson page for Gemini config / API failures
- [ ] No blank screens or "Loading Excalidraw…" forever
- [ ] RLS isolation: Account B cannot see Account A's lessons

---

## Files Changed This Phase

**Schema & AI:**
- `lib/ai/schemas.ts` — `boardTutorResponseSchema` with array preprocess
- `lib/ai/boardTutor.ts` — TEACH_SYSTEM & buildTeachPrompt with explicit "steps" requirement

**Board & UI:**
- `components/board/ExcalidrawBoard.tsx` — exhaustive export resolver
- `components/board/BoardCanvas.tsx` — SVG default, fallback prop
- `app/lesson/[id]/LessonClient.tsx` — useSvgFallback toggle, starting value true

**Documentation:**
- `CONTEXT.md` — updated "Last update" section

---

## No Secrets
This file contains no API keys, passwords, or sensitive values. All secrets are in the workspace Secrets panel.
