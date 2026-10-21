import { cn } from "@/lib/utils";

const STEPS = [
  "Diagnose",
  "Board",
  "Ask",
  "2bx task",
  "Quiz",
  "Summary",
] as const;

export function LessonStepper({
  activeIndex = 0,
  brief = false,
}: {
  activeIndex?: number;
  brief?: boolean;
}) {
  return (
    <ol className="flex flex-wrap gap-2">
      {(brief ? ["Board", "Ask (optional)", "Ungraded summary"] : STEPS).map((label, i) => (
        <li
          key={label}
          aria-current={i === activeIndex ? "step" : undefined}
          className={cn(
            "rounded-full px-3 py-1 text-xs font-medium",
            i === activeIndex
              ? "bg-teal-800 text-white"
              : i < activeIndex
                ? "bg-teal-100 text-teal-900"
                : "bg-stone-100 text-stone-500",
          )}
        >
          {i + 1}. {label}
        </li>
      ))}
    </ol>
  );
}
