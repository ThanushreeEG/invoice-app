import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { sendTestEmailViaGmail } from "@/lib/gmail";

export async function POST() {
  const session = await requireAuth();

  try {
    await sendTestEmailViaGmail(session.user.id, "SV Towers Finance Manager");
    return NextResponse.json({
      success: true,
      message: "Test email sent! Check your inbox.",
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to send test email. (${msg})` },
      { status: 500 }
    );
  }
}
