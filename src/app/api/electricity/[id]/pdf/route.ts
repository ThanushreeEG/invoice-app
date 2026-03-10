import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateElectricityBillPDF } from "@/lib/electricity-pdf";
import { format } from "date-fns";

export async function GET(
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

  const pdfBuffer = await generateElectricityBillPDF({
    senderName: bill.sender.name,
    buildingName: bill.building?.name || "",
    senderAddress: bill.building?.address || "",
    senderSignature: bill.sender.signature || undefined,
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
    dgMaintenance: bill.dgMaintenance,
    waterCharges: bill.waterCharges,
    invoiceNo: bill.invoiceNo || undefined,
    netPayable: bill.netPayable,
  });

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array(pdfBuffer));
      controller.close();
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": pdfBuffer.length.toString(),
      "Content-Disposition": `attachment; filename="Electricity-Bill-${bill.tenant.name}-${bill.month}-${bill.year}.pdf"`,
    },
  });
}
