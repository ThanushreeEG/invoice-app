import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { updateWaterBillSchema, formatZodError } from "@/lib/validations";
import { getSession } from "@/lib/auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const bill = await prisma.waterBill.findUnique({
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
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const raw = await request.json();

  const result = updateWaterBillSchema.safeParse(raw);
  if (!result.success) {
    return NextResponse.json(
      { error: formatZodError(result.error) },
      { status: 400 }
    );
  }

  const body = result.data;
  const bill = await prisma.waterBill.findUnique({ where: { id } });

  if (!bill) {
    return NextResponse.json({ error: "Bill not found." }, { status: 404 });
  }

  if (bill.status === "SENT") {
    return NextResponse.json(
      { error: "Cannot edit a sent bill." },
      { status: 400 }
    );
  }

  const waterCharges = body.waterCharges;
  const netPayable = waterCharges;
  const invoiceNo = body.invoiceNo || "";

  const monthIndex = [
    "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
    "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER",
  ].indexOf(body.month);
  const billDate = new Date(body.year, monthIndex + 1, 1);

  const updated = await prisma.waterBill.update({
    where: { id },
    data: {
      senderId: body.senderId,
      buildingId: body.buildingId,
      month: body.month,
      year: body.year,
      billDate,
      waterCharges,
      netPayable,
      invoiceNo,
    },
    include: { tenant: true, sender: true, building: true },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const bill = await prisma.waterBill.findUnique({ where: { id } });

  if (!bill) {
    return NextResponse.json({ error: "Bill not found." }, { status: 404 });
  }

  if (bill.status === "SENT") {
    return NextResponse.json(
      { error: "Cannot delete a sent bill." },
      { status: 400 }
    );
  }

  await prisma.waterBill.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
