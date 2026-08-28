"use client";

/**
 * "How the ROI is built" - makes a big cumulative 10-yr ROI legible by showing
 * the cash invested, total profit, equity multiple, and a true IRR, plus the
 * assumptions behind it. Pure presentation over the exit-scenario series.
 */

import type { ExitScenarioYear } from "@/lib/exit-scenarios";
import { computeReturnSummaryFromExitYears } from "@/lib/returns";
import { isExtremeCumulativeRoi } from "@/lib/extreme-value-format";
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
        <Stat label="Contributed capital" value={formatCurrency(s.totalContributions)} />
        <Stat label={`${s.years}-yr profit`} value={formatCurrency(s.totalProfit)} />
        <Stat label="Equity multiple" value={fmtX(s.equityMultiple)} />
        <Stat label="IRR" value={fmtPct(s.irrPct)} />
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
        {s.roiPct != null ? (
          <>
            {s.years}-yr ROI <strong className="text-foreground">{fmtPct(s.roiPct)}</strong> is{" "}
            <em>cumulative</em> (net profit ÷ all contributed capital), not annual.{" "}
            {s.cagrStatus === "available" ? (
              <>
                With all capital contributed at acquisition, the equivalent CAGR is{" "}
                <strong className="text-foreground">{fmtPct(s.cagrPct)}</strong>.{" "}
              </>
            ) : s.cagrStatus === "later-contributions" ? (
              <>
                CAGR is not applicable because the model requires additional capital after acquisition.{" "}
              </>
            ) : null}
            {/* Finding 5: this explainer is where the raw figure lives in
                full — when it crossed the sanity band, say so here too. */}
            {isExtremeCumulativeRoi(s.roiPct) ? (
              <>A total this high is unusual - double-check rent, price, and appreciation before trusting it.{" "}</>
            ) : null}
          </>
        ) : null}
        {s.irrStatus === "multiple" ? (
          <>
            This cash-flow pattern has multiple valid IRRs ({s.irrRootsPct.map((root) => fmtPct(root)).join(", ")}); no single IRR is decision-safe.{" "}
          </>
        ) : null}
        Profit = positive operating/tax distributions + net sale proceeds − all capital contributions −{" "}
        <strong className="text-foreground">est. exit tax {formatCurrency(s.exitTax)}</strong>{" "}
        (depreciation recapture + capital gains). Assumptions: {appreciationRate}% appreciation,{" "}
        {sellingCostPct}% selling cost, 25%/15% exit-tax rates, {s.years}-yr hold - all estimates.
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
