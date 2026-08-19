/**
 * Turn a base64 PDF from the server into a file the browser saves.
 *
 * The report is now composed server-side (app/actions/generate-report-pdf.ts)
 * so the paid gate can actually be enforced, which means the bytes arrive as
 * base64 rather than as a jsPDF document the page can `doc.save()`.
 *
 * An <a download> click is used rather than window.open: browsers block a
 * popup opened after an await because the user-gesture context is gone by
 * then, whereas a synthesized anchor click is not treated as a popup. The
 * object URL is revoked on the next tick — revoking it immediately can cancel
 * the download in Safari before it starts.
 */

export function downloadPdfFromBase64(base64: string, filename: string): void {
  if (typeof document === "undefined") return;

  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);

  const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
