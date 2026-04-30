import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdminEmail } from "@/lib/admin";

async function handle(req: Request) {
  const session = await auth();
  if (!isAdminEmail(session?.user?.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const ids: unknown[] = Array.isArray(body?.ids)
    ? body.ids
    : body?.reportId != null
      ? [body.reportId]
      : [];
  if (ids.length === 0) {
    return NextResponse.json({ error: "ids required" }, { status: 400 });
  }
  const bigIds = ids.map((x) => {
    try {
      return BigInt(String(x));
    } catch {
      return null;
    }
  }).filter((x): x is bigint => x !== null);
  if (bigIds.length === 0) {
    return NextResponse.json({ error: "no valid ids" }, { status: 400 });
  }
  const result = await prisma.question_reports.deleteMany({
    where: { id: { in: bigIds } },
  });
  return NextResponse.json({ ok: true, deleted: result.count });
}

export const POST = handle;
export const DELETE = handle;
