import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [a, b] = await prisma.$transaction([
    prisma.attempts.deleteMany({ where: { user_email: email } }),
    prisma.exam_sessions.deleteMany({ where: { user_email: email } }),
  ]);
  return NextResponse.json({
    ok: true,
    attemptsDeleted: a.count,
    sessionsDeleted: b.count,
  });
}
