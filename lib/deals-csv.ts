/**
 * CSV export for the My Deals list (Phase 2).
 *
 * Pure module — no IO, no React, no server imports. The component maps the
 * ALREADY-LOADED (and already filtered + sorted) list rows into
 * `DealsCsvItem`s and downloads the result client-side via a Blob; nothing
 * here recomputes deal math (display-only serialization of existing values).
 *
 * Output contract:
 *  - RFC 4180: header row, CRLF line endings, fields containing commas,
 *    double quotes, or newlines are quoted with inner quotes doubled.
 *  - Formula-injection hardening: any cell starting with `=`, `+`, `-`, or
 *    `@` is prefixed with a single quote BEFORE quoting, so Excel / Google
 *    Sheets treat it as text rather than a formula. This intentionally also
 *    applies to negative numbers (e.g. `-450` → `'-450`) — the standard
 *    OWASP guidance, since `-2+3+cmd|' /C calc'!A0` is a valid formula.
 *  - null / non-finite metrics serialize as empty cells.
 */

/** One exported row. Structurally close to `SavedAnalysisListItem` so the
 *  My Deals page can map items with minimal glue; kept as its own type so
 *  this lib never imports from `components/`. */
export type DealsCsvItem = {
  address: string | null;
  /** Display title — the caller passes nickname ?? title (nickname leads in
   *  the list UI too). */
  title: string | null;
  /** Human pipeline-stage label, e.g. "Under contract". */
  stageLabel?: string | null;
  /** Lifecycle status slug: active / completed / archived. */
  status: string;
  /** Verdict shown on the row, e.g. "Strong Buy". */
  recommendation: string;
  score: number | null;
  purchasePrice: number | null;
  netCashFlowMonthly: number | null;
  cocReturnPct: number | null;
  capRatePct: number | null;
  /** null = unknown. A financed deal with negative NOI legitimately has
   *  DSCR ≤ 0 — only isCashPurchase marks DSCR as N/A ("Cash"). */
  dscr?: number | null;
  isCashPurchase?: boolean;
  cashToClose?: number | null;
  /** 10-yr ROI when the caller has it; the list rows currently don't carry
   *  it, so this stays an empty cell until they do. */
  tenYearRoiPct?: number | null;
  tags?: string[];
  /** ISO timestamp (row creation). */
  createdAt: string;
  /** Owned-deal close date (yyyy-mm-dd) when present. */
  closeDate?: string | null;
};

export const DEALS_CSV_HEADER: readonly string[] = [
  "Address",
  "Title",
  "Stage",
  "Status",
  "Verdict",
  "Score",
  "Price",
  "Monthly Cash Flow",
  "CoC Return (%)",
  "Cap Rate (%)",
  "DSCR",
  "Cash to Close",
  "10-Yr ROI (%)",
  "Tags",
  "Created",
  "Close Date",
];

/** Injection-harden then RFC-4180-quote a single cell. */
function csvCell(raw: string): string {
  let cell = raw;
  // CSV injection hardening — these prefixes open a formula in Excel/Sheets.
  if (/^[=+\-@]/.test(cell)) cell = `'${cell}`;
  if (/[",\r\n]/.test(cell)) cell = `"${cell.replace(/"/g, '""')}"`;
  return cell;
}

/** null / NaN / Infinity → empty cell; otherwise a plain number rounded to
 *  at most 2 decimals (no currency symbols or thousands separators so the
 *  spreadsheet reads them as numbers). */
function numCell(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "";
  return String(Math.round(value * 100) / 100);
}

/** Mirrors the list UI's DSCR cell: cash purchase → "Cash", unknown → empty,
 *  else 2 decimals. Keyed off the explicit isCashPurchase flag — a financed
 *  deal whose NOI goes negative has a real DSCR ≤ 0 and must export the
 *  number, not "Cash". */
function dscrCell(dscr: number | null | undefined, isCashPurchase: boolean | undefined): string {
  if (isCashPurchase) return "Cash";
  if (dscr == null) return "";
  return dscr.toFixed(2);
}

/** ISO timestamp → yyyy-mm-dd in LOCAL time — the list UI renders the
 *  same date with toLocaleDateString and the filename is local too, so
 *  a 9pm ET save must not export as tomorrow's UTC date ("export what
 *  the user sees"). Unparseable input passes through. */
function dateCell(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function titleCase(slug: string): string {
  return slug ? slug.charAt(0).toUpperCase() + slug.slice(1) : "";
}

/**
 * Build the full CSV string (header + one row per item, CRLF endings,
 * trailing CRLF). Empty `items` → header row only.
 */
export function buildDealsCsv(items: DealsCsvItem[]): string {
  const lines: string[] = [DEALS_CSV_HEADER.map(csvCell).join(",")];
  for (const item of items) {
    const cells = [
      item.address ?? "",
      item.title ?? "",
      item.stageLabel ?? "",
      titleCase(item.status),
      item.recommendation,
      numCell(item.score),
      numCell(item.purchasePrice),
      numCell(item.netCashFlowMonthly),
      numCell(item.cocReturnPct),
      numCell(item.capRatePct),
      dscrCell(item.dscr, item.isCashPurchase),
      numCell(item.cashToClose),
      numCell(item.tenYearRoiPct),
      (item.tags ?? []).join(";"),
      dateCell(item.createdAt),
      item.closeDate ?? "",
    ];
    lines.push(cells.map(csvCell).join(","));
  }
  return `${lines.join("\r\n")}\r\n`;
}

/** `truecap-deals-YYYY-MM-DD.csv` using the LOCAL date (the date the user
 *  sees on their machine, not UTC). */
export function dealsCsvFilename(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `truecap-deals-${y}-${m}-${d}.csv`;
}
