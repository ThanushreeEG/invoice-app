import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendTestEmail } from "@/lib/email";
import { decrypt } from "@/lib/crypto";

export async function POST() {
  const settings = await prisma.settings.findUnique({
    where: { id: "default" },
  });

  if (!settings || !settings.smtpUser || !settings.smtpPass) {
    return NextResponse.json(
      { error: "Please fill in your email settings first." },
      { status: 400 }
    );
  }

  try {
    await sendTestEmail({
      ...settings,
      smtpPass: decrypt(settings.smtpPass),
      senderName: "Invoice Manager",
    });
    return NextResponse.json({
      success: true,
      message: "Test email sent! Check your inbox.",
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to send test email. Check your settings. (${msg})` },
      { status: 500 }
    );
  }
}
