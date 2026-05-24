"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  ArrowUpDown,
  Building2,
  CalendarClock,
  ChevronsUpDown,
  ExternalLink,
  FileDown,
  Home,
  KeyRound,
  Loader2,
  Search,
  SlidersHorizontal,
  Sparkles,
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
import { startCompareAction } from "@/app/actions/compare";
import {
  completeSavedAnalysisPdfExportAction,
  getSavedAnalysisPdfExportAction,
  getSavedDealForEditingAction,
  updateSavedDealLifecycleStateAction,
} from "@/app/actions/saved-analyses";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { StoredRiskLevel } from "@/lib/compare-metrics";
import { consumePendingSavedListSearch } from "@/lib/dashboard-saved-search-bridge";
import { Switch } from "../ui/switch";
import {
  investmentFormSchema,
  normalizeInvestmentFormSnapshot,
  type InvestmentFormValues,
} from "@/lib/investcalc-schema";
import { calculateAnalysis, type AnalysisResult } from "@/lib/calc-analysis";
import { generateInvestmentPDFBlob, type ReportData } from "@/lib/pdf-generator";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { ANALYSIS_PDF_BUCKET, PDF_SNAPSHOT_VERSION } from "@/lib/pdf-export-constants";
import {
  buildExitScenarios,
  resolveExitScenarioRates,
  type ExitScenarioYear,
} from "@/lib/exit-scenarios";
import { buildAutoVerdict } from "@/lib/verdict";

type SavedSignal = "strong-buy" | "buy" | "neutral" | "risky" | "avoid";
type SavedPropertyType = "single-family" | "multi-family" | "owner-occupant";
type SortField = "saved" | "cash-flow" | "coc" | "cap-rate" | "price";
type SortDirection = "asc" | "desc";
type DealStateFilter = "active" | "completed" | "archived" | "all";
const PAGE_SIZE = 7;
const SAVED_ANALYSIS_EDIT_DRAFT_KEY = "truecap_saved_analysis_edit_draft";

export type SavedAnalysisListItem = {
  id: string;
  address: string | null;
  title: string | null;
  propertyType: SavedPropertyType | null;
  purchasePrice: number | null;
  netCashFlowMonthly: number | null;
  cocReturnPct: number | null;
  capRatePct: number | null;
  score: number | null;
  recommendation: "Strong Buy" | "Buy" | "Neutral" | "Risky" | "Avoid";
  riskLevel: StoredRiskLevel;
  createdAt: string;
  status: "active" | "completed" | "archived";
};

const SIGNAL_LABELS: Record<SavedSignal, string> = {
  "strong-buy": "Strong Buy",
  buy: "Buy",
  neutral: "Neutral",
  risky: "Risky",
  avoid: "Avoid",
};

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
  if (signal === "strong-buy") return "bg-emerald-100 text-emerald-700 border-emerald-200";
  if (signal === "buy") return "bg-blue-100 text-blue-700 border-blue-200";
  if (signal === "neutral") return "bg-amber-100 text-amber-700 border-amber-200";
  if (signal === "risky") return "bg-orange-100 text-orange-700 border-orange-200";
  return "bg-red-100 text-red-700 border-red-200";
}

