import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateInvoicePDF } from "@/lib/pdf";
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

  // Stream the PDF using a ReadableStream instead of loading fully in memory
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
      "Content-Disposition": `attachment; filename="Invoice-${invoice.invoiceNumber}.pdf"`,
    },
  });
}
