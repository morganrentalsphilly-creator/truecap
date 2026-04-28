"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  Home,
  Info,
  KeyRound,
  ListTree,
  Table2,
  Plus,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";
import { removeCompareDealAction } from "@/app/actions/compare";
import type { DealAssumptions } from "@/lib/compare-assumptions";
import type { CompareSnapshotV1 } from "@/lib/compare-result-snapshot";
import {
  METRIC_ROWS,
  SIGNAL_LABELS,
  formatCurrency,
  formatMetric,
  getBadgeClasses,
  getBestValue,
  getTypeLabel,
  type CompareDirection,
  type MetricRow,
  type PropertyType,
  type Signal,
  type StoredRecommendation,
  type StoredRiskLevel,
} from "@/lib/compare-metrics";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const MAX_COMPARE_ITEMS = 4;

export type CompareDealViewModel = {
  id: string;
  address: string;
  createdAt: string | null;
  propertyType: PropertyType | null;
  purchasePrice: number | null;
  score: number | null;
  recommendation: StoredRecommendation | null;
  riskLevel: StoredRiskLevel | null;
  scoringComplete: boolean;
  metrics: Record<string, number | null>;
  signal: Signal | null;
  assumptions: DealAssumptions;
  compareSnapshotVersion: number | null;
  compareSnapshot: CompareSnapshotV1 | null;
};

function getTypeIcon(type: PropertyType | null) {
  if (type === "multi-family") return Building2;
  if (type === "owner-occupant") return KeyRound;
  return Home;
}

function getTypeClasses(type: PropertyType | null): string {
  return "bg-card  border border-border/70 text-primary ring-border/70";
}

function fmtPct(v: number | null, decimals = 2): string {
  if (v == null) return "—";
  if (Number.isInteger(v)) return `${v}%`;
  return `${v.toFixed(decimals).replace(/\.?0+$/, "")}%`;
}

function CompareSnapshotPanel({ snapshot }: { snapshot: CompareSnapshotV1 }) {
  const { longTermSummary, assumptions, exitScenarios, taxStrategy } = snapshot;
  const s = exitScenarios.summary;
  return (
    <div className="space-y-3 text-xs">
      <div>
        <p className="mb-1.5 font-bold uppercase tracking-wide text-foreground">Saved assumptions</p>
        <ul className="space-y-1 text-muted-foreground">
          <li>Appreciation: {assumptions.appreciationRate}%</li>
          <li>Selling cost: {assumptions.sellingCostPct}%</li>
          <li>Rent growth: {assumptions.rentGrowthPct}%</li>
          <li>Expense growth: {assumptions.expenseGrowthPct}%</li>
          <li>Tax rate: {assumptions.taxRate}%</li>
        </ul>
      </div>
      <div className="border-t border-border pt-3">
        <p className="mb-1.5 font-bold uppercase tracking-wide text-foreground">Long-term summary</p>
        <ul className="space-y-1 text-muted-foreground">
          <li>10-yr cumulative cash flow: {formatCurrency(longTermSummary.tenYearCashFlow)}</li>
          <li className="flex flex-wrap items-baseline gap-x-1">
            <Tooltip delayDuration={200}>
              <TooltipTrigger asChild>
                <span className="cursor-help underline decoration-dotted decoration-muted-foreground/60 underline-offset-2">
                  10-Year After-Tax Cash Flow (Projection):
                </span>
              </TooltipTrigger>
              <TooltipContent
                side="top"
                className="max-w-xs border border-border bg-popover px-3 py-2 text-xs leading-snug text-popover-foreground shadow-md"
              >
                Includes rental cash flow plus estimated tax savings over time
              </TooltipContent>
            </Tooltip>
            <span>{formatCurrency(longTermSummary.tenYearAfterTax)}</span>
          </li>
          <li className="flex flex-wrap items-baseline gap-x-1">
            <Tooltip delayDuration={200}>
              <TooltipTrigger asChild>
                <span className="cursor-help underline decoration-dotted decoration-muted-foreground/60 underline-offset-2">
                  10-Year Tax Benefit (Tax Strategy):
                </span>
              </TooltipTrigger>
              <TooltipContent
                side="top"
                className="max-w-xs border border-border bg-popover px-3 py-2 text-xs leading-snug text-popover-foreground shadow-md"
              >
                Represents tax impact from depreciation and mortgage interest deductions
              </TooltipContent>
            </Tooltip>
            <span>{formatCurrency(longTermSummary.totalTaxBenefit)}</span>
          </li>
          <li>Year 10 cash flow: {formatCurrency(longTermSummary.year10CashFlow)}</li>
          <li>Year 10 exit profit: {formatCurrency(longTermSummary.year10Profit)}</li>
          <li>Total ROI: {longTermSummary.totalROI.toFixed(1)}%</li>
        </ul>
      </div>
      <div className="border-t border-border pt-3">
        <p className="mb-1.5 font-bold uppercase tracking-wide text-foreground">Exit summary</p>
        <ul className="space-y-1 text-muted-foreground">
          <li>Best year to sell: {s.bestYearToSell > 0 ? `Year ${s.bestYearToSell}` : "—"}</li>
          <li>Year 5 profit: {formatCurrency(s.year5Profit)}</li>
          <li>Year 10 profit: {formatCurrency(s.year10Profit)}</li>
          <li>Total ROI: {s.totalROI.toFixed(1)}%</li>
        </ul>
      </div>
      <div className="border-t border-border pt-3">
        <p className="mb-1.5 font-bold uppercase tracking-wide text-foreground">Tax strategy (10 yr)</p>
        <p className="flex flex-wrap items-baseline gap-x-1 text-[11px] text-muted-foreground">
          <Tooltip delayDuration={200}>
            <TooltipTrigger asChild>
              <span className="cursor-help underline decoration-dotted decoration-muted-foreground/60 underline-offset-2">
                10-Year Tax Benefit (Tax Strategy):
              </span>
            </TooltipTrigger>
            <TooltipContent
              side="top"
              className="max-w-xs border border-border bg-popover px-3 py-2 text-xs leading-snug text-popover-foreground shadow-md"
            >
              Represents tax impact from depreciation and mortgage interest deductions
            </TooltipContent>
          </Tooltip>
          <span>{formatCurrency(taxStrategy.totalTaxBenefit)}</span>
        </p>
      </div>
      <p className="border-t border-border pt-2 text-[11px] leading-snug text-muted-foreground">
        Loaded from the saved analysis snapshot (no recalculation).
      </p>
    </div>
  );
}

