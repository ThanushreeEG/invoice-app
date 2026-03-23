import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateInvoicePDF } from "@/lib/pdf";
import { sendInvoiceEmailViaGmail } from "@/lib/gmail";
import { formatCurrency } from "@/lib/formatCurrency";
import { requireAuth } from "@/lib/auth";
import { format } from "date-fns";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAuth();
  const { id } = await params;

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: { tenant: true, sender: true, building: true },
  });

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
  }

  const pdfBuffer = await generateInvoicePDF({
    senderName: invoice.sender.name,
    buildingName: invoice.building?.name || "",
    senderAddress: invoice.building?.address || "",
    senderGSTIN: invoice.sender.gstNumber,
    senderSignature: invoice.sender.signature || undefined,
    invoiceNumber: invoice.invoiceNumber,
    invoiceDate: format(invoice.invoiceDate, "dd/MM/yyyy"),
    tenantName: invoice.tenant.name,
    tenantAddress: invoice.tenant.propertyAddress,
    tenantGSTIN: invoice.tenant.gstNumber,
    month: invoice.month,
    year: invoice.year,
    description: invoice.description,
    baseRent: invoice.baseRent,
    cgstRate: invoice.cgstRate,
    sgstRate: invoice.sgstRate,
    cgstAmount: invoice.cgstAmount,
    sgstAmount: invoice.sgstAmount,
    totalAmount: invoice.totalAmount,
  });

  if (!invoice.tenant.email && !invoice.tenant.ccEmails) {
    return NextResponse.json(
      { error: "No email addresses configured for this tenant." },
      { status: 400 }
    );
  }

  const toEmail = invoice.tenant.email || invoice.tenant.ccEmails.split(",")[0].trim();
  const ccEmail = invoice.tenant.email
    ? (invoice.tenant.ccEmails || undefined)
    : invoice.tenant.ccEmails.split(",").slice(1).map((e: string) => e.trim()).filter(Boolean).join(", ") || undefined;

  try {
    await sendInvoiceEmailViaGmail({
      userId: session.user.id,
      senderName: invoice.sender.name,
      to: toEmail,
      cc: ccEmail,
      tenantName: invoice.tenant.name,
      invoiceNumber: invoice.invoiceNumber,
      totalAmount: formatCurrency(invoice.totalAmount),
      month: invoice.month,
      year: invoice.year,
      pdfBuffer,
    });

    await prisma.invoice.update({
      where: { id },
      data: { status: "SENT", sentAt: new Date() },
    });

    return NextResponse.json({ success: true, message: "Invoice sent successfully!" });
  } catch (error) {
    await prisma.invoice.update({
      where: { id },
      data: { status: "FAILED" },
    });

    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to send email. (${errorMessage})` },
      { status: 500 }
    );
  }
}
