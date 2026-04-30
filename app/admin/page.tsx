import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdminEmail } from "@/lib/admin";
import { ALL_QUESTIONS, getQuestionById } from "@/lib/questions";
import ReportsPanel, { type ReportForClient } from "./reports-panel";
import ResetAllButton from "./reset-all-button";
import ErrorRateRanking, { type RankedItem } from "./error-rate-ranking";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await auth();
  const email = session?.user?.email;
  if (!email || !isAdminEmail(email)) return <NoAccess />;

  const [
    attemptsCount,
    sessionsCount,
    reports,
    grouped,
    userStats,
    userSessions,
  ] = await Promise.all([
    prisma.attempts.count(),
    prisma.exam_sessions.count(),
    prisma.question_reports.findMany({
      orderBy: { created_at: "desc" },
      take: 200,
    }),
    prisma.attempts.groupBy({
      by: ["question_id"],
      _count: { _all: true },
      _sum: { is_correct: true },
    }),
    prisma.attempts.groupBy({
      by: ["user_email"],
      where: { user_email: { not: null } },
      _count: { _all: true },
      _sum: { is_correct: true, guessed: true },
      _max: { created_at: true },
    }),
    prisma.exam_sessions.groupBy({
      by: ["user_email"],
      where: { user_email: { not: null } },
      _count: { _all: true },
    }),
  ]);

  // Per-user stats
  const sessionsByUser = new Map(
    userSessions.map((s) => [s.user_email, s._count._all]),
  );
  const userRows = userStats
    .map((u) => {
      const total = u._count._all;
      const correct = Number(u._sum.is_correct ?? 0);
      const guessed = Number(u._sum.guessed ?? 0);
      return {
        email: u.user_email ?? "—",
        total,
        correct,
        wrong: total - correct,
        guessed,
        accuracy: total > 0 ? correct / total : 0,
        examCount: sessionsByUser.get(u.user_email) ?? 0,
        lastActivity: u._max.created_at,
      };
    })
    .sort((a, b) => {
      const at = a.lastActivity ? a.lastActivity.getTime() : 0;
      const bt = b.lastActivity ? b.lastActivity.getTime() : 0;
      return bt - at;
    });

  // Error-rate ranking
  const rankedRaw = grouped
    .map((g) => {
      const total = g._count._all;
      const correct = Number(g._sum.is_correct ?? 0);
      return {
        questionId: g.question_id,
        total,
        correct,
        errorRate: total > 0 ? 1 - correct / total : 0,
      };
    })
    .filter((g) => g.total >= 3)
    .sort((a, b) => b.errorRate - a.errorRate)
    .slice(0, 20);

  // Curated explanations for ranked + reported questions
  const reportedIds = reports
    .map((r) => r.question_id)
    .filter((x): x is string => !!x);
  const curated = await prisma.question_explanations.findMany({
    where: {
      question_id: {
        in: [...new Set([...rankedRaw.map((r) => r.questionId), ...reportedIds])],
      },
    },
  });
  const curatedMap = new Map(curated.map((c) => [c.question_id, c]));

  const buildCurated = (qid: string) => {
    const c = curatedMap.get(qid);
    if (!c || c.status === "draft" || (!c.reason_text && !c.answer_text))
      return null;
    return {
      answerText: c.answer_text,
      reasonText: c.reason_text,
      wrongOptionsText: c.wrong_options_text,
      keyPointText: c.key_point_text,
      sourceText: c.source_text,
      status: c.status,
    };
  };

  const rankedForClient: RankedItem[] = rankedRaw.map((r) => {
    const q = getQuestionById(r.questionId);
    return {
      questionId: r.questionId,
      total: r.total,
      correct: r.correct,
      errorRate: r.errorRate,
      question: q
        ? {
            yearTerm: q.yearTerm,
            questionNo: q.questionNo,
            question: q.question,
            options: q.options,
            answer: q.answer,
            correctionNote: q.correctionNote,
          }
        : null,
      curated: buildCurated(r.questionId),
    };
  });

  // Reports for client
  const reportsForClient: ReportForClient[] = reports.map((r) => {
    const q = r.question_id ? getQuestionById(r.question_id) : null;
    return {
      id: r.id.toString(),
      content: r.content,
      userEmail: r.user_email ?? null,
      createdAt: r.created_at?.toISOString() ?? null,
      question: q
        ? {
            yearTerm: q.yearTerm,
            questionNo: q.questionNo,
            question: q.question,
            options: q.options,
            answer: q.answer,
            correctionNote: q.correctionNote,
          }
        : null,
      curated: r.question_id ? buildCurated(r.question_id) : null,
    };
  });

  return (
    <main>
      <div className="topbar">
        <Link href="/" className="btn btn-ghost">
          ← 回首頁
        </Link>
        <span className="badge">後台統計</span>
      </div>

      {/* 1. Reports — most actionable */}
      <div className="card grid">
        <div
          className="row"
          style={{ justifyContent: "space-between", alignItems: "center" }}
        >
          <strong>📩 題目回報</strong>
          <span className="muted" style={{ fontSize: 12 }}>
            共 {reportsForClient.length} 筆
          </span>
        </div>
        <ReportsPanel initialReports={reportsForClient} />
      </div>

      {/* 2. Per-user stats */}
      <div className="card grid" style={{ marginTop: 12 }}>
        <div
          className="row"
          style={{ justifyContent: "space-between", alignItems: "center" }}
        >
          <strong>👥 使用者答題狀況</strong>
          <span className="muted" style={{ fontSize: 12 }}>
            {userRows.length} 位使用者
          </span>
        </div>
        {userRows.length === 0 ? (
          <div
            className="muted"
            style={{ textAlign: "center", padding: "24px 0" }}
          >
            還沒有使用者資料
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="report-table">
              <thead>
                <tr>
                  <th>使用者</th>
                  <th style={{ textAlign: "right" }}>總作答</th>
                  <th style={{ textAlign: "right" }}>對</th>
                  <th style={{ textAlign: "right" }}>錯</th>
                  <th style={{ textAlign: "right" }}>🎲 猜</th>
                  <th style={{ textAlign: "right" }}>正確率</th>
                  <th style={{ textAlign: "right" }}>考試</th>
                  <th>最近活動</th>
                </tr>
              </thead>
              <tbody>
                {userRows.map((u) => {
                  const acc = Math.round(u.accuracy * 100);
                  const accColor =
                    acc >= 80
                      ? "var(--good)"
                      : acc >= 60
                        ? "#0e7490"
                        : "var(--bad)";
                  return (
                    <tr key={u.email}>
                      <td
                        style={{
                          maxWidth: 220,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          fontFamily: "monospace",
                          fontSize: 12,
                        }}
                        title={u.email}
                      >
                        {u.email}
                      </td>
                      <td style={{ textAlign: "right", fontWeight: 600 }}>
                        {u.total}
                      </td>
                      <td
                        style={{
                          textAlign: "right",
                          color: "var(--good)",
                        }}
                      >
                        {u.correct}
                      </td>
                      <td
                        style={{ textAlign: "right", color: "var(--bad)" }}
                      >
                        {u.wrong}
                      </td>
                      <td
                        style={{ textAlign: "right", color: "#9a3412" }}
                      >
                        {u.guessed}
                      </td>
                      <td
                        style={{
                          textAlign: "right",
                          color: accColor,
                          fontWeight: 700,
                        }}
                      >
                        {acc}%
                      </td>
                      <td style={{ textAlign: "right" }}>{u.examCount}</td>
                      <td
                        className="muted"
                        style={{ fontSize: 11, whiteSpace: "nowrap" }}
                      >
                        {u.lastActivity
                          ? new Date(u.lastActivity).toLocaleDateString(
                              "zh-TW",
                              { month: "2-digit", day: "2-digit" },
                            )
                          : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 3. Error-rate ranking */}
      <div className="card grid" style={{ marginTop: 12 }}>
        <div
          className="row"
          style={{ justifyContent: "space-between", alignItems: "center" }}
        >
          <strong>🔥 錯誤率排行</strong>
          <span className="muted" style={{ fontSize: 12 }}>
            ≥ 3 次作答，前 20 題
          </span>
        </div>
        <ErrorRateRanking items={rankedForClient} />
      </div>

      {/* 4. System stats */}
      <div className="card grid" style={{ marginTop: 12 }}>
        <strong>📊 系統統計</strong>
        <div className="stat-grid">
          <div className="stat-cell">
            <div className="stat-num">{userRows.length}</div>
            <div className="stat-label">累計使用者</div>
          </div>
          <div className="stat-cell">
            <div className="stat-num">{attemptsCount}</div>
            <div className="stat-label">累計作答</div>
          </div>
          <div className="stat-cell">
            <div className="stat-num">{sessionsCount}</div>
            <div className="stat-label">完成考試場次</div>
          </div>
          <div className="stat-cell">
            <div className="stat-num">{ALL_QUESTIONS.length}</div>
            <div className="stat-label">題庫題數</div>
          </div>
        </div>
      </div>

      {/* 5. Danger zone */}
      <details
        className="card"
        style={{ marginTop: 12, padding: "10px 16px", cursor: "pointer" }}
      >
        <summary
          style={{
            fontWeight: 700,
            color: "var(--bad)",
            listStyle: "none",
            cursor: "pointer",
          }}
        >
          ⚠️ 危險操作（點擊展開）
        </summary>
        <div className="muted" style={{ fontSize: 13, marginTop: 8 }}>
          以下操作將永久刪除所有使用者的作答資料，無法復原。
        </div>
        <div style={{ marginTop: 12 }}>
          <ResetAllButton />
        </div>
      </details>
    </main>
  );
}

function NoAccess() {
  return (
    <main>
      <div className="topbar">
        <Link href="/" className="btn btn-ghost">
          ← 回首頁
        </Link>
        <span className="badge">後台統計</span>
      </div>
      <div className="card grid" style={{ textAlign: "center", padding: 32 }}>
        <strong>無權限</strong>
        <div className="muted" style={{ fontSize: 14 }}>
          這個頁面只開放指定管理者查看。
        </div>
      </div>
    </main>
  );
}
