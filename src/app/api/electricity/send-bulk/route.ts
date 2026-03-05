import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateElectricityBillPDF } from "@/lib/electricity-pdf";
import { sendElectricityBillEmail } from "@/lib/email";
import { formatCurrency } from "@/lib/formatCurrency";
import { decrypt } from "@/lib/crypto";
import { format } from "date-fns";
import { bulkSendElectricitySchema, formatZodError } from "@/lib/validations";

export async function POST(request: Request) {
  const raw = await request.json();
  const result = bulkSendElectricitySchema.safeParse(raw);

  if (!result.success) {
    return NextResponse.json(
      { error: formatZodError(result.error) },
      { status: 400 }
    );
  }

  const { billIds } = result.data;

  const settings = await prisma.settings.findUnique({
    where: { id: "default" },
  });

  if (!settings || !settings.smtpUser || !settings.smtpPass) {
    return NextResponse.json(
      { error: "Please configure your email settings first." },
      { status: 400 }
    );
  }

  const decryptedPass = decrypt(settings.smtpPass);

  const results: Array<{
    billId: string;
    tenantName: string;
    success: boolean;
    error?: string;
  }> = [];

  for (const billId of billIds) {
    const bill = await prisma.electricityBill.findUnique({
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

      await sendElectricityBillEmail({
        settings: {
          smtpHost: settings.smtpHost,
          smtpPort: settings.smtpPort,
          smtpUser: settings.smtpUser,
          smtpPass: decryptedPass,
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
        where: { id: billId },
        data: { status: "SENT", sentAt: new Date() },
      });

      results.push({
        billId,
        tenantName: bill.tenant.name,
        success: true,
      });
    } catch (error) {
      await prisma.electricityBill.update({
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

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  return NextResponse.json({ results });
}