function getAddressParts(item: SavedAnalysisListItem): { main: string; secondary: string } {
  const source = item.address?.trim() || item.title?.trim() || "Untitled Property";
  const parts = source
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length <= 1) return { main: source, secondary: "Address details not available" };
  return { main: parts[0], secondary: parts.slice(1).join(", ") };
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
    return <Badge className="rounded-full border border-emerald-200 bg-emerald-100 text-emerald-700 text-[10px] font-semibold">Completed</Badge>;
  }
  if (item.status === "archived") {
    return <Badge className="rounded-full border border-slate-200 bg-slate-100 text-slate-700 text-[10px] font-semibold">Archived</Badge>;
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
  const score = numberFromSnapshot(result.score) ?? 0;
  const recommendation = stringFromSnapshot(result.recommendation) ?? "Neutral";
  const risk = stringFromSnapshot(result.riskLevel) ?? "Medium Risk";
  // Prefer the stored Pro Deal Score explanation; otherwise use the
  // shared auto-verdict generator so cash purchases (no debt service)
  // and other edge cases render the same as everywhere else in the app.
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
      propertyTaxPct: Number(values.propertyTaxPct ?? 0),
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

export function SavedAnalysesPage({
  initialItems,
  initialSelectedIds,
  activeSortField,
  activeSortDirection,
  activeDealStateFilter,
  canCompareDeals = false,
  canExportPdf = false,
}: {
  initialItems: SavedAnalysisListItem[];
  initialSelectedIds?: string[];
  activeSortField: SortField | null;
  activeSortDirection: SortDirection | null;
  activeDealStateFilter: DealStateFilter;
  canCompareDeals?: boolean;
  canExportPdf?: boolean;
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

  const [searchQuery, setSearchQuery] = useState("");
  const [showcompare, setShowcompare] = useState(false);
  const [selectedSignal, setSelectedSignal] = useState<"all" | SavedSignal>("all");
  const [selectedType, setSelectedType] = useState<"all" | SavedPropertyType>("all");
  const [currentPage, setCurrentPage] = useState(1);
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
          `${item.address ?? ""} ${item.title ?? ""} ${item.id} ${typeLabel} ${typeSlug}`.toLowerCase();
        const matchesSearch = text.includes(searchQuery.toLowerCase().trim());
        const matchesSignal = selectedSignal === "all" ? true : item.signal === selectedSignal;
        const matchesType = selectedType === "all" ? true : item.propertyType === selectedType;
        const matchshowcompare = showcompare ? selectedIds.includes(item.id) : true || false;
        return matchesSearch && matchesSignal && matchesType && matchshowcompare;
      }),
    [enrichedItems, searchQuery, selectedSignal, selectedType, selectedIds, showcompare]
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
    () => `${searchQuery}|${selectedSignal}|${selectedType}|${activeSortField ?? ""}|${activeSortDirection ?? ""}|${showcompare}`,
    [searchQuery, selectedSignal, selectedType, activeSortField, activeSortDirection, showcompare]
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [resetPageTriggerKey]);

  useEffect(() => {
    if (currentPage > pageCount) {
      setCurrentPage(pageCount);
    }
  }, [currentPage, pageCount]);

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

  const SavedMobileFilters = () => (
    <div className="space-y-3 xl:hidden">
      <div>
        <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Signal</p>
        <div className="flex flex-wrap gap-1.5">
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
        <div className="flex flex-wrap gap-1.5">
          <MobileFilterButton label="All Types" active={selectedType === "all"} onClick={() => setSelectedType("all")} />
          <MobileFilterButton label="Single Family" active={selectedType === "single-family"} onClick={() => setSelectedType("single-family")} />
          <MobileFilterButton label="Multi-Family" active={selectedType === "multi-family"} onClick={() => setSelectedType("multi-family")} />
          <MobileFilterButton label="Owner Occupant" active={selectedType === "owner-occupant"} onClick={() => setSelectedType("owner-occupant")} />
        </div>
      </div>

      <div>
        <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Status</p>
        <div className="flex flex-wrap gap-1.5">
          <MobileFilterButton label="Active" active={activeDealStateFilter === "active"} onClick={() => handleStateFilterChange("active")} />
          <MobileFilterButton label="Completed" active={activeDealStateFilter === "completed"} onClick={() => handleStateFilterChange("completed")} />
          <MobileFilterButton label="Archived" active={activeDealStateFilter === "archived"} onClick={() => handleStateFilterChange("archived")} />
          <MobileFilterButton label="All" active={activeDealStateFilter === "all"} onClick={() => handleStateFilterChange("all")} />
        </div>
      </div>

      <div className="flex items-center justify-between rounded-2xl bg-muted/40 px-3 py-2">
        <span className="text-xs font-semibold text-muted-foreground">Show selected</span>
        <Switch
          id="template-include-interest-deduction-mobile"
          checked={showcompare ?? false}
          disabled={!canCompareDeals}
          onCheckedChange={(value) => canCompareDeals && setShowcompare(value ?? false)}
          aria-label="Show selected analyses only"
        />
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

  const openSavedDealInAnalysisTab = async (id: string, targetWindow: Window | null) => {
    const result = await getSavedDealForEditingAction(id);
    if (!result.ok) {
      targetWindow?.close();
      toast({
        title: "Could not open saved deal",
        description: result.message,
        variant: "destructive",
      });
      return;
    }

    const payload = JSON.stringify({
      id: result.id,
      schemaVersion: result.schemaVersion,
      formSnapshot: result.formSnapshot,
      templateFallback: result.templateFallback,
      resultSnapshot: result.resultSnapshot,
    });
    window.localStorage.setItem(SAVED_ANALYSIS_EDIT_DRAFT_KEY, payload);
    window.sessionStorage.setItem(SAVED_ANALYSIS_EDIT_DRAFT_KEY, payload);
    if (targetWindow) {
      targetWindow.location.href = "/";
      return;
    }
    window.open("/", "_blank", "noopener,noreferrer");
  };

  const handleOpenSavedDeal = (id: string) => {
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
          openPdfUrl(exportResult.pdfUrl);
          return;
        }

        const normalized = normalizeInvestmentFormSnapshot(exportResult.formSnapshot);
        if (!normalized) {
          toast({
            title: "Could not export PDF",
            description: "The saved analysis data is not valid enough to generate a PDF.",
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
        const resultSnapshot = {
          ...computedResult,
          ...exportResult.resultSnapshot,
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
          cumulativeCashFlowByYear: projectionYears.map((row) => row.cumulativeCashFlowAnnual),
          cumulativeTaxBenefitByYear: taxYears.map((row) => row.cumulativeTaxBenefitAnnual),
        });
        const reportData = buildReportDataFromSavedSnapshot({
          values: parsed.data,
          result: resultSnapshot,
          templateFallback: exportResult.templateFallback,
          exitYears,
        });
        const pdfBlob = await generateInvestmentPDFBlob(reportData);
        const supabase = createBrowserSupabaseClient();
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();
        if (userError || !user) {
          toast({
            title: "Could not export PDF",
            description: "Please sign in again to upload the generated PDF.",
            variant: "destructive",
          });
          return;
        }

        const filePath = `${user.id}/${exportResult.id}/investment-analysis-v${PDF_SNAPSHOT_VERSION}.pdf`;
        const { error: uploadError } = await supabase.storage
          .from(ANALYSIS_PDF_BUCKET)
          .upload(filePath, pdfBlob, {
            contentType: "application/pdf",
            upsert: true,
          });

        if (uploadError) {
          toast({
            title: "Could not export PDF",
            description: uploadError.message,
            variant: "destructive",
          });
          return;
        }

        const { data: publicData } = supabase.storage
          .from(ANALYSIS_PDF_BUCKET)
          .getPublicUrl(filePath);
        const pdfUrl = publicData.publicUrl;
        const completeResult = await completeSavedAnalysisPdfExportAction(exportResult.id, pdfUrl);
        if (!completeResult.ok) {
          toast({
            title: "PDF generated, but cache was not saved",
            description: completeResult.message,
            variant: "warning",
          });
          openPdfUrl(pdfUrl);
          return;
        }

        openPdfUrl(completeResult.pdfUrl);
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
    <main className="min-h-[calc(100vh-5rem)] bg-muted/30 pb-12">
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
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">Saved Analyses</h1>
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
            <div className="flex flex-wrap items-center gap-1.5">
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

          <div className="hidden flex-wrap items-center gap-2 xl:flex">
            <Tabs value={selectedSignal} onValueChange={(value) => setSelectedSignal(value as "all" | SavedSignal)} className="gap-0">
              <TabsList className="bg-muted/60 h-9 rounded-full p-1">
                <TabsTrigger value="all" className="h-7 rounded-full px-3 text-xs data-[state=active]:bg-foreground data-[state=active]:text-background">All</TabsTrigger>
                {(Object.keys(SIGNAL_LABELS) as SavedSignal[]).map((signal) => (
                  <TabsTrigger key={signal} value={signal} className="h-7 rounded-full px-3 text-xs data-[state=active]:bg-foreground data-[state=active]:text-background">
                    {SIGNAL_LABELS[signal]}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            <Tabs value={selectedType} onValueChange={(value) => setSelectedType(value as "all" | SavedPropertyType)} className="gap-0">
              <TabsList className="bg-muted/60 h-9 rounded-full p-1">
                <TabsTrigger value="all" className="h-7 rounded-full px-3 text-xs data-[state=active]:bg-foreground data-[state=active]:text-background">All Types</TabsTrigger>
                <TabsTrigger value="single-family" className="h-7 rounded-full px-3 text-xs data-[state=active]:bg-foreground data-[state=active]:text-background">Single Family</TabsTrigger>
                <TabsTrigger value="multi-family" className="h-7 rounded-full px-3 text-xs data-[state=active]:bg-foreground data-[state=active]:text-background">Multi-Family</TabsTrigger>
                <TabsTrigger value="owner-occupant" className="h-7 rounded-full px-3 text-xs data-[state=active]:bg-foreground data-[state=active]:text-background">Owner Occupant</TabsTrigger>
              </TabsList>
            </Tabs>

            <Tabs value={activeDealStateFilter} onValueChange={(value) => handleStateFilterChange(value as DealStateFilter)} className="gap-0">
              <TabsList className="bg-muted/60 h-9 rounded-full p-1">
                <TabsTrigger value="active" className="h-7 rounded-full px-3 text-xs data-[state=active]:bg-foreground data-[state=active]:text-background">Active</TabsTrigger>
                <TabsTrigger value="completed" className="h-7 rounded-full px-3 text-xs data-[state=active]:bg-foreground data-[state=active]:text-background">Completed</TabsTrigger>
                <TabsTrigger value="archived" className="h-7 rounded-full px-3 text-xs data-[state=active]:bg-foreground data-[state=active]:text-background">Archived</TabsTrigger>
                <TabsTrigger value="all" className="h-7 rounded-full px-3 text-xs data-[state=active]:bg-foreground data-[state=active]:text-background">All</TabsTrigger>
              </TabsList>
            </Tabs>

           
           <div className="inline-flex items-center gap-1.5 ml-auto">
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground mr-1.5">Show selected</span>
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

        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="space-y-3 p-3 xl:hidden">
            {pagedItems.map((item) => {
              const address = getAddressParts(item);
              const isSelected = selectedIds.includes(item.id);
              const signal = item.signal;
              const PropertyTypeIcon = getTypeIcon(item.propertyType);
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
                      <button
                        type="button"
                        onClick={() => handleOpenSavedDeal(item.id)}
                        className="flex max-w-full items-center gap-2 text-left text-base font-bold leading-tight text-foreground hover:text-primary"
                      >
                        <span className="truncate">{address.main}</span>
                        {openingDealId === item.id ? (
                          <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-primary" />
                        ) : null}
                      </button>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        {getStatusBadge(item)}
                        <Badge className={cn("rounded-full border text-xs font-semibold", getSignalClasses(signal))}>{SIGNAL_LABELS[signal]}</Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{getTypeLabel(item.propertyType)}</p>
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
                      <p className={cn("mt-1 text-sm font-black", (item.netCashFlowMonthly ?? 0) >= 0 ? "text-emerald-700" : "text-[var(--metric-negative)]")}>
                        {toMonthCashFlow(item.netCashFlowMonthly)}
                      </p>
                    </div>
                    <div className="rounded-xl bg-muted/40 p-3">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">CoC</p>
                      <p className={cn("mt-1 text-sm font-black", (item.cocReturnPct ?? 0) >= 0 ? "text-emerald-700" : "text-[var(--metric-negative)]")}>
                        {toPercent(item.cocReturnPct)}
                      </p>
                    </div>
                    <div className="rounded-xl bg-muted/40 p-3">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Cap Rate</p>
                      <p className="mt-1 text-sm font-black text-foreground">{toPercent(item.capRatePct)}</p>
                    </div>
                    <div className="rounded-xl bg-muted/40 p-3">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Price</p>
                      <p className="mt-1 text-sm font-black text-foreground">{toCurrency(item.purchasePrice)}</p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3">
                    <Select
                      value={item.status}
                      onValueChange={(value) => handleDealStatusChange(item.id, value as SavedAnalysisListItem["status"])}
                      disabled={isUpdatingStatus && updatingDealStatusId === item.id}
                    >
                      <SelectTrigger className="h-10 w-full rounded-xl text-xs">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-10 rounded-xl px-2.5 text-xs"
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
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-10 rounded-xl px-2.5 text-xs"
                        onClick={() => handleExportPdfClick(item.id)}
                        disabled={exportingPdfDealId === item.id}
                        title={!canExportPdf ? "PDF export is not available for your current plan." : undefined}
                      >
                        {exportingPdfDealId === item.id ? (
                          <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                        ) : (
                          <FileDown className="w-3.5 h-3.5 mr-1" />
                        )}
                        PDF
                      </Button>
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
            <table className="w-full min-w-[980px] text-sm">
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
                  <th className="text-left text-xs uppercase tracking-wider text-muted-foreground font-bold">Status</th>
                  <th className="text-left text-xs uppercase tracking-wider text-muted-foreground font-bold">Actions</th>
                  <th className="text-left text-xs uppercase tracking-wider text-muted-foreground font-bold"><SortToggle field="saved" label="Saved" /></th>
                </tr>
              </thead>
              <tbody>
                {pagedItems.map((item) => {
                  const address = getAddressParts(item);
                  const isSelected = selectedIds.includes(item.id);
                  const signal = item.signal;
                  const PropertyTypeIcon = getTypeIcon(item.propertyType);
                  return (
                    <tr key={item.id} className={cn("h-[72px] border-b border-border/80 transition-colors", isSelected ? "bg-primary/5" : "hover:bg-muted/40")}>
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
                            <button
                              type="button"
                              onClick={() => handleOpenSavedDeal(item.id)}
                              className="flex max-w-full items-center gap-2 text-left font-semibold text-foreground hover:text-primary"
                            >
                              <span className="truncate">{address.main}</span>
                              {openingDealId === item.id ? (
                                <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-primary" />
                              ) : null}
                            </button>
                            {getStatusBadge(item)}
                            <p className="text-xs text-muted-foreground truncate">
                              {getTypeLabel(item.propertyType)}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="pr-2">
                        <Badge className={cn("rounded-full border text-xs font-semibold", getSignalClasses(signal))}>{SIGNAL_LABELS[signal]}</Badge>
                      </td>
                      <td className={cn("font-semibold", (item.netCashFlowMonthly ?? 0) >= 0 ? "text-emerald-700" : "text-[var(--metric-negative)]")}>{toMonthCashFlow(item.netCashFlowMonthly)}</td>
                      <td className={cn("font-semibold", (item.cocReturnPct ?? 0) >= 0 ? "text-emerald-700" : "text-[var(--metric-negative)]")}>{toPercent(item.cocReturnPct)}</td>
                      <td className="font-medium">{toPercent(item.capRatePct)}</td>
                      <td className="font-semibold text-foreground">{toCurrency(item.purchasePrice)}</td>
                      <td className="pr-2">
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
                      </td>
                      <td className="pr-2">
                        <div className="flex items-center gap-2">
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
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 rounded-md px-2.5 text-xs"
                            onClick={() => handleExportPdfClick(item.id)}
                            disabled={exportingPdfDealId === item.id}
                            title={!canExportPdf ? "PDF export is not available for your current plan." : undefined}
                          >
                            {exportingPdfDealId === item.id ? (
                              <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                            ) : (
                              <FileDown className="w-3.5 h-3.5 mr-1" />
                            )}
                            Export PDF
                          </Button>
                        </div>
                      </td>
                      <td className="text-muted-foreground">
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
              <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-muted">
                <Search className="w-5 h-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-semibold text-foreground">No saved analyses found</p>
              <p className="text-xs text-muted-foreground mt-1">Adjust your filters or save a new deal from the calculator.</p>
              <Button asChild className="rounded-full mt-4">
                <Link href="/">Back to calculator</Link>
              </Button>
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
    </main>
  );
}
