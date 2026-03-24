import Link from "next/link";

interface PageHeaderProps {
  title: string;
  actionLabel?: string;
  actionHref?: string;
}

export default function PageHeader({ title, actionLabel, actionHref }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">{title}</h1>
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors text-base shadow-sm hover:shadow-md"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
