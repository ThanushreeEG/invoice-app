// eslint-disable-next-line @typescript-eslint/no-require-imports
const PdfPrinter = require("pdfmake/js/Printer").default;
import { TDocumentDefinitions } from "pdfmake/interfaces";
import { formatInvoiceAmount } from "./formatCurrency";
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

export interface WaterBillData {
  senderName: string;
  buildingName: string;
  senderAddress: string;
  senderSignature?: string;
  invoiceNo?: string;
  tenantName: string;
  tenantAddress: string;
  month: string;
  year: number;
  billDate: string;
  waterCharges: number;
  netPayable: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function noBorder(content: Record<string, any>): any {
  return { ...content, border: [false, false, false, false] };
}

export async function generateWaterBillPDF(data: WaterBillData): Promise<Buffer> {
  const printer = new PdfPrinter(fonts);

  const senderAddr = data.senderAddress.replace(/\n/g, ", ").replace(/,\s*,/g, ",").replace(/\s+/g, " ").trim();
  const tenantAddr = data.tenantAddress.replace(/\n/g, " ").replace(/\s+/g, " ").trim();
  const monthName = data.month.charAt(0) + data.month.slice(1).toUpperCase();

  const docDefinition: TDocumentDefinitions = {
    pageSize: "A4",
    pageMargins: [50, 40, 50, 40],
    content: [
      // HEADER
      {
        table: {
          widths: ["*"],
          body: [
            [
              {
                stack: [
                  { text: data.senderName, fontSize: 16, bold: true, alignment: "center" },
                  { text: data.buildingName, fontSize: 13, bold: true, alignment: "center", margin: [0, 3, 0, 3] },
                  { text: senderAddr, fontSize: 10, alignment: "center", margin: [0, 1, 0, 1] },
                ],
                border: [false, false, false, true],
                margin: [0, 0, 0, 8],
              },
            ],
          ],
        },
        layout: {
          hLineWidth: (_i: number) => 1,
          vLineWidth: () => 0,
          hLineColor: () => "#999999",
          paddingBottom: () => 4,
        },
        margin: [0, 0, 0, 20],
      },

      // DATE + TO
      {
        columns: [
          { text: "To,", fontSize: 11, width: "*" },
          { text: `Date: ${data.billDate}`, fontSize: 11, alignment: "right" as const, width: 130 },
        ],
        margin: [0, 0, 0, 2],
      },
      ...(data.invoiceNo
        ? [{ text: `Invoice No: ${data.invoiceNo}`, fontSize: 11, bold: true, margin: [0, 0, 0, 2] as [number, number, number, number] }]
        : []),
      { text: data.tenantName, fontSize: 11, bold: true, margin: [0, 0, 0, 2] },
      { text: tenantAddr, fontSize: 10, color: "#444444", margin: [0, 0, 0, 18] },

      // BILL TITLE
      {
        table: {
          widths: ["*"],
          body: [
            [
              {
                text: `WATER BILL FOR THE MONTH OF ${monthName}, ${data.year}.`,
                fontSize: 12,
                bold: true,
                italics: true,
                alignment: "center",
                fillColor: "#f3f4f6",
                margin: [0, 4, 0, 4],
              },
            ],
          ],
        },
        layout: {
          hLineWidth: () => 0.5,
          vLineWidth: () => 0.5,
          hLineColor: () => "#cccccc",
          vLineColor: () => "#cccccc",
        },
        margin: [0, 0, 0, 16],
      },

      // WATER CHARGES ROW
      {
        table: {
          widths: ["*", 15, 130],
          body: [
            [
              noBorder({ text: "Water charges", fontSize: 11 }),
              noBorder({ text: "=", fontSize: 11, alignment: "center" }),
              noBorder({ text: `Rs. ${formatInvoiceAmount(data.waterCharges)}`, fontSize: 11, alignment: "right" }),
            ],
          ],
        },
        layout: { hLineWidth: () => 0, vLineWidth: () => 0 },
        margin: [0, 0, 0, 6],
      },

      // Horizontal line
      { canvas: [{ type: "line", x1: 0, y1: 0, x2: 495, y2: 0, lineWidth: 0.5, lineColor: "#999999" }], margin: [0, 4, 0, 12] },

      // NET PAYABLE
      {
        margin: [0, 12, 0, 30] as [number, number, number, number],
        table: {
          widths: ["*", 170],
          body: [
            [
              {
                text: "Net amt. payable",
                fontSize: 13,
                bold: true,
                alignment: "right",
                margin: [0, 6, 10, 6],
                border: [false, false, false, false],
              },
              {
                text: `Rs. ${formatInvoiceAmount(data.netPayable)}`,
                fontSize: 14,
                bold: true,
                alignment: "center",
                margin: [0, 6, 0, 6],
                fillColor: "#f0fdf4",
              },
            ],
          ],
        },
        layout: {
          hLineWidth: (_i: number, _node: unknown) => 1,
          vLineWidth: (i: number) => (i === 0 ? 0 : 1),
          hLineColor: () => "#16a34a",
          vLineColor: () => "#16a34a",
          paddingTop: () => 2,
          paddingBottom: () => 2,
          paddingLeft: () => 8,
          paddingRight: () => 8,
        },
      },

      // CLOSING
      { text: "Thanking you,", fontSize: 11, margin: [0, 0, 0, 10] },

      ...(data.senderSignature
        ? [{ image: data.senderSignature, width: 120, height: 50, margin: [0, 0, 0, 5] as [number, number, number, number] }]
        : [{ text: "", margin: [0, 0, 0, 20] as [number, number, number, number] }]
      ),

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
