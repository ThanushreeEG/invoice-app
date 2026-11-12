export type BillType = "invoice" | "electricity" | "water";

/** Records a bill as SENT after it was shared outside the app (e.g. WhatsApp). */
export async function markBillSent(type: BillType, id: string): Promise<void> {
  const res = await fetch("/api/bills/mark-sent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type, id }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to mark as sent.");
  }
}
