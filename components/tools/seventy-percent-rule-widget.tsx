"use client";

/**
 * 70% rule calculator widget — the max-offer rule on its own URL.
 *
 * Differs from the ARV calculator widget in scope, not math: this page
 * takes ARV directly and returns a clearly labeled rule-of-thumb price screen,
 * while /tools/arv-calculator builds ARV from sold comps first. The
 * max-offer arithmetic is SHARED via components/tools/max-offer-math.ts
 * (never duplicated), which carries the lib/max-allowable-offer.ts
 * round-DOWN-to-$500 convention.
 *
 * The multiplier ladder (60 / 65 / 70 / 75) mirrors the situation table
 * in the 70-percent-rule blog post — cheap houses push toward 60-65%,
 * expensive light-rehab houses can justify 72-75%. The contextual
 * warnings reuse the same thresholds as the ARV widget so the two
 * pages never disagree about the same deal.
 *
 * Set on the calculator parts (components/tools/tool-parts.tsx), like the 1%
 * rule widget: the frame opens on the 2px ink rule with no card, the fields
 * are the shared ToolNumberField, the price screen is the key figure in DM
 * Mono over the double rule, in ink, and the ladder is rows on rules. Only a
 * warning takes the caution color. The frame's grid reads its own width
 * (@container), so the widget lays out the same in the tool page's hero
 * column and in the /embed iframe.
 */

import { useMemo, useState } from "react";
import { AnalyzerHandoffLink } from "@/components/analyzer-handoff-link";
import { IntentPrefetchLink } from "@/components/marketing/intent-prefetch-link";
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

// What the fields accept, as on the ARV calculator (the two widgets share the
// rule's arithmetic). A negative or out-of-range value gets a visible,
// announced error under its field (ToolNumberField: aria-invalid, and the
// message with role="alert") and the result is withheld; the arithmetic is
// unchanged for every value inside these bounds.
const PRICE_MAX = 100_000_000;

/** Blank is not an error: no ARV yet shows the empty state, blank repairs are $0. */
const optionalFieldError = (
  raw: string,
  bounds: ToolNumberBounds,
): string | null =>
  raw.trim() === "" ? null : validateToolNumber(raw, bounds).error;

export type SeventyPercentRuleRawInputs = {
  arv: string;
  repairs: string;
  multiplier: string;
};

