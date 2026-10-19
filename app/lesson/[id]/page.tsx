import { LessonClient } from "./LessonClient";

export default async function LessonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <LessonClient sessionId={id} />;
}
