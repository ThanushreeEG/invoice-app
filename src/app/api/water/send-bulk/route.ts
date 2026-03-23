import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateWaterBillPDF } from "@/lib/water-pdf";
import { sendWaterBillEmailViaGmail } from "@/lib/gmail";
import { formatCurrency } from "@/lib/formatCurrency";
import { requireAuth } from "@/lib/auth";
import { format } from "date-fns";
import { bulkSendWaterSchema, formatZodError } from "@/lib/validations";

export async function POST(request: Request) {
  const session = await requireAuth();
  const raw = await request.json();
  const result = bulkSendWaterSchema.safeParse(raw);

  if (!result.success) {
    return NextResponse.json(
      { error: formatZodError(result.error) },
      { status: 400 }
    );
  }

  const { billIds } = result.data;

  const results: Array<{
    billId: string;
    tenantName: string;
    success: boolean;
    error?: string;
  }> = [];

  for (const billId of billIds) {
    const bill = await prisma.waterBill.findUnique({
      where: { id: billId },
      include: { tenant: true, sender: true, building: true },
    });

    if (!bill) {
      results.push({
        billId,
        tenantName: "N/A",
        success: false,
        error: "Bill not found",
      });
      continue;
    }

    if (!bill.tenant.email && !bill.tenant.ccEmails) {
      results.push({
        billId,
        tenantName: bill.tenant.name,
        success: false,
        error: "No email address",
      });
      continue;
    }

    const toEmail = bill.tenant.email || bill.tenant.ccEmails.split(",")[0].trim();
    const ccEmail = bill.tenant.email
      ? (bill.tenant.ccEmails || undefined)
      : bill.tenant.ccEmails.split(",").slice(1).map((e: string) => e.trim()).filter(Boolean).join(", ") || undefined;

    try {
      const pdfBuffer = await generateWaterBillPDF({
        senderName: bill.sender.name,
        buildingName: bill.building?.name || "",
        senderAddress: bill.building?.address || "",
        tenantName: bill.tenant.name,
        tenantAddress: bill.tenant.propertyAddress,
        month: bill.month,
        year: bill.year,
        billDate: format(bill.billDate, "dd/MM/yyyy"),
        waterCharges: bill.waterCharges,
        netPayable: bill.netPayable,
        invoiceNo: bill.invoiceNo || undefined,
      });

      await sendWaterBillEmailViaGmail({
        userId: session.user.id,
        senderName: bill.sender.name,
        to: toEmail,
        cc: ccEmail,
        tenantName: bill.tenant.name,
        month: bill.month,
        year: bill.year,
        netPayable: formatCurrency(bill.netPayable),
        pdfBuffer,
      });

      await prisma.waterBill.update({
        where: { id: billId },
        data: { status: "SENT", sentAt: new Date() },
      });

      results.push({
        billId,
        tenantName: bill.tenant.name,
        success: true,
      });
    } catch (error) {
      await prisma.waterBill.update({
        where: { id: billId },
        data: { status: "FAILED" },
      });

      results.push({
        billId,
        tenantName: bill.tenant.name,
        success: false,
        error: error instanceof Error ? error.message : "Failed to send",
      });
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return NextResponse.json({ results });
}
