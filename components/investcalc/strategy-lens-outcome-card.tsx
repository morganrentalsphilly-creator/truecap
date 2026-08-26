"use client";

import { Target } from "lucide-react";
import type { AnalysisResult } from "@/lib/calc-analysis";
import type { DealStrategy } from "@/lib/deal-score";
import {
  buildStrategyLensOutcome,
  type LensMetricTone,
} from "@/lib/strategy-lens-outcome";
import { cn } from "@/lib/utils";

/**
 * Strategy-lens outcome strip — renders under the verdict row when the user
 * has actively picked an investor lens (Cash flow / Appreciation), naming the
 * metrics that carry the deal for that investor type and how this deal does
 * on them. Balanced (the default) renders nothing, so the strip is invisible
 * until the lens is actually used. All wording/bands come from the pure
 * lib/strategy-lens-outcome module (display-only, tested); this component is
 * just markup.
 */
export function StrategyLensOutcomeCard({
  strategy,
  result,
  annualizedReturnPct,
  isOwnerOccupant,
}: {
  strategy: DealStrategy;
  /** BASE analysis result (not the what-if sliders) — matches the verdict. */
  result: AnalysisResult;
  /** 10-yr annualized total return (%); null when projections unavailable. */
  annualizedReturnPct: number | null;
  isOwnerOccupant?: boolean;
}) {
  const outcome = buildStrategyLensOutcome(strategy, {
    netCashFlow: result.netCashFlow,
    cocReturn: result.cocReturn,
    cashOnCashApplicable: result.totalCashRequired > 0,
    dscr: result.dscr,
    capRate: result.capRate,
    afterTaxCF: result.afterTaxCF,
    monthlyPayment: result.monthlyPayment,
    annualizedReturnPct,
    isOwnerOccupant,
  });
  if (!outcome) return null;

  const toneClass: Record<LensMetricTone, string> = {
    good: "text-[var(--metric-positive)]",
    neutral: "text-foreground",
    bad: "text-[var(--metric-negative)]",
  };

  return (
    // Neutral chrome (not the blue tint): the blue treatment is reserved
    // for the interactive what-if affordance so exactly one element pops.
    <div className="rounded-2xl border border-border bg-muted/30 px-4 py-3 sm:px-5">
      <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-foreground/80">
        <Target aria-hidden className="size-3.5 shrink-0 text-primary" />
        {outcome.headline}
      </p>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 pl-5">
        {outcome.metrics.map((m) => (
          <span key={m.label} className="text-sm text-foreground">
            <span className="font-semibold">{m.label}</span>{" "}
            <span className={cn("font-bold tabular-nums", toneClass[m.tone])}>
              {m.value}
            </span>{" "}
            <span className="text-muted-foreground">({m.band})</span>
          </span>
        ))}
      </div>
    </div>
  );
}
