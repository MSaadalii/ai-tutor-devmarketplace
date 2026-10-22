import { handleViva } from "@/lib/routes/ai/viva";

export async function POST(request: Request) {
  return handleViva(request);
}
