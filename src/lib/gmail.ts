import { prisma } from "./prisma";

async function getValidAccessToken(userId: string): Promise<{ accessToken: string; email: string }> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

  // If token is still valid (with 5 min buffer), use it
  if (user.tokenExpiresAt && user.tokenExpiresAt > new Date(Date.now() + 5 * 60 * 1000)) {
    return { accessToken: user.accessToken, email: user.email };
  }

  // Refresh the token
  if (!user.refreshToken) {
    throw new Error("No refresh token available. Please sign out and sign in again.");
  }

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: user.refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    throw new Error("Failed to refresh Google token. Please sign out and sign in again.");
  }

  const data = await res.json();

  await prisma.user.update({
    where: { id: userId },
    data: {
      accessToken: data.access_token,
      tokenExpiresAt: new Date(Date.now() + data.expires_in * 1000),
    },
  });

  return { accessToken: data.access_token, email: user.email };
}

function buildMimeMessage({
  from,
  to,
  cc,
  subject,
  htmlBody,
  attachments,
}: {
  from: string;
  to: string;
  cc?: string;
  subject: string;
  htmlBody: string;
  attachments?: { filename: string; content: Buffer; contentType: string }[];
}): string {
  const boundary = `boundary_${Date.now()}`;
  const lines: string[] = [];

  lines.push(`From: ${from}`);
  lines.push(`To: ${to}`);
  if (cc) lines.push(`Cc: ${cc}`);
  lines.push(`Subject: ${subject}`);
  lines.push("MIME-Version: 1.0");
  lines.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
  lines.push("");

  // HTML body
  lines.push(`--${boundary}`);
  lines.push("Content-Type: text/html; charset=UTF-8");
  lines.push("");
  lines.push(htmlBody);

  // Attachments
  if (attachments) {
    for (const att of attachments) {
      lines.push(`--${boundary}`);
      lines.push(`Content-Type: ${att.contentType}; name="${att.filename}"`);
      lines.push("Content-Transfer-Encoding: base64");
      lines.push(`Content-Disposition: attachment; filename="${att.filename}"`);
      lines.push("");
      lines.push(att.content.toString("base64"));
    }
  }

  lines.push(`--${boundary}--`);

  return lines.join("\r\n");
}

async function sendViaGmailApi(
  userId: string,
  {
    to,
    cc,
    subject,
    htmlBody,
    senderName,
    attachments,
  }: {
    to: string;
    cc?: string;
    subject: string;
    htmlBody: string;
    senderName: string;
    attachments?: { filename: string; content: Buffer; contentType: string }[];
  }
) {
  const { accessToken, email } = await getValidAccessToken(userId);
  const from = senderName ? `"${senderName}" <${email}>` : email;

  const raw = buildMimeMessage({ from, to, cc, subject, htmlBody, attachments });
  const encodedMessage = Buffer.from(raw)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ raw: encodedMessage }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Gmail API error: ${error}`);
  }

  return await res.json();
}

// --- Public email functions ---

interface GmailInvoiceParams {
  userId: string;
  senderName: string;
  to: string;
  cc?: string;
  tenantName: string;
  invoiceNumber: string;
  totalAmount: string;
  month: string;
  year: number;
  pdfBuffer: Buffer;
}

export async function sendInvoiceEmailViaGmail(params: GmailInvoiceParams) {
  return sendViaGmailApi(params.userId, {
    to: params.to,
    cc: params.cc,
    subject: `Rent Invoice No.${params.invoiceNumber} - ${params.month} ${params.year}`,
    senderName: params.senderName,
    htmlBody: `
      <div style="font-family: Arial, sans-serif; max-width: 600px;">
        <p>Dear ${params.tenantName},</p>
        <p>Please find attached the rent invoice for the month of <strong>${params.month} ${params.year}</strong>.</p>
        <p><strong>Invoice Number:</strong> ${params.invoiceNumber}</p>
        <p><strong>Total Amount:</strong> ${params.totalAmount}</p>
        <br/>
        <p>Regards,<br/>${params.senderName}</p>
      </div>
    `,
    attachments: [
      {
        filename: `Invoice-${params.invoiceNumber}.pdf`,
        content: params.pdfBuffer,
        contentType: "application/pdf",
      },
    ],
  });
}

interface GmailBillParams {
  userId: string;
  senderName: string;
  to: string;
  cc?: string;
  tenantName: string;
  month: string;
  year: number;
  netPayable: string;
  pdfBuffer: Buffer;
}

export async function sendElectricityBillEmailViaGmail(params: GmailBillParams) {
  return sendViaGmailApi(params.userId, {
    to: params.to,
    cc: params.cc,
    subject: `Electricity Bill - ${params.month} ${params.year}`,
    senderName: params.senderName,
    htmlBody: `
      <div style="font-family: Arial, sans-serif; max-width: 600px;">
        <p>Dear ${params.tenantName},</p>
        <p>Please find attached the electricity bill for the month of <strong>${params.month} ${params.year}</strong>.</p>
        <p><strong>Net Payable:</strong> ${params.netPayable}</p>
        <br/>
        <p>Regards,<br/>${params.senderName}</p>
      </div>
    `,
    attachments: [
      {
        filename: `Electricity-Bill-${params.month}-${params.year}.pdf`,
        content: params.pdfBuffer,
        contentType: "application/pdf",
      },
    ],
  });
}

export async function sendWaterBillEmailViaGmail(params: GmailBillParams) {
  return sendViaGmailApi(params.userId, {
    to: params.to,
    cc: params.cc,
    subject: `Water Bill - ${params.month} ${params.year}`,
    senderName: params.senderName,
    htmlBody: `
      <div style="font-family: Arial, sans-serif; max-width: 600px;">
        <p>Dear ${params.tenantName},</p>
        <p>Please find attached the water bill for the month of <strong>${params.month} ${params.year}</strong>.</p>
        <p><strong>Net Payable:</strong> ${params.netPayable}</p>
        <br/>
        <p>Regards,<br/>${params.senderName}</p>
      </div>
    `,
    attachments: [
      {
        filename: `Water-Bill-${params.month}-${params.year}.pdf`,
        content: params.pdfBuffer,
        contentType: "application/pdf",
      },
    ],
  });
}

export async function sendTestEmailViaGmail(userId: string, senderName: string) {
  const { email } = await getValidAccessToken(userId);
  return sendViaGmailApi(userId, {
    to: email,
    subject: "Test Email - SV Towers Finance Manager",
    senderName,
    htmlBody: "<p>This is a test email from SV Towers Finance Manager. Your Gmail integration is working correctly!</p>",
  });
}
