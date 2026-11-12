// Save PDFs without ever navigating the app to the PDF URL.
//
// Opening /api/.../pdf directly (a plain <a href download>) is what traps users
// in the installed iPhone/Android app: iOS ignores the `download` attribute in
// standalone mode and shows the PDF full-screen with no back button.
//
// Instead we fetch the file ourselves, then:
//   - on phones: open the system share sheet (Save to Files, WhatsApp, Mail…),
//     which always returns to the app when dismissed;
//   - elsewhere (or if sharing isn't allowed): trigger a blob download.

export interface PdfFile {
  url: string;
  filename: string;
}

function safeName(name: string) {
  return name.replace(/[\\/:*?"<>|]+/g, "-");
}

async function fetchPdf({ url, filename }: PdfFile): Promise<File> {
  const res = await fetch(url, { credentials: "same-origin" });
  if (!res.ok) throw new Error(`Failed to fetch PDF (${res.status})`);
  const blob = await res.blob();
  return new File([blob], safeName(filename), { type: "application/pdf" });
}

function blobDownload(file: File) {
  const objectUrl = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = file.name;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
}

function isTouchDevice() {
  return typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches;
}

export async function downloadPDFs(items: PdfFile[]): Promise<void> {
  const files = await Promise.all(items.map(fetchPdf));

  if (isTouchDevice() && typeof navigator.share === "function" && navigator.canShare?.({ files })) {
    try {
      await navigator.share({ files });
      return;
    } catch (err) {
      // User closed the share sheet: nothing more to do.
      if (err instanceof DOMException && err.name === "AbortError") return;
      // NotAllowedError etc. (e.g. gesture expired): fall back to download below.
    }
  }

  for (const file of files) {
    blobDownload(file);
    if (files.length > 1) await new Promise((r) => setTimeout(r, 300));
  }
}

export function downloadPDF(url: string, filename: string): Promise<void> {
  return downloadPDFs([{ url, filename }]);
}
