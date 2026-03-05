import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
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
