export const MONTHS: string[] = [
  "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
  "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER",
];

export const MONTH_SHORT: Record<string, string> = {
  JANUARY: "Jan", FEBRUARY: "Feb", MARCH: "Mar", APRIL: "Apr",
  MAY: "May", JUNE: "Jun", JULY: "Jul", AUGUST: "Aug",
  SEPTEMBER: "Sep", OCTOBER: "Oct", NOVEMBER: "Nov", DECEMBER: "Dec",
};

export const STATUS_OPTIONS = [
  { value: "", label: "All" },
  { value: "DRAFT", label: "Draft" },
  { value: "SENT", label: "Sent" },
  { value: "FAILED", label: "Failed" },
];

export function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} at ${d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`;
}
