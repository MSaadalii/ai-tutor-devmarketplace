import Link from "next/link";
import { cn } from "@/lib/utils";

export function PageShell({
  children,
  wide,
  actions,
}: {
  children: React.ReactNode;
  wide?: boolean;
  actions?: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">
      <header className="border-b border-stone-200 bg-white">
        <div
          className={cn(
            "mx-auto flex h-14 w-full items-center justify-between px-4",
            wide ? "max-w-6xl" : "max-w-3xl",
          )}
        >
          <Link href="/" className="text-sm font-semibold tracking-tight">
            Visual AI Tutor
          </Link>
          {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
        </div>
      </header>
      <main
        className={cn(
          "mx-auto w-full px-4 py-8",
          wide ? "max-w-6xl" : "max-w-3xl",
        )}
      >
        {children}
      </main>
    </div>
  );
}
