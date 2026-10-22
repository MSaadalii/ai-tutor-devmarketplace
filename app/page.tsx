import Link from "next/link";
import { LandingNav } from "@/components/landing/LandingNav";
import { BoardMock } from "@/components/landing/BoardMock";
import { getSupabaseServerClient } from "@/lib/supabase/server";

async function isLoggedIn(): Promise<boolean> {
  try {
    const supabase = await getSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    return Boolean(data.user);
  } catch {
    return false;
  }
}

const steps = [
  ["Pick a topic", "Open Binomial Squares or paste a topic brief."],
  ["Watch the board", "Steps are drawn and highlighted one at a time with captions."],
  ["Practice", "Quiz yourself on STEM lessons and save your progress."],
];

const faqs = [
  ["Do I need a card?", "No. Sign up and start learning."],
  ["Which languages?", "Urdu and English narration, with captions always on."],
  ["Who is it for?", "Students preparing for MDCAT/ECAT and similar STEM exams."],
];

export default async function HomePage() {
  const loggedIn = await isLoggedIn();
  const cta = loggedIn ? "/app" : "/signup";
  return (
    <div className="landing min-h-screen">
      <LandingNav loggedIn={loggedIn} />
      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-12 lg:grid-cols-[0.9fr_1.1fr] lg:py-20">
          <div className="space-y-6">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-[var(--accent)]">
              Visual AI Tutor
            </p>
            <h1 className="text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
              Your AI Tutor. Explains like a real teacher.
            </h1>
            <p className="max-w-md text-lg text-stone-600">
              A live board, voice and captions, and a quiz for STEM — built for MDCAT/ECAT students.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href={cta} className="rounded-full bg-[var(--charcoal)] px-7 py-3.5 text-center font-semibold text-white shadow-md">
                Start learning
              </Link>
              <a href="#how" className="rounded-full border border-stone-300 bg-white/60 px-7 py-3.5 text-center font-semibold">
                See how it works
              </a>
            </div>
            <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-stone-600">
              {["Urdu + English", "No card needed", "Captions always on"].map((t) => (
                <li key={t} className="flex items-center gap-1.5">
                  <span className="text-[var(--accent)]">✓</span> {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="landing-hero-visual">
            <div className="landing-hero-board">
              <BoardMock />
            </div>
          </div>
        </section>

        <section id="features" className="mx-auto max-w-6xl px-5 py-12">
          <h2 className="text-3xl font-bold">Features</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {[
              ["Live board", "Step-by-step highlights, one region at a time."],
              ["Voice + captions", "Narration you can read along with."],
              ["Quiz for STEM", "Check understanding on pack lessons."],
            ].map(([t, d]) => (
              <div key={t} className="rounded-3xl bg-white p-6 shadow-sm">
                <h3 className="font-bold">{t}</h3>
                <p className="mt-2 text-sm text-stone-600">{d}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="how" className="mx-auto max-w-6xl px-5 py-12">
          <h2 className="text-3xl font-bold">How it works</h2>
          <ol className="mt-6 grid gap-4 md:grid-cols-3">
            {steps.map(([t, d], i) => (
              <li key={t} className="rounded-3xl bg-white p-6 shadow-sm">
                <span className="text-sm font-bold text-[var(--accent)]">Step {i + 1}</span>
                <h3 className="mt-1 font-bold">{t}</h3>
                <p className="mt-2 text-sm text-stone-600">{d}</p>
              </li>
            ))}
          </ol>
        </section>

        <section id="faqs" className="mx-auto max-w-3xl px-5 py-12">
          <h2 className="text-3xl font-bold">FAQs</h2>
          <div className="mt-6 space-y-3">
            {faqs.map(([q, a]) => (
              <details key={q} className="rounded-2xl bg-white p-4 shadow-sm">
                <summary className="cursor-pointer font-semibold">{q}</summary>
                <p className="mt-2 text-sm text-stone-600">{a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>
      <footer className="px-5 py-10 text-center text-sm text-stone-500">© Visual AI Tutor</footer>
    </div>
  );
}
