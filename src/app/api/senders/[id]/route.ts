import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { updateSenderSchema, formatZodError } from "@/lib/validations";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const raw = await request.json();
  const result = updateSenderSchema.safeParse(raw);

  if (!result.success) {
    return NextResponse.json(
      { error: formatZodError(result.error) },
      { status: 400 }
    );
  }

  const data = result.data;
  console.log("Updating sender:", id, "buildingIds:", data.buildingIds);

  const sender = await prisma.sender.update({
    where: { id },
    data: {
      name: data.name,
      gstNumber: data.gstNumber || "",
      signature: data.signature !== undefined ? data.signature : undefined,
    },
  });

  // Update building assignments if provided
  if (data.buildingIds) {
    // Remove all existing assignments
    await prisma.senderBuilding.deleteMany({ where: { senderId: id } });

    // Create new assignments
    if (data.buildingIds.length > 0) {
      await prisma.senderBuilding.createMany({
        data: data.buildingIds.map((buildingId: string) => ({
          senderId: id,
          buildingId,
        })),
      });
    }
  }

  return NextResponse.json(sender);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.sender.update({
    where: { id },
    data: { isActive: false },
  });
  return NextResponse.json({ success: true });
}
