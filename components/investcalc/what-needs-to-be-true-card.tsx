"use client";

import { useEffect, useMemo, useRef } from "react";
import { ArrowRight, CheckCircle2, ChevronDown, Target } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  buildWhatNeedsToBeTrue,
  type AnyDecisionThreshold,
  type DecisionThresholdId,
} from "@/lib/decision-thresholds";
import type { InvestmentFormValues } from "@/lib/investcalc-schema";
import { describeMaoTarget } from "@/lib/mao-targets";
import type { MaoTarget } from "@/lib/max-allowable-offer";
import { trackEvent } from "@/lib/analytics";

export type ApplicableDecisionThreshold =
  | { field: "purchasePrice"; value: number; lever: "price" }
  | { field: "monthlyRent"; value: number; lever: "rent" }
  | { field: "interestRate"; value: number; lever: "rate" }
  | { field: "rehabBudget"; value: number; lever: "rehab" };

type Props = {
  values: InvestmentFormValues;
  target: MaoTarget;
  targetSource: "buy-box" | "default" | "custom";
  onApply?: (change: ApplicableDecisionThreshold) => void;
};

const money = (value: number) => `$${Math.round(value).toLocaleString("en-US")}`;

function compactValue(threshold: AnyDecisionThreshold): string | null {
  if (threshold.status !== "change_required" || !threshold.rechecked) return null;
  switch (threshold.id) {
    case "max_purchase_price":
      return threshold.thresholdValue == null ? null : `Price ≤ ${money(threshold.thresholdValue)}`;
    case "required_monthly_rent":
      return threshold.thresholdValue == null ? null : `Rent ≥ ${money(threshold.thresholdValue)}/mo`;
    case "max_interest_rate":
      return threshold.thresholdValue == null ? null : `Rate ≤ ${threshold.thresholdValue.toFixed(2)}%`;
    case "cash_needed_reduction": {
      const cash = threshold as Extract<AnyDecisionThreshold, { id: "cash_needed_reduction" }>;
      if (cash.requiredCashReduction == null) return null;
      return cash.sellerCreditFramingSupportedByModel
        ? `Modeled closing-cost reduction ≥ ${money(cash.requiredCashReduction)}`
        : `Cash needed reduction ≥ ${money(cash.requiredCashReduction)}`;
    }
    case "max_rehab_budget":
      return threshold.thresholdValue == null ? null : `Rehab ≤ ${money(threshold.thresholdValue)}`;
    case "max_total_recurring_expenses":
      return threshold.thresholdValue == null
        ? null
        : `Recurring expenses ≤ ${money(threshold.thresholdValue)}/mo`;
  }
}

function applyChangeFor(threshold: AnyDecisionThreshold): ApplicableDecisionThreshold | null {
  if (threshold.status !== "change_required" || !threshold.rechecked || threshold.thresholdValue == null) {
    return null;
  }
  switch (threshold.id) {
    case "max_purchase_price":
      return { field: "purchasePrice", value: threshold.thresholdValue, lever: "price" };
    case "required_monthly_rent":
      return { field: "monthlyRent", value: threshold.thresholdValue, lever: "rent" };
    case "max_interest_rate":
      return { field: "interestRate", value: threshold.thresholdValue, lever: "rate" };
    case "max_rehab_budget":
      return { field: "rehabBudget", value: threshold.thresholdValue, lever: "rehab" };
    default:
      return null;
  }
}

const GAP_LABEL: Record<DecisionThresholdId, string> = {
  max_purchase_price: "Purchase price",
  required_monthly_rent: "Monthly rent",
  max_interest_rate: "Interest rate",
  cash_needed_reduction: "Cash needed",
  max_rehab_budget: "Rehab budget",
  max_total_recurring_expenses: "Operating expenses",
};

