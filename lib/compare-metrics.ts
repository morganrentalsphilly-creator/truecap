import type { DealRiskLevel } from "./deal-score";
import type { CompareSnapshotV1 } from "./compare-result-snapshot";

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
};

export const METRIC_ROWS: MetricRow[] = [
  { key: "netCashFlow", label: "Net Cash Flow / mo", group: "RETURNS", kind: "currency", direction: "higher" },
  { key: "cocReturn", label: "Cash-on-Cash Return", group: "RETURNS", kind: "percent", direction: "higher", decimals: 1 },
  { key: "capRate", label: "Cap Rate", group: "RETURNS", kind: "percent", direction: "higher", decimals: 1 },
  { key: "afterTaxCF", label: "After-Tax Cash Flow", group: "RETURNS", kind: "currency", direction: "higher" },
  { key: "annualCashFlow", label: "Annual Cash Flow", group: "RETURNS", kind: "currency", direction: "higher" },
  { key: "dscr", label: "DSCR", group: "RISK", kind: "number", direction: "higher", decimals: 2 },
  { key: "monthlyRentalIncome", label: "Monthly Rent Income", group: "RISK", kind: "currency", direction: "higher" },
  { key: "totalOperatingExpenses", label: "Operating Expenses / mo", group: "RISK", kind: "currency", direction: "lower" },
  { key: "purchasePrice", label: "Purchase Price", group: "DEAL", kind: "currency", direction: "lower" },
  { key: "totalCashRequired", label: "Total Cash Required", group: "DEAL", kind: "currency", direction: "lower" },
  { key: "monthlyPayment", label: "Loan Payment (P&I)", group: "DEAL", kind: "currency", direction: "lower" },
  { key: "taxSavingsMonthly", label: "Tax Savings / mo", group: "DEAL", kind: "currency", direction: "higher" },
];

