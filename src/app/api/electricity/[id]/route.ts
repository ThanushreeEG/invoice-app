import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { updateElectricityBillSchema, formatZodError } from "@/lib/validations";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const bill = await prisma.electricityBill.findUnique({
    where: { id },
    include: { tenant: true, sender: true, building: true },
  });

  if (!bill) {
    return NextResponse.json({ error: "Bill not found." }, { status: 404 });
  }

  return NextResponse.json(bill);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const raw = await request.json();

  const result = updateElectricityBillSchema.safeParse(raw);
  if (!result.success) {
    return NextResponse.json(
      { error: formatZodError(result.error) },
      { status: 400 }
    );
  }

  const body = result.data;
  const bill = await prisma.electricityBill.findUnique({
    where: { id },
    include: { tenant: true },
  });

  if (!bill) {
    return NextResponse.json({ error: "Bill not found." }, { status: 404 });
  }

  if (bill.status === "SENT") {
    return NextResponse.json(
      { error: "Cannot edit a sent bill." },
      { status: 400 }
    );
  }

  const openingReading = body.openingReading;
  const closingReading = body.closingReading;
  const unitsConsumed = closingReading - openingReading;
  const totalUnitsConsumed = unitsConsumed * bill.tenant.elecMultiplier;
  const miscUnits = body.miscUnits || 0;
  const totalUnitsCharged = totalUnitsConsumed + miscUnits;
  const totalAmount = totalUnitsCharged * body.ratePerUnit;
  const minChargeUnits = bill.tenant.elecMinChargeUnits;
  const kva = bill.tenant.elecKVA;
  const minimumCharge = minChargeUnits * kva;
  const bwssbCharges = body.bwssbCharges || 0;
  const maintenance = body.maintenance || 0;
  const dgMaintenance = body.dgMaintenance || 0;
  const waterCharges = body.waterCharges || 0;
  const invoiceNo = body.invoiceNo || "";
  const netPayable = totalAmount + minimumCharge + bwssbCharges + maintenance + dgMaintenance + waterCharges;

  const monthIndex = [
    "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
    "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER",
  ].indexOf(body.month);
  // Bill date is 1st of the NEXT month (e.g., September bill → 01/10)
  const billDate = new Date(body.year, monthIndex + 1, 1);

  const updated = await prisma.electricityBill.update({
    where: { id },
    data: {
      senderId: body.senderId,
      buildingId: body.buildingId,
      month: body.month,
      year: body.year,
      billDate,
      openingReading,
      closingReading,
      unitsConsumed,
      totalUnitsConsumed,
      miscUnits,
      totalUnitsCharged,
      ratePerUnit: body.ratePerUnit,
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
    },
    include: { tenant: true, sender: true, building: true },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const bill = await prisma.electricityBill.findUnique({ where: { id } });

  if (!bill) {
    return NextResponse.json({ error: "Bill not found." }, { status: 404 });
  }

  if (bill.status === "SENT") {
    return NextResponse.json(
      { error: "Cannot delete a sent bill." },
      { status: 400 }
    );
  }

  await prisma.electricityBill.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
