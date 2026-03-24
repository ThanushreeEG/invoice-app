"use client";

import { useState, useEffect, useRef } from "react";
import { STATUS_OPTIONS } from "@/lib/constants";

interface FilterBarProps {
  search: string;
  onSearch: (value: string) => void;
  statusFilter: string;
  onStatusFilter: (value: string) => void;
  searchPlaceholder?: string;
  searchLabel?: string;
  debounceMs?: number;
}

export default function FilterBar({
  search,
  onSearch,
  statusFilter,
  onStatusFilter,
  searchPlaceholder = "Search...",
  searchLabel = "Search",
  debounceMs = 300,
}: FilterBarProps) {
  const [localSearch, setLocalSearch] = useState(search);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Sync external changes
  useEffect(() => {
    setLocalSearch(search);
  }, [search]);

  const handleChange = (value: string) => {
    setLocalSearch(value);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => onSearch(value), debounceMs);
  };

  useEffect(() => {
    return () => clearTimeout(timerRef.current);
  }, []);

  return (
    <div className="flex flex-col sm:flex-row gap-3 mb-4">
      <input
        type="text"
        value={localSearch}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={searchPlaceholder}
        aria-label={searchLabel}
        className="flex-1 px-4 py-3 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <div className="flex gap-2">
        {STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onStatusFilter(opt.value)}
            aria-label={`Filter by ${opt.label}`}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === opt.value
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
