import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const seed: string | undefined = body?.seed;
  if (!seed) {
    return NextResponse.json({ error: "seed required" }, { status: 400 });
  }
  const examSeed = seed.startsWith("p_") ? seed : `p_${seed}`;

  const result = await prisma.attempts.deleteMany({
    where: { user_email: email, exam_seed: examSeed },
  });
  return NextResponse.json({ ok: true, deleted: result.count });
}
