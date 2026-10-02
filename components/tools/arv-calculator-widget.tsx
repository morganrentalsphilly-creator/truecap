"use client";

/**
 * Standalone ARV calculator widget for /tools/arv-calculator.
 *
 * Two calculations, same conventions as the rest of TrueCap:
 *
 *   ARV       = average renovated-comp $/sq ft × subject finished sq ft
 *   Price screen = (ARV × multiplier%) − repair costs   (the 70% rule)
 *
 * The comps method + the worked numbers mirror the how-to-calculate-arv
 * blog post; the max-offer arithmetic mirrors the 70-percent-rule post
 * and lib/fix-flip-analysis.ts (ARV is the resale top line the flip
 * engine subtracts costs from). Like lib/max-allowable-offer.ts, the
 * displayed offer is rounded DOWN to a $500 step — never up, so the
 * widget never quotes a price above the rule's own ceiling.
 */

import { useId, useMemo, useState } from "react";
import { AnalyzerHandoffLink } from "@/components/analyzer-handoff-link";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { buildAnalyzerHandoffUrl } from "@/lib/analyzer-handoff";
import { computeRuleMaxOffer } from "@/components/tools/max-offer-math";
import {
  validateToolNumber,
  type ToolNumberBounds,
} from "@/lib/public-tool-validation";

const num = (s: string) => {
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
};

const fmt = (n: number) =>
  `${n < 0 ? "-" : ""}$${Math.abs(Math.round(n)).toLocaleString("en-US")}`;

// What the fields accept. A negative or out-of-range value gets a visible,
// announced error under its field and the result is withheld; the arithmetic
// is unchanged for every value inside these bounds.
const PRICE_MAX = 100_000_000;
const SQFT_MAX = 100_000;

/**
 * A field that may be left blank (an unused comp, repairs of $0, the subject
 * square footage the empty state already asks for): blank is not an error.
 */
const optionalFieldError = (
  raw: string,
  bounds: ToolNumberBounds,
): string | null =>
  raw.trim() === "" ? null : validateToolNumber(raw, bounds).error;

export type ArvRawInputs = {
  comp1Price: string;
  comp1Sqft: string;
  comp2Price: string;
  comp2Sqft: string;
  comp3Price: string;
  comp3Sqft: string;
  subjectSqft: string;
  repairs: string;
  multiplier: string;
};

/** The message for each field as typed, or null while it is in range. */
export function arvFieldErrors(
  raw: ArvRawInputs,
): Record<keyof ArvRawInputs, string | null> {
  return {
    comp1Price: optionalFieldError(raw.comp1Price, {
      label: "Comp 1 sale price",
      min: 0,
      max: PRICE_MAX,
    }),
    comp1Sqft: optionalFieldError(raw.comp1Sqft, {
      label: "Comp 1 square footage",
      min: 0,
      max: SQFT_MAX,
    }),
    comp2Price: optionalFieldError(raw.comp2Price, {
      label: "Comp 2 sale price",
      min: 0,
      max: PRICE_MAX,
    }),
    comp2Sqft: optionalFieldError(raw.comp2Sqft, {
      label: "Comp 2 square footage",
      min: 0,
      max: SQFT_MAX,
    }),
    comp3Price: optionalFieldError(raw.comp3Price, {
      label: "Comp 3 sale price",
      min: 0,
      max: PRICE_MAX,
    }),
    comp3Sqft: optionalFieldError(raw.comp3Sqft, {
      label: "Comp 3 square footage",
      min: 0,
      max: SQFT_MAX,
    }),
    subjectSqft: optionalFieldError(raw.subjectSqft, {
      label: "Subject finished square footage",
      min: 0,
      max: SQFT_MAX,
    }),
    repairs: optionalFieldError(raw.repairs, {
      label: "Repair costs",
      min: 0,
      max: PRICE_MAX,
    }),
    // The rule needs a multiplier: blank is an error here, and so is 0.
    multiplier: validateToolNumber(raw.multiplier, {
      label: "Rule multiplier",
      min: 0,
      minExclusive: true,
      max: 100,
    }).error,
  };
}

