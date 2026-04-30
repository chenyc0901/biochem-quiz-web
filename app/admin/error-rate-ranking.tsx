"use client";

import { useState } from "react";

const OPTION_KEYS = ["A", "B", "C", "D"] as const;

export type RankedItem = {
  questionId: string;
  total: number;
  correct: number;
  errorRate: number;
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

export default function ErrorRateRanking({ items }: { items: RankedItem[] }) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  if (items.length === 0) {
    return (
      <div
        className="muted"
        style={{ textAlign: "center", padding: "24px 0" }}
      >
        還沒有足夠資料
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {items.map((r) => {
        const wrong = r.total - r.correct;
        const errorPct = Math.round(r.errorRate * 100);
        const open = !!expanded[r.questionId];
        const q = r.question;
        return (
          <div
            key={r.questionId}
            style={{ borderTop: "1px solid var(--border)" }}
          >
            <button
              type="button"
              onClick={() =>
                setExpanded((s) => ({
                  ...s,
                  [r.questionId]: !s[r.questionId],
                }))
              }
              style={{
                width: "100%",
                background: "none",
                border: "none",
                padding: "12px 0",
                cursor: q ? "pointer" : "default",
                display: "flex",
                flexDirection: "column",
                gap: 6,
                textAlign: "left",
              }}
              disabled={!q}
            >
              {q ? (
                <>
                  <div
                    style={{
                      display: "flex",
                      gap: 6,
                      flexWrap: "wrap",
                      alignItems: "center",
                    }}
                  >
                    <span className="badge">{q.yearTerm}</span>
                    <span className="badge">第 {q.questionNo} 題</span>
                    <span
                      className="badge"
                      style={{
                        background: "#fef2f2",
                        color: "var(--bad)",
                        fontWeight: 700,
                      }}
                    >
                      錯誤率 {errorPct}%
                    </span>
                    <span
                      className="badge"
                      style={{ background: "#fff7ed", color: "#9a3412" }}
                    >
                      錯 {wrong} 次 / 共 {r.total} 次
                    </span>
                    <div style={{ flex: 1 }} />
                    <span
                      className="muted"
                      style={{ fontSize: 14 }}
                    >
                      {open ? "▲" : "▼"}
                    </span>
                  </div>
                  <div
                    style={{ fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-wrap" }}
                  >
                    {q.question}
                  </div>
                </>
              ) : (
                <span className="muted" style={{ fontSize: 12 }}>
                  （題目已不存在於目前題庫）· 錯誤率 {errorPct}% · 錯{" "}
                  {wrong} 次 / 共 {r.total} 次
                </span>
              )}
            </button>

            {q && open && (
              <div
                style={{
                  paddingBottom: 14,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                {/* Options */}
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

                {r.curated ? (
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
                      <strong style={{ color: "#1d4ed8" }}>
                        📚 已預先驗證解析
                      </strong>
                      {r.curated.sourceText && (
                        <span
                          className="muted"
                          style={{ fontSize: 11 }}
                        >
                          {r.curated.sourceText}
                        </span>
                      )}
                    </div>
                    {r.curated.answerText && (
                      <div>
                        <strong>正確答案：</strong>
                        {r.curated.answerText}
                      </div>
                    )}
                    {r.curated.reasonText && (
                      <div>
                        <strong>為什麼對：</strong>
                        {r.curated.reasonText}
                      </div>
                    )}
                    {r.curated.wrongOptionsText && (
                      <div>
                        <strong>其他選項錯在哪：</strong>
                        <div style={{ whiteSpace: "pre-wrap" }}>
                          {r.curated.wrongOptionsText}
                        </div>
                      </div>
                    )}
                    {r.curated.keyPointText && (
                      <div>
                        <strong>重點觀念：</strong>
                        {r.curated.keyPointText}
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
          </div>
        );
      })}
    </div>
  );
}
