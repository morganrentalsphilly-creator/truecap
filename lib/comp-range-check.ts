/**
 * Comp-range check — is an assumption (rent, or purchase price vs. estimated
 * value/ARV) inside the range the pulled comps support? Lets the analyzer turn
 * comps from a passive readout into an actionable warning ("your rent is 14%
 * above the comp range — cash flow may be optimistic").
 *
 * Pure: takes a value + a {low, high} range and classifies it. No React, no
 * fetch. Tested in lib/__tests__.
 */

export type CompRangeStatus = "within" | "above" | "below" | "unknown";

export type CompRangeCheck = {
  status: CompRangeStatus;
  /** Magnitude, in %, outside the nearer bound (0 when within/unknown). */
  pctOutside: number;
  low: number | null;
  high: number | null;
};

function finite(n: unknown): number | null {
  return typeof n === "number" && Number.isFinite(n) ? n : null;
}

export function checkCompRange(
  value: number | null | undefined,
  range: { low: number | null; high: number | null } | null | undefined
): CompRangeCheck {
  const v = finite(value);
  const low = finite(range?.low);
  const high = finite(range?.high);

  if (v == null || (low == null && high == null)) {
    return { status: "unknown", pctOutside: 0, low, high };
  }
  if (high != null && v > high) {
    return { status: "above", pctOutside: Math.round(((v - high) / high) * 100), low, high };
  }
  if (low != null && v < low) {
    return { status: "below", pctOutside: Math.round(((low - v) / low) * 100), low, high };
  }
  return { status: "within", pctOutside: 0, low, high };
}
