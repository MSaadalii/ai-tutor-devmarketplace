import { handleBoardTutor } from "@/lib/routes/ai/boardTutor";

export async function POST(request: Request) {
  return handleBoardTutor(request);
}
