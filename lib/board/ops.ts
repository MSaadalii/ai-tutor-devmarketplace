import type { BoardOperation, NarrationStep, AppLanguage } from "@/types";

export type BoardElement = {
  id: string;
  type: "rectangle" | "text" | "square";
  x: number;
  y: number;
  width: number;
  height: number;
  text?: string;
  strokeColor?: string;
  backgroundColor?: string;
  fontSize?: number;
  strokeWidth?: number;
  fillStyle?: string;
  roughness?: number;
  label?: string;
  selected?: boolean;
};

export type BoardScene = {
  elements: BoardElement[];
  highlights: string[];
};

const COLORS = {
  default: "#1e1e1e",
  highlight: "#b45309", // amber-700 (dark amber stroke)
  highlightBg: "#fde047", // yellow-300 (high-contrast fill)
  label: "#44403c", // stone-700
  a2: "#e7e5e4", // stone-200
  ab: "#d6d3d1", // stone-300
  b2: "#a8a29e", // stone-400
};

const FONT_SIZE = 20;
const HIGHLIGHT_STROKE_WIDTH = 5;

/**
 * Build the initial area-model board for (a+b)^2.
 * The square is 320x320 px; a side is 200 px, b side is 120 px.
 */
export function buildAreaModelScene(
  aLabel = "x",
  bLabel = "3",
): BoardScene {
  const originX = 40;
  const originY = 40;
  const a = 160;
  const b = 100;
  const total = a + b;

  const elements: BoardElement[] = [
    // a^2 square (top-left)
    {
      id: "region_a2",
      type: "square",
      x: originX,
      y: originY,
      width: a,
      height: a,
      backgroundColor: COLORS.a2,
      strokeColor: COLORS.default,
      strokeWidth: 2,
      label: `${aLabel}^2`,
      text: `${aLabel}^2`,
    },
    // ab rectangle (top-right)
    {
      id: "region_ab_1",
      type: "rectangle",
      x: originX + a,
      y: originY,
      width: b,
      height: a,
      backgroundColor: COLORS.ab,
      strokeColor: COLORS.default,
      strokeWidth: 2,
      label: `${aLabel}${bLabel}`,
      text: `${aLabel}${bLabel}`,
    },
    // ab rectangle (bottom-left)
    {
      id: "region_ab_2",
      type: "rectangle",
      x: originX,
      y: originY + a,
      width: a,
      height: b,
      backgroundColor: COLORS.ab,
      strokeColor: COLORS.default,
      strokeWidth: 2,
      label: `${aLabel}${bLabel}`,
      text: `${aLabel}${bLabel}`,
    },
    // b^2 square (bottom-right)
    {
      id: "region_b2",
      type: "square",
      x: originX + a,
      y: originY + a,
      width: b,
      height: b,
      backgroundColor: COLORS.b2,
      strokeColor: COLORS.default,
      strokeWidth: 2,
      label: `${bLabel}^2`,
      text: `${bLabel}^2`,
    },
    // Side labels
    {
      id: "label_a_side",
      type: "text",
      x: originX + a / 2 - 8,
      y: originY - 28,
      width: 40,
      height: 24,
      text: aLabel,
      fontSize: FONT_SIZE,
    },
    {
      id: "label_b_side",
      type: "text",
      x: originX + a + b / 2 - 8,
      y: originY - 28,
      width: 40,
      height: 24,
      text: bLabel,
      fontSize: FONT_SIZE,
    },
    {
      id: "label_a_side_left",
      type: "text",
      x: originX - 28,
      y: originY + a / 2 - 12,
      width: 40,
      height: 24,
      text: aLabel,
      fontSize: FONT_SIZE,
    },
    {
      id: "label_b_side_left",
      type: "text",
      x: originX - 28,
      y: originY + a + b / 2 - 12,
      width: 40,
      height: 24,
      text: bLabel,
      fontSize: FONT_SIZE,
    },
    // Result label (hidden until revealed)
    {
      id: "result_label",
      type: "text",
      x: originX,
      y: originY + total + 16,
      width: total,
      height: 28,
      text: "",
      fontSize: FONT_SIZE,
    },
  ];

  return { elements, highlights: [] };
}

/**
 * Apply a single board operation to a scene, returning a new scene.
 */
export function applyOperation(
  scene: BoardScene,
  op: BoardOperation,
): BoardScene {
  const next: BoardScene = {
    elements: scene.elements.map((el) => ({ ...el, selected: false })),
    highlights: [...scene.highlights],
  };

  const p = op.payload as Record<string, unknown>;

  switch (op.type) {
    case "add_text": {
      const x = Number(p.x ?? 0);
      const y = Number(p.y ?? 0);
      next.elements.push({
        id: String(p.id ?? `text_${Date.now()}`),
        type: "text",
        x,
        y,
        width: 200,
        height: 28,
        text: String(p.text ?? ""),
        fontSize: FONT_SIZE,
      });
      break;
    }
    case "add_shape": {
      const elementId = String(p.elementId ?? `shape_${Date.now()}`);
      const existing = next.elements.find((e) => e.id === elementId);
      if (existing) {
        existing.text = String(p.text ?? existing.text ?? "");
        existing.label = existing.text;
      } else {
        next.elements.push({
          id: elementId,
          type: (p.shape as BoardElement["type"]) ?? "rectangle",
          x: Number(p.x ?? 0),
          y: Number(p.y ?? 0),
          width: Number(p.width ?? 80),
          height: Number(p.height ?? 80),
          text: String(p.text ?? ""),
          label: String(p.text ?? ""),
          strokeColor: COLORS.default,
          backgroundColor: COLORS.a2,
          strokeWidth: 2,
        });
      }
      break;
    }
    case "update_label": {
      const elementId = String(p.elementId ?? "");
      const el = next.elements.find((e) => e.id === elementId);
      if (el) {
        // Revealing the result clears the previous region focus.
        if (elementId === "result_label") restoreHighlights(next);
        el.text = String(p.text ?? el.text ?? "");
        el.label = el.text;
      }
      break;
    }
    case "highlight": {
      // Exclusive: restore everything highlighted so far, then highlight the
      // new target(s). payload.elementIds highlights several in one op.
      restoreHighlights(next);

      const ids = highlightTargets(p);
      for (const id of ids) {
        const el = next.elements.find((e) => e.id === id);
        if (el) {
          el.strokeColor = COLORS.highlight;
          el.backgroundColor = COLORS.highlightBg;
          el.strokeWidth = HIGHLIGHT_STROKE_WIDTH;
          el.selected = true;
        }
        if (!next.highlights.includes(id)) next.highlights.push(id);
      }
      break;
    }
    case "clear_highlight": {
      const elementId = String(p.elementId ?? "");
      const el = next.elements.find((e) => e.id === elementId);
      if (el) {
        el.strokeColor = COLORS.default;
        el.backgroundColor = restoreFillColor(elementId);
        el.strokeWidth = 2;
        el.selected = false;
      }
      next.highlights = next.highlights.filter((id) => id !== elementId);
      break;
    }
  }

  return next;
}

