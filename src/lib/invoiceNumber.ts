import { prisma } from "./prisma";

export async function generateInvoiceNumber(): Promise<{ number: string; nextNum: number }> {
  const settings = await prisma.settings.findUnique({ where: { id: "default" } });
  const num = settings?.nextInvoiceNum ?? 1;
  const invoiceNumber = `${num}`;

  return { number: invoiceNumber, nextNum: num + 1 };
}
