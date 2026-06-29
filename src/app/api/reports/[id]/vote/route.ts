import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const report = await prisma.report.update({
      where: { id },
      data: { votes: { increment: 1 } },
    });
    return NextResponse.json({ id: report.id, votes: report.votes });
  } catch {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }
}
