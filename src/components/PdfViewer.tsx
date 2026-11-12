"use client";

import { useEffect, useRef, useState } from "react";

// Renders a PDF inside the page using pdf.js (canvas per page).
// We never hand the PDF to the browser's native viewer: in the installed
// (standalone) app that viewer replaces the whole app window and has no
// back button, trapping the user.

interface PdfViewerProps {
  url: string;
  className?: string;
}

export default function PdfViewer({ url, className = "" }: PdfViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    const container = containerRef.current;
    if (!container) return;
    container.innerHTML = "";
    setStatus("loading");

    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

        const res = await fetch(url, { credentials: "same-origin" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = new Uint8Array(await res.arrayBuffer());
        if (cancelled) return;

        const pdf = await pdfjs.getDocument({ data }).promise;
        const width = container.clientWidth || 600;
        const dpr = Math.min(window.devicePixelRatio || 1, 3);

        for (let i = 1; i <= pdf.numPages; i++) {
          if (cancelled) return;
          const page = await pdf.getPage(i);
          const base = page.getViewport({ scale: 1 });
          const viewport = page.getViewport({ scale: (width / base.width) * dpr });

          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.style.width = "100%";
          canvas.style.display = "block";
          canvas.className = "bg-white shadow-sm mb-3 last:mb-0";
          canvas.setAttribute("aria-label", `PDF page ${i} of ${pdf.numPages}`);
          container.appendChild(canvas);

          await page.render({ canvasContext: canvas.getContext("2d")!, viewport }).promise;
        }
        if (!cancelled) setStatus("ready");
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [url]);

  return (
    <div className={`relative rounded-lg border border-gray-200 bg-gray-100 p-2 ${className}`}>
      {status === "loading" && (
        <div className="py-16 text-center text-sm text-gray-500" role="status">
          Loading preview…
        </div>
      )}
      {status === "error" && (
        <div className="py-16 text-center text-sm text-red-600" role="alert">
          Couldn&apos;t load the PDF preview. You can still send or download it.
        </div>
      )}
      <div ref={containerRef} />
    </div>
  );
}
