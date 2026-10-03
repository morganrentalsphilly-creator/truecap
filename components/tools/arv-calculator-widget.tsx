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
 *
 * Set on the calculator parts (components/tools/tool-parts.tsx), like the 1%
 * rule widget: the frame opens on the 2px ink rule with no card, the fields
 * are the shared ToolNumberField, the ARV is the key figure in DM Mono over
 * the double rule, in ink, and the other figures are rows on rules. Green
 * and orange belong to the comps-range check, a pass or a miss, and to the
 * warnings. The grids read the frame's own width (@container), so the
 * widget lays out the same in the tool page's hero column and in the /embed
 * iframe.
 */

import { useId, useMemo, useState } from "react";
import { AnalyzerHandoffLink } from "@/components/analyzer-handoff-link";
import {
  LedgerFigure,
  LedgerTotal,
  LedgerVerdict,
} from "@/components/ledger/ledger-parts";
import { ToolNumberField } from "@/components/tools/tool-number-field";
import { ToolFrame } from "@/components/tools/tool-parts";
import { buttonVariants } from "@/components/ui/button";
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

  const headingId = useId();
  const handoffNoteId = useId();

  // Do not carry a rule-of-thumb screen into underwriting as though it were a
  // verified purchase price. The analyzer starts separately and asks for the
  // actual price being evaluated.
  const handoffHref = buildAnalyzerHandoffUrl(
    {},
    { utmSource: "arv-calculator" },
  );

  return (
    // The page and the /embed iframe both show an H1 naming the calculator,
    // so the widget's own heading is for the outline only.
    <ToolFrame aria-labelledby={headingId}>
      <h2 id={headingId} className="sr-only">
        ARV + 70% rule calculator
      </h2>

      <p className="text-base font-semibold text-foreground">
        Sold comps — renovated, recent, nearby
      </p>
      {/* A comp is a row: its sale price beside its square footage, at every
          width. */}
      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-5">
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

      <p className="mt-8 text-base font-semibold text-foreground">
        Your property + the rule
      </p>
      <div className="mt-3 grid grid-cols-[minmax(0,1fr)] gap-x-4 gap-y-5 @sm:grid-cols-2 @2xl:grid-cols-3">
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
          step={1}
          max={100}
          error={errors.multiplier}
        />
      </div>

      {/* The result opens on the rule under the fields. */}
      <div className="mt-8 border-t border-border pt-5">
        {/* One polite status line when the result changes, for screen
            readers; the visible figures below stay as they were. The figure
            block is therefore not ToolResult, whose own live region would
            read the result a second time. */}
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
          <p className="text-pretty text-base leading-relaxed text-muted-foreground">
            Fix the highlighted inputs to estimate ARV.
          </p>
        ) : result === null || priceScreen === null ? (
          <p className="max-w-[46ch] text-pretty text-base leading-relaxed text-muted-foreground">
            Enter at least one sold comp (sale price + square footage) and your
            property&apos;s finished square footage to estimate ARV.
          </p>
        ) : (
          <>
            {/* The ARV is the key figure, in DM Mono over the double rule, in
                ink; the two figures it leads to follow as ruled rows. */}
            <Metric label="Estimated ARV" value={fmt(result.arv)} />
            <div className="mt-5 border-t border-border">
              <Row
                label="Avg comp $/sq ft"
                value={`$${result.avgPpsf.toFixed(2)}`}
                bold
              />
              <Row
                label={`70%-rule price screen (${num(multiplier)}%)`}
                value={priceScreen}
                bold
              />
            </div>

            {/* Sanity check straight from the comps method: a credible ARV
                sits inside the range the comps actually sold in. A pass or a
                miss against that range, so it takes the verdict colors. */}
            <p className="mt-4 max-w-[68ch] text-pretty text-sm">
              {result.arv > result.maxCompPrice ? (
                <LedgerVerdict pass={false}>
                  Sanity check: this ARV is ABOVE every comp&apos;s actual sale
                  price ({fmt(result.minCompPrice)}–{fmt(result.maxCompPrice)}).
                  Be suspicious — check the subject square footage and whether the
                  comps are truly comparable before trusting it.
                </LedgerVerdict>
              ) : result.arv < result.minCompPrice ? (
                <LedgerVerdict pass={false}>
                  Sanity check: this ARV is below every comp&apos;s actual sale
                  price ({fmt(result.minCompPrice)}–{fmt(result.maxCompPrice)}).
                  That can happen when the subject is much smaller than the comps
                  — stay within about ±20% of your square footage when picking
                  them.
                </LedgerVerdict>
              ) : (
                <LedgerVerdict pass>
                  Sanity check passed: the ARV sits inside your comps&apos; actual
                  sale range ({fmt(result.minCompPrice)}–
                  {fmt(result.maxCompPrice)}).
                </LedgerVerdict>
              )}
            </p>

            {result.mao <= 0 && (
              <p className="mt-3 max-w-[68ch] text-pretty text-sm">
                <LedgerVerdict pass={false}>
                  At this multiplier the repairs consume the entire allowable
                  price — the rule produces no feasible price screen for this deal
                  as entered.
                </LedgerVerdict>
              </p>
            )}
            {result.mao > 0 && result.arv < 150_000 && (
              <p className="mt-3 max-w-[68ch] text-pretty text-sm">
                <LedgerVerdict pass={false}>
                  Sub-$150k ARV: fixed costs (title, permits, utilities,
                  insurance) eat a big share of a small spread — many flippers
                  drop the multiplier to 60–65% here.
                </LedgerVerdict>
              </p>
            )}
            {result.mao > 0 && result.arv > 600_000 && (
              <p className="mt-3 max-w-[68ch] text-pretty text-sm font-semibold text-muted-foreground">
                $600k+ ARV with a light rehab can justify 72–75% — but a thinner
                margin needs a tighter rehab number and a faster exit.
              </p>
            )}

            <div className="mt-6">
              <p className="border-b border-border pb-2 text-sm font-semibold text-foreground">
                Comp breakdown
              </p>
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
          (the 1% rule widget's pattern). The line names the price screen and
          does not point "above": it also shows while a field is in error or
          empty, when no price screen is on the page. */}
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
        The 70%-rule price screen is a rule of thumb and does not carry over.
        Enter the price you are evaluating.
      </p>
    </ToolFrame>
  );
}