export function ArvCalculatorWidget() {
  // Defaults = the first three comps from the how-to-calculate-arv guide's
  // worked example (1,400 sq ft subject, $45k rehab), so the tool page's
  // article and the live widget describe the same deal.
  const [subjectSqft, setSubjectSqft] = useState("1400");
  const [repairs, setRepairs] = useState("45000");
  const [multiplier, setMultiplier] = useState("70");
  const [comp1Price, setComp1Price] = useState("262000");
  const [comp1Sqft, setComp1Sqft] = useState("1450");
  const [comp2Price, setComp2Price] = useState("248500");
  const [comp2Sqft, setComp2Sqft] = useState("1350");
  const [comp3Price, setComp3Price] = useState("270000");
  const [comp3Sqft, setComp3Sqft] = useState("1500");

  const errors = useMemo(
    () =>
      arvFieldErrors({
        comp1Price,
        comp1Sqft,
        comp2Price,
        comp2Sqft,
        comp3Price,
        comp3Sqft,
        subjectSqft,
        repairs,
        multiplier,
      }),
    [
      subjectSqft,
      repairs,
      multiplier,
      comp1Price,
      comp1Sqft,
      comp2Price,
      comp2Sqft,
      comp3Price,
      comp3Sqft,
    ],
  );
  const hasErrors = Object.values(errors).some((error) => error !== null);

  const result = useMemo(() => {
    if (hasErrors) return null;
    const comps = [
      { price: num(comp1Price), sqft: num(comp1Sqft) },
      { price: num(comp2Price), sqft: num(comp2Sqft) },
      { price: num(comp3Price), sqft: num(comp3Sqft) },
    ].filter((c) => c.price > 0 && c.sqft > 0);
    const sqft = num(subjectSqft);
    if (comps.length === 0 || sqft <= 0) return null;

    const ppsfs = comps.map((c) => c.price / c.sqft);
    const avgPpsf = ppsfs.reduce((a, b) => a + b, 0) / ppsfs.length;
    const arv = avgPpsf * sqft;
    // Shared with the 70% rule widget — rounds DOWN to a $500 step
    // (lib/max-allowable-offer.ts convention): rounding to nearest could
    // quote an offer ABOVE the rule's ceiling.
    const mao = computeRuleMaxOffer(arv, num(multiplier), num(repairs));
    const compPrices = comps.map((c) => c.price);
    return {
      comps,
      ppsfs,
      avgPpsf,
      arv,
      mao,
      minCompPrice: Math.min(...compPrices),
      maxCompPrice: Math.max(...compPrices),
    };
  }, [
    hasErrors,
    subjectSqft,
    repairs,
    multiplier,
    comp1Price,
    comp1Sqft,
    comp2Price,
    comp2Sqft,
    comp3Price,
    comp3Sqft,
  ]);

  // The rule gives no price when repairs use up the whole allowance. The
  // sentence under the figures says so; the figure itself is a placeholder,
  // never a negative price.
  const priceScreen =
    result === null ? null : result.mao > 0 ? fmt(result.mao) : "—";

  const handoffNoteId = useId();

  // Do not carry a rule-of-thumb screen into underwriting as though it were a
  // verified purchase price. The analyzer starts separately and asks for the
  // actual price being evaluated.
  const handoffHref = buildAnalyzerHandoffUrl(
    {},
    { utmSource: "arv-calculator" },
  );

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm p-5 sm:p-7">
      <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-4">
        ARV + 70% Rule Calculator
      </h2>

      <p className="text-2xs font-bold uppercase tracking-widest text-muted-foreground mb-2">
        Sold comps — renovated, recent, nearby
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mb-4">
        <Money
          label="Comp 1 sale price"
          value={comp1Price}
          setValue={setComp1Price}
          max={PRICE_MAX}
          error={errors.comp1Price}
        />
        <Plain
          label="Comp 1 sq ft"
          value={comp1Sqft}
          setValue={setComp1Sqft}
          max={SQFT_MAX}
          error={errors.comp1Sqft}
        />
        <Money
          label="Comp 2 sale price"
          value={comp2Price}
          setValue={setComp2Price}
          max={PRICE_MAX}
          error={errors.comp2Price}
        />
        <Plain
          label="Comp 2 sq ft"
          value={comp2Sqft}
          setValue={setComp2Sqft}
          max={SQFT_MAX}
          error={errors.comp2Sqft}
        />
        <Money
          label="Comp 3 sale price"
          value={comp3Price}
          setValue={setComp3Price}
          max={PRICE_MAX}
          error={errors.comp3Price}
        />
        <Plain
          label="Comp 3 sq ft"
          value={comp3Sqft}
          setValue={setComp3Sqft}
          max={SQFT_MAX}
          error={errors.comp3Sqft}
        />
      </div>

      <p className="text-2xs font-bold uppercase tracking-widest text-muted-foreground mb-2">
        Your property + the rule
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mb-4">
        <Plain
          label="Subject finished sq ft"
          value={subjectSqft}
          setValue={setSubjectSqft}
          max={SQFT_MAX}
          error={errors.subjectSqft}
        />
        <Money
          label="Repair costs"
          value={repairs}
          setValue={setRepairs}
          max={PRICE_MAX}
          error={errors.repairs}
        />
        <Pct
          label="Rule multiplier"
          value={multiplier}
          setValue={setMultiplier}
          step="1"
          max={100}
          error={errors.multiplier}
        />
      </div>

      <div className="rounded-xl border border-border bg-[var(--background)] p-5 sm:p-6 space-y-4">
        {/* One polite status line when the result changes, for screen
            readers; the visible figures below stay as they were. */}
        <span
          className="sr-only"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          {hasErrors
            ? "Fix the highlighted inputs to estimate ARV."
            : result === null
              ? "Enter a sold comp and your property's finished square footage to estimate ARV."
              : result.mao > 0
                ? `Estimated ARV ${fmt(result.arv)}. 70%-rule price screen ${fmt(result.mao)}.`
                : `Estimated ARV ${fmt(result.arv)}. No feasible price screen at this multiplier.`}
        </span>
        {hasErrors ? (
          <p className="text-sm text-muted-foreground">
            Fix the highlighted inputs to estimate ARV.
          </p>
        ) : result === null || priceScreen === null ? (
          <p className="text-sm text-muted-foreground">
            Enter at least one sold comp (sale price + square footage) and your
            property&apos;s finished square footage to estimate ARV.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
              <Metric label="Estimated ARV" value={fmt(result.arv)} />
              <Metric
                label="Avg comp $/sq ft"
                value={`$${result.avgPpsf.toFixed(2)}`}
              />
              <Metric
                label={`70%-rule price screen (${num(multiplier)}%)`}
                value={priceScreen}
                positive={result.mao > 0}
                negative={result.mao <= 0}
              />
            </div>

            {/* Sanity check straight from the comps method: a credible ARV
                sits inside the range the comps actually sold in. */}
            {result.arv > result.maxCompPrice ? (
              <p className="text-xs font-semibold text-caution-text">
                Sanity check: this ARV is ABOVE every comp&apos;s actual sale
                price ({fmt(result.minCompPrice)}–{fmt(result.maxCompPrice)}).
                Be suspicious — check the subject square footage and whether the
                comps are truly comparable before trusting it.
              </p>
            ) : result.arv < result.minCompPrice ? (
              <p className="text-xs font-semibold text-caution-text">
                Sanity check: this ARV is below every comp&apos;s actual sale
                price ({fmt(result.minCompPrice)}–{fmt(result.maxCompPrice)}).
                That can happen when the subject is much smaller than the comps
                — stay within about ±20% of your square footage when picking
                them.
              </p>
            ) : (
              <p className="text-xs font-semibold text-[var(--metric-positive)]">
                Sanity check passed: the ARV sits inside your comps&apos; actual
                sale range ({fmt(result.minCompPrice)}–
                {fmt(result.maxCompPrice)}).
              </p>
            )}

            {result.mao <= 0 && (
              <p className="text-xs font-semibold text-[var(--metric-negative)]">
                At this multiplier the repairs consume the entire allowable
                price — the rule produces no feasible price screen for this deal
                as entered.
              </p>
            )}
            {result.mao > 0 && result.arv < 150_000 && (
              <p className="text-xs font-semibold text-caution-text">
                Sub-$150k ARV: fixed costs (title, permits, utilities,
                insurance) eat a big share of a small spread — many flippers
                drop the multiplier to 60–65% here.
              </p>
            )}
            {result.mao > 0 && result.arv > 600_000 && (
              <p className="text-xs font-semibold text-muted-foreground">
                $600k+ ARV with a light rehab can justify 72–75% — but a thinner
                margin needs a tighter rehab number and a faster exit.
              </p>
            )}

            <div className="text-xs">
              <div className="text-3xs uppercase tracking-widest text-muted-foreground font-bold mb-1.5">
                Comp breakdown
              </div>
              {result.comps.map((c, i) => (
                <Row
                  key={i}
                  label={`Comp ${i + 1} — ${fmt(c.price)} ÷ ${c.sqft.toLocaleString("en-US")} sq ft`}
                  value={`$${result.ppsfs[i].toFixed(2)}/sq ft`}
                />
              ))}
              <Row
                label={`ARV — $${result.avgPpsf.toFixed(2)} × ${num(subjectSqft).toLocaleString("en-US")} sq ft`}
                value={fmt(result.arv)}
                bold
              />
              <Row
                label={`70%-rule price screen — ${num(multiplier)}% of ARV − ${fmt(num(repairs))} repairs, rounded down to $500`}
                value={priceScreen}
                bold
              />
            </div>
          </>
        )}
      </div>

      {/* One plain action, then one line saying what does not carry over
          (the 1% rule widget's pattern). */}
      <AnalyzerHandoffLink
        handoffHref={handoffHref}
        target="_top"
        aria-describedby={handoffNoteId}
        className={cn(buttonVariants({ size: "cta" }), "mt-6 w-full sm:w-auto")}
      >
        Open the rental analyzer
      </AnalyzerHandoffLink>
      <p
        id={handoffNoteId}
        className="mt-2 text-pretty text-sm text-muted-foreground"
      >
        The price screen above is a rule of thumb and does not carry over.
        Enter the price you are evaluating.
      </p>
    </div>
  );
}

