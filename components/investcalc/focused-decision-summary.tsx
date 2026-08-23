"use client";

import { useMemo } from "react";
import { Edit3, Loader2, Save, SlidersHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ShareLinkButton } from "@/components/investcalc/share-link-button";
import type { AnalysisResult } from "@/lib/calc-analysis";
import { computeAssumptionImpact } from "@/lib/assumption-impact";
import type { DealScoreActionResult } from "@/app/actions/deal-score";
import { meetsTarget, type MaoResult, type MaoTarget } from "@/lib/max-allowable-offer";
import type { InvestmentFormValues } from "@/lib/investcalc-schema";
import { getDealTier } from "@/lib/verdict";

type Props = {
  values: InvestmentFormValues;
  result: AnalysisResult;
  dealScoreResult: DealScoreActionResult | null;
  maxOffer: MaoResult | null;
  target: MaoTarget;
  targetLabel: string;
  canShowPriceCeiling: boolean;
  isScenarioActive?: boolean;
  onTuneTargets: () => void;
  onEditAssumptions: () => void;
  onSave: () => void;
  isSaving: boolean;
  savedDealId?: string | null;
};

function money(value: number): string {
  const rounded = Math.round(value);
  return `${rounded < 0 ? "-" : ""}$${Math.abs(rounded).toLocaleString("en-US")}`;
}

function scoreFrom(result: DealScoreActionResult | null): number | null {
  return result?.ok && result.tier === "pro" ? Math.round(result.data.score) : null;
}

/**
 * The decision viewport: one compact, factual answer before the deeper report.
 * All numbers come from the same frozen values/result snapshot as the rest of
 * the dashboard; no calculation logic lives in this component.
 */
export function FocusedDecisionSummary({
  values,
  result,
  dealScoreResult,
  maxOffer,
  target,
  targetLabel,
  canShowPriceCeiling,
  isScenarioActive = false,
  onTuneTargets,
  onEditAssumptions,
  onSave,
  isSaving,
  savedDealId,
}: Props) {
  const drivers = useMemo(() => computeAssumptionImpact(values).slice(0, 2), [values]);
  const score = scoreFrom(dealScoreResult);
  const tier = getDealTier(result);
  // The verdict must reconcile with the exact ceiling shown beside it. A deal
  // can have positive cash flow and still miss the selected $/mo or DSCR bar.
  const pass = !meetsTarget(result, target);

  return (
    <section
      aria-labelledby="decision-summary-title"
      className="rounded-2xl border-2 border-primary/30 bg-card p-5 shadow-[0_18px_50px_rgba(15,23,42,0.10)] sm:p-6"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-semibold text-muted-foreground">{values.address}</p>
            {isScenarioActive ? (
              <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-foreground">
                Base analysis
              </span>
            ) : null}
          </div>
          <h2 id="decision-summary-title" className="mt-1 text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
            {pass ? "Pass at this price" : "Pursue—with verification"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Asking {money(Number(values.purchasePrice))} · {tier} fundamentals
            {score != null ? ` · Deal Score ${score}/100` : ""}
          </p>
        </div>

        <div className="rounded-xl border border-primary/25 bg-[var(--brand-blue-light)] p-4 lg:min-w-80">
          <p className="text-[11px] font-extrabold uppercase tracking-widest text-primary">
            {isScenarioActive ? "Base price ceiling" : "Price ceiling"}
          </p>
          <p className="mt-1 font-mono text-3xl font-extrabold tabular-nums text-primary">
            {!canShowPriceCeiling
              ? "Decision Pack or Pro"
              : maxOffer
                ? money(maxOffer.maxPrice)
                : "Not reachable"}
          </p>
          <p className="mt-1 text-xs font-semibold text-foreground">Criteria: {targetLabel}</p>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
            Calculated from your selected targets. This is not a recommended offer.
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-muted/30 p-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{isScenarioActive ? "Base monthly cash flow" : "Monthly cash flow"}</p>
          <p className="mt-1 font-mono text-xl font-extrabold tabular-nums text-foreground">{money(result.netCashFlow)}</p>
        </div>
        <div className="rounded-xl border border-border bg-muted/30 p-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{isScenarioActive ? "Base DSCR" : "DSCR"}</p>
          <p className="mt-1 font-mono text-xl font-extrabold tabular-nums text-foreground">
            {result.monthlyPayment <= 0 ? "N/A" : result.dscr.toFixed(2)}
          </p>
        </div>
        {drivers.map((driver) => (
          <div key={driver.key} className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Verify {driver.label}</p>
            <p className="mt-1 text-sm font-bold text-foreground">
              {driver.deltaLabel} moves cash flow about ±{money(driver.cashFlowSwing / 2)}/mo
            </p>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
        <Button type="button" onClick={onTuneTargets} className="h-11 gap-2 rounded-xl">
          <SlidersHorizontal className="size-4" aria-hidden />
          Tune targets
        </Button>
        <Button type="button" variant="outline" onClick={onSave} disabled={isSaving} className="h-11 gap-2 rounded-xl">
          {isSaving ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Save className="size-4" aria-hidden />}
          Save
        </Button>
        <ShareLinkButton values={values} savedDealId={savedDealId} className="h-11 rounded-xl px-4" />
        <Button type="button" variant="ghost" onClick={onEditAssumptions} className="h-11 gap-2 rounded-xl">
          <Edit3 className="size-4" aria-hidden />
          Edit assumptions
        </Button>
      </div>
    </section>
  );
}