function AssumptionsPanel({ assumptions, purchasePrice }: { assumptions: DealAssumptions; purchasePrice: number | null }) {
  const { financing, income, expenses } = assumptions;
  return (
    <div className="space-y-3 text-xs">
      <div>
        <p className="mb-1.5 font-bold uppercase tracking-wide text-foreground">Financing</p>
        <ul className="space-y-1 text-muted-foreground">
          <li>Interest rate: {fmtPct(financing.interestRatePct)}</li>
          <li>Loan term: {financing.loanTermYears != null ? `${financing.loanTermYears} yr` : "—"}</li>
          <li>Down payment: {fmtPct(financing.downPaymentPct)}</li>
          {purchasePrice != null && (
            <li className="text-[11px] text-muted-foreground/90">Purchase: {formatCurrency(purchasePrice)}</li>
          )}
        </ul>
      </div>
      <div className="border-t border-border pt-3">
        <p className="mb-1.5 font-bold uppercase tracking-wide text-foreground">Income</p>
        <ul className="space-y-1 text-muted-foreground">
          <li>Total monthly rent (modeled): {formatCurrency(income.totalMonthlyRent)}</li>
          <li>{income.unitsDescription}</li>
        </ul>
      </div>
      <div className="border-t border-border pt-3">
        <p className="mb-1.5 font-bold uppercase tracking-wide text-foreground">Expenses (inputs)</p>
        <ul className="space-y-1 text-muted-foreground">
          <li>Vacancy: {fmtPct(expenses.vacancyPct)}</li>
          <li>Management: {fmtPct(expenses.managementPct)}</li>
          <li>Maintenance: {fmtPct(expenses.maintenancePct)}</li>
          <li>CapEx: {fmtPct(expenses.capexPct)}</li>
          <li>Property tax (annual %): {fmtPct(expenses.propertyTaxPct)}</li>
          <li>
            Insurance:{" "}
            {expenses.insuranceInputMode === "percent"
              ? `${fmtPct(expenses.insurancePct)} annual`
              : expenses.insuranceInputMode === "monthly"
                ? `Monthly ${formatCurrency(expenses.insuranceMonthly)}`
                : formatCurrency(expenses.insuranceMonthly)}
          </li>
        </ul>
      </div>
      <p className="border-t border-border pt-2 text-[11px] leading-snug text-muted-foreground">
        Saved from your analysis inputs. Small rounding differences vs. the table are normal.
      </p>
    </div>
  );
}

