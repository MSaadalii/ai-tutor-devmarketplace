import { AppHeader } from "@/components/layout/AppHeader";

export function PageShell({
  children,
  wide = false,
}: {
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_#f0fdfa_0%,_#fafaf9_45%,_#f5f5f4_100%)] text-stone-900">
      <AppHeader />
      <main
        className={
          wide
            ? "mx-auto w-full max-w-6xl px-4 py-8"
            : "mx-auto w-full max-w-5xl px-4 py-8"
        }
      >
        {children}
      </main>
    </div>
  );
}
