export const NO_DEBT_SERVICE_DSCR_LABEL = "N/A — no debt service" as const;

export const STEADY_STATE_RENOVATION_LABEL =
  "Steady-state analysis after stabilization; renovation downtime and lease-up are excluded." as const;

export const SIMPLIFIED_RENOVATION_DOWNTIME_LABEL =
  "Simplified downtime model only: scheduled rent is reduced for the entered months. Draw/funding timing, placed-in-service and lease-up timing, repair-versus-capital classification, basis and tax treatment, and financed improvements are excluded." as const;

/** Canonical DSCR presentation. The engine's cash sentinel remains numeric 0;
 * presentation determines applicability from the debt-service fact. */
export function formatDscr(
  dscr: number | null | undefined,
  hasDebtService: boolean,
  digits = 2,
): string {
  if (!hasDebtService) return NO_DEBT_SERVICE_DSCR_LABEL;
  return typeof dscr === "number" && Number.isFinite(dscr)
    ? dscr.toFixed(digits)
    : "N/A";
}

/**
 * One colour rule per metric, shared by every surface that paints a first-year
 * number (metrics band, decision card, shared viewer, memo). The 2026-09 audit
 * found the shared viewer using its own thresholds (any non-negative cap rate
 * green, DSCR red below 1.25) while the in-app band kept them neutral — the
 * same deal read differently to the sender and the recipient.
 */
export type MetricTone = "positive" | "neutral" | "negative";

/** Tailwind text class per tone; neutral inherits the surface's ink. */
export const METRIC_TONE_TEXT_CLASS: Record<MetricTone, string | undefined> = {
  positive: "text-[var(--metric-positive)]",
  neutral: undefined,
  negative: "text-[var(--metric-negative)]",
};

/** Monthly cash flow after reserve: a -$40/mo deal is "≈break-even", not alarm-red. */
export function cashFlowTone(monthlyCashFlow: number): MetricTone {
  if (monthlyCashFlow > 0) return "positive";
  if (monthlyCashFlow > -100) return "neutral";
  return "negative";
}

export function cashFlowBenchmarkLabel(monthlyCashFlow: number): string {
  if (monthlyCashFlow > 0) return "Positive before tax and after reserve";
  if (monthlyCashFlow > -100) return "Near break-even before tax";
  return "Negative before tax";
}

/** Cash-on-cash: green only above the shared 5% reference; a bare
 * non-negative return stays neutral; no modeled cash invested is neutral. */
export function cocTone(cocPct: number, totalCashRequired: number): MetricTone {
  if (!(totalCashRequired > 0)) return "neutral";
  if (cocPct > 5) return "positive";
  if (cocPct >= 0) return "neutral";
  return "negative";
}

export function cocBenchmarkLabel(cocPct: number): string {
  if (cocPct > 7) return "Above the 7% reference";
  if (cocPct > 5) return "Between 5% and 7%";
  if (cocPct > 3) return "Between 3% and 5%";
  if (cocPct >= 0) return "Between 0% and 3%";
  return "Negative first-year cash return";
}

/**
 * Cap rate is a property-specific output, not evidence about the surrounding
 * market: never an "above/below local median" claim. Neutral unless the
 * modeled NOI is negative.
 */
export function capRateTone(capRatePct: number): MetricTone {
  return capRatePct < 0 ? "negative" : "neutral";
}

export function capRateContextLabel(capRatePct: number): string {
  return capRatePct < 0
    ? "Negative modeled NOI relative to purchase price"
    : "Modeled NOI divided by purchase price";
}

/**
 * DSCR: at or above 1.25 positive; the 1.00–1.25 reference band neutral; below
 * 1.00 negative — except an owner-occupied house-hack, where rent intentionally
 * doesn't cover full PITI, so a sub-1 reading stays neutral. No debt service
 * (cash purchase) has no DSCR to colour.
 */
export function dscrTone(
  dscr: number,
  hasDebtService: boolean,
  ownerOccupied = false,
): MetricTone {
  if (!hasDebtService) return "neutral";
  if (dscr >= 1.25) return "positive";
  if (dscr >= 1.0) return "neutral";
  return ownerOccupied ? "neutral" : "negative";
}

export function dscrBandLabel(
  dscr: number,
  hasDebtService: boolean,
  ownerOccupied = false,
): string | undefined {
  if (!hasDebtService) return undefined;
  if (dscr >= 1.25) return "At or above the 1.25 reference";
  if (dscr >= 1.0) return "Between 1.00 and 1.25";
  return ownerOccupied
    ? "Below 1.00; full debt service exceeds modeled NOI"
    : "Below 1.00";
}

/** Ratios (cap rate) show no "+": "+7.2%" reads like a change vs baseline. */
export function formatRatioPct(value: number, digits = 1): string {
  return `${value.toFixed(digits)}%`;
}

/** Signed returns (cash-on-cash, ROI) keep their sign. */
export function formatSignedPct(value: number, digits = 1): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(digits)}%`;
}
