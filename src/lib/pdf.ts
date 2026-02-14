// eslint-disable-next-line @typescript-eslint/no-require-imports
const PdfPrinter = require("pdfmake/js/Printer").default;
import { TDocumentDefinitions } from "pdfmake/interfaces";
import { formatInvoiceAmount } from "./formatCurrency";
import { amountInWords } from "./amountInWords";
import path from "path";

const fontDir = path.join(process.cwd(), "node_modules/pdfmake/build/fonts/Roboto");

const fonts = {
  Roboto: {
    normal: path.join(fontDir, "Roboto-Regular.ttf"),
    bold: path.join(fontDir, "Roboto-Medium.ttf"),
    italics: path.join(fontDir, "Roboto-Italic.ttf"),
    bolditalics: path.join(fontDir, "Roboto-MediumItalic.ttf"),
  },
};

interface InvoiceData {
  senderName: string;
  buildingName: string;
  senderAddress: string;
  senderGSTIN: string;
  invoiceNumber: string;
  invoiceDate: string;
  tenantName: string;
  tenantAddress: string;
  tenantGSTIN: string;
  month: string;
  year: number;
  description: string;
  senderSignature?: string;
  baseRent: number;
  cgstRate: number;
  sgstRate: number;
  cgstAmount: number;
  sgstAmount: number;
  totalAmount: number;
}

// Convert \n in stored strings to clean single-line text for PDF
function cleanAddress(addr: string): string {
  return addr.replace(/\n/g, " ").replace(/\s+/g, " ").trim();
}

export async function generateInvoicePDF(data: InvoiceData): Promise<Buffer> {
  const printer = new PdfPrinter(fonts);

  const senderAddr = cleanAddress(data.senderAddress);
  const tenantAddr = cleanAddress(data.tenantAddress);

  const docDefinition: TDocumentDefinitions = {
    pageSize: "A4",
    pageMargins: [50, 40, 50, 40],
    content: [
      // ── Header: Sender Name, Building, Address (centered) ──
      { text: data.senderName, fontSize: 16, bold: true, alignment: "center" },
      { text: data.buildingName, fontSize: 13, bold: true, alignment: "center", margin: [0, 2, 0, 2] },
      { text: senderAddr, fontSize: 10, alignment: "center", margin: [0, 0, 0, 20] },

      // ── INVOICE title ──
      { text: "INVOICE", fontSize: 18, bold: true, decoration: "underline", alignment: "center", margin: [0, 0, 0, 15] },

      // ── Invoice No. and Date (same line) ──
      {
        columns: [
          { text: `Invoice No. ${data.invoiceNumber}`, fontSize: 11 },
          { text: `Date: ${data.invoiceDate}`, fontSize: 11, alignment: "right" },
        ],
        margin: [0, 0, 0, 3],
      },

      // ── Sender GST ──
      { text: `GST.No: ${data.senderGSTIN}`, fontSize: 11, margin: [0, 0, 0, 15] },

      // ── To section ──
      { text: "To", fontSize: 11, margin: [0, 0, 0, 3] },
      { text: data.tenantName, fontSize: 11, bold: true, margin: [0, 0, 0, 2] },
      { text: tenantAddr, fontSize: 10, margin: [0, 0, 0, 2] },
      ...(data.tenantGSTIN
        ? [{ text: `GST.No: ${data.tenantGSTIN}`, fontSize: 10, margin: [0, 2, 0, 15] as [number, number, number, number] }]
        : [{ text: "", margin: [0, 0, 0, 15] as [number, number, number, number] }]
      ),

      // ── Subject line ──
      { text: `Sub: Invoice for the month of ${data.month} ${data.year}`, fontSize: 11, bold: true, margin: [0, 0, 0, 15] },

      // ── Amount Table ──
      {
        table: {
          headerRows: 1,
          widths: ["*", 120],
          body: [
            [
              { text: "Particulars", bold: true, fontSize: 11, margin: [5, 5, 5, 5], fillColor: "#f0f0f0" },
              { text: "Amount", bold: true, fontSize: 11, alignment: "right", margin: [5, 5, 5, 5], fillColor: "#f0f0f0" },
            ],
            [
              { text: data.description, fontSize: 10, margin: [5, 5, 5, 5] },
              { text: formatInvoiceAmount(data.baseRent), fontSize: 10, alignment: "right", margin: [5, 5, 5, 5] },
            ],
            [
              { text: `Add: GST@ ${data.cgstRate}%`, fontSize: 10, margin: [5, 5, 5, 5] },
              { text: formatInvoiceAmount(data.cgstAmount), fontSize: 10, alignment: "right", margin: [5, 5, 5, 5] },
            ],
            [
              { text: `Add: GST@ ${data.sgstRate}%`, fontSize: 10, margin: [5, 5, 5, 5] },
              { text: formatInvoiceAmount(data.sgstAmount), fontSize: 10, alignment: "right", margin: [5, 5, 5, 5] },
            ],
            [
              { text: "Total Rental Amount", bold: true, fontSize: 11, margin: [5, 5, 5, 5], fillColor: "#e8e8e8" },
              { text: formatInvoiceAmount(data.totalAmount), bold: true, fontSize: 11, alignment: "right", margin: [5, 5, 5, 5], fillColor: "#e8e8e8" },
            ],
          ],
        },
        margin: [0, 0, 0, 15],
      },

      // ── Amount in words ──
      { text: `Amount in words: ${amountInWords(data.totalAmount)}`, fontSize: 10, italics: true, margin: [0, 0, 0, 30] },

      // ── Closing ──
      { text: "Thanking You", fontSize: 11, margin: [0, 0, 0, 10] },

      // ── Signature image (if exists) ──
      ...(data.senderSignature
        ? [{ image: data.senderSignature, width: 120, height: 50, margin: [0, 0, 0, 5] as [number, number, number, number] }]
        : [{ text: "", margin: [0, 0, 0, 20] as [number, number, number, number] }]
      ),

      // ── Sender name ──
      { text: `(${data.senderName})`, fontSize: 12, bold: true },
    ],
  };

  const doc = await printer.createPdfKitDocument(docDefinition);
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.end();
  });
}
