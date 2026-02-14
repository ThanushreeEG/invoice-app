import { prisma } from "./prisma";

export async function generateInvoiceNumber(senderId: string): Promise<{ number: string; nextNum: number }> {
  const sender = await prisma.sender.findUnique({ where: { id: senderId } });
  const num = sender?.nextInvoiceNum ?? 1;
  const invoiceNumber = `${num}`;

  return { number: invoiceNumber, nextNum: num + 1 };
}