/** What every field takes so an out-of-range value is marked and announced. */
type FieldBounds = {
  max: number;
  /** The validation message, or null while the value is in range. */
  error: string | null;
};

/** The error line under a field; role="alert" so it is read when it appears. */
function FieldError({ id, error }: { id: string; error: string | null }) {
  if (!error) return null;
  return (
    <p id={id} role="alert" className="mt-1.5 text-sm text-destructive-text">
      {error}
    </p>
  );
}

function Money({
  label,
  value,
  setValue,
  max,
  error,
}: {
  label: string;
  value: string;
  setValue: (v: string) => void;
} & FieldBounds) {
  const id = useId();
  const errorId = `${id}-error`;
  return (
    <div>
      <Label
        htmlFor={id}
        className="text-2xs font-bold uppercase tracking-widest text-muted-foreground mb-1 block"
      >
        {label}
      </Label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
          $
        </span>
        <Input
          id={id}
          type="number"
          inputMode="numeric"
          min={0}
          max={max}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            "pl-7 border-input bg-background",
            error && "border-destructive",
          )}
        />
      </div>
      <FieldError id={errorId} error={error} />
    </div>
  );
}
function Pct({
  label,
  value,
  setValue,
  step = "0.5",
  max,
  error,
}: {
  label: string;
  value: string;
  setValue: (v: string) => void;
  step?: string;
} & FieldBounds) {
  const id = useId();
  const errorId = `${id}-error`;
  return (
    <div>
      <Label
        htmlFor={id}
        className="text-2xs font-bold uppercase tracking-widest text-muted-foreground mb-1 block"
      >
        {label}
      </Label>
      <div className="relative">
        <Input
          id={id}
          type="number"
          inputMode="decimal"
          step={step}
          min={0}
          max={max}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            "pr-8 border-input bg-background",
            error && "border-destructive",
          )}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
          %
        </span>
      </div>
      <FieldError id={errorId} error={error} />
    </div>
  );
}
function Plain({
  label,
  value,
  setValue,
  max,
  error,
}: {
  label: string;
  value: string;
  setValue: (v: string) => void;
} & FieldBounds) {
  const id = useId();
  const errorId = `${id}-error`;
  return (
    <div>
      <Label
        htmlFor={id}
        className="text-2xs font-bold uppercase tracking-widest text-muted-foreground mb-1 block"
      >
        {label}
      </Label>
      <Input
        id={id}
        type="number"
        inputMode="numeric"
        min={0}
        max={max}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={cn(
          "border-input bg-background",
          error && "border-destructive",
        )}
      />
      <FieldError id={errorId} error={error} />
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
      <div className="text-3xs uppercase tracking-widest text-muted-foreground font-bold">
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
    <div className="flex justify-between py-0.5 gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={cn(
          "tabular-nums shrink-0",
          bold ? "font-bold text-foreground" : "text-foreground",
        )}
      >
        {value}
      </span>
    </div>
  );
}
