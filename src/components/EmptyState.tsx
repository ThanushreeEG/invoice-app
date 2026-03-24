import Link from "next/link";
import { FileX } from "lucide-react";

interface EmptyStateProps {
  message: string;
  actionLabel?: string;
  actionHref?: string;
}

export default function EmptyState({ message, actionLabel, actionHref }: EmptyStateProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-10 text-center" style={{ border: "1px solid var(--border)" }}>
      <FileX className="w-10 h-10 text-gray-300 mx-auto mb-3" />
      <p className="text-base text-gray-500 mb-4">{message}</p>
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="inline-block px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors shadow-sm"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
