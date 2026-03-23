import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateWaterBillPDF } from "@/lib/water-pdf";
import { sendWaterBillEmailViaGmail } from "@/lib/gmail";
import { formatCurrency } from "@/lib/formatCurrency";
import { requireAuth } from "@/lib/auth";
import { format } from "date-fns";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAuth();
  const { id } = await params;

  const bill = await prisma.waterBill.findUnique({
    where: { id },
    include: { tenant: true, sender: true, building: true },
  });

  if (!bill) {
    return NextResponse.json({ error: "Bill not found." }, { status: 404 });
  }

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

  if (!bill.tenant.email && !bill.tenant.ccEmails) {
    return NextResponse.json(
      { error: "No email addresses configured for this tenant." },
      { status: 400 }
    );
  }

  const toEmail = bill.tenant.email || bill.tenant.ccEmails.split(",")[0].trim();
  const ccEmail = bill.tenant.email
    ? (bill.tenant.ccEmails || undefined)
    : bill.tenant.ccEmails.split(",").slice(1).map((e: string) => e.trim()).filter(Boolean).join(", ") || undefined;

  try {
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
      where: { id },
      data: { status: "SENT", sentAt: new Date() },
    });

    return NextResponse.json({ success: true, message: "Water bill sent successfully!" });
  } catch (error) {
    await prisma.waterBill.update({
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
