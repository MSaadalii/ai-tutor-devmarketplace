import { PageShell } from "@/components/layout/PageShell";
import { BoardCanvas } from "@/components/board/BoardCanvas";
import { BoardToolbar } from "@/components/board/BoardToolbar";
import { CaptionBar } from "@/components/board/CaptionBar";
import { LessonStepper } from "@/components/lesson/LessonStepper";

export default async function LessonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <PageShell wide>
      <div className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-stone-500">
              Lesson {id}
            </p>
            <h1 className="text-2xl font-semibold">Board teach loop</h1>
          </div>
          <LessonStepper activeIndex={1} />
        </div>

        <BoardToolbar disabled />
        <CaptionBar />
        <BoardCanvas />

        <section className="rounded-lg border border-stone-200 bg-white p-4 text-sm text-stone-600">
          Mid-lesson text Q&A, 2bx task, quiz, and summary mount here in later
          prompts (Uzzam + Taha + Saad).
        </section>
      </div>
    </PageShell>
  );
}