function MortgageTooltip({ deal }: { deal: CompareDealViewModel }) {
  const { financing } = deal.assumptions;
  return (
    <div className="max-w-xs space-y-1.5 text-left text-xs font-normal leading-snug">
      <p className="font-semibold text-foreground">Loan payment (principal &amp; interest)</p>
      <p className="text-muted-foreground">
        From saved financing: {fmtPct(financing.interestRatePct)} interest,{" "}
        {financing.loanTermYears != null ? `${financing.loanTermYears}-year` : "—"} term,{" "}
        {fmtPct(financing.downPaymentPct)} down on {formatCurrency(deal.purchasePrice)}.
      </p>
      <p className="text-muted-foreground">
        Property tax, insurance, and HOA are tracked separately from this loan payment.
      </p>
    </div>
  );
}

function NetCashFlowTooltip({ deal }: { deal: CompareDealViewModel }) {
  const rent = deal.metrics.monthlyRentalIncome;
  const opex = deal.metrics.totalOperatingExpenses;
  const pmt = deal.metrics.monthlyPayment;
  const ncf = deal.metrics.netCashFlow;
  return (
    <div className="max-w-xs space-y-1.5 text-left text-xs font-normal leading-snug">
      <p className="font-semibold text-foreground">Net cash flow bridge</p>
      <p className="text-muted-foreground">
        Rent {formatCurrency(rent)} − Operating expenses {formatCurrency(opex)} − Loan payment{" "}
        {formatCurrency(pmt)} → <span className="font-medium text-foreground">{formatCurrency(ncf)}</span>
      </p>
    </div>
  );
}

function DscrTooltip({ deal }: { deal: CompareDealViewModel }) {
  const rent = deal.metrics.monthlyRentalIncome;
  const opex = deal.metrics.totalOperatingExpenses;
  const pmt = deal.metrics.monthlyPayment;
  const dscr = deal.metrics.dscr;
  const noi = rent != null && opex != null ? rent - opex : null;
  return (
    <div className="max-w-xs space-y-1.5 text-left text-xs font-normal leading-snug">
      <p className="font-semibold text-foreground">DSCR (debt service coverage)</p>
      <p className="text-muted-foreground">
        Monthly NOI (before debt) ≈ Rent − Operating expenses ={" "}
        {noi == null ? "—" : formatCurrency(noi)}.
      </p>
      <p className="text-muted-foreground">
        Debt service (loan payment) = {formatCurrency(pmt)}. Ratio (NOI ÷ payment) ≈{" "}
        {dscr == null ? "—" : dscr.toFixed(2)}.
      </p>
    </div>
  );
}

type LongTermMetricKind = "currency" | "percent" | "year";
type LongTermDirection = CompareDirection | "none";

type LongTermMetricRow = {
  key: string;
  label: string;
  subsection: string;
  kind: LongTermMetricKind;
  direction: LongTermDirection;
  getValue: (deal: CompareDealViewModel) => number | null;
  scoreMetric?: boolean;
  labelTooltip?: string;
};

