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
const VIEWBOX_HEIGHT = 420;

// CSS animation for selected element pulse (2-3 cycles, subtle stroke pulse)
const PULSE_STYLE = `
  @keyframes svgPulse {
    0%, 100% { stroke-width: 5; opacity: 1; }
    50% { stroke-width: 3; opacity: 0.7; }
  }
  .svg-selected-pulse {
    animation: svgPulse 0.6s ease-in-out 2;
  }
`;

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

  return (
    <div 
      className="relative w-full" 
      dir={language === "ur" ? "rtl" : "ltr"}
    >
      <style>{PULSE_STYLE}</style>
      <svg
        viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
        className="h-auto w-full rounded-lg border border-stone-200 bg-white"
        role="img"
        aria-label="Area model whiteboard"
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
          <text
            x={VIEWBOX_WIDTH - 12}
            y={24}
            textAnchor="end"
            className="fill-stone-400 text-xs"
            style={{ fontSize: 12 }}
          >
            Step {currentStepIndex + 1}
          </text>
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
  const isText = element.type === "text";
  const cursor = clickable ? "pointer" : "default";
  const stroke = selected ? "#0f766e" : element.strokeColor ?? "#1c1917";
  const fill = selected
    ? "#ccfbf1"
    : element.backgroundColor ?? "transparent";

  if (isText) {
    return (
      <text
        x={element.x}
        y={element.y + (element.fontSize ?? 20)}
        className="select-none"
        style={{
          fontSize: element.fontSize ?? 20,
          fontFamily: "var(--font-geist-sans), ui-sans-serif, system-ui",
          fill: "#1c1917",
          direction: language === "ur" ? "rtl" : "ltr",
        }}
        onClick={onClick}
        cursor={cursor}
      >
        {element.text}
      </text>
    );
  }

  return (
    <g onClick={onClick} cursor={cursor}>
      <rect
        x={element.x}
        y={element.y}
        width={element.width}
        height={element.height}
        fill={fill}
        stroke={stroke}
        strokeWidth={selected ? 3 : element.strokeWidth ?? 2}
        rx={4}
        className={highlighted ? "svg-selected-pulse" : ""}
      />
      {element.text ? (
        <text
          x={element.x + element.width / 2}
          y={element.y + element.height / 2 + 6}
          textAnchor="middle"
          className="select-none"
          style={{
            fontSize: element.fontSize ?? 20,
            fontFamily: "var(--font-geist-sans), ui-sans-serif, system-ui",
            fill: "#1c1917",
            direction: "ltr",
          }}
        >
          {element.text}
        </text>
      ) : null}
    </g>
  );
}
