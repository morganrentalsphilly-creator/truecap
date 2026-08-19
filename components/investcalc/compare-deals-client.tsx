"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import * as Sentry from "@sentry/nextjs";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  BarChart3,
  Building2,
  CalendarDays,
  Home,
  Info,
  KeyRound,
  ListTree,
  Table2,
  Plus,
  Trophy,
  TrendingUp,
  X,
} from "lucide-react";
import { removeCompareDealAction } from "@/app/actions/compare";
import { updateSavedDealStageAction } from "@/app/actions/saved-analyses";
import { listBuyBoxesAction } from "@/app/actions/user-buy-boxes";
import {
  buyBoxHasCriteria,
  deriveStateFromAddress,
  evaluateBuyBoxes,
  summarizeBuyBoxFit,
  type BuyBoxDealMetrics,
  type BuyBoxFitSummary,
  type NamedBuyBox,
} from "@/lib/buy-box";
import { BuyBoxFitBadge } from "@/components/investcalc/buy-box-fit-badge";
import { RiskReturn, type RiskReturnDeal } from "@/components/dashboard/RiskReturn";
import { useToast } from "@/hooks/use-toast";
import type { DealAssumptions } from "@/lib/compare-assumptions";
import { formatRoiHeadline } from "@/lib/extreme-value-format";
import type { CompareSnapshotV1 } from "@/lib/compare-result-snapshot";
import {
  METRIC_ROWS,
  SIGNAL_LABELS,
  WINNER_TALLY_EXCLUDED_KEYS,
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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScoreBreakdown } from "@/components/investcalc/score-breakdown";
import type { DealScoreBreakdown } from "@/lib/deal-score";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const MAX_COMPARE_ITEMS = 4;
const MOBILE_DEAL_COLORS = [
  {
    chip: "bg-emerald-500 text-white",
    border: "border-success/30",
    text: "text-success",
    bg: "bg-success/10",
  },
  {
    chip: "bg-blue-500 text-white",
    border: "border-primary/30",
    text: "text-primary",
    bg: "bg-primary/10",
  },
  {
    chip: "bg-rose-500 text-white",
    border: "border-rose-500/30",
    text: "text-rose-600",
    bg: "bg-rose-500/10",
  },
  {
    chip: "bg-amber-500 text-white",
    border: "border-warning/30",
    text: "text-warning-foreground",
    bg: "bg-warning/15",
  },
] as const;

export type CompareDealViewModel = {
  id: string;
  address: string;
  /** Workspace-scenario label (DM-1). Sibling scenarios share one address, so
   *  compare labels suffix this to stay tellable apart. */
  scenarioName?: string | null;
  createdAt: string | null;
  propertyType: PropertyType | null;
  purchasePrice: number | null;
  score: number | null;
  recommendation: StoredRecommendation | null;
  riskLevel: StoredRiskLevel | null;
  scoringComplete: boolean;
  /** Per-factor score breakdown for the "Why this score" popover. */
  breakdown?: DealScoreBreakdown | null;
  metrics: Record<string, number | null>;
  signal: Signal | null;
  assumptions: DealAssumptions;
  compareSnapshotVersion: number | null;
  compareSnapshot: CompareSnapshotV1 | null;
  methodologyLabel?: string;
};

function getTypeIcon(type: PropertyType | null) {
  if (type === "multi-family") return Building2;
  if (type === "owner-occupant") return KeyRound;
  return Home;
}

function getTypeClasses(_type: PropertyType | null): string {
  return "bg-card  border border-border/70 text-primary ring-border/70";
}

function getDesktopCardTopBorderClass(deal: CompareDealViewModel, isBestDeal: boolean) {
  if (isBestDeal) return "";
  if (deal.signal === "avoid") return "border-t-red-400 !border-t-2";
  if (deal.signal === "risky") return "border-t-orange-400 !border-t-2";
  if (deal.signal === "neutral") return "border-t-amber-400 !border-t-2 ";
  if (deal.signal === "strong-buy") return "border-t-emerald-500 !border-t-2";
  if (deal.signal === "buy") return "border-t-primary !border-t-2";
  return "border-t-primary !border-t-2";
}

function fmtPct(v: number | null, decimals = 2): string {
  if (v == null) return "—";
  if (Number.isInteger(v)) return `${v}%`;
  return `${v.toFixed(decimals).replace(/\.?0+$/, "")}%`;
}

function CompareSnapshotPanel({ snapshot }: { snapshot: CompareSnapshotV1 }) {
  const { longTermSummary, assumptions, exitScenarios, taxStrategy } = snapshot;
  const s = exitScenarios.summary;
  const highestProfitExit = exitScenarios.years.reduce<(typeof exitScenarios.years)[number] | null>(
    (best, year) => (!best || year.totalProfit > best.totalProfit ? year : best),
    null
  );
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
                  10-Year Illustrative Tax Impact:
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
          {/* Extreme cumulative ROI (finding 5): framed form leads; raw on title. */}
          <li title={formatRoiHeadline(longTermSummary.totalROI, { decimals: 1 }).title}>
            Total ROI: {formatRoiHeadline(longTermSummary.totalROI, { decimals: 1 }).text}
          </li>
        </ul>
      </div>
      <div className="border-t border-border pt-3">
        <p className="mb-1.5 font-bold uppercase tracking-wide text-foreground">Exit summary</p>
        <ul className="space-y-1 text-muted-foreground">
          <li>
            Highest modeled profit:{" "}
            {highestProfitExit
              ? `${formatCurrency(highestProfitExit.totalProfit)} (Year ${highestProfitExit.year})`
              : "—"}
          </li>
          <li>Year 5 profit: {formatCurrency(s.year5Profit)}</li>
          <li>Year 10 profit: {formatCurrency(s.year10Profit)}</li>
          {/* Extreme cumulative ROI (finding 5): framed form leads; raw on title. */}
          <li title={formatRoiHeadline(s.totalROI, { decimals: 1 }).title}>
            Total ROI: {formatRoiHeadline(s.totalROI, { decimals: 1 }).text}
          </li>
        </ul>
      </div>
      <div className="border-t border-border pt-3">
        <p className="mb-1.5 font-bold uppercase tracking-wide text-foreground">Illustrative tax impact (10 yr)</p>
        <p className="flex flex-wrap items-baseline gap-x-1 text-[11px] text-muted-foreground">
          <Tooltip delayDuration={200}>
            <TooltipTrigger asChild>
              <span className="cursor-help underline decoration-dotted decoration-muted-foreground/60 underline-offset-2">
                10-Year Illustrative Tax Impact:
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
          <li>
            Property tax:{" "}
            {expenses.propertyTaxInputMode === "annual" && expenses.propertyTaxAnnual != null
              ? `${formatCurrency(expenses.propertyTaxAnnual)}/yr (annual bill)`
              : `${fmtPct(expenses.propertyTaxPct)} annual`}
          </li>
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
  const pmi = deal.metrics.pmiMonthly;
  const ncf = deal.metrics.netCashFlow;
  const hasPmi = typeof pmi === "number" && pmi > 0;
  return (
    <div className="max-w-xs space-y-1.5 text-left text-xs font-normal leading-snug">
      <p className="font-semibold text-foreground">Net cash flow bridge</p>
      <p className="text-muted-foreground">
        Rent {formatCurrency(rent)} − Operating expenses {formatCurrency(opex)} − Loan payment{" "}
        {formatCurrency(pmt)}
        {hasPmi ? <> − PMI {formatCurrency(pmi)}</> : null} →{" "}
        <span className="font-medium text-foreground">{formatCurrency(ncf)}</span>
      </p>
    </div>
  );
}

