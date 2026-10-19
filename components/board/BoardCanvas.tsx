"use client";

/**
 * Placeholder board surface. Uzzam lane: swap in Excalidraw (ssr:false)
 * or SVG fallback sharing the same applyOperation contract.
 */
export function BoardCanvas({
  children,
}: {
  children?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[360px] items-center justify-center rounded-lg border border-dashed border-stone-300 bg-white/80 text-sm text-stone-500">
      {children ?? "Board canvas placeholder — Excalidraw / SVG goes here"}
    </div>
  );
}
