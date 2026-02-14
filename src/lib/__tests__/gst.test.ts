import { describe, it, expect } from "vitest";
import { calculateGST } from "../gst";

describe("calculateGST", () => {
  it("calculates GST for a standard rent amount", () => {
    const result = calculateGST(60637.5);
    expect(result.baseAmount).toBe(60637.5);
    expect(result.cgst).toBe(5457.38); // ceil(60637.5 * 0.09)
    expect(result.sgst).toBe(5457.37); // totalGST - cgst
    expect(result.totalGST).toBe(10914.75);
    expect(result.total).toBe(71552.25);
  });

  it("handles whole number rents", () => {
    const result = calculateGST(100000);
    expect(result.cgst).toBe(9000);
    expect(result.sgst).toBe(9000);
    expect(result.total).toBe(118000);
  });

  it("handles zero rent", () => {
    const result = calculateGST(0);
    expect(result.cgst).toBe(0);
    expect(result.sgst).toBe(0);
    expect(result.total).toBe(0);
  });

  it("handles small amounts without floating-point drift", () => {
    const result = calculateGST(1);
    expect(result.cgst).toBe(0.09);
    expect(result.sgst).toBe(0.09);
    expect(result.total).toBe(1.18);
  });

  it("ensures total = baseAmount + cgst + sgst", () => {
    const amounts = [342233, 60637.5, 12345.67, 99999.99, 1, 100];
    for (const amount of amounts) {
      const result = calculateGST(amount);
      const expectedTotal = Math.round((amount + result.cgst + result.sgst) * 100) / 100;
      expect(result.total).toBe(expectedTotal);
    }
  });

  it("accepts custom GST rates", () => {
    const result = calculateGST(10000, 5, 5);
    expect(result.cgst).toBe(500);
    expect(result.sgst).toBe(500);
    expect(result.total).toBe(11000);
  });
});
