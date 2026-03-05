import nodemailer from "nodemailer";

interface EmailSettings {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  senderName: string;
}

interface SendInvoiceEmailParams {
  settings: EmailSettings;
  to: string;
  cc?: string;
  tenantName: string;
  invoiceNumber: string;
  totalAmount: string;
  month: string;
  year: number;
  pdfBuffer: Buffer;
}

export async function sendInvoiceEmail({
  settings,
  to,
  cc,
  tenantName,
  invoiceNumber,
  totalAmount,
  month,
  year,
  pdfBuffer,
}: SendInvoiceEmailParams) {
  const transporter = nodemailer.createTransport({
    host: settings.smtpHost,
    port: settings.smtpPort,
    secure: settings.smtpPort === 465,
    auth: {
      user: settings.smtpUser,
      pass: settings.smtpPass,
    },
  });

  const info = await transporter.sendMail({
    from: `"${settings.senderName}" <${settings.smtpUser}>`,
    to,
    ...(cc ? { cc } : {}),
    subject: `Rent Invoice No.${invoiceNumber} - ${month} ${year}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px;">
        <p>Dear ${tenantName},</p>
        <p>Please find attached the rent invoice for the month of <strong>${month} ${year}</strong>.</p>
        <p><strong>Invoice Number:</strong> ${invoiceNumber}</p>
        <p><strong>Total Amount:</strong> ${totalAmount}</p>
        <br/>
        <p>Regards,<br/>${settings.senderName}</p>
      </div>
    `,
    attachments: [
      {
        filename: `Invoice-${invoiceNumber}.pdf`,
        content: pdfBuffer,
        contentType: "application/pdf",
      },
    ],
  });

  return info;
}

interface SendElectricityBillEmailParams {
  settings: EmailSettings;
  to: string;
  cc?: string;
  tenantName: string;
  month: string;
  year: number;
  netPayable: string;
  pdfBuffer: Buffer;
}

export async function sendElectricityBillEmail({
  settings,
  to,
  cc,
  tenantName,
  month,
  year,
  netPayable,
  pdfBuffer,
}: SendElectricityBillEmailParams) {
  const transporter = nodemailer.createTransport({
    host: settings.smtpHost,
    port: settings.smtpPort,
    secure: settings.smtpPort === 465,
    auth: {
      user: settings.smtpUser,
      pass: settings.smtpPass,
    },
  });

  const info = await transporter.sendMail({
    from: `"${settings.senderName}" <${settings.smtpUser}>`,
    to,
    ...(cc ? { cc } : {}),
    subject: `Electricity Bill - ${month} ${year}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px;">
        <p>Dear ${tenantName},</p>
        <p>Please find attached the electricity bill for the month of <strong>${month} ${year}</strong>.</p>
        <p><strong>Net Payable:</strong> ${netPayable}</p>
        <br/>
        <p>Regards,<br/>${settings.senderName}</p>
      </div>
    `,
    attachments: [
      {
        filename: `Electricity-Bill-${month}-${year}.pdf`,
        content: pdfBuffer,
        contentType: "application/pdf",
      },
    ],
  });

  return info;
}

export async function sendTestEmail(settings: EmailSettings) {
  const transporter = nodemailer.createTransport({
    host: settings.smtpHost,
    port: settings.smtpPort,
    secure: settings.smtpPort === 465,
    auth: {
      user: settings.smtpUser,
      pass: settings.smtpPass,
    },
  });

  await transporter.sendMail({
    from: `"${settings.senderName}" <${settings.smtpUser}>`,
    to: settings.smtpUser,
    subject: "Test Email - Invoice Manager",
    html: "<p>This is a test email from Invoice Manager. Your email settings are working correctly!</p>",
  });
}