/** Restore original fill/stroke of every highlighted element and clear the list. */
function restoreHighlights(scene: BoardScene): void {
  for (const id of scene.highlights) {
    const prev = scene.elements.find((e) => e.id === id);
    if (prev) {
      prev.strokeColor = COLORS.default;
      prev.backgroundColor = restoreFillColor(id);
      prev.strokeWidth = 2;
      prev.selected = false;
    }
  }
  scene.highlights = [];
}

/** Ids targeted by a highlight payload: elementIds[] if present, else elementId. */
export function highlightTargets(p: Record<string, unknown>): string[] {
  if (Array.isArray(p.elementIds)) {
    const ids = p.elementIds.filter(
      (v): v is string => typeof v === "string" && v.length > 0,
    );
    if (ids.length > 0) return ids;
  }
  const single = String(p.elementId ?? "");
  return single ? [single] : [];
}

function restoreFillColor(elementId: string): string | undefined {
  if (elementId === "region_a2") return COLORS.a2;
  if (elementId === "region_ab_1" || elementId === "region_ab_2")
    return COLORS.ab;
  if (elementId === "region_b2") return COLORS.b2;
  return undefined;
}

/**
 * Build a scene from narration steps by replaying all ops up to the given index.
 */
export function buildSceneFromSteps(
  steps: NarrationStep[],
  upToIndex: number,
  aLabel = "x",
  bLabel = "3",
): BoardScene {
  let scene = buildAreaModelScene(aLabel, bLabel);
  for (let i = 0; i <= upToIndex && i < steps.length; i++) {
    scene = applyOperation(scene, steps[i].operation);
  }
  return scene;
}

// Type-only reference keeps the optional renderer out of the SVG/server bundle.
type ExcalidrawSkeletons = Parameters<
  typeof import("@excalidraw/excalidraw").convertToExcalidrawElements
>[0];

/** Build skeletons; the optional client renderer converts them to full elements. */
export function toExcalidrawScene(
  scene: BoardScene,
  language: AppLanguage = "en",
  selectedElementIds: string[] = [],
) {
  const elements: ExcalidrawSkeletons = [];
  for (const el of scene.elements) {
    const highlighted = scene.highlights.includes(el.id);
    const base = {
      id: el.id,
      x: el.x,
      y: el.y,
      strokeColor: highlighted ? COLORS.highlight : el.strokeColor ?? COLORS.default,
      backgroundColor: highlighted ? COLORS.highlightBg : el.backgroundColor ?? "transparent",
      fillStyle: "solid" as const,
      strokeWidth: highlighted ? HIGHLIGHT_STROKE_WIDTH : el.strokeWidth ?? 2,
      roughness: el.roughness ?? 1,
    };
    const fontSize = el.fontSize ?? FONT_SIZE;
    if (el.type === "text") {
      elements.push({
        ...base,
        type: "text",
        text: el.text ?? "",
        fontSize,
        fontFamily: 1,
        textAlign: "left",
      });
      continue;
    }

    // The converter creates bound text for the rectangle while retaining its
    // region ID, so highlights and task selections still target the region.
    const text = el.text ?? el.label ?? "";
    elements.push({
      ...base,
      type: "rectangle",
      width: el.width,
      height: el.height,
      ...(text ? {
        label: {
          text,
          textAlign: "center" as const,
          verticalAlign: "middle" as const,
          fontSize,
          fontFamily: 1,
          strokeColor: COLORS.label,
        },
      } : {}),
    });
  }

  // Language is kept in this adapter's interface for both board renderers.
  void language;
  return {
    elements,
    appState: {
      viewBackgroundColor: "#ffffff",
      currentItemFontFamily: 1,
      zenModeEnabled: false,
      gridSize: null,
      theme: "light",
      selectedElementIds: Object.fromEntries(
        scene.elements
          .filter((e) => e.selected || selectedElementIds.includes(e.id))
          .map((e) => [e.id, true]),
      ),
    },
    files: {},
  };
}

/**
 * Map an element ID to a center point on the SVG board.
 */
export function getElementCenter(scene: BoardScene, elementId: string): { x: number; y: number } | null {
  const el = scene.elements.find((e) => e.id === elementId);
  if (!el) return null;
  return { x: el.x + el.width / 2, y: el.y + el.height / 2 };
}
