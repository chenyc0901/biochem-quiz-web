"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import type { Question } from "@/lib/questions";

export type QuestionCardProps = {
  question: Question;
  totalCount: number;
  index: number;
  showSource?: boolean;
  pointsPerQuestion?: number;
  initialSelected?: string;
  initialSubmitted?: boolean;
  initialGuessed?: boolean;
  onSelect?: (questionId: string, selected: string) => void;
  onSubmitAnswer?: (
    questionId: string,
    selected: string,
    guessed: boolean,
  ) => void;
  onToggleGuessed?: (questionId: string, guessed: boolean) => void;
  examSeed?: string;
  examMode?: boolean;
  onPrev?: (() => void) | null;
  onNext?: (() => void) | null;
};

export default function QuestionCard({
  question,
  totalCount,
  index,
  showSource = true,
  pointsPerQuestion = 1.25,
  initialSelected = "",
  initialSubmitted = false,
  initialGuessed = false,
  onSelect,
  onSubmitAnswer,
  onToggleGuessed,
  examMode = false,
  onPrev,
  onNext,
}: QuestionCardProps) {
  const { data: session } = useSession();
  const [selected, setSelected] = useState(initialSelected);
  const [submitted, setSubmitted] = useState(initialSubmitted);
  const [guessed, setGuessed] = useState(initialGuessed);
  const [explainLoading, setExplainLoading] = useState(false);
  const [explainText, setExplainText] = useState("");
  const [explainSource, setExplainSource] = useState<string | null>(null);
  const [needLogin, setNeedLogin] = useState(false);

  useEffect(() => {
    setSelected(initialSelected || "");
    setSubmitted(!!initialSubmitted);
    setGuessed(!!initialGuessed);
    setExplainText("");
    setExplainSource(null);
  }, [question.id, initialSelected, initialSubmitted, initialGuessed]);

  const optionEntries = useMemo(
    () => Object.entries(question.options || {}) as [string, string][],
    [question],
  );
  const isCorrect = !!(selected && question.answer && selected === question.answer);

  const optionImages = (question.optionImages ?? {}) as Record<string, string>;

  async function fetchExplain() {
    if (!session?.user) {
      setNeedLogin(true);
      return;
    }
    setExplainLoading(true);
    setExplainText("");
    setExplainSource(null);
    const isWrong = selected && selected !== question.answer;
    const prompt = isWrong
      ? `你是生物化學與臨床生化學助教。請用繁體中文，針對學生答錯的這題做教學式解釋。

出處：${question.yearTerm} 第${question.questionNo}題
題目：${question.question}
A. ${question.options.A}
B. ${question.options.B}
C. ${question.options.C}
D. ${question.options.D}
正確答案：${question.answer || "（原始資料未提供）"}
修正答案附註：${question.correctionNote || "無"}

請輸出：
1. 正確答案
2. 為什麼對
3. 其他選項錯在哪
4. 這題在考什麼觀念
5. 給學生一句記憶重點`
      : `你是生物化學與臨床生化學助教。請用繁體中文說明正確答案。

出處：${question.yearTerm} 第${question.questionNo}題
題目：${question.question}
A. ${question.options.A}
B. ${question.options.B}
C. ${question.options.C}
D. ${question.options.D}
正確答案：${question.answer || "（未提供）"}

請輸出：
1. 正確答案
2. 為什麼對
3. 其他選項錯在哪
4. 這題在考什麼觀念
5. 給學生一句記憶重點`;
    try {
      const res = await fetch("/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, question, questionId: question.id }),
      });
      const json = await res.json();
      setExplainText(json.text || "目前沒有拿到 AI 回覆。");
      setExplainSource(json.source ?? null);
    } catch (e) {
      console.error(e);
      setExplainText("AI 解釋發生錯誤，請稍後再試。");
    } finally {
      setExplainLoading(false);
    }
  }

  return (
    <div className="card grid">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div className="row">
          {showSource && (
            <span className="badge">出處：{question.yearTerm}</span>
          )}
          <span className="badge">第 {question.questionNo} 題</span>
          <span className="badge">{pointsPerQuestion} 分</span>
        </div>
        <span className="muted">
          {index + 1} / {totalCount}
        </span>
      </div>

      <div style={{ fontSize: 18, lineHeight: 1.7 }}>{question.question}</div>

      {question.imageUrl && (
        <div className="card" style={{ padding: 12, background: "#fafafa" }}>
          <div className="muted" style={{ marginBottom: 8 }}>
            題目圖片
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={question.imageUrl}
            alt={`question-${question.id}`}
            style={{ width: "100%", height: "auto", borderRadius: 12 }}
          />
        </div>
      )}

      <div>
        {optionEntries.map(([key, text]) => {
          const cls = ["option"];
          if (selected === key) cls.push("selected");
          if (!examMode && submitted && question.answer === key)
            cls.push("correct");
          if (
            !examMode &&
            submitted &&
            selected === key &&
            question.answer !== key
          )
            cls.push("wrong");
          const optImg = optionImages?.[key];
          return (
            <button
              key={key}
              className={cls.join(" ")}
              onClick={() => {
                if (submitted) return;
                setSelected(key);
                onSelect?.(question.id, key);
                if (examMode) {
                  setSubmitted(true);
                  onSubmitAnswer?.(question.id, key, guessed);
                }
              }}
            >
              <div>
                <strong>{key}.</strong> {text || (optImg ? "" : "（空）")}
              </div>
              {optImg && (
                <div style={{ marginTop: 8 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={optImg}
                    alt={`option-${question.id}-${key}`}
                    style={{
                      maxWidth: "100%",
                      height: "auto",
                      borderRadius: 10,
                    }}
                  />
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="row" style={{ alignItems: "center" }}>
        {!examMode && (
          <button
            className="btn btn-primary"
            disabled={!selected || submitted}
            onClick={() => {
              setSubmitted(true);
              onSubmitAnswer?.(question.id, selected, guessed);
            }}
          >
            提交答案
          </button>
        )}
        {!examMode && onPrev && (
          <button className="btn btn-ghost" onClick={onPrev}>
            ← 上一題
          </button>
        )}
        {!examMode && onNext && (
          <button className="btn btn-ghost" onClick={onNext}>
            下一題 →
          </button>
        )}
        {!examMode && (
          <button
            className="btn btn-secondary"
            onClick={fetchExplain}
            disabled={!submitted || explainLoading}
          >
            {explainLoading ? "AI 解釋中…" : "AI 解釋這題"}
          </button>
        )}
        {!submitted && (
          <label
            title="勾選後即使選對也會收進錯題本"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              fontSize: 12,
              color: "var(--muted)",
              cursor: "pointer",
              marginLeft: "auto",
              padding: "4px 8px",
              border: "1px dashed var(--border)",
              borderRadius: 8,
              userSelect: "none",
            }}
          >
            <input
              type="checkbox"
              checked={guessed}
              onChange={(e) => {
                const next = e.target.checked;
                setGuessed(next);
                onToggleGuessed?.(question.id, next);
              }}
              style={{
                width: 14,
                height: 14,
                margin: 0,
                accentColor: "#f97316",
              }}
            />
            <span>🎲 猜的</span>
          </label>
        )}
        {submitted && guessed && (
          <span
            className="badge"
            style={{
              background: "#fef3c7",
              color: "#9a3412",
              fontSize: 11,
              marginLeft: "auto",
            }}
          >
            🎲 標記為猜的
          </span>
        )}
      </div>

      {needLogin && (
        <div
          style={{
            padding: 12,
            background: "#fef2f2",
            borderRadius: 10,
            fontSize: 14,
            color: "var(--bad)",
          }}
        >
          AI 解釋功能需要登入 Google 帳號才能使用。
          <a href="/login" style={{ color: "var(--primary)", marginLeft: 6 }}>
            前往登入
          </a>
        </div>
      )}

      {!examMode && submitted && (
        <div className="card" style={{ background: "#fafcff" }}>
          <div>
            <strong>你的答案：</strong>
            {selected || "未選"}
          </div>
          <div>
            <strong>正確答案：</strong>
            {question.answer || "原始 PDF 未提供"}
          </div>
          <div>
            <strong>判定：</strong>
            <span
              style={{ color: isCorrect ? "var(--good)" : "var(--bad)" }}
            >
              {isCorrect ? "答對" : "答錯"}
            </span>
          </div>
          <div>
            <strong>本題分數：</strong>
            {isCorrect ? pointsPerQuestion : 0}
          </div>
          {question.correctionNote && (
            <div>
              <strong>修正答案附註：</strong>
              {question.correctionNote}
            </div>
          )}
        </div>
      )}

      {examMode && submitted && (
        <div
          style={{
            padding: "8px 12px",
            background: "#1a1a1a",
            borderRadius: 8,
            fontSize: 13,
            color: "#94a3b8",
          }}
        >
          ✓ 已作答，繼續下一題
        </div>
      )}

      {explainText && (
        <div className="card" style={{ position: "relative" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 6,
            }}
          >
            <strong>AI 解釋</strong>
            {explainSource && (
              <span className="muted" style={{ fontSize: 12 }}>
                {explainSource === "curated"
                  ? "📚 已預先驗證"
                  : explainSource === "cache"
                    ? "💾 快取"
                    : "✨ 即時生成"}
              </span>
            )}
          </div>
          <pre className="explain">{explainText}</pre>
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              marginTop: 8,
            }}
          >
            <ReportThisQuestion question={question} />
          </div>
        </div>
      )}
    </div>
  );
}

function ReportThisQuestion({
  question,
}: {
  question: { id: string; yearTerm: string; questionNo: number };
}) {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [sentMsg, setSentMsg] = useState("");

  const send = async () => {
    if (!session?.user) {
      alert("回報問題需要先登入 Google 帳號。");
      return;
    }
    if (!content.trim()) return;
    setBusy(true);
    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: question.id,
          content: content.trim(),
        }),
      });
      if (res.ok) {
        setSentMsg("✓ 已送出回報，謝謝！");
        setContent("");
        setTimeout(() => {
          setSentMsg("");
          setOpen(false);
        }, 1800);
      } else {
        setSentMsg("送出失敗，請稍後再試");
      }
    } catch (e) {
      console.error(e);
      setSentMsg("送出失敗");
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn btn-ghost"
        style={{
          fontSize: 12,
          padding: "6px 12px",
          color: "var(--bad)",
          borderColor: "#fecaca",
        }}
      >
        🚩 回報問題
      </button>
    );
  }

  return (
    <div
      style={{
        width: "100%",
        background: "#fef2f2",
        border: "1px solid #fecaca",
        borderRadius: 10,
        padding: "10px 12px",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <strong style={{ fontSize: 13, color: "var(--bad)" }}>
          🚩 回報這題的問題
        </strong>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setContent("");
            setSentMsg("");
          }}
          className="btn btn-ghost"
          style={{ fontSize: 11, padding: "2px 8px" }}
        >
          取消
        </button>
      </div>
      <div className="muted" style={{ fontSize: 11 }}>
        {question.yearTerm} 第 {question.questionNo} 題
      </div>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={3}
        placeholder="例如：答案應該是 A 不是 B；題幹少了某個關鍵字…"
        style={{
          width: "100%",
          padding: "8px 10px",
          borderRadius: 8,
          border: "1px solid var(--border)",
          background: "#fff",
          fontSize: 13,
          fontFamily: "inherit",
          resize: "vertical",
        }}
      />
      <div
        style={{
          display: "flex",
          gap: 8,
          alignItems: "center",
          justifyContent: "flex-end",
        }}
      >
        {sentMsg && (
          <span
            style={{
              fontSize: 12,
              color: sentMsg.startsWith("✓") ? "var(--good)" : "var(--bad)",
            }}
          >
            {sentMsg}
          </span>
        )}
        <button
          type="button"
          onClick={send}
          disabled={busy || !content.trim()}
          className="btn btn-primary"
          style={{ fontSize: 12, padding: "6px 14px" }}
        >
          {busy ? "送出中…" : "送出回報"}
        </button>
      </div>
    </div>
  );
}
