import { handleQuizExplain } from "@/lib/routes/ai/quizExplain";

export async function POST(request: Request) {
  return handleQuizExplain(request);
}
