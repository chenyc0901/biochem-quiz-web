import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { pickQuestionsForSeed, generateSeed } from "@/lib/questions";
import ExamClient, { type Prefilled } from "./exam-client";

type SearchParams = Promise<{
  seed?: string;
  mode?: string;
  yearTerms?: string;
}>;

export default async function ExamPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await auth();
  const sp = await searchParams;
  const seed = sp.seed ?? generateSeed();
  const mode = sp.mode === "exam" ? "exam" : "practice";
  const yearTerms = sp.yearTerms?.split(",").filter(Boolean);
  const questions = pickQuestionsForSeed(seed, 80, yearTerms);
  const userEmail = session?.user?.email ?? "";

  // Practice mode: prefill from existing attempts so users can resume
  let prefilled: Prefilled = { answers: {}, guessed: {} };
  if (mode === "practice" && userEmail) {
    const examSeed = `p_${seed}`;
    const prior = await prisma.attempts.findMany({
      where: { user_email: userEmail, exam_seed: examSeed },
      select: {
        question_id: true,
        selected_answer: true,
        guessed: true,
        created_at: true,
      },
      orderBy: { created_at: "asc" }, // later rows overwrite earlier in the reduce
    });
    for (const row of prior) {
      if (row.selected_answer) {
        prefilled.answers[row.question_id] = row.selected_answer;
      }
      prefilled.guessed[row.question_id] = row.guessed === 1;
    }
  }

  return (
    <ExamClient
      seed={seed}
      mode={mode}
      questions={questions}
      userEmail={userEmail}
      prefilled={prefilled}
    />
  );
}
