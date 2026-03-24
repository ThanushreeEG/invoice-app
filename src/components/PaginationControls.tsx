import type { Pagination } from "@/lib/types";

interface PaginationControlsProps {
  pagination: Pagination;
  currentPage: number;
  onPageChange: (page: number) => void;
}

export default function PaginationControls({ pagination, currentPage, onPageChange }: PaginationControlsProps) {
  if (pagination.totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between mt-6">
      <div className="text-sm text-gray-500">
        Showing {(pagination.page - 1) * pagination.limit + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          aria-label="Previous page"
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
        >
          Previous
        </button>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= pagination.totalPages}
          aria-label="Next page"
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}
