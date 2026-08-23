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
 *   - Rate slider in [-2pp, +2pp], 0.25pp increments (hidden for cash
 *     purchases, where monthlyPayment <= 0 makes it a no-op).
 *   - Vacancy slider in [-5pp, +15pp], 1pp increments.
 *   - We clone `values`, multiply every rent input by (1 + rentPct/100)
 *     and the purchase price by (1 + pricePct/100), shift interestRate /
 *     vacancyPct by their pp deltas (clamped to the schema bounds), then
 *     call `calculateAnalysis` to get the adjusted result. Pure compute,
 *     no IO, sub-millisecond.
 *
 * Worst-case preset:
 *   One tap composes the coherent downside scenario nobody drags by
 *   hand: rent −10%, vacancy +5pp, rate +1pp — every value reachable on
 *   the sliders too (the preset just sets the same state). "Base case"
 *   resets. On cash purchases the rate leg is skipped (no loan).
 *
 * Accessibility:
 *   - Sliders are native <input type="range"> for keyboard a11y.
 *   - aria-valuetext communicates the current adjustment in plain English.
 *   - Reset button is visible whenever adjustments are non-zero.
 */

import { useMemo, useState, useCallback, useEffect } from "react";
import { CloudRain, RotateCcw, Sparkles } from "lucide-react";
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
  /** Interest-rate adjustment in percentage points (0 = actuals). */
  ratePp: number;
  /** Vacancy adjustment in percentage points (0 = actuals). */
  vacancyPp: number;
}

/**
 * The one-tap worst-case bundle: rent −10%, vacancy +5pp, rate +1pp.
 * Every leg matches a slider's domain + step, so the same scenario is
 * reachable by hand. On cash purchases the rate leg is skipped.
 */
