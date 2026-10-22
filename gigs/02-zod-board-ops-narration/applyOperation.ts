import type { BoardOperation, NarrationStep } from "./types";

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
  label?: string;
  selected?: boolean;
};

export type BoardScene = {
  elements: BoardElement[];
  highlights: string[];
};

const COLORS = {
  default: "#1e1e1e",
  highlight: "#b45309",
  highlightBg: "#fde047",
  fill: "#e7e5e4",
};

const FONT_SIZE = 20;
const HIGHLIGHT_STROKE_WIDTH = 5;

export function emptyScene(): BoardScene {
  return { elements: [], highlights: [] };
}

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

function restoreHighlights(scene: BoardScene): void {
  for (const id of scene.highlights) {
    const prev = scene.elements.find((e) => e.id === id);
    if (prev) {
      prev.strokeColor = COLORS.default;
      prev.backgroundColor = COLORS.fill;
      prev.strokeWidth = 2;
      prev.selected = false;
    }
  }
  scene.highlights = [];
}

/** Apply one validated board op. Highlights are exclusive (one focus at a time). */
export function applyOperation(scene: BoardScene, op: BoardOperation): BoardScene {
  const next: BoardScene = {
    elements: scene.elements.map((el) => ({ ...el, selected: false })),
    highlights: [...scene.highlights],
  };
  const p = op.payload as Record<string, unknown>;

  switch (op.type) {
    case "add_text": {
      next.elements.push({
        id: String(p.id ?? `text_${Date.now()}`),
        type: "text",
        x: Number(p.x ?? 0),
        y: Number(p.y ?? 0),
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
          backgroundColor: COLORS.fill,
          strokeWidth: 2,
        });
      }
      break;
    }
    case "update_label": {
      const el = next.elements.find((e) => e.id === String(p.elementId ?? ""));
      if (el) {
        el.text = String(p.text ?? el.text ?? "");
        el.label = el.text;
      }
      break;
    }
    case "highlight": {
      restoreHighlights(next);
      for (const id of highlightTargets(p)) {
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
        el.backgroundColor = COLORS.fill;
        el.strokeWidth = 2;
        el.selected = false;
      }
      next.highlights = next.highlights.filter((id) => id !== elementId);
      break;
    }
  }

  return next;
}

/** Replay ops through `upToIndex` (inclusive) onto an empty or seed scene. */
export function buildSceneFromSteps(
  steps: NarrationStep[],
  upToIndex: number,
  seed: BoardScene = emptyScene(),
): BoardScene {
  let scene = seed;
  for (let i = 0; i <= upToIndex && i < steps.length; i++) {
    scene = applyOperation(scene, steps[i].operation);
  }
  return scene;
}
