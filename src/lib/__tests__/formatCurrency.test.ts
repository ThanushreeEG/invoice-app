import { describe, it, expect } from "vitest";
import { formatCurrency, formatInvoiceAmount } from "../formatCurrency";

describe("formatCurrency", () => {
  it("formats with INR symbol and Indian grouping", () => {
    const result = formatCurrency(71552.25);
    // Intl format may vary slightly by environment, check key parts
    expect(result).toContain("71,552.25");
  });

  it("formats zero", () => {
    const result = formatCurrency(0);
    expect(result).toContain("0.00");
  });

  it("formats lakhs", () => {
    const result = formatCurrency(403834.94);
    expect(result).toContain("4,03,834.94");
  });
});

describe("formatInvoiceAmount", () => {
  it("formats with colon separator (dad's format)", () => {
    expect(formatInvoiceAmount(60637.5)).toBe("60,637:50");
  });

  it("formats zero", () => {
    expect(formatInvoiceAmount(0)).toBe("0:00");
  });

  it("formats large amounts with Indian grouping", () => {
    expect(formatInvoiceAmount(403834.94)).toBe("4,03,834:94");
  });

  it("handles whole numbers", () => {
    expect(formatInvoiceAmount(1000)).toBe("1,000:00");
  });
});
