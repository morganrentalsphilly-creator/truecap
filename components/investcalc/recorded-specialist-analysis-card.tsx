"use client";

import { useId } from "react";
import type { AnalyzerStrategyKey } from "@/lib/analyzer-strategy-persistence";
import type { SpecialistAnalysisSnapshot } from "@/lib/specialist-analysis-snapshot";
import { cn } from "@/lib/utils";

export type RecordedSpecialistAnalysisState =
  | SpecialistAnalysisSnapshot
  | "unavailable"
  | null;

const cash = (value: number) =>
  `${value < 0 ? "-" : ""}$${Math.abs(Math.round(value)).toLocaleString("en-US")}`;
const pct = (value: number) => `${value.toFixed(1)}%`;

function RecordedMetric({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "positive" | "negative";
}) {
  return (
    <div className="rounded-xl border border-border bg-background p-3">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 font-mono text-xl font-extrabold tabular-nums",
          tone === "positive" && "text-[var(--metric-positive)]",
          tone === "negative" && "text-[var(--metric-negative)]",
          tone === "neutral" && "text-foreground",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function RecordedAssumption({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border/70 py-2 last:border-b-0">
      <span className="text-xs font-semibold text-muted-foreground">
        {label}
      </span>
      <span className="font-mono text-xs font-bold tabular-nums text-foreground">
        {value}
      </span>
    </div>
  );
}

export function RecordedSpecialistAnalysisCard({
  state,
  strategyKey,
}: {
  state: Exclude<RecordedSpecialistAnalysisState, null>;
  strategyKey: AnalyzerStrategyKey;
}) {
  const titleId = useId();
  const label = strategyKey === "brrrr" ? "BRRRR" : "fix-and-flip";
  if (state === "unavailable") {
    return (
      <section
        role="status"
        className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5 sm:p-6"
        aria-labelledby={titleId}
      >
        <p className="text-[10px] font-extrabold uppercase tracking-widest text-amber-700 dark:text-amber-300">
          Recorded strategy analysis
        </p>
        <h2
          id={titleId}
          className="mt-1 text-lg font-extrabold text-foreground"
        >
          Saved {label} result unavailable
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          This historical underwriting does not contain a valid frozen {label}
          snapshot. TrueCap has not substituted today&apos;s model. Edit an
          assumption or choose Run Analysis to create a current result.
        </p>
      </section>
    );
  }

  const snapshot = state;
  if (snapshot.strategy !== strategyKey) {
    return (
      <RecordedSpecialistAnalysisCard
        state="unavailable"
        strategyKey={strategyKey}
      />
    );
  }

  return (
    <section
      className="rounded-2xl border-2 border-primary/25 bg-card p-5 shadow-sm sm:p-6"
      aria-labelledby={titleId}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-primary">
            Recorded strategy analysis
          </p>
          <h2
            id={titleId}
            className="mt-1 text-xl font-extrabold tracking-tight text-foreground"
          >
            Frozen {label} result
          </h2>
        </div>
        <span className="w-fit rounded-full border border-primary/25 bg-[var(--brand-blue-light)] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-primary">
          Model v{snapshot.modelVersion} · core v
          {snapshot.coreMethodologyVersion}
        </span>
      </div>
      <p className="mt-3 rounded-xl border border-primary/20 bg-[var(--brand-blue-light)] p-3 text-xs leading-relaxed text-foreground">
        These values were captured with the saved underwriting and have not been
        recalculated with current strategy formulas. Edit or rerun to
        intentionally replace the recorded result.
      </p>

      {snapshot.strategy === "brrrr" ? (
        <>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            <RecordedMetric
              label="Cash left in deal"
              value={cash(snapshot.outcome.cashLeftInDeal)}
              tone={
                snapshot.outcome.cashLeftInDeal <= 0 ? "positive" : "neutral"
              }
            />
            <RecordedMetric
              label="Post-refi cash flow"
              value={`${cash(snapshot.outcome.postRefiMonthlyCashFlow)}/mo`}
              tone={
                snapshot.outcome.postRefiMonthlyCashFlow >= 0
                  ? "positive"
                  : "negative"
              }
            />
            <RecordedMetric
              label="Post-refi cash-on-cash"
              value={
                snapshot.outcome.isInfiniteReturn
                  ? "Infinite*"
                  : pct(snapshot.outcome.postRefiCashOnCashPct ?? 0)
              }
              tone={
                snapshot.outcome.postRefiMonthlyCashFlow >= 0
                  ? "positive"
                  : "negative"
              }
            />
          </div>
          <div className="mt-4 rounded-xl border border-border bg-muted/20 px-3">
            <RecordedAssumption
              label="Purchase price"
              value={cash(snapshot.effectiveInputs.purchasePrice)}
            />
            <RecordedAssumption
              label="Rehab budget"
              value={cash(snapshot.effectiveInputs.rehabBudget)}
            />
            <RecordedAssumption
              label="After-repair value"
              value={cash(snapshot.effectiveInputs.arv)}
            />
            <RecordedAssumption
              label="Refinance terms"
              value={`${snapshot.effectiveInputs.refiLtvPct.toFixed(1)}% LTV · ${snapshot.effectiveInputs.refiRatePct.toFixed(2)}%`}
            />
          </div>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            Refinance eligibility, appraisal, seasoning, fees, and lender terms
            require independent verification. *Infinite is a modeled state, not
            a guaranteed return.
          </p>
        </>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            <RecordedMetric
              label="Net profit"
              value={cash(snapshot.outcome.netProfit)}
              tone={snapshot.outcome.netProfit >= 0 ? "positive" : "negative"}
            />
            <RecordedMetric
              label="ROI on cash"
              value={pct(snapshot.outcome.roiOnCashPct)}
              tone={
                snapshot.outcome.roiOnCashPct >= 0 ? "positive" : "negative"
              }
            />
            <RecordedMetric
              label="Break-even ARV"
              value={cash(snapshot.outcome.breakEvenArv)}
            />
          </div>
          <div className="mt-4 rounded-xl border border-border bg-muted/20 px-3">
            <RecordedAssumption
              label="Purchase price"
              value={cash(snapshot.effectiveInputs.purchasePrice)}
            />
            <RecordedAssumption
              label="Rehab budget"
              value={cash(snapshot.effectiveInputs.rehabBudget)}
            />
            <RecordedAssumption
              label="After-repair value"
              value={cash(snapshot.effectiveInputs.arv)}
            />
            <RecordedAssumption
              label="Hold and selling costs"
              value={`${snapshot.effectiveInputs.holdMonths} mo · ${snapshot.effectiveInputs.sellingCostsPct.toFixed(1)}%`}
            />
          </div>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            Resale value, scope, schedule, financing, selling costs, taxes, and
            liquidity can materially change this screening result.
          </p>
        </>
      )}
    </section>
  );
}
