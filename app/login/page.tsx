import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import LoginButton from "./login-button";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/");

  return (
    <main>
      <div className="topbar">
        <Link className="btn btn-ghost" href="/">
          ← 回首頁
        </Link>
      </div>
      <div
        className="card grid"
        style={{ textAlign: "center", padding: 32 }}
      >
        <h2 style={{ margin: 0 }}>登入</h2>
        <div className="muted" style={{ fontSize: 14 }}>
          登入後可使用 AI 解釋功能及歷史紀錄
        </div>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <LoginButton />
        </div>
      </div>
    </main>
  );
}
