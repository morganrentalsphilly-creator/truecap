"use client";

/**
 * Fix-and-Flip analysis card.
 *
 * Combines the user's acquisition assumptions from the main form with
 * flip-specific inputs (rehab, hold months, ARV, selling costs).
 * Reports gross/net profit, ROI on cash invested, annualized ROI,
 * profit-per-day, and the break-even ARV.
 */

import { useEffect, useId, useMemo, useState } from "react";
import { TrendingUp, ChevronDown, ChevronUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { AnalysisResult } from "@/lib/calc-analysis";
import {
  analyzeFixFlip,
  estimateFixFlipCarryingCost,
} from "@/lib/fix-flip-analysis";
import { resolveExplicitRehabBudget } from "@/lib/specialist-input-readiness";
import type {
  InvestmentFormValues,
  StrategyInputErrors,
  StrategyInputField,
  StrategyInputs,
} from "@/lib/investcalc-schema";
import { FieldError } from "@/components/investcalc/form-field-helpers";

interface FixFlipCardProps {
  values: InvestmentFormValues | null;
  result?: AnalysisResult | null;
  defaultRehab?: number;
  strategyInputs?: Partial<StrategyInputs>;
  strategyInputErrors?: StrategyInputErrors;
  onStrategyInputChange?: (
    field: StrategyInputField,
    value: number | undefined,
  ) => void;
}

const fmt = (n: number) =>
  n === Infinity
    ? "∞"
    : `${n < 0 ? "-" : ""}$${Math.round(Math.abs(n)).toLocaleString("en-US")}`;
const fmtPct = (n: number | null) =>
  n != null && Number.isFinite(n) ? `${n.toFixed(1)}%` : "N/A";

export function FixFlipCard({
  values,
  result,
  defaultRehab,
  strategyInputs,
  strategyInputErrors,
  onStrategyInputChange,
}: FixFlipCardProps) {
  const purchasePrice = Number(values?.purchasePrice) || 0;
  const defaultDp = Number(values?.downPaymentPct ?? 20);
  const defaultCloseAcq = Number(values?.closingCostsPct ?? 3);

  const [localInputs, setLocalInputs] = useState<Partial<StrategyInputs>>(
    () => ({
      rehabBudget: values?.rehabBudget,
      strategyArv: values?.strategyArv,
      strategyHoldMonths: values?.strategyHoldMonths,
      fixFlipSellingCostsPct: values?.fixFlipSellingCostsPct,
      fixFlipDownPaymentPct: values?.fixFlipDownPaymentPct,
      fixFlipCarryMonthly: values?.fixFlipCarryMonthly,
    }),
  );
  const inputs = strategyInputs ?? localInputs;
  useEffect(() => {
    if (strategyInputs) return;
    setLocalInputs({
      rehabBudget: values?.rehabBudget,
      strategyArv: values?.strategyArv,
      strategyHoldMonths: values?.strategyHoldMonths,
      fixFlipSellingCostsPct: values?.fixFlipSellingCostsPct,
      fixFlipDownPaymentPct: values?.fixFlipDownPaymentPct,
      fixFlipCarryMonthly: values?.fixFlipCarryMonthly,
    });
  }, [
    strategyInputs,
    values?.fixFlipCarryMonthly,
    values?.fixFlipDownPaymentPct,
    values?.fixFlipSellingCostsPct,
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

  // A11Y: labels lacked htmlFor and inputs lacked id, so labels weren't
  // clickable and the fields had no accessible name. useId() namespaces the
  // ids so multiple card instances never collide.
  const uid = useId();
  const rehabId = `${uid}-rehab`;
  const arvId = `${uid}-arv`;
  const holdId = `${uid}-hold`;
  const sellPctId = `${uid}-sell-pct`;
  const dpId = `${uid}-down-payment`;
  const carryId = `${uid}-carry`;
  const inputsPanelId = `${uid}-inputs`;
  const canCollapse = !onStrategyInputChange;
  const inputsExpanded = !canCollapse || expanded;

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
    !inRange(inputs.fixFlipSellingCostsPct, 0, 30) ||
    !inRange(inputs.fixFlipDownPaymentPct, 0, 100) ||
    !inRange(inputs.fixFlipCarryMonthly, 0, 1_000_000);

  const effectiveRehab = resolveExplicitRehabBudget(inputs.rehabBudget);

  const analysis = useMemo(() => {
    if (hasInvalidStrategyInput) return null;
    if (!purchasePrice || purchasePrice <= 0) return null;
    if (effectiveRehab === null) return null;
    const arv = Number(inputs.strategyArv);
    if (!arv || arv <= 0) return null;
    const dpPct = inputs.fixFlipDownPaymentPct ?? defaultDp;
    const carryAuto = estimateFixFlipCarryingCost(values, result, dpPct);
    const carry =
      inputs.fixFlipCarryMonthly != null &&
      Number.isFinite(Number(inputs.fixFlipCarryMonthly))
        ? Number(inputs.fixFlipCarryMonthly)
        : carryAuto;

    return analyzeFixFlip({
      purchasePrice,
      rehabBudget: effectiveRehab,
      arv,
      closingCostsPctAcq: defaultCloseAcq,
      sellingCostsPct: inputs.fixFlipSellingCostsPct ?? 7,
      holdMonths: Math.max(0, Number(inputs.strategyHoldMonths ?? 6)),
      monthlyCarryingCost: carry,
      downPaymentPct: dpPct,
    });
  }, [
    purchasePrice,
    defaultDp,
    defaultCloseAcq,
    effectiveRehab,
    inputs.strategyArv,
    inputs.fixFlipSellingCostsPct,
    inputs.strategyHoldMonths,
    inputs.fixFlipDownPaymentPct,
    inputs.fixFlipCarryMonthly,
    values,
    result,
    hasInvalidStrategyInput,
  ]);

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm p-5 sm:p-6">
      <div className="flex items-center justify-between mb-1.5 gap-2">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          <span className="font-semibold text-sm text-foreground">
            Fix-and-flip analyzer
          </span>
        </div>
        {canCollapse && (
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            aria-expanded={expanded}
            aria-controls={inputsPanelId}
            /* 44px tap band on phones, desktop box unchanged — same fix as the
             BRRRR card's toggle (both ship publicly on /d/ share pages). */
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
        Buy → rehab → sell. Carrying costs auto-estimated from your property
        tax, insurance, financing, and utility assumptions.
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
                placeholder={
                  defaultRehab && defaultRehab > 0
                    ? String(defaultRehab)
                    : "30000"
                }
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
                placeholder="450000"
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
              htmlFor={holdId}
              className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block"
            >
              Hold Time
            </Label>
            <div className="relative">
              <Input
                id={holdId}
                name="strategyHoldMonths"
                type="number"
                inputMode="decimal"
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
              htmlFor={sellPctId}
              className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block"
            >
              Selling Costs
            </Label>
            <div className="relative">
              <Input
                id={sellPctId}
                name="fixFlipSellingCostsPct"
                type="number"
                inputMode="decimal"
                step="0.5"
                value={inputs.fixFlipSellingCostsPct ?? 7}
                onChange={(e) =>
                  setNumericInput("fixFlipSellingCostsPct", e.target.value)
                }
                min={0}
                max={30}
                aria-invalid={!!strategyInputErrors?.fixFlipSellingCostsPct}
                aria-describedby={
                  strategyInputErrors?.fixFlipSellingCostsPct
                    ? `${sellPctId}-error`
                    : undefined
                }
                className="pr-8 border-input bg-background"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                %
              </span>
            </div>
            <FieldError
              id={`${sellPctId}-error`}
              message={strategyInputErrors?.fixFlipSellingCostsPct}
            />
          </div>
          <div>
            <Label
              htmlFor={dpId}
              className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block"
            >
              Down Payment
            </Label>
            <div className="relative">
              <Input
                id={dpId}
                name="fixFlipDownPaymentPct"
                type="number"
                inputMode="decimal"
                value={inputs.fixFlipDownPaymentPct ?? defaultDp}
                onChange={(e) =>
                  setNumericInput("fixFlipDownPaymentPct", e.target.value)
                }
                min={0}
                max={100}
                aria-invalid={!!strategyInputErrors?.fixFlipDownPaymentPct}
                aria-describedby={
                  strategyInputErrors?.fixFlipDownPaymentPct
                    ? `${dpId}-error`
                    : undefined
                }
                className="pr-8 border-input bg-background"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                %
              </span>
            </div>
            <FieldError
              id={`${dpId}-error`}
              message={strategyInputErrors?.fixFlipDownPaymentPct}
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              100 for cash buy
            </p>
          </div>
          <div>
            <Label
              htmlFor={carryId}
              className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block"
            >
              Carry / mo (optional)
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                $
              </span>
              <Input
                id={carryId}
                name="fixFlipCarryMonthly"
                type="number"
                inputMode="decimal"
                value={inputs.fixFlipCarryMonthly ?? ""}
                onChange={(e) =>
                  setNumericInput("fixFlipCarryMonthly", e.target.value)
                }
                min={0}
                max={1_000_000}
                aria-invalid={!!strategyInputErrors?.fixFlipCarryMonthly}
                aria-describedby={
                  strategyInputErrors?.fixFlipCarryMonthly
                    ? `${carryId}-error`
                    : undefined
                }
                placeholder={
                  values
                    ? String(
                        estimateFixFlipCarryingCost(
                          values,
                          result,
                          inputs.fixFlipDownPaymentPct ?? defaultDp,
                        ),
                      )
                    : "auto"
                }
                className="pl-7 border-input bg-background"
              />
            </div>
            <FieldError
              id={`${carryId}-error`}
              message={strategyInputErrors?.fixFlipCarryMonthly}
            />
            <p className="text-[10px] leading-relaxed text-muted-foreground mt-1">
              Screening estimate from modeled tax, insurance, utilities, and
              interest-only debt. Verify actual holding costs and loan terms.
            </p>
          </div>
        </div>
      )}

      {!analysis ? (
        <div className="text-xs text-muted-foreground rounded-xl border border-border bg-[var(--background)] px-4 py-3">
          {hasInvalidStrategyInput
            ? "Correct the out-of-range strategy assumptions above before relying on the flip result."
            : "Enter purchase price, rehab budget, and ARV to run the flip math."}
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-[var(--background)] p-4 sm:p-5 space-y-4">
          {/* Headline metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <Metric
              label="Net profit"
              value={fmt(analysis.netProfit)}
              positive={analysis.netProfit > 0}
              negative={analysis.netProfit < 0}
            />
            <Metric
              label="ROI on cash"
              value={fmtPct(analysis.roiOnCashPct)}
              positive={analysis.roiOnCashPct > 15}
              negative={analysis.roiOnCashPct < 0}
            />
            <Metric
              label="Simple annualized ROI"
              value={fmtPct(analysis.annualizedRoiPct)}
              positive={
                analysis.annualizedRoiPct != null &&
                analysis.annualizedRoiPct > 20
              }
              negative={
                analysis.annualizedRoiPct != null &&
                analysis.annualizedRoiPct < 0
              }
            />
            <Metric
              label="Profit / day"
              value={fmt(analysis.profitPerDay)}
              positive={analysis.profitPerDay > 0}
              negative={analysis.profitPerDay < 0}
            />
          </div>

          {/* Breakdown */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-1.5">
                Cash going in
              </div>
              <Row label="Cash at close" value={fmt(analysis.cashAtClose)} />
              <Row label="Rehab" value={fmt(analysis.rehabBudget)} />
              <Row label="Carrying" value={fmt(analysis.carryingCostsTotal)} />
              <Row
                label="Total cash invested"
                value={fmt(analysis.totalCashInvested)}
                bold
              />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-1.5">
                Sale
              </div>
              <Row label="Selling costs" value={fmt(analysis.sellingCosts)} />
              <Row label="Gross profit" value={fmt(analysis.grossProfit)} />
              <Row
                label="Acquisition closing costs"
                value={`-${fmt(analysis.acquisitionClosingCosts)}`}
              />
              <Row
                label="Break-even ARV"
                value={fmt(analysis.breakEvenArv)}
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
