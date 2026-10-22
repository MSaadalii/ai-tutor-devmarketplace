import { handleTeachAi } from "@/lib/routes/ai/teachAi";

export async function POST(request: Request) {
  return handleTeachAi(request);
}
