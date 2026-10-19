"use client";

import type { ReactNode } from "react";
import type { BoardOperation, NarrationStep, AppLanguage } from "@/types";
import { buildSceneFromSteps } from "@/lib/board/ops";
import { SvgBoard } from "./SvgBoard";
import { ExcalidrawBoard } from "./ExcalidrawBoard";

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
 * BoardCanvas — client-only Excalidraw canvas with SVG fallback.
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
  fallback = "svg",
  children,
}: BoardCanvasProps) {
  const scene = buildSceneFromSteps(steps, currentStepIndex);

  // Always show the area-model base scene, even when no steps have played.
  const hasSteps = steps.length > 0;
  const currentStep = steps[currentStepIndex];

  const commonProps = {
    scene,
    language,
    onElementClick,
    taskMode,
    selectedElementIds,
    currentStepIndex,
    caption: currentStep?.spokenLine,
  };

  return (
    <div className="space-y-3">
      {children}

      {fallback === "excalidraw" ? (
        <ExcalidrawBoard {...commonProps} />
      ) : (
        <SvgBoard {...commonProps} />
      )}

      {!hasSteps && !taskMode && (
        <p className="text-center text-sm text-stone-500">
          Board ready — press Play explanation to see the live steps.
        </p>
      )}

      {currentStep && !currentStep.spokenLine ? (
        <div className="rounded-md bg-stone-100 px-3 py-2 text-xs text-stone-600">
          Op: <code>{currentStep.operation.type}</code> · Region:{" "}
          <code>{formatElementId(currentStep.operation)}</code>
        </div>
      ) : null}
    </div>
  );
}

function formatElementId(op: BoardOperation): string {
  const p = op.payload as Record<string, unknown>;
  return String(p.elementId ?? p.id ?? "—");
}
