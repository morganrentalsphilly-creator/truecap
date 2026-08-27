"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as Sentry from "@sentry/nextjs";
import {
  ArrowLeft,
  BarChart3,
  Building2,
  CalendarDays,
  Home,
  Info,
  KeyRound,
  ListTree,
  Loader2,
  Table2,
  Plus,
  Trophy,
  TrendingUp,
  X,
} from "lucide-react";
import { removeCompareDealAction } from "@/app/actions/compare";
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
import { DataConfidenceBadge } from "@/components/investcalc/data-confidence-badge";
import type { DealAssumptions } from "@/lib/compare-assumptions";
import type { DataConfidence } from "@/lib/data-confidence";
import type { PipelineStage } from "@/lib/pipeline";
import { formatRoiHeadline } from "@/lib/extreme-value-format";
import type { CompareSnapshotV1 } from "@/lib/compare-result-snapshot";
import {
  METRIC_ROWS,
  formatCurrency,
  formatMetric,
  getBestValue,
  getLeadCountLeaderIds,
  getTypeLabel,
  tallyScoreMetricLeads,
  type CompareDirection,
  type MetricRow,
  type PropertyType,
  type Signal,
  type StoredRecommendation,
  type StoredRiskLevel,
} from "@/lib/compare-metrics";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { DealScoreBreakdown } from "@/lib/deal-score";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { comparisonGridColumns } from "@/lib/compare-responsive";
import { CompareDealPicker, type ComparePickerDeal } from "@/components/investcalc/compare-deal-picker";

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
  /** Current stage before any bulk Pass action; retained so Undo restores the
   *  exact workflow state instead of guessing at "Analyzing". */
  pipelineStage?: PipelineStage;
  dataConfidence?: DataConfidence | null;
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
  /** Exact criteria used for this deal's Offer Ceiling, when that paid metric is present. */
  maxOfferBasisLabel?: string | null;
  signal: Signal | null;
  assumptions: DealAssumptions;
  compareSnapshotVersion: number | null;
  compareSnapshot: CompareSnapshotV1 | null;
  /** Whether the long-term rows were frozen with the saved result or were
   * rebuilt as one current-methodology result from legacy saved inputs. */
  compareSnapshotSource: "recorded" | "recomputed" | null;
  methodologyLabel?: string;
  methodologyCohort: string;
};

export function areDealMethodologiesComparable(
  deals: Pick<CompareDealViewModel, "methodologyCohort">[]
): boolean {
  if (deals.length === 0) return false;
  const cohort = deals[0]?.methodologyCohort;
  return Boolean(
    cohort &&
      !cohort.startsWith("unavailable:") &&
      deals.every((deal) => deal.methodologyCohort === cohort)
  );
}

function getTypeIcon(type: PropertyType | null) {
  if (type === "multi-family") return Building2;
  if (type === "owner-occupant") return KeyRound;
  return Home;
}

function getTypeClasses(_type: PropertyType | null): string {
  return "bg-card  border border-border/70 text-primary ring-border/70";
}

function fmtPct(v: number | null, decimals = 2): string {
  if (v == null) return "—";
  if (Number.isInteger(v)) return `${v}%`;
  return `${v.toFixed(decimals).replace(/\.?0+$/, "")}%`;
}

