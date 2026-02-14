import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createTenantSchema, formatZodError } from "@/lib/validations";

export async function GET() {
  const tenants = await prisma.tenant.findMany({
    where: { isActive: true },
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
      phone: data.phone,
      propertyAddress: data.propertyAddress,
      gstNumber: data.gstNumber,
      defaultRent: data.defaultRent,
    },
  });

  return NextResponse.json(tenant, { status: 201 });
}
