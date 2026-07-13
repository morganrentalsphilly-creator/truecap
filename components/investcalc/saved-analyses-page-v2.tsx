"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import * as Sentry from "@sentry/nextjs";
import {
  Archive,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  ArrowUpDown,
  Building2,
  CalendarClock,
  ChevronDown,
  ChevronsUpDown,
  ExternalLink,
  FileDown,
  Home,
  KeyRound,
  Loader2,
  MoreHorizontal,
  Search,
  SlidersHorizontal,
  Sparkles,
  Tag,
  Target,
  Trash2,
  X,
  ClipboardList,
  CopyPlus,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
} from "@/components/ui/pagination";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { startCompareAction } from "@/app/actions/compare";
import {
  bulkUpdateSavedDealsAction,
  completeSavedAnalysisPdfExportAction,
  getSavedAnalysisPdfExportAction,
  updateSavedDealLifecycleStateAction,
  updateSavedDealStageAction,
  updateSavedDealTagsAction,
} from "@/app/actions/saved-analyses";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { StoredRiskLevel } from "@/lib/compare-metrics";
import { PIPELINE_STAGES, pipelineStageLabel, type PipelineStage } from "@/lib/pipeline";
import { nextActionFromVerdict } from "@/lib/next-action";
import { DataConfidenceBadge } from "@/components/investcalc/data-confidence-badge";
import { type DataConfidence } from "@/lib/data-confidence";
import { consumePendingSavedListSearch } from "@/lib/dashboard-saved-search-bridge";
import { Switch } from "../ui/switch";
import {
  describeInvestmentFormSnapshotIssue,
  investmentFormSchema,
  normalizeInvestmentFormSnapshot,
  type InvestmentFormValues,
} from "@/lib/investcalc-schema";
import { calculateAnalysis, type AnalysisResult } from "@/lib/calc-analysis";
import {
  type DealScoreBreakdown,
} from "@/lib/deal-score";
import type { ReportData } from "@/lib/pdf-generator";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { ANALYSIS_PDF_BUCKET, PDF_CACHE_VERSION } from "@/lib/pdf-export-constants";
import {
  buildExitScenarios,
  resolveExitScenarioRates,
  type ExitScenarioYear,
} from "@/lib/exit-scenarios";
import { buildAutoVerdict } from "@/lib/verdict";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScoreBreakdown } from "@/components/investcalc/score-breakdown";
import { listBuyBoxesAction } from "@/app/actions/user-buy-boxes";
import { BuyBoxNudge } from "@/components/dashboard/buy-box-nudge";
import { BuyBoxFitBadge } from "@/components/investcalc/buy-box-fit-badge";
import {
  buyBoxHasCriteria,
  deriveStateFromAddress,
  evaluateBuyBoxes,
  summarizeBuyBoxFit,
  type BuyBoxDealMetrics,
  type BuyBoxFitSummary,
  type NamedBuyBox,
} from "@/lib/buy-box";
import type { OwnedEquitySummary } from "@/lib/owned-equity";
import { setSavedDealCloseDateAction } from "@/app/actions/saved-analyses";
import { recomputeSavedDealVerdict } from "@/lib/recompute-saved-deal-verdict";
import { buildDealsCsv, dealsCsvFilename, type DealsCsvItem } from "@/lib/deals-csv";
import {
  openSavedDealInAnalysisTab as openSavedDealInAnalysisTabShared,
  duplicateSavedDealInAnalyzer,
} from "@/components/investcalc/open-saved-deal-in-analyzer";

type SavedSignal = "strong-buy" | "buy" | "neutral" | "risky" | "avoid";
type SavedPropertyType = "single-family" | "multi-family" | "owner-occupant";
type SortField = "saved" | "cash-flow" | "coc" | "cap-rate" | "price";
type SortDirection = "asc" | "desc";
type DealStateFilter = "active" | "completed" | "archived" | "all";
const PAGE_SIZE = 7;

/** Optional decision columns on the My Deals table (off by default; the table
 *  already shows cash flow / CoC / cap / price). Persisted per browser. */
const MYDEALS_COLUMNS_KEY = "truecap_mydeals_columns";
type OptionalColumns = { dscr: boolean; cashToClose: boolean; market: boolean; neighborhood: boolean };

export type SavedAnalysisListItem = {
  id: string;
  address: string | null;
  title: string | null;
  propertyType: SavedPropertyType | null;
  purchasePrice: number | null;
  netCashFlowMonthly: number | null;
  cocReturnPct: number | null;
  capRatePct: number | null;
  /** Debt-service coverage ratio; null = unknown, 0 = cash purchase (N/A). */
  dscr?: number | null;
  /** True for an all-cash purchase (canonical monthlyPayment<=0). Distinguishes
   *  a cash deal from a financed deal that recomputed to DSCR exactly 0. */
  isCashPurchase?: boolean;
  /** Cash needed to close (down payment + closing costs). */
  cashToClose?: number | null;
  score: number | null;
  recommendation: "Strong Buy" | "Buy" | "Neutral" | "Risky" | "Avoid";
  riskLevel: StoredRiskLevel;
  /** Per-factor score breakdown for the "Why this score" popover. */
  breakdown?: DealScoreBreakdown | null;
  pipelineStage?: PipelineStage;
  tags?: string[];
  dataConfidence?: DataConfidence | null;
  /** Optional investor labels (Phase 2 #11). nickname displays in place of
   *  the address; market/neighborhood are optional columns. */
  nickname?: string | null;
  market?: string | null;
  neighborhood?: string | null;
  /** Workspace-scenario label (DM-1). Sibling scenario rows share one address
   *  (and nickname), so lists surface this to keep them tellable apart. */
  scenarioName?: string | null;
  createdAt: string;
  status: "active" | "completed" | "archived";
  /** Owned-deal close date (ISO yyyy-mm-dd) + derived equity. Present only for
   *  completed deals once the close_date migration is applied + a date is set. */
  closeDate?: string | null;
  ownedEquity?: OwnedEquitySummary | null;
};

/**
 * Map a saved-deal list row to the metrics the Buy Box screens against. All
 * fields already live on the row, so screening is a pure local computation —
 * no per-deal recompute. calc-analysis stores DSCR 0 for cash purchases, which
 * is the signal that the DSCR criterion should be skipped, not failed.
 */
function toBuyBoxMetrics(item: SavedAnalysisListItem): BuyBoxDealMetrics {
  return {
    capRatePct: item.capRatePct,
    cocPct: item.cocReturnPct,
    dscr: item.dscr ?? null,
    cashFlowMonthly: item.netCashFlowMonthly,
    purchasePrice: item.purchasePrice,
    propertyType: item.propertyType,
    state: deriveStateFromAddress(item.address),
    // Use the explicit cash flag (canonical monthlyPayment<=0); fall back to
    // not-cash so a financed deal that recomputed to DSCR 0 still gets its DSCR
    // criterion applied rather than silently skipped.
    isCashPurchase: item.isCashPurchase ?? false,
  };
}

function fmtMoney0(n: number): string {
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

function fmtCloseDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
}

/**
 * Owned-deal equity readout + close-date capture. Completed deals only:
 *  - with a close date → estimated equity (appreciation + principal paid),
 *    editable;
 *  - without → a compact "add close date" prompt that unlocks the estimate.
 * The server recomputes equity from the new date on save (router.refresh).
 * Stays invisible for non-completed deals.
 */
