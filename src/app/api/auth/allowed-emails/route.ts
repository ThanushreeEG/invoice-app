import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function GET() {
  const session = await requireAuth();
  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const emails = await prisma.allowedEmail.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(emails);
}

export async function POST(request: Request) {
  const session = await requireAuth();
  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { email } = await request.json();
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  }

  const existing = await prisma.allowedEmail.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (existing) {
    return NextResponse.json({ error: "Email already in the list" }, { status: 400 });
  }

  const allowed = await prisma.allowedEmail.create({
    data: {
      email: email.toLowerCase(),
      addedBy: session.user.email,
    },
  });

  return NextResponse.json(allowed, { status: 201 });
}

export async function DELETE(request: Request) {
  const session = await requireAuth();
  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await request.json();
  await prisma.allowedEmail.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
