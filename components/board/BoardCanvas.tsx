"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { ReactNode } from "react";
import type { NarrationStep, AppLanguage } from "@/types";
import { buildSceneFromSteps } from "@/lib/board/ops";
import { SvgBoard } from "./SvgBoard";
import { BoardErrorBoundary } from "./BoardErrorBoundary";
import type { ExcalidrawBoardProps } from "./ExcalidrawBoard";

const ExcalidrawBoard = dynamic<ExcalidrawBoardProps>(
  () => import("./ExcalidrawBoard").then((mod) => mod.ExcalidrawBoard),
  { ssr: false },
);

export type BoardCanvasProps = {
  steps?: NarrationStep[];
  currentStepIndex?: number;
  selectedElementIds?: string[];
  onElementClick?: (elementId: string) => void;
  taskElementIds?: string[];
  taskMode?: boolean;
  language?: AppLanguage;
  /**
   * "excalidraw": attempt Excalidraw, auto-fall-back to SVG on load/paint
   *   failure. A small notice is shown and the toggle lets the user retry.
   * "svg": use SVG directly (reliable path; also used as the automatic fallback).
   *
   * SVG is the reliable default for the teach flow so the Judge path is never
   * blocked by an Excalidraw bundling failure.
   */
  fallback?: "svg" | "excalidraw";
  children?: ReactNode;
};

/**
 * BoardCanvas — optional Excalidraw canvas with automatic SVG fallback.
 *
 * Teach-mode strategy:
 *   • LessonClient starts with fallback="svg" so the board always works.
 *   • The "Use Excalidraw" toggle switches to fallback="excalidraw", which
 *     attempts to load Excalidraw and silently falls back to SVG on failure.
 *   • The "Use SVG fallback" toggle switches back to fallback="svg".
 *
 * This keeps the Judge path unblocked while still offering the richer
 * Excalidraw experience when the module loads correctly.
 */
export function BoardCanvas({
  steps = [],
  currentStepIndex = -1,
  selectedElementIds = [],
  onElementClick,
  taskElementIds = [],
  taskMode = false,
  language = "en",
  fallback = "svg",
  children,
}: BoardCanvasProps) {
  const [excalidrawFailed, setExcalidrawFailed] = useState(false);
  const [excalidrawPainted, setExcalidrawPainted] = useState(false);
  const [failureMessage, setFailureMessage] = useState<string | null>(null);

  // Choosing Excalidraw again (manual toggle) resets the failure state so the
  // dynamic import is retried.
  useEffect(() => {
    if (fallback === "excalidraw") {
      setExcalidrawFailed(false);
      setExcalidrawPainted(false);
      setFailureMessage(null);
    }
  }, [fallback]);

  // Avoid treating Excalidraw's initialization delay as a failure. A canvas
  // with measurable dimensions is a soft paint confirmation; only fall back
  // after a generous wait if it never appears.
  useEffect(() => {
    if (fallback !== "excalidraw" || excalidrawFailed || excalidrawPainted) return;
    const timeout = window.setTimeout(() => {
      setFailureMessage("Excalidraw canvas did not become visible in time");
      setExcalidrawFailed(true);
    }, 8000);
    return () => window.clearTimeout(timeout);
  }, [fallback, excalidrawFailed, excalidrawPainted]);

  const markExcalidrawPainted = useCallback(() => {
    setExcalidrawPainted(true);
  }, []);

  const scene = useMemo(
    () => buildSceneFromSteps(steps, currentStepIndex),
    [steps, currentStepIndex],
  );

  const hasSteps = steps.length > 0;
  // Use SVG when: the prop says so, OR Excalidraw failed to load.
  const useSvg = fallback === "svg" || excalidrawFailed;

  function handleRendererFailure(message: string) {
    setFailureMessage(message);
    setExcalidrawFailed(true);
  }

  const commonProps = {
    scene,
    language,
    onElementClick,
    taskMode,
    selectedElementIds,
    currentStepIndex,
  };

  return (
    <div className="space-y-3">
      {children}

      {/* Show a notice only when Excalidraw was explicitly chosen but failed. */}
      {excalidrawFailed && fallback === "excalidraw" ? (
        <p
          role="status"
          className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900"
        >
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
            onPainted={markExcalidrawPainted}
          />
        </BoardErrorBoundary>
      )}

      {!hasSteps && !taskMode && (
        <p className="text-center text-sm text-stone-500">
          Board ready — press Play explanation to see the live steps.
        </p>
      )}
    </div>
  );
}
