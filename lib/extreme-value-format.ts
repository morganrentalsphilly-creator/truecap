/**
 * Honest extreme-ROI display framing (Choose-TrueCap Phase C, finding 5).
 *
 * A cumulative 10-yr ROI like "673.0%" headlining the Decision Center can
 * read as an endorsement even though the projection is highly sensitive to
 * saved inputs (including rent, price, appreciation, and exit assumptions).
 * This module frames such values — it never hides them: the framed headline
 * leads with the caution and the raw number stays reachable via `raw` /
 * `title` (title attr, secondary text, tooltip).
 *
 * DISPLAY ONLY. No math, sorting, scoring, or stored value changes anywhere.
 *
 * Threshold — derived from the codebase's own bands, not invented:
 *  - The Deal Score's total-return component (lib/deal-score.ts) tops out at
 *    ">15%/yr annualized → full 25 points". 15%/yr compounded over the 10-yr
 *    hold is (1.15^10 − 1) ≈ 304.6% cumulative — so 300% cumulative is where
 *    the score's own measuring scale ends. Beyond it the engine literally
 *    cannot rate a deal any higher, and lib/returns.ts already calls such
 *    totals "easy to misread".
 *  - For reference, the return/model-DSCR chart
 *    (components/dashboard/RiskReturn) marks 100% cumulative (~7%/yr) as a
 *    fixed display reference — 300% is 3× that reference.
 */

/** Cumulative 10-yr ROI (%) above which the headline is framed, not shown. */
export const EXTREME_ROI_CUMULATIVE_PCT = 300;

/**
 * Annualized 10-yr return (%/yr) equivalent of the cumulative threshold
 * (1.15^10 − 1 ≈ 304.6% ≈ EXTREME_ROI_CUMULATIVE_PCT). Also the top band of
 * the Deal Score's total-return component. Used by the annualized "~X%/yr"
 * surfaces so the same deal is framed consistently on both axes.
 */
export const EXTREME_ROI_ANNUALIZED_PCT = 15;

export function isExtremeCumulativeRoi(roiPct: number | null | undefined): boolean {
  return typeof roiPct === "number" && Number.isFinite(roiPct) && roiPct > EXTREME_ROI_CUMULATIVE_PCT;
}

export function isExtremeAnnualizedRoi(annualPct: number | null | undefined): boolean {
  return typeof annualPct === "number" && Number.isFinite(annualPct) && annualPct > EXTREME_ROI_ANNUALIZED_PCT;
}

export interface RoiHeadline {
  /** True when the value crossed the cumulative sanity band. */
  extreme: boolean;
  /**
   * Display text. Sane → the plain formatted number (per opts). Extreme →
   * the framed form leading with the caution (">300% — verify assumptions",
   * or just ">300%" when compact).
   */
  text: string;
  /** The raw value formatted (e.g. "673.0%") — for secondary text. */
  raw: string;
  /**
   * Full caution + the raw number, for a title attr / tooltip so the real
   * figure always stays one hover away. Only set when extreme.
   */
  title?: string;
}

export interface RoiHeadlineOptions {
  /** Fraction digits for the numeric formatting (default 1). */
  decimals?: number;
  /** Prefix "+" for positive values (default false). */
  signed?: boolean;
  /**
   * Compact framed form for tight table cells / tiles: ">300%" instead of
   * ">300% — verify assumptions" (default false). Pair with `title`.
   */
  compact?: boolean;
  /** Text returned for null/undefined/NaN input (default "-"). */
  nullText?: string;
}

/** toFixed that never renders "-0", "-0.0", … */
function fixed(value: number, decimals: number): string {
  const text = value.toFixed(decimals);
  return Number.parseFloat(text) === 0 ? (0).toFixed(decimals) : text;
}

/**
 * Format a CUMULATIVE 10-yr ROI percentage for a headline surface.
 * Sane values keep plain numeric formatting; values beyond
 * EXTREME_ROI_CUMULATIVE_PCT return the caution-first framed form with the
 * raw number preserved on `raw` and `title`.
 */
export function formatRoiHeadline(
  roiPct: number | null | undefined,
  options: RoiHeadlineOptions = {}
): RoiHeadline {
  const { decimals = 1, signed = false, compact = false, nullText = "-" } = options;

  if (typeof roiPct !== "number" || !Number.isFinite(roiPct)) {
    return { extreme: false, text: nullText, raw: nullText };
  }

  const numeric = fixed(roiPct, decimals);
  const raw = `${signed && roiPct > 0 ? "+" : ""}${numeric}%`;

  if (!isExtremeCumulativeRoi(roiPct)) {
    return { extreme: false, text: raw, raw };
  }

  const framed = `>${EXTREME_ROI_CUMULATIVE_PCT}%`;
  return {
    extreme: true,
    text: compact ? framed : `${framed} — verify assumptions`,
    raw,
    title:
      `Modeled ${numeric}% cumulative 10-yr ROI — above the ` +
      `${EXTREME_ROI_CUMULATIVE_PCT}% band (≈${EXTREME_ROI_ANNUALIZED_PCT}%/yr for 10 years, ` +
      `the top of TrueCap's own scoring scale). This output is highly sensitive to rent, ` +
      `price, appreciation, selling costs, financing, and exit assumptions. Review those ` +
      `inputs before relying on it; this is not an investment recommendation.`,
  };
}
