import { handleDetective } from "@/lib/routes/ai/detective";

export async function POST(request: Request) {
  return handleDetective(request);
}
