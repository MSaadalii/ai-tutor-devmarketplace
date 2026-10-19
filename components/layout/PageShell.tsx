import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Shared page chrome: header (brand + optional actions) and a centered main
 * column. `wide` is used by the lesson page so the board has room.
 */
export function PageShell({
  children,
  actions,
  wide = false,
}: {
  children: ReactNode;
  actions?: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">
      <header className="border-b border-stone-200 bg-white">
        <div
          className={cn(
            "mx-auto flex items-center justify-between px-4 py-3",
            wide ? "max-w-5xl" : "max-w-3xl",
          )}
        >
          <Link href="/" className="text-sm font-semibold text-teal-900">
            Visual AI Tutor
          </Link>
          {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
        </div>
      </header>
      <main
        className={cn(
          "mx-auto px-4 py-8",
          wide ? "max-w-5xl" : "max-w-3xl",
        )}
      >
        {children}
      </main>
    </div>
  );
}
