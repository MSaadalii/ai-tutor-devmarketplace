"use client";

import { useEffect, useMemo, useState } from "react";
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
  fallback?: "svg" | "excalidraw";
  children?: ReactNode;
};

/**
 * BoardCanvas — client-only Excalidraw canvas with automatic SVG fallback.
 * Replays validated board ops one step at a time for the live teaching loop.
 * In task mode the four area-model regions are tappable for the 2bx task.
 */
export function BoardCanvas({
  steps = [],
  currentStepIndex = -1,
  selectedElementIds = [],
  onElementClick,
  taskElementIds = [],
  taskMode = false,
  language = "en",
  fallback = "excalidraw",
  children,
}: BoardCanvasProps) {
  const [excalidrawFailed, setExcalidrawFailed] = useState(false);
  const [failureMessage, setFailureMessage] = useState<string | null>(null);

  // Choosing Excalidraw again (manual toggle) retries the renderer.
  useEffect(() => {
    if (fallback === "excalidraw") {
      setExcalidrawFailed(false);
      setFailureMessage(null);
    }
  }, [fallback]);

  const scene = useMemo(
    () => buildSceneFromSteps(steps, currentStepIndex),
    [steps, currentStepIndex],
  );

  const hasSteps = steps.length > 0;
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

      {excalidrawFailed && fallback === "excalidraw" ? (
        <p
          role="status"
          className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900"
        >
          Excalidraw could not load, so the board switched to the SVG view.
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

      {!hasSteps && !taskMode && (
        <p className="text-center text-sm text-stone-500">
          Board ready — press Play explanation to see the live steps.
        </p>
      )}
    </div>
  );
}
