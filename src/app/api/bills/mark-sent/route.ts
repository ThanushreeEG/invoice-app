import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { formatZodError } from "@/lib/validations";

// Marks a bill as SENT after the user shared it outside the app (e.g. WhatsApp).
// The phone can't tell us whether the message was actually sent, so the user
// confirms it with a "Mark as sent" tap and we record it like an email send.

const markSentSchema = z.object({
  type: z.enum(["invoice", "electricity", "water"]),
  id: z.string().min(1),
});

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = markSentSchema.safeParse(await request.json().catch(() => null));
  if (!result.success) {
    return NextResponse.json({ error: formatZodError(result.error) }, { status: 400 });
  }

  const { type, id } = result.data;
  const data = { status: "SENT", sentAt: new Date() };
  // Only DRAFT/FAILED bills change; an already-sent bill keeps its original sentAt.
  const where = { id, status: { not: "SENT" } };

  const { count } =
    type === "invoice"
      ? await prisma.invoice.updateMany({ where, data })
      : type === "electricity"
        ? await prisma.electricityBill.updateMany({ where, data })
        : await prisma.waterBill.updateMany({ where, data });

  if (count === 0) {
    const exists =
      type === "invoice"
        ? await prisma.invoice.findUnique({ where: { id }, select: { id: true } })
        : type === "electricity"
          ? await prisma.electricityBill.findUnique({ where: { id }, select: { id: true } })
          : await prisma.waterBill.findUnique({ where: { id }, select: { id: true } });
    if (!exists) {
      return NextResponse.json({ error: "Bill not found." }, { status: 404 });
    }
  }

  return NextResponse.json({ success: true });
}