const LONG_TERM_METRIC_ROWS: LongTermMetricRow[] = [
  {
    key: "ltTenYearCashFlow",
    label: "10-Year Total Cash Flow",
    subsection: "FROM 10-YEAR PROJECTIONS",
    kind: "currency",
    direction: "higher",
    getValue: (d) => d.compareSnapshot?.longTermSummary.tenYearCashFlow ?? null,
    scoreMetric: true,
  },
  {
    key: "ltTenYearAfterTax",
    label: "10-Year After-Tax Cash Flow (Projection)",
    subsection: "FROM 10-YEAR PROJECTIONS",
    kind: "currency",
    direction: "higher",
    getValue: (d) => d.compareSnapshot?.longTermSummary.tenYearAfterTax ?? null,
    scoreMetric: true,
    labelTooltip: "Includes rental cash flow plus estimated tax savings over time",
  },
  {
    key: "ltYear10AnnualCashFlow",
    label: "Year 10 Annual Cash Flow",
    subsection: "FROM 10-YEAR PROJECTIONS",
    kind: "currency",
    direction: "higher",
    getValue: (d) => d.compareSnapshot?.longTermSummary.year10CashFlow ?? null,
  },
  {
    key: "ltTotalTaxBenefit",
    label: "10-Year Tax Benefit (Tax Strategy)",
    subsection: "FROM TAX STRATEGY",
    kind: "currency",
    direction: "higher",
    getValue: (d) => d.compareSnapshot?.taxStrategy.totalTaxBenefit ?? null,
    scoreMetric: true,
    labelTooltip: "Represents tax impact from depreciation and mortgage interest deductions",
  },
  {
    key: "ltYear1TaxSaving",
    label: "Year 1 Tax Saving",
    subsection: "FROM TAX STRATEGY",
    kind: "currency",
    direction: "higher",
    getValue: (d) => {
      const y = d.compareSnapshot?.taxStrategy.years.find((row) => row.year === 1);
      return y?.taxSavings ?? null;
    },
  },
  {
    key: "ltYear10TaxImpact",
    label: "Year 10 Tax Impact",
    subsection: "FROM TAX STRATEGY",
    kind: "currency",
    direction: "higher",
    getValue: (d) => {
      const y = d.compareSnapshot?.taxStrategy.years.find((row) => row.year === 10);
      return y?.netTaxBenefit ?? null;
    },
  },
  {
    key: "ltYear10Profit",
    label: "Year 10 Profit",
    subsection: "FROM EXIT SCENARIOS",
    kind: "currency",
    direction: "higher",
    getValue: (d) => d.compareSnapshot?.exitScenarios.summary.year10Profit ?? null,
    scoreMetric: true,
  },
  {
    key: "ltBestYearToSell",
    label: "Best Year to Sell",
    subsection: "FROM EXIT SCENARIOS",
    kind: "year",
    direction: "none",
    getValue: (d) => {
      const y = d.compareSnapshot?.exitScenarios.summary.bestYearToSell;
      return y != null && y > 0 ? y : null;
    },
  },
  {
    key: "ltTotalRoi",
    label: "Total ROI",
    subsection: "FROM EXIT SCENARIOS",
    kind: "percent",
    direction: "higher",
    getValue: (d) => d.compareSnapshot?.exitScenarios.summary.totalROI ?? null,
    scoreMetric: true,
  },
];

function getStrictBestLongTermDealId(row: LongTermMetricRow, deals: CompareDealViewModel[]): string | null {
  if (row.direction === "none") return null;
  const candidates = deals
    .map((deal) => ({ id: deal.id, value: row.getValue(deal) }))
    .filter((candidate): candidate is { id: string; value: number } => candidate.value != null);
  if (candidates.length === 0) return null;

  const bestValue =
    row.direction === "higher"
      ? Math.max(...candidates.map((candidate) => candidate.value))
      : Math.min(...candidates.map((candidate) => candidate.value));
  const atBest = candidates.filter((candidate) => candidate.value === bestValue);
  return atBest.length === 1 ? atBest[0]!.id : null;
}

function getLongTermHighlightedWinCounts(deals: CompareDealViewModel[]): Map<string, number> {
  const counts = new Map<string, number>(deals.map((deal) => [deal.id, 0]));
  for (const row of LONG_TERM_METRIC_ROWS.filter((metric) => metric.direction !== "none")) {
    const winnerId = getStrictBestLongTermDealId(row, deals);
    if (winnerId) counts.set(winnerId, (counts.get(winnerId) ?? 0) + 1);
  }
  return counts;
}

function getShortTermHighlightedWinCounts(deals: CompareDealViewModel[]): Map<string, number> {
  const counts = new Map<string, number>(deals.map((deal) => [deal.id, 0]));
  for (const row of METRIC_ROWS) {
    const best = getBestValue(row, deals);
    if (best == null) continue;
    for (const deal of deals) {
      const value = deal.metrics[row.key];
      if (value != null && value === best) {
        counts.set(deal.id, (counts.get(deal.id) ?? 0) + 1);
      }
    }
  }
  return counts;
}

function getLeaderIdsFromHighlightedCounts(
  deals: CompareDealViewModel[],
  counts: Map<string, number>
): string[] {
  if (deals.length === 0) return [];
  const max = Math.max(...deals.map((deal) => counts.get(deal.id) ?? 0));
  if (max <= 0) return [];
  return deals.filter((deal) => (counts.get(deal.id) ?? 0) === max).map((deal) => deal.id);
}

