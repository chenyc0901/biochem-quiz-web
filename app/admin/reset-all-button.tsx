"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ResetAllButton() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const router = useRouter();

  const reset = async () => {
    if (
      !confirm(
        "‼️ 將刪除全站所有使用者的作答與考試紀錄，無法復原。確定要繼續？",
      )
    )
      return;
    if (!confirm("再次確認：這會清空所有人的歷史。真的要繼續嗎？")) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/reset-all", { method: "POST" });
      const json = await res.json();
      setMsg(
        `已刪除 ${json.attemptsDeleted ?? 0} 筆作答 + ${json.sessionsDeleted ?? 0} 場考試。`,
      );
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="row" style={{ alignItems: "center" }}>
      <button
        className="btn"
        style={{ background: "#7f1d1d", color: "#fff", fontSize: 13 }}
        onClick={reset}
        disabled={busy}
      >
        重置全站作答資料
      </button>
      {msg && (
        <span style={{ fontSize: 12, color: "var(--muted)" }}>{msg}</span>
      )}
    </div>
  );
}
