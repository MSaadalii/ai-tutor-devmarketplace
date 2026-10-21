"use client";

import Link from "next/link";
import { useState } from "react";

const links = [
  { href: "#features", label: "Features" },
  { href: "#how", label: "How it works" },
  { href: "#faqs", label: "FAQs" },
];

export function LandingNav({ loggedIn }: { loggedIn: boolean }) {
  const [open, setOpen] = useState(false);
  const cta = loggedIn ? "/app" : "/signup";
  return (
    <header className="mx-auto max-w-6xl px-5 pt-5">
      <nav className="flex items-center justify-between rounded-full bg-white/70 px-5 py-3 shadow-sm">
        <Link href="/" className="font-bold tracking-tight">
          <span className="text-[var(--accent)]">●</span> Visual AI Tutor
        </Link>
        <div className="hidden items-center gap-6 text-sm md:flex">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="text-stone-600 hover:text-stone-900">
              {l.label}
            </a>
          ))}
          {!loggedIn && (
            <Link href="/login" className="font-medium text-stone-800">
              Sign in
            </Link>
          )}
          <Link href={cta} className="rounded-full bg-[var(--charcoal)] px-5 py-2 font-semibold text-white">
            {loggedIn ? "Open app" : "Get Started"}
          </Link>
        </div>
        <button
          type="button"
          className="rounded-full border border-stone-300 px-3 py-1 text-sm md:hidden"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? "Close" : "Menu"}
        </button>
      </nav>
      {open && (
        <div className="mt-2 flex flex-col gap-3 rounded-3xl bg-white p-5 text-sm shadow-md md:hidden">
          {links.map((l) => (
            <a key={l.href} href={l.href} onClick={() => setOpen(false)}>
              {l.label}
            </a>
          ))}
          {!loggedIn && <Link href="/login">Sign in</Link>}
          <Link href={cta} className="rounded-full bg-[var(--charcoal)] py-3 text-center font-semibold text-white">
            {loggedIn ? "Open app" : "Get Started"}
          </Link>
        </div>
      )}
    </header>
  );
}
