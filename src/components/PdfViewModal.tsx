"use client";

import { useEffect, useRef, useState } from "react";
import { X, Share2, Check } from "lucide-react";
import toast from "react-hot-toast";
import PdfViewer from "./PdfViewer";
import { fetchPdf, shareFiles } from "@/lib/downloadPDF";
import { markBillSent, type BillType } from "@/lib/markSent";

export interface PdfToView {
  url: string;
  filename: string;
  title: string;
  /** When set, the viewer offers "Mark as sent" after the bill is shared. */
  bill?: { type: BillType; id: string; status: string };
}

interface PdfViewModalProps {
  pdf: PdfToView | null;
  onClose: () => void;
  /** Called after a bill was marked as sent, so the list can refresh. */
  onMarkedSent?: () => void;
}

// Full-screen, in-app PDF viewer. Always has a visible Close button so the
// user can get back to where they were (the installed app has no back button).
export default function PdfViewModal({ pdf, onClose, onMarkedSent }: PdfViewModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [file, setFile] = useState<{ url: string; file: File } | null>(null);
  const [sharing, setSharing] = useState(false);
  const [shared, setShared] = useState<string | null>(null);
  const [marking, setMarking] = useState(false);
  const [markedSent, setMarkedSent] = useState<string | null>(null);

  // Keep the latest onClose without re-running the open/close effect when the
  // parent re-renders (e.g. the list refreshing after "Mark as sent").
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!pdf) return;
    let cancelled = false;
    const previousFocus = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => dialogRef.current?.focus());

    // Fetch the file up front so "Share" opens the share sheet immediately
    // (phones refuse to open it if there is a delay after the tap).
    fetchPdf(pdf)
      .then((f) => !cancelled && setFile({ url: pdf.url, file: f }))
      .catch(() => {});

    return () => {
      cancelled = true;
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      previousFocus?.focus?.();
    };
  }, [pdf]);

  if (!pdf) return null;

  const ready = file?.url === pdf.url ? file.file : null;
  const isShared = shared === pdf.url;
  const isMarked = markedSent === pdf.url;
  const canMarkSent = !!pdf.bill && pdf.bill.status !== "SENT";

  const handleShare = async () => {
    setSharing(true);
    try {
      const f = ready ?? (await fetchPdf(pdf));
      if (await shareFiles([f])) setShared(pdf.url);
    } catch {
      toast.error("Failed to share PDF.");
    }
    setSharing(false);
  };

  const handleMarkSent = async () => {
    if (!pdf.bill) return;
    setMarking(true);
    try {
      await markBillSent(pdf.bill.type, pdf.bill.id);
      setMarkedSent(pdf.url);
      toast.success("Marked as sent.");
      onMarkedSent?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to mark as sent.");
    }
    setMarking(false);
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

        {canMarkSent && (isShared || isMarked) && (
          <div className="flex items-center gap-3 px-3 sm:px-5 py-2.5 bg-green-50 border-b border-green-100 shrink-0">
            {isMarked ? (
              <span className="flex items-center gap-1.5 text-sm font-semibold text-green-700">
                <Check className="w-4 h-4" /> Marked as sent
              </span>
            ) : (
              <>
                <span className="flex-1 text-sm text-green-900">
                  Sent it? Mark this bill as sent so History shows it.
                </span>
                <button
                  onClick={handleMarkSent}
                  disabled={marking}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold bg-green-700 text-white hover:bg-green-800 disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  {marking ? "Saving…" : "Mark as sent"}
                </button>
              </>
            )}
          </div>
        )}

        <div className="flex-1 overflow-auto overscroll-contain p-2 sm:p-4">
          <PdfViewer url={pdf.url} />
        </div>
      </div>
    </div>
  );
}
