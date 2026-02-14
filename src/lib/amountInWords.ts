const ones = [
  "", "ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN", "EIGHT", "NINE",
  "TEN", "ELEVEN", "TWELVE", "THIRTEEN", "FOURTEEN", "FIFTEEN", "SIXTEEN",
  "SEVENTEEN", "EIGHTEEN", "NINETEEN",
];

const tens = [
  "", "", "TWENTY", "THIRTY", "FORTY", "FIFTY", "SIXTY", "SEVENTY", "EIGHTY", "NINETY",
];

function twoDigits(n: number): string {
  if (n < 20) return ones[n];
  const t = Math.floor(n / 10);
  const o = n % 10;
  return tens[t] + (o ? " " + ones[o] : "");
}

function threeDigits(n: number): string {
  if (n === 0) return "";
  const h = Math.floor(n / 100);
  const rest = n % 100;
  if (h > 0 && rest > 0) return ones[h] + " HUNDRED " + twoDigits(rest);
  if (h > 0) return ones[h] + " HUNDRED";
  return twoDigits(rest);
}

export function amountInWords(amount: number): string {
  if (amount === 0) return "ZERO ONLY";

  const rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);

  // Indian numbering: units, thousands, lakhs, crores
  let remaining = rupees;
  const crores = Math.floor(remaining / 10000000);
  remaining %= 10000000;
  const lakhs = Math.floor(remaining / 100000);
  remaining %= 100000;
  const thousands = Math.floor(remaining / 1000);
  remaining %= 1000;
  const hundreds = remaining;

  const parts: string[] = [];
  if (crores > 0) parts.push(twoDigits(crores) + " CRORE");
  if (lakhs > 0) parts.push(twoDigits(lakhs) + " LAKH");
  if (thousands > 0) parts.push(twoDigits(thousands) + " THOUSAND");
  if (hundreds > 0) parts.push(threeDigits(hundreds));

  let result = parts.join(" ");

  if (paise > 0) {
    result += " " + twoDigits(paise) + " PAISE";
  }

  return result.trim() + " ONLY";
}
