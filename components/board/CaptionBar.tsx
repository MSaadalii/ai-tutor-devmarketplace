export function CaptionBar({
  text = "Captions will appear here during narration.",
  language = "en",
}: {
  text?: string;
  language?: "en" | "ur";
}) {
  return (
    <div
      className="lesson-caption rounded-md border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 shadow-sm"
      dir={language === "ur" ? "rtl" : "ltr"}
      lang={language}
    >
      {text}
    </div>
  );
}
