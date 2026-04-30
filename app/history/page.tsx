import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import HistoryReset from "./history-reset";
import TrendChart from "./trend-chart";

export const dynamic = "force-dynamic";

const POINTS_PER_QUESTION = 1.25;

export default async function HistoryPage() {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return <AuthWall />;

  // All attempts grouped by exam_seed
  const aggregates = await prisma.attempts.groupBy({
    by: ["exam_seed"],
    where: { user_email: email },
    _count: { _all: true },
    _sum: { is_correct: true },
  });

  // Sessions for elapsed time + created_at
  const sessions = await prisma.exam_sessions.findMany({
    where: { user_email: email },
  });
  const sessionMap = new Map(sessions.map((s) => [s.exam_seed, s]));

  // Get earliest attempt per seed for "started at" if no exam_session
  const earliestPerSeed = await prisma.attempts.groupBy({
    by: ["exam_seed"],
    where: { user_email: email, exam_seed: { not: null } },
    _min: { created_at: true },
  });
  const startMap = new Map(
    earliestPerSeed.map((e) => [e.exam_seed, e._min.created_at]),
  );

  type Row = {
    seed: string;
    isExam: boolean;
    count: number;
    correct: number;
    elapsed: number | null;
    createdAt: Date | null;
    score: number;
    pct: number;
  };

  const rows: Row[] = aggregates
    .filter((a) => a.exam_seed) // skip null seeds
    .map((a) => {
      const seed = a.exam_seed as string;
      const isExam = !seed.startsWith("p_");
      const count = a._count._all;
      const correct = Number(a._sum.is_correct ?? 0);
      const sess = sessionMap.get(seed);
      return {
        seed,
        isExam,
        count,
        correct,
        elapsed: sess?.elapsed_seconds ?? null,
        createdAt: sess?.created_at ?? startMap.get(seed) ?? null,
        score: correct * POINTS_PER_QUESTION,
        pct: count > 0 ? Math.round((correct / count) * 100) : 0,
      };
    })
    .sort((x, y) => {
      const a = x.createdAt ? x.createdAt.getTime() : 0;
      const b = y.createdAt ? y.createdAt.getTime() : 0;
      return b - a;
    });

  // Lifetime
  const lifetime = await prisma.attempts.aggregate({
    where: { user_email: email },
    _count: { _all: true },
    _sum: { is_correct: true },
  });
  const totalAttempts = lifetime._count._all;
  const totalCorrect = Number(lifetime._sum.is_correct ?? 0);
  const accuracy =
    totalAttempts > 0
      ? Math.round((totalCorrect / totalAttempts) * 1000) / 10
      : 0;

  // Trend chart data: only EXAM mode rows, oldest → newest, take last 20
  const trendData = rows
    .filter((r) => r.isExam)
    .slice(0, 20)
    .reverse()
    .map((r) => ({
      date: r.createdAt
        ? r.createdAt.toLocaleDateString("zh-TW", {
            month: "2-digit",
            day: "2-digit",
          })
        : "—",
      score: Number(r.score.toFixed(1)),
    }));

  return (
    <main>
      <div className="topbar">
        <Link href="/" className="btn btn-ghost">
          ← 回首頁
        </Link>
        <span className="badge">作答紀錄</span>
      </div>

      <div className="card grid">
        <div className="stat-grid">
          <div className="stat-cell">
            <div className="stat-num">{totalAttempts}</div>
            <div className="stat-label">總作答</div>
          </div>
          <div className="stat-cell">
            <div className="stat-num" style={{ color: "var(--good)" }}>
              {totalCorrect}
            </div>
            <div className="stat-label">總答對</div>
          </div>
          <div className="stat-cell">
            <div className="stat-num">{accuracy}%</div>
            <div className="stat-label">累計正確率</div>
          </div>
          <div className="stat-cell">
            <div className="stat-num">{rows.filter((r) => r.isExam).length}</div>
            <div className="stat-label">完成考試場次</div>
          </div>
        </div>
      </div>

      <div className="card grid" style={{ marginTop: 12 }}>
        <div
          className="row"
          style={{ justifyContent: "space-between", alignItems: "center" }}
        >
          <strong>📈 考試成績趨勢</strong>
          <span className="muted" style={{ fontSize: 12 }}>
            最近 {trendData.length} 場考試
          </span>
        </div>
        <TrendChart data={trendData} />
      </div>

      <div className="card grid" style={{ marginTop: 12 }}>
        <div
          className="row"
          style={{ justifyContent: "space-between", alignItems: "center" }}
        >
          <strong>📋 詳細紀錄</strong>
          <HistoryReset />
        </div>
        {rows.length === 0 ? (
          <div
            className="muted"
            style={{ textAlign: "center", padding: "24px 0" }}
          >
            尚無作答紀錄
          </div>
        ) : (
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {rows.map((r) => (
              <li
                key={r.seed}
                style={{
                  borderTop: "1px solid var(--border)",
                  padding: "10px 0",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <span
                      className="badge"
                      style={
                        r.isExam
                          ? { background: "#ede9fe", color: "#6d28d9" }
                          : { background: "#cffafe", color: "#0e7490" }
                      }
                    >
                      {r.isExam ? "🎯 考試" : "📝 練習"}
                    </span>
                    <span
                      className="muted"
                      style={{ fontFamily: "monospace", fontSize: 11 }}
                    >
                      {r.seed}
                    </span>
                  </div>
                  <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                    {r.createdAt
                      ? new Date(r.createdAt).toLocaleString("zh-TW")
                      : "—"}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>
                    {r.score.toFixed(1)} 分
                  </div>
                  <div className="muted" style={{ fontSize: 12 }}>
                    {r.correct} / {r.count}（{r.pct}%）
                    {r.elapsed != null
                      ? ` · ⏱ ${formatElapsed(r.elapsed)}`
                      : ""}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
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
        <span className="badge">作答紀錄</span>
      </div>
      <div className="card grid" style={{ textAlign: "center", padding: 32 }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>🔐</div>
        <strong>需要登入</strong>
        <div className="muted" style={{ fontSize: 14 }}>
          請先登入以查看作答紀錄
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

function formatElapsed(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
}
