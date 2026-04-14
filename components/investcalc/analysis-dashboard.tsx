"use client";

import { useState } from "react";
import {
  Lock,
  TrendingUp,
  CheckCircle2,
  ArrowUpRight,
  Building2,
  Download,
  Share2,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AnalysisResult, getRecommendation } from "@/lib/calc-analysis";
import { cn } from "@/lib/utils";

interface AnalysisDashboardProps {
  result: AnalysisResult | null;
  isLoading: boolean;
  propertyType: "single-family" | "multi-family" | "house-hack";
  onSaveDeal: () => void | Promise<void>;
  onExportPdf: () => void | Promise<void>;
  isSaving?: boolean;
  isExporting?: boolean;
}

type Tab = "cash-flow" | "projections" | "tax-strategy" | "exit-scenarios";

const TABS: { id: Tab; label: string; isPro: boolean }[] = [
  { id: "cash-flow", label: "Cash Flow", isPro: false },
  { id: "projections", label: "10-Year Projections", isPro: true },
  { id: "tax-strategy", label: "Tax Strategy", isPro: true },
  { id: "exit-scenarios", label: "Exit Scenarios", isPro: true },
];

function fmt(n: number) {
  return `$${Math.abs(n).toLocaleString()}`;
}

function MetricCard({
  label,
  value,
  sub,
  color,
  isLoading,
}: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
  isLoading: boolean;
}) {
  return (
    <div className="bg-card rounded-2xl border border-border p-3 sm:p-5 flex flex-col gap-1">
      <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-muted-foreground leading-tight">
        {label}
      </span>
      {isLoading ? (
        <Skeleton className="h-7 sm:h-8 w-20 sm:w-24 mt-1" />
      ) : (
        <span className={cn("text-xl sm:text-2xl font-bold", color ?? "text-foreground")}>
          {value}
        </span>
      )}
      {sub && !isLoading && (
        <span className="text-xs text-muted-foreground">{sub}</span>
      )}
    </div>
  );
}

