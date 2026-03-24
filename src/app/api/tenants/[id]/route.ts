import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
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
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
      defaultDescription: body.defaultDescription || "Amount Charged towards rental of the premises",
      elecMultiplier: body.elecMultiplier ? parseInt(body.elecMultiplier) : 15,
      elecMinChargeUnits: body.elecMinChargeUnits ? parseInt(body.elecMinChargeUnits) : 0,
      elecKVA: body.elecKVA ? parseInt(body.elecKVA) : 375,
      elecBWSSB: body.elecBWSSB ? parseFloat(body.elecBWSSB) : 0,
      elecMaintenance: body.elecMaintenance ? parseFloat(body.elecMaintenance) : 0,
      elecDgMaintenance: body.elecDgMaintenance ? parseFloat(body.elecDgMaintenance) : 0,
      elecWaterCharges: body.elecWaterCharges ? parseFloat(body.elecWaterCharges) : 0,
      buildingId: body.buildingId || null,
    },
  });

  return NextResponse.json(tenant);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await prisma.tenant.update({
    where: { id },
    data: { isActive: false },
  });
  return NextResponse.json({ success: true });
}
