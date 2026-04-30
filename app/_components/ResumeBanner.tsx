"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export default function ResumeBanner({
  seed,
  answered,
  lastAtIso,
}: {
  seed: string;
  answered: number;
  lastAtIso: string | null;
}) {
  const router = useRouter();
  const [busy, startTransition] = useTransition();
  const [hidden, setHidden] = useState(false);
  const [error, setError] = useState("");

  if (hidden) return null;

  const lastAtLabel = lastAtIso
    ? new Date(lastAtIso).toLocaleString("zh-TW", {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  const clear = () => {
    if (
      !confirm(
        `確定要清除這次未完成的練習嗎？已作答的 ${answered} 題會從紀錄中刪除（無法復原）。`,
      )
    )
      return;
    startTransition(async () => {
      try {
        const res = await fetch("/api/practice/clear", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ seed }),
        });
        if (!res.ok) {
          setError("清除失敗");
          return;
        }
        setHidden(true);
        router.refresh();
      } catch (e) {
        console.error(e);
        setError("清除失敗");
      }
    });
  };

  return (
    <div
      className="card"
      style={{
        marginBottom: 12,
        padding: "12px 16px",
        background: "#ecfeff",
        border: "1px solid #67e8f9",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        flexWrap: "wrap",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 24 }}>📌</span>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#0e7490" }}>
            繼續上次練習
          </div>
          <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
            已答 {answered} / 80 題
            {lastAtLabel ? ` · ${lastAtLabel}` : ""}
          </div>
          {error && (
            <div
              style={{ fontSize: 11, color: "var(--bad)", marginTop: 4 }}
            >
              {error}
            </div>
          )}
        </div>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <Link
          href={`/exam?seed=${seed}&mode=practice`}
          className="btn btn-primary"
          style={{
            fontSize: 13,
            padding: "8px 14px",
            background: "#0e7490",
          }}
        >
          繼續 →
        </Link>
        <button
          type="button"
          onClick={clear}
          disabled={busy}
          className="btn btn-ghost"
          title="清除這次未完成的練習"
          style={{
            fontSize: 13,
            padding: "8px 12px",
            color: "var(--bad)",
            borderColor: "#fecaca",
          }}
        >
          {busy ? "清除中…" : "清除"}
        </button>
      </div>
    </div>
  );
}
