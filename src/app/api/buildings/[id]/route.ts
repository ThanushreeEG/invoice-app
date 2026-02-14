import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { updateBuildingSchema, formatZodError } from "@/lib/validations";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const raw = await request.json();
  const result = updateBuildingSchema.safeParse(raw);

  if (!result.success) {
    return NextResponse.json(
      { error: formatZodError(result.error) },
      { status: 400 }
    );
  }

  const data = result.data;
  const building = await prisma.building.update({
    where: { id },
    data: {
      name: data.name,
      address: data.address !== undefined ? data.address : undefined,
    },
  });

  return NextResponse.json(building);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.building.update({
    where: { id },
    data: { isActive: false },
  });
  return NextResponse.json({ success: true });
}
