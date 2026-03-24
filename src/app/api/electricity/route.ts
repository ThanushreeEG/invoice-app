import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateElectricityBillPDF } from "@/lib/electricity-pdf";
import { format } from "date-fns";
import { createElectricityBillSchema, formatZodError } from "@/lib/validations";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const tenantId = searchParams.get("tenantId");
  const search = searchParams.get("search")?.trim();
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20")));

  const month = searchParams.get("month");
  const year = searchParams.get("year");

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (tenantId) where.tenantId = tenantId;
  if (month) where.month = month;
  if (year) where.year = parseInt(year);
  if (search) {
    where.OR = [
      { tenant: { name: { contains: search } } },
      { month: { contains: search } },
    ];
  }

  const [bills, total] = await Promise.all([
    prisma.electricityBill.findMany({
      where,
      select: {
        id: true,
        month: true,
        year: true,
        openingReading: true,
        closingReading: true,
        totalUnitsCharged: true,
        netPayable: true,
        status: true,
        sentAt: true,
        createdAt: true,
        tenant: { select: { name: true, email: true, ccEmails: true } },
        sender: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.electricityBill.count({ where }),
  ]);

  return NextResponse.json({
    bills,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

export async function POST(request: Request) {
  const raw = await request.json();
  const result = createElectricityBillSchema.safeParse(raw);

  if (!result.success) {
    return NextResponse.json(
      { error: formatZodError(result.error) },
      { status: 400 }
    );
  }

  const { senderId, buildingId, month, year, tenants } = result.data;

  const sender = await prisma.sender.findUnique({ where: { id: senderId } });
  if (!sender) {
    return NextResponse.json({ error: "Sender not found." }, { status: 400 });
  }

  const building = await prisma.building.findUnique({ where: { id: buildingId } });
  if (!building) {
    return NextResponse.json({ error: "Building not found." }, { status: 400 });
  }

  const monthIndex = [
    "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
    "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER",
  ].indexOf(month);
  // Bill date is 1st of the NEXT month (e.g., September bill → 01/10)
  const billDate = new Date(year, monthIndex + 1, 1);

  const createdBills = [];

  for (const item of tenants) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: item.tenantId },
    });
    if (!tenant) continue;

    const unitsConsumed = item.closingReading - item.openingReading;
    const totalUnitsConsumed = unitsConsumed * tenant.elecMultiplier;
    const miscUnits = item.miscUnits || 0;
    const totalUnitsCharged = totalUnitsConsumed + miscUnits;
    const totalAmount = totalUnitsCharged * item.ratePerUnit;
    const minChargeUnits = tenant.elecMinChargeUnits;
    const kva = tenant.elecKVA;
    const minimumCharge = minChargeUnits * kva;
    const bwssbCharges = item.bwssbCharges || 0;
    const maintenance = item.maintenance || 0;
    const dgMaintenance = item.dgMaintenance || 0;
    const waterCharges = item.waterCharges || 0;
    const invoiceNo = item.invoiceNo || "";
    const netPayable = totalAmount + minimumCharge + bwssbCharges + maintenance + dgMaintenance + waterCharges;

    const bill = await prisma.electricityBill.create({
      data: {
        senderId,
        buildingId,
        tenantId: item.tenantId,
        month,
        year,
        billDate,
        openingReading: item.openingReading,
        closingReading: item.closingReading,
        unitsConsumed,
        totalUnitsConsumed,
        miscUnits,
        totalUnitsCharged,
        ratePerUnit: item.ratePerUnit,
        totalAmount,
        minChargeUnits,
        kva,
        minimumCharge,
        bwssbCharges,
        maintenance,
        dgMaintenance,
        waterCharges,
        invoiceNo,
        netPayable,
        status: "DRAFT",
      },
      include: { tenant: true, sender: true, building: true },
    });

    const pdfBuffer = await generateElectricityBillPDF({
      senderName: sender.name,
      buildingName: building.name,
      senderAddress: building.address,
      tenantName: tenant.name,
      tenantAddress: tenant.propertyAddress,
      month,
      year,
      billDate: format(billDate, "dd/MM/yyyy"),
      openingReading: item.openingReading,
      closingReading: item.closingReading,
      unitsConsumed,
      multiplier: tenant.elecMultiplier,
      totalUnitsConsumed,
      miscUnits,
      totalUnitsCharged,
      ratePerUnit: item.ratePerUnit,
      totalAmount,
      minChargeUnits,
      kva,
      minimumCharge,
      bwssbCharges,
      maintenance,
      dgMaintenance,
      waterCharges,
      invoiceNo: invoiceNo || undefined,
      netPayable,
    });

    createdBills.push({
      ...bill,
      pdfBase64: pdfBuffer.toString("base64"),
    });
  }

  return NextResponse.json(createdBills, { status: 201 });
}
