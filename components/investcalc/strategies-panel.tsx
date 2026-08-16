"use client";

/**
 * Strategies panel - the content of the "Strategies" tab on the analysis
 * dashboard. Contains the three new Phase 1 calculators stacked:
 *
 *   1. Rehab cost estimator
 *   2. BRRRR analyzer
 *   3. Fix-and-flip analyzer
 *
 * The rehab estimator's total is lifted up here so it can default into
 * the rehab-budget input of both BRRRR and Fix-and-Flip. The user can
 * still type their own number in either card to override.
 */

import { useMemo, useState } from "react";
import { RehabEstimatorCard } from "@/components/investcalc/rehab-estimator-card";
import { BrrrrCard } from "@/components/investcalc/brrrr-card";
import { FixFlipCard } from "@/components/investcalc/fix-flip-card";
import { AnalysisResult } from "@/lib/calc-analysis";
import type { InvestmentFormValues } from "@/lib/investcalc-schema";

interface StrategiesPanelProps {
  values: InvestmentFormValues | null;
  result: AnalysisResult | null;
  /** Apply the rehab estimate to the deal's cash invested (rehabBudget). */
  onApplyRehab?: (total: number) => void;
  /** Live rehabBudget form value (not the last-computed snapshot), so "Applied"
   *  reflects the current input immediately after Apply. */
  currentRehabBudget?: number | null;
}

function deriveDefaultSqft(values: InvestmentFormValues | null): number | null {
  if (!values) return null;
  // Single-family stores sqft at the top level; multi-family inside units[].
  const top = Number(values.sqft);
  if (Number.isFinite(top) && top > 0) return top;
  const units = values.units ?? [];
  const sum = units.reduce((s, u) => s + (Number(u?.sqft) || 0), 0);
  return sum > 0 ? sum : null;
}

function deriveDefaultBaths(values: InvestmentFormValues | null): number | null {
  if (!values) return null;
  const top = Number(values.bathrooms);
  if (Number.isFinite(top) && top > 0) return top;
  const units = values.units ?? [];
  const sum = units.reduce((s, u) => s + (Number(u?.bathrooms) || 0), 0);
  return sum > 0 ? sum : null;
}

export function StrategiesPanel({ values, result, onApplyRehab, currentRehabBudget }: StrategiesPanelProps) {
  const [rehabTotal, setRehabTotal] = useState<number>(0);

  const defaultSqft = useMemo(() => deriveDefaultSqft(values), [values]);
  const defaultBaths = useMemo(() => deriveDefaultBaths(values), [values]);

  // Already reflected in the deal once the LIVE form value matches the estimate
  // — avoids a no-op "Apply" that looks like it did nothing. Uses the live
  // rehabBudget (not values, which is the last-computed snapshot and wouldn't
  // update until a re-run), so "Applied" appears immediately after Apply.
  const alreadyApplied =
    onApplyRehab != null &&
    rehabTotal > 0 &&
    Math.round(currentRehabBudget ?? 0) === Math.round(rehabTotal);

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">
      <div>
        <RehabEstimatorCard
          defaultSqft={defaultSqft}
          defaultBathCount={defaultBaths}
          onTotalChange={(total) => setRehabTotal(total)}
        />
        {onApplyRehab && rehabTotal > 0 ? (
          <div className="mt-2 flex items-center justify-end gap-2">
            {alreadyApplied ? (
              <span className="text-xs font-medium text-muted-foreground">
                Applied to this deal&apos;s cash invested
              </span>
            ) : (
              <button
                type="button"
                onClick={() => onApplyRehab(rehabTotal)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--brand-green)] px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90"
              >
                Apply ${Math.round(rehabTotal).toLocaleString()} to this deal
              </button>
            )}
          </div>
        ) : null}
      </div>
      <BrrrrCard
        values={values}
        result={result}
        defaultRehab={rehabTotal}
      />
      <FixFlipCard
        values={values}
        result={result}
        defaultRehab={rehabTotal}
      />
    </div>
  );
}