function OwnedEquityCell({ item, enabled }: { item: SavedAnalysisListItem; enabled: boolean }) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSaving, startSaving] = useTransition();
  const [editing, setEditing] = useState(false);

  // Owned deals only, and only once the close_date column is live.
  if (!enabled || item.status !== "completed") return null;

  const save = (value: string | null) => {
    startSaving(async () => {
      const r = await setSavedDealCloseDateAction(item.id, value);
      if (r.ok) {
        setEditing(false);
        router.refresh();
      } else if (r.code === "MIGRATION_PENDING") {
        toast({ title: "Rolling out", description: "Owned-deal equity tracking isn't enabled yet." });
      } else {
        toast({ title: "Couldn't save close date", description: r.message, variant: "destructive" });
        // Ghost row (deleted elsewhere) — refresh so it disappears.
        if (r.code === "NOT_FOUND") router.refresh();
      }
    });
  };

  // Commit on blur/Enter, NOT on change (mirrors OwnedEquityCard): per-
  // keystroke saves made Backspace clear the persisted date and committed
  // partial years like 0001 mid-typing.
  const commit = (raw: string) => {
    const value = raw || null;
    if (value && Number(value.slice(0, 4)) < 1900) return;
    if (value === item.closeDate || (!value && !item.closeDate)) return;
    save(value);
  };
  const dateInput = (
    <input
      type="date"
      defaultValue={item.closeDate ?? undefined}
      min="1900-01-01"
      max={new Date().toISOString().slice(0, 10)}
      disabled={isSaving}
      onBlur={(e) => commit(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit((e.target as HTMLInputElement).value);
      }}
      aria-label="Close date"
      className="h-8 rounded-lg border border-input bg-background px-2 text-xs text-foreground"
    />
  );

  const eq = item.ownedEquity;
  if (item.closeDate && eq) {
    return (
      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
        <span className={cn("font-semibold", eq.equity >= 0 ? "text-success" : "text-[var(--metric-negative)]")}>
          Equity ~{fmtMoney0(eq.equity)}
        </span>
        <span className="text-muted-foreground">
          {fmtMoney0(eq.downPayment)} down · {fmtMoney0(eq.appreciationGain)} appreciation ·{" "}
          {fmtMoney0(eq.principalPaid)} paid down · since {fmtCloseDate(item.closeDate)}
        </span>
        {editing ? (
          dateInput
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="font-semibold text-primary hover:underline"
          >
            Edit
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="mt-1.5 text-xs">
      {editing ? (
        dateInput
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="font-semibold text-primary hover:underline"
        >
          + Add close date to track equity
        </button>
      )}
    </div>
  );
}

/** Compact "Next: <step>" line driven by the verdict-based next-action lib.
 *  Stage-aware: pipeline stage adjusts the step (closed → track equity,
 *  passed → revisit, offer/under contract → renegotiate or keep it moving).
 *  Buy-box-aware: when the caller knows the deal's fit (the same map that
 *  drives BuyBoxFitBadge), a missing fit flips the step to "Adjust to hit
 *  your buy box" — so the badge and this line never contradict each other.
 *  null/omitted = no box set, unchanged behavior. */
function NextActionLine({
  recommendation,
  netCashFlow,
  stage,
  meetsBuyBox,
  hasCloseDate,
  className,
}: {
  recommendation: SavedAnalysisListItem["recommendation"];
  netCashFlow: number | null;
  stage?: PipelineStage;
  meetsBuyBox?: boolean | null;
  hasCloseDate?: boolean;
  className?: string;
}) {
  const a = nextActionFromVerdict({
    recommendation,
    netCashFlow: netCashFlow ?? 0,
    meetsBuyBox,
    stage,
    hasCloseDate,
  });
  const dot =
    a.tone === "blocked"
      ? "bg-[var(--metric-negative)]"
      : a.tone === "review"
        ? "bg-amber-500"
        : "bg-[var(--metric-positive)]";
  return (
    <p className={cn("flex items-center gap-1.5 text-[11px] text-muted-foreground", className)} title={a.reason}>
      <span aria-hidden className={cn("inline-block size-1.5 shrink-0 rounded-full", dot)} />
      <span className="font-semibold text-foreground">Next:</span> {a.label}
    </p>
  );
}

// Deal-score signal labels — the deal's own metrics, NOT a personal buy box.
const SIGNAL_LABELS: Record<SavedSignal, string> = {
  "strong-buy": "Excellent fit",
  buy: "Buy",
  neutral: "Watchlist",
  risky: "Needs work",
  avoid: "Pass",
};

/** Client-only view state (search/filters/page) persisted to sessionStorage so
 *  the name-click → workspace → Back round-trip lands on the same list view.
 *  Session-only by design — sort/deal-state stay in the URL as before. */
const MYDEALS_VIEW_STATE_KEY = "truecap_mydeals_view_v1";
type PersistedListView = {
  searchQuery: string;
  selectedSignal: "all" | SavedSignal;
  selectedType: "all" | SavedPropertyType;
  buyBoxOnly: boolean;
  currentPage: number;
};

function readPersistedListView(): PersistedListView | null {
  // Server render sees defaults; the restored values apply on the client.
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(MYDEALS_VIEW_STATE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const p = parsed as Record<string, unknown>;
    return {
      searchQuery: typeof p.searchQuery === "string" ? p.searchQuery : "",
      selectedSignal:
        typeof p.selectedSignal === "string" && p.selectedSignal in SIGNAL_LABELS
          ? (p.selectedSignal as SavedSignal)
          : "all",
      selectedType:
        p.selectedType === "single-family" ||
        p.selectedType === "multi-family" ||
        p.selectedType === "owner-occupant"
          ? p.selectedType
          : "all",
      buyBoxOnly: p.buyBoxOnly === true,
      currentPage:
        typeof p.currentPage === "number" && Number.isInteger(p.currentPage) && p.currentPage >= 1
          ? p.currentPage
          : 1,
    };
  } catch {
    return null; // private mode / bad JSON — start from defaults
  }
}

function toCurrency(value: number | null): string {
  if (value == null || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function toPercent(value: number | null): string {
  if (value == null || Number.isNaN(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

function toMonthCashFlow(value: number | null): string {
  if (value == null || Number.isNaN(value)) return "—";
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}${toCurrency(Math.abs(value))}/mo`;
}

function recommendationToSavedSignal(
  recommendation: SavedAnalysisListItem["recommendation"]
): SavedSignal {
  if (recommendation === "Strong Buy") return "strong-buy";
  if (recommendation === "Buy") return "buy";
  if (recommendation === "Neutral") return "neutral";
  if (recommendation === "Risky") return "risky";
  return "avoid";
}

function getSignalClasses(signal: SavedSignal): string {
  if (signal === "strong-buy") return "bg-success/10 text-success border-success/30";
  if (signal === "buy") return "bg-primary/10 text-primary border-primary/30";
  if (signal === "neutral") return "bg-warning/15 text-warning-foreground border-warning/30";
  if (signal === "risky") return "bg-warning/15 text-warning-foreground border-warning/30";
  return "bg-destructive/10 text-destructive border-destructive/20";
}

function getAddressParts(item: SavedAnalysisListItem): { main: string; secondary: string } {
  const address = item.address?.trim();
  const title = item.title?.trim();
  // Scenario saves share the address but carry a distinguishing title
  // ("<address> — Scenario 2"); surface that suffix on the main line so
  // sibling rows are tellable apart at a glance. For every other row the
  // title is derived from the address, so this is a no-op.
  const scenarioSuffix =
    address && title && title !== address && title.startsWith(address)
      ? ` ${title.slice(address.length).trim()}`
      : "";
  const source = address || title || "Untitled Property";
  // A nickname, when set, leads - the address drops to the secondary line.
  const nickname = item.nickname?.trim();
  if (nickname) return { main: nickname, secondary: `${source}${scenarioSuffix}` };
  const parts = source
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length <= 1)
    return { main: `${source}${scenarioSuffix}`, secondary: "Address details not available" };
  return { main: `${parts[0]}${scenarioSuffix}`, secondary: parts.slice(1).join(", ") };
}

function getTypeLabel(type: SavedPropertyType | null): string {
  if (type === "single-family") return "Single Family";
  if (type === "multi-family") return "Multi-Family";
  if (type === "owner-occupant") return "House Hack";
  return "Unknown Type";
}

function getTypeIcon(type: SavedPropertyType | null) {
  if (type === "single-family") return Home;
  if (type === "multi-family") return Building2;
  if (type === "owner-occupant") return KeyRound;
  return Home;
}

function getStatusBadge(item: SavedAnalysisListItem) {
  if (item.status === "completed") {
    return <Badge className="rounded-full border border-success/30 bg-success/10 text-success text-[10px] font-semibold">Completed</Badge>;
  }
  if (item.status === "archived") {
    return <Badge className="rounded-full border border-border bg-muted text-muted-foreground text-[10px] font-semibold">Archived</Badge>;
  }
  return null;
}

function numberFromSnapshot(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function stringFromSnapshot(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function buildReportDataFromSavedSnapshot(args: {
  values: InvestmentFormValues;
  result: AnalysisResult & Record<string, unknown>;
  templateFallback: { templateName: string } | null;
  exitYears: ExitScenarioYear[];
}): ReportData {
  const { values, result, templateFallback, exitYears } = args;
  const projectionYears = Array.isArray(result.tenYearProjection) ? result.tenYearProjection : [];
  const taxYears = Array.isArray(result.taxStrategyYears) ? result.taxStrategyYears : [];

  const units =
    values.propertyType === "single-family"
      ? [
          {
            label: "Unit 1",
            beds: Number(values.bedrooms ?? 0),
            baths: Number(values.bathrooms ?? 0),
            sqft: Number(values.sqft ?? 0),
            rent: Number(values.monthlyRent ?? result.monthlyRentalIncome),
          },
        ]
      : (values.units ?? []).map((unit, idx) => ({
          label: `Unit ${idx + 1}`,
          beds: Number(unit.bedrooms ?? 0),
          baths: Number(unit.bathrooms ?? 0),
          sqft: Number(unit.sqft ?? 0),
          rent: Number(unit.monthlyRent ?? 0),
        }));

  const projectionRows = projectionYears.map((row) => ({
    y: row.year,
    rental: row.rentalIncomeAnnual,
    opex: row.operatingExpensesAnnual,
    debt: row.debtServiceAnnual,
    net: row.netCashFlowAnnual,
    tax: row.taxSavingsAnnual,
    after: row.afterTaxCashFlowAnnual,
    cum: row.cumulativeCashFlowAnnual,
  }));

  const year1Tax = taxYears.find((row) => row.year === 1);
  const totalBenefit10y = taxYears.reduce((acc, row) => acc + row.netTaxBenefitAnnual, 0);
  const taxRows = taxYears.map((row) => ({
    y: row.year,
    rental: row.rentalIncomeAnnual,
    opex: row.operatingExpensesAnnual,
    interest: row.mortgageInterestDeductionAnnual,
    dep: row.depreciationDeductionAnnual,
    total: row.totalDeductionsAnnual,
    taxable: row.taxableRentalIncomeAnnual,
    savings: row.taxSavingsAnnual,
    benefit: row.netTaxBenefitAnnual,
  }));

  const bestExit = exitYears.reduce<ExitScenarioYear | null>(
    (best, row) => (best === null || row.totalProfit > best.totalProfit ? row : best),
    null
  );
  const year5Exit = exitYears.find((row) => row.year === 5);
  const year10Exit = exitYears.find((row) => row.year === 10) ?? exitYears[exitYears.length - 1];
  // The exported saved-deal report uses the deal's canonical Balanced score —
  // the same number stored at save time and shown on every surface (My Deals,
  // dashboard, compare, share). The investor lens only reorders metrics on the
  // analyzer; it never rescores an exported report.
  const score = numberFromSnapshot(result.score) ?? 0;
  const recommendation = stringFromSnapshot(result.recommendation) ?? "Neutral";
  const risk = stringFromSnapshot(result.riskLevel) ?? "Medium Risk";
  // Prefer the stored explanation, else the shared auto-verdict so cash
  // purchases and other edge cases read consistently with the app.
  const rationale =
    stringFromSnapshot(result.explanation) ??
    buildAutoVerdict({
      result,
      address: values.address,
      purchasePrice: values.purchasePrice,
    });

  return {
    generatedAt: new Date(),
    property: {
      address: values.address,
      type: values.propertyType,
      yearBuilt: Number(values.yearBuilt ?? new Date().getFullYear()),
      purchasePrice: values.purchasePrice,
      template: templateFallback?.templateName ?? (values.templateId ? "Template Applied" : "Custom"),
    },
    financing: {
      downPaymentPct: values.downPaymentPct,
      downPayment: result.downPayment,
      interestRate: values.interestRate,
      loanTerm: values.loanTermYears,
      closingCostsPct: result.closingCostsPct,
      closingCosts: result.closingCosts,
    },
    expenses: {
      // Effective % — annual-$ mode derives it from the bill (the raw
      // propertyTaxPct field is undefined in that mode and printed "0%").
      // result always carries the fresh calculateAnalysis spread, so the
      // effective field exists even for legacy snapshots.
      propertyTaxPct: Math.round(Number(result.propertyTaxPctEffective ?? 0) * 100) / 100,
      propertyTaxAnnualBill:
        values.propertyTaxInputMode === "annual" && values.propertyTaxAnnual != null
          ? Number(values.propertyTaxAnnual)
          : null,
      insurancePct: Number(result.insurancePctEffective ?? 0),
      maintenancePct: Number(result.maintenancePctEffective ?? 0),
      vacancyPct: Number(values.vacancyPct),
      managementPct: Number(values.mgmtPct),
      capexPct: Number(result.capexPctEffective ?? 0),
      hoaMonthly: Number(result.hoaMonthly),
      utilitiesMonthly: Number(result.utilities),
      rentGrowth: Number(values.rentGrowthPct),
      expenseGrowth: Number(values.expenseGrowthPct),
      appreciation: Number(values.appreciationRatePct ?? 3),
      sellingCost: Number(values.sellingCostPct ?? 6),
      taxRate: Number(values.taxRatePct ?? result.effectiveTaxRate * 100),
    },
    units,
    performance: {
      recommendation,
      dealScore: score,
      risk,
      rationale,
      monthlyCashFlow: result.netCashFlow,
      cocReturn: result.cocReturn,
      capRate: result.capRate,
      dscr: result.dscr,
      taxSavings: result.taxSavingsMonthly,
      afterTaxCF: result.afterTaxCF,
    },
    projection10y: {
      cumulativeCF: projectionRows[projectionRows.length - 1]?.cum ?? 0,
      bestAnnualAfterTax: projectionRows.length
        ? Math.max(...projectionRows.map((row) => row.after))
        : 0,
      totalAfterTax: projectionRows.reduce((acc, row) => acc + row.after, 0),
      rows: projectionRows,
    },
    taxStrategy: {
      year1Taxable: year1Tax?.taxableRentalIncomeAnnual ?? 0,
      year1Savings: year1Tax?.taxSavingsAnnual ?? 0,
      totalBenefit10y,
      annualDepreciation: result.annualDepreciation,
      rows: taxRows,
    },
    exitScenarios: {
      bestYear: bestExit?.year ?? 1,
      year5Profit: year5Exit?.totalProfit ?? 0,
      year10Profit: year10Exit?.totalProfit ?? 0,
      totalROI:
        result.totalCashRequired > 0 && year10Exit
          ? (year10Exit.totalProfit / result.totalCashRequired) * 100
          : 0,
      rows: exitYears.map((row) => ({
        y: row.year,
        value: row.propertyValue,
        loan: row.remainingLoanBalance,
        equity: row.equity,
        netSale: row.netSaleProceeds,
        profit: row.totalProfit,
      })),
    },
  };
}

/**
 * Per-deal tag editor (Pro). Chips with inline remove + a popover to add.
 * Stateless re: persistence - each change calls onSave, which hits the
 * server action and refreshes. Reused in both the mobile card and the
 * desktop table cell.
 */
function DealTags({
  tags,
  onSave,
  disabled,
}: {
  tags: string[];
  onSave: (tags: string[]) => void;
  disabled?: boolean;
}) {
  const [input, setInput] = useState("");
  const addTag = () => {
    const t = input.trim().replace(/\s+/g, " ").slice(0, 24);
    if (!t) return;
    if (!tags.some((x) => x.toLowerCase() === t.toLowerCase()) && tags.length < 12) {
      onSave([...tags, t]);
    }
    setInput("");
  };
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground"
        >
          {tag}
          <button
            type="button"
            disabled={disabled}
            aria-label={`Remove ${tag}`}
            onClick={() => onSave(tags.filter((x) => x !== tag))}
            className="text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            <X className="size-3" />
          </button>
        </span>
      ))}
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            className="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-2 py-0.5 text-[11px] font-medium text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            <Tag className="size-3" />
            {tags.length === 0 ? "Add tag" : "Add"}
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-56 p-2">
          <div className="flex gap-1.5">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTag();
                }
              }}
              placeholder="e.g. BRRRR"
              className="h-8 text-xs"
            />
            <Button type="button" size="sm" className="h-8" onClick={addTag} disabled={disabled}>
              Add
            </Button>
          </div>
          <p className="mt-1.5 text-[10px] text-muted-foreground">Up to 12 tags, 24 chars each.</p>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function SavedAnalysesPage({
  initialItems,
  initialSelectedIds,
  activeSortField,
  activeSortDirection,
  activeDealStateFilter,
  canCompareDeals = false,
  canExportPdf = false,
  canUsePipeline = false,
  ownedEquityEnabled = false,
}: {
  initialItems: SavedAnalysisListItem[];
  initialSelectedIds?: string[];
  activeSortField: SortField | null;
  activeSortDirection: SortDirection | null;
  activeDealStateFilter: DealStateFilter;
  canCompareDeals?: boolean;
  canExportPdf?: boolean;
  canUsePipeline?: boolean;
  /** True once the close_date column exists — gates the owned-equity capture so
   *  the prompt stays invisible until the migration is applied. */
  ownedEquityEnabled?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [isStartingCompare, startCompareTransition] = useTransition();
  const [isUpdatingStatus, startUpdateStatusTransition] = useTransition();
  const [openingDealId, setOpeningDealId] = useState<string | null>(null);
  const [exportingPdfDealId, setExportingPdfDealId] = useState<string | null>(null);
  const [updatingDealStatusId, setUpdatingDealStatusId] = useState<string | null>(null);

  // The persisted view (search/filters/page) is restored in a MOUNT EFFECT,
  // not in the useState initializers: this page is SSR'd with defaults, so an
  // initializer restore would make the first client render differ from the
  // server HTML — a React hydration error + full client re-render on every
  // hard load where a view was persisted. viewHydrated gates the persist
  // effect below so a pre-restore run can't clobber the stored view with
  // defaults (StrictMode's double effect pass included).
  const [viewHydrated, setViewHydrated] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [showcompare, setShowcompare] = useState(false);
  // Below sm the filter chip groups collapse behind one "Filters"
  // disclosure (defaults are All/All/Active, so it opens showing 0 active).
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  // Mobile-card tag editing lives behind the ⋯ menu; tracks which card
  // (if any) currently shows the inline DealTags editor.
  const [editingTagsDealId, setEditingTagsDealId] = useState<string | null>(null);
  const [selectedSignal, setSelectedSignal] = useState<"all" | SavedSignal>("all");
  const [selectedType, setSelectedType] = useState<"all" | SavedPropertyType>("all");
  // Buy-box screening: the user's active boxes (null until loaded / none) and a
  // "only deals that meet a box" filter. Invisible-until-useful — both stay
  // dormant for users without an active buy box. `?buyBox=1` seeds the filter
  // ON so the dashboard's "Meets your buy box" tile (PV-1) lands here already
  // filtered; after that the toggle stays local state exactly as before.
  const [buyBoxes, setBuyBoxes] = useState<NamedBuyBox[] | null>(null);
  // Distinguishes "boxes not fetched yet" from "fetched, none usable" so the
  // reset effect below can't clear a URL-seeded filter before the load lands.
  const [buyBoxesLoaded, setBuyBoxesLoaded] = useState(false);
  // The URL seed (?buyBox=1 from the dashboard tile) is an explicit intent —
  // SSR sees the same param so this initializer is hydration-safe; the
  // persisted value can only turn the filter ON (restore effect below), so
  // a URL seed is never overridden by a stale persisted "off".
  const [buyBoxOnly, setBuyBoxOnly] = useState(() => searchParams.get("buyBox") === "1");
  // Discovery nudge (PV-2): the user CAN use buy boxes but has never created
  // one — surfaced only alongside ≥3 active deals (moment of need), and
  // dismissible inside BuyBoxNudge (shared localStorage key with the
  // dashboard's nudge, so dismissing either silences both).
  const [buyBoxNudgeEligible, setBuyBoxNudgeEligible] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Apply the persisted view once, after hydration (see viewHydrated above).
  // The one-commit flash of the default list on a hard load is the price of
  // hydration correctness; the primary round-trip (name-click → workspace →
  // Back) is a client navigation and restores without any flash.
  useEffect(() => {
    const persisted = readPersistedListView();
    if (persisted) {
      setSearchQuery(persisted.searchQuery);
      setSelectedSignal(persisted.selectedSignal);
      setSelectedType(persisted.selectedType);
      if (persisted.buyBoxOnly) setBuyBoxOnly(true);
      setCurrentPage(persisted.currentPage);
    }
    setViewHydrated(true);
  }, []);
  // Optional decision columns (DSCR, cash to close) - off by default so the
  // default table stays uncrowded; remembered per browser.
  const [optionalColumns, setOptionalColumns] = useState<OptionalColumns>({
    dscr: false,
    cashToClose: false,
    market: false,
    neighborhood: false,
  });
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(MYDEALS_COLUMNS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<OptionalColumns>;
        setOptionalColumns({
          dscr: parsed.dscr === true,
          cashToClose: parsed.cashToClose === true,
          market: parsed.market === true,
          neighborhood: parsed.neighborhood === true,
        });
      }
    } catch {
      // private mode / bad JSON - keep defaults
    }
  }, []);
  const setOptionalColumn = (key: keyof OptionalColumns, on: boolean) => {
    setOptionalColumns((prev) => {
      const next = { ...prev, [key]: on };
      try {
        window.localStorage.setItem(MYDEALS_COLUMNS_KEY, JSON.stringify(next));
      } catch {
        // ignore persistence failures
      }
      return next;
    });
  };
  const optionalColumnCount =
    (optionalColumns.dscr ? 1 : 0) +
    (optionalColumns.cashToClose ? 1 : 0) +
    (optionalColumns.market ? 1 : 0) +
    (optionalColumns.neighborhood ? 1 : 0);
  const initialItemIds = useMemo(() => new Set(initialItems.map((item) => item.id)), [initialItems]);
  const [selectedIds, setSelectedIds] = useState<string[]>(() =>
    canCompareDeals ? (initialSelectedIds ?? []).filter((id) => initialItemIds.has(id)).slice(0, 4) : []
  );

  const enrichedItems = useMemo(
    () =>
      initialItems.map((item) => ({
        ...item,
        signal: recommendationToSavedSignal(item.recommendation),
      })),
    [initialItems]
  );

  // Load the user's buy boxes once; keep only the switched-on ones with ≥1 rule
  // (same gate as the single-deal verdict card). Failures / no-boxes / free
  // users leave buyBoxes null, so nothing screening-related ever renders.
  useEffect(() => {
    let cancelled = false;
    void listBuyBoxesAction()
      .then((result) => {
        if (cancelled) return;
        if (result.ok && result.canUse) {
          setBuyBoxes(result.boxes.filter((b) => b.isActive && buyBoxHasCriteria(b)));
          // Zero boxes EVER created (not just zero usable) — a user with an
          // inactive/empty box already knows the feature exists, so no nudge.
          setBuyBoxNudgeEligible(result.boxes.length === 0);
        } else {
          setBuyBoxes(null);
          setBuyBoxNudgeEligible(false);
        }
        setBuyBoxesLoaded(true);
      })
      .catch((err) => {
        // Bail only on CANCELLED runs (unmount/StrictMode remount) — a real
        // failure on the live component must log + mark loaded, or the
        // URL-seeded ?buyBox=1 filter gets cleared by the reset effect.
        if (cancelled) return;
        console.warn("[saved-analyses buy-box] load failed:", err);
        setBuyBoxesLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Pure local fit per deal — id → summary, only for deals where ≥1 active box
  // applied. null when the user has no usable boxes (the screening UI hides).
  const buyBoxFitById = useMemo(() => {
    if (!buyBoxes || buyBoxes.length === 0) return null;
    const map = new Map<string, BuyBoxFitSummary>();
    for (const item of enrichedItems) {
      const results = evaluateBuyBoxes(buyBoxes, toBuyBoxMetrics(item)).filter((r) => r.result.active);
      if (results.length > 0) map.set(item.id, summarizeBuyBoxFit(results));
    }
    return map.size > 0 ? map : null;
  }, [buyBoxes, enrichedItems]);

  // If the filter is on but the boxes go away (deleted in another tab) or the
  // user arrived via ?buyBox=1 without a usable box, drop it — but only AFTER
  // the load resolves, or the URL-seeded filter would be cleared while the
  // boxes are still in flight.
  useEffect(() => {
    if (buyBoxesLoaded && !buyBoxFitById && buyBoxOnly) setBuyBoxOnly(false);
  }, [buyBoxesLoaded, buyBoxFitById, buyBoxOnly]);

  // PV-2 gate: only nudge users with a real list to screen (≥3 active deals).
  const activeDealCount = useMemo(
    () => enrichedItems.reduce((n, item) => (item.status === "active" ? n + 1 : n), 0),
    [enrichedItems]
  );

  // How many saved deals meet at least one active box — shown on the filter chip.
  const buyBoxMatchCount = useMemo(() => {
    if (!buyBoxFitById) return 0;
    let n = 0;
    for (const fit of buyBoxFitById.values()) if (fit.anyPass) n += 1;
    return n;
  }, [buyBoxFitById]);

  useEffect(() => {
    const pending = consumePendingSavedListSearch();
    if (pending) setSearchQuery(pending);
  }, []);

  useEffect(() => {
    if (!canCompareDeals) {
      setSelectedIds([]);
      setShowcompare(false);
    }
  }, [canCompareDeals]);

  const filteredItems = useMemo(
      () =>
      enrichedItems.filter((item) => {
        const typeLabel = item.propertyType ? getTypeLabel(item.propertyType).toLowerCase() : "";
        const typeSlug = (item.propertyType ?? "").toLowerCase();
        const text =
          `${item.address ?? ""} ${item.title ?? ""} ${item.scenarioName ?? ""} ${item.id} ${typeLabel} ${typeSlug}`.toLowerCase();
        const matchesSearch = text.includes(searchQuery.toLowerCase().trim());
        const matchesSignal = selectedSignal === "all" ? true : item.signal === selectedSignal;
        const matchesType = selectedType === "all" ? true : item.propertyType === selectedType;
        const matchshowcompare = showcompare ? selectedIds.includes(item.id) : true;
        // No-op until the fit map exists so a URL-seeded filter (?buyBox=1)
        // never blanks the list while the boxes are still loading.
        const matchesBuyBox = !buyBoxOnly || !buyBoxFitById || (buyBoxFitById.get(item.id)?.anyPass ?? false);
        return matchesSearch && matchesSignal && matchesType && matchshowcompare && matchesBuyBox;
      }),
    [enrichedItems, searchQuery, selectedSignal, selectedType, selectedIds, showcompare, buyBoxOnly, buyBoxFitById]
  );

  const displayItems = useMemo(() => {
    if (!activeSortField || !activeSortDirection) return filteredItems;
    const direction = activeSortDirection === "asc" ? 1 : -1;
    const valueFor = (item: SavedAnalysisListItem) => {
      if (activeSortField === "saved") return new Date(item.createdAt).getTime();
      if (activeSortField === "cash-flow") return item.netCashFlowMonthly ?? Number.NEGATIVE_INFINITY;
      if (activeSortField === "coc") return item.cocReturnPct ?? Number.NEGATIVE_INFINITY;
      if (activeSortField === "cap-rate") return item.capRatePct ?? Number.NEGATIVE_INFINITY;
      return item.purchasePrice ?? Number.NEGATIVE_INFINITY;
    };
    return [...filteredItems].sort((a, b) => {
      const av = valueFor(a);
      const bv = valueFor(b);
      if (av === bv) return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      return av > bv ? direction : -direction;
    });
  }, [activeSortDirection, activeSortField, filteredItems]);

  const pageCount = Math.max(1, Math.ceil(displayItems.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, pageCount);
  const pageStartIndex = displayItems.length === 0 ? 0 : (safeCurrentPage - 1) * PAGE_SIZE;
  const pageEndIndex = Math.min(pageStartIndex + PAGE_SIZE, displayItems.length);
  const pagedItems = useMemo(
    () => displayItems.slice(pageStartIndex, pageEndIndex),
    [displayItems, pageEndIndex, pageStartIndex]
  );

  const resetPageTriggerKey = useMemo(
    () => `${searchQuery}|${selectedSignal}|${selectedType}|${activeSortField ?? ""}|${activeSortDirection ?? ""}|${showcompare}|${buyBoxOnly ? "bb" : ""}`,
    [searchQuery, selectedSignal, selectedType, activeSortField, activeSortDirection, showcompare, buyBoxOnly]
  );

  // Reset to page 1 when a filter/sort/search actually CHANGES — but not on
  // mount, and not on the commit where the persisted view restores (that key
  // change IS the restore; resetting would clobber the restored page).
  // Value-compare against the previous key rather than counting effect runs:
  // run-count skips break under StrictMode's setup/cleanup/setup pass.
  const prevResetKeyRef = useRef<string | null>(null);
  const pageResetArmedRef = useRef(false);
  useEffect(() => {
    if (!viewHydrated) return; // pre-restore commits are never user changes
    if (!pageResetArmedRef.current) {
      // First post-restore run: record the (possibly restored) key only.
      pageResetArmedRef.current = true;
      prevResetKeyRef.current = resetPageTriggerKey;
      return;
    }
    if (prevResetKeyRef.current !== resetPageTriggerKey) {
      prevResetKeyRef.current = resetPageTriggerKey;
      setCurrentPage(1);
    }
  }, [resetPageTriggerKey, viewHydrated]);

  useEffect(() => {
    if (currentPage > pageCount) {
      setCurrentPage(pageCount);
    }
  }, [currentPage, pageCount]);

  // Persist the view state on change so Back lands on the same list view.
  // Gated on viewHydrated: pre-restore runs hold defaults and would overwrite
  // the very view we're about to restore.
  useEffect(() => {
    if (!viewHydrated) return;
    try {
      const view: PersistedListView = { searchQuery, selectedSignal, selectedType, buyBoxOnly, currentPage };
      window.sessionStorage.setItem(MYDEALS_VIEW_STATE_KEY, JSON.stringify(view));
    } catch {
      // private mode — the view state just doesn't persist
    }
  }, [viewHydrated, searchQuery, selectedSignal, selectedType, buyBoxOnly, currentPage]);

  const handleSort = (field: SortField) => {
    const nextDirection: SortDirection =
      activeSortField !== field ? "asc" : activeSortDirection === "asc" ? "desc" : "asc";
    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", field);
    params.set("dir", nextDirection);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const handleStateFilterChange = (state: DealStateFilter) => {
    const params = new URLSearchParams(searchParams.toString());
    if (state === "active") {
      params.delete("state");
    } else {
      params.set("state", state);
    }
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const handleDealStatusChange = (id: string, state: SavedAnalysisListItem["status"]) => {
    setUpdatingDealStatusId(id);
    startUpdateStatusTransition(async () => {
      const result = await updateSavedDealLifecycleStateAction(id, state);
      if (!result.ok) {
        toast({
          title: "Could not update deal status",
          description: result.message,
          variant: "destructive",
        });
        // Deleted in another tab → clear the ghost row alongside the toast,
        // or every retry re-errors on a deal that no longer exists.
        if (result.code === "NOT_FOUND") router.refresh();
        setUpdatingDealStatusId(null);
        return;
      }
      toast({
        title: "Deal status updated",
        description: "The deal lifecycle status was updated.",
        variant: "success",
      });
      router.refresh();
      setUpdatingDealStatusId(null);
    });
  };

  const handleDealStageChange = (id: string, stage: PipelineStage) => {
    setUpdatingDealStatusId(id);
    startUpdateStatusTransition(async () => {
      const result = await updateSavedDealStageAction(id, stage);
      if (!result.ok) {
        toast({ title: "Could not update stage", description: result.message, variant: "destructive" });
        // Ghost row (deleted elsewhere) — refresh so it disappears.
        if (result.code === "NOT_FOUND") router.refresh();
        setUpdatingDealStatusId(null);
        return;
      }
      toast({ title: "Stage updated", description: `Moved to ${pipelineStageLabel(stage)}.`, variant: "success" });
      router.refresh();
      setUpdatingDealStatusId(null);
    });
  };

  const handleDealTagsChange = (id: string, tags: string[]) => {
    setUpdatingDealStatusId(id);
    startUpdateStatusTransition(async () => {
      const result = await updateSavedDealTagsAction(id, tags);
      if (!result.ok) {
        toast({ title: "Could not update tags", description: result.message, variant: "destructive" });
        // Ghost row (deleted elsewhere) — refresh so it disappears.
        if (result.code === "NOT_FOUND") router.refresh();
        setUpdatingDealStatusId(null);
        return;
      }
      router.refresh();
      setUpdatingDealStatusId(null);
    });
  };

  // ─── Bulk actions ─────────────────────────────────────────────────
  // When the user has 1+ deals checkbox-selected, they can archive or
  // delete them all in a single click via the bar at the bottom of
  // the page. Both actions hit the same bulkUpdateSavedDealsAction
  // server action which validates ownership at the DB layer.
  const [isBulkArchiving, startBulkArchiveTransition] = useTransition();
  const [isBulkDeleting, startBulkDeleteTransition] = useTransition();
  const bulkRunning = isBulkArchiving || isBulkDeleting;

  const handleBulkArchive = () => {
    if (selectedIds.length === 0 || bulkRunning) return;
    startBulkArchiveTransition(async () => {
      const result = await bulkUpdateSavedDealsAction(selectedIds, "archive");
      if (!result.ok) {
        toast({
          title: "Could not archive selected deals",
          description: result.message,
          variant: "destructive",
        });
        return;
      }
      toast({
        title: `Archived ${result.affectedCount} deal${result.affectedCount === 1 ? "" : "s"}`,
        description: "Find them under the Archived filter.",
        variant: "success",
      });
      setSelectedIds([]);
      router.refresh();
    });
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0 || bulkRunning) return;
    // Defensive confirm - deletion is irreversible from the UI even
    // though the DB row stays around with deleted_at set.
    const confirmed = window.confirm(
      `Delete ${selectedIds.length} deal${selectedIds.length === 1 ? "" : "s"}? This cannot be undone from the UI.`
    );
    if (!confirmed) return;
    startBulkDeleteTransition(async () => {
      const result = await bulkUpdateSavedDealsAction(selectedIds, "delete");
      if (!result.ok) {
        toast({
          title: "Could not delete selected deals",
          description: result.message,
          variant: "destructive",
        });
        return;
      }
      toast({
        title: `Deleted ${result.affectedCount} deal${result.affectedCount === 1 ? "" : "s"}`,
        description: "Removed from your saved analyses.",
        variant: "success",
      });
      setSelectedIds([]);
      router.refresh();
    });
  };

  const SortToggle = ({ field, label }: { field: SortField; label: string }) => {
    const isAsc = activeSortField === field && activeSortDirection === "asc";
    const isDesc = activeSortField === field && activeSortDirection === "desc";
    return (
      <span className="inline-flex items-center gap-1.5">
        {label}
        <button
          type="button"
          onClick={() => handleSort(field)}
          className={cn(
            "h-7 w-7 rounded-md inline-flex items-center justify-center transition-colors",
            isAsc || isDesc
              ? "bg-primary/10 text-primary hover:bg-primary/15"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          )}
        >
          {isAsc ? (
            <ArrowUp className="w-3.5 h-3.5" />
          ) : isDesc ? (
            <ArrowDown className="w-3.5 h-3.5" />
          ) : (
            <ChevronsUpDown className="w-3.5 h-3.5" />
          )}
        </button>
      </span>
    );
  };

  const SortByButton = ({ field, label }: { field: SortField; label: string }) => {
    const isAsc = activeSortField === field && activeSortDirection === "asc";
    const isDesc = activeSortField === field && activeSortDirection === "desc";
    const isActive = isAsc || isDesc;
    return (
      <button
        type="button"
        onClick={() => handleSort(field)}
        className={cn(
          "h-8 px-2.5 rounded-full text-xs font-medium inline-flex items-center gap-1.5 transition-colors",
          isActive
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground hover:bg-muted"
        )}
      >
        {isActive ? (
          isAsc ? (
            <ArrowUp className="w-3.5 h-3.5" />
          ) : (
            <ArrowDown className="w-3.5 h-3.5" />
          )
        ) : (
          <ChevronsUpDown className="w-3.5 h-3.5" />
        )}
        {label}
      </button>
    );
  };

  const MobileFilterButton = ({
    label,
    active,
    onClick,
  }: {
    label: string;
    active: boolean;
    onClick: () => void;
  }) => (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-8 rounded-full px-3 text-xs font-bold transition-colors",
        active
          ? "bg-foreground text-background shadow-sm"
          : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      {label}
    </button>
  );

  // CSV export (Phase 2): downloads WHAT THE USER SEES — the currently
  // filtered + sorted view (displayItems, all pages), not the raw list.
  // Entirely client-side via a Blob + anchor; the pure builder lives in
  // lib/deals-csv.ts (RFC 4180 + formula-injection hardening).
  const handleExportCsv = () => {
    if (displayItems.length === 0) return;
    const csv = buildDealsCsv(
      displayItems.map(
        (item): DealsCsvItem => ({
          address: item.address,
          // Nickname leads in the list UI, so it leads in the sheet too.
          title: item.nickname?.trim() ? item.nickname.trim() : item.title,
          stageLabel: pipelineStageLabel(item.pipelineStage ?? "analyzing"),
          status: item.status,
          recommendation: item.recommendation,
          score: item.score,
          purchasePrice: item.purchasePrice,
          netCashFlowMonthly: item.netCashFlowMonthly,
          cocReturnPct: item.cocReturnPct,
          capRatePct: item.capRatePct,
          dscr: item.dscr ?? null,
          isCashPurchase: item.isCashPurchase ?? false,
          cashToClose: item.cashToClose ?? null,
          // Not carried on the loaded list rows — stays an empty cell.
          tenYearRoiPct: null,
          tags: item.tags ?? [],
          createdAt: item.createdAt,
          closeDate: item.closeDate ?? null,
        })
      )
    );
    // UTF-8 BOM: Excel on Windows assumes ANSI for BOM-less .csv files,
    // turning "Peña St" into mojibake; Sheets/Numbers ignore the BOM.
    const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = dealsCsvFilename();
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    toast({
      title: `Exported ${displayItems.length} deal${displayItems.length === 1 ? "" : "s"}`,
      description: "The CSV reflects your current filters and sort.",
      variant: "success",
    });
  };

  // How many mobile filters sit off their defaults (All / All Types /
  // Active / switch off) — shown on the collapsed "Filters" button so a
  // hidden filter can never silently empty the list.
  const savedMobileFilterCount =
    (selectedSignal !== "all" ? 1 : 0) +
    (selectedType !== "all" ? 1 : 0) +
    (activeDealStateFilter !== "active" ? 1 : 0) +
    (showcompare ? 1 : 0);

  const SavedMobileFilters = () => (
    <div className="xl:hidden">
      {/* Phone-width disclosure: the chip groups default-collapsed behind
          one button. From sm up the groups render expanded, as before. */}
      <button
        type="button"
        onClick={() => setMobileFiltersOpen((open) => !open)}
        aria-expanded={mobileFiltersOpen}
        className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-muted/60 px-3 text-xs font-bold text-foreground transition-colors hover:bg-muted sm:hidden"
      >
        <SlidersHorizontal className="h-3.5 w-3.5" />
        Filters
        {savedMobileFilterCount > 0 ? (
          <span className="rounded-full bg-foreground px-1.5 text-[10px] font-bold leading-4 text-background">
            {savedMobileFilterCount}
          </span>
        ) : null}
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", mobileFiltersOpen && "rotate-180")} />
      </button>
      <div className={cn("space-y-3", mobileFiltersOpen ? "mt-3 sm:mt-0" : "hidden sm:block")}>
      <div>
        <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Signal</p>
        <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0 [&>*]:shrink-0 sm:[&>*]:shrink">
          <MobileFilterButton label="All" active={selectedSignal === "all"} onClick={() => setSelectedSignal("all")} />
          {(Object.keys(SIGNAL_LABELS) as SavedSignal[]).map((signal) => (
            <MobileFilterButton
              key={signal}
              label={SIGNAL_LABELS[signal]}
              active={selectedSignal === signal}
              onClick={() => setSelectedSignal(signal)}
            />
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Property Type</p>
        <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0 [&>*]:shrink-0 sm:[&>*]:shrink">
          <MobileFilterButton label="All Types" active={selectedType === "all"} onClick={() => setSelectedType("all")} />
          <MobileFilterButton label="Single Family" active={selectedType === "single-family"} onClick={() => setSelectedType("single-family")} />
          <MobileFilterButton label="Multi-Family" active={selectedType === "multi-family"} onClick={() => setSelectedType("multi-family")} />
          <MobileFilterButton label="Owner Occupant" active={selectedType === "owner-occupant"} onClick={() => setSelectedType("owner-occupant")} />
        </div>
      </div>

      <div>
        <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Status</p>
        <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0 [&>*]:shrink-0 sm:[&>*]:shrink">
          <MobileFilterButton label="Active" active={activeDealStateFilter === "active"} onClick={() => handleStateFilterChange("active")} />
          <MobileFilterButton label="Completed" active={activeDealStateFilter === "completed"} onClick={() => handleStateFilterChange("completed")} />
          <MobileFilterButton label="Archived" active={activeDealStateFilter === "archived"} onClick={() => handleStateFilterChange("archived")} />
          <MobileFilterButton label="All" active={activeDealStateFilter === "all"} onClick={() => handleStateFilterChange("all")} />
        </div>
      </div>

      <div className="flex items-center justify-between rounded-2xl bg-muted/40 px-3 py-2">
        <span className="text-xs font-semibold text-muted-foreground">Show only selected</span>
        <Switch
          id="template-include-interest-deduction-mobile"
          checked={showcompare ?? false}
          disabled={!canCompareDeals}
          onCheckedChange={(value) => canCompareDeals && setShowcompare(value ?? false)}
          aria-label="Show selected analyses only"
        />
      </div>

      {/* Export the current view (filtered + sorted) as a spreadsheet. Lives
          inside the Filters disclosure below xl; the xl toolbar has its own
          Export CSV button. */}
      <button
        type="button"
        onClick={handleExportCsv}
        disabled={displayItems.length === 0}
        className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-2xl border border-border bg-muted/40 text-xs font-bold text-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
      >
        <FileDown className="h-3.5 w-3.5" />
        Export CSV ({displayItems.length})
      </button>
      </div>
    </div>
  );

  const allVisibleSelected =
    pagedItems.length > 0 && pagedItems.every((item) => selectedIds.includes(item.id));

  const showCompareLimit = () => {
    toast({
      title: "Compare limit reached",
      description: "You can compare up to 4 deals at a time.",
      variant: "warning",
    });
  };

  const handleCompareSelected = () => {
    // Hard guard against rapid double-clicks. The button's disabled
    // attribute alone isn't sufficient - React 19's useTransition
    // doesn't synchronously flip isStartingCompare, so a fast second
    // click can fire startCompareAction twice and race two
    // router.push() calls, manifesting as a "stuck" compare flow.
    if (isStartingCompare) return;
    if (!canCompareDeals) {
      toast({
        title: "Upgrade required",
        description: "Compare deals is not available for your current plan.",
        variant: "destructive",
      });
      router.push("/profile#billing");
      return;
    }
    startCompareTransition(async () => {
      const result = await startCompareAction(selectedIds);
      if (!result.ok) {
        toast({
          title: result.code === "LIMIT_EXCEEDED" ? "Compare limit reached" : "Could not start comparison",
          description: result.message,
          variant: result.code === "LIMIT_EXCEEDED" ? "warning" : "destructive",
        });
        return;
      }
      router.push("/dashboard/compare");
    });
  };

  // The handoff itself is the shared helper (also used by the deal
  // workspace's "Open full analysis" button) — this wrapper only adds My
  // Deals' toast on failure. Behavior identical to the pre-extraction code.
  const openSavedDealInAnalysisTab = async (id: string, targetWindow: Window | null) => {
    const result = await openSavedDealInAnalysisTabShared(id, targetWindow);
    if (!result.ok) {
      toast({
        title: "Could not open saved deal",
        description: result.message,
        variant: "destructive",
      });
    }
  };

  const toggleOne = (id: string) => {
    if (!canCompareDeals) {
      toast({
        title: "Upgrade required",
        description: "Compare deals is not available for your current plan.",
        variant: "destructive",
      });
      return;
    }
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((current) => current !== id);
      if (prev.length >= 4) {
        showCompareLimit();
        return prev;
      }
      return [...prev, id];
    });
  };

  const handleOpenAnalysisClick = (id: string) => {
    const targetWindow = window.open("about:blank", "_blank");
    if (targetWindow) targetWindow.opener = null;
    setOpeningDealId(id);
    void (async () => {
      try {
        await openSavedDealInAnalysisTab(id, targetWindow);
      } finally {
        setOpeningDealId(null);
      }
    })();
  };

  // "Duplicate" — fork this deal's assumptions into a NEW analysis (financing/
  // expenses carried over, property identity cleared). Same popup-safe tab
  // pattern as Open; a save from the forked deal is a fresh insert.
  const handleDuplicateDeal = (id: string) => {
    const targetWindow = window.open("about:blank", "_blank");
    if (targetWindow) targetWindow.opener = null;
    setOpeningDealId(id);
    void (async () => {
      try {
        const result = await duplicateSavedDealInAnalyzer(id, targetWindow);
        if (!result.ok) {
          toast({
            title: "Could not duplicate deal",
            description: result.message,
            variant: "destructive",
          });
        }
      } finally {
        setOpeningDealId(null);
      }
    })();
  };

  const openPdfUrl = (pdfUrl: string) => {
    const link = document.createElement("a");
    link.href = pdfUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleExportPdfClick = (id: string) => {
    if (!canExportPdf) {
      toast({
        title: "Upgrade required",
        description: "PDF export is not available for your current plan.",
        variant: "destructive",
      });
      router.push("/profile#billing");
      return;
    }
    setExportingPdfDealId(id);
    void (async () => {
      try {
        const exportResult = await getSavedAnalysisPdfExportAction(id);
        if (!exportResult.ok) {
          toast({
            title: "Could not export PDF",
            description: exportResult.message,
            variant: "destructive",
          });
          return;
        }

        if (exportResult.source === "cache") {
          // Cache hit - fetch the cached PDF and trigger a download
          // (instead of opening in a new tab via a link click, which
          // gets popup-blocked after async work). Falls back to opening
          // the URL directly if the fetch fails.
          try {
            const cacheResp = await fetch(exportResult.pdfUrl);
            if (!cacheResp.ok) throw new Error("Fetch failed");
            const cacheBlob = await cacheResp.blob();
            const blobUrl = URL.createObjectURL(cacheBlob);
            const a = document.createElement("a");
            a.href = blobUrl;
            a.download = "Investment-Analysis-Report.pdf";
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(blobUrl);
            toast({
              title: "PDF downloaded",
              description: "Your saved report was downloaded.",
              variant: "success",
            });
          } catch {
            // Fallback - try the original popup approach.
            openPdfUrl(exportResult.pdfUrl);
          }
          return;
        }

        const normalized = normalizeInvestmentFormSnapshot(exportResult.formSnapshot);
        if (!normalized) {
          // Name the failing field so the customer can actually fix it —
          // "not valid enough" with no pointer was a dead end.
          const issue = describeInvestmentFormSnapshotIssue(exportResult.formSnapshot);
          toast({
            title: "Could not export PDF",
            description: issue
              ? `This deal needs a fix before it can export — ${issue}. Open the deal, update that field, and re-save.`
              : "The saved analysis data is not valid enough to generate a PDF.",
            variant: "destructive",
          });
          return;
        }

        const parsed = investmentFormSchema.safeParse(normalized);
        if (!parsed.success) {
          toast({
            title: "Could not export PDF",
            description: "The saved analysis data no longer passes validation.",
            variant: "destructive",
          });
          return;
        }

        const computedResult = calculateAnalysis(parsed.data);
        // The lender-facing PDF must show the SAME live numbers every other
        // surface recomputes — not the stored snapshot. Spread computedResult
        // LAST so fresh headline metrics + projection/tax arrays win; keep the
        // stored snapshot only for any extra fields, and inject the fresh
        // score/recommendation/risk from the canonical verdict recompute.
        const freshVerdict = recomputeSavedDealVerdict(exportResult.formSnapshot);
        const resultSnapshot = {
          ...((exportResult.resultSnapshot ?? {}) as Record<string, unknown>),
          ...computedResult,
          ...(freshVerdict
            ? {
                score: freshVerdict.score,
                recommendation: freshVerdict.recommendation,
                riskLevel: freshVerdict.riskLevel,
              }
            : {}),
        } as AnalysisResult & Record<string, unknown>;
        const projectionYears = Array.isArray(resultSnapshot.tenYearProjection)
          ? resultSnapshot.tenYearProjection
          : computedResult.tenYearProjection;
        const taxYears = Array.isArray(resultSnapshot.taxStrategyYears)
          ? resultSnapshot.taxStrategyYears
          : computedResult.taxStrategyYears;
        const exitYears = buildExitScenarios({
          purchasePrice: parsed.data.purchasePrice,
          ...resolveExitScenarioRates(parsed.data),
          loanAmount: resultSnapshot.loanAmount,
          interestRate: parsed.data.interestRate,
          loanTermYears: parsed.data.loanTermYears,
          monthlyPayment: resultSnapshot.monthlyPayment,
          downPayment: resultSnapshot.downPayment,
          closingCosts: resultSnapshot.closingCosts,
          initialCashInvested: resultSnapshot.totalCashRequired,
          cumulativeCashFlowByYear: projectionYears.map((row) => row.cumulativeCashFlowAnnual),
          cumulativeTaxBenefitByYear: taxYears.map((row) => row.cumulativeTaxBenefitAnnual),
        });
        const reportData = buildReportDataFromSavedSnapshot({
          values: parsed.data,
          result: resultSnapshot,
          templateFallback: exportResult.templateFallback,
          exitYears,
        });
        // Attach this deal's stored RentCast comps (no API call - reads the
        // saved set) so the report includes the sale + rent comp tables.
        // Best-effort: comps are optional reference data, never block export.
        try {
          const { getSavedDealCompsAction } = await import("@/app/actions/property-comps");
          const compsRes = await getSavedDealCompsAction(id);
          if (compsRes.ok && compsRes.enrichment) {
            const { enrichmentToReportComps } = await import("@/lib/report-comps");
            reportData.comps = enrichmentToReportComps(compsRes.enrichment);
          }
        } catch {
          /* report proceeds without comps */
        }
        // Pull Pro-tier branding (logo, color, contact info) so the
        // exported PDF reflects the user's brand. Falls back to TrueCap
        // defaults if the user is unentitled or hasn't configured anything.
        const { getBranding } = await import("@/app/actions/branding");
        const brandingResult = await getBranding();
        const brandingConfig =
          brandingResult.ok && brandingResult.branding
            ? {
                logoUrl: brandingResult.branding.logo_url,
                primaryColorHex: brandingResult.branding.primary_color_hex,
                companyName: brandingResult.branding.company_name,
                tagline: brandingResult.branding.tagline,
                contactName: brandingResult.branding.contact_name,
                contactEmail: brandingResult.branding.contact_email,
                contactPhone: brandingResult.branding.contact_phone,
                contactWebsite: brandingResult.branding.contact_website,
              }
            : null;

        // Use generateInvestmentPDF (not …Blob) - it triggers a direct
        // doc.save() download AND returns the blob for caching. This is
        // the critical bug fix: the previous flow generated a blob,
        // uploaded to Supabase, then tried to open the public URL in a
        // new tab via link.click(). By the time the link.click() fired,
        // the browser had lost the user gesture context and silently
        // blocked the popup. Users saw "nothing happens" when clicking
        // Export PDF. doc.save() is a download, not a popup, so it
        // works regardless of timing.
        const { generateInvestmentPDF } = await import("@/lib/pdf-generator");
        const pdfBlob = await generateInvestmentPDF(reportData, brandingConfig);

        // Show a quick success toast so the user knows the export
        // worked even if their browser silently downloaded the file.
        toast({
          title: "PDF generated",
          description: "Your report was downloaded to your computer.",
          variant: "success",
        });

        // Cache the PDF to Supabase Storage in the background - this is
        // a best-effort cache for future exports. The user already has
        // their PDF; failures here only mean the next dashboard export
        // for this deal will regenerate. We capture to Sentry with a
        // dedicated tag so systemic failures (RLS regression, quota,
        // bucket misconfig) are visible in the dashboard without
        // surfacing as errors to the user.
        void (async () => {
          try {
            const supabase = createBrowserSupabaseClient();
            const {
              data: { user },
            } = await supabase.auth.getUser();
            if (!user) return;
            // Path embeds the composite cache version so an engine bump writes
            // a NEW object (fresh public URL) instead of upserting over the old
            // path — a CDN-cached copy of the old URL can never be re-served as
            // the "fresh" PDF.
            const filePath = `${user.id}/${exportResult.id}/investment-analysis-v${PDF_CACHE_VERSION}.pdf`;
            const { error: uploadError } = await supabase.storage
              .from(ANALYSIS_PDF_BUCKET)
              .upload(filePath, pdfBlob, {
                contentType: "application/pdf",
                upsert: true,
              });
            if (uploadError) {
              Sentry.captureMessage("pdf-cache-write upload failed", {
                level: "warning",
                tags: { feature: "pdf-cache-write" },
                extra: { message: uploadError.message },
              });
              return;
            }
            const { data: publicData } = supabase.storage
              .from(ANALYSIS_PDF_BUCKET)
              .getPublicUrl(filePath);
            const completeResult = await completeSavedAnalysisPdfExportAction(
              exportResult.id,
              publicData.publicUrl
            );
            if (!completeResult.ok) {
              Sentry.captureMessage("pdf-cache-write complete action failed", {
                level: "warning",
                tags: { feature: "pdf-cache-write" },
                extra: { code: completeResult.code, message: completeResult.message },
              });
            }
          } catch (err) {
            Sentry.captureException(err, {
              tags: { feature: "pdf-cache-write" },
            });
          }
        })();
      } catch (err) {
        // Top-level catch - any error in the regenerate path (parsing,
        // generation, etc.) surfaces a toast AND captures to Sentry so
        // failures are findable rather than silent. Previously this had
        // try/finally with no catch, so unhandled errors bubbled up
        // silently and users saw the loading state reset by finally
        // with no feedback.
        Sentry.captureException(err, {
          tags: { feature: "dashboard-pdf-export" },
          extra: { dealId: id },
        });
        toast({
          title: "PDF export failed",
          description:
            err instanceof Error
              ? err.message
              : "Something went wrong generating the PDF. Try again, and if it persists let us know.",
          variant: "destructive",
        });
      } finally {
        setExportingPdfDealId(null);
      }
    })();
  };

  const toggleAllVisible = () => {
    if (!canCompareDeals) {
      toast({
        title: "Upgrade required",
        description: "Compare deals is not available for your current plan.",
        variant: "destructive",
      });
      return;
    }
    if (allVisibleSelected) {
      setSelectedIds((prev) => prev.filter((id) => !pagedItems.some((item) => item.id === id)));
      return;
    }
    setSelectedIds((prev) => {
      const merged = new Set(prev);
      let reachedLimit = false;
      for (const item of pagedItems) {
        if (prev.includes(item.id)) continue;
        if (merged.size >= 4) {
          reachedLimit = true;
          break;
        }
        merged.add(item.id);
      }
      if (reachedLimit) {
        showCompareLimit();
      }
      return [...merged];
    });
  };

  const goToPage = (page: number) => {
    setCurrentPage(Math.min(Math.max(page, 1), pageCount));
  };

  const paginationPages = useMemo(() => {
    const pages = new Set<number>([1, pageCount, safeCurrentPage - 1, safeCurrentPage, safeCurrentPage + 1]);
    return [...pages].filter((page) => page >= 1 && page <= pageCount).sort((a, b) => a - b);
  }, [pageCount, safeCurrentPage]);

  return (
    <main id="main" className="min-h-[calc(100vh-5rem)] bg-muted/30 pb-12">
      <section className="w-full px-4 sm:px-6 pt-6 sm:pt-8 space-y-6">
      <div className="mb-6 flex flex-wrap items-center gap-3">
          <Button variant="ghost" size="sm" className="mt-1 px-1.5 text-muted-foreground bg-primary/10 sm:bg-transparent" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              <span className="hidden xl:inline">Back</span>
            </Link>
          </Button>
          <div className="h-6 w-px bg-border" />
          <div className="space-y-1">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">Saved Analyses</h1>
            <p className="text-sm text-muted-foreground">{filteredItems.length} deals in your portfolio</p>
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-3 sm:p-4 space-y-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="relative flex-1 max-w-xl">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Search by address..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="pl-9 h-10 rounded-xl bg-muted/60 border-border"
              />
            </div>
            {/* Phone width: the five sort pills collapse into one compact
                Select + a direction toggle. The pill row is unchanged from
                sm up. Re-picking the active field in the Select is a no-op
                (Radix only fires on change), so the arrow button owns the
                asc/desc flip. */}
            <div className="flex items-center gap-1.5 sm:hidden">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <SlidersHorizontal className="w-3.5 h-3.5" />
                Sort
              </span>
              <Select
                value={activeSortField ?? undefined}
                onValueChange={(value) => handleSort(value as SortField)}
              >
                <SelectTrigger className="h-9 flex-1 rounded-xl text-xs" aria-label="Sort deals by">
                  <SelectValue placeholder="Date Saved" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="saved">Date Saved</SelectItem>
                  <SelectItem value="cash-flow">Cash Flow</SelectItem>
                  <SelectItem value="coc">CoC Return</SelectItem>
                  <SelectItem value="cap-rate">Cap Rate</SelectItem>
                  <SelectItem value="price">Price</SelectItem>
                </SelectContent>
              </Select>
              <button
                type="button"
                onClick={() => handleSort(activeSortField ?? "saved")}
                aria-label="Toggle sort direction"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-muted/60 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {activeSortField && activeSortDirection === "asc" ? (
                  <ArrowUp className="w-3.5 h-3.5" />
                ) : activeSortField && activeSortDirection === "desc" ? (
                  <ArrowDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronsUpDown className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
            <div className="hidden flex-wrap items-center gap-1.5 sm:flex">
              <span className="inline-flex w-full items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground sm:w-auto sm:mr-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5" />
                Sort by
              </span>
              <SortByButton field="saved" label="Date Saved" />
              <SortByButton field="cash-flow" label="Cash Flow" />
              <SortByButton field="coc" label="CoC Return" />
              <SortByButton field="cap-rate" label="Cap Rate" />
              <SortByButton field="price" label="Price" />
            </div>
          </div>

          <SavedMobileFilters />

          {/* Real buy-box screening — only when the user has ≥1 active box.
              Filters the list to deals that meet at least one of their saved
              acquisition boxes (the per-deal verdict mirrors the single-deal
              card). Invisible for everyone else. */}
          {buyBoxFitById ? (
            <button
              type="button"
              onClick={() => setBuyBoxOnly((v) => !v)}
              aria-pressed={buyBoxOnly}
              className={cn(
                "inline-flex items-center gap-1.5 self-start rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                buyBoxOnly
                  ? "border-[var(--brand-green)] bg-[var(--brand-green)] text-white"
                  : "border-[var(--brand-green)]/30 bg-[var(--brand-green-light)] text-[var(--brand-green)] hover:bg-[var(--brand-green)]/15"
              )}
            >
              <Target className="size-3.5" />
              Meets my buy box
              <span
                className={cn(
                  "rounded-full px-1.5 py-px text-[10px] tabular-nums",
                  buyBoxOnly ? "bg-white/20" : "bg-[var(--brand-green)]/15"
                )}
              >
                {buyBoxMatchCount}
              </span>
            </button>
          ) : buyBoxNudgeEligible && activeDealCount >= 3 ? (
            // Discovery nudge (PV-2) — sits exactly where the screening pill
            // will appear once a box exists. Dismissal handled inside.
            <BuyBoxNudge variant="my-deals" eligible />
          ) : null}

          <div className="hidden flex-wrap items-center gap-2 xl:flex">
            <Tabs value={selectedSignal} onValueChange={(value) => setSelectedSignal(value as "all" | SavedSignal)} className="gap-0">
              <TabsList className="bg-muted/60 h-9 rounded-full p-1">
                <TabsTrigger value="all" className="h-9 sm:h-7 rounded-full px-3 text-xs data-[state=active]:bg-foreground data-[state=active]:text-background">All</TabsTrigger>
                {(Object.keys(SIGNAL_LABELS) as SavedSignal[]).map((signal) => (
                  <TabsTrigger key={signal} value={signal} className="h-9 sm:h-7 rounded-full px-3 text-xs data-[state=active]:bg-foreground data-[state=active]:text-background">
                    {SIGNAL_LABELS[signal]}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            <Tabs value={selectedType} onValueChange={(value) => setSelectedType(value as "all" | SavedPropertyType)} className="gap-0">
              <TabsList className="bg-muted/60 h-9 rounded-full p-1">
                <TabsTrigger value="all" className="h-9 sm:h-7 rounded-full px-3 text-xs data-[state=active]:bg-foreground data-[state=active]:text-background">All Types</TabsTrigger>
                <TabsTrigger value="single-family" className="h-9 sm:h-7 rounded-full px-3 text-xs data-[state=active]:bg-foreground data-[state=active]:text-background">Single Family</TabsTrigger>
                <TabsTrigger value="multi-family" className="h-9 sm:h-7 rounded-full px-3 text-xs data-[state=active]:bg-foreground data-[state=active]:text-background">Multi-Family</TabsTrigger>
                <TabsTrigger value="owner-occupant" className="h-9 sm:h-7 rounded-full px-3 text-xs data-[state=active]:bg-foreground data-[state=active]:text-background">Owner Occupant</TabsTrigger>
              </TabsList>
            </Tabs>

            <Tabs value={activeDealStateFilter} onValueChange={(value) => handleStateFilterChange(value as DealStateFilter)} className="gap-0">
              <TabsList className="bg-muted/60 h-9 rounded-full p-1">
                <TabsTrigger value="active" className="h-9 sm:h-7 rounded-full px-3 text-xs data-[state=active]:bg-foreground data-[state=active]:text-background">Active</TabsTrigger>
                <TabsTrigger value="completed" className="h-9 sm:h-7 rounded-full px-3 text-xs data-[state=active]:bg-foreground data-[state=active]:text-background">Completed</TabsTrigger>
                <TabsTrigger value="archived" className="h-9 sm:h-7 rounded-full px-3 text-xs data-[state=active]:bg-foreground data-[state=active]:text-background">Archived</TabsTrigger>
                <TabsTrigger value="all" className="h-9 sm:h-7 rounded-full px-3 text-xs data-[state=active]:bg-foreground data-[state=active]:text-background">All</TabsTrigger>
              </TabsList>
            </Tabs>

           
           <div className="ml-auto flex items-center gap-2">
            {/* Download the current view (filtered + sorted) as a CSV. */}
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 rounded-full text-xs"
              onClick={handleExportCsv}
              disabled={displayItems.length === 0}
            >
              <FileDown className="h-3.5 w-3.5" />
              Export CSV
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 gap-1.5 rounded-full text-xs">
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  Columns
                  {optionalColumnCount > 0 ? (
                    <span className="rounded-full bg-foreground px-1.5 text-[10px] font-bold leading-4 text-background">
                      {optionalColumnCount}
                    </span>
                  ) : null}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel>Extra columns</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem
                  checked={optionalColumns.dscr}
                  onCheckedChange={(value) => setOptionalColumn("dscr", value === true)}
                  onSelect={(event) => event.preventDefault()}
                >
                  DSCR
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={optionalColumns.cashToClose}
                  onCheckedChange={(value) => setOptionalColumn("cashToClose", value === true)}
                  onSelect={(event) => event.preventDefault()}
                >
                  Cash to close
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={optionalColumns.market}
                  onCheckedChange={(value) => setOptionalColumn("market", value === true)}
                  onSelect={(event) => event.preventDefault()}
                >
                  Market
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={optionalColumns.neighborhood}
                  onCheckedChange={(value) => setOptionalColumn("neighborhood", value === true)}
                  onSelect={(event) => event.preventDefault()}
                >
                  Neighborhood
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <div className="inline-flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground mr-1.5">Show only selected</span>
              <Switch
                id="template-include-interest-deduction"
                checked={showcompare ?? false}
                disabled={!canCompareDeals}
                onCheckedChange={(value)=> canCompareDeals && setShowcompare(value ?? false)}
                aria-label="Show selected analyses only"
              />
            </div>
          </div>

          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="space-y-3 p-3 xl:hidden">
            {pagedItems.map((item) => {
              const address = getAddressParts(item);
              const isSelected = selectedIds.includes(item.id);
              const signal = item.signal;
              const PropertyTypeIcon = getTypeIcon(item.propertyType);
              // Badge row stays one line: signal + buy-box fit lead, and the
              // status / score-breakdown / data-confidence extras fold behind
              // a compact "+N" popover so completed deals with confidence data
              // don't wrap the header to three lines.
              const statusBadge = getStatusBadge(item);
              const foldedBadgeCount =
                (statusBadge ? 1 : 0) +
                (item.breakdown && item.score != null ? 1 : 0) +
                (item.dataConfidence ? 1 : 0);
              return (
                <article
                  key={item.id}
                  className={cn(
                    "rounded-2xl border border-border bg-background p-4 shadow-sm transition-colors",
                    isSelected && "border-primary/40 bg-primary/5"
                  )}
                >
                  <div className="flex items-start gap-3 ">
                    <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <PropertyTypeIcon className="w-4 h-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      {/* Name click = the deal's workspace (same-tab, like every
                          other workspace deep-link). The analyzer handoff stays
                          one click away on the Open button below. */}
                      <Link
                        href={`/dashboard/saved-analyses/${item.id}`}
                        title={item.address ?? undefined}
                        className="flex max-w-full items-center gap-2 text-left text-base font-bold leading-tight text-foreground hover:text-primary"
                      >
                        <span className="truncate">{address.main}</span>
                        {item.scenarioName ? (
                          // Sibling scenarios share the address (and nickname) —
                          // this suffix keeps them tellable apart at a glance.
                          <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                            Scenario · {item.scenarioName}
                          </span>
                        ) : null}
                      </Link>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <Badge className={cn("rounded-full border text-xs font-semibold", getSignalClasses(signal))}>{SIGNAL_LABELS[signal]}</Badge>
                        <BuyBoxFitBadge fit={buyBoxFitById?.get(item.id)} />
                        {foldedBadgeCount > 0 ? (
                          <Popover>
                            <PopoverTrigger asChild>
                              <button
                                type="button"
                                aria-label={`${foldedBadgeCount} more detail${foldedBadgeCount === 1 ? "" : "s"} for ${address.main}`}
                                className="text-[11px] font-semibold text-primary underline-offset-2 hover:underline"
                              >
                                +{foldedBadgeCount} more
                              </button>
                            </PopoverTrigger>
                            <PopoverContent align="start" className="w-auto max-w-[280px] space-y-2.5 p-3">
                              {statusBadge || item.dataConfidence ? (
                                <div className="flex flex-wrap items-center gap-1.5">
                                  {statusBadge}
                                  {item.dataConfidence ? (
                                    <DataConfidenceBadge confidence={item.dataConfidence} size="xs" />
                                  ) : null}
                                </div>
                              ) : null}
                              {item.breakdown && item.score != null ? (
                                <ScoreBreakdown breakdown={item.breakdown} score={item.score} propertyType={item.propertyType} />
                              ) : null}
                            </PopoverContent>
                          </Popover>
                        ) : null}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{getTypeLabel(item.propertyType)}</p>
                      <NextActionLine recommendation={item.recommendation} netCashFlow={item.netCashFlowMonthly} stage={item.status === "completed" ? "closed" : item.pipelineStage} meetsBuyBox={buyBoxFitById?.get(item.id)?.anyPass ?? null} hasCloseDate={item.closeDate != null} className="mt-1.5" />
                      <OwnedEquityCell item={item} enabled={ownedEquityEnabled} />
                    </div>
                    <input
                      type="checkbox"
                      checked={canCompareDeals && isSelected}
                      onChange={() => toggleOne(item.id)}
                      disabled={!canCompareDeals}
                      aria-label={`Select analysis ${address.main}`}
                      className="mt-1 h-4 w-4 shrink-0 rounded border-border disabled:cursor-not-allowed disabled:opacity-40"
                    />
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <div className="rounded-xl bg-muted/40 p-3">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Cash Flow</p>
                      <p className={cn("mt-1 text-sm font-extrabold", (item.netCashFlowMonthly ?? 0) >= 0 ? "text-success" : "text-[var(--metric-negative)]")}>
                        {toMonthCashFlow(item.netCashFlowMonthly)}
                      </p>
                    </div>
                    <div className="rounded-xl bg-muted/40 p-3">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">CoC</p>
                      <p className={cn("mt-1 text-sm font-extrabold", (item.cocReturnPct ?? 0) >= 0 ? "text-success" : "text-[var(--metric-negative)]")}>
                        {toPercent(item.cocReturnPct)}
                      </p>
                    </div>
                    <div className="rounded-xl bg-muted/40 p-3">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Cap Rate</p>
                      <p className="mt-1 text-sm font-extrabold text-foreground">{toPercent(item.capRatePct)}</p>
                    </div>
                    <div className="rounded-xl bg-muted/40 p-3">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Price</p>
                      <p className="mt-1 text-sm font-extrabold text-foreground">{toCurrency(item.purchasePrice)}</p>
                    </div>
                  </div>

                  {/* One primary Open action + a ⋯ overflow menu — mirrors the
                      desktop table's consolidation below. Stage/status and tag
                      editing live in the menu; tags stay visible as read-only
                      chips so the card keeps its context without the expanded
                      editor + selects that used to add ~190px per card. */}
                  <div className="mt-4 grid gap-3">
                    {canUsePipeline && editingTagsDealId === item.id ? (
                      <DealTags
                        tags={item.tags ?? []}
                        disabled={isUpdatingStatus && updatingDealStatusId === item.id}
                        onSave={(t) => handleDealTagsChange(item.id, t)}
                      />
                    ) : canUsePipeline && (item.tags?.length ?? 0) > 0 ? (
                      <div className="flex flex-wrap items-center gap-1.5">
                        {(item.tags ?? []).map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-10 flex-1 rounded-xl px-2.5 text-xs"
                        onClick={() => handleOpenAnalysisClick(item.id)}
                        disabled={openingDealId === item.id}
                      >
                        {openingDealId === item.id ? (
                          <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                        ) : (
                          <ExternalLink className="w-3.5 h-3.5 mr-1" />
                        )}
                        Open
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-10 w-10 shrink-0 rounded-xl p-0"
                            aria-label={`More actions for ${address.main}`}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                          <DropdownMenuItem
                            onSelect={() => handleExportPdfClick(item.id)}
                            disabled={exportingPdfDealId === item.id}
                          >
                            {exportingPdfDealId === item.id ? (
                              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <FileDown className="mr-2 h-3.5 w-3.5" />
                            )}
                            Export PDF
                            {!canExportPdf ? (
                              <span className="ml-auto rounded-full bg-primary/10 px-1.5 py-0 text-[9px] font-bold text-primary">
                                PRO
                              </span>
                            ) : null}
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/dashboard/saved-analyses/${item.id}`}>
                              <ClipboardList className="mr-2 h-3.5 w-3.5" />
                              Deal workspace
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={() => handleDuplicateDeal(item.id)}
                            disabled={openingDealId === item.id}
                          >
                            <CopyPlus className="mr-2 h-3.5 w-3.5" />
                            Duplicate
                          </DropdownMenuItem>
                          {canUsePipeline ? (
                            <DropdownMenuItem
                              onSelect={() =>
                                setEditingTagsDealId((prev) => (prev === item.id ? null : item.id))
                              }
                            >
                              <Tag className="mr-2 h-3.5 w-3.5" />
                              {editingTagsDealId === item.id ? "Done editing tags" : "Edit tags"}
                            </DropdownMenuItem>
                          ) : null}
                          <DropdownMenuSeparator />
                          <DropdownMenuLabel>{canUsePipeline ? "Stage" : "Status"}</DropdownMenuLabel>
                          {canUsePipeline
                            ? PIPELINE_STAGES.map((s) => (
                                <DropdownMenuCheckboxItem
                                  key={s.id}
                                  checked={(item.pipelineStage ?? "analyzing") === s.id}
                                  disabled={isUpdatingStatus && updatingDealStatusId === item.id}
                                  onCheckedChange={(checked) => {
                                    if (checked) handleDealStageChange(item.id, s.id);
                                  }}
                                >
                                  {s.label}
                                </DropdownMenuCheckboxItem>
                              ))
                            : (
                                [
                                  ["active", "Active"],
                                  ["completed", "Completed"],
                                  ["archived", "Archived"],
                                ] as const
                              ).map(([value, label]) => (
                                <DropdownMenuCheckboxItem
                                  key={value}
                                  checked={item.status === value}
                                  disabled={isUpdatingStatus && updatingDealStatusId === item.id}
                                  onCheckedChange={(checked) => {
                                    if (checked) handleDealStatusChange(item.id, value);
                                  }}
                                >
                                  {label}
                                </DropdownMenuCheckboxItem>
                              ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CalendarClock className="h-3.5 w-3.5" />
                    <span>Saved {new Date(item.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                  </p>
                </article>
              );
            })}
          </div>

          <div className="hidden overflow-x-auto xl:block">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-muted/40 border-b border-border">
                <tr className="h-12">
                  <th className="w-10 px-3">
                    <input
                      type="checkbox"
                      checked={canCompareDeals && allVisibleSelected}
                      onChange={toggleAllVisible}
                      disabled={!canCompareDeals}
                      aria-label="Select all visible analyses"
                      className="h-4 w-4 rounded border-border disabled:cursor-not-allowed disabled:opacity-40"
                    />
                  </th>
                  <th className="text-left text-xs uppercase tracking-wider text-muted-foreground font-bold">Property</th>
                  <th className="text-left text-xs uppercase tracking-wider text-muted-foreground font-bold">Signal</th>
                  <th className="text-left text-xs uppercase tracking-wider text-muted-foreground font-bold"><SortToggle field="cash-flow" label="Cash Flow" /></th>
                  <th className="text-left text-xs uppercase tracking-wider text-muted-foreground font-bold"><SortToggle field="coc" label="CoC" /></th>
                  <th className="text-left text-xs uppercase tracking-wider text-muted-foreground font-bold"><SortToggle field="cap-rate" label="Cap Rate" /></th>
                  <th className="text-left text-xs uppercase tracking-wider text-muted-foreground font-bold"><SortToggle field="price" label="Price" /></th>
                  {optionalColumns.dscr ? (
                    <th className="text-left text-xs uppercase tracking-wider text-muted-foreground font-bold">DSCR</th>
                  ) : null}
                  {optionalColumns.cashToClose ? (
                    <th className="whitespace-nowrap text-left text-xs uppercase tracking-wider text-muted-foreground font-bold">Cash to close</th>
                  ) : null}
                  {optionalColumns.market ? (
                    <th className="text-left text-xs uppercase tracking-wider text-muted-foreground font-bold">Market</th>
                  ) : null}
                  {optionalColumns.neighborhood ? (
                    <th className="text-left text-xs uppercase tracking-wider text-muted-foreground font-bold">Neighborhood</th>
                  ) : null}
                  <th className="text-left text-xs uppercase tracking-wider text-muted-foreground font-bold">Status</th>
                  <th className="text-left text-xs uppercase tracking-wider text-muted-foreground font-bold">Actions</th>
                  <th className="whitespace-nowrap pr-4 text-left text-xs uppercase tracking-wider text-muted-foreground font-bold"><SortToggle field="saved" label="Saved" /></th>
                </tr>
              </thead>
              <tbody>
                {pagedItems.map((item) => {
                  const address = getAddressParts(item);
                  const isSelected = selectedIds.includes(item.id);
                  const signal = item.signal;
                  const PropertyTypeIcon = getTypeIcon(item.propertyType);
                  return (
                    <tr key={item.id} className={cn("h-16 border-b border-border/80 transition-colors", isSelected ? "bg-primary/5" : "hover:bg-muted/40")}>
                      <td className="px-3 align-middle">
                        <input
                          type="checkbox"
                          checked={canCompareDeals && isSelected}
                          onChange={() => toggleOne(item.id)}
                          disabled={!canCompareDeals}
                          aria-label={`Select analysis ${address.main}`}
                          className="h-4 w-4 rounded border-border disabled:cursor-not-allowed disabled:opacity-40"
                        />
                      </td>
                      <td className="pr-2">
                        <div className="flex items-start gap-2">
                          <span className="mt-0.5 inline-flex size-7 rounded-full bg-primary/10 text-primary items-center justify-center shrink-0">
                            <PropertyTypeIcon className="w-3.5 h-3.5" />
                          </span>
                          <div className="min-w-0">
                            {/* Name click = the deal's workspace (same-tab). The
                                analyzer stays one click away via Open Analysis. */}
                            <Link
                              href={`/dashboard/saved-analyses/${item.id}`}
                              title={item.address ?? undefined}
                              className="flex max-w-full items-center gap-2 text-left font-semibold text-foreground hover:text-primary"
                            >
                              <span className="truncate">{address.main}</span>
                              {item.scenarioName ? (
                                // Sibling scenarios share the address (and
                                // nickname) — keep the rows tellable apart.
                                <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                                  Scenario · {item.scenarioName}
                                </span>
                              ) : null}
                            </Link>
                            {getStatusBadge(item)}
                            <p className="text-xs text-muted-foreground truncate">
                              {getTypeLabel(item.propertyType)}
                            </p>
                            <NextActionLine recommendation={item.recommendation} netCashFlow={item.netCashFlowMonthly} stage={item.status === "completed" ? "closed" : item.pipelineStage} meetsBuyBox={buyBoxFitById?.get(item.id)?.anyPass ?? null} hasCloseDate={item.closeDate != null} className="mt-0.5" />
                            <OwnedEquityCell item={item} enabled={ownedEquityEnabled} />
                          </div>
                        </div>
                      </td>
                      <td className="pr-2">
                        {/* Stacked: verdict badge + "Why?" on one line, the data-
                            confidence pill on its own line below — uses vertical
                            space instead of widening the column. */}
                        <div className="flex flex-col items-start gap-1.5">
                          <span className="inline-flex items-center gap-1.5">
                            <Badge className={cn("rounded-full border text-xs font-semibold", getSignalClasses(signal))}>{SIGNAL_LABELS[signal]}</Badge>
                            {item.breakdown && item.score != null ? (
                              <Popover>
                                <PopoverTrigger asChild>
                                  <button type="button" className="text-[11px] font-semibold text-primary underline-offset-2 hover:underline">Why?</button>
                                </PopoverTrigger>
                                <PopoverContent align="end" className="w-auto p-3">
                                  <ScoreBreakdown breakdown={item.breakdown} score={item.score} propertyType={item.propertyType} />
                                </PopoverContent>
                              </Popover>
                            ) : null}
                          </span>
                          <BuyBoxFitBadge fit={buyBoxFitById?.get(item.id)} />
                          {item.dataConfidence ? (
                            <DataConfidenceBadge confidence={item.dataConfidence} size="xs" />
                          ) : null}
                        </div>
                      </td>
                      <td className={cn("font-semibold", (item.netCashFlowMonthly ?? 0) >= 0 ? "text-success" : "text-[var(--metric-negative)]")}>{toMonthCashFlow(item.netCashFlowMonthly)}</td>
                      <td className={cn("font-semibold", (item.cocReturnPct ?? 0) >= 0 ? "text-success" : "text-[var(--metric-negative)]")}>{toPercent(item.cocReturnPct)}</td>
                      <td className="font-medium">{toPercent(item.capRatePct)}</td>
                      <td className="font-semibold text-foreground">{toCurrency(item.purchasePrice)}</td>
                      {optionalColumns.dscr ? (
                        <td className="font-medium tabular-nums text-foreground">
                          {/* "Cash" keys off the explicit flag — a financed deal
                              with negative NOI has a real DSCR ≤ 0 to show. */}
                          {item.isCashPurchase ? "Cash" : item.dscr == null ? "—" : item.dscr.toFixed(2)}
                        </td>
                      ) : null}
                      {optionalColumns.cashToClose ? (
                        <td className="font-medium tabular-nums text-foreground">{toCurrency(item.cashToClose ?? null)}</td>
                      ) : null}
                      {optionalColumns.market ? (
                        <td className="text-foreground">{item.market?.trim() || "—"}</td>
                      ) : null}
                      {optionalColumns.neighborhood ? (
                        <td className="text-foreground">{item.neighborhood?.trim() || "—"}</td>
                      ) : null}
                      <td className="pr-2">
                        <div className="flex flex-col gap-2">
                          {canUsePipeline ? (
                            <Select
                              value={item.pipelineStage ?? "analyzing"}
                              onValueChange={(value) => handleDealStageChange(item.id, value as PipelineStage)}
                              disabled={isUpdatingStatus && updatingDealStatusId === item.id}
                            >
                              <SelectTrigger className="h-8 w-[150px] rounded-md text-xs">
                                <SelectValue placeholder="Stage" />
                              </SelectTrigger>
                              <SelectContent>
                                {PIPELINE_STAGES.map((s) => (
                                  <SelectItem key={s.id} value={s.id}>
                                    {s.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Select
                              value={item.status}
                              onValueChange={(value) => handleDealStatusChange(item.id, value as SavedAnalysisListItem["status"])}
                              disabled={isUpdatingStatus && updatingDealStatusId === item.id}
                            >
                              <SelectTrigger className="h-8 w-[150px] rounded-md text-xs">
                                <SelectValue placeholder="Status" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="completed">Completed</SelectItem>
                                <SelectItem value="archived">Archived</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                          {canUsePipeline ? (
                            <DealTags
                              tags={item.tags ?? []}
                              disabled={isUpdatingStatus && updatingDealStatusId === item.id}
                              onSave={(t) => handleDealTagsChange(item.id, t)}
                            />
                          ) : null}
                        </div>
                      </td>
                      <td className="pr-2">
                        {/* Consolidated: a single primary "Open Analysis" plus a
                            ⋯ overflow menu for the secondary actions. Previously
                            three full-width buttons here overflowed the row and
                            truncated the table. */}
                        <div className="flex items-center gap-1.5">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 rounded-md px-2.5 text-xs"
                            onClick={() => handleOpenAnalysisClick(item.id)}
                            disabled={openingDealId === item.id}
                          >
                            {openingDealId === item.id ? (
                              <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                            ) : (
                              <ExternalLink className="w-3.5 h-3.5 mr-1" />
                            )}
                            Open Analysis
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-8 w-8 rounded-md p-0"
                                aria-label={`More actions for ${address.main}`}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                              <DropdownMenuItem onSelect={() => handleExportPdfClick(item.id)}>
                                <FileDown className="mr-2 h-3.5 w-3.5" />
                                Export PDF
                                {!canExportPdf ? (
                                  <span className="ml-auto rounded-full bg-primary/10 px-1.5 py-0 text-[9px] font-bold text-primary">
                                    PRO
                                  </span>
                                ) : null}
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link href={`/dashboard/saved-analyses/${item.id}`}>
                                  <ClipboardList className="mr-2 h-3.5 w-3.5" />
                                  Deal workspace
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onSelect={() => handleDuplicateDeal(item.id)}
                                disabled={openingDealId === item.id}
                              >
                                <CopyPlus className="mr-2 h-3.5 w-3.5" />
                                Duplicate
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                      <td className="whitespace-nowrap pr-4 text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5">
                          <CalendarClock className="h-3.5 w-3.5" />
                          <span>{new Date(item.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {displayItems.length === 0 && (
            <div className="py-16 px-6 text-center">
              {initialItems.length === 0 ? (
                /* Brand-new user - never saved a deal. Welcome them
                   instead of showing a search-y "no results" state. */
                <>
                  <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <p className="text-base font-bold text-foreground">Save your first deal</p>
                  <p className="mx-auto mt-1 max-w-sm text-sm leading-relaxed text-muted-foreground">
                    Run a property through the analyzer and click <strong className="text-foreground">Save</strong> on the dashboard. Saved deals show up here with a portfolio rollup, so you can compare, edit, and revisit any deal you&apos;re considering.
                  </p>
                  <Button asChild size="lg" className="mt-5 w-full rounded-full sm:w-auto">
                    <Link href="/">Open the analyzer</Link>
                  </Button>
                </>
              ) : (
                /* Has deals, but filters/search hide them all. */
                <>
                  <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-muted">
                    <Search className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-semibold text-foreground">No deals match your filters</p>
                  <p className="text-xs text-muted-foreground mt-1">Try clearing the search or switching the deal-state tab.</p>
                  <Button asChild variant="outline" className="rounded-full mt-4">
                    <Link href="/dashboard/saved-analyses">Reset filters</Link>
                  </Button>
                </>
              )}
            </div>
          )}

          {displayItems.length > PAGE_SIZE && (
            <div className="flex flex-col gap-3 border-t border-border bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">
                Page {safeCurrentPage} of {pageCount}
              </p>
              <Pagination className="mx-0 w-auto justify-start sm:justify-end">
                <PaginationContent>
                  <PaginationItem>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 rounded-full px-3"
                      disabled={safeCurrentPage === 1}
                      onClick={() => goToPage(safeCurrentPage - 1)}
                    >
                      Previous
                    </Button>
                  </PaginationItem>
                  {paginationPages.map((page, index) => {
                    const previousPage = paginationPages[index - 1];
                    return (
                      <PaginationItem key={page} className="flex items-center gap-1">
                        {previousPage != null && page - previousPage > 1 && (
                          <span className="flex h-8 w-6 items-center justify-center text-xs text-muted-foreground">
                            ...
                          </span>
                        )}
                        <Button
                          type="button"
                          variant={page === safeCurrentPage ? "outline" : "ghost"}
                          size="icon-sm"
                          className="size-8 rounded-full"
                          onClick={() => goToPage(page)}
                          aria-current={page === safeCurrentPage ? "page" : undefined}
                        >
                          {page}
                        </Button>
                      </PaginationItem>
                    );
                  })}
                  <PaginationItem>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 rounded-full px-3"
                      disabled={safeCurrentPage === pageCount}
                      onClick={() => goToPage(safeCurrentPage + 1)}
                    >
                      Next
                    </Button>
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-dashed border-border bg-card/60 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Showing {displayItems.length === 0 ? 0 : pageStartIndex + 1}-{pageEndIndex} of {displayItems.length} 
            {displayItems.length !== initialItems.length ? ` (${initialItems.length} total)` : ""}
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              disabled={!canCompareDeals || selectedIds.length < 1 || isStartingCompare}
              onClick={handleCompareSelected}
              title={!canCompareDeals ? "Compare is not available for your current plan." : undefined}
            >
              <ArrowUpDown className="w-4 h-4 mr-1.5" />
              {isStartingCompare ? "Preparing..." : "Compare Selected"}
            </Button>
            <Button className="rounded-full bg-primary text-primary-foreground" asChild>
              <Link href="/">
                <Sparkles className="w-4 h-4 mr-1.5" />
                New Analysis
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/*
        Floating bulk-action bar - visible only when at least one deal
        is checkbox-selected. Sticky to the bottom of the viewport so
        users can scroll through long lists without losing access to
        the actions. Centered + max-width so it doesn't span the whole
        screen on desktop.

        The Compare button up in the section bar is the "primary"
        action (Pro feature, high intent). This bar provides the
        management actions (archive, delete) that apply regardless of
        plan. Free users can still organize their list.
      */}
      {selectedIds.length > 0 ? (
        <div
          role="region"
          aria-label="Bulk actions"
          className="fixed inset-x-0 bottom-4 z-40 mx-auto flex w-[min(680px,calc(100vw-32px))] items-center justify-between gap-3 rounded-2xl border border-border bg-card/95 px-4 py-3 shadow-2xl backdrop-blur"
        >
          <div className="flex items-center gap-3">
            <span className="inline-flex h-7 min-w-[28px] items-center justify-center rounded-full bg-primary px-2 text-xs font-bold text-primary-foreground">
              {selectedIds.length}
            </span>
            <p className="text-sm font-semibold text-foreground">
              {selectedIds.length === 1 ? "deal" : "deals"} selected
            </p>
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="hidden text-xs font-semibold text-muted-foreground hover:text-foreground sm:inline-flex sm:items-center sm:gap-1"
            >
              <X className="h-3.5 w-3.5" />
              Clear
            </button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 rounded-full px-3 text-xs"
              onClick={handleBulkArchive}
              disabled={bulkRunning}
            >
              {isBulkArchiving ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Archive className="mr-1.5 h-3.5 w-3.5" />
              )}
              Archive
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 rounded-full border-[var(--metric-negative)]/40 px-3 text-xs text-[var(--metric-negative)] hover:bg-[var(--metric-negative)]/10 hover:text-[var(--metric-negative)]"
              onClick={handleBulkDelete}
              disabled={bulkRunning}
            >
              {isBulkDeleting ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              )}
              Delete
            </Button>
          </div>
        </div>
      ) : null}
    </main>
  );
}
