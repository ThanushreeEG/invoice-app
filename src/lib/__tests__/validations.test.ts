import { describe, it, expect } from "vitest";
import {
  createTenantSchema,
  createSenderSchema,
  createBuildingSchema,
  createInvoiceSchema,
  updateSettingsSchema,
} from "../validations";

describe("createTenantSchema", () => {
  it("accepts valid tenant data", () => {
    const result = createTenantSchema.safeParse({
      name: "Test Tenant",
      email: "test@example.com",
      propertyAddress: "123 Main St",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing name", () => {
    const result = createTenantSchema.safeParse({
      name: "",
      email: "test@example.com",
      propertyAddress: "123 Main St",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid email", () => {
    const result = createTenantSchema.safeParse({
      name: "Test",
      email: "not-an-email",
      propertyAddress: "123 Main St",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing property address", () => {
    const result = createTenantSchema.safeParse({
      name: "Test",
      email: "test@example.com",
      propertyAddress: "",
    });
    expect(result.success).toBe(false);
  });
});

describe("createSenderSchema", () => {
  it("accepts valid sender", () => {
    const result = createSenderSchema.safeParse({ name: "Sender Name" });
    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = createSenderSchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
  });
});

describe("createBuildingSchema", () => {
  it("accepts valid building", () => {
    const result = createBuildingSchema.safeParse({ name: "S.V.TOWERS" });
    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = createBuildingSchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
  });
});

describe("createInvoiceSchema", () => {
  it("accepts valid invoice data", () => {
    const result = createInvoiceSchema.safeParse({
      senderId: "sender-1",
      buildingId: "building-1",
      tenants: [
        {
          tenantId: "tenant-1",
          baseRent: 60000,
          invoiceNumber: "47",
          month: "JANUARY",
          year: 2026,
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid month", () => {
    const result = createInvoiceSchema.safeParse({
      senderId: "sender-1",
      buildingId: "building-1",
      tenants: [
        {
          tenantId: "tenant-1",
          baseRent: 60000,
          invoiceNumber: "47",
          month: "INVALID",
          year: 2026,
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("rejects zero base rent", () => {
    const result = createInvoiceSchema.safeParse({
      senderId: "sender-1",
      buildingId: "building-1",
      tenants: [
        {
          tenantId: "tenant-1",
          baseRent: 0,
          invoiceNumber: "47",
          month: "JANUARY",
          year: 2026,
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty tenants array", () => {
    const result = createInvoiceSchema.safeParse({
      senderId: "sender-1",
      buildingId: "building-1",
      tenants: [],
    });
    expect(result.success).toBe(false);
  });
});

describe("updateSettingsSchema", () => {
  it("accepts valid settings", () => {
    const result = updateSettingsSchema.safeParse({
      smtpUser: "test@gmail.com",
      smtpPort: 587,
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid port", () => {
    const result = updateSettingsSchema.safeParse({
      smtpPort: 99999,
    });
    expect(result.success).toBe(false);
  });

  it("accepts empty email string", () => {
    const result = updateSettingsSchema.safeParse({
      senderEmail: "",
    });
    expect(result.success).toBe(true);
  });
});
