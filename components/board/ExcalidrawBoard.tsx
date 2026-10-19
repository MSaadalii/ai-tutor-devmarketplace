"use client";

import { useEffect, useState } from "react";
import type { BoardScene } from "@/lib/board/ops";
import { toExcalidrawScene } from "@/lib/board/ops";
import type { AppLanguage } from "@/types";

export type ExcalidrawBoardProps = {
  scene: BoardScene;
  language?: AppLanguage;
  onElementClick?: (elementId: string) => void;
  taskMode?: boolean;
  selectedElementIds?: string[];
  currentStepIndex?: number;
  caption?: string;
};

export function ExcalidrawBoard(props: ExcalidrawBoardProps) {
  const [ExcalidrawComponent, setExcalidrawComponent] = useState<
    React.ComponentType<any> | null
  >(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    import("@excalidraw/excalidraw")
      .then((mod) => {
        if (!mounted) return;
        // The package exports Excalidraw as default or named export depending on version.
        const Comp =
          (mod as unknown as Record<string, React.ComponentType<any>>).Excalidraw ??
          (mod as unknown as { default: React.ComponentType<any> }).default;
        if (!Comp) throw new Error("Excalidraw export not found");
        setExcalidrawComponent(() => Comp);
      })
      .catch((e) => {
        if (!mounted) return;
        setLoadError(e instanceof Error ? e.message : "Excalidraw failed to load");
      });
    return () => {
      mounted = false;
    };
  }, []);

  if (loadError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Excalidraw could not load: {loadError}
      </div>
    );
  }

  if (!ExcalidrawComponent) {
    return (
      <div className="flex min-h-[360px] items-center justify-center rounded-lg border border-stone-200 bg-white text-sm text-stone-500">
        Loading Excalidraw…
      </div>
    );
  }

  return <ExcalidrawCanvas Component={ExcalidrawComponent} {...props} />;
}

function ExcalidrawCanvas({
  Component,
  scene,
  language = "en",
  onElementClick,
  taskMode = false,
  selectedElementIds = [],
  currentStepIndex = -1,
  caption,
}: ExcalidrawBoardProps & {
  Component: React.ComponentType<any>;
}) {
  const excalidrawScene = toExcalidrawScene(scene, language);

  const handleChange = (elements: unknown[]) => {
    if (!taskMode || !onElementClick) return;
    // Excalidraw selection change; map selected IDs back to app.
    const selected = (elements as Array<{ id?: string; selected?: boolean }>)
      .filter((el) => el.selected)
      .map((el) => el.id)
      .filter(Boolean) as string[];
    selected.forEach((id) => onElementClick(id));
  };

  return (
    <div className="relative w-full">
      <div className="h-[420px] w-full overflow-hidden rounded-lg border border-stone-200 bg-white">
        <Component
          initialData={excalidrawScene}
          onChange={handleChange}
          viewModeEnabled={taskMode}
          zenModeEnabled={false}
          gridModeEnabled={false}
          UIOptions={{
            canvasActions: {
              saveToActiveFile: false,
              loadScene: false,
              export: false,
              toggleTheme: false,
              saveAsImage: false,
            },
          }}
          langCode={language === "ur" ? "ar-SA" : "en-US"}
        />
      </div>
      {caption ? (
        <div
          className="mt-2 rounded-md bg-stone-50 px-3 py-2 text-sm text-stone-800"
          dir={language === "ur" ? "rtl" : "ltr"}
        >
          {caption}
        </div>
      ) : null}
      {currentStepIndex >= 0 && (
        <div className="absolute right-2 top-2 rounded-md bg-white/90 px-2 py-1 text-xs text-stone-600 shadow">
          Step {currentStepIndex + 1}
        </div>
      )}
    </div>
  );
}