export function AnalysisDashboard({
  result,
  isLoading,
  propertyType,
  onSaveDeal,
  onExportPdf,
  isSaving = false,
  isExporting = false,
}: AnalysisDashboardProps) {
  const [activeTab, setActiveTab] = useState<Tab>("cash-flow");

  const recommendation = result ? getRecommendation(result) : null;

  const labelMap: Record<string, string> = {
    "single-family": "Single Family",
    "multi-family": "Multi-Family",
    "house-hack": "House Hack",
  };

  return (
    <div className="space-y-6">
      {/* Action bar */}
      <div className="flex items-center justify-between flex-wrap gap-2 sm:gap-3">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-primary" />
          <span className="font-semibold text-foreground">
            {labelMap[propertyType]}
          </span>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void onSaveDeal()}
            disabled={isSaving}
            className="rounded-full text-xs sm:text-sm h-8 sm:h-9 px-3 sm:px-4"
          >
            {isSaving ? (
              <Loader2 className="w-3.5 h-3.5 mr-1 sm:mr-1.5 animate-spin" />
            ) : (
              <Share2 className="w-3.5 h-3.5 mr-1 sm:mr-1.5" />
            )}
            <span className="hidden xs:inline">Sign In to </span>Save
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="rounded-full text-xs sm:text-sm h-8 sm:h-9 px-3 sm:px-4 hidden sm:flex"
            onClick={() => void onExportPdf()}
            disabled={isExporting}
          >
            {isExporting ? (
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            ) : (
              <TrendingUp className="w-3.5 h-3.5 mr-1.5" />
            )}
            Compare Deals
          </Button>
          <Button
            size="sm"
            className="rounded-full bg-primary text-primary-foreground text-xs sm:text-sm font-semibold h-8 sm:h-9 px-3 sm:px-4"
            onClick={() => void onExportPdf()}
            disabled={isExporting}
          >
            {isExporting ? (
              <Loader2 className="w-3.5 h-3.5 mr-1 sm:mr-1.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5 mr-1 sm:mr-1.5" />
            )}
            Export PDF
          </Button>
        </div>
      </div>

      {/* Recommendation + Pro Feature row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
        {/* Pro Feature card */}
        <div className="bg-card rounded-2xl border border-border p-4 sm:p-6 flex flex-col items-center justify-center text-center">
          {isLoading ? (
            <div className="space-y-3 w-full">
              <Skeleton className="h-16 w-16 rounded-full mx-auto" />
              <Skeleton className="h-4 w-32 mx-auto" />
              <Skeleton className="h-4 w-24 mx-auto" />
            </div>
          ) : (
            <>
              <Lock className="w-10 h-10 text-muted-foreground mb-3" />
              <p className="font-semibold text-foreground mb-1">Pro Feature</p>
              <p className="text-xs text-muted-foreground mb-4">
                Sign in to see Deal Score
              </p>
              <Button
                size="sm"
                className="bg-primary text-primary-foreground rounded-full font-semibold text-sm"
                onClick={() => void onSaveDeal()}
                disabled={isSaving}
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Sign In / Sign Up"
                )}
              </Button>
            </>
          )}
        </div>

        {/* Recommendation card */}
        <div
          className={cn(
            "md:col-span-2 rounded-2xl border p-4 sm:p-6",
            recommendation?.variant === "strong-buy" &&
              "bg-[var(--brand-green-light)] border-[var(--brand-green)]/25",
            recommendation?.variant === "buy" && "bg-[var(--brand-blue-light)] border-primary/20",
            recommendation?.variant === "neutral" && "bg-muted border-border",
            recommendation?.variant === "avoid" && "bg-red-50 border-red-200",
            !recommendation && "bg-muted border-border"
          )}
        >
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ) : recommendation ? (
            <>
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">
                Recommendation
              </p>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-[var(--brand-green)] rounded-2xl flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-foreground">
                  {recommendation.label}
                </h2>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                {recommendation.description}
              </p>
              {recommendation.tips.length > 0 && (
                <>
                  <p className="text-xs font-bold uppercase tracking-widest text-[var(--brand-green)] mb-2">
                    Optimization Tips
                  </p>
                  <ul className="space-y-1">
                    {recommendation.tips.map((tip, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                        <ArrowUpRight className="w-3.5 h-3.5 text-[var(--brand-green)] shrink-0 mt-0.5" />
                        {tip}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center h-24 text-sm text-muted-foreground">
              Fill in the form and click Calculate to see your analysis.
            </div>
          )}
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
        <MetricCard
          label="Monthly Cash Flow"
          value={result ? (result.netCashFlow >= 0 ? fmt(result.netCashFlow) : `-${fmt(result.netCashFlow)}`) : "—"}
          color={result ? (result.netCashFlow >= 0 ? "text-[var(--metric-positive)]" : "text-[var(--metric-negative)]") : undefined}
          isLoading={isLoading}
        />
        <MetricCard
          label="CoC Return"
          value={result ? `${result.cocReturn >= 0 ? "+" : ""}${result.cocReturn.toFixed(1)}%` : "—"}
          color={result ? (result.cocReturn >= 0 ? "text-[var(--metric-positive)]" : "text-[var(--metric-negative)]") : undefined}
          isLoading={isLoading}
        />
        <MetricCard
          label="Cap Rate"
          value={result ? `+${result.capRate.toFixed(1)}%` : "—"}
          color="text-[var(--metric-positive)]"
          isLoading={isLoading}
        />
        <MetricCard
          label="DSCR"
          value={result ? result.dscr.toFixed(2) : "—"}
          color={result ? (result.dscr >= 1.25 ? "text-[var(--metric-positive)]" : "text-[var(--metric-negative)]") : undefined}
          isLoading={isLoading}
        />
        <MetricCard
          label="Tax Savings"
          value={result ? fmt(result.taxSavingsMonthly) : "—"}
          sub="/month"
          color="text-primary"
          isLoading={isLoading}
        />
        <MetricCard
          label="After-Tax CF"
          value={result ? fmt(result.afterTaxCF) : "—"}
          sub="/month"
          color="text-primary"
          isLoading={isLoading}
        />
      </div>

      {/* Analysis tabs */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        {/* Tab bar */}
        <div className="flex border-b border-border overflow-x-auto scrollbar-none">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-3 sm:py-3.5 text-xs sm:text-sm font-medium whitespace-nowrap transition-colors shrink-0",
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              {tab.label}
              {tab.isPro && (
                <span className="text-[9px] sm:text-[10px] font-bold bg-[var(--brand-orange)] text-white px-1 sm:px-1.5 py-0.5 rounded-full uppercase">
                  PRO
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="p-4 sm:p-6">
          {activeTab === "cash-flow" && (
            <CashFlowTab result={result} isLoading={isLoading} />
          )}
          {activeTab !== "cash-flow" && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Lock className="w-10 h-10 text-muted-foreground mb-3" />
              <h3 className="font-semibold text-foreground mb-1">Pro Feature</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Sign in to unlock {TABS.find((t) => t.id === activeTab)?.label}
              </p>
              <Button className="bg-primary text-primary-foreground rounded-full font-semibold">
                Sign Up Free
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CashFlowTab({
  result,
  isLoading,
}: {
  result: AnalysisResult | null;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
        {[0, 1, 2].map((i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="h-4 w-32" />
            {[0, 1, 2, 3].map((j) => (
              <div key={j} className="flex justify-between">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (!result) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
        Submit the form to see your cash flow analysis.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
      {/* Monthly income */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-[var(--metric-positive)]" />
          <span className="text-xs font-bold uppercase tracking-widest text-foreground">
            Monthly Income
          </span>
        </div>
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Rental Income</span>
            <span className="font-medium text-foreground">
              ${result.monthlyRentalIncome.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between text-sm border-t border-border pt-2">
            <span className="font-semibold text-foreground">Total</span>
            <span className="font-bold text-[var(--metric-positive)]">
              ${result.monthlyRentalIncome.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Operating expenses */}
      <div>
        <div className="mb-4">
          <span className="text-xs font-bold uppercase tracking-widest text-foreground">
            Operating Expenses
          </span>
        </div>
        <div className="space-y-2">
          {[
            { label: "Property Tax", value: result.propertyTax },
            { label: "Insurance", value: result.insurance },
            { label: "HOA", value: result.hoa },
            { label: "Utilities", value: result.utilities },
            { label: "Maintenance", value: result.maintenance },
            { label: "Vacancy", value: result.vacancy },
            { label: "Management", value: result.management },
            { label: "CapEx", value: result.capex },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between text-sm">
              <span className="text-muted-foreground">{label}</span>
              <span className="font-medium text-foreground">
                ${value.toLocaleString()}
              </span>
            </div>
          ))}
          <div className="flex justify-between text-sm border-t border-border pt-2">
            <span className="font-semibold text-foreground">Total</span>
            <span className="font-bold text-[var(--metric-negative)]">
              ${result.totalOperatingExpenses.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Debt service */}
      <div>
        <div className="mb-4">
          <span className="text-xs font-bold uppercase tracking-widest text-foreground">
            Debt Service
          </span>
        </div>
        <div className="space-y-4">
          <div className="bg-[var(--brand-blue-light)] rounded-xl p-4">
            <p className="text-xs text-muted-foreground mb-1">Loan Amount</p>
            <p className="text-xl font-bold text-foreground">
              ${result.loanAmount.toLocaleString()}
            </p>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Monthly Payment</span>
            <span className="font-medium text-foreground">
              ${result.monthlyPayment.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between text-sm border-t border-border pt-2">
            <span className="font-bold text-foreground">Net Cash Flow</span>
            <span
              className={cn(
                "font-bold text-lg",
                result.netCashFlow >= 0
                  ? "text-[var(--metric-positive)]"
                  : "text-[var(--metric-negative)]"
              )}
            >
              {result.netCashFlow >= 0 ? "" : "-"}$
              {Math.abs(result.netCashFlow).toLocaleString()}
            </span>
          </div>
        </div>

        {/* Total cash required */}
        <div className="mt-6 pt-5 border-t border-border">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">
            Total Cash Required
          </p>
          <div className="flex justify-between text-sm mb-1">
            <div>
              <p className="text-muted-foreground">Down Payment</p>
              <p className="text-xs text-muted-foreground">20%</p>
            </div>
            <span className="font-semibold text-foreground">
              ${result.downPayment.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between text-sm mb-3">
            <div>
              <p className="text-muted-foreground">Closing Costs</p>
              <p className="text-xs text-muted-foreground">3%</p>
            </div>
            <span className="font-semibold text-foreground">
              ${result.closingCosts.toLocaleString()}
            </span>
          </div>
          <div className="bg-primary rounded-xl p-4 flex justify-between items-center">
            <p className="text-sm font-semibold text-primary-foreground">
              Total Investment
            </p>
            <p className="text-xl font-black text-primary-foreground">
              ${result.totalCashRequired.toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
