"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { Question } from "@/lib/questions";
import QuestionCard from "../_components/QuestionCard";

type Mode = "practice" | "exam";
const POINTS_PER_QUESTION = 1.25;

export type Prefilled = {
  answers: Record<string, string>;
  guessed: Record<string, boolean>;
};

export default function ExamClient({
  seed,
  mode,
  questions,
  userEmail,
  prefilled,
}: {
  seed: string;
  mode: Mode;
  questions: Question[];
  userEmail: string;
  prefilled?: Prefilled;
}) {
  const isExam = mode === "exam";
  const [answers, setAnswers] = useState<Record<string, string>>(
    () => prefilled?.answers ?? {},
  );
  const [guessedMap, setGuessedMap] = useState<Record<string, boolean>>(
    () => prefilled?.guessed ?? {},
  );
  // In practice mode, prefilled answers are treated as already-submitted (locked + show feedback)
  const [submittedSet, setSubmittedSet] = useState<Set<string>>(
    () =>
      mode === "practice" && prefilled
        ? new Set(Object.keys(prefilled.answers))
        : new Set(),
  );
  const [current, setCurrent] = useState(() => {
    if (mode !== "practice" || !prefilled) return 0;
    // Resume from first unanswered question
    const firstUnanswered = questions.findIndex(
      (qq) => !prefilled.answers[qq.id],
    );
    return firstUnanswered === -1 ? 0 : firstUnanswered;
  });
  const [finished, setFinished] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [savingHint, setSavingHint] = useState<"saving" | "saved" | null>(
    null,
  );
  const savedHintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startedAtRef = useRef<number>(Date.now());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const total = questions.length;
  const q = questions[current];

  const score = useMemo(() => {
    let s = 0;
    for (const qq of questions)
      if (answers[qq.id] === qq.answer) s += POINTS_PER_QUESTION;
    return s;
  }, [answers, questions]);
  const correctCount = useMemo(
    () => questions.filter((qq) => answers[qq.id] === qq.answer).length,
    [answers, questions],
  );
  const answeredCount = useMemo(
    () => Object.values(answers).filter(Boolean).length,
    [answers],
  );
  const wrongQuestions = useMemo(
    () =>
      questions.filter(
        (qq) =>
          answers[qq.id] &&
          (answers[qq.id] !== qq.answer || guessedMap[qq.id]),
      ),
    [answers, guessedMap, questions],
  );
  const guessedCorrectCount = useMemo(
    () =>
      questions.filter(
        (qq) => guessedMap[qq.id] && answers[qq.id] === qq.answer,
      ).length,
    [answers, guessedMap, questions],
  );

  // Timer (exam mode runs always; practice mode also tracks)
  useEffect(() => {
    if (finished) return;
    if (!isExam) return;
    intervalRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000));
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isExam, finished]);

  const handleSelect = (qid: string, selected: string) => {
    // Fires on every option click — keeps progress bar in sync regardless of mode
    setAnswers((prev) => ({ ...prev, [qid]: selected }));
  };

  const showSavedHint = () => {
    setSavingHint("saved");
    if (savedHintTimerRef.current) clearTimeout(savedHintTimerRef.current);
    savedHintTimerRef.current = setTimeout(() => setSavingHint(null), 1800);
  };

  const handleSubmitAnswer = async (
    qid: string,
    selected: string,
    guessed: boolean,
  ) => {
    setAnswers((prev) => ({ ...prev, [qid]: selected }));
    setGuessedMap((prev) => ({ ...prev, [qid]: !!guessed }));
    setSubmittedSet((prev) => new Set(prev).add(qid));
    if (isExam) {
      setTimeout(() => {
        setCurrent((c) => Math.min(total - 1, c + 1));
      }, 350);
    } else {
      // Practice mode: persist immediately so user can resume
      const question = questions.find((qq) => qq.id === qid);
      if (!question || !userEmail) return;
      setSavingHint("saving");
      try {
        await fetch("/api/attempt-batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            attempts: [
              {
                questionId: qid,
                selectedAnswer: selected,
                correctAnswer: question.answer,
                examSeed: `p_${seed}`,
                guessed: guessed ? 1 : 0,
              },
            ],
          }),
        });
        showSavedHint();
      } catch (e) {
        console.error("autosave failed", e);
        setSavingHint(null);
      }
    }
  };

  const handleToggleGuessed = (qid: string, guessed: boolean) => {
    setGuessedMap((prev) => ({ ...prev, [qid]: guessed }));
  };

  const handleSubmitExam = async () => {
    if (finished) return;
    setFinished(true);
    const examSeed = isExam ? seed : `p_${seed}`;
    const elapsedSeconds = Math.floor(
      (Date.now() - startedAtRef.current) / 1000,
    );
    // Practice mode already auto-saved per question; only save unsaved ones (none expected)
    const toSave = isExam
      ? questions
          .filter((qq) => answers[qq.id])
          .map((qq) => ({
            questionId: qq.id,
            selectedAnswer: answers[qq.id],
            correctAnswer: qq.answer,
            examSeed,
            guessed: guessedMap[qq.id] ? 1 : 0,
          }))
      : questions
          .filter((qq) => answers[qq.id] && !submittedSet.has(qq.id))
          .map((qq) => ({
            questionId: qq.id,
            selectedAnswer: answers[qq.id],
            correctAnswer: qq.answer,
            examSeed,
            guessed: guessedMap[qq.id] ? 1 : 0,
          }));
    if (toSave.length > 0) {
      try {
        await fetch("/api/attempt-batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ attempts: toSave }),
        });
      } catch (e) {
        console.error("attempt-batch failed", e);
      }
    }
    if (isExam) {
      try {
        await fetch("/api/exam-finish", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ examSeed: seed, elapsedSeconds }),
        });
      } catch (e) {
        console.error("exam-finish failed", e);
      }
    }
  };

  if (!q) {
    return (
      <main>
        <div className="card grid">
          <p>沒有題目可顯示。</p>
          <Link href="/" className="btn btn-ghost">
            回首頁
          </Link>
        </div>
      </main>
    );
  }

  if (finished) {
    return (
      <ResultScreen
        seed={seed}
        mode={mode}
        questions={questions}
        answers={answers}
        guessedMap={guessedMap}
        score={score}
        correctCount={correctCount}
        guessedCorrectCount={guessedCorrectCount}
        wrongQuestions={wrongQuestions}
        elapsed={elapsed}
        userEmail={userEmail}
      />
    );
  }

  const formatTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  return (
    <main>
      <div className="topbar">
        <Link href="/" className="btn btn-ghost">
          ← 回首頁
        </Link>
        <div className="row">
          <span
            className="badge"
            style={
              isExam
                ? { background: "#7c3aed", color: "#fff" }
                : { background: "#0e7490", color: "#fff" }
            }
          >
            {isExam ? "🎯 考試" : "📝 練習"}
          </span>
          {isExam ? (
            <span
              style={{
                background: elapsed > 5400 ? "#7f1d1d" : "#1e1b4b",
                color: elapsed > 5400 ? "#fca5a5" : "#c4b5fd",
                fontVariantNumeric: "tabular-nums",
                letterSpacing: 2,
                fontSize: 20,
                fontWeight: 700,
                padding: "4px 14px",
                borderRadius: 10,
                border: `1px solid ${elapsed > 5400 ? "#ef4444" : "#7c3aed"}`,
                minWidth: 90,
                textAlign: "center",
              }}
            >
              ⏱ {formatTime(elapsed)}
            </span>
          ) : (
            <span className="badge">{score.toFixed(1)} 分</span>
          )}
        </div>
      </div>

      {!isExam && submittedSet.size > 0 && submittedSet.size < total && (
        <div
          className="card"
          style={{
            marginBottom: 12,
            padding: "10px 14px",
            background: "#ecfeff",
            border: "1px solid #67e8f9",
          }}
        >
          <div className="row" style={{ gap: 8, alignItems: "center" }}>
            <span style={{ fontSize: 18 }}>📌</span>
            <span style={{ fontSize: 13, color: "#0e7490", fontWeight: 600 }}>
              已從上次中斷處接續：第 {current + 1} / {total} 題
              · 已答 {submittedSet.size} 題
            </span>
          </div>
        </div>
      )}

      <div
        className="card"
        style={{ marginBottom: 12, padding: "10px 16px" }}
      >
        <div
          className="row"
          style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}
        >
          <div
            className="row"
            style={{ gap: 10, alignItems: "center", flex: 1, minWidth: 0 }}
          >
            <div className="muted" style={{ fontSize: 13 }}>
              {isExam
                ? "選完自動跳下一題，交卷後才顯示成績"
                : "每題作答後即時顯示對錯，會自動儲存"}
            </div>
            {!isExam && savingHint && (
              <span
                style={{
                  fontSize: 11,
                  color: savingHint === "saved" ? "var(--good)" : "var(--muted)",
                  whiteSpace: "nowrap",
                }}
              >
                {savingHint === "saving" ? "💾 儲存中…" : "✓ 已儲存"}
              </span>
            )}
          </div>
          <button
            className="btn btn-primary"
            style={{ background: "#dc2626", borderColor: "#dc2626" }}
            onClick={handleSubmitExam}
          >
            交卷
          </button>
        </div>
      </div>

      <QuestionCard
        key={q.id}
        question={q}
        totalCount={total}
        index={current}
        showSource
        pointsPerQuestion={POINTS_PER_QUESTION}
        initialSelected={answers[q.id] || ""}
        initialSubmitted={!isExam && submittedSet.has(q.id)}
        initialGuessed={!!guessedMap[q.id]}
        onSelect={handleSelect}
        onSubmitAnswer={handleSubmitAnswer}
        onToggleGuessed={handleToggleGuessed}
        examSeed={isExam ? seed : `p_${seed}`}
        examMode={isExam}
        onPrev={current > 0 ? () => setCurrent(current - 1) : null}
        onNext={current < total - 1 ? () => setCurrent(current + 1) : null}
      />

      <div style={{ height: 12 }} />

      <div className="card grid">
        <div
          className="row"
          style={{ justifyContent: "space-between", alignItems: "center" }}
        >
          <strong style={{ fontSize: 13 }}>快速跳題</strong>
          <span className="muted" style={{ fontSize: 12 }}>
            已答 {answeredCount} / {total}
          </span>
        </div>
        <div className="row" style={{ alignItems: "center", gap: 8 }}>
          <button
            className="btn btn-ghost"
            style={{ padding: "8px 12px" }}
            onClick={() => setCurrent((c) => Math.max(0, c - 1))}
            disabled={current === 0}
          >
            ←
          </button>
          <select
            value={current}
            onChange={(e) => setCurrent(Number(e.target.value))}
            style={{
              flex: 1,
              padding: "8px 12px",
              borderRadius: 10,
              border: "1px solid var(--border)",
              background: "#fff",
              color: "var(--text)",
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            {questions.map((qq, i) => {
              const ua = answers[qq.id];
              let prefix: string;
              if (isExam) {
                // Exam mode: hide correctness, just show "answered" vs "not"
                prefix = ua ? "●" : "○";
              } else {
                const wrong = !!(ua && qq.answer && ua !== qq.answer);
                prefix = wrong ? "❌" : ua ? "✅" : "○";
              }
              return (
                <option key={qq.id} value={i}>
                  {prefix} 第 {i + 1} 題（{qq.yearTerm}）
                </option>
              );
            })}
          </select>
          <button
            className="btn btn-ghost"
            style={{ padding: "8px 12px" }}
            onClick={() => setCurrent((c) => Math.min(total - 1, c + 1))}
            disabled={current === total - 1}
          >
            →
          </button>
        </div>
      </div>

      <div
        className="muted"
        style={{ fontSize: 11, textAlign: "center", marginTop: 12 }}
      >
        登入身分：{userEmail}
      </div>
    </main>
  );
}

