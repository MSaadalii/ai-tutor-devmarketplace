"use client";

import {
  useCallback,
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
  onPainted?: () => void;
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
  const [convertElements, setConvertElements] = useState<
    typeof import("@excalidraw/excalidraw").convertToExcalidrawElements | null
  >(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    import("@excalidraw/excalidraw")
      .then((mod) => {
        if (!mounted) return;
        // resolveExcalidrawExport now throws with a detailed message if it
        // cannot find a component-like export.
        const Comp = resolveExcalidrawExport(mod);
        const { convertToExcalidrawElements } = mod;
        if (typeof convertToExcalidrawElements !== "function") {
          throw new Error("Excalidraw scene converter not found");
        }
        setConvertElements(() => convertToExcalidrawElements);
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

  if (!ExcalidrawComponent || !convertElements) {
    return (
      <div className="flex min-h-[360px] items-center justify-center rounded-lg border border-stone-200 bg-white text-sm text-stone-500">
        Loading Excalidraw…
      </div>
    );
  }

  return <ExcalidrawCanvas Component={ExcalidrawComponent} convertElements={convertElements} onError={onError} {...props} />;
}


type ConvertElements = typeof import("@excalidraw/excalidraw").convertToExcalidrawElements;
type ExcalidrawAppState = ReturnType<typeof toExcalidrawScene>["appState"] & {
  zoom: { value: number };
  scrollX: number;
  scrollY: number;
};
type ExcalidrawApi = {
  updateScene: (scene: {
    elements: ReturnType<ConvertElements>;
    appState: ExcalidrawAppState;
  }) => void;
  scrollToContent?: (
    elements: ReturnType<ConvertElements>,
    options?: { fitToContent: boolean },
  ) => void;
};

function isComponentLike(value: unknown): value is ComponentType<unknown> {
  if (typeof value === "function") return true;
  // React.memo / forwardRef exports use the $typeof symbol marker.
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
  if (m.Excalidraw != null) return m.Excalidraw as ComponentType<unknown>;

  const prioritised: unknown[] = [def.Excalidraw, m.default];
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
  convertElements,
  scene,
  language = "en",
  onElementClick,
  selectedElementIds = [],
  currentStepIndex = -1,
  onError,
  onPainted,
}: ExcalidrawBoardProps & {
  Component: ComponentType<Record<string, unknown>>;
  convertElements: ConvertElements;
}) {
  const [api, setApi] = useState<ExcalidrawApi | null>(null);
  const canvasRootRef = useRef<HTMLDivElement>(null);
  const handleApiReady = useCallback((readyApi: ExcalidrawApi) => setApi(readyApi), []);
  const prevSelectedRef = useRef<string[]>(selectedElementIds);

  useEffect(() => {
    prevSelectedRef.current = selectedElementIds;
  }, [selectedElementIds]);

  const excalidrawScene = useMemo(() => {
    const skeletonScene = toExcalidrawScene(scene, language, selectedElementIds);
    return {
      ...skeletonScene,
      elements: convertElements(skeletonScene.elements, { regenerateIds: false }),
      appState: {
        ...skeletonScene.appState,
        zoom: { value: 1 },
        scrollX: 0,
        scrollY: 0,
      },
      scrollToContent: true,
    };
  }, [scene, language, selectedElementIds, convertElements]);

  useEffect(() => {
    const { elements, appState } = excalidrawScene;
    if (elements.length === 0) {
      onError?.("empty scene");
      return;
    }
    if (!api) return;

    // Let Excalidraw finish its initializeScene pass before replacing the scene.
    // The same delayed path runs on API readiness and on every scene/step change.
    let frame = 0;
    const updateTimer = window.setTimeout(() => {
      try {
        api.updateScene({ elements, appState });
      } catch (error) {
        onError?.(
          error instanceof Error ? error.message : "Excalidraw scene update failed",
        );
        return;
      }

      // Fit after the update has painted/layout has settled. Older API versions
      // may not accept options, so retry with the legacy one-argument call.
      let paintChecks = 0;
      const confirmPaint = () => {
        if (api.scrollToContent && paintChecks === 0) {
          try {
            api.scrollToContent(elements, { fitToContent: true });
          } catch {
            try {
              api.scrollToContent(elements);
            } catch {
              // Some package versions expose an incompatible fitting API.
              // Canvas dimensions are still sufficient as a soft paint signal.
            }
          }
        }
        const canvas = canvasRootRef.current?.querySelector("canvas");
        if (canvas && canvas.clientWidth >= 40 && canvas.clientHeight >= 40) {
          onPainted?.();
          return;
        }
        if (++paintChecks < 40) frame = requestAnimationFrame(confirmPaint);
      };
      frame = requestAnimationFrame(confirmPaint);
    }, 220);

    return () => {
      window.clearTimeout(updateTimer);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [api, excalidrawScene, currentStepIndex, onError, onPainted]);

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
        <div ref={canvasRootRef} style={{ height: "100%", width: "100%" }}>
        <Component
          initialData={excalidrawScene}
          excalidrawAPI={handleApiReady}
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
          style={{ height: "100%", width: "100%" }}
        />
        </div>
      </div>
      {currentStepIndex >= 0 && (
        <div className="absolute right-2 top-2 rounded-md bg-white/90 px-2 py-1 text-xs text-stone-600 shadow">
          Step {currentStepIndex + 1}
        </div>
      )}
    </div>
  );
}
