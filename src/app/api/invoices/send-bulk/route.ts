import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateInvoicePDF } from "@/lib/pdf";
import { sendInvoiceEmailViaGmail } from "@/lib/gmail";
import { formatCurrency } from "@/lib/formatCurrency";
import { requireAuth } from "@/lib/auth";
import { format } from "date-fns";
import { bulkSendSchema, formatZodError } from "@/lib/validations";

export async function POST(request: Request) {
  const session = await requireAuth();
  const raw = await request.json();
  const result = bulkSendSchema.safeParse(raw);

  if (!result.success) {
    return NextResponse.json(
      { error: formatZodError(result.error) },
      { status: 400 }
    );
  }

  const { invoiceIds } = result.data;

  const results: Array<{
    invoiceId: string;
    invoiceNumber: string;
    tenantName: string;
    success: boolean;
    error?: string;
  }> = [];

  for (const invoiceId of invoiceIds) {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { tenant: true, sender: true, building: true },
    });

    if (!invoice) {
      results.push({
        invoiceId,
        invoiceNumber: "N/A",
        tenantName: "N/A",
        success: false,
        error: "Invoice not found",
      });
      continue;
    }

    if (!invoice.tenant.email && !invoice.tenant.ccEmails) {
      results.push({
        invoiceId,
        invoiceNumber: invoice.invoiceNumber,
        tenantName: invoice.tenant.name,
        success: false,
        error: "No email address",
      });
      continue;
    }

    const toEmail = invoice.tenant.email || invoice.tenant.ccEmails.split(",")[0].trim();
    const ccEmail = invoice.tenant.email
      ? (invoice.tenant.ccEmails || undefined)
      : invoice.tenant.ccEmails.split(",").slice(1).map((e: string) => e.trim()).filter(Boolean).join(", ") || undefined;

    try {
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
        where: { id: invoiceId },
        data: { status: "SENT", sentAt: new Date() },
      });

      results.push({
        invoiceId,
        invoiceNumber: invoice.invoiceNumber,
        tenantName: invoice.tenant.name,
        success: true,
      });
    } catch (error) {
      await prisma.invoice.update({
        where: { id: invoiceId },
        data: { status: "FAILED" },
      });

      results.push({
        invoiceId,
        invoiceNumber: invoice.invoiceNumber,
        tenantName: invoice.tenant.name,
        success: false,
        error: error instanceof Error ? error.message : "Failed to send",
      });
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return NextResponse.json({ results });
}
