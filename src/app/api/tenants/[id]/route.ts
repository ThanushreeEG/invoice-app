import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const tenant = await prisma.tenant.findUnique({ where: { id } });
  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found." }, { status: 404 });
  }
  return NextResponse.json(tenant);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const tenant = await prisma.tenant.update({
    where: { id },
    data: {
      name: body.name,
      email: body.email || "",
      ccEmails: body.ccEmails || "",
      phone: body.phone || "",
      propertyAddress: body.propertyAddress,
      gstNumber: body.gstNumber || "",
      defaultRent: body.defaultRent ? parseFloat(body.defaultRent) : 0,
    },
  });

  return NextResponse.json(tenant);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.tenant.update({
    where: { id },
    data: { isActive: false },
  });
  return NextResponse.json({ success: true });
}
