"use client";

import "@excalidraw/excalidraw/index.css";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ComponentType } from "react";
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
  onError?: (error: string) => void;
};

/**
 * Client-only Excalidraw renderer.
 *
 * The package is imported at runtime so a broken install or network failure
 * surfaces as `onError` and lets the parent fall back to the SVG board.
 */
export function ExcalidrawBoard({
  onError,
  ...props
}: ExcalidrawBoardProps) {
  const [ExcalidrawComponent, setExcalidrawComponent] =
    useState<ComponentType<unknown> | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    import("@excalidraw/excalidraw")
      .then((mod) => {
        if (!mounted) return;
        // resolveExcalidrawExport now throws with a detailed message if it
        // cannot find a component-like export.
        const Comp = resolveExcalidrawExport(mod);
        setExcalidrawComponent(() => Comp);
      })
      .catch((e) => {
        if (!mounted) return;
        const message =
          e instanceof Error ? e.message : "Excalidraw failed to load";
        setLoadError(message);
        onError?.(message);
      });
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loadError) {
    return (
      <div className="flex min-h-[360px] items-center justify-center rounded-lg border border-red-200 bg-red-50 text-sm text-red-700">
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


type ExcalidrawApi = {
  updateScene: (scene: Record<string, unknown>) => void;
};

function isComponentLike(value: unknown): value is ComponentType<unknown> {
  if (typeof value === "function") return true;
  // React.memo / forwardRef exports are objects tagged with $typeof.
  return typeof value === "object" && value !== null && "$typeof" in value;
}

/**
 * Bundler-independent resolution of the Excalidraw component.
 *
 * Tries, in order:
 *   1. mod.Excalidraw
 *   2. mod.default?.Excalidraw
 *   3. mod.default
 *   4. Any other top-level key whose value is component-like
 *
 * If nothing resolves, throws an error that lists the keys that were found so
 * the caller can surface a useful diagnostic in the SVG-fallback notice.
 */
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

  const availableKeys = Object.keys(m).join(", ") || "(none)";
  throw new Error(
    `Excalidraw export not found; available keys: ${availableKeys}`,
  );
}

function ExcalidrawCanvas({
  Component,
  scene,
  language = "en",
  onElementClick,
  selectedElementIds = [],
  currentStepIndex = -1,
}: Omit<ExcalidrawBoardProps, "onError"> & {
  Component: ComponentType<unknown>;
}) {
  const apiRef = useRef<ExcalidrawApi | null>(null);
  const prevSelectedRef = useRef<string[]>(selectedElementIds);

  useEffect(() => {
    prevSelectedRef.current = selectedElementIds;
  }, [selectedElementIds]);

  const excalidrawScene = useMemo(
    () => toExcalidrawScene(scene, language, selectedElementIds),
    [scene, language, selectedElementIds],
  );

  useEffect(() => {
    if (apiRef.current) {
      apiRef.current.updateScene(excalidrawScene);
    }
  }, [excalidrawScene]);

  // Excalidraw reports selection in appState.selectedElementIds (not on elements).
  const handleChange = (
    _elements: unknown[],
    appState: { selectedElementIds?: Record<string, boolean> } | undefined,
  ) => {
    if (!onElementClick) return;
    const map = appState?.selectedElementIds ?? {};
    const selected = Object.keys(map).filter((id) => map[id]);

    const prev = prevSelectedRef.current;
    const changed = new Set([...selected, ...prev]);
    changed.forEach((id) => {
      const now = selected.includes(id);
      const before = prev.includes(id);
      if (now !== before) {
        onElementClick(id);
      }
    });

    prevSelectedRef.current = selected;
  };

  return (
    <div className="relative w-full">
      <div className="h-[420px] w-full overflow-hidden rounded-lg border border-stone-200 bg-white">
        <Component
          initialData={excalidrawScene}
          excalidrawAPI={(api: ExcalidrawApi) => {
            apiRef.current = api;
          }}
          onChange={handleChange}
          viewModeEnabled={false}
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
      {currentStepIndex >= 0 && (
        <div className="absolute right-2 top-2 rounded-md bg-white/90 px-2 py-1 text-xs text-stone-600 shadow">
          Step {currentStepIndex + 1}
        </div>
      )}
    </div>
  );
}
