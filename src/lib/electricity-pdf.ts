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

export interface ElectricityBillData {
  senderName: string;
  buildingName: string;
  senderAddress: string;
  senderSignature?: string;
  tenantName: string;
  tenantAddress: string;
  month: string;
  year: number;
  billDate: string;
  openingReading: number;
  closingReading: number;
  unitsConsumed: number;
  multiplier: number;
  totalUnitsConsumed: number;
  miscUnits: number;
  totalUnitsCharged: number;
  ratePerUnit: number;
  totalAmount: number;
  minChargeUnits: number;
  kva: number;
  minimumCharge: number;
  bwssbCharges: number;
  maintenance: number;
  netPayable: number;
}

// Split address into lines by newline
function addressLines(addr: string): string[] {
  if (addr.includes("\n")) {
    return addr.split("\n").map((l) => l.trim()).filter(Boolean);
  }
  return [addr.trim()];
}

// No-border cell helper for tables
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function noBorder(content: Record<string, any>): any {
  return { ...content, border: [false, false, false, false] };
}

export async function generateElectricityBillPDF(data: ElectricityBillData): Promise<Buffer> {
  const printer = new PdfPrinter(fonts);

  const senderLines = addressLines(data.senderAddress);
  const tenantAddr = data.tenantAddress.replace(/\n/g, " ").replace(/\s+/g, " ").trim();
  const monthName = data.month.charAt(0) + data.month.slice(1).toUpperCase();

  // Sender address centered lines
  const senderAddrContent = senderLines.map((line) => ({
    text: line,
    fontSize: 10,
    alignment: "center" as const,
    margin: [0, 1, 0, 1] as [number, number, number, number],
  }));

  // Build additional charges rows for the charges table
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chargeRows: any[][] = [
    [
      noBorder({ text: `Minimum Amount charged ${data.minChargeUnits} x ${data.kva} KVA`, fontSize: 10 }),
      noBorder({ text: "=", fontSize: 10, alignment: "center" }),
      noBorder({ text: `Rs. ${formatInvoiceAmount(data.minimumCharge)}`, fontSize: 10, alignment: "right" }),
    ],
  ];
  if (data.bwssbCharges > 0) {
    chargeRows.push([
      noBorder({ text: "BWSSB charges", fontSize: 10 }),
      noBorder({ text: "=", fontSize: 10, alignment: "center" }),
      noBorder({ text: `Rs. ${formatInvoiceAmount(data.bwssbCharges)}`, fontSize: 10, alignment: "right" }),
    ]);
  }
  if (data.maintenance > 0) {
    chargeRows.push([
      noBorder({ text: "Maintenance charges", fontSize: 10 }),
      noBorder({ text: "=", fontSize: 10, alignment: "center" }),
      noBorder({ text: `Rs. ${formatInvoiceAmount(data.maintenance)}`, fontSize: 10, alignment: "right" }),
    ]);
  }

  const docDefinition: TDocumentDefinitions = {
    pageSize: "A4",
    pageMargins: [50, 40, 50, 40],
    content: [
      // ════════════════════════════════════════
      // HEADER — Sender info with bottom border
      // ════════════════════════════════════════
      {
        table: {
          widths: ["*"],
          body: [
            [
              {
                stack: [
                  { text: data.senderName, fontSize: 16, bold: true, alignment: "center" },
                  { text: data.buildingName, fontSize: 13, bold: true, alignment: "center", margin: [0, 3, 0, 3] },
                  ...senderAddrContent,
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

      // ════════════════════════════════════════
      // DATE + TO / TENANT
      // ════════════════════════════════════════
      {
        columns: [
          { text: "To,", fontSize: 11, width: "*" },
          { text: `Date: ${data.billDate}`, fontSize: 11, alignment: "right" as const, width: 130 },
        ],
        margin: [0, 0, 0, 2],
      },
      { text: data.tenantName, fontSize: 11, bold: true, margin: [0, 0, 0, 2] },
      { text: tenantAddr, fontSize: 10, color: "#444444", margin: [0, 0, 0, 18] },

      // ════════════════════════════════════════
      // BILL TITLE
      // ════════════════════════════════════════
      {
        table: {
          widths: ["*"],
          body: [
            [
              {
                text: `ELECTRICITY/WATER BILL FOR THE MONTH OF ${monthName} ${data.year}`,
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

      // ════════════════════════════════════════
      // READINGS TABLE
      // ════════════════════════════════════════
      {
        table: {
          widths: ["*", 15, 130],
          body: [
            [
              noBorder({ text: "Opening reading", fontSize: 11 }),
              noBorder({ text: ":", fontSize: 11 }),
              noBorder({ text: formatInvoiceAmount(data.openingReading), fontSize: 11, alignment: "right" }),
            ],
            [
              noBorder({ text: "Closing reading", fontSize: 11 }),
              noBorder({ text: ":", fontSize: 11 }),
              noBorder({ text: formatInvoiceAmount(data.closingReading), fontSize: 11, alignment: "right" }),
            ],
          ],
        },
        layout: { hLineWidth: () => 0, vLineWidth: () => 0 },
        margin: [0, 0, 0, 0],
      },

      // ── Total consumed with top/bottom lines ──
      { canvas: [{ type: "line", x1: 330, y1: 0, x2: 495, y2: 0, lineWidth: 0.5, lineColor: "#999999" }], margin: [0, 4, 0, 2] },
      {
        table: {
          widths: ["*", 15, 130],
          body: [
            [
              noBorder({ text: "Total consumed", fontSize: 11, bold: true }),
              noBorder({ text: ":", fontSize: 11 }),
              noBorder({ text: formatInvoiceAmount(data.unitsConsumed), fontSize: 11, bold: true, alignment: "right" }),
            ],
          ],
        },
        layout: { hLineWidth: () => 0, vLineWidth: () => 0 },
      },
      { canvas: [{ type: "line", x1: 330, y1: 0, x2: 495, y2: 0, lineWidth: 0.5, lineColor: "#999999" }], margin: [0, 2, 0, 12] },

      // ════════════════════════════════════════
      // UNITS BREAKDOWN TABLE
      // ════════════════════════════════════════
      {
        table: {
          widths: ["*", 15, 130],
          body: [
            [
              noBorder({ text: "No.of Units consumed for the month", fontSize: 11 }),
              noBorder({ text: ":", fontSize: 11 }),
              noBorder({ text: formatInvoiceAmount(data.totalUnitsConsumed), fontSize: 11, alignment: "right" }),
            ],
            [
              noBorder({ text: "Misc. Units charged for the month", fontSize: 11 }),
              noBorder({ text: ":", fontSize: 11 }),
              noBorder({ text: data.miscUnits > 0 ? formatInvoiceAmount(data.miscUnits) : "-", fontSize: 11, alignment: "right" }),
            ],
            [
              noBorder({ text: "Total No. of Units charged", fontSize: 11 }),
              noBorder({ text: ":", fontSize: 11 }),
              noBorder({ text: formatInvoiceAmount(data.totalUnitsCharged), fontSize: 11, alignment: "right" }),
            ],
            [
              noBorder({ text: "Amount charged per unit", fontSize: 11 }),
              noBorder({ text: ":", fontSize: 11 }),
              noBorder({ text: `Rs. ${data.ratePerUnit}/-`, fontSize: 11, alignment: "right" }),
            ],
          ],
        },
        layout: { hLineWidth: () => 0, vLineWidth: () => 0 },
        margin: [0, 0, 0, 6],
      },

      // ════════════════════════════════════════
      // TOTAL — highlighted row
      // ════════════════════════════════════════
      {
        table: {
          widths: ["*", 150],
          body: [
            [
              { text: "TOTAL", fontSize: 12, bold: true, alignment: "right", fillColor: "#f3f4f6", margin: [0, 4, 8, 4] },
              { text: `Rs. ${formatInvoiceAmount(data.totalAmount)}`, fontSize: 12, bold: true, alignment: "right", fillColor: "#f3f4f6", margin: [0, 4, 0, 4] },
            ],
          ],
        },
        layout: {
          hLineWidth: () => 0.5,
          vLineWidth: () => 0,
          hLineColor: () => "#cccccc",
        },
        margin: [0, 4, 0, 14],
      },

      // ════════════════════════════════════════
      // ADDITIONAL CHARGES
      // ════════════════════════════════════════
      {
        table: {
          widths: ["*", 15, 130],
          body: chargeRows,
        },
        layout: { hLineWidth: () => 0, vLineWidth: () => 0 },
        margin: [0, 0, 0, 6],
      },

      // ════════════════════════════════════════
      // NET PAYABLE — boxed and bold
      // ════════════════════════════════════════
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

      // ════════════════════════════════════════
      // CLOSING
      // ════════════════════════════════════════
      { text: "Thanking you,", fontSize: 11, margin: [0, 0, 0, 10] },

      // ── Signature image (if exists) ──
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
