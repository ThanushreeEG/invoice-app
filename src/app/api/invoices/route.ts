import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateGST } from "@/lib/gst";
import { generateInvoicePDF } from "@/lib/pdf";
import { format } from "date-fns";
import { createInvoiceSchema, formatZodError } from "@/lib/validations";
import { getSession } from "@/lib/auth";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
      { invoiceNumber: { contains: search } },
      { tenant: { name: { contains: search } } },
    ];
  }

  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      select: {
        id: true,
        invoiceNumber: true,
        month: true,
        year: true,
        baseRent: true,
        totalAmount: true,
        status: true,
        sentAt: true,
        createdAt: true,
        tenant: { select: { name: true, email: true } },
        sender: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.invoice.count({ where }),
  ]);

  return NextResponse.json({
    invoices,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const raw = await request.json();
  const result = createInvoiceSchema.safeParse(raw);

  if (!result.success) {
    return NextResponse.json(
      { error: formatZodError(result.error) },
      { status: 400 }
    );
  }

  const { senderId, buildingId, tenants } = result.data;

  const sender = await prisma.sender.findUnique({ where: { id: senderId } });
  if (!sender) {
    return NextResponse.json(
      { error: "Sender not found." },
      { status: 400 }
    );
  }

  const building = await prisma.building.findUnique({ where: { id: buildingId } });
  if (!building) {
    return NextResponse.json(
      { error: "Building not found." },
      { status: 400 }
    );
  }

  const createdInvoices = [];

  for (const item of tenants) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: item.tenantId },
    });
    if (!tenant) continue;

    const gst = calculateGST(item.baseRent);

    // Invoice date = 1st of the selected month
    const monthIndex = [
      "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
      "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER",
    ].indexOf(item.month);
    const invoiceDate = new Date(item.year, monthIndex, 1);

    try {
      const invoice = await prisma.invoice.create({
        data: {
          invoiceNumber: item.invoiceNumber,
          senderId,
          buildingId,
          tenantId: item.tenantId,
          invoiceDate,
          month: item.month,
          year: item.year,
          description:
            item.description ||
            "Amount Charged towards rental of the premises",
          baseRent: item.baseRent,
          cgstRate: 9,
          sgstRate: 9,
          cgstAmount: gst.cgst,
          sgstAmount: gst.sgst,
          totalAmount: gst.total,
          status: "DRAFT",
        },
        include: { tenant: true, sender: true, building: true },
      });

      // Generate PDF
      const pdfBuffer = await generateInvoicePDF({
        senderName: sender.name,
        buildingName: building.name,
        senderAddress: building.address,
        senderGSTIN: sender.gstNumber,
        senderSignature: sender.signature || undefined,
        invoiceNumber: invoice.invoiceNumber,
        invoiceDate: format(invoiceDate, "dd/MM/yyyy"),
        tenantName: tenant.name,
        tenantAddress: tenant.propertyAddress,
        tenantGSTIN: tenant.gstNumber,
        month: item.month,
        year: item.year,
        description: invoice.description,
        baseRent: invoice.baseRent,
        cgstRate: invoice.cgstRate,
        sgstRate: invoice.sgstRate,
        cgstAmount: invoice.cgstAmount,
        sgstAmount: invoice.sgstAmount,
        totalAmount: invoice.totalAmount,
      });

      createdInvoices.push({
        ...invoice,
        pdfBase64: pdfBuffer.toString("base64"),
      });
    } catch (error: unknown) {
      // Handle duplicate invoice number
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        (error as { code: string }).code === "P2002"
      ) {
        return NextResponse.json(
          { error: `Invoice number "${item.invoiceNumber}" already exists. Please use a different number.` },
          { status: 409 }
        );
      }
      throw error;
    }
  }

  return NextResponse.json(createdInvoices, { status: 201 });
}
