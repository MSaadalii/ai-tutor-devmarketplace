import Link from "next/link";
import { PageShell } from "@/components/layout/PageShell";

export default function HomePage() {
  return (
    <PageShell>
      <section className="relative overflow-hidden rounded-2xl border border-stone-200 bg-gradient-to-br from-teal-50 via-white to-stone-50 px-6 py-16 sm:px-10">
        <div className="relative z-10 max-w-xl space-y-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-800">
            Visual AI Tutor
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-stone-900 sm:text-5xl">
            A teacher on a live whiteboard — not another chatbot.
          </h1>
          <p className="text-base leading-relaxed text-stone-600">
            Paste a topic or open Binomial Squares. Gemini drives validated board
            steps on Excalidraw while you ask, practice, and save your lesson.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              href="/signup"
              className="inline-flex h-10 items-center rounded-md bg-teal-800 px-4 text-sm font-medium text-white hover:bg-teal-900"
            >
              Start lesson
            </Link>
            <Link
              href="/login"
              className="inline-flex h-10 items-center rounded-md border border-stone-300 px-4 text-sm font-medium text-stone-800 hover:bg-stone-100"
            >
              Sign in
            </Link>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
