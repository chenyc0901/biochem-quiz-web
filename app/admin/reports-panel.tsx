"use client";

import { useState, useTransition, useMemo } from "react";

export type ReportForClient = {
  id: string;
  content: string;
  userEmail: string | null;
  createdAt: string | null;
  question: {
    yearTerm: string;
    questionNo: number;
    question: string;
    options: { A: string; B: string; C: string; D: string };
    answer: string;
    correctionNote: string;
  } | null;
  curated: {
    answerText: string | null;
    reasonText: string | null;
    wrongOptionsText: string | null;
    keyPointText: string | null;
    sourceText: string | null;
    status: string | null;
  } | null;
};

const OPTION_KEYS = ["A", "B", "C", "D"] as const;


export default function ReportsPanel({
  initialReports,
}: {
  initialReports: ReportForClient[];
}) {
  const [reports, setReports] = useState(initialReports);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState("");
  const [filter, setFilter] = useState("");

  const visible = useMemo(() => {
    if (!filter.trim()) return reports;
    const k = filter.trim().toLowerCase();
    return reports.filter(
      (r) =>
        r.content.toLowerCase().includes(k) ||
        (r.userEmail ?? "").toLowerCase().includes(k) ||
        (r.question?.question ?? "").toLowerCase().includes(k),
    );
  }, [reports, filter]);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const callDelete = async (ids: string[]) => {
    const res = await fetch("/api/admin/delete-reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
    if (!res.ok) {
      setMsg("刪除失敗");
      return false;
    }
    return true;
  };

  const removeOne = (id: string) =>
    startTransition(async () => {
      if (await callDelete([id])) {
        setReports((rs) => rs.filter((r) => r.id !== id));
        setSelected((s) => {
          const next = new Set(s);
          next.delete(id);
          return next;
        });
        setMsg("已刪除");
      }
    });

  const removeSelected = () => {
    if (!selected.size) return;
    if (!confirm(`確定要刪除選取的 ${selected.size} 筆回報？`)) return;
    startTransition(async () => {
      const ids = [...selected];
      if (await callDelete(ids)) {
        setReports((rs) => rs.filter((r) => !selected.has(r.id)));
        setSelected(new Set());
        setMsg(`已刪除 ${ids.length} 筆`);
      }
    });
  };

  const clearAll = () => {
    if (!reports.length) return;
    if (
      !confirm(`確定要清除全部 ${reports.length} 筆回報？此操作無法復原。`)
    )
      return;
    startTransition(async () => {
      const res = await fetch("/api/admin/clear-reports", { method: "POST" });
      if (res.ok) {
        setReports([]);
        setSelected(new Set());
        setMsg("已清除全部回報");
      } else {
        setMsg("操作失敗");
      }
    });
  };

  return (
    <div>
      {/* Action bar */}
      <div
        className="row"
        style={{
          gap: 8,
          flexWrap: "wrap",
          alignItems: "center",
          marginBottom: 8,
        }}
      >
        <input
          type="text"
          placeholder="搜尋回報內容、題目、Email…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{
            flex: "1 1 200px",
            padding: "6px 10px",
            borderRadius: 8,
            border: "1px solid var(--border)",
            background: "#fff",
            fontSize: 13,
          }}
        />
        {visible.length > 0 && (
          <button
            type="button"
            className="btn btn-ghost"
            style={{ fontSize: 12, padding: "6px 10px" }}
            onClick={() =>
              setSelected((s) =>
                s.size === visible.length
                  ? new Set()
                  : new Set(visible.map((r) => r.id)),
              )
            }
          >
            {selected.size === visible.length && visible.length > 0
              ? "取消全選"
              : "全選"}
          </button>
        )}
        {selected.size > 0 && (
          <button
            className="btn"
            style={{ background: "#f97316", color: "#fff", fontSize: 12, padding: "6px 12px" }}
            onClick={removeSelected}
            disabled={isPending}
          >
            刪除選取（{selected.size}）
          </button>
        )}
        <button
          className="btn"
          style={{ background: "#dc2626", color: "#fff", fontSize: 12, padding: "6px 12px" }}
          onClick={clearAll}
          disabled={isPending || reports.length === 0}
        >
          清除全部
        </button>
        {msg && (
          <span style={{ fontSize: 12, color: "var(--good)" }}>{msg}</span>
        )}
      </div>

      {visible.length === 0 ? (
        <div
          style={{
            color: "var(--muted)",
            textAlign: "center",
            padding: "24px 0",
            fontSize: 13,
          }}
        >
          {reports.length === 0 ? "目前沒有回報" : "沒有符合條件的回報"}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {visible.map((r) => (
            <ReportCard
              key={r.id}
              report={r}
              selected={selected.has(r.id)}
              onToggle={() => toggle(r.id)}
              onDelete={() => removeOne(r.id)}
              busy={isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ReportCard({
  report,
  selected,
  onToggle,
  onDelete,
  busy,
}: {
  report: ReportForClient;
  selected: boolean;
  onToggle: () => void;
  onDelete: () => void;
  busy: boolean;
}) {
  const [open, setOpen] = useState(false);
  const q = report.question;
  const c = report.curated;
  const date = report.createdAt
    ? new Date(report.createdAt).toLocaleString("zh-TW", {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

  return (
    <div
      style={{
        border: selected ? "2px solid #f97316" : "1px solid var(--border)",
        background: selected ? "#fff7ed" : "#fff",
        borderRadius: 12,
        padding: "12px 14px",
        display: "flex",
        gap: 12,
        alignItems: "flex-start",
      }}
    >
      <input
        type="checkbox"
        checked={selected}
        onChange={onToggle}
        style={{ marginTop: 4, width: 16, height: 16, accentColor: "#f97316" }}
      />

      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          {q ? (
            <>
              <span className="badge">出處：{q.yearTerm}</span>
              <span className="badge">第 {q.questionNo} 題</span>
              <span
                className="badge"
                style={{ background: "#dcfce7", color: "#15803d" }}
              >
                正解：{q.answer}
              </span>
            </>
          ) : (
            <span className="muted" style={{ fontSize: 11 }}>
              （題目資訊已不在題庫中）
            </span>
          )}
          <div style={{ flex: 1 }} />
          <span className="muted" style={{ fontSize: 11 }}>
            {report.userEmail ?? "匿名"} · {date}
          </span>
        </div>

        {/* Report content */}
        <div
          style={{
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: 8,
            padding: "10px 12px",
          }}
        >
          <div
            style={{
              fontSize: 11,
              color: "var(--bad)",
              fontWeight: 700,
              marginBottom: 4,
            }}
          >
            🚩 回報內容
          </div>
          <div
            style={{
              fontSize: 14,
              lineHeight: 1.6,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {report.content}
          </div>
        </div>

        {/* Expand / collapse question detail */}
        {q && (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="btn btn-ghost"
            style={{
              fontSize: 12,
              padding: "6px 12px",
              alignSelf: "flex-start",
            }}
          >
            {open ? "▲ 收合題目" : "▼ 展開完整題目"}
          </button>
        )}

        {q && open && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              borderTop: "1px dashed var(--border)",
              paddingTop: 10,
            }}
          >
            <div
              style={{
                fontSize: 14,
                lineHeight: 1.6,
                background: "#f9fafb",
                padding: "8px 10px",
                borderRadius: 8,
                borderLeft: "3px solid var(--primary)",
                whiteSpace: "pre-wrap",
              }}
            >
              {q.question}
            </div>

            <div style={{ display: "grid", gap: 4, fontSize: 13 }}>
              {OPTION_KEYS.map((k) => {
                const isCorrect = q.answer === k;
                return (
                  <div
                    key={k}
                    style={{
                      padding: "6px 10px",
                      borderRadius: 6,
                      background: isCorrect ? "#f0fdf4" : "#f9fafb",
                      border: isCorrect
                        ? "1px solid #86efac"
                        : "1px solid #f3f4f6",
                      color: isCorrect ? "#15803d" : "var(--text)",
                      fontWeight: isCorrect ? 600 : 400,
                    }}
                  >
                    <strong>{k}.</strong> {q.options[k] || "（空）"}
                    {isCorrect && (
                      <span style={{ marginLeft: 6, fontSize: 11 }}>
                        ✓ 正解
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {q.correctionNote && (
              <div
                style={{
                  fontSize: 12,
                  background: "#fef9c3",
                  borderLeft: "3px solid #eab308",
                  padding: "6px 10px",
                  borderRadius: 6,
                }}
              >
                📝 修正附註：{q.correctionNote}
              </div>
            )}

            {c ? (
              <div
                style={{
                  background: "#eff6ff",
                  border: "1px solid #bfdbfe",
                  borderRadius: 8,
                  padding: "10px 12px",
                  fontSize: 13,
                  lineHeight: 1.7,
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <strong style={{ color: "#1d4ed8" }}>📚 已預先驗證解析</strong>
                  {c.sourceText && (
                    <span className="muted" style={{ fontSize: 11 }}>
                      {c.sourceText}
                    </span>
                  )}
                </div>
                {c.answerText && (
                  <div>
                    <strong>正確答案：</strong>
                    {c.answerText}
                  </div>
                )}
                {c.reasonText && (
                  <div>
                    <strong>為什麼對：</strong>
                    {c.reasonText}
                  </div>
                )}
                {c.wrongOptionsText && (
                  <div>
                    <strong>其他選項錯在哪：</strong>
                    <div style={{ whiteSpace: "pre-wrap" }}>
                      {c.wrongOptionsText}
                    </div>
                  </div>
                )}
                {c.keyPointText && (
                  <div>
                    <strong>重點觀念：</strong>
                    {c.keyPointText}
                  </div>
                )}
              </div>
            ) : (
              <div
                className="muted"
                style={{
                  fontSize: 12,
                  padding: "8px 10px",
                  background: "#f9fafb",
                  borderRadius: 6,
                }}
              >
                （這題尚無預先生成的解析）
              </div>
            )}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            type="button"
            className="btn btn-ghost"
            style={{
              fontSize: 12,
              color: "#dc2626",
              padding: "4px 12px",
              borderColor: "#fecaca",
            }}
            onClick={() => {
              if (confirm("刪除這筆回報？")) onDelete();
            }}
            disabled={busy}
          >
            刪除
          </button>
        </div>
      </div>
    </div>
  );
}
