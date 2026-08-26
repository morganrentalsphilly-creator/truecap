"use client";

/**
 * BRRRR analysis card.
 *
 * Combines the user's standard acquisition inputs (purchase price, financing,
 * rent, op-ex from the main analysis) with three new BRRRR-specific inputs
 * (rehab budget, ARV, refi LTV/rate/term). Outputs the cash-out math, the
 * cash left in deal, the post-refi cash flow, and an "infinite return" flag
 * when the BRRRR pulls all the original capital back out.
 */

import { useEffect, useId, useMemo, useState } from "react";
import { Repeat, ChevronDown, ChevronUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { AnalysisResult } from "@/lib/calc-analysis";
import { analyzeBrrrr } from "@/lib/brrrr-analysis";
import { resolveExplicitRehabBudget } from "@/lib/specialist-input-readiness";
import type {
  InvestmentFormValues,
  StrategyInputErrors,
  StrategyInputField,
  StrategyInputs,
} from "@/lib/investcalc-schema";
import { FieldError } from "@/components/investcalc/form-field-helpers";

interface BrrrrCardProps {
  values: InvestmentFormValues | null;
  result: AnalysisResult | null;
  /** Rehab estimate flowing in from the rehab estimator card, if any. */
  defaultRehab?: number;
  /** Live, persisted specialist assumptions shared by every BRRRR surface. */
  strategyInputs?: Partial<StrategyInputs>;
  strategyInputErrors?: StrategyInputErrors;
  onStrategyInputChange?: (
    field: StrategyInputField,
    value: number | undefined,
  ) => void;
}

const fmt = (n: number) =>
  n === Infinity ? "∞" : `$${Math.round(n).toLocaleString("en-US")}`;
const fmtPct = (n: number) => (n === Infinity ? "∞" : `${n.toFixed(1)}%`);

/** AnalysisResult exposes totalOperatingExpenses directly (sum of tax,
 *  insurance, HOA, utilities, maintenance, vacancy, management, capex).
 *  No need to back-derive from rent / mortgage / cash flow. */
function deriveOpEx(result: AnalysisResult | null): number {
  if (!result) return 0;
  return Math.max(0, Number(result.totalOperatingExpenses) || 0);
}

export function BrrrrCard({
  values,
  result,
  defaultRehab,
  strategyInputs,
  strategyInputErrors,
  onStrategyInputChange,
}: BrrrrCardProps) {
  const purchasePrice = Number(values?.purchasePrice) || 0;
  const downPaymentPct = Number(values?.downPaymentPct ?? 20);
  const baseRatePct = Number(values?.interestRate ?? 6.5);
  const baseCloseAcqPct = Number(values?.closingCostsPct ?? 3);

  // Public/read-only analysis surfaces do not have the parent form callback;
  // keep an ephemeral fallback there, seeded from the recorded form. The
  // analyzer passes controlled inputs, so both the headline and deeper card
  // share one dirty/save/draft-aware source of truth.
  const [localInputs, setLocalInputs] = useState<Partial<StrategyInputs>>(
    () => ({
      rehabBudget: values?.rehabBudget,
      strategyArv: values?.strategyArv,
      strategyHoldMonths: values?.strategyHoldMonths,
      brrrrRefiLtvPct: values?.brrrrRefiLtvPct,
      brrrrRefiRatePct: values?.brrrrRefiRatePct,
      brrrrRefiTermYears: values?.brrrrRefiTermYears,
      brrrrRefiClosingCostsPct: values?.brrrrRefiClosingCostsPct,
    }),
  );
  const inputs = strategyInputs ?? localInputs;
  useEffect(() => {
    if (strategyInputs) return;
    setLocalInputs({
      rehabBudget: values?.rehabBudget,
      strategyArv: values?.strategyArv,
      strategyHoldMonths: values?.strategyHoldMonths,
      brrrrRefiLtvPct: values?.brrrrRefiLtvPct,
      brrrrRefiRatePct: values?.brrrrRefiRatePct,
      brrrrRefiTermYears: values?.brrrrRefiTermYears,
      brrrrRefiClosingCostsPct: values?.brrrrRefiClosingCostsPct,
    });
  }, [
    strategyInputs,
    values?.brrrrRefiClosingCostsPct,
    values?.brrrrRefiLtvPct,
    values?.brrrrRefiRatePct,
    values?.brrrrRefiTermYears,
    values?.rehabBudget,
    values?.strategyArv,
    values?.strategyHoldMonths,
  ]);
  const setNumericInput = (field: StrategyInputField, raw: string) => {
    const value = raw === "" ? undefined : Number(raw);
    if (value !== undefined && !Number.isFinite(value)) return;
    if (onStrategyInputChange) onStrategyInputChange(field, value);
    else setLocalInputs((current) => ({ ...current, [field]: value }));
  };
  const [expanded, setExpanded] = useState(true);

  // A11Y: each field's <Label> had no htmlFor and the <Input> no id, so the
  // labels weren't clickable and had no programmatic association (no
  // accessible name for screen readers). useId() keeps ids unique per
  // instance.
  const uid = useId();
  const rehabId = `${uid}-rehab`;
  const arvId = `${uid}-arv`;
  const refiLtvId = `${uid}-refi-ltv`;
  const refiRateId = `${uid}-refi-rate`;
  const refiTermId = `${uid}-refi-term`;
  const holdId = `${uid}-hold`;
  const refiCloseId = `${uid}-refi-close`;
  const inputsPanelId = `${uid}-inputs`;
  // In the live analyzer the fields participate in form validation, so keep
  // them expanded and reachable. Read-only/share cards may still collapse.
  const canCollapse = !onStrategyInputChange;
  const inputsExpanded = !canCollapse || expanded;

  const effectiveRehab = resolveExplicitRehabBudget(inputs.rehabBudget);

  const rehabPlaceholder =
    defaultRehab && defaultRehab > 0
      ? `${defaultRehab.toLocaleString()}`
      : "25000";
  const inRange = (
    value: number | undefined,
    min: number,
    max: number,
    whole = false,
  ) =>
    value == null ||
    (Number.isFinite(value) &&
      value >= min &&
      value <= max &&
      (!whole || Number.isInteger(value)));
  const hasInvalidStrategyInput =
    Object.values(strategyInputErrors ?? {}).some(Boolean) ||
    !inRange(inputs.rehabBudget, 0, 1_000_000) ||
    !inRange(inputs.strategyArv, 1, 100_000_000) ||
    !inRange(inputs.strategyHoldMonths, 0, 120, true) ||
    !inRange(inputs.brrrrRefiLtvPct, 0, 100) ||
    !inRange(inputs.brrrrRefiRatePct, 0, 30) ||
    !inRange(inputs.brrrrRefiTermYears, 1, 50, true) ||
    !inRange(inputs.brrrrRefiClosingCostsPct, 0, 20);

  const analysis = useMemo(() => {
    if (hasInvalidStrategyInput) return null;
    if (!purchasePrice || purchasePrice <= 0) return null;
    if (effectiveRehab === null) return null;
    const arv = Number(inputs.strategyArv);
    if (!arv || arv <= 0) return null;
    const rent = result?.monthlyRentalIncome ?? 0;
    const opEx = deriveOpEx(result);

    return analyzeBrrrr({
      purchasePrice,
      rehabBudget: effectiveRehab,
      arv,
      refiLtvPct: inputs.brrrrRefiLtvPct ?? 75,
      refiRatePct: inputs.brrrrRefiRatePct ?? baseRatePct,
      refiTermYears: inputs.brrrrRefiTermYears ?? 30,
      closingCostsPctAcq: baseCloseAcqPct,
      closingCostsRefiPct: inputs.brrrrRefiClosingCostsPct ?? 2,
      downPaymentPct,
      holdMonths: Number(inputs.strategyHoldMonths ?? 6),
      monthlyCarryingCost: opEx,
      postRefiMonthlyOpEx: opEx,
      postRefiMonthlyRent: rent,
    });
  }, [
    purchasePrice,
    downPaymentPct,
    baseRatePct,
    baseCloseAcqPct,
    effectiveRehab,
    inputs.strategyArv,
    inputs.brrrrRefiLtvPct,
    inputs.brrrrRefiRatePct,
    inputs.brrrrRefiTermYears,
    inputs.brrrrRefiClosingCostsPct,
    inputs.strategyHoldMonths,
    result,
    hasInvalidStrategyInput,
  ]);

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm p-5 sm:p-6">
      <div className="flex items-center justify-between mb-1.5 gap-2">
        <div className="flex items-center gap-2">
          <Repeat className="w-4 h-4 text-primary" />
          <span className="font-semibold text-sm text-foreground">
            BRRRR analyzer
          </span>
        </div>
        {canCollapse && (
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            aria-expanded={expanded}
            aria-controls={inputsPanelId}
            /* Bare text ran to a 16px-tall hit box — half a comfortable touch
             target, on the /d/ share pages where this card is public. Padding
             + min-h-11 give it a 44px band on phones; -mr-2 keeps the label
             optically flush with the card edge and sm: restores the exact
             desktop box. */
            className="text-xs text-muted-foreground hover:text-foreground flex min-h-11 items-center gap-1 -mr-2 px-2 py-2 sm:min-h-0 sm:py-0"
          >
            {expanded ? (
              <>
                Collapse <ChevronUp className="w-3.5 h-3.5" />
              </>
            ) : (
              <>
                Expand <ChevronDown className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        )}
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        Models a buy-rehab-rent-refinance cycle. Uses your purchase price,
        financing, rent, and operating expenses from the main analysis; you
        enter rehab budget, ARV, and refi terms.
      </p>

      {inputsExpanded && (
        <div
          id={inputsPanelId}
          className="grid grid-cols-1 min-[400px]:grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mb-4"
        >
          <div>
            <Label
              htmlFor={rehabId}
              className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block"
            >
              Rehab Budget
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                $
              </span>
              <Input
                id={rehabId}
                name="rehabBudget"
                type="number"
                inputMode="decimal"
                value={inputs.rehabBudget ?? ""}
                onChange={(e) => setNumericInput("rehabBudget", e.target.value)}
                min={1}
                max={1_000_000}
                aria-invalid={!!strategyInputErrors?.rehabBudget}
                aria-describedby={
                  strategyInputErrors?.rehabBudget
                    ? `${rehabId}-error`
                    : undefined
                }
                placeholder={rehabPlaceholder}
                className="pl-7 border-input bg-background"
              />
            </div>
            <FieldError
              id={`${rehabId}-error`}
              message={strategyInputErrors?.rehabBudget}
            />
            {defaultRehab && defaultRehab > 0 && inputs.rehabBudget == null && (
              <p className="text-[10px] text-muted-foreground mt-1">
                Using estimator total
              </p>
            )}
          </div>
          <div>
            <Label
              htmlFor={arvId}
              className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block"
            >
              ARV
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                $
              </span>
              <Input
                id={arvId}
                name="strategyArv"
                type="number"
                inputMode="decimal"
                value={inputs.strategyArv ?? ""}
                onChange={(e) => setNumericInput("strategyArv", e.target.value)}
                min={0}
                max={100_000_000}
                aria-invalid={!!strategyInputErrors?.strategyArv}
                aria-describedby={
                  strategyInputErrors?.strategyArv
                    ? `${arvId}-error`
                    : undefined
                }
                placeholder="425000"
                className="pl-7 border-input bg-background"
              />
            </div>
            <FieldError
              id={`${arvId}-error`}
              message={strategyInputErrors?.strategyArv}
            />
            <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
              Your estimate · verify with relevant sold comps or an appraisal.
            </p>
          </div>
          <div>
            <Label
              htmlFor={refiLtvId}
              className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block"
            >
              Refi LTV
            </Label>
            <div className="relative">
              <Input
                id={refiLtvId}
                name="brrrrRefiLtvPct"
                type="number"
                inputMode="decimal"
                step="1"
                value={inputs.brrrrRefiLtvPct ?? 75}
                onChange={(e) =>
                  setNumericInput("brrrrRefiLtvPct", e.target.value)
                }
                min={0}
                max={100}
                aria-invalid={!!strategyInputErrors?.brrrrRefiLtvPct}
                aria-describedby={
                  strategyInputErrors?.brrrrRefiLtvPct
                    ? `${refiLtvId}-error`
                    : undefined
                }
                className="pr-8 border-input bg-background"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                %
              </span>
            </div>
            <FieldError
              id={`${refiLtvId}-error`}
              message={strategyInputErrors?.brrrrRefiLtvPct}
            />
          </div>
          <div>
            <Label
              htmlFor={refiRateId}
              className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block"
            >
              Refi Rate
            </Label>
            <div className="relative">
              <Input
                id={refiRateId}
                name="brrrrRefiRatePct"
                type="number"
                inputMode="decimal"
                step="0.125"
                value={inputs.brrrrRefiRatePct ?? baseRatePct}
                onChange={(e) =>
                  setNumericInput("brrrrRefiRatePct", e.target.value)
                }
                min={0}
                max={30}
                aria-invalid={!!strategyInputErrors?.brrrrRefiRatePct}
                aria-describedby={
                  strategyInputErrors?.brrrrRefiRatePct
                    ? `${refiRateId}-error`
                    : undefined
                }
                className="pr-8 border-input bg-background"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                %
              </span>
            </div>
            <FieldError
              id={`${refiRateId}-error`}
              message={strategyInputErrors?.brrrrRefiRatePct}
            />
          </div>
          <div>
            <Label
              htmlFor={refiTermId}
              className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block"
            >
              Refi Term
            </Label>
            <div className="relative">
              <Input
                id={refiTermId}
                name="brrrrRefiTermYears"
                type="number"
                inputMode="decimal"
                step="1"
                value={inputs.brrrrRefiTermYears ?? 30}
                onChange={(e) =>
                  setNumericInput("brrrrRefiTermYears", e.target.value)
                }
                min={1}
                max={50}
                aria-invalid={!!strategyInputErrors?.brrrrRefiTermYears}
                aria-describedby={
                  strategyInputErrors?.brrrrRefiTermYears
                    ? `${refiTermId}-error`
                    : undefined
                }
                className="pr-12 border-input bg-background"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                yrs
              </span>
            </div>
            <FieldError
              id={`${refiTermId}-error`}
              message={strategyInputErrors?.brrrrRefiTermYears}
            />
          </div>
          <div>
            <Label
              htmlFor={holdId}
              className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block"
            >
              Hold (rehab → refi)
            </Label>
            <div className="relative">
              <Input
                id={holdId}
                name="strategyHoldMonths"
                type="number"
                inputMode="decimal"
                step="1"
                value={inputs.strategyHoldMonths ?? 6}
                onChange={(e) =>
                  setNumericInput("strategyHoldMonths", e.target.value)
                }
                min={0}
                max={120}
                aria-invalid={!!strategyInputErrors?.strategyHoldMonths}
                aria-describedby={
                  strategyInputErrors?.strategyHoldMonths
                    ? `${holdId}-error`
                    : undefined
                }
                className="pr-10 border-input bg-background"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                mo
              </span>
            </div>
            <FieldError
              id={`${holdId}-error`}
              message={strategyInputErrors?.strategyHoldMonths}
            />
          </div>
          <div>
            <Label
              htmlFor={refiCloseId}
              className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block"
            >
              Refi Closing
            </Label>
            <div className="relative">
              <Input
                id={refiCloseId}
                name="brrrrRefiClosingCostsPct"
                type="number"
                inputMode="decimal"
                step="0.25"
                value={inputs.brrrrRefiClosingCostsPct ?? 2}
                onChange={(e) =>
                  setNumericInput("brrrrRefiClosingCostsPct", e.target.value)
                }
                min={0}
                max={20}
                aria-invalid={!!strategyInputErrors?.brrrrRefiClosingCostsPct}
                aria-describedby={
                  strategyInputErrors?.brrrrRefiClosingCostsPct
                    ? `${refiCloseId}-error`
                    : undefined
                }
                className="pr-8 border-input bg-background"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                %
              </span>
            </div>
            <FieldError
              id={`${refiCloseId}-error`}
              message={strategyInputErrors?.brrrrRefiClosingCostsPct}
            />
          </div>
        </div>
      )}

      {!analysis ? (
        <div className="text-xs text-muted-foreground rounded-xl border border-border bg-[var(--background)] px-4 py-3">
          {hasInvalidStrategyInput
            ? "Correct the out-of-range strategy assumptions above before relying on the BRRRR result."
            : "Enter purchase price, rehab budget, and ARV to run the BRRRR math."}
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-[var(--background)] p-4 sm:p-5 space-y-4">
          {/* Headline */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <Metric
              label="Cash left in deal"
              value={fmt(analysis.cashLeftInDeal)}
              positive={analysis.cashLeftInDeal === 0}
              negative={analysis.cashLeftInDeal > 0}
            />
            <Metric
              label="Cash returned"
              value={fmt(analysis.cashReturnedAtRefi)}
              positive={analysis.cashReturnedAtRefi > 0}
            />
            <Metric
              label="Post-refi CF"
              value={`${fmt(analysis.postRefiMonthlyCashFlow)}/mo`}
              positive={analysis.postRefiMonthlyCashFlow > 0}
              negative={analysis.postRefiMonthlyCashFlow < 0}
            />
            <Metric
              label="Post-refi CoC"
              value={
                analysis.isInfiniteReturn
                  ? "∞ Infinite return"
                  : fmtPct(analysis.postRefiCashOnCashPct)
              }
              positive={
                analysis.isInfiniteReturn || analysis.postRefiCashOnCashPct > 8
              }
              negative={
                !analysis.isInfiniteReturn && analysis.postRefiCashOnCashPct < 0
              }
            />
          </div>

          {/* Refi shortfall: the new loan doesn't cover the original payoff
              + refi costs, so the investor brings cash TO the refi table.
              Already counted in "Cash left in deal" — this names it. */}
          {analysis.cashNeededAtRefi > 0 && (
            <p className="text-xs font-semibold text-[var(--metric-negative)]">
              Refi shortfall: the new loan doesn&apos;t cover the original loan
              payoff plus refi closing costs — you&apos;d bring{" "}
              {fmt(analysis.cashNeededAtRefi)} to the refi table (included in
              cash left in deal).
            </p>
          )}

          {/* Breakdown */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-1.5">
                Cash going in
              </div>
              <Row
                label="Down payment"
                value={fmt(analysis.originalDownPayment)}
              />
              <Row
                label="Closing costs"
                value={fmt(analysis.originalClosingCosts)}
              />
              <Row label="Rehab budget" value={fmt(analysis.rehabBudget)} />
              <Row
                label="Carrying costs"
                value={fmt(analysis.carryingCostsTotal)}
              />
              <Row
                label="Total cash invested"
                value={fmt(analysis.totalCashInvested)}
                bold
              />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-1.5">
                Refi
              </div>
              <Row
                label="New loan amount"
                value={fmt(analysis.newLoanAmount)}
              />
              <Row
                label="Refi closing costs"
                value={fmt(analysis.refiClosingCosts)}
              />
              {analysis.cashNeededAtRefi > 0 ? (
                <Row
                  label="Cash needed at refi"
                  value={fmt(analysis.cashNeededAtRefi)}
                  bold
                />
              ) : (
                <Row
                  label="Cash returned"
                  value={fmt(analysis.cashReturnedAtRefi)}
                  bold
                />
              )}
              <Row
                label="New monthly payment"
                value={fmt(analysis.newMonthlyPayment)}
              />
              <Row
                label="Equity created"
                value={fmt(analysis.equityCreated)}
                bold
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  positive,
  negative,
}: {
  label: string;
  value: string;
  positive?: boolean;
  negative?: boolean;
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
        {label}
      </div>
      <div
        className={cn(
          "text-base sm:text-lg font-extrabold mt-0.5 tabular-nums",
          positive && "text-[var(--metric-positive)]",
          negative && "text-[var(--metric-negative)]",
          !positive && !negative && "text-foreground",
        )}
      >
        {value}
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div className="flex justify-between py-0.5">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={cn(
          "tabular-nums",
          bold ? "font-bold text-foreground" : "text-foreground",
        )}
      >
        {value}
      </span>
    </div>
  );
}
