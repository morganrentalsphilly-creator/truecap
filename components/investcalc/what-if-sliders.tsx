"use client";

/**
 * WhatIfSliders - two-knob live sensitivity for the Overview metric tier.
 *
 * The single most powerful thing TrueCap can do that competitors don't:
 * let you DRAG rent and purchase price, and watch the verdict +
 * headline KPIs re-evaluate in real time. Turns a static calculator
 * screen into a decision tool ("what's the rent breakpoint? how much
 * can I negotiate the seller down?").
 *
 * Rent and price are deliberately chosen over rent + rate: rate is
 * largely out of the buyer's control, but rent and price are the two
 * variables every investor negotiates. The sliders map directly to
 * the two real-world levers a buyer can pull.
 *
 * Scope: deliberately ONLY affects the 4 Overview tier metric cards
 * (Monthly Cash Flow, CoC, Cap Rate, DSCR) + a live tier-headline pill.
 * The Pro snapshot panels (10-yr projections, tax strategy, exit
 * scenarios) stay anchored to the saved/base analysis so they don't
 * thrash on every slider tick - those are for "this is the deal"
 * decisions, not "what if?" exploration.
 *
 * Math:
 *   - Rent slider in [-15%, +15%], 1% increments.
 *   - Price slider in [-15%, +15%], 1% increments.
 *   - We clone `values`, multiply every rent input by (1 + rentPct/100)
 *     and the purchase price by (1 + pricePct/100), then call
 *     `calculateAnalysis` to get the adjusted result. Pure compute,
 *     no IO, sub-millisecond.
 *
 * Accessibility:
 *   - Sliders are native <input type="range"> for keyboard a11y.
 *   - aria-valuetext communicates the current adjustment in plain English.
 *   - Reset button is visible whenever adjustments are non-zero.
 */

import { useMemo, useState, useCallback, useEffect } from "react";
import { RotateCcw, Sparkles } from "lucide-react";
import { calculateAnalysis, type AnalysisResult } from "@/lib/calc-analysis";
import type { InvestmentFormValues } from "@/lib/investcalc-schema";
import { getDealTier, type DealTier } from "@/lib/verdict";

export interface WhatIfState {
  /** The result to render in the Overview tier - adjusted if user has dragged a slider, otherwise the base result. */
  result: AnalysisResult;
  /** True when ANY slider is non-zero. Controls the "What-if mode" badge + reset button. */
  isAdjusted: boolean;
  /** Tier headline for the adjusted (or base) result. Used by the live tier pill. */
  tier: DealTier;
  /** Current adjustments - exposed for downstream consumers. */
  rentPct: number;
  pricePct: number;
}

interface Props {
  values: InvestmentFormValues;
  baseResult: AnalysisResult;
  /** Fired on every slider tick with the current adjusted state. */
  onStateChange?: (state: WhatIfState) => void;
}

/**
 * Apply rent and price adjustments to an InvestmentFormValues object,
 * producing a derived copy suitable for passing to calculateAnalysis.
 *
 * Exported so the breakpoint solver and any future consumer can reuse
 * the same input-mutation logic without duplicating field walks
 * across property types.
 */
export function applyWhatIfAdjustments(
  values: InvestmentFormValues,
  rentPct: number,
  pricePct: number
): InvestmentFormValues {
  const rentMul = 1 + rentPct / 100;
  const priceMul = 1 + pricePct / 100;
  // Clone shallowly + walk rent fields. We don't deep-clone the entire
  // object because calculateAnalysis only reads - never mutates.
  const next: InvestmentFormValues = {
    ...values,
    purchasePrice:
      typeof values.purchasePrice === "number"
        ? Math.round(values.purchasePrice * priceMul)
        : values.purchasePrice,
  };
  if (next.propertyType === "single-family") {
    if (typeof next.monthlyRent === "number") {
      next.monthlyRent = Math.round(next.monthlyRent * rentMul);
    }
  } else if (Array.isArray(next.units)) {
    next.units = next.units.map((u) => ({
      ...u,
      monthlyRent:
        typeof u.monthlyRent === "number"
          ? Math.round(u.monthlyRent * rentMul)
          : u.monthlyRent,
    }));
  }
  return next;
}

