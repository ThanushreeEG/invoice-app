import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateElectricityBillPDF } from "@/lib/electricity-pdf";
import { sendElectricityBillEmail } from "@/lib/email";
import { formatCurrency } from "@/lib/formatCurrency";
import { decrypt } from "@/lib/crypto";
import { format } from "date-fns";

export async function POST(
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

  const settings = await prisma.settings.findUnique({
    where: { id: "default" },
  });

  if (!settings || !settings.smtpUser || !settings.smtpPass) {
    return NextResponse.json(
      { error: "Please configure your email settings first." },
      { status: 400 }
    );
  }

  const pdfBuffer = await generateElectricityBillPDF({
    senderName: bill.sender.name,
    buildingName: bill.building?.name || "",
    senderAddress: bill.building?.address || "",
    tenantName: bill.tenant.name,
    tenantAddress: bill.tenant.propertyAddress,
    month: bill.month,
    year: bill.year,
    billDate: format(bill.billDate, "dd/MM/yyyy"),
    openingReading: bill.openingReading,
    closingReading: bill.closingReading,
    unitsConsumed: bill.unitsConsumed,
    multiplier: bill.tenant.elecMultiplier,
    totalUnitsConsumed: bill.totalUnitsConsumed,
    miscUnits: bill.miscUnits,
    totalUnitsCharged: bill.totalUnitsCharged,
    ratePerUnit: bill.ratePerUnit,
    totalAmount: bill.totalAmount,
    minChargeUnits: bill.minChargeUnits,
    kva: bill.kva,
    minimumCharge: bill.minimumCharge,
    bwssbCharges: bill.bwssbCharges,
    maintenance: bill.maintenance,
    netPayable: bill.netPayable,
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
    await sendElectricityBillEmail({
      settings: {
        smtpHost: settings.smtpHost,
        smtpPort: settings.smtpPort,
        smtpUser: settings.smtpUser,
        smtpPass: decrypt(settings.smtpPass),
        senderName: bill.sender.name,
      },
      to: toEmail,
      cc: ccEmail,
      tenantName: bill.tenant.name,
      month: bill.month,
      year: bill.year,
      netPayable: formatCurrency(bill.netPayable),
      pdfBuffer,
    });

    await prisma.electricityBill.update({
      where: { id },
      data: { status: "SENT", sentAt: new Date() },
    });

    return NextResponse.json({ success: true, message: "Electricity bill sent successfully!" });
  } catch (error) {
    await prisma.electricityBill.update({
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
