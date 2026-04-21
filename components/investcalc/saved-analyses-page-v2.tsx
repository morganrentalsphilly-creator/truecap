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
  ChevronsUpDown,
  Home,
  KeyRound,
  Search,
  SlidersHorizontal,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Trophy,
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
import { startCompareAction } from "@/app/actions/compare";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { FormField } from "../ui/form";
import { Switch } from "../ui/switch";

type SavedSignal = "strong-buy" | "buy" | "neutral" | "risky" | "avoid";
type SavedPropertyType = "single-family" | "multi-family" | "owner-occupant";
type SortField = "saved" | "cash-flow" | "coc" | "cap-rate" | "price";
type SortDirection = "asc" | "desc";
const PAGE_SIZE = 7;

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
  riskLevel: "Low Risk" | "Medium Risk" | "High Risk";
  createdAt: string;
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

export function SavedAnalysesPage({
  initialItems,
  initialSelectedIds,
  activeSortField,
  activeSortDirection,
}: {
  initialItems: SavedAnalysisListItem[];
  initialSelectedIds?: string[];
  activeSortField: SortField | null;
  activeSortDirection: SortDirection | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [isStartingCompare, startCompareTransition] = useTransition();

  const [searchQuery, setSearchQuery] = useState("");
  const [showcompare, setShowcompare] = useState(false);
  const [selectedSignal, setSelectedSignal] = useState<"all" | SavedSignal>("all");
  const [selectedType, setSelectedType] = useState<"all" | SavedPropertyType>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const initialItemIds = useMemo(() => new Set(initialItems.map((item) => item.id)), [initialItems]);
  const [selectedIds, setSelectedIds] = useState<string[]>(() =>
    (initialSelectedIds ?? []).filter((id) => initialItemIds.has(id)).slice(0, 4)
  );

  const enrichedItems = useMemo(
    () =>
      initialItems.map((item) => ({
        ...item,
        signal: recommendationToSavedSignal(item.recommendation),
      })),
    [initialItems]
  );

  const filteredItems = useMemo(
    () =>
      enrichedItems.filter((item) => {
        const text = `${item.address ?? ""} ${item.title ?? ""}`.toLowerCase();
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

  const summary = useMemo(() => {
    const totalDeals = filteredItems.length;
    const positiveCount = filteredItems.filter((item) => (item.netCashFlowMonthly ?? 0) > 0).length;
    const monthlyCashFlow = filteredItems.reduce((sum, item) => sum + (item.netCashFlowMonthly ?? 0), 0);
    const avgCoc =
      filteredItems.length > 0
        ? filteredItems.reduce((sum, item) => sum + (item.cocReturnPct ?? 0), 0) / filteredItems.length
        : 0;
    const totalInvested = filteredItems.reduce((sum, item) => sum + (item.purchasePrice ?? 0), 0);
    return { totalDeals, positiveCount, monthlyCashFlow, avgCoc, totalInvested };
  }, [filteredItems]);

  const handleSort = (field: SortField) => {
    const nextDirection: SortDirection =
      activeSortField !== field ? "asc" : activeSortDirection === "asc" ? "desc" : "asc";
    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", field);
    params.set("dir", nextDirection);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
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
      router.push("/compare");
    });
  };

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((current) => current !== id);
      if (prev.length >= 4) {
        showCompareLimit();
        return prev;
      }
      return [...prev, id];
    });
  };

  const toggleAllVisible = () => {
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
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 space-y-6">
      <div className="mb-6 flex flex-wrap items-center gap-3">
          <Button variant="ghost" size="sm" className="mt-1 px-1.5 text-muted-foreground" asChild>
            <Link href="/">
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Back
            </Link>
          </Button>
          <div className="h-6 w-px bg-border" />
          <div className="space-y-1">
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">Saved Analyses</h1>
            <p className="text-sm text-muted-foreground">{summary.totalDeals} deals in your portfolio</p>
          </div>
        </div>


         {/* Portfolio summary strip */}
         <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              label: "Total Deals",
              value: summary.totalDeals,
              sub: `${summary.positiveCount} positive CF`,
              icon: Building2,
              color: "text-primary",
              bg: "bg-primary/8",
            },
            {
              label: "Monthly Cash Flow",
              value: `${summary.monthlyCashFlow >= 0 ? "+" : ""}$${toCurrency(summary.monthlyCashFlow)}`,
              sub: "across all deals",
              icon: summary.monthlyCashFlow >= 0 ? TrendingUp : TrendingDown,
              color: summary.monthlyCashFlow >= 0 ? "text-[var(--brand-green)]" : "text-destructive",
              bg: summary.monthlyCashFlow >= 0 ? "bg-[var(--brand-green-light)]" : "bg-destructive/8",
            },
            {
              label: "Avg CoC Return",
              value: `${summary.avgCoc.toFixed(1)}%`,
              sub: "cash-on-cash",
              icon: TrendingUp,
              color: "text-[oklch(0.52_0.18_220)]",
              bg: "bg-[oklch(0.95_0.04_220)]",
            },
            {
              label: "Total Invested",
              value: toCurrency(summary.totalInvested),
              sub: "total cash deployed",
              icon: Trophy,
              color: "text-[var(--brand-orange)]",
              bg: "bg-[var(--brand-orange-light)]",
            },
          ].map((s) => (
            <div key={s.label} className="bg-card rounded-2xl border border-border/70 p-4 flex items-start gap-3">
              <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center shrink-0", s.bg)}>
                <s.icon className={cn("w-4 h-4", s.color)} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{s.label}</p>
                <p className={cn("text-[18px] font-black leading-tight mt-0.5", s.color)}>{s.value}</p>
                <p className="text-[11px] text-muted-foreground/60 mt-0.5">{s.sub}</p>
              </div>
            </div>
          ))}
        </div>

    

        <div className="rounded-2xl border border-border bg-card p-3 sm:p-4 space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-xl">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Search by address..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="pl-9 h-10 rounded-xl bg-muted/60 border-border"
              />
            </div>
            <div className="flex items-center flex-wrap gap-1.5">
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground mr-1.5">
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

          <div className="flex flex-wrap items-center gap-2">
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

           
           <div className="inline-flex items-center gap-1.5 ml-auto">
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground mr-1.5">Show Compare</span>
            <Switch
              id="template-include-interest-deduction"
              checked={showcompare ?? false}
              onCheckedChange={(value)=> setShowcompare(value ?? false)}
              aria-label="Include interest deduction in template tax assumptions"
            />
          </div>

          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead className="bg-muted/40 border-b border-border">
                <tr className="h-12">
                  <th className="w-10 px-3">
                    <input type="checkbox" checked={allVisibleSelected} onChange={toggleAllVisible} aria-label="Select all visible analyses" className="h-4 w-4 rounded border-border" />
                  </th>
                  <th className="text-left text-xs uppercase tracking-wider text-muted-foreground font-bold">Property</th>
                  <th className="text-left text-xs uppercase tracking-wider text-muted-foreground font-bold">Signal</th>
                  <th className="text-left text-xs uppercase tracking-wider text-muted-foreground font-bold"><SortToggle field="cash-flow" label="Cash Flow" /></th>
                  <th className="text-left text-xs uppercase tracking-wider text-muted-foreground font-bold"><SortToggle field="coc" label="CoC" /></th>
                  <th className="text-left text-xs uppercase tracking-wider text-muted-foreground font-bold"><SortToggle field="cap-rate" label="Cap Rate" /></th>
                  <th className="text-left text-xs uppercase tracking-wider text-muted-foreground font-bold"><SortToggle field="price" label="Price" /></th>
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
                        <input type="checkbox" checked={isSelected} onChange={() => toggleOne(item.id)} aria-label={`Select analysis ${address.main}`} className="h-4 w-4 rounded border-border" />
                      </td>
                      <td className="pr-2">
                        <div className="flex items-start gap-2">
                          <span className="mt-0.5 inline-flex size-7 rounded-full bg-primary/10 text-primary items-center justify-center shrink-0">
                            <PropertyTypeIcon className="w-3.5 h-3.5" />
                          </span>
                          <div className="min-w-0">
                            <p className="font-semibold text-foreground truncate">{address.main}</p>
                            <p className="text-xs text-muted-foreground truncate">{getTypeLabel(item.propertyType)}</p>
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
                      <td className="text-muted-foreground">
                        {new Date(item.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
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
              disabled={selectedIds.length < 1 || isStartingCompare}
              onClick={handleCompareSelected}
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
