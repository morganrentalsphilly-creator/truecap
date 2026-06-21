import type { DealRiskLevel } from "./deal-score";

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

// Display labels for the recommendation signal. Keys (the Signal union)
// and the color/badge maps stay internal — only these shown strings use
// the criteria-based wording.
export const SIGNAL_LABELS: Record<Signal, string> = {
  "strong-buy": "Excellent fit",
  buy: "Meets buy box",
  neutral: "Watchlist",
  risky: "Needs work",
  avoid: "Does not meet buy box",
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

