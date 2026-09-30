"use client";

/**
 * 1% rule calculator widget — simple pass/fail screener.
 * Rent ÷ price × 100. Passes if ≥ 1%.
 *
 * Set on the calculator parts (components/tools/tool-parts.tsx): the frame
 * opens on the 2px ink rule with no card; the two fields are the shared
 * ToolNumberField; the ratio is the key figure in DM Mono over the double
 * rule, in ink; only the verdict takes a color, green for a pass and orange
 * for a miss (LedgerVerdict), because it is a pass or miss against the rule.
 * The frame's grid reads its own width (@container), so the same widget
 * lays out in the tool page's hero column and in the /embed iframe.
 */

import { useMemo, useState } from "react";
import { AnalyzerHandoffLink } from "@/components/analyzer-handoff-link";
import { LedgerVerdict } from "@/components/ledger/ledger-parts";
import { ToolNumberField } from "@/components/tools/tool-number-field";
import { ToolFrame, ToolResult } from "@/components/tools/tool-parts";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { buildAnalyzerHandoffUrl } from "@/lib/analyzer-handoff";

const num = (s: string) => {
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
};

export function OnePercentRuleWidget() {
  const [price, setPrice] = useState("180000");
  const [rent, setRent] = useState("1900");

  // `ratio` is NULL when there is nothing to divide by — never 0.
  //
  // It used to fall back to 0, so clearing the pre-filled price (the most
  // ordinary thing a visitor does before typing their own) rendered "0.00%" in
  // failure red with the verdict "Fails 1% rule" and a confident reason, about
  // a property whose price the tool did not have. A free screening tool
  // asserting a wrong verdict is the worst possible first touch, and this is an
  // organic-entry page.
  const { ratio, passes } = useMemo(() => {
    const p = num(price);
    const r = num(rent);
    if (!(p > 0) || !(r > 0)) return { ratio: null, passes: false };
    const value = (r / p) * 100;
    return { ratio: value, passes: value >= 1 };
  }, [price, rent]);
  const hasResult = ratio !== null;

  // Carry the user's price + rent into the full analyzer (P2-2 handoff).
  const handoffHref = buildAnalyzerHandoffUrl(
    { purchasePrice: num(price), monthlyRent: num(rent) },
    { utmSource: "1-percent-rule-calculator" },
  );

  return (
    // The page and the /embed iframe both show an H1 naming the calculator,
    // so the widget's own heading is for the outline only.
    <ToolFrame aria-labelledby="onepct-heading">
      <h2 id="onepct-heading" className="sr-only">
        1% rule calculator
      </h2>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-x-8 gap-y-6 @lg:grid-cols-2">
        <div className="min-w-0 space-y-5">
          <ToolNumberField
            id="onepct-price"
            label="Purchase price"
            prefix="$"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            error={null}
          />
          <ToolNumberField
            id="onepct-rent"
            label="Monthly rent"
            prefix="$"
            value={rent}
            onChange={(e) => setRent(e.target.value)}
            error={null}
          />
        </div>

        {/* On one column the result opens on the rule under the fields. */}
        <ToolResult
          className="border-t border-border pt-5 @lg:border-t-0 @lg:pt-0"
          label="Rent / price"
          figure={hasResult ? `${ratio.toFixed(2)}%` : "—"}
          pending={!hasResult}
          // No verdict without a result. An em-dash placeholder plus a
          // corrective sentence is the contract Break-Even already uses.
          verdict={
            hasResult ? (
              passes ? (
                <LedgerVerdict pass>Passes 1% rule</LedgerVerdict>
              ) : (
                <LedgerVerdict pass={false}>Fails 1% rule</LedgerVerdict>
              )
            ) : null
          }
          note={
            !hasResult
              ? "Enter a purchase price and monthly rent to calculate."
              : passes
                ? "Run a full underwrite — this property may cash-flow well."
                : "Either this is an appreciation play, or the price is too high relative to rent."
          }
        />
      </div>

      {/* The action is one line, sized to its label from 640px and full
          width on phones; what the analysis adds is the line under it, which
          aria-describedby reads with the link. */}
      <AnalyzerHandoffLink
        handoffHref={handoffHref}
        target="_top"
        aria-describedby="onepct-handoff-note"
        className={cn(buttonVariants({ size: "cta" }), "mt-6 w-full sm:w-auto")}
      >
        Run the full analysis with these numbers
      </AnalyzerHandoffLink>
      <p id="onepct-handoff-note" className="mt-2 text-pretty text-sm text-muted-foreground">
        cap rate, CoC, DSCR, and cash flow — free in TrueCap
      </p>

      {/* The caveat closes the widget at the reading measure, after the
          action, so the fields lead straight to the result (on phones too)
          and the two columns end together. It stays in the widget, so the
          /embed iframe keeps it. */}
      <p className="mt-6 max-w-[68ch] text-pretty text-sm text-muted-foreground">
        The 1% rule is a screening filter, not an investment decision. A
        property that passes is worth a deeper underwrite. A property that
        fails isn&apos;t necessarily a bad deal — appreciation markets often
        fail the 1% rule for good reason.
      </p>
    </ToolFrame>
  );
}