export function WhatNeedsToBeTrueCard({ values, target, targetSource, onApply }: Props) {
  const result = useMemo(() => buildWhatNeedsToBeTrue(values, target), [target, values]);
  const trackedKey = useRef<string | null>(null);
  const targetBasis = describeMaoTarget(target);

  useEffect(() => {
    if (!result) return;
    const key = `${values.purchasePrice}|${values.monthlyRent}|${values.interestRate}|${targetBasis}|${result.targetAlreadyMet}`;
    if (trackedKey.current === key) return;
    trackedKey.current = key;
    trackEvent("what_needs_to_be_true_viewed", {
      lever_count: result.thresholds.filter(
        (threshold) => threshold.status === "change_required" && threshold.rechecked
      ).length,
      target_basis: targetSource,
    });
  }, [result, targetBasis, targetSource, values.interestRate, values.monthlyRent, values.purchasePrice]);

  if (!result) return null;

  const actionable = result.thresholds
    .map((threshold) => ({ threshold, display: compactValue(threshold) }))
    .filter((item): item is { threshold: AnyDecisionThreshold; display: string } => item.display !== null);
  const smallest = result.smallestNormalizedGap;

  return (
    <section
      aria-labelledby="what-needs-to-be-true-title"
      className="rounded-2xl border-2 border-primary/25 bg-primary/5 p-4 sm:p-6"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-primary">
            <Target aria-hidden className="size-4" />
            <h2 id="what-needs-to-be-true-title" className="text-xs font-extrabold uppercase tracking-widest">
              What Needs To Be True?
            </h2>
          </div>
          <p className="mt-2 text-lg font-extrabold text-foreground">
            {result.targetAlreadyMet
              ? "The current assumptions already clear this target."
              : actionable.length > 0
                ? "This deal works if one of these changes."
                : "No single supported change clears the complete target."}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Every displayed boundary changes one input at a time and is re-run through the full underwriting engine against {targetBasis}.
          </p>
        </div>
        <span className="w-fit shrink-0 rounded-full border border-primary/25 bg-card px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-primary">
          {targetSource === "buy-box" ? "From your Buy Box" : targetSource === "custom" ? "Custom targets" : "Default target"}
        </span>
      </div>

      {result.targetAlreadyMet ? (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          <CheckCircle2 aria-hidden className="mt-0.5 size-4 shrink-0" />
          <p>
            At {money(values.purchasePrice)}, the modeled economics clear your targets. The Offer Ceiling above is still the highest price that meets them under these assumptions.
          </p>
        </div>
      ) : actionable.length > 0 ? (
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {actionable.map(({ threshold, display }) => {
            const applyChange = applyChangeFor(threshold);
            return (
              <li
                key={threshold.id}
                className="flex min-h-20 flex-col items-stretch justify-between gap-2 rounded-xl border border-border bg-card p-3 min-[480px]:flex-row min-[480px]:items-center min-[480px]:gap-3"
              >
                <div className="min-w-0">
                  <p className="break-words font-mono text-sm font-extrabold tabular-nums text-foreground sm:text-base">{display}</p>
                  <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
                    Exact one-variable boundary · full target rechecked
                  </p>
                </div>
                {applyChange && onApply ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="min-h-11 shrink-0 gap-1"
                    aria-label={`Apply ${display}`}
                    onClick={() => onApply(applyChange)}
                  >
                    Apply <ArrowRight aria-hidden className="size-3.5" />
                  </Button>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-4 rounded-xl border border-border bg-card p-3 text-sm text-muted-foreground">
          Review the target mix or change more than one assumption. TrueCap will not present an unsupported one-variable fix.
        </p>
      )}

      {smallest ? (
        <p className="mt-3 text-xs text-muted-foreground">
          <strong className="text-foreground">Smallest normalized gap: {GAP_LABEL[smallest.id]}.</strong>{" "}
          This compares required change ÷ current value; it is not a claim that the change is most achievable.
        </p>
      ) : null}

      <details className="group mt-4 border-t border-primary/15 pt-3">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-md text-xs font-semibold text-muted-foreground marker:content-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          See calculation notes and unsupported paths
          <ChevronDown aria-hidden className="size-4 transition-transform group-open:rotate-180" />
        </summary>
        <ul className="mt-3 space-y-2 text-xs leading-relaxed text-muted-foreground">
          {result.thresholds.map((threshold) => (
            <li key={threshold.id} className="rounded-lg border border-border bg-card px-3 py-2">
              <strong className="text-foreground">{threshold.label}:</strong> {threshold.reason}
            </li>
          ))}
          <li>
            A modeled closing-cost reduction appears only when the required cash reduction fits inside modeled closing costs. It is not an explicit seller credit; actual settlement terms and lender limits require written verification.
          </li>
        </ul>
      </details>
    </section>
  );
}