export const SIGNAL_LABELS: Record<Signal, string> = {
  "strong-buy": "Strong Buy",
  buy: "Buy",
  neutral: "Neutral",
  risky: "Risky",
  avoid: "Avoid",
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

export function formatMetric(value: number | null, row: MetricRow): string {
  if (value == null) return "-";
  if (row.kind === "currency") return formatCurrency(value, row.direction === "higher");
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
  const values = deals.map((deal) => deal.metrics[row.key]).filter((value): value is number => value != null);
  if (values.length === 0) return null;
  return row.direction === "higher" ? Math.max(...values) : Math.min(...values);
}

/** Inputs for head-to-head compare on short-term (saved metrics) and long-term (snapshot) separately. */
export type CompareDealScoringInput = {
  id: string;
  metrics: Record<string, number | null>;
  compareSnapshot: CompareSnapshotV1 | null;
};

type CompareCategoryMetric = {
  direction: CompareDirection;
  getValue: (d: CompareDealScoringInput) => number | null;
};

type CompareMetricGroup = {
  category: "shortTerm" | "longTerm";
  metrics: CompareCategoryMetric[];
  disallowNegativeWinner?: boolean;
  negativePenalty?: boolean;
};

const COMPARE_METRIC_GROUPS: CompareMetricGroup[] = [
  {
    category: "shortTerm",
    metrics: [
      { direction: "higher", getValue: (d) => d.metrics.netCashFlow ?? null },
      { direction: "higher", getValue: (d) => d.metrics.annualCashFlow ?? null },
    ],
  },
  {
    category: "shortTerm",
    metrics: [
      { direction: "higher", getValue: (d) => d.metrics.cocReturn ?? null },
      { direction: "higher", getValue: (d) => d.metrics.capRate ?? null },
    ],
  },
  {
    category: "shortTerm",
    metrics: [{ direction: "higher", getValue: (d) => d.metrics.dscr ?? null }],
  },
  {
    category: "longTerm",
    metrics: [],
  },
];

const LONG_TERM_SCORE_METRICS: CompareCategoryMetric[] = [
  { direction: "higher", getValue: (d) => d.compareSnapshot?.longTermSummary.tenYearCashFlow ?? null },
  { direction: "higher", getValue: (d) => d.compareSnapshot?.longTermSummary.tenYearAfterTax ?? null },
  { direction: "higher", getValue: (d) => d.compareSnapshot?.taxStrategy.totalTaxBenefit ?? null },
  { direction: "higher", getValue: (d) => d.compareSnapshot?.exitScenarios.summary.year10Profit ?? null },
  { direction: "higher", getValue: (d) => d.compareSnapshot?.exitScenarios.summary.totalROI ?? null },
];

function getStrictMetricWinnerId(
  deals: CompareDealScoringInput[],
  metric: CompareCategoryMetric,
  options?: { disallowNegativeWinner?: boolean }
): string | null {
  const candidates = deals
    .map((candidate) => ({ id: candidate.id, value: metric.getValue(candidate) }))
    .filter((candidate): candidate is { id: string; value: number } => candidate.value != null);
  if (candidates.length === 0) return null;

  const bestValue =
    metric.direction === "higher"
      ? Math.max(...candidates.map((c) => c.value))
      : Math.min(...candidates.map((c) => c.value));
  if (options?.disallowNegativeWinner && bestValue < 0) return null;

  const atBest = candidates.filter((c) => c.value === bestValue);
  return atBest.length === 1 ? atBest[0]!.id : null;
}

function getGroupWinnerId(
  deals: CompareDealScoringInput[],
  group: CompareMetricGroup
): string | null {
  const winnerIds = group.metrics
    .map((metric) =>
      getStrictMetricWinnerId(deals, metric, {
        disallowNegativeWinner: group.disallowNegativeWinner,
      })
    )
    .filter((id): id is string => Boolean(id));

  if (winnerIds.length === 0) return null;
  if (winnerIds.length !== group.metrics.length) return null;

  const [firstWinnerId] = winnerIds;
  return winnerIds.every((id) => id === firstWinnerId) ? firstWinnerId : null;
}

function countExclusiveMetricWins(
  deal: CompareDealScoringInput,
  deals: CompareDealScoringInput[],
  metrics: CompareCategoryMetric[]
): number {
  let score = 0;
  for (const metric of metrics) {
    if (getStrictMetricWinnerId(deals, metric) === deal.id) score += 1;
  }
  return score;
}

function getGroupedScore(
  deal: CompareDealScoringInput,
  deals: CompareDealScoringInput[],
  category: "shortTerm" | "longTerm"
): number {
  if (category === "longTerm") {
    return countExclusiveMetricWins(deal, deals, LONG_TERM_SCORE_METRICS);
  }

  let score = 0;
  for (const group of COMPARE_METRIC_GROUPS.filter((g) => g.category === category)) {
    const winnerId = getGroupWinnerId(deals, group);
    if (winnerId === deal.id) score += 1;
  }
  return score;
}

export type CompareCategoryWinCounts = {
  shortTerm: number;
  longTerm: number;
};

/**
 * Grouped compare scores: each metric group contributes at most one point.
 * Correlated metrics must agree on a strict winner before the group awards a vote.
 */
export function getCompareCategoryWinCounts(
  deals: CompareDealScoringInput[]
): Map<string, CompareCategoryWinCounts> {
  const map = new Map<string, CompareCategoryWinCounts>();
  for (const deal of deals) {
    map.set(deal.id, {
      shortTerm: getGroupedScore(deal, deals, "shortTerm"),
      longTerm: getGroupedScore(deal, deals, "longTerm"),
    });
  }
  return map;
}

/** Deal ids tied for the most wins in a category; empty if max ≤ 0 (e.g. all metrics tied or no long-term data). */
export function getCategoryLeaderIds(
  deals: CompareDealScoringInput[],
  winCounts: Map<string, CompareCategoryWinCounts>,
  category: "shortTerm" | "longTerm"
): string[] {
  if (deals.length === 0) return [];
  let max = -Infinity;
  for (const deal of deals) {
    const v = winCounts.get(deal.id)?.[category] ?? 0;
    if (v > max) max = v;
  }
  if (max <= 0) return [];
  return deals.filter((deal) => (winCounts.get(deal.id)?.[category] ?? 0) === max).map((deal) => deal.id);
}

function getTopRankedIds(
  deals: CompareDealScoringInput[],
  winCounts: Map<string, CompareCategoryWinCounts>,
  category: "shortTerm" | "longTerm",
  limit: number
): Set<string> {
  return new Set(
    deals
      .map((deal) => ({
        id: deal.id,
        score: winCounts.get(deal.id)?.[category] ?? 0,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .filter((deal) => deal.score > 0)
      .map((deal) => deal.id)
  );
}

/** A balanced deal must be in the top 2 for both short- and long-term grouped scores. */
export function getBalancedDealIds(
  deals: CompareDealScoringInput[],
  winCounts: Map<string, CompareCategoryWinCounts>
): string[] {
  if (deals.length === 0) return [];
  const topShort = getTopRankedIds(deals, winCounts, "shortTerm", 2);
  const topLong = getTopRankedIds(deals, winCounts, "longTerm", 2);
  return deals.filter((deal) => topShort.has(deal.id) && topLong.has(deal.id)).map((deal) => deal.id);
}
