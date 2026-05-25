/**
 * Portfolio rollup strip.
 *
 * Renders ABOVE the saved-analyses table on /dashboard/saved-analyses
 * to give the user a one-glance answer to "what does my book look like
 * right now?" — the feeling of running a portfolio, not just saving
 * deals.
 *
 * Server component. Pure presentation over precomputed numbers — no
 * data fetching, no client JS.
 *
 * Self-hides when there are fewer than 2 deals in scope (a single-deal
 * rollup is just the deal). Self-hides when no deal in the set has a
 * usable cash-flow figure, so we never render a row of em-dashes.
 *
 * Layout philosophy: 4 dense tiles in a single horizontal strip with
 * a one-line "showing N deals" subline. Sits in the same visual lane
 * as the existing page header — does not introduce a new card system
 * or compete with the deal table for attention.
 */
import type { SavedAnalysisListItem } from "@/components/investcalc/saved-analyses-page-v2";

function fmtCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function fmtMonthlyCashFlow(value: number): string {
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}${fmtCurrency(Math.abs(value))}`;
}

function fmtPct(value: number): string {
  return `${value.toFixed(1)}%`;
}

export type PortfolioRollupScope = "active" | "completed" | "archived" | "all";

function scopeLabel(scope: PortfolioRollupScope, count: number): string {
  const dealWord = count === 1 ? "deal" : "deals";
  switch (scope) {
    case "active":
      return `Active pipeline · ${count} ${dealWord} you're considering`;
    case "completed":
      return `Owned · ${count} ${dealWord} in your portfolio`;
    case "archived":
      return `Archived · ${count} ${dealWord} you passed on`;
    case "all":
    default:
      return `All time · ${count} ${dealWord}`;
  }
}

export function PortfolioRollupStrip({
  items,
  scope,
}: {
  items: SavedAnalysisListItem[];
  scope: PortfolioRollupScope;
}) {
  // Need at least 2 deals for a rollup to be meaningful — a single-deal
  // total is just that deal's headline. Save the visual real estate.
  if (items.length < 2) return null;

  // Weighted averages use purchase price as weight. Skip items missing
  // the needed field rather than letting them poison the average.
  let totalMonthlyCashFlow = 0;
  let cashFlowSampleCount = 0;
  let totalPurchasePrice = 0;
  let weightedCapNumerator = 0;
  let weightedCapDenominator = 0;
  let weightedCocNumerator = 0;
  let weightedCocDenominator = 0;
  for (const item of items) {
    if (typeof item.netCashFlowMonthly === "number" && Number.isFinite(item.netCashFlowMonthly)) {
      totalMonthlyCashFlow += item.netCashFlowMonthly;
      cashFlowSampleCount += 1;
    }
    if (typeof item.purchasePrice === "number" && Number.isFinite(item.purchasePrice) && item.purchasePrice > 0) {
      totalPurchasePrice += item.purchasePrice;
      if (typeof item.capRatePct === "number" && Number.isFinite(item.capRatePct)) {
        weightedCapNumerator += item.capRatePct * item.purchasePrice;
        weightedCapDenominator += item.purchasePrice;
      }
      if (typeof item.cocReturnPct === "number" && Number.isFinite(item.cocReturnPct)) {
        weightedCocNumerator += item.cocReturnPct * item.purchasePrice;
        weightedCocDenominator += item.purchasePrice;
      }
    }
  }

  // If literally nothing in the set has a cash flow value, the rollup
  // collapses to placeholders — hide the whole strip rather than show
  // a row of em-dashes.
  if (cashFlowSampleCount === 0 && totalPurchasePrice === 0) return null;

  const weightedCap =
    weightedCapDenominator > 0 ? weightedCapNumerator / weightedCapDenominator : null;
  const weightedCoc =
    weightedCocDenominator > 0 ? weightedCocNumerator / weightedCocDenominator : null;

  return (
    <section
      aria-label="Portfolio summary"
      className="mx-auto mt-1 w-full max-w-7xl px-4 pt-4 sm:px-6 sm:pt-6"
    >
      <div className="rounded-2xl border border-border bg-gradient-to-br from-card via-card to-card/60 p-4 shadow-sm sm:p-5">
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
          {scopeLabel(scope, items.length)}
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-5">
          <RollupTile
            label="Monthly cash flow"
            value={
              cashFlowSampleCount > 0
                ? fmtMonthlyCashFlow(totalMonthlyCashFlow)
                : "—"
            }
            sub={
              cashFlowSampleCount > 0
                ? `~${fmtCurrency(totalMonthlyCashFlow * 12)} / yr`
                : "no data"
            }
            tone={
              cashFlowSampleCount === 0
                ? "neutral"
                : totalMonthlyCashFlow > 0
                  ? "positive"
                  : totalMonthlyCashFlow < 0
                    ? "negative"
                    : "neutral"
            }
          />
          <RollupTile
            label="Total deal value"
            value={totalPurchasePrice > 0 ? fmtCurrency(totalPurchasePrice) : "—"}
            sub="sum of purchase prices"
            tone="neutral"
          />
          <RollupTile
            label="Weighted cap rate"
            value={weightedCap != null ? fmtPct(weightedCap) : "—"}
            sub="by purchase price"
            tone="neutral"
          />
          <RollupTile
            label="Weighted CoC"
            value={weightedCoc != null ? fmtPct(weightedCoc) : "—"}
            sub="cash-on-cash blended"
            tone="neutral"
          />
        </div>
      </div>
    </section>
  );
}

function RollupTile({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub: string;
  tone: "positive" | "negative" | "neutral";
}) {
  const valueColor =
    tone === "positive"
      ? "text-[var(--metric-positive,#16a34a)]"
      : tone === "negative"
        ? "text-[var(--metric-negative,#dc2626)]"
        : "text-foreground";
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      <div className={`mt-1 text-xl font-black tabular-nums sm:text-2xl ${valueColor}`}>
        {value}
      </div>
      <div className="mt-0.5 text-[11px] text-muted-foreground">{sub}</div>
    </div>
  );
}