function getTopHighlightedIds(
  deals: CompareDealViewModel[],
  counts: Map<string, number>,
  limit: number
): Set<string> {
  return new Set(
    deals
      .map((deal) => ({ id: deal.id, count: counts.get(deal.id) ?? 0 }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit)
      .filter((deal) => deal.count > 0)
      .map((deal) => deal.id)
  );
}

function getBalancedDealIdsFromHighlightedCounts(
  deals: CompareDealViewModel[],
  shortCounts: Map<string, number>,
  longCounts: Map<string, number>
): string[] {
  const topShort = getTopHighlightedIds(deals, shortCounts, 2);
  const topLong = getTopHighlightedIds(deals, longCounts, 2);
  return deals.filter((deal) => topShort.has(deal.id) && topLong.has(deal.id)).map((deal) => deal.id);
}

function getDealRoi(deal: CompareDealViewModel): number {
  return deal.compareSnapshot?.longTermSummary.totalROI ?? Number.NEGATIVE_INFINITY;
}

function getCreatedAtTime(deal: CompareDealViewModel): number {
  return deal.createdAt ? new Date(deal.createdAt).getTime() : Number.NEGATIVE_INFINITY;
}

function getBestDealIdByWins(
  deals: CompareDealViewModel[],
  shortCounts: Map<string, number>,
  longCounts: Map<string, number>
): string | null {
  if (deals.length === 0) return null;

  return deals.reduce((best, deal) => {
    const dealWins = (shortCounts.get(deal.id) ?? 0) + (longCounts.get(deal.id) ?? 0);
    const bestWins = (shortCounts.get(best.id) ?? 0) + (longCounts.get(best.id) ?? 0);
    if (dealWins > bestWins) return deal;
    if (dealWins < bestWins) return best;

    const dealScore = deal.score ?? Number.NEGATIVE_INFINITY;
    const bestScore = best.score ?? Number.NEGATIVE_INFINITY;
    if (dealScore > bestScore) return deal;
    if (dealScore < bestScore) return best;

    const dealRoi = getDealRoi(deal);
    const bestRoi = getDealRoi(best);
    if (dealRoi > bestRoi) return deal;
    if (dealRoi < bestRoi) return best;

    return getCreatedAtTime(deal) > getCreatedAtTime(best) ? deal : best;
  }).id;
}

function formatLongTermCell(row: LongTermMetricRow, value: number | null): string {
  if (value == null) return "-";
  if (row.kind === "currency") return formatCurrency(value, row.direction === "higher");
  if (row.kind === "percent") return fmtPct(value, 1);
  return `Year ${value}`;
}

function MetricValueWithTooltip({
  deal,
  row,
  children,
}: {
  deal: CompareDealViewModel;
  row: MetricRow;
  children: React.ReactNode;
}) {
  const withTooltip = row.key === "monthlyPayment" || row.key === "netCashFlow" || row.key === "dscr";
  if (!withTooltip) return <>{children}</>;

  const body =
    row.key === "monthlyPayment" ? (
      <MortgageTooltip deal={deal} />
    ) : row.key === "netCashFlow" ? (
      <NetCashFlowTooltip deal={deal} />
    ) : (
      <DscrTooltip deal={deal} />
    );

  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>
        <span className="inline-flex cursor-help items-center gap-1.5 underline decoration-dotted decoration-muted-foreground/50 underline-offset-2">
          {children}
        </span>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        sideOffset={6}
        className="max-w-sm border border-border bg-popover px-3 py-2 text-popover-foreground shadow-md"
      >
        {body}
      </TooltipContent>
    </Tooltip>
  );
}