function CompareSnapshotPanel({
  snapshot,
  source,
}: {
  snapshot: CompareSnapshotV1;
  source: "recorded" | "recomputed";
}) {
  const { longTermSummary, assumptions, exitScenarios, taxStrategy } = snapshot;
  const s = exitScenarios.summary;
  const highestProfitExit = exitScenarios.years.reduce<(typeof exitScenarios.years)[number] | null>(
    (best, year) => (!best || year.totalProfit > best.totalProfit ? year : best),
    null
  );
  return (
    <div className="space-y-3 text-xs">
      <div>
        <p className="mb-1.5 font-bold uppercase tracking-wide text-foreground">
          {source === "recorded" ? "Recorded assumptions" : "Saved inputs used for recompute"}
        </p>
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
                Includes rental cash flow plus the signed illustrative tax effect over time; the effect may be a benefit or liability
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
          {snapshot.returnSummary ? (
            <>
              <li>Cash invested: {formatCurrency(snapshot.returnSummary.cashInvested)}</li>
              <li>
                Equity multiple: {snapshot.returnSummary.equityMultiple == null
                  ? "—"
                  : `${snapshot.returnSummary.equityMultiple.toFixed(2)}×`}
              </li>
              <li>
                IRR: {snapshot.returnSummary.irrPct == null
                  ? "—"
                  : `${snapshot.returnSummary.irrPct.toFixed(1)}%`}
              </li>
            </>
          ) : null}
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
        {source === "recorded"
          ? "Loaded from the recorded saved analysis (no recalculation)."
          : "Recomputed as one current-methodology result from the saved inputs; recorded and current projection rows are not mixed."}
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
  const fullOperatingCashOutflow = deal.metrics.totalOperatingExpenses;
  const pmt = deal.metrics.monthlyPayment;
  const pmi = deal.metrics.pmiMonthly;
  const ncf = deal.metrics.netCashFlow;
  const hasPmi = typeof pmi === "number" && pmi > 0;
  return (
    <div className="max-w-xs space-y-1.5 text-left text-xs font-normal leading-snug">
      <p className="font-semibold text-foreground">Net cash flow bridge</p>
      <p className="text-muted-foreground">
        Rent {formatCurrency(rent)} − Vacancy, operating costs &amp; CapEx reserve{" "}
        {formatCurrency(fullOperatingCashOutflow)} − Loan payment {formatCurrency(pmt)}
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

function isCashOnCashApplicable(deal: CompareDealViewModel): boolean {
  const cashInvested = deal.metrics.totalCashRequired;
  return cashInvested == null ? deal.metrics.cocReturn != null : cashInvested > 0;
}

function comparableMetricValue(
  deal: CompareDealViewModel,
  row: MetricRow
): number | null {
  if (row.key === "cocReturn" && !isCashOnCashApplicable(deal)) return null;
  return deal.metrics[row.key] ?? null;
}

export function getComparableBestValue(
  row: MetricRow,
  deals: CompareDealViewModel[]
): number | null {
  if (!areDealMethodologiesComparable(deals)) return null;
  const eligibleDeals =
    row.key === "dscr" ? deals.filter((deal) => !isCashPurchaseDeal(deal)) : deals;
  return getBestValue(row, eligibleDeals);
}

/**
 * Render a metric cell value, overriding DSCR for cash purchases. All
 * other metrics fall through to formatMetric unchanged.
 */
function formatCellValue(deal: CompareDealViewModel, row: MetricRow): string {
  if (row.key === "dscr" && isCashPurchaseDeal(deal)) return "Cash";
  if (row.key === "cocReturn" && !isCashOnCashApplicable(deal)) return "N/A";
  return formatMetric(comparableMetricValue(deal, row), row);
}

function DscrTooltip({ deal }: { deal: CompareDealViewModel }) {
  const noi = deal.metrics.noiMonthly;
  const opex = deal.metrics.operatingExpensesMonthly;
  const pmt = deal.metrics.monthlyPayment;
  const dscr = deal.metrics.dscr;
  if (isCashPurchaseDeal(deal)) {
    return (
      <div className="max-w-xs space-y-1.5 text-left text-xs font-normal leading-snug">
        <p className="font-semibold text-foreground">Model DSCR (debt service coverage)</p>
        <p className="text-muted-foreground">
          This deal has no loan, so DSCR is not applicable. The cash flow column already reflects the all-cash purchase.
        </p>
      </div>
    );
  }
  return (
    <div className="max-w-xs space-y-1.5 text-left text-xs font-normal leading-snug">
      <p className="font-semibold text-foreground">Model DSCR (debt service coverage)</p>
      <p className="text-muted-foreground">
        Monthly NOI before debt and replacement reserve ={" "}
        {formatCurrency(noi)}.
      </p>
      <p className="text-muted-foreground">
        Modeled operating expenses included in NOI = {formatCurrency(opex)}.
        Vacancy reduces effective income; the CapEx reserve stays below NOI.
      </p>
      <p className="text-muted-foreground">
        Debt service (loan payment) = {formatCurrency(pmt)}. Ratio (NOI ÷ payment) ≈{" "}
        {dscr == null ? "—" : dscr.toFixed(2)}.
      </p>
    </div>
  );
}

type LongTermMetricKind = "currency" | "percent" | "year" | "multiple";
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
    labelTooltip: "Includes rental cash flow plus the signed illustrative tax effect over time; the effect may be a benefit or liability",
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
    key: "ltYear10Equity",
    label: "Year 10 Equity",
    subsection: "FROM EXIT SCENARIOS",
    kind: "currency",
    direction: "higher",
    getValue: (d) =>
      d.compareSnapshot?.exitScenarios.years.find((row) => row.year === 10)?.equity ?? null,
  },
  {
    key: "ltYear10NetSaleProceeds",
    label: "Year 10 Net Sale Proceeds",
    subsection: "FROM EXIT SCENARIOS",
    kind: "currency",
    direction: "higher",
    getValue: (d) =>
      d.compareSnapshot?.exitScenarios.years.find((row) => row.year === 10)?.netSaleProceeds ?? null,
    scoreMetric: true,
  },
  {
    key: "ltYear10Profit",
    label: "Year 10 Profit",
    subsection: "FROM EXIT SCENARIOS",
    kind: "currency",
    direction: "higher",
    getValue: (d) => d.compareSnapshot?.exitScenarios.summary.year10Profit ?? null,
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
    label: "Total ROI (cumulative)",
    subsection: "FROM EXIT SCENARIOS",
    kind: "percent",
    direction: "higher",
    getValue: (d) => d.compareSnapshot?.exitScenarios.summary.totalROI ?? null,
  },
  {
    key: "ltEquityMultiple",
    label: "Equity Multiple",
    subsection: "FROM EXIT SCENARIOS",
    kind: "multiple",
    direction: "higher",
    getValue: (d) => d.compareSnapshot?.returnSummary?.equityMultiple ?? null,
    labelTooltip: "Total modeled distributions divided by the recorded cash invested. Available only when it was frozen with the saved result.",
  },
  {
    key: "ltIrr",
    label: "IRR (annualized)",
    subsection: "FROM EXIT SCENARIOS",
    kind: "percent",
    direction: "higher",
    getValue: (d) => d.compareSnapshot?.returnSummary?.irrPct ?? null,
    scoreMetric: true,
    labelTooltip: "Annualized return from the recorded year-by-year cash-flow and exit timeline. Older snapshots may not contain it.",
  },
];

function getBestLongTermDealIds(row: LongTermMetricRow, deals: CompareDealViewModel[]): Set<string> {
  if (!areDealMethodologiesComparable(deals)) return new Set();
  if (row.direction === "none") return new Set();
  const candidates = deals
    .map((deal) => ({ id: deal.id, value: row.getValue(deal) }))
    .filter(
      (candidate): candidate is { id: string; value: number } =>
        candidate.value != null && Number.isFinite(candidate.value)
    );
  if (candidates.length < 2) return new Set();

  const bestValue =
    row.direction === "higher"
      ? Math.max(...candidates.map((candidate) => candidate.value))
      : Math.min(...candidates.map((candidate) => candidate.value));
  return new Set(
    candidates
      .filter((candidate) => candidate.value === bestValue)
      .map((candidate) => candidate.id)
  );
}

function getLongTermHighlightedWinCounts(deals: CompareDealViewModel[]): Map<string, number> {
  if (!areDealMethodologiesComparable(deals)) {
    return new Map(deals.map((deal) => [deal.id, 0]));
  }
  return tallyScoreMetricLeads(
    deals,
    LONG_TERM_METRIC_ROWS
      .filter((row): row is LongTermMetricRow & { direction: CompareDirection } => row.direction !== "none")
      .map((row) => ({
        key: row.key,
        direction: row.direction,
        scoreMetric: row.scoreMetric,
        getValue: row.getValue,
      }))
  );
}

export function getShortTermHighlightedWinCounts(deals: CompareDealViewModel[]): Map<string, number> {
  if (!areDealMethodologiesComparable(deals)) {
    return new Map(deals.map((deal) => [deal.id, 0]));
  }
  return tallyScoreMetricLeads(
    deals,
    METRIC_ROWS.map((row) => ({
      key: row.key,
      direction: row.direction,
      scoreMetric: row.scoreMetric,
      getValue: (deal: CompareDealViewModel) =>
        row.key === "dscr" && isCashPurchaseDeal(deal)
          ? null
          : comparableMetricValue(deal, row),
    }))
  );
}

export function getLeaderIdsFromHighlightedCounts(
  deals: CompareDealViewModel[],
  counts: Map<string, number>
): string[] {
  return getLeadCountLeaderIds(deals, counts);
}

/** Extreme cumulative ROI values render the framed band. IRR is a distinct
 * annualized metric and always keeps its own raw percent display. */
function formatLongTermPercent(value: number): string {
  const headline = formatRoiHeadline(value, { decimals: 1, compact: true });
  return headline.extreme ? headline.text : fmtPct(value, 1);
}

/** Raw-value caution for the Total ROI cells; undefined when sane. */
function longTermRoiCellTitle(row: LongTermMetricRow, value: number | null): string | undefined {
  if (row.key !== "ltTotalRoi") return undefined;
  return formatRoiHeadline(value, { decimals: 1 }).title;
}

function formatLongTermCell(row: LongTermMetricRow, value: number | null): string {
  if (value == null) return "-";
  if (row.kind === "currency") return formatCurrency(value, row.direction === "higher");
  if (row.kind === "percent")
    return row.key === "ltTotalRoi" ? formatLongTermPercent(value) : fmtPct(value, 1);
  if (row.kind === "multiple") return `${value.toFixed(2)}×`;
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
    if (row.key !== "ltTotalRoi") return fmtPct(value, 1);
    const headline = formatRoiHeadline(value, { decimals: 1, compact: true });
    return headline.extreme
      ? `${headline.text} (${Math.round(value)}%)`
      : formatLongTermPercent(value);
  }
  if (row.kind === "multiple") return `${value.toFixed(2)}×`;
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
        <button
          type="button"
          aria-label={`${row.label} for ${getDealLabel(deal, { short: true })}. Show calculation details.`}
          className="inline-flex min-h-11 min-w-11 cursor-help items-center justify-center gap-1.5 rounded-md px-2 underline decoration-dotted decoration-muted-foreground/50 underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {children}
        </button>
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
      : row.key === "cocReturn" && !isCashOnCashApplicable(deal)
        ? "N/A"
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

function CompareMobileDealStrip({
  deals,
  onEditSelection,
  onRemove,
  removingId,
  selectionPending,
}: {
  deals: CompareDealViewModel[];
  onEditSelection: () => void;
  onRemove: (deal: CompareDealViewModel) => void;
  removingId: string | null;
  selectionPending: boolean;
}) {
  return (
    <div className={cn("grid gap-2", comparisonGridColumns(deals.length))}>
      {deals.map((deal, index) => {
        const color = getMobileDealColor(index);
        return (
          <div key={deal.id} className={cn("flex min-h-28 flex-col rounded-2xl border bg-card p-2 shadow-sm", color.border)}>
            {/* The wrap kicks in at 424px, not 380px. Between 381 and 423 —
                iPhone 12-16 (390/393), Pixel (412), 14 Plus (414), i.e. most
                phones in use — the header did NOT wrap, and the two shrink-0
                24px buttons squeezed the only flexible item, the number chip,
                from a 20px circle into an 11px oval. shrink-0 on the chip means
                it can never be the shock absorber again. */}
            <div className="flex items-start justify-between gap-1 max-[424px]:flex-wrap">
              <span className={cn("inline-flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-extrabold", color.chip)}>
                {index + 1}
              </span>
              <div className="flex items-center gap-0.5 max-[424px]:mt-1 max-[424px]:basis-full max-[424px]:justify-start">
                {deal.compareSnapshot && deal.compareSnapshotSource ? (
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
                            aria-label={`View ${deal.compareSnapshotSource} projections for ${deal.address}`}
                          >
                            <Table2 className="size-3.5" />
                          </Button>
                        </PopoverTrigger>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" sideOffset={6} className="text-xs">
                        {deal.compareSnapshotSource === "recorded"
                          ? "Recorded projections"
                          : "Recomputed projections"}
                      </TooltipContent>
                    </Tooltip>
                    <PopoverContent className="w-80 max-h-[min(70vh,28rem)] overflow-y-auto" align="start">
                      <CompareSnapshotPanel
                        snapshot={deal.compareSnapshot}
                        source={deal.compareSnapshotSource}
                      />
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
            <div className="mt-1.5">
              <DataConfidenceBadge
                confidence={deal.dataConfidence}
                size="xs"
                propertyType={deal.propertyType}
              />
            </div>
            <p className="mt-auto pt-2 text-[10px] font-semibold text-muted-foreground">
              {formatCurrency(deal.purchasePrice)}
            </p>
            <div className="mt-2 grid grid-cols-2 gap-1.5">
              <Button asChild variant="outline" size="sm" className="min-h-11 rounded-xl px-2 text-[11px]">
                <Link href={`/dashboard/saved-analyses/${deal.id}`}>Open</Link>
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="min-h-11 rounded-xl px-2 text-[11px] text-muted-foreground"
                onClick={() => onRemove(deal)}
                disabled={selectionPending}
                aria-label={`Remove ${deal.address} from comparison`}
              >
                {removingId === deal.id ? <Loader2 className="size-3.5 animate-spin" /> : <X className="size-3.5" />}
                Remove
              </Button>
            </div>
          </div>
        );
      })}
      {deals.length < MAX_COMPARE_ITEMS ? (
        <button
          type="button"
          onClick={onEditSelection}
          disabled={selectionPending}
          className="flex min-h-28 flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/60 p-2 text-muted-foreground shadow-sm transition-colors hover:border-primary/40 hover:text-primary"
        >
          <span className="mb-2 flex size-8 items-center justify-center rounded-full border border-border bg-background">
            <Plus className="size-4" />
          </span>
          <span className="text-[11px] font-bold">Add</span>
        </button>
      ) : null}
    </div>
  );
}

function CompareMobileHighlights({
  deals,
  shortTermHighlightedWinCounts,
  longTermHighlightedWinCounts,
  shortTermMetricCount,
  longTermMetricCount,
}: {
  deals: CompareDealViewModel[];
  shortTermHighlightedWinCounts: Map<string, number>;
  longTermHighlightedWinCounts: Map<string, number>;
  shortTermMetricCount: number;
  longTermMetricCount: number;
}) {
  return (
    <div className="rounded-3xl border border-border bg-card p-4 shadow-sm">
      <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-muted-foreground">
        Disclosed metric-lead counts
      </p>
      <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
        Near-term counts only monthly cash flow, cap rate, financed-deal DSCR, and required cash. Long-term counts only 10-year cash flow, year-10 net sale proceeds, and recorded IRR when available. Tied row values share the lead; tied totals stay tied. These are relative comparisons, not a recommendation.
      </p>
      <div className={cn("mt-3 grid gap-2", comparisonGridColumns(deals.length))}>
        {deals.map((deal, index) => {
          const color = getMobileDealColor(index);
          return (
            <div key={`${deal.id}-mobile-leads`} className="rounded-2xl bg-muted/40 p-3">
              <div className="flex items-center gap-1.5">
                <span className={cn("inline-flex size-5 items-center justify-center rounded-full text-[10px] font-extrabold", color.chip)}>
                  {index + 1}
                </span>
                <span className="truncate text-[10px] font-bold text-foreground">
                  {getDealLabel(deal, { short: true })}
                </span>
              </div>
              <dl className="mt-2 grid grid-cols-2 gap-2 text-[10px]">
                <div>
                  <dt className="text-muted-foreground">Near-term</dt>
                  <dd className="font-extrabold text-foreground">
                    {shortTermMetricCount > 0
                      ? `${shortTermHighlightedWinCounts.get(deal.id) ?? 0} / ${shortTermMetricCount}`
                      : "No comparable data"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Long-term</dt>
                  <dd className="font-extrabold text-foreground">
                    {longTermMetricCount > 0
                      ? `${longTermHighlightedWinCounts.get(deal.id) ?? 0} / ${longTermMetricCount}`
                      : "No comparable data"}
                  </dd>
                </div>
              </dl>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function CompareDealsClient({ deals, availableDeals = [], selectionLoadError = false }: {
  deals: CompareDealViewModel[];
  availableDeals?: ComparePickerDeal[];
  selectionLoadError?: boolean;
}) {
  const router = useRouter();
  const [selectionOpen, setSelectionOpen] = useState(false);
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [selectionPending, startSelectionTransition] = useTransition();
  const methodologiesComparable = areDealMethodologiesComparable(deals);

  const showSelectionEditor = () => {
    setSelectionError(null);
    setSelectionOpen(true);
    window.requestAnimationFrame(() => {
      document
        .getElementById("compare-selection-editor")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const removeDeal = (deal: CompareDealViewModel) => {
    if (selectionPending) return;
    setSelectionError(null);
    setRemovingId(deal.id);
    startSelectionTransition(async () => {
      try {
        const result = await removeCompareDealAction(deal.id);
        if (!result.ok) {
          setSelectionError(result.message);
          return;
        }
        router.refresh();
      } catch (error) {
        Sentry.captureException(error, { tags: { feature: "compare-selection" } });
        setSelectionError("The comparison could not be updated. Your saved deals were not changed; retry when the connection recovers.");
      } finally {
        setRemovingId(null);
      }
    });
  };

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
    if (!methodologiesComparable) return null;
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
  }, [buyBoxes, deals, methodologiesComparable]);

  const shortTermHighlightedWinCounts = getShortTermHighlightedWinCounts(deals);
  const longTermHighlightedWinCounts = getLongTermHighlightedWinCounts(deals);
  const shortTermWinnerIds = getLeaderIdsFromHighlightedCounts(deals, shortTermHighlightedWinCounts);
  const longTermWinnerIds = getLeaderIdsFromHighlightedCounts(deals, longTermHighlightedWinCounts);
  const shortTermMetricCount = methodologiesComparable
    ? METRIC_ROWS.filter(
        (row) =>
          row.scoreMetric &&
          deals.filter((deal) => {
            const value =
              row.key === "dscr" && isCashPurchaseDeal(deal)
                ? null
                : comparableMetricValue(deal, row);
            return value != null && Number.isFinite(value);
          }).length >= 2
      ).length
    : 0;
  const longTermMetricCount = methodologiesComparable
    ? LONG_TERM_METRIC_ROWS.filter(
        (row) =>
          row.scoreMetric &&
          deals.filter((deal) => {
            const value = row.getValue(deal);
            return value != null && Number.isFinite(value);
          }).length >= 2
      ).length
    : 0;
  const extremeRoiCount = deals.filter((deal) =>
    formatRoiHeadline(deal.compareSnapshot?.longTermSummary.totalROI).extreme
  ).length;
  const visibleMetricRows = METRIC_ROWS.filter(
    (row) =>
      !row.key.startsWith("downside") ||
      deals.some((deal) => comparableMetricValue(deal, row) != null)
  );
  const visibleLongTermRows = LONG_TERM_METRIC_ROWS.filter(
    (row) =>
      !["ltEquityMultiple", "ltIrr"].includes(row.key) ||
      deals.some((deal) => row.getValue(deal) != null)
  );
  const mobileSections = [
    {
      id: "returns",
      title: "Returns",
      icon: TrendingUp,
      rows: visibleMetricRows.filter((row) => row.group === "RETURNS"),
      defaultOpen: true,
    },
    {
      id: "risk",
      title: "Coverage & operations",
      icon: Info,
      rows: visibleMetricRows.filter((row) => row.group === "RISK"),
      defaultOpen: false,
    },
    {
      id: "deal",
      title: "Deal",
      icon: Building2,
      rows: visibleMetricRows.filter((row) => row.group === "DEAL"),
      defaultOpen: false,
    },
  ];
  const mobileLongTermSections = [
    {
      id: "ten-year",
      title: "10-Year Performance",
      icon: BarChart3,
      rows: visibleLongTermRows.filter((row) => row.subsection === "FROM 10-YEAR PROJECTIONS"),
    },
    {
      id: "tax",
      title: "Illustrative Tax Impact",
      icon: Table2,
      rows: visibleLongTermRows.filter(
        (row) => row.subsection === "FROM ILLUSTRATIVE TAX IMPACT"
      ),
    },
    {
      id: "exit",
      title: "Exit Scenarios",
      icon: CalendarDays,
      rows: visibleLongTermRows.filter((row) => row.subsection === "FROM EXIT SCENARIOS"),
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
        coc: isCashOnCashApplicable(deal) ? deal.metrics.cocReturn ?? null : null,
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
          <Button
            type="button"
            variant="outline"
            className="min-h-11 rounded-full"
            onClick={() => {
              if (selectionOpen) setSelectionOpen(false);
              else showSelectionEditor();
            }}
            aria-expanded={selectionOpen}
            aria-controls="compare-selection-editor"
            disabled={selectionPending}
          >
            {selectionPending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            Edit selection
          </Button>
        </div>
          {selectionError ? (
            <div role="alert" className="mb-5 rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {selectionError}
            </div>
          ) : null}
          {selectionOpen ? (
            <section id="compare-selection-editor" aria-labelledby="compare-selection-title" className="mb-5 space-y-3">
              <div>
                <h2 id="compare-selection-title" className="text-sm font-extrabold text-foreground">Edit comparison</h2>
                <p className="mt-1 text-xs text-muted-foreground">Choose 2–4 active saved deals. Updating this list does not change or delete any deal.</p>
              </div>
              {selectionLoadError ? (
                <div role="alert" className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                  The saved-deal list could not be loaded. The current comparison is unchanged; refresh and try again.
                </div>
              ) : availableDeals.length >= 2 ? (
                <CompareDealPicker
                  key={deals.map((deal) => deal.id).join(":")}
                  deals={availableDeals}
                  initialSelectedIds={deals.map((deal) => deal.id)}
                  onComplete={() => setSelectionOpen(false)}
                />
              ) : (
                <div className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
                  Save another active deal before changing this comparison.
                </div>
              )}
            </section>
          ) : null}
          <div className="mb-5 rounded-2xl border border-border bg-card px-4 py-3 text-xs leading-relaxed text-muted-foreground">
            <p>
              Relative modeled comparison only. When every deal uses the same calculation cohort, row highlights identify the highest or lowest displayed value according to each metric&apos;s direction. Tied values share the highlight; no hidden tie-breaker uses Screening Index, ROI, save date, or source order.
            </p>
            <p className="mt-2">
              Near-term lead count uses exactly four nonduplicative decision rows: monthly cash flow, cap rate, financed-deal DSCR, and total cash required. Long-term lead count uses exactly three: 10-year total cash flow, year-10 net sale proceeds, and recorded IRR when available. Target fit appears separately under Your buy box. A higher modeled value does not establish safety or make an investment recommendation.
            </p>
          </div>
          {!methodologiesComparable ? (
            <section role="alert" aria-labelledby="methodology-comparison-paused" className="mb-5 rounded-2xl border border-warning/50 bg-warning/10 px-4 py-4 text-sm text-warning-foreground">
              <h2 id="methodology-comparison-paused" className="font-extrabold">
                Comparison highlights paused
              </h2>
              <p className="mt-1 leading-relaxed">
                These saved deals were calculated under different versions or from different result sources. Their historical numbers remain visible, but TrueCap will not name a winner, award metric leads, show trophies, or plot them together until they are re-underwritten under one calculation method.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {deals.map((deal, index) => (
                  <Button key={`${deal.id}-reunderwrite`} asChild variant="outline" size="sm" className="min-h-11 rounded-full border-warning/50 bg-background">
                    <Link href={`/dashboard/new?savedDeal=${encodeURIComponent(deal.id)}`}>
                      Re-underwrite deal {index + 1} to compare
                    </Link>
                  </Button>
                ))}
              </div>
            </section>
          ) : null}
          <p className="sr-only" aria-live="polite">
            {selectionPending ? "Updating comparison selection." : ""}
          </p>
          {extremeRoiCount > 0 ? (
            <div role="note" className="mb-5 rounded-2xl border border-warning/40 bg-warning/10 px-4 py-3 text-xs leading-relaxed text-warning-foreground">
              <span className="font-bold">Extreme modeled 10-year ROI:</span>{" "}
              {extremeRoiCount} compared {extremeRoiCount === 1 ? "deal exceeds" : "deals exceed"} the 300% review band. These projections are highly sensitive to saved rent growth, appreciation, selling costs, financing, and exit assumptions. Compare those inputs before relying on the output; a higher projection is not a recommendation.
            </div>
          ) : null}
          <div className="space-y-5 xl:hidden">
            <CompareMobileDealStrip
              deals={deals}
              onEditSelection={showSelectionEditor}
              onRemove={removeDeal}
              removingId={removingId}
              selectionPending={selectionPending}
            />
            {methodologiesComparable ? (
              <CompareMobileHighlights
                deals={deals}
                shortTermHighlightedWinCounts={shortTermHighlightedWinCounts}
                longTermHighlightedWinCounts={longTermHighlightedWinCounts}
                shortTermMetricCount={shortTermMetricCount}
                longTermMetricCount={longTermMetricCount}
              />
            ) : null}

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
                            <DataConfidenceBadge confidence={deal.dataConfidence} size="xs" propertyType={deal.propertyType} />
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
                        const best = getComparableBestValue(row, deals);
                        return (
                          <div key={row.key} className="space-y-2 border-t border-border/70 pt-3 first:border-t-0 first:pt-0">
                            <p className="text-[11px] font-bold text-muted-foreground">{row.label}</p>
                            <div className={cn("grid gap-2", comparisonGridColumns(deals.length))}>
                              {deals.map((deal, index) => {
                                const value = comparableMetricValue(deal, row);
                                const isBest = value != null && best != null && value === best;
                                const color = getMobileDealColor(index);
                                return (
                                  <div key={`${deal.id}-${row.key}`} className={cn("rounded-xl p-2 text-center flex flex-col items-center justify-center", isBest ? color.bg : "bg-muted/35")}>
                                    <span className="mb-1 inline-flex items-center justify-center gap-1">
                                      <span className={cn("inline-flex size-5 items-center justify-center rounded-full text-[10px] font-extrabold", color.chip)}>
                                        {index + 1}
                                      </span>
                                      {isBest ? <Trophy className="size-3 text-primary" aria-hidden="true" /> : null}
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
                            {row.key === "maxOffer" ? (
                              <ul className="space-y-1 rounded-xl bg-muted/25 p-2 text-[10px] leading-snug text-muted-foreground">
                                {deals.map((deal, index) =>
                                  deal.metrics.maxOffer != null && deal.maxOfferBasisLabel ? (
                                    <li key={`${deal.id}-mobile-max-offer-criteria`}>
                                      <span className="font-bold text-foreground">Deal {index + 1} criteria:</span>{" "}
                                      {deal.maxOfferBasisLabel}
                                    </li>
                                  ) : null
                                )}
                              </ul>
                            ) : null}
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
                        const bestDealIds = getBestLongTermDealIds(row, deals);
                        return (
                          <div key={row.key} className="space-y-2 border-t border-border/70 pt-3 first:border-t-0 first:pt-0">
                            <MobileLongTermLabel row={row} />
                            <div className={cn("grid gap-2", comparisonGridColumns(deals.length))}>
                              {deals.map((deal, index) => {
                                const value = row.getValue(deal);
                                const isBest = bestDealIds.has(deal.id);
                                const color = getMobileDealColor(index);
                                return (
                                  <div key={`${deal.id}-${row.key}`} className={cn("rounded-xl p-2 text-center", isBest ? color.bg : "bg-muted/35")}>
                                    <span className="mx-auto mb-1 inline-flex items-center justify-center gap-1">
                                      <span className={cn("inline-flex size-5 items-center justify-center rounded-full text-[10px] font-extrabold", color.chip)}>
                                        {index + 1}
                                      </span>
                                      {isBest ? <Trophy className="size-3 text-primary" aria-hidden="true" /> : null}
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
              const shortTermScore = shortTermHighlightedWinCounts.get(deal.id) ?? 0;
              const longTermScore = longTermHighlightedWinCounts.get(deal.id) ?? 0;
              const isShortTermWinner = shortTermWinnerIds.includes(deal.id);
              const isLongTermWinner = longTermWinnerIds.includes(deal.id);
              return (
                <div
                  key={deal.id}
                  className={cn(
                    "relative flex min-h-[17.5rem] flex-col rounded-2xl border border-t-[3px] border-border/80 bg-card/95 p-5 shadow-[0_16px_48px_rgba(15,23,42,0.07)] ring-2 ring-transparent",
                    typeClasses
                  )}
                >
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-3 top-3 size-11 rounded-full text-muted-foreground hover:bg-background/60"
                    aria-label={`Remove ${deal.address} from comparison`}
                    onClick={() => removeDeal(deal)}
                    disabled={selectionPending}
                  >
                    {removingId === deal.id ? <Loader2 className="size-4 animate-spin" /> : <X className="size-4" />}
                  </Button>
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
                    <DataConfidenceBadge confidence={deal.dataConfidence} size="xs" propertyType={deal.propertyType} />
<div className="ml-auto flex justify-center gap-1 ">
                    {deal.compareSnapshot && deal.compareSnapshotSource ? (
                      <Popover>
                        <Tooltip delayDuration={200}>
                          <TooltipTrigger asChild>
                            <PopoverTrigger asChild>
                              <Button
                                type="button"
                                variant="outline"
                                size="icon-sm"
                                className="!px-2 !py-1 h-8 gap-1.5 text-xs font-semibold"
                                aria-label={`View ${deal.compareSnapshotSource} projections`}
                              >
                                <Table2 className="size-3.5" />
                              </Button>
                            </PopoverTrigger>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" sideOffset={6} className="text-xs">
                            {deal.compareSnapshotSource === "recorded"
                              ? "Recorded projections"
                              : "Recomputed projections"}
                          </TooltipContent>
                        </Tooltip>
                        <PopoverContent className="w-80 max-h-[min(70vh,28rem)] overflow-y-auto" align="start">
                          <CompareSnapshotPanel
                            snapshot={deal.compareSnapshot}
                            source={deal.compareSnapshotSource}
                          />
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
                        isShortTermWinner && "text-primary"
                      )}
                    >
                      <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                        Near-term score
                      </p>
                      <p
                        className={cn(
                          "mt-1 text-sm font-extrabold text-foreground",
                          isShortTermWinner && "text-primary"
                        )}
                      >
                        {methodologiesComparable
                          ? `${shortTermScore} lead${shortTermScore === 1 ? "" : "s"}`
                          : "Not comparable"}
                      </p>
                      {methodologiesComparable && isShortTermWinner && (
                        <p className="mt-0.5 text-[10px] font-semibold text-primary">
                          {shortTermWinnerIds.length > 1 ? "Tied highest lead count" : "Highest lead count"}
                        </p>
                      )}
                    </div>
                    <div
                      className={cn(
                        "py-1 pl-4",
                        isLongTermWinner && "text-primary"
                      )}
                    >
                      <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                        Long-term score
                      </p>
                      <p
                        className={cn(
                          "mt-1 text-sm font-extrabold text-foreground",
                          isLongTermWinner && "text-primary"
                        )}
                      >
                        {methodologiesComparable
                          ? `${longTermScore} lead${longTermScore === 1 ? "" : "s"}`
                          : "Not comparable"}
                      </p>
                      {methodologiesComparable && isLongTermWinner && (
                        <p className="mt-0.5 text-[10px] font-semibold text-primary">
                          {longTermWinnerIds.length > 1 ? "Tied highest lead count" : "Highest lead count"}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-auto border-t border-border/70 pt-3">
                    <Button asChild size="sm" variant="outline" className="min-h-11 w-full rounded-full">
                      <Link href={`/dashboard/saved-analyses/${deal.id}`}>Open deal</Link>
                    </Button>
                  </div>
                </div>
              );
            })}
            {deals.length < MAX_COMPARE_ITEMS && (
              <button
                type="button"
                onClick={showSelectionEditor}
                disabled={selectionPending}
                className="flex min-h-[17.5rem] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/45 text-muted-foreground shadow-[0_16px_48px_rgba(15,23,42,0.04)] transition-colors hover:border-primary/40 hover:text-primary"
              >
                <span className="mb-3 flex size-12 items-center justify-center rounded-full border border-border bg-background">
                  <Plus className="size-5" />
                </span>
                <span className="text-sm font-semibold">Add</span>
                <span className="mt-1 text-xs text-muted-foreground">Up to 4 deals</span>
              </button>
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
                  <h3 className="col-span-4 px-1 text-xs font-extrabold tracking-[0.24em] text-muted-foreground">
                    {group === "RISK" ? "COVERAGE & OPERATIONS" : group}
                  </h3>
                </div>
                {visibleMetricRows.filter((row) => row.group === group).map((row) => {
                  const best = getComparableBestValue(row, deals);
                  return (
                    <div key={row.key} className="grid grid-cols-4 gap-x-1">
                      {desktopSlots.map((deal, index) => {
                        const value = deal ? comparableMetricValue(deal, row) : null;
                        const isBest = value != null && best != null && value === best;
                        return (
                          <div
                            key={`${deal?.id ?? "empty"}-${row.key}-${index}`}
                            className={cn(
                              "flex min-h-8 items-center gap-3 rounded-full bg-card/45 px-4 text-sm",
                              index > 0 && "justify-center",
                              index === 0 && "justify-between",
                              isBest ? "text-primary" : "text-foreground",
                              !deal && "text-muted-foreground"
                            )}
                          >
                            {index === 0 ? (
                              <span className="min-w-0 flex-1 truncate pr-3 font-medium leading-tight text-muted-foreground">
                                {row.label}
                              </span>
                            ) : null}
                            {deal ? (
                              <span className={cn("flex min-w-0 flex-col", index > 0 && "items-center")}>
                                <MetricValueWithTooltip deal={deal} row={row}>
                                  <span className="inline-flex shrink-0 items-center gap-2 font-extrabold tabular-nums">
                                    {formatCellValue(deal, row)}
                                    {isBest ? <Trophy className="size-3.5 text-primary" aria-hidden="true" /> : null}
                                  </span>
                                </MetricValueWithTooltip>
                                {row.key === "maxOffer" && value != null && deal.maxOfferBasisLabel ? (
                                  <span className={cn(
                                    "mt-0.5 max-w-full text-[10px] font-normal leading-tight text-muted-foreground",
                                    index > 0 && "text-center"
                                  )}>
                                    Criteria: {deal.maxOfferBasisLabel}
                                  </span>
                                ) : null}
                              </span>
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
              {visibleLongTermRows.map((row, rowIndex) => {
                const prevSubsection = rowIndex > 0 ? visibleLongTermRows[rowIndex - 1]!.subsection : null;
                const showSubsection = row.subsection !== prevSubsection;
                const bestDealIds = getBestLongTermDealIds(row, deals);
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
                        const isBest = deal ? bestDealIds.has(deal.id) : false;
                        return (
                          <div
                            key={`${deal?.id ?? "empty"}-${row.key}-${index}`}
                            className={cn(
                              "flex min-h-8 items-center gap-3 rounded-full bg-card/45 px-4 text-sm",
                              index > 0 && "justify-center",
                              index === 0 && "justify-between",
                              isBest ? "text-primary" : "text-foreground",
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
                                {isBest ? <Trophy className="size-3.5 text-primary" aria-hidden="true" /> : null}
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
          {methodologiesComparable && riskReturnDeals.length >= 2 ? (
            <div className="mt-6">
              <RiskReturn deals={riskReturnDeals} />
            </div>
          ) : null}
        </div>
      </main>
  );
}
