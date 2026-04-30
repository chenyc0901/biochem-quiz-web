import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const questionId: string | null = body?.questionId ?? null;
  const content: string = String(body?.content ?? "").trim().slice(0, 2000);
  if (!content) {
    return NextResponse.json({ error: "content required" }, { status: 400 });
  }

  await prisma.question_reports.create({
    data: {
      question_id: questionId,
      user_email: email,
      content,
    },
  });
  return NextResponse.json({ ok: true });
}
