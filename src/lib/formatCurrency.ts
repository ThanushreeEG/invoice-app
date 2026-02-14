export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

// Format like dad's invoices: 60,637:50
export function formatInvoiceAmount(amount: number): string {
  const parts = amount.toFixed(2).split(".");
  const intPart = parseInt(parts[0]).toLocaleString("en-IN");
  return intPart + ":" + parts[1];
}
