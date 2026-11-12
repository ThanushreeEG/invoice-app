"use client";

import { useEffect, useState } from "react";
import { Share2, Check } from "lucide-react";
import { fetchPdf, shareFiles } from "@/lib/downloadPDF";

export interface ShareItem {
  id: string;
  label: string;
  url: string;
  filename: string;
}

interface ShareBillsDialogProps {
  items: ShareItem[] | null;
  onDone: () => void;
}

type ItemState = { file?: File; error?: boolean; shared?: boolean };

// Shown after "Share" on the New Invoice / EB / Water pages. The bills have just
// been saved; we fetch each PDF up front so that tapping "Share" opens the share
// sheet immediately (phones refuse to open it if there is a delay after the tap).
// One button per tenant, so each bill can go to the right WhatsApp chat.
export default function ShareBillsDialog({ items, onDone }: ShareBillsDialogProps) {
  const [state, setState] = useState<Record<string, ItemState>>({});

  useEffect(() => {
    if (!items) return;
    let cancelled = false;
    document.body.style.overflow = "hidden";
    for (const item of items) {
      fetchPdf(item)
        .then((file) => !cancelled && setState((s) => ({ ...s, [item.id]: { ...s[item.id], file } })))
        .catch(() => !cancelled && setState((s) => ({ ...s, [item.id]: { ...s[item.id], error: true } })));
    }
    return () => {
      cancelled = true;
      document.body.style.overflow = "";
    };
  }, [items]);

  if (!items) return null;

  const share = async (item: ShareItem) => {
    const file = state[item.id]?.file;
    if (!file) return;
    const done = await shareFiles([file]);
    if (done) setState((s) => ({ ...s, [item.id]: { ...s[item.id], shared: true } }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-bills-title"
        className="relative bg-white w-full sm:max-w-md sm:mx-4 rounded-t-2xl sm:rounded-xl shadow-2xl flex flex-col max-h-[85vh]"
      >
        <div className="px-5 pt-5 pb-3">
          <h2 id="share-bills-title" className="text-lg font-semibold text-gray-800">
            {items.length === 1 ? "Bill saved" : `${items.length} bills saved`}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Tap Share to send each bill on WhatsApp or another app. They are saved as drafts.
          </p>
        </div>

        <ul className="flex-1 overflow-auto px-5 space-y-2">
          {items.map((item) => {
            const st = state[item.id] || {};
            return (
              <li key={item.id} className="flex items-center gap-3 border border-gray-200 rounded-lg p-3">
                <span className="flex-1 min-w-0 truncate text-sm font-medium text-gray-800">{item.label}</span>
                {st.error ? (
                  <span className="text-xs text-red-600">Couldn&apos;t load PDF</span>
                ) : (
                  <button
                    onClick={() => share(item)}
                    disabled={!st.file}
                    className={`flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 ${
                      st.shared ? "bg-green-50 text-green-700" : "bg-purple-700 text-white hover:bg-purple-800"
                    }`}
                  >
                    {st.shared ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
                    {!st.file ? "Preparing…" : st.shared ? "Shared" : "Share"}
                  </button>
                )}
              </li>
            );
          })}
        </ul>

        <div className="px-5 py-4 border-t border-gray-200 mt-3">
          <button
            onClick={onDone}
            className="w-full py-3 bg-gray-800 text-white rounded-xl font-semibold hover:bg-gray-900"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
