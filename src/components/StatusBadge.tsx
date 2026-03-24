const styles: Record<string, string> = {
  DRAFT: "bg-[var(--status-draft-bg)] text-[var(--status-draft-text)] border border-[var(--status-draft-border)]",
  SENT: "bg-[var(--status-sent-bg)] text-[var(--status-sent-text)] border border-[var(--status-sent-border)]",
  FAILED: "bg-[var(--status-failed-bg)] text-[var(--status-failed-text)] border border-[var(--status-failed-border)]",
};

export default function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${styles[status] || "bg-gray-100 text-gray-700"}`}>
      {status === "SENT" && <span className="w-1.5 h-1.5 rounded-full bg-green-500" />}
      {status === "FAILED" && <span className="w-1.5 h-1.5 rounded-full bg-red-500" />}
      {status === "DRAFT" && <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
      {status}
    </span>
  );
}
