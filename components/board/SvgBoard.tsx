"use client";

import type { BoardScene, BoardElement } from "@/lib/board/ops";
import type { AppLanguage } from "@/types";

export type SvgBoardProps = {
  scene: BoardScene;
  language?: AppLanguage;
  onElementClick?: (elementId: string) => void;
  taskMode?: boolean;
  taskElementIds?: string[];
  selectedElementIds?: string[];
  currentStepIndex?: number;
};

const VIEWBOX_WIDTH = 400;
const MIN_VIEWBOX_HEIGHT = 420;

// Warm lesson palette (beige / teal / charcoal).
const INK = "#26221e";
const REGION_PAINT: Record<string, { fill: string; stroke: string }> = {
  region_a2: { fill: "#f4e4c1", stroke: "#8a6a3b" },
  region_ab_1: { fill: "#cdeae3", stroke: "#1f6f66" },
  region_ab_2: { fill: "#cdeae3", stroke: "#1f6f66" },
  region_b2: { fill: "#e3e8d2", stroke: "#5f6f3f" },
};
const DEFAULT_PAINT = { fill: "#f6efe0", stroke: "#6b5f4f" };
const ACTIVE = { fill: "#fbd36b", stroke: "#b45309" };
const SELECTED = { fill: "#a7ddd2", stroke: "#0f766e" };

const BOARD_STYLE = `
  @keyframes svgPulse {
    0%, 100% { stroke-width: 6; }
    50% { stroke-width: 4; }
  }
  @keyframes svgEnter { from { opacity: 0; } to { opacity: 1; } }
  .svg-selected-pulse { animation: svgPulse 0.7s ease-in-out 2; }
  .svg-enter { animation: svgEnter 0.35s ease-out both; }
  .svg-fill-fade { transition: fill 0.25s ease, stroke 0.25s ease; }
  @media (prefers-reduced-motion: reduce) {
    .svg-selected-pulse, .svg-enter { animation: none; }
    .svg-fill-fade { transition: none; }
  }
`;

function pretty(text: string): string {
  return text.replace(/\^2/g, "²").replace(/\^3/g, "³");
}

function boardHeight(scene: BoardScene): number {
  const bottom = scene.elements.reduce((m, e) => {
    if (e.type === "text" && !e.text) return m;
    return Math.max(m, e.y + (e.type === "text" ? (e.fontSize ?? 20) + 8 : e.height));
  }, 0);
  return Math.max(MIN_VIEWBOX_HEIGHT, Math.ceil(bottom + 24));
}

export function SvgBoard({
  scene,
  language = "en",
  onElementClick,
  taskMode = false,
  taskElementIds = [],
  selectedElementIds = [],
  currentStepIndex = -1,
}: SvgBoardProps) {
  const clickableIds = new Set(
    taskMode
      ? taskElementIds.length > 0
        ? taskElementIds
        : ["region_ab_1", "region_ab_2", "region_a2", "region_b2"]
      : scene.elements.map((e) => e.id),
  );
  const height = boardHeight(scene);

  return (
    <div className="relative mx-auto w-full max-w-[720px]" dir={language === "ur" ? "rtl" : "ltr"}>
      <style>{BOARD_STYLE}</style>
      <svg
        viewBox={`0 0 ${VIEWBOX_WIDTH} ${height}`}
        className="h-auto w-full rounded-2xl border border-[#e3d9c6] bg-[#fffdf8]"
        style={{ minHeight: 300 }}
        role="img"
        aria-label="Lesson whiteboard"
      >
        {scene.elements.map((el) => (
          <SvgElement
            key={el.id}
            element={el}
            language={language}
            clickable={clickableIds.has(el.id)}
            selected={selectedElementIds.includes(el.id)}
            highlighted={scene.highlights.includes(el.id)}
            onClick={() => onElementClick?.(el.id)}
          />
        ))}

        {currentStepIndex >= 0 && (
          <g aria-hidden="true" opacity={0.85}>
            <rect x={VIEWBOX_WIDTH - 62} y={6} width={54} height={18} rx={9} fill="#efe6d3" />
            <text x={VIEWBOX_WIDTH - 35} y={19} textAnchor="middle" style={{ fontSize: 10, fill: "#6b5f4f", fontWeight: 600 }}>
              Step {currentStepIndex + 1}
            </text>
          </g>
        )}
      </svg>

      {taskMode && (
        <div className="absolute right-2 top-2 rounded-md bg-white/90 px-2 py-1 text-xs text-stone-600 shadow">
          Tap the two regions that make 6x
        </div>
      )}
    </div>
  );
}

