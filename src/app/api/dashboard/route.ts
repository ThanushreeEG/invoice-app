import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const month = request.nextUrl.searchParams.get("month") || "";
  const year = parseInt(request.nextUrl.searchParams.get("year") || "0");

  const [totalTenants, allInvoices, allBills, allWaterBills] = await Promise.all([
    prisma.tenant.count({ where: { isActive: true } }),
    prisma.invoice.findMany({
      where: month && year ? { month, year } : undefined,
      select: {
        id: true,
        invoiceNumber: true,
        month: true,
        year: true,
        baseRent: true,
        cgstAmount: true,
        sgstAmount: true,
        totalAmount: true,
        status: true,
        createdAt: true,
        tenant: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.electricityBill.findMany({
      where: month && year ? { month, year } : undefined,
      select: {
        id: true,
        month: true,
        year: true,
        netPayable: true,
        status: true,
        createdAt: true,
        tenant: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.waterBill.findMany({
      where: month && year ? { month, year } : undefined,
      select: {
        id: true,
        month: true,
        year: true,
        netPayable: true,
        status: true,
        createdAt: true,
        tenant: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);

  return NextResponse.json({
    totalTenants,
    invoiceCount: allInvoices.length,
    totalBaseRent: allInvoices.reduce((sum, inv) => sum + inv.baseRent, 0),
    totalCgst: allInvoices.reduce((sum, inv) => sum + inv.cgstAmount, 0),
    totalSgst: allInvoices.reduce((sum, inv) => sum + inv.sgstAmount, 0),
    totalInvoiced: allInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0),
    recentInvoices: allInvoices.slice(0, 5),
    ebCount: allBills.length,
    totalEb: allBills.reduce((sum, bill) => sum + bill.netPayable, 0),
    recentBills: allBills.slice(0, 5),
    waterCount: allWaterBills.length,
    totalWater: allWaterBills.reduce((sum, bill) => sum + bill.netPayable, 0),
    recentWaterBills: allWaterBills.slice(0, 5),
  });
}
