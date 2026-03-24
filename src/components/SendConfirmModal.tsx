"use client";

import { useEffect, useRef, useCallback } from "react";

interface SendConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  pdfUrl?: string;
  title: string;
  recipientEmail: string;
  ccEmails?: string;
  sending: boolean;
}

export default function SendConfirmModal({
  open,
  onClose,
  onConfirm,
  pdfUrl,
  title,
  recipientEmail,
  ccEmails,
  sending,
}: SendConfirmModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && !sending) {
        onClose();
        return;
      }

      if (e.key === "Tab" && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    },
    [onClose, sending]
  );

  useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      document.addEventListener("keydown", handleKeyDown);
      // Focus the modal after render
      requestAnimationFrame(() => {
        modalRef.current?.focus();
      });
      // Prevent background scroll
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
      if (previousFocusRef.current && !open) {
        previousFocusRef.current.focus();
      }
    };
  }, [open, handleKeyDown]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={sending ? undefined : onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="send-modal-title"
        tabIndex={-1}
        className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 flex flex-col max-h-[90vh] focus:outline-none"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 id="send-modal-title" className="text-lg font-semibold text-gray-800">{title}</h2>
          <button
            onClick={onClose}
            disabled={sending}
            aria-label="Close dialog"
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50 p-1 rounded-lg focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto px-6 py-4">
          {/* PDF Preview */}
          {pdfUrl && (
            <div className="mb-4">
              <iframe
                src={pdfUrl}
                className="w-full rounded-lg border border-gray-200"
                style={{ height: "450px" }}
                title="PDF Preview"
              />
            </div>
          )}

          {/* Recipient Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm">
              <div className="flex gap-2 mb-1">
                <span className="font-semibold text-gray-600 w-8">To:</span>
                <span className="text-gray-800">{recipientEmail}</span>
              </div>
              {ccEmails && (
                <div className="flex gap-2">
                  <span className="font-semibold text-gray-600 w-8">CC:</span>
                  <span className="text-gray-800">{ccEmails}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200">
          <button
            onClick={onClose}
            disabled={sending}
            className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={sending}
            className="px-5 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2"
          >
            {sending ? "Sending..." : "Confirm Send"}
          </button>
        </div>
      </div>
    </div>
  );
}
