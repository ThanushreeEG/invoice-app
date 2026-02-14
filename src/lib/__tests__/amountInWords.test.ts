import { describe, it, expect } from "vitest";
import { amountInWords } from "../amountInWords";

describe("amountInWords", () => {
  it("converts zero", () => {
    expect(amountInWords(0)).toBe("ZERO ONLY");
  });

  it("converts single digits", () => {
    expect(amountInWords(5)).toBe("FIVE ONLY");
  });

  it("converts teens", () => {
    expect(amountInWords(15)).toBe("FIFTEEN ONLY");
  });

  it("converts tens", () => {
    expect(amountInWords(50)).toBe("FIFTY ONLY");
  });

  it("converts hundreds", () => {
    expect(amountInWords(500)).toBe("FIVE HUNDRED ONLY");
  });

  it("converts thousands", () => {
    expect(amountInWords(5000)).toBe("FIVE THOUSAND ONLY");
  });

  it("converts lakhs (Indian numbering)", () => {
    expect(amountInWords(100000)).toBe("ONE LAKH ONLY");
    expect(amountInWords(250000)).toBe("TWO LAKH FIFTY THOUSAND ONLY");
  });

  it("converts crores (Indian numbering)", () => {
    expect(amountInWords(10000000)).toBe("ONE CRORE ONLY");
  });

  it("handles paise", () => {
    expect(amountInWords(71552.25)).toBe(
      "SEVENTY ONE THOUSAND FIVE HUNDRED FIFTY TWO TWENTY FIVE PAISE ONLY"
    );
  });

  it("handles complex amounts", () => {
    expect(amountInWords(403834.94)).toBe(
      "FOUR LAKH THREE THOUSAND EIGHT HUNDRED THIRTY FOUR NINETY FOUR PAISE ONLY"
    );
  });

  it("handles amount with zero rupees but paise", () => {
    expect(amountInWords(0.5)).toBe("FIFTY PAISE ONLY");
  });
});