/** What every field takes so an out-of-range value is marked and announced. */
type FieldBounds = {
  max: number;
  /** The validation message, or null while the value is in range. */
  error: string | null;
};

type FieldProps = {
  label: string;
  value: string;
  setValue: (v: string) => void;
} & FieldBounds;

/**
 * The three kinds of field, each the shared ToolNumberField (the label tied
 * to the input, the 48px field, aria-invalid and the message with
 * role="alert") under an id of its own.
 */
function Money({ label, value, setValue, max, error }: FieldProps) {
  const id = useId();
  return (
    <ToolNumberField
      id={id}
      label={label}
      prefix="$"
      min={0}
      max={max}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      error={error}
    />
  );
}
function Pct({
  label,
  value,
  setValue,
  step = 0.5,
  max,
  error,
}: FieldProps & { step?: number }) {
  const id = useId();
  return (
    <ToolNumberField
      id={id}
      label={label}
      suffix="%"
      min={0}
      max={max}
      step={step}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      error={error}
    />
  );
}
function Plain({ label, value, setValue, max, error }: FieldProps) {
  const id = useId();
  return (
    <ToolNumberField
      id={id}
      label={label}
      min={0}
      max={max}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      error={error}
    />
  );
}
/** The key figure: its sentence-case label, then DM Mono over the double rule. */
function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm leading-snug font-semibold text-foreground">
        {label}
      </p>
      {/* The color sits on the line, not on LedgerTotal (see ToolResult). */}
      <p className="mt-3 wrap-anywhere text-foreground">
        <LedgerTotal className="text-key-sm sm:text-key">{value}</LedgerTotal>
      </p>
    </div>
  );
}
/** A ruled row: what was measured, then its figure in DM Mono. */
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
    <div className="flex justify-between gap-3 border-b border-rule-soft py-2 text-sm">
      <span className={bold ? "text-foreground" : "text-muted-foreground"}>
        {label}
      </span>
      <LedgerFigure
        className={cn("shrink-0 text-foreground", bold && "font-semibold")}
      >
        {value}
      </LedgerFigure>
    </div>
  );
}
