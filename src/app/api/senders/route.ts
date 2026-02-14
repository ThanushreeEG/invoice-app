import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSenderSchema, formatZodError } from "@/lib/validations";

export async function GET() {
  const senders = await prisma.sender.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(senders);
}

export async function POST(request: Request) {
  const raw = await request.json();
  const result = createSenderSchema.safeParse(raw);

  if (!result.success) {
    return NextResponse.json(
      { error: formatZodError(result.error) },
      { status: 400 }
    );
  }

  const data = result.data;
  const sender = await prisma.sender.create({
    data: {
      name: data.name,
      gstNumber: data.gstNumber,
    },
  });

  return NextResponse.json(sender, { status: 201 });
}
