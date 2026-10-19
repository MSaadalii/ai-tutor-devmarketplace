"use client";

import type { AppLanguage } from "@/types";

export function SummaryPanel({
  bullets,
  language,
}: {
  bullets: string[];
  language: AppLanguage;
}) {
  return (
    <section className="rounded-lg border border-stone-200 bg-white p-4">
      <h2 className="font-medium">
        {language === "ur" ? "سبق کا خلاصہ" : "Lesson summary"}
      </h2>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-stone-700">
        {bullets.map((bullet, i) => (
          <li key={i}>{bullet}</li>
        ))}
      </ul>
    </section>
  );
}
