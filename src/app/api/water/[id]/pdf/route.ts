import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateWaterBillPDF } from "@/lib/water-pdf";
import { format } from "date-fns";
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
    senderSignature: bill.sender.signature || undefined,
    tenantName: bill.tenant.name,
    tenantAddress: bill.tenant.propertyAddress,
    month: bill.month,
    year: bill.year,
    billDate: format(bill.billDate, "dd/MM/yyyy"),
    waterCharges: bill.waterCharges,
    netPayable: bill.netPayable,
    invoiceNo: bill.invoiceNo || undefined,
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
      "Content-Disposition": `attachment; filename="Water-Bill-${bill.tenant.name}-${bill.month}-${bill.year}.pdf"`,
    },
  });
}
