import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createBuildingSchema, formatZodError } from "@/lib/validations";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const buildings = await prisma.building.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(buildings);
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const raw = await request.json();
  const result = createBuildingSchema.safeParse(raw);

  if (!result.success) {
    return NextResponse.json(
      { error: formatZodError(result.error) },
      { status: 400 }
    );
  }

  const data = result.data;
  const building = await prisma.building.create({
    data: {
      name: data.name,
      address: data.address,
    },
  });

  return NextResponse.json(building, { status: 201 });
}
