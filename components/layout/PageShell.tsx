"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

export type PageShellProps = {
  children: React.ReactNode;
  wide?: boolean;
  actions?: React.ReactNode;
  className?: string;
};

export function PageShell({
  children,
  wide = false,
  actions,
  className,
}: PageShellProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-stone-200 bg-white/80 backdrop-blur">
        <div
          className={cn(
            "mx-auto flex h-14 items-center justify-between px-4 sm:px-6",
            wide ? "max-w-6xl" : "max-w-3xl",
          )}
        >
          <Link
            href="/"
            className="text-sm font-semibold tracking-tight text-teal-900"
          >
            Visual AI Tutor
          </Link>
          {actions ? (
            <div className="flex items-center gap-2">{actions}</div>
          ) : null}
        </div>
      </header>
      <main className="flex-1 px-4 py-6 sm:px-6">
        <div
          className={cn(
            "mx-auto",
            wide ? "max-w-6xl" : "max-w-3xl",
            className,
          )}
        >
          {children}
        </div>
      </main>
    </div>
  );
}
