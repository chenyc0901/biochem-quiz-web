import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const examSeed: string | undefined = body?.examSeed;
  const elapsedSeconds: number = Number(body?.elapsedSeconds ?? 0);
  if (!examSeed) {
    return NextResponse.json({ error: "examSeed required" }, { status: 400 });
  }

  await prisma.exam_sessions.upsert({
    where: { exam_seed: examSeed },
    update: { user_email: email, elapsed_seconds: elapsedSeconds },
    create: {
      exam_seed: examSeed,
      user_email: email,
      elapsed_seconds: elapsedSeconds,
    },
  });

  return NextResponse.json({ ok: true });
}