export const WORST_CASE_PRESET = { rentPct: -10, vacancyPp: 5, ratePp: 1 } as const;

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
  pricePct: number,
  ratePp = 0,
  vacancyPp = 0
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
    // pp deltas clamped to the schema bounds (rate 0–30, vacancy 0–50) so a
    // stressed re-run can never feed calculateAnalysis an out-of-range input.
    interestRate:
      ratePp !== 0 && typeof values.interestRate === "number"
        ? Math.min(30, Math.max(0, Math.round((values.interestRate + ratePp) * 100) / 100))
        : values.interestRate,
    vacancyPct:
      vacancyPp !== 0 && typeof values.vacancyPct === "number"
        ? Math.min(50, Math.max(0, Math.round((values.vacancyPct + vacancyPp) * 100) / 100))
        : values.vacancyPct,
  };
  if (next.propertyType === "single-family") {
    if (typeof next.monthlyRent === "number") {
      next.monthlyRent = Math.round(next.monthlyRent * rentMul);
    }
    // STR income model: when a nightly rate is set, calc-analysis derives
    // income from ADR × occupancy and IGNORES monthlyRent — the rent
    // stress must scale the ADR too, or "rent −10%" is a silent no-op and
    // the survivability card would claim a stress it never applied.
    if (typeof next.avgDailyRate === "number" && next.avgDailyRate > 0) {
      next.avgDailyRate = Math.round(next.avgDailyRate * rentMul * 100) / 100;
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
  const [ratePp, setRatePp] = useState(0);
  const [vacancyPp, setVacancyPp] = useState(0);

  // Cash purchase: no loan, so a rate adjustment is a no-op
  // (monthlyPayment <= 0). Hide the rate slider + skip the preset's
  // rate leg instead of showing a knob that does nothing.
  const isCashPurchase = baseResult.monthlyPayment <= 0;

  const isAdjusted =
    rentPct !== 0 || pricePct !== 0 || ratePp !== 0 || vacancyPp !== 0;

  const adjustedResult = useMemo<AnalysisResult>(() => {
    if (!isAdjusted) return baseResult;
    try {
      const adjusted = applyWhatIfAdjustments(values, rentPct, pricePct, ratePp, vacancyPp);
      return calculateAnalysis(adjusted);
    } catch {
      // calculateAnalysis throws if rent is mis-shaped (e.g. zod-cleaned
      // form with undefined units mid-edit). Fall back to base so the
      // UI never breaks; reset clears the bad state.
      return baseResult;
    }
  }, [values, baseResult, rentPct, pricePct, ratePp, vacancyPp, isAdjusted]);

  const tier = useMemo(() => getDealTier(adjustedResult), [adjustedResult]);

  // Notify parent on every change so the metric cards re-render.
  useEffect(() => {
    onStateChange?.({
      result: adjustedResult,
      isAdjusted,
      tier,
      rentPct,
      pricePct,
      ratePp,
      vacancyPp,
    });
  }, [adjustedResult, isAdjusted, tier, rentPct, pricePct, ratePp, vacancyPp, onStateChange]);

  const reset = useCallback(() => {
    setRentPct(0);
    setPricePct(0);
    setRatePp(0);
    setVacancyPp(0);
  }, []);

  // One-tap coherent downside: sets the SAME state the sliders set — the
  // metric tiles + survivability card react through the exact same path.
  // Price is deliberately reset to 0: the bundle stresses operations
  // (rent, vacancy, rate), and leaving a stale price drag mixed in would
  // make the scenario irreproducible.
  const worstCaseRatePp = isCashPurchase ? 0 : WORST_CASE_PRESET.ratePp;
  const isWorstCase =
    rentPct === WORST_CASE_PRESET.rentPct &&
    vacancyPp === WORST_CASE_PRESET.vacancyPp &&
    ratePp === worstCaseRatePp &&
    pricePct === 0;
  const applyWorstCase = useCallback(() => {
    setRentPct(WORST_CASE_PRESET.rentPct);
    setVacancyPp(WORST_CASE_PRESET.vacancyPp);
    setRatePp(isCashPurchase ? 0 : WORST_CASE_PRESET.ratePp);
    setPricePct(0);
  }, [isCashPurchase]);

  // Screen-reader announcement of the ACTUAL numbers as the user drags - the
  // tier pill alone ("Mixed") hides the dollar values that ARE the answer.
  // Debounced so a fast drag doesn't flood the SR queue, and only while
  // adjusted so it never speaks on first render.
  const [liveMsg, setLiveMsg] = useState("");
  useEffect(() => {
    if (!isAdjusted) {
      setLiveMsg("");
      return;
    }
    const r = adjustedResult;
    const id = window.setTimeout(() => {
      const cf = `${r.netCashFlow >= 0 ? "+" : "-"}$${Math.abs(Math.round(r.netCashFlow)).toLocaleString("en-US")}/mo`;
      const dscr = r.monthlyPayment > 0 ? `, DSCR ${r.dscr.toFixed(2)}` : "";
      setLiveMsg(
        `Adjusted: cash flow ${cf}, cap rate ${r.capRate.toFixed(1)}%, cash-on-cash ${r.cocReturn.toFixed(1)}%${dscr}. Verdict: ${tier}.`
      );
    }, 350);
    return () => window.clearTimeout(id);
  }, [adjustedResult, isAdjusted, tier]);

  const tierToneClass = TIER_TONE[tier];

  return (
    <div className="rounded-2xl border border-border bg-card/60 p-3 sm:p-4">
      {/* SR-only running commentary of the adjusted metrics (see liveMsg). */}
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {liveMsg}
      </span>
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
            {formatAdjustmentLabel(rentPct, pricePct, ratePp, vacancyPp)}
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

      {/* One-tap scenario presets. "Worst case" composes the downside
          bundle nobody drags by hand; "Base case" returns to actuals. */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={applyWorstCase}
          aria-pressed={isWorstCase}
          className={`inline-flex min-h-11 items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold transition-colors ${
            isWorstCase
              ? "border-primary bg-primary/10 text-primary"
              : "border-border bg-background text-foreground/80 hover:bg-muted"
          }`}
        >
          <CloudRain className="size-3.5" aria-hidden />
          Worst case
          <span className="font-normal text-muted-foreground">
            {isCashPurchase ? "rent −10% · vacancy +5pp" : "rent −10% · vacancy +5pp · rate +1pp"}
          </span>
        </button>
        <button
          type="button"
          onClick={reset}
          aria-pressed={!isAdjusted}
          disabled={!isAdjusted}
          className={`inline-flex min-h-11 items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold transition-colors ${
            !isAdjusted
              ? "border-primary bg-primary/10 text-primary"
              : "border-border bg-background text-foreground/80 hover:bg-muted"
          }`}
        >
          Base case
        </button>
        {isCashPurchase ? (
          <span className="text-[10px] text-muted-foreground">
            Cash purchase — no loan, so rate stress is skipped.
          </span>
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
        {!isCashPurchase ? (
          <SliderRow
            label="Interest rate"
            value={ratePp}
            unit="pp"
            min={-2}
            max={2}
            step={0.25}
            decimals={2}
            showSign
            onChange={setRatePp}
            ariaText={`Interest rate adjusted by ${ratePp >= 0 ? "+" : ""}${ratePp} percentage points`}
          />
        ) : null}
        <SliderRow
          label="Vacancy"
          value={vacancyPp}
          unit="pp"
          min={-5}
          max={15}
          step={1}
          showSign
          onChange={setVacancyPp}
          ariaText={`Vacancy adjusted by ${vacancyPp >= 0 ? "+" : ""}${vacancyPp} percentage points`}
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

/** "rent −10% · vacancy +5pp · rate +1pp" style summary of the current
 *  adjustments. Exported so the survivability card can echo the scenario. */
export function formatAdjustmentLabel(
  rentPct: number,
  pricePct: number,
  ratePp = 0,
  vacancyPp = 0
): string {
  const parts: string[] = [];
  if (rentPct !== 0) parts.push(`rent ${rentPct > 0 ? "+" : ""}${rentPct}%`);
  if (pricePct !== 0) parts.push(`price ${pricePct > 0 ? "+" : ""}${pricePct}%`);
  if (vacancyPp !== 0) parts.push(`vacancy ${vacancyPp > 0 ? "+" : ""}${vacancyPp}pp`);
  if (ratePp !== 0) parts.push(`rate ${ratePp > 0 ? "+" : ""}${ratePp}pp`);
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
      {/* min-h-[44px] flex wrapper gives the thin track a full 44px vertical
          touch band (WCAG 2.5.5); the real thumb is defined by .whatif-range in
          globals.css since appearance-none strips the native one. */}
      <div className="flex min-h-[44px] items-center">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          aria-label={`${label} adjustment`}
          aria-valuetext={ariaText}
          className="whatif-range h-2 w-full cursor-pointer appearance-none rounded-full bg-muted"
        />
      </div>
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
