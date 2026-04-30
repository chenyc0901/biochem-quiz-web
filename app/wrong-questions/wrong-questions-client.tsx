"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import QuestionCard from "../_components/QuestionCard";
import type { WrongItem } from "./page";

export default function WrongQuestionsClient({
  questions,
}: {
  questions: WrongItem[];
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [, setSelections] = useState<Record<string, string>>({});
  const router = useRouter();

  const reset = async () => {
    if (!confirm("確定要清除錯題紀錄嗎？")) return;
    await fetch("/api/wrong-questions/reset", { method: "POST" });
    router.refresh();
  };

  if (questions.length === 0) {
    return (
      <div className="card grid" style={{ textAlign: "center", padding: 32 }}>
        <div style={{ fontSize: 36, marginBottom: 8 }}>🎉</div>
        <strong>目前沒有錯題！</strong>
        <div className="muted" style={{ fontSize: 14 }}>
          繼續保持，或完成更多練習後再來複習
        </div>
      </div>
    );
  }

  const totalPureWrong = questions.reduce(
    (n, q) => n + q.stats.pureWrong,
    0,
  );
  const totalGuessed = questions.reduce((n, q) => n + q.stats.guessed, 0);

  return (
    <div className="grid">
      <div
        className="card"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "12px 16px",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <div className="row" style={{ gap: 20 }}>
          <div style={{ textAlign: "center" }}>
            <div
              style={{ fontSize: 22, fontWeight: 700, color: "var(--bad)" }}
            >
              {questions.length}
            </div>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>
              收錄題數
            </div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div
              style={{ fontSize: 22, fontWeight: 700, color: "#f97316" }}
            >
              {totalPureWrong}
            </div>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>
              答錯次數
            </div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div
              style={{ fontSize: 22, fontWeight: 700, color: "#9a3412" }}
            >
              {totalGuessed}
            </div>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>
              🎲 猜的次數
            </div>
          </div>
        </div>
        <button
          className="btn btn-ghost"
          style={{
            fontSize: 13,
            color: "var(--bad)",
            borderColor: "#f8717133",
          }}
          onClick={reset}
        >
          清除錯題
        </button>
      </div>

      {questions.map((q, i) => {
        const open = !!expanded[q.id];
        return (
          <div
            key={q.id}
            className="card grid"
            style={{ padding: 0, overflow: "hidden" }}
          >
            <button
              style={{
                width: "100%",
                textAlign: "left",
                background: "none",
                border: "none",
                padding: "14px 16px",
                cursor: "pointer",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 12,
              }}
              onClick={() =>
                setExpanded((s) => ({ ...s, [q.id]: !s[q.id] }))
              }
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 4,
                    flexWrap: "wrap",
                  }}
                >
                  <span className="badge">{q.yearTerm}</span>
                  <span className="badge">第 {q.questionNo} 題</span>
                  {q.stats.pureWrong > 0 && (
                    <span
                      style={{
                        fontSize: 12,
                        color: "var(--bad)",
                        fontWeight: 600,
                      }}
                    >
                      答錯 {q.stats.pureWrong} 次
                    </span>
                  )}
                  {q.stats.guessed > 0 && (
                    <span
                      style={{
                        fontSize: 12,
                        color: "#9a3412",
                        fontWeight: 600,
                      }}
                    >
                      🎲 猜 {q.stats.guessed} 次
                    </span>
                  )}
                  <span
                    style={{ fontSize: 11, color: "var(--muted)" }}
                  >
                    共 {q.stats.total} 次
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 14,
                    color: "var(--text)",
                    lineHeight: 1.5,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {q.question}
                </div>
              </div>
              <span
                style={{
                  fontSize: 18,
                  color: "var(--muted)",
                  flexShrink: 0,
                  marginTop: 2,
                }}
              >
                {open ? "▲" : "▼"}
              </span>
            </button>

            {open && (
              <div style={{ borderTop: "1px solid var(--border)" }}>
                <QuestionCard
                  question={q}
                  totalCount={questions.length}
                  index={i}
                  showSource
                  pointsPerQuestion={1.25}
                  initialSelected=""
                  initialSubmitted={false}
                  onSubmitAnswer={(qid, sel) =>
                    setSelections((prev) => ({ ...prev, [qid]: sel }))
                  }
                  onToggleGuessed={() => {}}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
