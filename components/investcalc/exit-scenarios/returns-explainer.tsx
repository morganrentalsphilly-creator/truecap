"use client";

/**
 * "How the ROI is built" - makes a big cumulative 10-yr ROI legible by showing
 * the cash invested, total profit, equity multiple, and a true IRR, plus the
 * assumptions behind it. Pure presentation over the exit-scenario series.
 */

import type { ExitScenarioYear } from "@/lib/exit-scenarios";
import { computeReturnSummaryFromExitYears } from "@/lib/returns";
import { formatCurrency } from "@/components/investcalc/analysis-panels/shared/formatters";

const fmtPct = (v: number | null): string => (v == null ? "—" : `${v.toFixed(1)}%`);
const fmtX = (v: number | null): string => (v == null ? "—" : `${v.toFixed(2)}×`);

export function ReturnsExplainer({
  years,
  appreciationRate,
  sellingCostPct,
}: {
  years: ExitScenarioYear[];
  appreciationRate: number;
  sellingCostPct: number;
}) {
  const s = computeReturnSummaryFromExitYears(years);
  if (!s) return null;

  return (
    <div className="rounded-2xl border border-border bg-card/60 p-4 sm:p-5">
      <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
        How the {s.years}-yr ROI is built
      </p>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Cash invested" value={formatCurrency(s.cashInvested)} />
        <Stat label={`${s.years}-yr profit`} value={formatCurrency(s.totalProfit)} />
        <Stat label="Equity multiple" value={fmtX(s.equityMultiple)} />
        <Stat label="IRR" value={fmtPct(s.irrPct)} />
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
        {s.roiPct != null ? (
          <>
            {s.years}-yr ROI <strong className="text-foreground">{fmtPct(s.roiPct)}</strong> is{" "}
            <em>cumulative</em> (total profit ÷ cash invested), not annual - annualized that&apos;s a{" "}
            <strong className="text-foreground">{fmtPct(s.cagrPct)}</strong> CAGR.{" "}
          </>
        ) : null}
        Profit = net sale proceeds + cumulative cash flow + tax benefit − cash invested. Assumptions:{" "}
        {appreciationRate}% appreciation, {sellingCostPct}% selling cost, {s.years}-yr hold - all editable.
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-base font-extrabold tabular-nums text-foreground">{value}</div>
    </div>
  );
}
