import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const tenantIds = searchParams.get("tenantIds")?.split(",").filter(Boolean) || [];

  if (tenantIds.length === 0) {
    return NextResponse.json({});
  }

  const readings: Record<string, number> = {};

  for (const tenantId of tenantIds) {
    const lastBill = await prisma.electricityBill.findFirst({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      select: { closingReading: true },
    });

    if (lastBill) {
      readings[tenantId] = lastBill.closingReading;
    }
  }

  return NextResponse.json(readings);
}
