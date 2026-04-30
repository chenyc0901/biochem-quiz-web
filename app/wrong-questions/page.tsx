import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getQuestionById, type Question } from "@/lib/questions";
import WrongQuestionsClient from "./wrong-questions-client";

export const dynamic = "force-dynamic";

export type WrongItem = Question & {
  stats: {
    pureWrong: number; // attempts where is_correct = 0
    guessed: number; // attempts where guessed = 1 (regardless of correctness)
    total: number;
  };
};

export default async function WrongQuestionsPage() {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return <AuthWall />;

  const grouped = await prisma.attempts.groupBy({
    by: ["question_id"],
    where: { user_email: email },
    _count: { _all: true },
    _sum: { is_correct: true, guessed: true },
  });

  const wrongs: WrongItem[] = grouped
    .map((g) => {
      const total = g._count._all;
      const correct = Number(g._sum.is_correct ?? 0);
      const guessed = Number(g._sum.guessed ?? 0);
      const pureWrong = total - correct;
      // Include if user got it wrong at least once OR marked as guessed at least once
      if (pureWrong === 0 && guessed === 0) return null;
      const q = getQuestionById(g.question_id);
      if (!q) return null;
      return {
        ...q,
        stats: { pureWrong, guessed, total },
      };
    })
    .filter((x): x is WrongItem => x !== null)
    .sort((a, b) => {
      // Sort by frequency: max(wrong, guessed) first
      const aRank = Math.max(a.stats.pureWrong, a.stats.guessed);
      const bRank = Math.max(b.stats.pureWrong, b.stats.guessed);
      return bRank - aRank;
    });

  return (
    <main>
      <div className="topbar">
        <Link href="/" className="btn btn-ghost">
          ← 回首頁
        </Link>
        <span className="badge">錯題練習</span>
      </div>
      <WrongQuestionsClient questions={wrongs} />
    </main>
  );
}

function AuthWall() {
  return (
    <main>
      <div className="topbar">
        <Link href="/" className="btn btn-ghost">
          ← 回首頁
        </Link>
        <span className="badge">錯題練習</span>
      </div>
      <div className="card grid" style={{ textAlign: "center", padding: 32 }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>🔐</div>
        <strong>需要登入</strong>
        <div className="muted" style={{ fontSize: 14 }}>
          請先登入以查看錯題
        </div>
        <Link
          href="/login"
          className="btn btn-primary"
          style={{ width: "fit-content", margin: "0 auto" }}
        >
          前往登入
        </Link>
      </div>
    </main>
  );
}
