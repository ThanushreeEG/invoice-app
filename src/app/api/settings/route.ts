import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { encrypt, decrypt } from "@/lib/crypto";
import { updateSettingsSchema, formatZodError } from "@/lib/validations";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let settings = await prisma.settings.findUnique({ where: { id: "default" } });
  if (!settings) {
    settings = await prisma.settings.create({ data: { id: "default" } });
  }
  return NextResponse.json({
    ...settings,
    smtpPass: settings.smtpPass ? "••••••••" : "",
  });
}

export async function PUT(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const raw = await request.json();

  // Remove non-updatable fields
  delete raw.id;
  delete raw.createdAt;
  delete raw.updatedAt;

  // If password is masked, don't update it
  const passwordMasked = raw.smtpPass === "••••••••";
  if (passwordMasked) {
    delete raw.smtpPass;
  }

  const result = updateSettingsSchema.safeParse(raw);
  if (!result.success) {
    return NextResponse.json(
      { error: formatZodError(result.error) },
      { status: 400 }
    );
  }

  const data = result.data;

  // Encrypt the SMTP password before storing
  if (data.smtpPass && !passwordMasked) {
    data.smtpPass = encrypt(data.smtpPass);
  }

  const settings = await prisma.settings.upsert({
    where: { id: "default" },
    update: data,
    create: { id: "default", ...data },
  });

  return NextResponse.json({
    ...settings,
    smtpPass: settings.smtpPass ? "••••••••" : "",
  });
}

/**
 * Helper to get settings with decrypted SMTP password.
 * For internal use by email-sending routes.
 */
export async function getDecryptedSettings() {
  const settings = await prisma.settings.findUnique({ where: { id: "default" } });
  if (!settings) return null;
  return {
    ...settings,
    smtpPass: decrypt(settings.smtpPass),
  };
}
