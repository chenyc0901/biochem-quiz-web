import Link from "next/link";
import { auth, signOut } from "@/auth";
import { generateSeed } from "@/lib/questions";
import { isAdminEmail } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import ResumeBanner from "./_components/ResumeBanner";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await auth();
  const email = session?.user?.email ?? null;
  const seed = generateSeed();

  // Look for an in-progress practice session to offer "resume"
  let resume:
    | { seed: string; answered: number; lastAt: Date | null }
    | null = null;
  if (email) {
    const recent = await prisma.attempts.groupBy({
      by: ["exam_seed"],
      where: { user_email: email, exam_seed: { startsWith: "p_" } },
      _count: { _all: true },
      _max: { created_at: true },
      orderBy: { _max: { created_at: "desc" } },
      take: 5,
    });
    const unfinished = recent.find(
      (r) => r._count._all > 0 && r._count._all < 80,
    );
    if (unfinished?.exam_seed) {
      resume = {
        seed: unfinished.exam_seed.replace(/^p_/, ""),
        answered: unfinished._count._all,
        lastAt: unfinished._max.created_at,
      };
    }
  }

  return (
    <main>
      <div className="topbar">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 18 }}>中國醫藥大學-醫技系</h1>
            <div style={{ fontSize: 14, fontWeight: 600, marginTop: 2 }}>
              臨床生化／生化國考題庫練習
            </div>
          </div>
        </div>
        {email ? (
          <div
            className="row"
            style={{ gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}
          >
            <Link
              className="btn btn-ghost"
              href="/history"
              style={{ fontSize: 13, padding: "8px 12px" }}
            >
              📊 作答紀錄
            </Link>
            <Link
              className="btn btn-ghost"
              href="/wrong-questions"
              style={{ fontSize: 13, padding: "8px 12px" }}
            >
              ❌ 錯題練習
            </Link>
            {isAdminEmail(email) && (
              <Link
                className="btn btn-ghost"
                href="/admin"
                style={{
                  fontSize: 13,
                  padding: "8px 12px",
                  borderColor: "#7c3aed44",
                }}
              >
                ⚙️ 後台
              </Link>
            )}
            <span
              className="muted"
              style={{
                fontSize: 11,
                maxWidth: 160,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
              title={email}
            >
              {email}
            </span>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
            >
              <button
                type="submit"
                className="btn btn-ghost"
                style={{ fontSize: 13, padding: "8px 12px" }}
              >
                登出
              </button>
            </form>
          </div>
        ) : (
          <Link className="btn btn-secondary" href="/login">
            Google 登入
          </Link>
        )}
      </div>

      {resume && (
        <ResumeBanner
          seed={resume.seed}
          answered={resume.answered}
          lastAtIso={resume.lastAt ? resume.lastAt.toISOString() : null}
        />
      )}

      <div className="card grid">
        <div className="mode-cards">
          <div className="mode-card">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div className="mode-title" style={{ lineHeight: 1 }}>
                練習模式
              </div>
              <span className="mode-icon">📝</span>
            </div>
            <ul className="mode-list">
              <li>作答後立即顯示對錯</li>
              <li>可隨時跳題複習</li>
              <li>顯示修正附註</li>
              <li>可使用 AI 解釋功能</li>
            </ul>
            <Link
              className="btn btn-primary"
              style={{ width: "100%", textAlign: "center" }}
              href={`/exam?seed=${seed}&mode=practice`}
            >
              練習模式
            </Link>
          </div>
          <div className="mode-card mode-card-exam">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div className="mode-title" style={{ lineHeight: 1 }}>
                考試模式
              </div>
              <span className="mode-icon">🎯</span>
            </div>
            <ul className="mode-list">
              <li>選完自動跳下一題</li>
              <li>不顯示即時對錯</li>
              <li>交卷後才顯示成績</li>
              <li>模擬真實考試情境</li>
            </ul>
            <Link
              className="btn btn-exam"
              style={{ width: "100%", textAlign: "center" }}
              href={`/exam?seed=${seed}&mode=exam`}
            >
              考試模式
            </Link>
          </div>
        </div>
      </div>

    </main>
  );
}
