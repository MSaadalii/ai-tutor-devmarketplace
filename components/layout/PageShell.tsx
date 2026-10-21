import Link from "next/link";
import type { ReactNode } from "react";

export function PageShell({ children, actions, wide = false }: {
  children: ReactNode;
  actions?: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">
      <header className="border-b border-stone-200 bg-white">
        <div className={`mx-auto flex items-center justify-between gap-4 px-4 py-4 ${wide ? "max-w-6xl" : "max-w-5xl"}`}>
          <Link href="/app" className="font-semibold text-teal-900">Visual AI Tutor</Link>
          {actions}
        </div>
      </header>
      <main className={`mx-auto px-4 py-8 ${wide ? "max-w-6xl" : "max-w-5xl"}`}>{children}</main>
    </div>
  );
}
