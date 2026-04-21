"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  Home,
  Info,
  KeyRound,
  ListTree,
  Plus,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";
import { removeCompareDealAction } from "@/app/actions/compare";
import type { DealAssumptions } from "@/lib/compare-assumptions";
import {
  METRIC_ROWS,
  SIGNAL_LABELS,
  formatCurrency,
  formatMetric,
  getBadgeClasses,
  getBestValue,
  getTypeLabel,
  getWins,
  type MetricRow,
  type PropertyType,
  type Signal,
  type StoredRecommendation,
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
  propertyType: PropertyType | null;
  purchasePrice: number | null;
  score: number | null;
  recommendation: StoredRecommendation | null;
  riskLevel: "Low Risk" | "Medium Risk" | "High Risk" | null;
  scoringComplete: boolean;
  metrics: Record<string, number | null>;
  signal: Signal | null;
  assumptions: DealAssumptions;
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
          <li>Insurance (monthly $): {formatCurrency(expenses.insuranceMonthly)}</li>
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
      <p className="font-semibold text-foreground">How this payment is modeled</p>
      <p className="text-muted-foreground">
        From saved financing: {fmtPct(financing.interestRatePct)} interest,{" "}
        {financing.loanTermYears != null ? `${financing.loanTermYears}-year` : "—"} term,{" "}
        {fmtPct(financing.downPaymentPct)} down on {formatCurrency(deal.purchasePrice)}.
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
        Rent {formatCurrency(rent)} − Operating expenses {formatCurrency(opex)} − Mortgage{" "}
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
        Debt service (mortgage) = {formatCurrency(pmt)}. Ratio (NOI ÷ payment) ≈{" "}
        {dscr == null ? "—" : dscr.toFixed(2)}.
      </p>
    </div>
  );
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
  bestDealId,
}: {
  deals: CompareDealViewModel[];
  bestDealId: string | undefined;
}) {
  return (
    <main className="min-h-[calc(100vh-5rem)] bg-muted/30 px-4 py-6 text-foreground sm:px-6 sm:py-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <Button variant="ghost" size="sm" className="px-1.5 text-muted-foreground hover:text-foreground" asChild>
              <Link href="/saved-analyses">
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
              return (
                <div
                  key={deal.id}
                  className={cn(
                    "relative min-h-36 rounded-2xl border p-5 ring-2 ring-transparent",
                    typeClasses,
                    deal.id === bestDealId && "ring-emerald-300"
                  )}
                >
                  {deal.id === bestDealId && (
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
                  <div className="mt-3 flex flex-wrap items-center gap-2">
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
                    
                  <span className="text-sm font-medium text-muted-foreground">{getWins(deal, deals)} wins</span>

                  <Popover>
                    <Tooltip delayDuration={200}>
                      <TooltipTrigger asChild>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon-sm"
                            className="!px-2 !py-1 h-8 ml-auto gap-1.5 text-xs font-semibold"
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
                href="/saved-analyses"
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
              Hover dotted values (Net cash flow, Monthly mortgage, DSCR) for a quick breakdown. Use each deal&apos;s{" "}
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
          </div>
        </div>
      </main>
  );
}