/**
 * Cash-purchase detection for compared deals. The saved snapshot stores
 * monthlyPayment - 0 (or absent) signals an all-cash deal where DSCR is
 * mathematically undefined.
 */
function isCashPurchaseDeal(deal: CompareDealViewModel): boolean {
  const pmt = deal.metrics.monthlyPayment;
  return pmt == null || pmt <= 0;
}

/**
 * Render a metric cell value, overriding DSCR for cash purchases. All
 * other metrics fall through to formatMetric unchanged.
 */
function formatCellValue(deal: CompareDealViewModel, row: MetricRow): string {
  if (row.key === "dscr" && isCashPurchaseDeal(deal)) return "Cash";
  return formatMetric(deal.metrics[row.key] ?? null, row);
}

function DscrTooltip({ deal }: { deal: CompareDealViewModel }) {
  const rent = deal.metrics.monthlyRentalIncome;
  const opex = deal.metrics.totalOperatingExpenses;
  const pmt = deal.metrics.monthlyPayment;
  const dscr = deal.metrics.dscr;
  const noi = rent != null && opex != null ? rent - opex : null;
  if (isCashPurchaseDeal(deal)) {
    return (
      <div className="max-w-xs space-y-1.5 text-left text-xs font-normal leading-snug">
        <p className="font-semibold text-foreground">DSCR (debt service coverage)</p>
        <p className="text-muted-foreground">
          This deal has no loan, so DSCR is not applicable. The cash flow column already reflects the all-cash purchase.
        </p>
      </div>
    );
  }
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
    label: "10-Year Illustrative Tax Impact",
    subsection: "FROM ILLUSTRATIVE TAX IMPACT",
    kind: "currency",
    direction: "higher",
    getValue: (d) => d.compareSnapshot?.taxStrategy.totalTaxBenefit ?? null,
    scoreMetric: true,
    labelTooltip: "Represents tax impact from depreciation and mortgage interest deductions",
  },
  {
    key: "ltYear1TaxSaving",
    label: "Year 1 Tax Saving",
    subsection: "FROM ILLUSTRATIVE TAX IMPACT",
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
    subsection: "FROM ILLUSTRATIVE TAX IMPACT",
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
    label: "Highest Modeled Profit Year",
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
    // Max Offer scales with price/NOI, not deal quality — leaving it in the
    // tally handed the most expensive property a free win on every compare.
    if (WINNER_TALLY_EXCLUDED_KEYS.has(row.key)) continue;
    // For DSCR, only rank financed deals against each other - a cash
    // purchase's stored dscr=0 isn't comparable to a real ratio.
    const eligibleDeals =
      row.key === "dscr" ? deals.filter((deal) => !isCashPurchaseDeal(deal)) : deals;
    const best = getBestValue(row, eligibleDeals);
    if (best == null) continue;
    for (const deal of eligibleDeals) {
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

/**
 * DEC-3 guard: winning the most metrics in a weak set is not a buy signal.
 * A "best" deal that is avoid/risky or cash-flow negative gets "best of this
 * set" framing instead of the unconditional crown.
 */
function doesBestDealClearBar(deal: CompareDealViewModel | null): boolean {
  if (!deal) return false;
  if (deal.signal === "avoid" || deal.signal === "risky") return false;
  const netCashFlow = deal.metrics.netCashFlow;
  if (netCashFlow != null && netCashFlow < 0) return false;
  return true;
}

/**
 * DEC-3: Compare ends in an action. Rendered on the winner card — open its
 * workspace, and one tap to mark the losers Passed. The bulk stage write is
 * confirm-first (never silent), reuses updateSavedDealStageAction (which
 * enforces the "pipeline" entitlement server-side), and only mounts when the
 * page says the user holds that entitlement — the same gate every other
 * stage write respects. Per-deal failures surface as toasts, never throws.
 */
function WinnerActions({
  winner,
  others,
  canUsePipeline,
}: {
  winner: CompareDealViewModel;
  others: CompareDealViewModel[];
  canUsePipeline: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isPassing, startPassing] = useTransition();

  const markOthersPassed = () => {
    setConfirmOpen(false);
    startPassing(async () => {
      try {
        const results = await Promise.all(
          others.map(async (deal) => ({
            deal,
            result: await updateSavedDealStageAction(deal.id, "passed"),
          }))
        );
        const failures = results.filter(({ result }) => !result.ok);
        const passedCount = results.length - failures.length;
        if (passedCount > 0) {
          toast({
            title: `Marked ${passedCount} deal${passedCount === 1 ? "" : "s"} as Passed`,
            description: "They leave this comparison — find them under Passed in My Deals.",
            variant: "success",
          });
        }
        for (const { deal, result } of failures) {
          if (result.ok) continue;
          toast({
            title: `Could not mark ${getShortAddress(deal.address)} as Passed`,
            description: result.message,
            variant: "destructive",
          });
        }
        // Passed deals drop out of the active compare set on refresh; the
        // winner stays, ready to open.
        router.refresh();
      } catch (err) {
        // One of the stage updates REJECTED rather than returning {ok:false}
        // (network blip, cold-start 500, stale-deploy Server Action), so
        // Promise.all rejected and the whole batch fell through with no signal.
        // Tell the user it's retryable; a refresh reconciles which deals (if
        // any) actually moved before the failure.
        Sentry.captureException(err, { tags: { feature: "compare" } });
        toast({
          title: "Could not mark deals as Passed",
          description: "Something interrupted the request. Check your connection and try again.",
          variant: "destructive",
        });
        router.refresh();
      }
    });
  };

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border/70 pt-3">
      <Button asChild size="sm" className="rounded-full">
        <Link href={`/dashboard/saved-analyses/${winner.id}`}>
          Open this deal
          <ArrowUpRight className="ml-1 size-3.5" />
        </Link>
      </Button>
      {canUsePipeline && others.length > 0 ? (
        <Popover open={confirmOpen} onOpenChange={setConfirmOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-full"
              disabled={isPassing}
            >
              {isPassing
                ? "Marking…"
                : `Mark the other${others.length === 1 ? "" : "s"} as Passed`}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-72">
            <p className="text-sm font-semibold text-foreground">
              Mark {others.length === 1 ? "1 deal" : `${others.length} deals`} as Passed?
            </p>
            <p className="mt-1 text-xs leading-snug text-muted-foreground">
              {others.map((deal) => getShortAddress(deal.address)).join(", ")} will move to the
              Passed stage and drop out of this comparison. You can restage them from My Deals
              anytime.
            </p>
            <div className="mt-3 flex justify-end gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmOpen(false)}>
                Cancel
              </Button>
              <Button type="button" size="sm" onClick={markOthersPassed}>
                Mark as Passed
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      ) : null}
    </div>
  );
}

/**
 * The compare grid's only percent-kind long-term row is the cumulative
 * 10-yr Total ROI — extreme values (finding 5) render the framed band in
 * the cell, with the raw figure surfaced on the cell's title attr (see
 * longTermRoiCellTitle). Sane values keep fmtPct exactly as before.
 */
function formatLongTermPercent(value: number): string {
  const headline = formatRoiHeadline(value, { decimals: 1, compact: true });
  return headline.extreme ? headline.text : fmtPct(value, 1);
}

/** Raw-value caution for the Total ROI cells; undefined when sane. */
function longTermRoiCellTitle(row: LongTermMetricRow, value: number | null): string | undefined {
  if (row.kind !== "percent") return undefined;
  return formatRoiHeadline(value, { decimals: 1 }).title;
}

function formatLongTermCell(row: LongTermMetricRow, value: number | null): string {
  if (value == null) return "-";
  if (row.kind === "currency") return formatCurrency(value, row.direction === "higher");
  if (row.kind === "percent") return formatLongTermPercent(value);
  return `Year ${value}`;
}

function formatCompactCurrency(value: number, signed = false): string {
  const abs = Math.abs(value);
  const formatted =
    abs >= 1000
      ? `$${(abs / 1000).toFixed(abs >= 10000 ? 0 : 1).replace(/\.0$/, "")}k`
      : `$${abs.toFixed(0)}`;
  if (!signed) return value < 0 ? `-${formatted}` : formatted;
  if (value > 0) return `+${formatted}`;
  if (value < 0) return `-${formatted}`;
  return formatted;
}

function formatCompactMetric(value: number | null, row: MetricRow): string {
  if (value == null) return "-";
  if (row.kind === "currency") return formatCompactCurrency(value, row.direction === "higher");
  if (row.kind === "percent") {
    const decimals = row.decimals ?? 1;
    return `${row.direction === "higher" && value > 0 ? "+" : ""}${value.toFixed(decimals)}%`;
  }
  return value.toFixed(row.decimals ?? 0);
}

function formatCompactLongTermMetric(row: LongTermMetricRow, value: number | null): string {
  if (value == null) return "-";
  if (row.kind === "currency") return formatCompactCurrency(value, row.direction === "higher");
  if (row.kind === "percent") {
    // Mobile compact grid: title attrs never surface on touch, and two
    // extreme deals both reading ">300%" beside one trophy look arbitrary
    // — compare is a RANKING surface, so the raw figure rides inline here
    // (small, after the caution). Desktop cells keep hover titles.
    const headline = formatRoiHeadline(value, { decimals: 1, compact: true });
    return headline.extreme
      ? `${headline.text} (${Math.round(value)}%)`
      : formatLongTermPercent(value);
  }
  return `Yr ${value}`;
}

function getShortAddress(address: string): string {
  const words = address.trim().split(/\s+/).filter(Boolean);
  if (words.length <= 3) return address;
  return words.slice(0, 3).join(" ");
}

/** Display name for a compared deal. Sibling scenarios share one address, so
 *  the scenario name rides along — otherwise 2-4 identical labels (the exact
 *  set the ScenariosCard "Compare" button produces) are untellable apart. */
function getDealLabel(deal: CompareDealViewModel, opts?: { short?: boolean }): string {
  const base = opts?.short ? getShortAddress(deal.address) : deal.address;
  return deal.scenarioName ? `${base} · ${deal.scenarioName}` : base;
}

function getMobileDealColor(index: number) {
  return MOBILE_DEAL_COLORS[index % MOBILE_DEAL_COLORS.length]!;
}

function getMetricGuidanceBody(deal: CompareDealViewModel, row: MetricRow) {
  if (row.key === "monthlyPayment") return <MortgageTooltip deal={deal} />;
  if (row.key === "netCashFlow") return <NetCashFlowTooltip deal={deal} />;
  if (row.key === "dscr") return <DscrTooltip deal={deal} />;
  return null;
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
  const body = getMetricGuidanceBody(deal, row);
  if (!body) return <>{children}</>;

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

function MobileMetricValue({
  deal,
  row,
  value,
  className,
}: {
  deal: CompareDealViewModel;
  row: MetricRow;
  value: number | null;
  className?: string;
}) {
  const body = getMetricGuidanceBody(deal, row);
  // DSCR is N/A for cash purchases - override the compact display.
  const text =
    row.key === "dscr" && isCashPurchaseDeal(deal)
      ? "Cash"
      : formatCompactMetric(value, row);
  if (!body) return <p className={className}>{text}</p>;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn("inline-flex max-w-full items-center justify-center gap-1 underline decoration-dotted underline-offset-2", className)}
          aria-label={`View guidance for ${row.label} on ${deal.address}`}
        >
          <span className="truncate">{text}</span>
          <Info className="size-3 shrink-0 opacity-70" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 max-h-[min(70vh,28rem)] overflow-y-auto" align="center">
        {body}
      </PopoverContent>
    </Popover>
  );
}

function MobileLongTermLabel({ row }: { row: LongTermMetricRow }) {
  if (!row.labelTooltip) {
    return <p className="text-[11px] font-bold text-muted-foreground">{row.label}</p>;
  }

  return (
    <div className="flex items-center gap-1.5">
      <p className="text-[11px] font-bold text-muted-foreground">{row.label}</p>
      <Popover>
        <PopoverTrigger asChild>
          {/* before:-inset-2 = invisible 36px tap band around the 20px icon
              (WCAG 2.5.8) — visual size unchanged, nothing interactive nearby. */}
          <button
            type="button"
            className="relative inline-flex size-5 items-center justify-center rounded-full bg-muted text-muted-foreground before:absolute before:-inset-2"
            aria-label={`View guidance for ${row.label}`}
          >
            <Info className="size-3" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-72 text-xs leading-snug" align="start">
          {row.labelTooltip}
        </PopoverContent>
      </Popover>
    </div>
  );
}

function CompareMobileDealStrip({ deals }: { deals: CompareDealViewModel[] }) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {deals.map((deal, index) => {
        const color = getMobileDealColor(index);
        return (
          <div key={deal.id} className={cn("flex min-h-28 flex-col rounded-2xl border bg-card p-2 shadow-sm", color.border)}>
            <div className="flex items-start justify-between gap-1 max-[380px]:flex-wrap">
              <span className={cn("inline-flex size-5 items-center justify-center rounded-full text-[11px] font-extrabold", color.chip)}>
                {index + 1}
              </span>
              <div className="flex items-center gap-0.5 max-[380px]:mt-1 max-[380px]:basis-full max-[380px]:justify-start">
                {deal.compareSnapshot ? (
                  <Popover>
                    <Tooltip delayDuration={200}>
                      <TooltipTrigger asChild>
                        <PopoverTrigger asChild>
                          {/* Invisible tap band (WCAG 2.5.8): full-height + LEFT-only
                              horizontal expansion — the sibling "View inputs" trigger
                              sits 2px to the right, so a symmetric -inset would overlap
                              its hit area and misroute taps. */}
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            className="relative size-6 rounded-full text-muted-foreground hover:bg-muted before:absolute before:-inset-y-2 before:-left-2 before:right-0"
                            aria-label={`View saved projection snapshot for ${deal.address}`}
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
                        {/* Mirror of the snapshot trigger above: expand RIGHT/outward
                            only so the two 24px triggers' tap bands never overlap. */}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className="relative size-6 rounded-full text-muted-foreground hover:bg-muted before:absolute before:-inset-y-2 before:left-0 before:-right-2"
                          aria-label={`View inputs for ${deal.address}`}
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
            <p className="mt-1.5 line-clamp-2 text-[11px] font-extrabold leading-tight text-foreground">
              {getDealLabel(deal, { short: true })}
            </p>
            {deal.methodologyLabel ? (
              <p className="mt-0.5 text-[9px] leading-tight text-muted-foreground">
                {deal.methodologyLabel}
              </p>
            ) : null}
            <p className="mt-auto pt-2 text-[10px] font-semibold text-muted-foreground">
              {formatCurrency(deal.purchasePrice)}
            </p>
          </div>
        );
      })}
      {deals.length < MAX_COMPARE_ITEMS ? (
        <Link
          href="/dashboard/saved-analyses"
          className="flex min-h-28 flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/60 p-2 text-muted-foreground shadow-sm transition-colors hover:border-primary/40 hover:text-primary"
        >
          <span className="mb-2 flex size-8 items-center justify-center rounded-full border border-border bg-background">
            <Plus className="size-4" />
          </span>
          <span className="text-[11px] font-bold">Add</span>
        </Link>
      ) : null}
    </div>
  );
}

function CompareMobileHighlights({
  bestDeal,
  bestDealClears,
  otherDeals,
  canUsePipeline,
  highestRoiDeal,
  strongestDscrDeal,
  shortTermHighlightedWinCounts,
  longTermHighlightedWinCounts,
}: {
  bestDeal: CompareDealViewModel | null;
  bestDealClears: boolean;
  otherDeals: CompareDealViewModel[];
  canUsePipeline: boolean;
  highestRoiDeal: CompareDealViewModel | null;
  strongestDscrDeal: CompareDealViewModel | null;
  shortTermHighlightedWinCounts: Map<string, number>;
  longTermHighlightedWinCounts: Map<string, number>;
}) {
  return (
    <>
      {/* DSCR is N/A on all-cash compares — drop that tile entirely rather than
          show "—", and collapse the row to 2-up so it doesn't leave a gap. */}
      <div className={`grid gap-2 ${strongestDscrDeal?.metrics.dscr != null ? "grid-cols-3" : "grid-cols-2"}`}>
        <div className="rounded-2xl bg-card p-3 shadow-sm">
          <p className="text-[10px] font-extrabold text-success">Best Deal</p>
          <p className="mt-1 line-clamp-2 text-xs font-extrabold leading-tight text-foreground">
            {bestDeal ? getDealLabel(bestDeal, { short: true }) : "-"}
          </p>
        </div>
        <div className="rounded-2xl bg-card p-3 shadow-sm">
          <p className="text-[10px] font-extrabold text-primary">Highest ROI</p>
          {/* Extreme cumulative 10-yr ROI (finding 5): framed band + raw on
              title. The CoC fallback is an ANNUAL year-1 metric — different
              scale, never framed here. */}
          <p
            className="mt-1 text-xs font-extrabold text-foreground"
            title={
              highestRoiDeal?.compareSnapshot?.longTermSummary.totalROI != null
                ? formatRoiHeadline(highestRoiDeal.compareSnapshot.longTermSummary.totalROI, { decimals: 1 }).title
                : undefined
            }
          >
            {highestRoiDeal?.compareSnapshot?.longTermSummary.totalROI != null
              ? formatLongTermPercent(highestRoiDeal.compareSnapshot.longTermSummary.totalROI)
              : fmtPct(highestRoiDeal?.metrics.cocReturn ?? null, 1)}
          </p>
        </div>
        {strongestDscrDeal?.metrics.dscr != null ? (
          <div className="rounded-2xl bg-card p-3 shadow-sm">
            <p className="text-[10px] font-extrabold text-primary">Strongest DSCR</p>
            <p className="mt-1 text-xs font-extrabold text-foreground">
              {strongestDscrDeal.metrics.dscr.toFixed(2)}
            </p>
          </div>
        ) : null}
      </div>

      {bestDeal ? (
        <div className="rounded-3xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-muted-foreground">Selected Winner</p>
              <h2 className="mt-1 text-base font-extrabold leading-tight text-foreground">{getDealLabel(bestDeal, { short: true })}</h2>
            </div>
            <Badge
              className={cn(
                "rounded-full border",
                bestDealClears
                  ? "border-success/30 bg-success/10 text-success"
                  : "border-warning/30 bg-warning/15 text-warning-foreground"
              )}
            >
              {bestDealClears ? "Best" : "Best of set"}
            </Badge>
          </div>
          {!bestDealClears ? (
            // DEC-3: no unconditional crown for the best of a bad bunch.
            <p className="mt-2 rounded-lg bg-warning/15 px-2.5 py-1.5 text-[11px] font-medium leading-snug text-warning-foreground">
              Best of this set — but it doesn&apos;t clear your targets.
            </p>
          ) : null}
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-2xl bg-muted/40 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Short Score</p>
              <p className="mt-1 text-lg font-extrabold text-foreground">{shortTermHighlightedWinCounts.get(bestDeal.id) ?? 0}</p>
            </div>
            <div className="rounded-2xl bg-muted/40 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Long Score</p>
              <p className="mt-1 text-lg font-extrabold text-foreground">{longTermHighlightedWinCounts.get(bestDeal.id) ?? 0}</p>
            </div>
          </div>
          <WinnerActions winner={bestDeal} others={otherDeals} canUsePipeline={canUsePipeline} />
        </div>
      ) : null}
    </>
  );
}

export function CompareDealsClient({
  deals,
  canUsePipeline = false,
}: {
  deals: CompareDealViewModel[];
  /** Whether the user holds the "pipeline" entitlement (server-derived) —
   *  gates the bulk "Mark the others as Passed" action the same way My
   *  Deals gates its stage writes. The server action re-enforces it. */
  canUsePipeline?: boolean;
}) {
  // Buy-box fit (PV-4) — same listBuyBoxesAction useEffect pattern as My
  // Deals. Failures / no-boxes / free users leave buyBoxes null, so the
  // "Your buy box" row group renders nothing (invisible until useful).
  const [buyBoxes, setBuyBoxes] = useState<NamedBuyBox[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    void listBuyBoxesAction()
      .then((result) => {
        if (cancelled) return;
        if (result.ok && result.canUse) {
          setBuyBoxes(result.boxes.filter((b) => b.isActive && buyBoxHasCriteria(b)));
        } else {
          setBuyBoxes(null);
        }
      })
      .catch((err) => {
        if (!cancelled) console.warn("[compare buy-box] load failed:", err);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Per-deal fit + the one personal, number-carrying line, evaluated with the
  // shared lib/buy-box primitives against the ALREADY-recomputed compare
  // metrics (the same numbers every row in this grid shows). The line comes
  // from the box that decides the verdict: the first passing box on a pass,
  // else the highest-priority active box (evaluateBuyBoxes is default-first)
  // — the exact rule the deal workspace uses.
  const buyBoxFitById = useMemo(() => {
    if (!buyBoxes || buyBoxes.length === 0) return null;
    const map = new Map<string, { fit: BuyBoxFitSummary; personalLine: string | null }>();
    for (const deal of deals) {
      const metrics: BuyBoxDealMetrics = {
        capRatePct: deal.metrics.capRate ?? null,
        cocPct: deal.metrics.cocReturn ?? null,
        // DSCR 0 means N/A for a cash purchase, not "worst possible" —
        // passing it through plotted all-cash deals as the riskiest.
        dscr: isCashPurchaseDeal(deal) ? null : deal.metrics.dscr ?? null,
        cashFlowMonthly: deal.metrics.netCashFlow ?? null,
        purchasePrice: deal.purchasePrice,
        propertyType: deal.propertyType,
        state: deriveStateFromAddress(deal.address),
        // Cash purchases have no debt service → the DSCR criterion is
        // skipped (N/A), never failed — same canon as the DSCR column.
        isCashPurchase: isCashPurchaseDeal(deal),
      };
      const results = evaluateBuyBoxes(buyBoxes, metrics).filter((r) => r.result.active);
      if (results.length === 0) continue;
      const lead = results.find((r) => r.result.passes) ?? results[0];
      map.set(deal.id, {
        fit: summarizeBuyBoxFit(results),
        personalLine: lead?.result.personalLine ?? null,
      });
    }
    return map.size > 0 ? map : null;
  }, [buyBoxes, deals]);

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
  const bestDeal = deals.find((deal) => deal.id === bestDealId) ?? deals[0] ?? null;
  const bestDealClears = doesBestDealClearBar(bestDeal);
  const nonWinnerDeals = bestDeal ? deals.filter((deal) => deal.id !== bestDeal.id) : [];
  const highestRoiDeal = deals.reduce<CompareDealViewModel | null>((best, deal) => {
    const value = deal.compareSnapshot?.longTermSummary.totalROI ?? deal.metrics.cocReturn ?? Number.NEGATIVE_INFINITY;
    const bestValue = best?.compareSnapshot?.longTermSummary.totalROI ?? best?.metrics.cocReturn ?? Number.NEGATIVE_INFINITY;
    return value > bestValue ? deal : best;
  }, null);
  // Skip cash-purchase deals when ranking strongest DSCR - they have
  // no loan, so DSCR is N/A and a stored 0 isn't comparable to a real
  // ratio. If every compared deal is cash, the tile will read "—".
  const strongestDscrDeal = deals
    .filter((deal) => !isCashPurchaseDeal(deal))
    .reduce<CompareDealViewModel | null>((best, deal) => {
      const value = deal.metrics.dscr ?? Number.NEGATIVE_INFINITY;
      const bestValue = best?.metrics.dscr ?? Number.NEGATIVE_INFINITY;
      return value > bestValue ? deal : best;
    }, null);
  const mobileSections = [
    {
      id: "returns",
      title: "Returns",
      icon: TrendingUp,
      rows: METRIC_ROWS.filter((row) => row.group === "RETURNS"),
      defaultOpen: true,
    },
    {
      id: "risk",
      title: "Risk",
      icon: Info,
      rows: METRIC_ROWS.filter((row) => row.group === "RISK"),
      defaultOpen: false,
    },
    {
      id: "deal",
      title: "Deal",
      icon: Building2,
      rows: METRIC_ROWS.filter((row) => row.group === "DEAL"),
      defaultOpen: false,
    },
  ];
  const mobileLongTermSections = [
    {
      id: "ten-year",
      title: "10-Year Performance",
      icon: BarChart3,
      rows: LONG_TERM_METRIC_ROWS.filter((row) => row.subsection === "FROM 10-YEAR PROJECTIONS"),
    },
    {
      id: "tax",
      title: "Illustrative Tax Impact",
      icon: Table2,
      rows: LONG_TERM_METRIC_ROWS.filter(
        (row) => row.subsection === "FROM ILLUSTRATIVE TAX IMPACT"
      ),
    },
    {
      id: "exit",
      title: "Exit Scenarios",
      icon: CalendarDays,
      rows: LONG_TERM_METRIC_ROWS.filter((row) => row.subsection === "FROM EXIT SCENARIOS"),
    },
  ];
  const desktopSlots = Array.from({ length: MAX_COMPARE_ITEMS }, (_, index) => deals[index] ?? null);

  /**
   * Risk vs Return — MOVED here from the dashboard (Aug-2026). Comparison is
   * this screen's job; on the dashboard it was a chart of the same saved
   * deals sitting beside a table of them. Every field below already exists
   * on the compare row — this is a shape map, not a computation.
   */
  const riskReturnDeals = useMemo<RiskReturnDeal[]>(
    () =>
      deals.map((deal) => ({
        dealId: deal.id,
        name: deal.scenarioName ? `${deal.address} — ${deal.scenarioName}` : deal.address,
        type: deal.propertyType ?? undefined,
        coc: deal.metrics.cocReturn ?? null,
        roi: deal.compareSnapshot?.longTermSummary?.totalROI ?? null,
        // DSCR 0 means N/A for a cash purchase, not "worst possible" —
        // passing it through plotted all-cash deals as the riskiest.
        dscr: isCashPurchaseDeal(deal) ? null : deal.metrics.dscr ?? null,
        isCashPurchase: (deal.metrics.monthlyPayment ?? 0) <= 0,
        size: deal.purchasePrice ?? 0,
        score: deal.score ?? undefined,
        cashFlow: deal.metrics.netCashFlow ?? undefined,
      })),
    [deals]
  );

  return (
    <main id="main" className="min-h-[calc(100vh-5rem)] bg-muted/30 px-4 py-6 text-foreground sm:px-6 sm:py-8 xl:bg-[image:var(--compare-surface)]">
        <div className="w-full">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 xl:mb-7">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="ghost" size="sm" className="mt-1 px-1.5 text-muted-foreground bg-primary/10 sm:bg-transparent" asChild>
              <Link href="/dashboard">
                <ArrowLeft className="w-4 h-4 mr-1.5" />
                <span className="hidden xl:inline">Back</span>
              </Link>
            </Button>
            <div className="h-6 w-px bg-border" />
            <div className="space-y-1">
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground xl:text-3xl">Compare Deals</h1>
              <p className="text-sm text-muted-foreground ">Side-by-side investment analysis</p>
            </div>
          </div>

        </div>
          <div className="space-y-5 xl:hidden">
            <CompareMobileDealStrip deals={deals} />
            <CompareMobileHighlights
              bestDeal={bestDeal}
              bestDealClears={bestDealClears}
              otherDeals={nonWinnerDeals}
              canUsePipeline={canUsePipeline}
              highestRoiDeal={highestRoiDeal}
              strongestDscrDeal={strongestDscrDeal}
              shortTermHighlightedWinCounts={shortTermHighlightedWinCounts}
              longTermHighlightedWinCounts={longTermHighlightedWinCounts}
            />

            {/* ── Your buy box (PV-4), mobile — one row per compared deal:
                numbered chip + Meets/Misses pill + the fit's personal line.
                Renders nothing without an active box. */}
            {buyBoxFitById ? (
              <div className="rounded-3xl border border-border bg-card p-4 shadow-sm">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-muted-foreground">
                  Your buy box
                </p>
                <ul className="mt-3 space-y-3">
                  {deals.map((deal, index) => {
                    const entry = buyBoxFitById.get(deal.id);
                    const color = getMobileDealColor(index);
                    return (
                      <li key={deal.id} className="flex items-start gap-2.5">
                        <span
                          className={cn(
                            "mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-extrabold",
                            color.chip
                          )}
                        >
                          {index + 1}
                        </span>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-xs font-extrabold leading-tight text-foreground">
                              {getDealLabel(deal, { short: true })}
                            </span>
                            <BuyBoxFitBadge fit={entry?.fit} />
                          </div>
                          {entry?.personalLine ? (
                            <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                              {entry.personalLine}
                            </p>
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}

            <Accordion type="multiple" defaultValue={["returns"]} className="space-y-3">
              {mobileSections.map((section) => {
                const SectionIcon = section.icon;
                return (
                  <AccordionItem key={section.id} value={section.id} className="rounded-3xl border border-border bg-card px-4 shadow-sm">
                    <AccordionTrigger className="items-center py-4 hover:no-underline">
                      <span className="flex  items-center gap-3">
                        <span className="grid size-8 place-items-center rounded-xl bg-primary/10 text-primary">
                          <SectionIcon className="size-4" />
                        </span>
                        <span className="font-extrabold">{section.title}</span>
                      </span>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4 pb-4">
                      {section.rows.map((row) => {
                        const best = getBestValue(row, deals);
                        return (
                          <div key={row.key} className="space-y-2 border-t border-border/70 pt-3 first:border-t-0 first:pt-0">
                            <p className="text-[11px] font-bold text-muted-foreground">{row.label}</p>
                            <div className="grid grid-cols-4 gap-2">
                              {deals.map((deal, index) => {
                                const value = deal.metrics[row.key];
                                const isBest = value != null && best != null && value === best;
                                const color = getMobileDealColor(index);
                                return (
                                  <div key={`${deal.id}-${row.key}`} className={cn("rounded-xl p-2 text-center flex flex-col items-center justify-center", isBest ? color.bg : "bg-muted/35")}>
                                    <span className="mb-1 inline-flex items-center justify-center gap-1">
                                      <span className={cn("inline-flex size-5 items-center justify-center rounded-full text-[10px] font-extrabold", color.chip)}>
                                        {index + 1}
                                      </span>
                                      {isBest ? <Trophy className="size-3 text-success" aria-hidden="true" /> : null}
                                    </span>
                                    <MobileMetricValue
                                      deal={deal}
                                      row={row}
                                      value={value}
                                      className={cn("truncate text-[11px] font-extrabold", color.text)}
                                    />
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </AccordionContent>
                  </AccordionItem>
                );
              })}

              {mobileLongTermSections.map((section) => {
                const SectionIcon = section.icon;
                return (
                  <AccordionItem key={section.id} value={section.id} className="rounded-3xl border border-border bg-card px-4 shadow-sm">
                    <AccordionTrigger className="items-center py-4 hover:no-underline">
                      <span className="flex items-center gap-3">
                        <span className="grid size-8 place-items-center rounded-xl bg-primary/10 text-primary">
                          <SectionIcon className="size-4" />
                        </span>
                        <span className="font-extrabold">{section.title}</span>
                      </span>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4 pb-4">
                      {section.rows.map((row) => {
                        const strictBestDealId = getStrictBestLongTermDealId(row, deals);
                        return (
                          <div key={row.key} className="space-y-2 border-t border-border/70 pt-3 first:border-t-0 first:pt-0">
                            <MobileLongTermLabel row={row} />
                            <div className="grid grid-cols-4 gap-2">
                              {deals.map((deal, index) => {
                                const value = row.getValue(deal);
                                const isBest = strictBestDealId === deal.id;
                                const color = getMobileDealColor(index);
                                return (
                                  <div key={`${deal.id}-${row.key}`} className={cn("rounded-xl p-2 text-center", isBest ? color.bg : "bg-muted/35")}>
                                    <span className="mx-auto mb-1 inline-flex items-center justify-center gap-1">
                                      <span className={cn("inline-flex size-5 items-center justify-center rounded-full text-[10px] font-extrabold", color.chip)}>
                                        {index + 1}
                                      </span>
                                      {isBest ? <Trophy className="size-3 text-success" aria-hidden="true" /> : null}
                                    </span>
                                    <p
                                      className={cn("truncate text-[11px] font-extrabold", color.text)}
                                      title={longTermRoiCellTitle(row, value)}
                                    >
                                      {formatCompactLongTermMetric(row, value)}
                                    </p>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </div>

          <div className="mb-7 hidden gap-5 xl:grid xl:grid-cols-4">
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
                    "relative flex min-h-[17.5rem] flex-col rounded-2xl border border-t-[3px] border-border/80 bg-card/95 p-5 shadow-[0_16px_48px_rgba(15,23,42,0.07)] ring-2 ring-transparent",
                    typeClasses,
                    getDesktopCardTopBorderClass(deal, isBestDeal),
                    isBestDeal &&
                      (bestDealClears
                        ? "border-success/30 ring-success/40"
                        : "border-warning/40 ring-amber-400/40")
                  )}
                >
                  {isBestDeal && (
                    <div
                      className={cn(
                        "absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-b-xl rounded-t-sm px-6 py-1 text-xs font-bold text-white shadow-sm",
                        bestDealClears ? "bg-emerald-700" : "bg-amber-600"
                      )}
                    >
                      {bestDealClears ? "Best Deal" : "Best of this set"}
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
                  <div className="mb-3 flex items-center gap-2.5 pt-1">
                    <span className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <TypeIcon className="size-3.5" />
                    </span>
                    <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-primary">{getTypeLabel(deal.propertyType)}</p>
                  </div>
                  <h2 className="line-clamp-2 min-h-10 overflow-hidden pr-8 text-lg font-extrabold leading-snug text-foreground">
                    {getDealLabel(deal)}
                  </h2>
                  {deal.methodologyLabel ? (
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {deal.methodologyLabel}
                    </p>
                  ) : null}
                  <p className="mt-6 text-sm font-semibold text-muted-foreground">{formatCurrency(deal.purchasePrice)}</p>
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
                    {deal.breakdown && deal.score != null ? (
                      <Popover>
                        <PopoverTrigger asChild>
                          <button type="button" className="text-[11px] font-semibold text-primary underline-offset-2 hover:underline">
                            Why?
                          </button>
                        </PopoverTrigger>
                        <PopoverContent align="start" className="w-auto p-3">
                          <ScoreBreakdown breakdown={deal.breakdown} score={deal.score} propertyType={deal.propertyType} />
                        </PopoverContent>
                      </Popover>
                    ) : null}
                    {isBalancedDeal && (
                      <Badge className="rounded-full border border-success/30 bg-success/10 px-2.5 py-1 text-xs font-bold text-success">
                        Balanced
                      </Badge>
                    )}


<div className="ml-auto flex justify-center gap-1 ">
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

                  <div className="mt-4 grid grid-cols-2 gap-0 border-t border-border/80 pt-3">
                    <div
                      className={cn(
                        "border-r border-border/80 py-1 pr-4",
                        isShortTermWinner && "text-success"
                      )}
                    >
                      <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                        Short-Term
                      </p>
                      <p
                        className={cn(
                          "mt-1 text-sm font-extrabold text-foreground",
                          isShortTermWinner && "text-success"
                        )}
                      >
                        {shortTermScore} win{shortTermScore === 1 ? "" : "s"}
                      </p>
                      {isShortTermWinner && (
                        <p className="mt-0.5 text-[10px] font-semibold text-success">
                          Winner
                        </p>
                      )}
                    </div>
                    <div
                      className={cn(
                        "py-1 pl-4",
                        isLongTermWinner && "text-success"
                      )}
                    >
                      <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                        Long-Term
                      </p>
                      <p
                        className={cn(
                          "mt-1 text-sm font-extrabold text-foreground",
                          isLongTermWinner && "text-success"
                        )}
                      >
                        {longTermScore} win{longTermScore === 1 ? "" : "s"}
                      </p>
                      {isLongTermWinner && (
                        <p className="mt-0.5 text-[10px] font-semibold text-success">
                          Winner
                        </p>
                      )}
                    </div>
                  </div>

                  {isBalancedDeal && !isBestDeal && (
                    <p className="mt-3 rounded-lg bg-success/10 px-2.5 py-1.5 text-[11px] font-medium leading-snug text-success">
                      Top 2 in both short-term and long-term scoring.
                    </p>
                  )}
                  {isBestDeal &&
                    (bestDealClears ? (
                      <p className="mt-3 rounded-lg bg-success/10 px-2.5 py-1.5 text-[11px] font-medium leading-snug text-success">
                        Top performer across most metrics with {totalWins} total win{totalWins === 1 ? "" : "s"}.
                      </p>
                    ) : (
                      // DEC-3: winning a weak set is not a buy signal.
                      <p className="mt-3 rounded-lg bg-warning/15 px-2.5 py-1.5 text-[11px] font-medium leading-snug text-warning-foreground">
                        Best of this set — but it doesn&apos;t clear your targets. It wins the most
                        metrics here; that&apos;s not a recommendation to buy.
                      </p>
                    ))}
                  {isBestDeal && (
                    <WinnerActions
                      winner={deal}
                      others={nonWinnerDeals}
                      canUsePipeline={canUsePipeline}
                    />
                  )}
                </div>
              );
            })}
            {deals.length < MAX_COMPARE_ITEMS && (
              <Link
                href="/dashboard/saved-analyses"
                className="flex min-h-[17.5rem] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/45 text-muted-foreground shadow-[0_16px_48px_rgba(15,23,42,0.04)] transition-colors hover:border-primary/40 hover:text-primary"
              >
                <span className="mb-3 flex size-12 items-center justify-center rounded-full border border-border bg-background">
                  <Plus className="size-5" />
                </span>
                <span className="text-sm font-semibold">Add</span>
                <span className="mt-1 text-xs text-muted-foreground">Up to 4 deals</span>
              </Link>
            )}
          </div>

          <div className="hidden space-y-4 xl:block">
            {/* ── Your buy box (PV-4) — the personal row group: per deal a
                Meets/Misses pill (the shared My Deals badge) + the fit's one
                number-carrying line ("Biggest gap — Cap rate: 5.2% vs ≥ 6.0%
                (0.8pp short)"). Evaluated from the same recomputed metrics as
                every other row; renders nothing without an active box. */}
            {buyBoxFitById ? (
              <section className="space-y-1.5">
                <div className="grid grid-cols-4">
                  <h3 className="col-span-4 px-1 text-xs font-extrabold tracking-[0.24em] text-muted-foreground">
                    YOUR BUY BOX
                  </h3>
                </div>
                <div className="grid grid-cols-4 gap-x-1">
                  {desktopSlots.map((deal, index) => {
                    const entry = deal ? buyBoxFitById.get(deal.id) : undefined;
                    return (
                      <div
                        key={`${deal?.id ?? "empty"}-buy-box-${index}`}
                        className="flex min-h-8 flex-col justify-center gap-1 rounded-2xl bg-card/45 px-4 py-2 text-sm"
                      >
                        {deal && entry ? (
                          <>
                            <BuyBoxFitBadge fit={entry.fit} />
                            {entry.personalLine ? (
                              <p className="text-[11px] leading-snug text-muted-foreground">
                                {entry.personalLine}
                              </p>
                            ) : null}
                          </>
                        ) : deal ? (
                          // A deal none of the boxes' criteria could read
                          // (all checks N/A) — rare, but never a blank cell.
                          <span className="text-xs font-semibold text-muted-foreground/70">
                            No criteria apply
                          </span>
                        ) : (
                          <span className="font-semibold text-muted-foreground/70">—</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            ) : null}
            {(["RETURNS", "RISK", "DEAL"] as const).map((group) => (
              <section key={group} className="space-y-1.5">
                <div className="grid grid-cols-4">
                  <h3 className="col-span-4 px-1 text-xs font-extrabold tracking-[0.24em] text-muted-foreground">{group}</h3>
                </div>
                {METRIC_ROWS.filter((row) => row.group === group).map((row) => {
                  const best = getBestValue(row, deals);
                  return (
                    <div key={row.key} className="grid grid-cols-4 gap-x-1">
                      {desktopSlots.map((deal, index) => {
                        const value = deal?.metrics[row.key] ?? null;
                        const isBest = value != null && best != null && value === best;
                        return (
                          <div
                            key={`${deal?.id ?? "empty"}-${row.key}-${index}`}
                            className={cn(
                              "flex min-h-8 items-center gap-3 rounded-full bg-card/45 px-4 text-sm",
                              index > 0 && "justify-center",
                              index === 0 && "justify-between",
                              isBest ? "text-success" : "text-foreground",
                              !deal && "text-muted-foreground"
                            )}
                          >
                            {index === 0 ? (
                              <span className="min-w-0 flex-1 truncate pr-3 font-medium leading-tight text-muted-foreground">
                                {row.label}
                              </span>
                            ) : null}
                            {deal ? (
                              <MetricValueWithTooltip deal={deal} row={row}>
                                <span className="inline-flex shrink-0 items-center gap-2 font-extrabold tabular-nums">
                                  {formatCellValue(deal, row)}
                                  {isBest ? <Trophy className="size-3.5 text-success" /> : null}
                                </span>
                              </MetricValueWithTooltip>
                            ) : (
                              <span className="shrink-0 font-semibold text-muted-foreground/70">—</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </section>
            ))}

            <section className="space-y-1.5 pt-2">
              <div className="grid grid-cols-4">
                <h3 className="col-span-4 px-1 text-xs font-extrabold tracking-[0.24em] text-muted-foreground">LONG-TERM PERFORMANCE <span className="tracking-[0.18em] text-muted-foreground/70">(10-YEAR VIEW)</span></h3>
              </div>
              {LONG_TERM_METRIC_ROWS.map((row, rowIndex) => {
                const prevSubsection = rowIndex > 0 ? LONG_TERM_METRIC_ROWS[rowIndex - 1]!.subsection : null;
                const showSubsection = row.subsection !== prevSubsection;
                const strictBestDealId = getStrictBestLongTermDealId(row, deals);
                return (
                  <div key={row.key} className="space-y-2">
                    {showSubsection ? (
                      <div className="grid grid-cols-4">
                        <p className="col-span-4 px-1 pt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground/90">
                          {row.subsection}
                        </p>
                      </div>
                    ) : null}
                    <div className="grid grid-cols-4 gap-x-1">
                      {desktopSlots.map((deal, index) => {
                        const value = deal ? row.getValue(deal) : null;
                        const isBest = deal ? strictBestDealId === deal.id : false;
                        return (
                          <div
                            key={`${deal?.id ?? "empty"}-${row.key}-${index}`}
                            className={cn(
                              "flex min-h-8 items-center gap-3 rounded-full bg-card/45 px-4 text-sm",
                              index > 0 && "justify-center",
                              index === 0 && "justify-between",
                              isBest ? "text-success" : "text-foreground",
                              !deal && "text-muted-foreground"
                            )}
                          >
                            {index === 0 ? (
                              <span className="min-w-0 flex-1 truncate pr-3 font-medium leading-tight text-muted-foreground">
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
                              </span>
                            ) : null}
                            {deal ? (
                              <span
                                className="inline-flex shrink-0 items-center gap-2 font-extrabold tabular-nums"
                                title={longTermRoiCellTitle(row, value)}
                              >
                                {formatLongTermCell(row, value)}
                                {isBest ? <Trophy className="size-3.5 text-success" /> : null}
                              </span>
                            ) : (
                              <span className="shrink-0 font-semibold text-muted-foreground/70">—</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </section>
          </div>

          {/* Risk vs Return — relocated from the dashboard. Needs at least
              two deals to say anything: over a set of one it would name the
              same address as best-return AND safest. */}
          {riskReturnDeals.length >= 2 ? (
            <div className="mt-6">
              <RiskReturn deals={riskReturnDeals} />
            </div>
          ) : null}
        </div>
      </main>
  );
}
