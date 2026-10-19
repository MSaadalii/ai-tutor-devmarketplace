import Link from "next/link";

export function AppHeader() {
  return (
    <header className="border-b border-stone-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link href="/" className="text-sm font-semibold tracking-tight text-teal-900">
          Visual AI Tutor
        </Link>
        <nav className="flex items-center gap-3 text-sm text-stone-600">
          <Link href="/login" className="hover:text-stone-900">
            Sign in
          </Link>
          <Link href="/signup" className="hover:text-stone-900">
            Sign up
          </Link>
          <Link href="/app" className="hover:text-stone-900">
            My lessons
          </Link>
        </nav>
      </div>
    </header>
  );
}
