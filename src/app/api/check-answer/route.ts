import { NextResponse } from "next/server";
import { z } from "zod";
import { judgePracticeAnswer } from "@/lib/tossup-service";

const bodySchema = z.object({
  answer: z.string(),
  answerLine: z.string(),
});

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid answer payload." }, { status: 400 });
  }

  return NextResponse.json({ judgment: await judgePracticeAnswer(parsed.data.answer, parsed.data.answerLine) });
}