function ResultScreen({
  seed,
  mode,
  questions,
  answers,
  guessedMap,
  score,
  correctCount,
  guessedCorrectCount,
  wrongQuestions,
  elapsed,
  userEmail,
}: {
  seed: string;
  mode: Mode;
  questions: Question[];
  answers: Record<string, string>;
  guessedMap: Record<string, boolean>;
  score: number;
  correctCount: number;
  guessedCorrectCount: number;
  wrongQuestions: Question[];
  elapsed: number;
  userEmail: string;
}) {
  const isExam = mode === "exam";
  const total = questions.length;
  const answered = Object.values(answers).filter(Boolean).length;
  const unanswered = total - answered;
  const wrongCount = wrongQuestions.length;
  const formatTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  return (
    <main>
      <div className="topbar">
        <Link href="/" className="btn btn-ghost">
          ← 回首頁
        </Link>
        <span className="badge">卷 ID：{seed}</span>
      </div>

      <div className="result-card">
        <div className="result-score">{score.toFixed(1)}</div>
        <div className="result-label">/ 100 分</div>
        {isExam && (
          <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 8 }}>
            ⏱ 作答時間：{formatTime(elapsed)}
          </div>
        )}
        <div className="result-stats">
          <div className="result-stat">
            <span className="result-stat-num" style={{ color: "#4ade80" }}>
              {correctCount}
            </span>
            <span className="result-stat-label">答對</span>
          </div>
          <div className="result-stat">
            <span className="result-stat-num" style={{ color: "#f87171" }}>
              {wrongCount}
            </span>
            <span className="result-stat-label">答錯</span>
          </div>
          <div className="result-stat">
            <span className="result-stat-num" style={{ color: "#94a3b8" }}>
              {unanswered}
            </span>
            <span className="result-stat-label">未答</span>
          </div>
        </div>
      </div>

      <div className="card grid">
        <strong>
          ❌ 錯題列表（{wrongCount} 題
          {guessedCorrectCount > 0
            ? ` · 含 ${guessedCorrectCount} 題猜對`
            : ""}
          ）
        </strong>
        {wrongCount === 0 ? (
          <div
            style={{ textAlign: "center", padding: "16px 0", color: "#4ade80" }}
          >
            🎉 全部答對！
          </div>
        ) : (
          wrongQuestions.map((qq, i) => (
            <QuestionCard
              key={qq.id}
              question={qq}
              totalCount={wrongCount}
              index={i}
              showSource
              pointsPerQuestion={POINTS_PER_QUESTION}
              initialSelected={answers[qq.id] || ""}
              initialSubmitted={true}
              initialGuessed={!!guessedMap[qq.id]}
              examMode={false}
            />
          ))
        )}
      </div>

      <div className="row" style={{ justifyContent: "center", marginTop: 16, gap: 8 }}>
        <Link href="/history" className="btn btn-ghost">
          📊 查看歷史
        </Link>
        <Link href="/wrong-questions" className="btn btn-ghost">
          ❌ 錯題集
        </Link>
        <Link href="/" className="btn btn-primary">
          再來一次
        </Link>
      </div>

      <div
        className="muted"
        style={{ fontSize: 11, textAlign: "center", marginTop: 12 }}
      >
        登入身分：{userEmail}
      </div>
    </main>
  );
}
