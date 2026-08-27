import type { DealRiskLevel } from "./deal-score";
import { signalDisplay } from "./verdict-display";

export type PropertyType = "single-family" | "multi-family" | "owner-occupant";
export type Signal = "strong-buy" | "buy" | "neutral" | "risky" | "avoid";
export type StoredRecommendation = "Strong Buy" | "Buy" | "Neutral" | "Risky" | "Avoid";
export type StoredRiskLevel = DealRiskLevel;
export type MetricKind = "currency" | "percent" | "number";
export type CompareDirection = "higher" | "lower";

export type MetricRow = {
  key: string;
  label: string;
  group: "RETURNS" | "RISK" | "DEAL";
  kind: MetricKind;
  direction: CompareDirection;
  decimals?: number;
  /**
   * Whether this row contributes one vote to the disclosed near-term lead
   * count. Display rows are intentionally not score rows by default: rent,
   * purchase price, annualized cash flow and after-tax cash flow would
   * otherwise count the same underlying economics more than once.
   */
  scoreMetric?: boolean;
};

export type ScoreMetricRule<T> = {
  key: string;
  direction: CompareDirection;
  scoreMetric?: boolean;
  getValue: (deal: T) => number | null;
};

/** A comparison may be seeded with one deal, but every selected deal must
 * already have a usable result provenance and all selections must belong to
 * the exact same version + provenance cohort. */
export function areMethodologyCohortsComparable(
  cohorts: readonly (string | null | undefined)[]
): boolean {
  const cohort = cohorts[0]?.trim();
  if (!cohort || cohort.startsWith("unavailable:")) return false;
  return cohorts.every((candidate) => candidate?.trim() === cohort);
}

export function buildCanonicalMonthlyNoiMetrics(input: {
  noiAnnual: number | null;
  operatingExpensesAnnual: number | null;
}): {
  noiMonthly: number | null;
  operatingExpensesMonthly: number | null;
} {
  const monthly = (annual: number | null): number | null =>
    typeof annual === "number" && Number.isFinite(annual) ? annual / 12 : null;
  return {
    noiMonthly: monthly(input.noiAnnual),
    operatingExpensesMonthly: monthly(input.operatingExpensesAnnual),
  };
}

export const METRIC_ROWS: MetricRow[] = [
  { key: "netCashFlow", label: "Net Cash Flow / mo", group: "RETURNS", kind: "currency", direction: "higher", scoreMetric: true },
  { key: "cocReturn", label: "Cash-on-Cash Return", group: "RETURNS", kind: "percent", direction: "higher", decimals: 1 },
  { key: "capRate", label: "Cap Rate", group: "RETURNS", kind: "percent", direction: "higher", decimals: 1, scoreMetric: true },
  { key: "afterTaxCF", label: "After-Tax Cash Flow", group: "RETURNS", kind: "currency", direction: "higher" },
  { key: "annualCashFlow", label: "Annual Cash Flow", group: "RETURNS", kind: "currency", direction: "higher" },
  { key: "dscr", label: "Model DSCR", group: "RISK", kind: "number", direction: "higher", decimals: 2, scoreMetric: true },
  { key: "noiMonthly", label: "NOI / mo", group: "RISK", kind: "currency", direction: "higher" },
  { key: "monthlyRentalIncome", label: "Monthly Rent Income", group: "RISK", kind: "currency", direction: "higher" },
  { key: "operatingExpensesMonthly", label: "Operating Expenses / mo (NOI)", group: "RISK", kind: "currency", direction: "lower" },
  { key: "downsideNetCashFlow", label: "Recorded Downside Cash Flow / mo", group: "RISK", kind: "currency", direction: "higher" },
  { key: "downsideDscr", label: "Recorded Downside DSCR", group: "RISK", kind: "number", direction: "higher", decimals: 2 },
  { key: "purchasePrice", label: "Purchase Price", group: "DEAL", kind: "currency", direction: "lower" },
  // Max Offer + the gap to asking — the two numbers the product is sold on,
  // absent from Compare until Aug-2026. "higher is better" for the offer;
  // for the gap, LOWER is better (a smaller gap means the asking price is
  // closer to — or below — what the deal actually supports).
  { key: "maxOffer", label: "Offer Ceiling", group: "DEAL", kind: "currency", direction: "higher" },
  { key: "offerGap", label: "Gap to Asking", group: "DEAL", kind: "currency", direction: "lower" },
  { key: "totalCashRequired", label: "Total Cash Required", group: "DEAL", kind: "currency", direction: "lower", scoreMetric: true },
  { key: "monthlyPayment", label: "Loan Payment (P&I)", group: "DEAL", kind: "currency", direction: "lower" },
  { key: "taxSavingsMonthly", label: "Illustrative Tax Effect / mo", group: "DEAL", kind: "currency", direction: "higher" },
];

// Display labels for the recommendation signal — the deal's OWN score, not the
// user's personal buy box. Don't use "buy box" wording here: it implied a
// criteria screen that never ran.
//
// DERIVED, not declared: this used to be a hand-maintained fourth copy of the
// same five strings. Wording now lives only in lib/verdict-display.ts.
export const SIGNAL_LABELS: Record<Signal, string> = {
  "strong-buy": signalDisplay("strong-buy").label,
  buy: signalDisplay("buy").label,
  neutral: signalDisplay("neutral").label,
  risky: signalDisplay("risky").label,
  avoid: signalDisplay("avoid").label,
};

