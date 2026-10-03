"use client";

/**
 * 2% rule calculator widget — the strict cash-flow-market screener.
 * Rent ÷ price × 100, judged against the 2% bar (with the 1% bar as
 * context — same ratio, different threshold).
 *
 * Stance mirrors the 1-percent-rule page's 2%-rule FAQ: very few US
 * properties hit 2% in 2026, and most that do are in distressed
 * neighborhoods where management headaches eat the cash flow — so a
 * pass here gets a caution, not a celebration. No pass/fail thresholds
 * are invented: 2% and 1% are the rules' own definitions.
 *
 * Set on the calculator parts (components/tools/tool-parts.tsx), like the
 * 1% rule widget: the frame opens on the 2px ink rule with no card, the two
 * fields are the shared ToolNumberField, the ratio is the key figure in DM
 * Mono over the double rule, in ink, and only the verdict takes a color
 * (LedgerVerdict): green when the ratio clears the 1% bar and stays under
 * 2%, orange when it misses 1% and when it clears 2%, because clearing 2%
 * is the caution this widget exists to give. The grid reads the frame's own
 * width (@container), so the widget lays out the same in the tool page's
 * hero column and in the /embed iframe.
 */

import { useMemo, useState } from "react";
import { AnalyzerHandoffLink } from "@/components/analyzer-handoff-link";
import { LedgerVerdict } from "@/components/ledger/ledger-parts";
import { ToolNumberField } from "@/components/tools/tool-number-field";
import { ToolFrame, ToolResult } from "@/components/tools/tool-parts";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { buildAnalyzerHandoffUrl } from "@/lib/analyzer-handoff";
import { validateToolNumber } from "@/lib/public-tool-validation";

// What the two fields accept: the 1% rule widget's bounds. The upper bounds
// are the analyzer handoff's (lib/analyzer-handoff.ts).
const PRICE_BOUNDS = {
  label: "Purchase price",
  min: 0,
  minExclusive: true,
  max: 100_000_000,
} as const;
const RENT_BOUNDS = {
  label: "Monthly rent",
  min: 0,
  minExclusive: true,
  max: 1_000_000,
} as const;

/**
 * A cleared field is not an error: the result's own line already asks for
 * both numbers. Zero, a negative or an out-of-range value is, and gets a
 * visible, announced message under the field.
 */
const fieldError = (
  raw: string,
  bounds: typeof PRICE_BOUNDS | typeof RENT_BOUNDS,
): string | null =>
  raw.trim() === "" ? null : validateToolNumber(raw, bounds).error;

/** The message for each field as typed, or null while it is in range. */
export function twoPercentRuleFieldErrors(raw: { price: string; rent: string }) {
  return {
    price: fieldError(raw.price, PRICE_BOUNDS),
    rent: fieldError(raw.rent, RENT_BOUNDS),
  };
}

const num = (s: string) => {
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
};

export function TwoPercentRuleWidget() {
  const [price, setPrice] = useState("120000");
  const [rent, setRent] = useState("1500");

  const { price: priceError, rent: rentError } = twoPercentRuleFieldErrors({
    price,
    rent,
  });
  const hasFieldError = priceError !== null || rentError !== null;

  // NULL, not 0, when there is nothing to divide by — see the same fix in
  // one-percent-rule-widget. A 0 fallback made a cleared price render
  // "0.00%" and "Below the 1% rule" about a property with no price.
  const { ratio, meetsTwo, meetsOne } = useMemo(() => {
    // No ratio from a value the fields reject.
    if (hasFieldError) return { ratio: null, meetsTwo: false, meetsOne: false };
    const p = num(price);
    const r = num(rent);
    if (!(p > 0) || !(r > 0))
      return { ratio: null, meetsTwo: false, meetsOne: false };
    const value = (r / p) * 100;
    return { ratio: value, meetsTwo: value >= 2, meetsOne: value >= 1 };
  }, [hasFieldError, price, rent]);
  const hasResult = ratio !== null;

  // Carry the user's price + rent into the full analyzer (P2-2 handoff).
  const handoffHref = buildAnalyzerHandoffUrl(
    { purchasePrice: num(price), monthlyRent: num(rent) },
    { utmSource: "2-percent-rule-calculator" },
  );

  return (
    // The page and the /embed iframe both show an H1 naming the calculator,
    // so the widget's own heading is for the outline only.
    <ToolFrame aria-labelledby="twopct-heading">
      <h2 id="twopct-heading" className="sr-only">
        2% rule calculator
      </h2>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-x-8 gap-y-6 @lg:grid-cols-2">
        <div className="min-w-0 space-y-5">
          <ToolNumberField
            id="twopct-price"
            label="Purchase price"
            prefix="$"
            min={0}
            max={PRICE_BOUNDS.max}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            error={priceError}
          />
          <ToolNumberField
            id="twopct-rent"
            label="Monthly rent"
            prefix="$"
            min={0}
            max={RENT_BOUNDS.max}
            value={rent}
            onChange={(e) => setRent(e.target.value)}
            error={rentError}
          />
        </div>

        {/* On one column the result opens on the rule under the fields. */}
        <ToolResult
          className="border-t border-border pt-5 @lg:border-t-0 @lg:pt-0"
          label="Rent / price"
          figure={hasResult ? `${ratio.toFixed(2)}%` : "—"}
          pending={!hasResult}
          // No verdict without a result: the placeholder and the corrective
          // sentence stand alone, as on the 1% rule widget.
          verdict={
            hasResult ? (
              meetsTwo ? (
                <LedgerVerdict pass={false}>
                  Meets the 2% rule — verify why
                </LedgerVerdict>
              ) : meetsOne ? (
                <LedgerVerdict pass>Passes 1%, below 2%</LedgerVerdict>
              ) : (
                <LedgerVerdict pass={false}>Below the 1% rule</LedgerVerdict>
              )
            ) : null
          }
          note={
            hasFieldError
              ? "Fix the highlighted input to calculate."
              : !hasResult
                ? "Enter a purchase price and monthly rent to calculate."
                : meetsTwo
                  ? "A ratio this high usually signals a distressed area, deferred maintenance, or optimistic rent — underwrite before celebrating."
                  : meetsOne
                    ? "Strong screening territory for a cash-flow market — worth the full underwrite."
                    : "Either an appreciation play, or the price is too high relative to rent."
          }
        />
      </div>

      {/* The action is one line, sized to its label from 640px and full
          width on phones; what the analysis adds is the line under it, which
          aria-describedby reads with the link. The words are the ones the
          old text link ran together. */}
      <AnalyzerHandoffLink
        handoffHref={handoffHref}
        target="_top"
        aria-describedby="twopct-handoff-note"
        className={cn(buttonVariants({ size: "cta" }), "mt-6 w-full sm:w-auto")}
      >
        Run the full analysis with these numbers
      </AnalyzerHandoffLink>
      <p id="twopct-handoff-note" className="mt-2 text-pretty text-sm text-muted-foreground">
        cap rate, CoC, DSCR, cash flow — free in TrueCap
      </p>

      {/* The caveat closes the widget at the reading measure, after the
          action, so the fields lead straight to the result (on phones too)
          and the two columns end together. It stays in the widget, so the
          /embed iframe keeps it. */}
      <p className="mt-6 max-w-[68ch] text-pretty text-sm text-muted-foreground">
        The 2% rule is the strict version of the 1% rule — a bar so high in
        2026 that clearing it is a reason to look <em>harder</em>, not to
        celebrate. Deals that hit 2% usually carry the risk that explains
        the price.
      </p>
    </ToolFrame>
  );
}
