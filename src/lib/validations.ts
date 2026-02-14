import { z } from "zod";

const MONTHS = [
  "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
  "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER",
] as const;

// ── Tenants ──

export const createTenantSchema = z.object({
  name: z.string().min(1, "Name is required.").max(200),
  email: z.string().email("Invalid email address."),
  phone: z.string().max(20).optional().default(""),
  propertyAddress: z.string().min(1, "Property address is required.").max(500),
  gstNumber: z.string().max(50).optional().default(""),
  defaultRent: z.coerce.number().min(0).optional().default(0),
});

export const updateTenantSchema = createTenantSchema.partial();

// ── Senders ──

export const createSenderSchema = z.object({
  name: z.string().min(1, "Name is required.").max(200),
  gstNumber: z.string().max(50).optional().default(""),
});

export const updateSenderSchema = z.object({
  name: z.string().min(1, "Name is required.").max(200),
  gstNumber: z.string().max(50).optional().default(""),
  signature: z.string().optional(),
});

// ── Buildings ──

export const createBuildingSchema = z.object({
  name: z.string().min(1, "Building name is required.").max(200),
  address: z.string().max(500).optional().default(""),
});

export const updateBuildingSchema = z.object({
  name: z.string().min(1, "Building name is required.").max(200),
  address: z.string().max(500).optional(),
});

// ── Invoices ──

const invoiceTenantSchema = z.object({
  tenantId: z.string().min(1, "Tenant ID is required."),
  baseRent: z.coerce.number().positive("Base rent must be greater than 0."),
  description: z.string().max(500).optional(),
  invoiceNumber: z.string().min(1, "Invoice number is required.").max(50),
  month: z.enum(MONTHS, { message: "Invalid month." }),
  year: z.coerce.number().int().min(2000).max(2100),
});

export const createInvoiceSchema = z.object({
  senderId: z.string().min(1, "Please select a sender (landlord)."),
  buildingId: z.string().min(1, "Please select a building."),
  tenants: z.array(invoiceTenantSchema).min(1, "Please select at least one tenant."),
});

export const updateInvoiceSchema = z.object({
  invoiceNumber: z.string().min(1, "Invoice number is required.").max(50),
  senderId: z.string().min(1),
  buildingId: z.string().min(1),
  month: z.enum(MONTHS, { message: "Invalid month." }),
  year: z.coerce.number().int().min(2000).max(2100),
  baseRent: z.coerce.number().positive("Base rent must be greater than 0."),
  description: z.string().max(500).optional(),
});

// ── Bulk Send ──

export const bulkSendSchema = z.object({
  invoiceIds: z.array(z.string().min(1)).min(1, "No invoices selected."),
});

// ── Settings ──

export const updateSettingsSchema = z.object({
  senderPhone: z.string().max(20).optional(),
  senderEmail: z.string().email("Invalid email.").or(z.literal("")).optional(),
  smtpHost: z.string().max(100).optional(),
  smtpPort: z.coerce.number().int().min(1).max(65535).optional(),
  smtpUser: z.string().max(200).optional(),
  smtpPass: z.string().max(200).optional(),
  paymentTerms: z.string().max(500).optional(),
  bankDetails: z.string().max(500).optional(),
});

// ── Helpers ──

export function formatZodError(error: z.ZodError): string {
  return error.issues.map((i) => i.message).join(", ");
}