export function formatCurrency(value: number | null, signed = false): string {
  if (value == null) return "-";
  const abs = Math.abs(value);
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(abs);
  if (!signed) return value < 0 ? `-${formatted}` : formatted;
  if (value > 0) return `+${formatted}`;
  if (value < 0) return `-${formatted}`;
  return formatted;
}

/** Rows whose ranking direction must NOT imply a +/- delta on screen.
 *  Max Offer is a PRICE (direction "higher" only means "a higher ceiling is
 *  better"), so signing it rendered "+$297,400" like a change figure. */
const UNSIGNED_KEYS = new Set(["maxOffer"]);

export function formatMetric(value: number | null, row: MetricRow): string {
  if (value == null) return "-";
  if (row.kind === "currency")
    return formatCurrency(value, row.direction === "higher" && !UNSIGNED_KEYS.has(row.key));
  if (row.kind === "percent") {
    const decimals = row.decimals ?? 1;
    return `${row.direction === "higher" && value > 0 ? "+" : ""}${value.toFixed(decimals)}%`;
  }
  return value.toFixed(row.decimals ?? 0);
}

export function recommendationToSignal(recommendation: StoredRecommendation): Signal {
  if (recommendation === "Strong Buy") return "strong-buy";
  if (recommendation === "Buy") return "buy";
  if (recommendation === "Neutral") return "neutral";
  if (recommendation === "Risky") return "risky";
  return "avoid";
}

export function getTypeLabel(type: PropertyType | null): string {
  if (type === "single-family") return "Single Family";
  if (type === "multi-family") return "Multi-Family";
  if (type === "owner-occupant") return "House Hack";
  return "Unknown Type";
}

export function getBadgeClasses(signal: Signal): string {
  if (signal === "strong-buy") return "border-emerald-200 bg-emerald-100 text-emerald-700";
  if (signal === "buy") return "border-sky-200 bg-sky-100 text-sky-700";
  if (signal === "neutral") return "border-orange-200 bg-orange-100 text-orange-700";
  if (signal === "risky") return "border-orange-200 bg-orange-100 text-orange-700";
  return "border-red-200 bg-red-100 text-red-700";
}

export function getBestValue(row: MetricRow, deals: { metrics: Record<string, number | null> }[]): number | null {
  const eligibleDeals =
    row.key === "cocReturn"
      ? deals.filter((deal) => {
          const cashInvested = deal.metrics.totalCashRequired;
          // Legacy snapshots may not carry the denominator; keep their numeric
          // CoC comparable. An explicit $0 denominator is mathematically N/A.
          return cashInvested == null || cashInvested > 0;
        })
      : deals;
  const values = eligibleDeals
    .map((deal) => deal.metrics[row.key])
    .filter(
      (value): value is number =>
        value != null && Number.isFinite(value)
    );
  // A populated value is not a comparison. Requiring two real candidates
  // prevents a sparse historical row from winning by default simply because
  // every other deal recorded N/A for this metric.
  if (values.length < 2) return null;
  return row.direction === "higher" ? Math.max(...values) : Math.min(...values);
}

/**
 * Count row-leading values for the explicitly opted-in score metrics.
 *
 * Ties are preserved: every deal sharing a row's best value receives that
 * row's lead. This makes the displayed count mechanically reproducible and
 * prevents score, ROI, creation date, or source order from manufacturing a
 * winner when the modeled values are tied.
 */
export function tallyScoreMetricLeads<T extends { id: string }>(
  deals: T[],
  rules: ScoreMetricRule<T>[]
): Map<string, number> {
  const counts = new Map<string, number>(deals.map((deal) => [deal.id, 0]));

  for (const rule of rules) {
    if (!rule.scoreMetric) continue;
    const candidates = deals
      .map((deal) => ({ deal, value: rule.getValue(deal) }))
      .filter((candidate): candidate is { deal: T; value: number } =>
        candidate.value != null && Number.isFinite(candidate.value)
      );
    // One eligible candidate cannot lead a comparison row. Leaving every
    // count at zero also prevents downstream lead/trophy UI from endorsing a
    // deal by default when its peers have no comparable value.
    if (candidates.length < 2) continue;

    const bestValue =
      rule.direction === "higher"
        ? Math.max(...candidates.map((candidate) => candidate.value))
        : Math.min(...candidates.map((candidate) => candidate.value));

    for (const candidate of candidates) {
      if (candidate.value === bestValue) {
        counts.set(candidate.deal.id, (counts.get(candidate.deal.id) ?? 0) + 1);
      }
    }
  }

  return counts;
}

/** All deals sharing the highest positive count; an empty array means no row
 * had comparable data. Consumers must not collapse a multi-id result to the
 * first item. */
export function getLeadCountLeaderIds<T extends { id: string }>(
  deals: T[],
  counts: Map<string, number>
): string[] {
  if (deals.length === 0) return [];
  const max = Math.max(...deals.map((deal) => counts.get(deal.id) ?? 0));
  if (max <= 0) return [];
  return deals
    .filter((deal) => (counts.get(deal.id) ?? 0) === max)
    .map((deal) => deal.id);
}
