"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function HistoryReset() {
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function handle() {
    if (!confirm("確定要清除所有作答紀錄嗎？此動作無法復原。")) return;
    setBusy(true);
    try {
      await fetch("/api/history/reset", { method: "POST" });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      className="btn btn-ghost"
      style={{
        fontSize: 13,
        color: "var(--bad)",
        borderColor: "#f8717133",
        padding: "8px 12px",
      }}
      onClick={handle}
      disabled={busy}
    >
      {busy ? "清除中…" : "清除紀錄"}
    </button>
  );
}
