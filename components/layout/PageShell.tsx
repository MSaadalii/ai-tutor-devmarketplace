import Link from "next/link";
import type { ReactNode } from "react";

export function PageShell({
  children,
  actions,
}: {
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-stone-50 px-4 py-8 text-stone-900 sm:px-6">
      <div className="mx-auto w-full max-w-5xl">
        <header className="mb-8 flex items-center justify-between gap-4">
          <Link href="/" className="font-semibold tracking-tight text-teal-900">
            Visual AI Tutor
          </Link>
          {actions}
        </header>
        {children}
      </div>
    </main>
  );
}
