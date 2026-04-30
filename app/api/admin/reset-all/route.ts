import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdminEmail } from "@/lib/admin";

export async function POST() {
  const session = await auth();
  if (!isAdminEmail(session?.user?.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const [a, b] = await prisma.$transaction([
    prisma.attempts.deleteMany({}),
    prisma.exam_sessions.deleteMany({}),
  ]);
  return NextResponse.json({
    ok: true,
    attemptsDeleted: a.count,
    sessionsDeleted: b.count,
  });
}