export function WhatIfSliders({ values, baseResult, onStateChange }: Props) {
  const [rentPct, setRentPct] = useState(0);
  const [pricePct, setPricePct] = useState(0);

  const isAdjusted = rentPct !== 0 || pricePct !== 0;

  const adjustedResult = useMemo<AnalysisResult>(() => {
    if (!isAdjusted) return baseResult;
    try {
      const adjusted = applyWhatIfAdjustments(values, rentPct, pricePct);
      return calculateAnalysis(adjusted);
    } catch {
      // calculateAnalysis throws if rent is mis-shaped (e.g. zod-cleaned
      // form with undefined units mid-edit). Fall back to base so the
      // UI never breaks; reset clears the bad state.
      return baseResult;
    }
  }, [values, baseResult, rentPct, pricePct, isAdjusted]);

  const tier = useMemo(() => getDealTier(adjustedResult), [adjustedResult]);

  // Notify parent on every change so the metric cards re-render.
  useEffect(() => {
    onStateChange?.({
      result: adjustedResult,
      isAdjusted,
      tier,
      rentPct,
      pricePct,
    });
  }, [adjustedResult, isAdjusted, tier, rentPct, pricePct, onStateChange]);

  const reset = useCallback(() => {
    setRentPct(0);
    setPricePct(0);
  }, []);

  const tierToneClass = TIER_TONE[tier];

  return (
    <div className="rounded-2xl border border-border bg-card/60 p-3 sm:p-4">
      {/* Header row - kicker + tier pill + (optional) reset button. */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5">
          <Sparkles className="size-3.5 text-primary" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            What-if
          </span>
        </div>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${tierToneClass}`}
          aria-live="polite"
          aria-atomic="true"
        >
          {tier}
        </span>
        {isAdjusted ? (
          <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
            {formatAdjustmentLabel(rentPct, pricePct)}
          </span>
        ) : null}
        <span className="flex-1" />
        {isAdjusted ? (
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-[11px] font-semibold text-foreground/80 hover:bg-muted"
            aria-label="Reset what-if sliders to actuals"
          >
            <RotateCcw className="size-3" />
            Reset
          </button>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
        <SliderRow
          label="Rent"
          value={rentPct}
          unit="%"
          min={-15}
          max={15}
          step={1}
          showSign
          onChange={setRentPct}
          ariaText={`Rent adjusted by ${rentPct >= 0 ? "+" : ""}${rentPct} percent`}
        />
        <SliderRow
          label="Purchase price"
          value={pricePct}
          unit="%"
          min={-15}
          max={15}
          step={1}
          showSign
          onChange={setPricePct}
          ariaText={`Purchase price adjusted by ${pricePct >= 0 ? "+" : ""}${pricePct} percent`}
        />
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
        Drag to stress-test the deal. The Overview metrics above update in
        real time. Projections and Pro panels stay on your actuals.
      </p>
    </div>
  );
}

const TIER_TONE: Record<DealTier, string> = {
  Strong: "bg-[var(--brand-green)] text-white",
  Solid: "bg-[var(--brand-green)]/85 text-white",
  Mixed: "bg-amber-500 text-white",
  Marginal: "bg-orange-500 text-white",
  Negative: "bg-rose-600 text-white",
};

function formatAdjustmentLabel(rentPct: number, pricePct: number): string {
  const parts: string[] = [];
  if (rentPct !== 0) parts.push(`rent ${rentPct > 0 ? "+" : ""}${rentPct}%`);
  if (pricePct !== 0) parts.push(`price ${pricePct > 0 ? "+" : ""}${pricePct}%`);
  return parts.join(" · ");
}

interface SliderRowProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  showSign?: boolean;
  decimals?: number;
  ariaText: string;
  onChange: (v: number) => void;
}

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  unit,
  showSign,
  decimals = 0,
  ariaText,
  onChange,
}: SliderRowProps) {
  const display = value.toFixed(decimals);
  const isZero = value === 0;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-foreground">{label}</span>
        <span
          className={`font-mono tabular-nums font-bold ${
            isZero ? "text-muted-foreground" : "text-primary"
          }`}
        >
          {!isZero && showSign && value > 0 ? "+" : ""}
          {display}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        aria-valuetext={ariaText}
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary"
      />
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>
          {min > 0 ? "+" : ""}
          {min}
          {unit}
        </span>
        <span>0</span>
        <span>
          +{max}
          {unit}
        </span>
      </div>
    </div>
  );
}
