"use client";

/**
 * Strategies panel — the content of the "Strategies" tab on the analysis
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

export function StrategiesPanel({ values, result }: StrategiesPanelProps) {
  const [rehabTotal, setRehabTotal] = useState<number>(0);

  const defaultSqft = useMemo(() => deriveDefaultSqft(values), [values]);
  const defaultBaths = useMemo(() => deriveDefaultBaths(values), [values]);

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">
      <RehabEstimatorCard
        defaultSqft={defaultSqft}
        defaultBathCount={defaultBaths}
        onTotalChange={(total) => setRehabTotal(total)}
      />
      <BrrrrCard
        values={values}
        result={result}
        defaultRehab={rehabTotal}
      />
      <FixFlipCard
        values={values}
        defaultRehab={rehabTotal}
      />
    </div>
  );
}