/** The message for each field as typed, or null while it is in range. */
export function seventyPercentRuleFieldErrors(
  raw: SeventyPercentRuleRawInputs,
): Record<keyof SeventyPercentRuleRawInputs, string | null> {
  return {
    arv: optionalFieldError(raw.arv, {
      label: "After-repair value",
      min: 0,
      max: PRICE_MAX,
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

/** The multiplier ladder from the 70-percent-rule post's situation table. */
const LADDER = [60, 65, 70, 75] as const;

export function SeventyPercentRuleWidget() {
  // Defaults = the worked example from the 70-percent-rule blog post
  // ($300k ARV, $45k repairs), so the article and the widget describe
  // the same deal.
  const [arv, setArv] = useState("300000");
  const [repairs, setRepairs] = useState("45000");
  const [multiplier, setMultiplier] = useState("70");

  const errors = useMemo(
    () => seventyPercentRuleFieldErrors({ arv, repairs, multiplier }),
    [arv, repairs, multiplier],
  );
  const hasErrors = Object.values(errors).some((error) => error !== null);

  const result = useMemo(() => {
    if (hasErrors) return null;
    const a = num(arv);
    if (a <= 0) return null;
    const mult = num(multiplier);
    const rep = num(repairs);
    const mao = computeRuleMaxOffer(a, mult, rep);
    // The rule's holdback: everything between your offer + repairs and
    // the resale price. Costs come out of this spread first; margin is
    // what's left.
    const spread = a - (mao > 0 ? mao : 0) - rep;
    const ladder = LADDER.map((pct) => ({
      pct,
      mao: computeRuleMaxOffer(a, pct, rep),
    }));
    return { arv: a, mult, mao, spread, ladder };
  }, [hasErrors, arv, repairs, multiplier]);

  // Never seed this heuristic into the analyzer as a verified purchase price.
  const handoffHref = buildAnalyzerHandoffUrl(
    {},
    { utmSource: "70-percent-rule-calculator" },
  );

  return (
    // The page and the /embed iframe both show an H1 naming the calculator,
    // so the widget's own heading is for the outline only.
    <ToolFrame aria-labelledby="seventypct-heading">
      <h2 id="seventypct-heading" className="sr-only">
        70% rule calculator
      </h2>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-x-8 gap-y-6 @lg:grid-cols-2">
        {/* Inputs */}
        <div className="min-w-0 space-y-5">
          <div>
            <ToolNumberField
              id="seventypct-arv"
              label="After-repair value (ARV)"
              prefix="$"
              min={0}
              max={PRICE_MAX}
              value={arv}
              onChange={(e) => setArv(e.target.value)}
              error={errors.arv}
            />
            {/* Under the field, not in its hint slot: the line carries a
                link, and the field's hint takes a string. */}
            <p className="mt-1.5 text-pretty text-sm text-muted-foreground">
              What the property sells for <em>after</em> the rehab. Don&apos;t
              have it? Build it from sold comps with the{" "}
              <IntentPrefetchLink
                href="/tools/arv-calculator"
                target="_top"
                className="tc-link"
              >
                ARV calculator
              </IntentPrefetchLink>
              .
            </p>
          </div>

          <ToolNumberField
            id="seventypct-repairs"
            label="Repair costs"
            prefix="$"
            min={0}
            max={PRICE_MAX}
            value={repairs}
            onChange={(e) => setRepairs(e.target.value)}
            error={errors.repairs}
          />

          <div>
            <ToolNumberField
              id="seventypct-multiplier"
              label="Rule multiplier"
              suffix="%"
              min={0}
              max={100}
              step={1}
              value={multiplier}
              onChange={(e) => setMultiplier(e.target.value)}
              error={errors.multiplier}
            />
            <p className="mt-1.5 text-pretty text-sm text-muted-foreground">
              70% is the classic center. Cheap houses (&lt;~$150k ARV) push
              toward 60&ndash;65%; expensive houses with light rehabs can
              justify 72&ndash;75%.
            </p>
          </div>
        </div>

        {/* Output: on one column it opens on the rule under the fields. */}
        <div className="min-w-0 border-t border-border pt-5 @lg:border-t-0 @lg:pt-0">
          {/* One polite status line when the result changes, for screen
              readers; the visible figures below stay as they were. The
              figure block is therefore not ToolResult, whose own live
              region would read the result a second time. */}
          <span
            className="sr-only"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            {hasErrors
              ? "Fix the highlighted inputs to calculate the price screen."
              : result === null
                ? "Enter the after-repair value to see the 70%-rule price screen."
                : result.mao > 0
                  ? `70%-rule price screen ${fmt(result.mao)}.`
                  : "No feasible price screen at this multiplier."}
          </span>
          {hasErrors ? (
            <p className="text-pretty text-base leading-relaxed text-muted-foreground">
              Fix the highlighted inputs to calculate the price screen.
            </p>
          ) : result === null ? (
            <p className="text-pretty text-base leading-relaxed text-muted-foreground">
              Enter the after-repair value to see the 70%-rule price screen.
            </p>
          ) : (
            <>
              <p className="text-sm leading-snug font-semibold text-foreground">
                70%-rule price screen ({result.mult}%)
              </p>
              {/* The key figure in DM Mono over the double rule, in ink: a
                  price screen is not a pass or a miss, so it takes no color.
                  The color sits on the line, not on LedgerTotal (see
                  ToolResult). */}
              <p
                className={cn(
                  "mt-3 wrap-anywhere",
                  result.mao > 0 ? "text-foreground" : "text-muted-foreground",
                )}
              >
                <LedgerTotal className="text-key-sm sm:text-key">
                  {/* No price when repairs use up the whole allowance: the
                      sentence below says so, and the figure is a placeholder,
                      never a negative price. */}
                  {result.mao > 0 ? fmt(result.mao) : "—"}
                </LedgerTotal>
              </p>
              <p className="mt-4 text-pretty text-sm text-muted-foreground">
                {result.mult}% of ARV − repairs, rounded down to a $500 step.
              </p>

              {result.mao <= 0 ? (
                <p className="mt-2 max-w-[46ch] text-pretty text-base leading-relaxed">
                  <LedgerVerdict pass={false}>
                    At this multiplier the repairs consume the entire allowable
                    price — the rule produces no feasible price screen for this
                    deal as entered.
                  </LedgerVerdict>
                </p>
              ) : (
                <p className="mt-2 max-w-[46ch] text-pretty text-base leading-relaxed text-muted-foreground">
                  The {fmt(result.spread)} between your all-in cost and the
                  resale price is{" "}
                  <strong className="font-semibold text-foreground">not all profit</strong> —
                  buying, holding, and selling costs come out first.
                </p>
              )}

              {result.mao > 0 && result.arv < 150_000 && (
                <p className="mt-3 max-w-[46ch] text-pretty text-sm">
                  <LedgerVerdict pass={false}>
                    Sub-$150k ARV: fixed costs (title, permits, utilities,
                    insurance) eat a big share of a small spread — many flippers
                    drop the multiplier to 60&ndash;65% here.
                  </LedgerVerdict>
                </p>
              )}
              {result.mao > 0 && result.arv > 600_000 && (
                <p className="mt-3 max-w-[46ch] text-pretty text-sm font-semibold text-muted-foreground">
                  $600k+ ARV with a light rehab can justify 72&ndash;75% — but a
                  thinner margin needs a tighter rehab number and a faster exit.
                </p>
              )}

              {/* The ladder on rules: the label opens it, each multiplier is
                  a row, the figures in DM Mono so they compare down the
                  column. The chosen multiplier's row is the one in 600. */}
              <div className="mt-6">
                <p className="border-b border-border pb-2 text-sm font-semibold text-foreground">
                  Price screen at other multipliers
                </p>
                {result.ladder.map((step) => (
                  <div
                    key={step.pct}
                    className="flex justify-between gap-3 border-b border-rule-soft py-2 text-sm"
                  >
                    <span
                      className={cn(
                        step.pct === result.mult
                          ? "font-semibold text-foreground"
                          : "text-muted-foreground",
                      )}
                    >
                      {step.pct}% of ARV
                    </span>
                    <LedgerFigure
                      className={cn(
                        "shrink-0 text-foreground",
                        step.pct === result.mult && "font-semibold",
                      )}
                    >
                      {step.mao > 0 ? fmt(step.mao) : "no feasible ceiling"}
                    </LedgerFigure>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* One plain action, then one line saying what does not carry over
          (the 1% rule widget's pattern). The line names the price screen and
          does not point "above": it also shows while a field is in error or
          empty, when no price screen is on the page. */}
      <AnalyzerHandoffLink
        handoffHref={handoffHref}
        target="_top"
        aria-describedby="seventypct-handoff-note"
        className={cn(buttonVariants({ size: "cta" }), "mt-6 w-full sm:w-auto")}
      >
        Open the rental analyzer
      </AnalyzerHandoffLink>
      <p
        id="seventypct-handoff-note"
        className="mt-2 text-pretty text-sm text-muted-foreground"
      >
        The 70%-rule price screen is a rule of thumb and does not carry over.
        Enter the price you are evaluating.
      </p>
    </ToolFrame>
  );
}
