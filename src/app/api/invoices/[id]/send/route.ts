import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateInvoicePDF } from "@/lib/pdf";
import { sendInvoiceEmail } from "@/lib/email";
import { formatCurrency } from "@/lib/formatCurrency";
import { decrypt } from "@/lib/crypto";
import { format } from "date-fns";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: { tenant: true, sender: true, building: true },
  });

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
  }

  const settings = await prisma.settings.findUnique({
    where: { id: "default" },
  });

  if (!settings || !settings.smtpUser || !settings.smtpPass) {
    return NextResponse.json(
      { error: "Please configure your email settings first." },
      { status: 400 }
    );
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

  try {
    await sendInvoiceEmail({
      settings: {
        smtpHost: settings.smtpHost,
        smtpPort: settings.smtpPort,
        smtpUser: settings.smtpUser,
        smtpPass: decrypt(settings.smtpPass),
        senderName: invoice.sender.name,
      },
      to: invoice.tenant.email,
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
      { error: `Failed to send email. Please check your email settings. (${errorMessage})` },
      { status: 500 }
    );
  }
}
