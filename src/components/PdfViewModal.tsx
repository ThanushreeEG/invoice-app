"use client";

import { useEffect, useRef, useState } from "react";
import { X, Share2 } from "lucide-react";
import toast from "react-hot-toast";
import PdfViewer from "./PdfViewer";
import { downloadPDF } from "@/lib/downloadPDF";

export interface PdfToView {
  url: string;
  filename: string;
  title: string;
}

interface PdfViewModalProps {
  pdf: PdfToView | null;
  onClose: () => void;
}

// Full-screen, in-app PDF viewer. Always has a visible Close button so the
// user can get back to where they were (the installed app has no back button).
export default function PdfViewModal({ pdf, onClose }: PdfViewModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    if (!pdf) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => dialogRef.current?.focus());
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      previousFocus?.focus?.();
    };
  }, [pdf, onClose]);

  if (!pdf) return null;

  const handleShare = async () => {
    setSharing(true);
    try {
      await downloadPDF(pdf.url, pdf.filename);
    } catch {
      toast.error("Failed to share PDF.");
    }
    setSharing(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-stretch sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden="true" />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pdf-view-title"
        tabIndex={-1}
        className="relative bg-white w-full sm:max-w-3xl sm:mx-4 sm:rounded-xl shadow-2xl flex flex-col h-full sm:h-auto sm:max-h-[92vh] focus:outline-none"
      >
        <div className="flex items-center gap-2 px-3 sm:px-5 py-2 border-b border-gray-200 shrink-0">
          <h2 id="pdf-view-title" className="flex-1 min-w-0 truncate text-base font-semibold text-gray-800">
            {pdf.title}
          </h2>
          <button
            onClick={handleShare}
            disabled={sharing}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
          >
            <Share2 className="w-4 h-4" />
            {sharing ? "Preparing…" : "Share"}
          </button>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex items-center gap-1 px-3 py-2.5 rounded-lg text-sm font-semibold text-white bg-gray-800 hover:bg-gray-900"
          >
            <X className="w-5 h-5" />
            Close
          </button>
        </div>

        <div className="flex-1 overflow-auto overscroll-contain p-2 sm:p-4">
          <PdfViewer url={pdf.url} />
        </div>
      </div>
    </div>
  );
}
