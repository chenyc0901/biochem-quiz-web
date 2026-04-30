import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const session = await auth();
  const email = session?.user?.email;
  if (!email)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const result = await prisma.attempts.deleteMany({
    where: {
      user_email: email,
      OR: [{ is_correct: 0 }, { guessed: 1 }],
    },
  });
  return NextResponse.json({ ok: true, deleted: result.count });
}
