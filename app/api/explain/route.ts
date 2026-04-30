import { NextResponse } from "next/server";
import OpenAI from "openai";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getQuestionById, type Question } from "@/lib/questions";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

function formatStructuredExplanation(qe: {
  answer_text: string | null;
  reason_text: string | null;
  wrong_options_text: string | null;
  key_point_text: string | null;
  source_text: string | null;
}): string {
  const parts: string[] = [];
  if (qe.answer_text) parts.push(`【正確答案】\n${qe.answer_text}`);
  if (qe.reason_text) parts.push(`【為什麼對】\n${qe.reason_text}`);
  if (qe.wrong_options_text) parts.push(`【其他選項錯在哪】\n${qe.wrong_options_text}`);
  if (qe.key_point_text) parts.push(`【重點觀念】\n${qe.key_point_text}`);
  if (qe.source_text) parts.push(`— ${qe.source_text}`);
  return parts.join("\n\n");
}

export async function POST(req: Request) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  // Accept both legacy contract (prompt + question) and new (questionId)
  const questionFromClient: Partial<Question> | undefined = body?.question;
  const questionId: string | undefined =
    body?.questionId ?? questionFromClient?.id;
  const promptFromClient: string | undefined = body?.prompt;

  if (!questionId) {
    return NextResponse.json({ error: "questionId required" }, { status: 400 });
  }

  // 1. Try curated/pre-generated explanation first (the 1360-row table)
  const curated = await prisma.question_explanations.findUnique({
    where: { question_id: questionId },
  });
  if (
    curated &&
    curated.status !== "draft" &&
    (curated.reason_text || curated.answer_text)
  ) {
    return NextResponse.json({
      text: formatStructuredExplanation(curated),
      source: "curated",
    });
  }

  // 2. Try AI-cached explanation
  const cached = await prisma.ai_explanations.findUnique({
    where: { question_id: questionId },
  });
  if (cached?.response_text) {
    return NextResponse.json({ text: cached.response_text, source: "cache" });
  }

  // 3. Fall back to live OpenAI call
  const q = getQuestionById(questionId);
  if (!q && !questionFromClient) {
    return NextResponse.json({ error: "Question not found" }, { status: 404 });
  }
  const ref = q ?? (questionFromClient as Question);

  const prompt =
    promptFromClient ??
    `你是生物化學與臨床生化學助教。請用繁體中文，針對學生答錯的這題做教學式解釋。

出處：${ref.yearTerm} 第${ref.questionNo}題
題目：${ref.question}
A. ${ref.options.A}
B. ${ref.options.B}
C. ${ref.options.C}
D. ${ref.options.D}
正確答案：${ref.answer || "（原始資料未提供）"}
修正答案附註：${ref.correctionNote || "無"}

請輸出：
1. 正確答案
2. 為什麼對
3. 其他選項錯在哪
4. 這題在考什麼觀念
5. 給學生一句記憶重點`;

  let text = "";
  try {
    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 800,
    });
    text = completion.choices[0]?.message?.content ?? "";
  } catch (e) {
    console.error("openai error", e);
    return NextResponse.json(
      { error: "AI 服務暫時無法使用，請稍後再試。" },
      { status: 502 },
    );
  }

  if (text) {
    await prisma.ai_explanations.upsert({
      where: { question_id: questionId },
      update: { prompt, response_text: text, provider: "openai" },
      create: {
        question_id: questionId,
        prompt,
        response_text: text,
        provider: "openai",
      },
    });
  }

  return NextResponse.json({ text, source: "live" });
}