function SvgElement({
  element,
  language,
  clickable,
  selected,
  highlighted,
  onClick,
}: {
  element: BoardElement;
  language: AppLanguage;
  clickable: boolean;
  selected: boolean;
  highlighted: boolean;
  onClick: () => void;
}) {
  const cursor = clickable ? "pointer" : "default";
  const fontFamily = "var(--font-geist-sans), ui-sans-serif, system-ui";

  if (element.type === "text") {
    if (!element.text) return null;
    const text = pretty(element.text);
    const maxW = VIEWBOX_WIDTH - 8 - Math.max(4, element.x);
    const wanted = element.fontSize ?? 20;
    const size = Math.max(9, Math.min(wanted, maxW / (text.length * 0.58)));
    const estW = text.length * size * 0.6;
    return (
      <text
        x={Math.max(4, element.x)}
        y={element.y + size}
        textLength={estW > maxW ? maxW : undefined}
        lengthAdjust="spacingAndGlyphs"
        className="svg-enter select-none"
        style={{
          fontSize: size,
          fontFamily,
          fill: highlighted ? ACTIVE.stroke : INK,
          fontWeight: highlighted ? 700 : 500,
          paintOrder: "stroke",
          stroke: "#fffdf8",
          strokeWidth: 3,
          direction: language === "ur" ? "rtl" : "ltr",
        }}
        onClick={onClick}
        cursor={cursor}
      >
        {text}
      </text>
    );
  }

  const base = REGION_PAINT[element.id] ?? DEFAULT_PAINT;
  const paint = highlighted ? ACTIVE : selected ? SELECTED : base;
  const strokeWidth = highlighted ? 6 : selected ? 5 : 3;
  const label = element.text ? pretty(element.text) : "";
  const baseSize = element.fontSize ?? 20;
  const availW = Math.max(10, element.width - 16);
  const availH = Math.max(10, element.height - 12);
  const size = label
    ? Math.max(8, Math.min(baseSize + 4, availH * 0.7, availW / (label.length * 0.6)))
    : baseSize;
  const vbAvail = Math.max(10, VIEWBOX_WIDTH - 8);
  const fitLen = label ? Math.min(availW, vbAvail, label.length * size * 0.62) : 0;
  const cx = Math.min(
    VIEWBOX_WIDTH - 4 - fitLen / 2,
    Math.max(4 + fitLen / 2, element.x + element.width / 2),
  );

  return (
    <g onClick={onClick} cursor={cursor} className="svg-enter">
      <rect
        x={element.x}
        y={element.y}
        width={element.width}
        height={element.height}
        fill={paint.fill}
        stroke={paint.stroke}
        strokeWidth={strokeWidth}
        rx={6}
        className={`svg-fill-fade ${highlighted ? "svg-selected-pulse" : ""}`}
      />
      {label ? (
        <text
          x={cx}
          y={element.y + element.height / 2}
          textAnchor="middle"
          dominantBaseline="central"
          textLength={fitLen}
          lengthAdjust="spacingAndGlyphs"
          className="select-none"
          style={{
            fontSize: size,
            fontFamily,
            fill: INK,
            fontWeight: highlighted ? 800 : 600,
            direction: "ltr",
            pointerEvents: "none",
          }}
        >
          {label}
        </text>
      ) : null}
    </g>
  );
}