export function CompareDealsClient({
  deals,
}: {
  deals: CompareDealViewModel[];
}) {
  const shortTermHighlightedWinCounts = getShortTermHighlightedWinCounts(deals);
  const longTermHighlightedWinCounts = getLongTermHighlightedWinCounts(deals);
  const shortTermWinnerIds = getLeaderIdsFromHighlightedCounts(deals, shortTermHighlightedWinCounts);
  const longTermWinnerIds = getLeaderIdsFromHighlightedCounts(deals, longTermHighlightedWinCounts);
  const balancedDealIds = getBalancedDealIdsFromHighlightedCounts(
    deals,
    shortTermHighlightedWinCounts,
    longTermHighlightedWinCounts
  );
  const bestDealId = getBestDealIdByWins(deals, shortTermHighlightedWinCounts, longTermHighlightedWinCounts);

  return (
    <main className="min-h-[calc(100vh-5rem)] bg-muted/30 px-4 py-6 text-foreground sm:px-6 sm:py-8">
        <div className="w-full">
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <Button variant="ghost" size="sm" className="px-1.5 text-muted-foreground hover:text-foreground" asChild>
              <Link href="/dashboard">
                <ArrowLeft className="size-4" />
                Back
              </Link>
            </Button>
            <div className="h-6 w-px bg-border" />
            <div className="space-y-1">
              <h1 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl">Compare Deals</h1>
              <p className="text-sm text-muted-foreground">Side-by-side investment analysis</p>
            </div>
          </div>

          <div className="mb-7 grid gap-3 lg:grid-cols-[12rem_repeat(4,minmax(0,1fr))]">
            <div className="hidden lg:block" />
            {deals.map((deal) => {
              const TypeIcon = getTypeIcon(deal.propertyType);
              const typeClasses = getTypeClasses(deal.propertyType);
              const removeAction = removeCompareDealAction.bind(null, deal.id);
              const shortTermScore = shortTermHighlightedWinCounts.get(deal.id) ?? 0;
              const longTermScore = longTermHighlightedWinCounts.get(deal.id) ?? 0;
              const totalWins = shortTermScore + longTermScore;
              const isShortTermWinner = shortTermWinnerIds.includes(deal.id);
              const isLongTermWinner = longTermWinnerIds.includes(deal.id);
              const isBalancedDeal = balancedDealIds.includes(deal.id);
              const isBestDeal = bestDealId === deal.id;
              return (
                <div
                  key={deal.id}
                  className={cn(
                    "relative flex min-h-[17.5rem] flex-col rounded-2xl border p-5 ring-2 ring-transparent",
                    typeClasses,
                    isBestDeal && "ring-emerald-300"
                  )}
                >
                  {isBestDeal && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-b-xl rounded-t-sm bg-emerald-700 px-6 py-1 text-xs font-bold text-white shadow-sm">
                      Best Deal
                    </div>
                  )}
                  <form action={removeAction} className="absolute right-4 top-4">
                    <Button
                      type="submit"
                      variant="ghost"
                      size="icon-sm"
                      className="size-7 rounded-full text-muted-foreground hover:bg-background/60"
                      aria-label={`Remove ${deal.address} from comparison`}
                    >
                      <X className="size-4" />
                    </Button>
                  </form>
                  <div className="mb-3 flex items-center gap-2.5">
                    <span className="flex size-9 items-center justify-center rounded-full bg-white/75">
                      <TypeIcon className="size-4" />
                    </span>
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em]">{getTypeLabel(deal.propertyType)}</p>
                  </div>
                  <h2 className="line-clamp-3 h-[66px] overflow-hidden pr-8 text-base font-black leading-snug text-foreground">
                    {deal.address}
                  </h2>
                  <p className="mt-1.5 text-sm font-medium text-muted-foreground">{formatCurrency(deal.purchasePrice)}</p>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    {deal.scoringComplete && deal.signal ? (
                      <Badge
                        className={cn("rounded-full border px-2.5 py-1 text-xs font-bold", getBadgeClasses(deal.signal))}
                      >
                        {SIGNAL_LABELS[deal.signal]}
                      </Badge>
                    ) : (
                      <Badge className="rounded-full border border-muted bg-muted/60 px-2.5 py-1 text-xs font-bold text-muted-foreground">
                        Incomplete
                      </Badge>
                    )}
                    {isBalancedDeal && (
                      <Badge className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                        Balanced
                      </Badge>
                    )}
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <div
                      className={cn(
                        "rounded-xl border bg-muted/25 p-2.5",
                        isShortTermWinner && "border-emerald-200 bg-emerald-50"
                      )}
                    >
                      <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                        Short-Term
                      </p>
                      <p
                        className={cn(
                          "mt-1 text-sm font-black text-foreground",
                          isShortTermWinner && "text-emerald-700"
                        )}
                      >
                        {shortTermScore} win{shortTermScore === 1 ? "" : "s"}
                      </p>
                      {isShortTermWinner && (
                        <p className="mt-0.5 text-[10px] font-semibold text-emerald-700">
                          Winner
                        </p>
                      )}
                    </div>
                    <div
                      className={cn(
                        "rounded-xl border bg-muted/25 p-2.5",
                        isLongTermWinner && "border-emerald-200 bg-emerald-50"
                      )}
                    >
                      <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                        Long-Term
                      </p>
                      <p
                        className={cn(
                          "mt-1 text-sm font-black text-foreground",
                          isLongTermWinner && "text-emerald-700"
                        )}
                      >
                        {longTermScore} win{longTermScore === 1 ? "" : "s"}
                      </p>
                      {isLongTermWinner && (
                        <p className="mt-0.5 text-[10px] font-semibold text-emerald-700">
                          Winner
                        </p>
                      )}
                    </div>
                  </div>

                  {isBalancedDeal && !isBestDeal && (
                    <p className="mt-2 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[11px] font-medium leading-snug text-emerald-800">
                      Top 2 in both short-term and long-term scoring.
                    </p>
                  )}
                  {isBestDeal && (
                    <p className="mt-2 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[11px] font-medium leading-snug text-emerald-800">
                      Top performer across most metrics with {totalWins} total win{totalWins === 1 ? "" : "s"}.
                    </p>
                  )}

                  <div className="mt-auto flex justify-end gap-1 pt-4">
                    {deal.compareSnapshot ? (
                      <Popover>
                        <Tooltip delayDuration={200}>
                          <TooltipTrigger asChild>
                            <PopoverTrigger asChild>
                              <Button
                                type="button"
                                variant="outline"
                                size="icon-sm"
                                className="!px-2 !py-1 h-8 gap-1.5 text-xs font-semibold"
                                aria-label="View saved projection snapshot"
                              >
                                <Table2 className="size-3.5" />
                              </Button>
                            </PopoverTrigger>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" sideOffset={6} className="text-xs">
                            Saved projections
                          </TooltipContent>
                        </Tooltip>
                        <PopoverContent className="w-80 max-h-[min(70vh,28rem)] overflow-y-auto" align="start">
                          <CompareSnapshotPanel snapshot={deal.compareSnapshot} />
                        </PopoverContent>
                      </Popover>
                    ) : null}
                    <Popover>
                      <Tooltip delayDuration={200}>
                        <TooltipTrigger asChild>
                          <PopoverTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon-sm"
                              className="!px-2 !py-1 h-8 gap-1.5 text-xs font-semibold"
                              aria-label="View inputs"
                            >
                              <ListTree className="size-3.5" />
                            </Button>
                          </PopoverTrigger>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" sideOffset={6} className="text-xs">
                          View inputs
                        </TooltipContent>
                      </Tooltip>
                      <PopoverContent className="w-80 max-h-[min(70vh,28rem)] overflow-y-auto" align="start">
                        <AssumptionsPanel assumptions={deal.assumptions} purchasePrice={deal.purchasePrice} />
                      </PopoverContent>
                    </Popover>
                  </div>
                 
                </div>
              );
            })}
            {deals.length < MAX_COMPARE_ITEMS && (
              <Link
                href="/dashboard/saved-analyses"
                className="flex min-h-36 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-card/50 text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
              >
                <span className="mb-3 flex size-10 items-center justify-center rounded-full border border-border bg-background">
                  <Plus className="size-5" />
                </span>
                <span className="text-sm font-semibold">Add</span>
              </Link>
            )}
          </div>

          <p className="mb-4 flex items-center gap-2 text-[11px] text-muted-foreground">
            <Info className="size-3.5 shrink-0" />
            <span>
              Hover dotted values (Net cash flow, Loan payment, DSCR) for a quick breakdown. Use each deal&apos;s{" "}
              <span className="font-medium text-foreground"><ListTree className="size-3.5 inline-block ml-1 mr-1" /></span> button to open saved assumptions.
            </span>
          </p>

          <div className="space-y-8">
            {(["RETURNS", "RISK", "DEAL"] as const).map((group) => (
              <section key={group} className="space-y-2">
                <div className="grid gap-3 lg:grid-cols-[12rem_repeat(4,minmax(0,1fr))]">
                  <h3 className="px-1 text-xs font-black tracking-[0.24em] text-muted-foreground">{group}</h3>
                </div>
                {METRIC_ROWS.filter((row) => row.group === group).map((row) => {
                  const best = getBestValue(row, deals);
                  return (
                    <div key={row.key} className="grid gap-3 lg:grid-cols-[12rem_repeat(4,minmax(0,1fr))]">
                      <div className="flex min-h-12 items-center rounded-xl bg-card px-4 text-sm font-medium text-muted-foreground">
                        {row.label}
                      </div>
                      {deals.map((deal) => {
                        const value = deal.metrics[row.key];
                        const isBest = value != null && best != null && value === best;
                        const TrendIcon = row.direction === "higher" ? TrendingUp : TrendingDown;
                        return (
                          <div
                            key={`${deal.id}-${row.key}`}
                            className={cn(
                              "flex min-h-12 items-center justify-center rounded-xl px-3 text-sm font-black sm:text-base",
                              isBest
                                ? "border border-emerald-200 bg-emerald-100/65 text-emerald-700"
                                : "bg-muted/25 text-foreground",
                              value == null && "text-muted-foreground"
                            )}
                          >
                            <MetricValueWithTooltip deal={deal} row={row}>
                              <span className="inline-flex items-center gap-1.5">
                                {value != null && (
                                  <TrendIcon
                                    className={cn("size-4", isBest ? "text-emerald-700" : "text-muted-foreground/50")}
                                  />
                                )}
                                {formatMetric(value, row)}
                              </span>
                            </MetricValueWithTooltip>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </section>
            ))}

            <section className="space-y-2">
              <div className="grid gap-3 lg:grid-cols-[12rem_repeat(4,minmax(0,1fr))]">
                <h3 className="px-1 text-xs font-black tracking-[0.24em] text-muted-foreground">LONG-TERM PERFORMANCE</h3>
              </div>
              {LONG_TERM_METRIC_ROWS.map((row, rowIndex) => {
                const prevSubsection = rowIndex > 0 ? LONG_TERM_METRIC_ROWS[rowIndex - 1]!.subsection : null;
                const showSubsection = row.subsection !== prevSubsection;
                const strictBestDealId = getStrictBestLongTermDealId(row, deals);
                return (
                  <div key={row.key} className="space-y-2">
                    {showSubsection ? (
                      <div className="grid gap-3 lg:grid-cols-[12rem_repeat(4,minmax(0,1fr))]">
                        <p className="px-1 pt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground/90">
                          {row.subsection}
                        </p>
                      </div>
                    ) : null}
                    <div className="grid gap-3 lg:grid-cols-[12rem_repeat(4,minmax(0,1fr))]">
                      <div className="flex min-h-12 items-center rounded-xl bg-card px-4 text-left text-sm font-medium leading-snug text-muted-foreground">
                        {row.labelTooltip ? (
                          <Tooltip delayDuration={200}>
                            <TooltipTrigger asChild>
                              <span className="cursor-help underline decoration-dotted decoration-muted-foreground/50 underline-offset-2">
                                {row.label}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent
                              side="top"
                              sideOffset={6}
                              className="max-w-xs border border-border bg-popover px-3 py-2 text-xs leading-snug text-popover-foreground shadow-md"
                            >
                              {row.labelTooltip}
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          row.label
                        )}
                      </div>
                      {deals.map((deal) => {
                        const value = row.getValue(deal);
                        const isBest = strictBestDealId === deal.id;
                        const TrendIcon = row.direction === "lower" ? TrendingDown : TrendingUp;
                        const showTrend = row.direction !== "none" && value != null;
                        return (
                          <div
                            key={`${deal.id}-${row.key}`}
                            className={cn(
                              "flex min-h-12 items-center justify-center rounded-xl px-3 text-sm font-black sm:text-base",
                              isBest
                                ? "border border-emerald-200 bg-emerald-100/65 text-emerald-700"
                                : "bg-muted/25 text-foreground",
                              value == null && "text-muted-foreground"
                            )}
                          >
                            <span className="inline-flex items-center gap-1.5">
                              {showTrend && (
                                <TrendIcon
                                  className={cn("size-4", isBest ? "text-emerald-700" : "text-muted-foreground/50")}
                                />
                              )}
                              {formatLongTermCell(row, value)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </section>
          </div>
        </div>
      </main>
  );
}
