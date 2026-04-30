import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type AttemptInput = {
  questionId: string;
  selectedAnswer: string;
  correctAnswer: string;
  examSeed?: string;
  guessed?: number | boolean;
  isCorrect?: number; // accepted but recomputed server-side
};

export async function POST(req: Request) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const fallbackSeed: string | null = body?.examSeed ?? null;
  const attempts: AttemptInput[] = Array.isArray(body?.attempts)
    ? body.attempts
    : [];

  if (attempts.length === 0) {
    return NextResponse.json({ ok: true, inserted: 0 });
  }

  const data = attempts.map((a) => {
    const correct =
      a.selectedAnswer != null &&
      a.correctAnswer != null &&
      a.selectedAnswer === a.correctAnswer;
    const guessed =
      a.guessed === true || a.guessed === 1 || String(a.guessed) === "1"
        ? 1
        : 0;
    return {
      user_email: email,
      exam_seed: a.examSeed ?? fallbackSeed,
      question_id: String(a.questionId),
      selected_answer: a.selectedAnswer ?? null,
      correct_answer: a.correctAnswer ?? null,
      is_correct: correct ? 1 : 0,
      guessed,
    };
  });

  const result = await prisma.attempts.createMany({ data });
  return NextResponse.json({ ok: true, inserted: result.count });
}
