import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateGST } from "@/lib/gst";
import { updateInvoiceSchema, formatZodError } from "@/lib/validations";
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
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: { tenant: true, sender: true, building: true },
  });

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
  }

  return NextResponse.json(invoice);
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

  const result = updateInvoiceSchema.safeParse(raw);
  if (!result.success) {
    return NextResponse.json(
      { error: formatZodError(result.error) },
      { status: 400 }
    );
  }

  const body = result.data;
  const invoice = await prisma.invoice.findUnique({ where: { id } });

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
  }

  if (invoice.status === "SENT") {
    return NextResponse.json(
      { error: "Cannot edit a sent invoice." },
      { status: 400 }
    );
  }

  const baseRent = body.baseRent ?? invoice.baseRent;
  const gst = calculateGST(baseRent);

  const monthIndex = [
    "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
    "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER",
  ].indexOf(body.month ?? invoice.month);
  const invoiceDate = new Date(body.year ?? invoice.year, monthIndex, 1);

  try {
    const updated = await prisma.invoice.update({
      where: { id },
      data: {
        invoiceNumber: body.invoiceNumber ?? invoice.invoiceNumber,
        senderId: body.senderId ?? invoice.senderId,
        buildingId: body.buildingId ?? invoice.buildingId,
        tenantId: invoice.tenantId,
        invoiceDate,
        month: body.month ?? invoice.month,
        year: body.year ?? invoice.year,
        description: body.description ?? invoice.description,
        baseRent,
        cgstAmount: gst.cgst,
        sgstAmount: gst.sgst,
        totalAmount: gst.total,
      },
      include: { tenant: true, sender: true, building: true },
    });

    return NextResponse.json(updated);
  } catch (error: unknown) {
    // Handle duplicate invoice number
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code: string }).code === "P2002"
    ) {
      return NextResponse.json(
        { error: `Invoice number "${body.invoiceNumber}" already exists. Please use a different number.` },
        { status: 409 }
      );
    }
    throw error;
  }
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

  const invoice = await prisma.invoice.findUnique({ where: { id } });

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
  }

  if (invoice.status === "SENT") {
    return NextResponse.json(
      { error: "Cannot delete a sent invoice." },
      { status: 400 }
    );
  }

  await prisma.invoice.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
