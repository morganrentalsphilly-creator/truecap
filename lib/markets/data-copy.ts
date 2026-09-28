/**
 * Shared vocabulary and formatters for the data-first market and state pages
 * (F8). One place defines what HUD's Fair Market Rent is, so no template can
 * call it an average, typical or median rent (docs/voice.md, "FMR vocabulary").
 *
 * Pure: no React, no data imports.
 */

/** HUD's FMR overview page: the 40th-percentile definition and what FMRs are used for. */
export const HUD_FMR_OVERVIEW_URL = "https://www.huduser.gov/portal/datasets/fmr.html";

/** The day the FMR overview page was read for FMR_DEFINITION. */
export const HUD_FMR_OVERVIEW_RETRIEVED_AT = "2026-09-27";

/**
 * One sentence on what Fair Market Rent is, in HUD's own terms from its FMR
 * overview (HUD_FMR_OVERVIEW_URL): "estimates of 40th percentile gross rents
 * for standard quality units", "used to determine payment standard amounts for
 * the Housing Choice Voucher program". Passive, as HUD words it: the housing
 * agency adopts the payment standards (24 CFR 982.503(a)(2)), and in a Small
 * Area FMR area the ZIP-level figure applies instead (982.503(a)(1)(i)), which
 * a market page states for its own area (voucherSmallAreaFmr in
 * lib/markets/hud-fmr-areas.ts). Never "HUD uses it to set" the standards.
 */
export const FMR_DEFINITION_CLAUSE =
  "Fair Market Rent is HUD's estimate of the 40th-percentile gross rent for standard-quality rental units in an area, used to determine payment standard amounts for the Housing Choice Voucher program: a percentile, not an average of current asking rents";

/** FMR_DEFINITION_CLAUSE as a sentence (templates that link HUD render the clause + "(HUD)."). */
export const FMR_DEFINITION = `${FMR_DEFINITION_CLAUSE}.`;

/** The label every template uses for a HUD figure: "HUD Fair Market Rent (FY2026)". */
export function fmrLabel(year: number): string {
  return `HUD Fair Market Rent (FY${year})`;
}

/** A visible Q&A item whose answer is plain text, so FAQPage JSON-LD can mirror it exactly. */
export type DataFaqItem = Readonly<{
  question: string;
  answer: string;
  sources: readonly SourceLink[];
}>;

/** A linked source as a page lists it. */
export type SourceLink = Readonly<{
  label: string;
  href: string;
  /** YYYY-MM-DD the source was retrieved, when known. */
  retrievedAt?: string;
}>;

export const usd = (value: number): string => `$${Math.round(value).toLocaleString("en-US")}`;

export const count = (value: number): string => Math.round(value).toLocaleString("en-US");

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** "2026-07-13" → "July 13, 2026" (no Date parsing, so no timezone drift). */
export function formatIsoDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) throw new Error(`not a YYYY-MM-DD date: ${iso}`);
  return `${MONTHS[Number(m[2]) - 1]} ${Number(m[3])}, ${m[1]}`;
}

/** "July 13, 2026" for one date; "July 13, 2026 and September 27, 2026" for two; a range for more. */
export function formatRetrievedDates(dates: readonly string[]): string {
  const unique = [...new Set(dates)].sort();
  if (unique.length === 0) throw new Error("no retrieval date");
  if (unique.length === 1) return formatIsoDate(unique[0]!);
  if (unique.length === 2) return `${formatIsoDate(unique[0]!)} and ${formatIsoDate(unique[1]!)}`;
  return `${formatIsoDate(unique[0]!)} to ${formatIsoDate(unique.at(-1)!)}`;
}

/** The visible dating line of a HUD-based page: "Data as of HUD FY2026 (retrieved July 13, 2026)." */
export function buildHudDataAsOfLine(year: number, retrievedAt: readonly string[]): string {
  return `Data as of HUD FY${year} (retrieved ${formatRetrievedDates(retrievedAt)}).`;
}

/** "+$15" / "−$15" / "$0". */
export function signedUsd(delta: number): string {
  if (delta === 0) return "$0";
  return `${delta > 0 ? "+" : "−"}${usd(Math.abs(delta))}`;
}

/** "+1.0%" / "−1.0%" / "0.0%" of `from`. */
export function signedPct(delta: number, from: number): string {
  const pct = from === 0 ? 0 : (delta / from) * 100;
  if (Math.abs(pct) < 0.05) return "0.0%";
  return `${pct > 0 ? "+" : "−"}${Math.abs(pct).toFixed(1)}%`;
}

/** "37.7%" share of `part` in `whole`. */
export function sharePct(part: number, whole: number): string {
  return `${((part / whole) * 100).toFixed(1)}%`;
}
