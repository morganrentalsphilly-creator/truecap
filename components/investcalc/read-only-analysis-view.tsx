"use client";

/**
 * Read-only analysis view rendered on the public /d/[encoded] share page.
 *
 * Shows the headline metric tiles, MAO card, sensitivity grid, and
 * Strategies tab content (rehab estimator, BRRRR, fix-and-flip). All
 * computed client-side from the encoded form snapshot — no auth, no
 * server actions needed.
 *
 * Hides the four Pro-gated tabs (10-year, tax strategy, exit scenarios,
 * deal score) — those become upgrade prompts on the parent page.
 */

import { cn } from "@/lib/utils";
import type { AnalysisResult } from "@/lib/calc-analysis";
import type { InvestmentFormValues } from "@/lib/investcalc-schema";
import { MaxOfferCard } from "@/components/investcalc/max-offer-card";
import { SensitivityGrid } from "@/components/investcalc/sensitivity-grid";
import { StrategiesPanel } from "@/components/investcalc/strategies-panel";

interface ReadOnlyAnalysisViewProps {
  values: InvestmentFormValues;
  result: AnalysisResult;
}

const fmtCash = (n: number) =>
  `${n < 0 ? "-" : ""}$${Math.abs(Math.round(n)).toLocaleString("en-US")}`;
const fmtPct = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;

function MetricTile({
  label,
  value,
  sub,
  positive,
  negative,
}: {
  label: string;
  value: string;
  sub?: string;
  positive?: boolean;
  negative?: boolean;
}) {
  return (
    <div className="bg-card rounded-2xl border border-border p-3 sm:p-5 flex flex-col gap-1">
      <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-muted-foreground leading-tight">
        {label}
      </span>
      <span
        className={cn(
          "text-xl sm:text-2xl font-bold tabular-nums",
          positive && "text-[var(--metric-positive)]",
          negative && "text-[var(--metric-negative)]",
          !positive && !negative && "text-foreground"
        )}
      >
        {value}
      </span>
      {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
    </div>
  );
}

export function ReadOnlyAnalysisView({ values, result }: ReadOnlyAnalysisViewProps) {
  return (
    <div className="space-y-5">
      {/* Headline metric tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2 sm:gap-3">
        <MetricTile
          label="Monthly Cash Flow"
          value={fmtCash(result.netCashFlow)}
          positive={result.netCashFlow >= 0}
          negative={result.netCashFlow < 0}
        />
        <MetricTile
          label="CoC Return"
          value={fmtPct(result.cocReturn)}
          positive={result.cocReturn >= 0}
          negative={result.cocReturn < 0}
        />
        <MetricTile
          label="Cap Rate"
          value={fmtPct(result.capRate)}
          positive={result.capRate >= 0}
        />
        <MetricTile
          label="DSCR"
          // Cash purchases have no debt service so DSCR is undefined.
          // calc-analysis returns 0 in that case — surface a clear sub
          // rather than a misleading "Underwater" badge.
          value={result.monthlyPayment <= 0 ? "—" : result.dscr.toFixed(2)}
          sub={
            result.monthlyPayment <= 0
              ? "Cash purchase"
              : result.dscr >= 1.25
              ? "Bankable (≥1.25)"
              : result.dscr >= 1.0
              ? "Tight (≥1.0)"
              : "Underwater"
          }
          positive={result.monthlyPayment > 0 && result.dscr >= 1.25}
          negative={result.monthlyPayment > 0 && result.dscr < 1.25}
        />
        <MetricTile
          label="Est. Tax Savings"
          value={fmtCash(result.taxSavingsMonthly)}
          sub="/month"
        />
        <MetricTile
          label="After-Tax CF"
          value={fmtCash(result.afterTaxCF)}
          sub="/month"
        />
      </div>

      <MaxOfferCard values={values} />
      <SensitivityGrid values={values} />

      {/* Strategies section — embedded inline rather than in a tab so the
          read-only viewer doesn't have hidden content. */}
      <div className="bg-card rounded-2xl border border-border shadow-sm">
        <div className="border-b border-border px-5 py-3">
          <h2 className="text-sm font-semibold text-foreground">
            Strategy calculators
          </h2>
        </div>
        <StrategiesPanel values={values} result={result} />
      </div>
    </div>
  );
}
