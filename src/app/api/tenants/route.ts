import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createTenantSchema, formatZodError } from "@/lib/validations";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const buildingId = searchParams.get("buildingId");

  const where: { isActive: boolean; buildingId?: string } = { isActive: true };
  if (buildingId) {
    where.buildingId = buildingId;
  }

  const tenants = await prisma.tenant.findMany({
    where,
    orderBy: { name: "asc" },
  });
  return NextResponse.json(tenants);
}

export async function POST(request: Request) {
  const raw = await request.json();
  const result = createTenantSchema.safeParse(raw);

  if (!result.success) {
    return NextResponse.json(
      { error: formatZodError(result.error) },
      { status: 400 }
    );
  }

  const data = result.data;
  const tenant = await prisma.tenant.create({
    data: {
      name: data.name,
      email: data.email,
      ccEmails: data.ccEmails,
      phone: data.phone,
      propertyAddress: data.propertyAddress,
      gstNumber: data.gstNumber,
      defaultRent: data.defaultRent,
      defaultDescription: data.defaultDescription,
      elecMultiplier: data.elecMultiplier,
      elecMinChargeUnits: data.elecMinChargeUnits,
      elecKVA: data.elecKVA,
      elecBWSSB: data.elecBWSSB,
      elecMaintenance: data.elecMaintenance,
      elecDgMaintenance: data.elecDgMaintenance,
      elecWaterCharges: data.elecWaterCharges,
      buildingId: data.buildingId || null,
    },
  });

  return NextResponse.json(tenant, { status: 201 });
}
