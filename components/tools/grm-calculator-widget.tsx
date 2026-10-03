"use client";

/**
 * Standalone GRM (Gross Rent Multiplier) calculator widget. GRM is a
 * fast screening metric used in commercial real estate to compare
 * properties without needing detailed operating-expense data.
 *
 *   GRM = Property Price ÷ Annual Gross Rent
 *
 * Lower = better. Typical SFR rentals: 8-12. Multifamily: 6-10 in
 * cash-flow markets, 12-18 in appreciation markets.
 *
 * Set on the calculator parts (components/tools/tool-parts.tsx), like the
 * 1% rule widget: the frame opens on the 2px ink rule with no card, the two
 * fields are the shared ToolNumberField, and the multiple is the key figure
 * in DM Mono over the double rule. The band's name is in ink at 600 with no
 * color: a band is a description of the market, not a pass or a miss
 * against a rule, and green and orange are kept for those (DESIGN.md). The
 * three inputs behind the multiple follow the action on soft rules. The grid reads the
 * frame's own width (@container), so the widget lays out the same in the
 * tool page's hero column and in the /embed iframe.
 */

import { useMemo, useState } from "react";
import { AnalyzerHandoffLink } from "@/components/analyzer-handoff-link";
import { LedgerFigure } from "@/components/ledger/ledger-parts";
import { ToolNumberField } from "@/components/tools/tool-number-field";
import { ToolFrame, ToolResult } from "@/components/tools/tool-parts";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { buildAnalyzerHandoffUrl } from "@/lib/analyzer-handoff";
import { validateToolNumber } from "@/lib/public-tool-validation";

// What the two fields accept. The upper bounds are the analyzer handoff's
// (lib/analyzer-handoff.ts), the same as the 1% rule widget's.
const PRICE_BOUNDS = {
  label: "Property price",
  min: 0,
  minExclusive: true,
  max: 100_000_000,
} as const;
const RENT_BOUNDS = {
  label: "Monthly gross rent",
  min: 0,
  minExclusive: true,
  max: 1_000_000,
} as const;

/**
 * A cleared field is not an error: the result's own line already asks for a
 * price and a rent above 0. Zero, a negative or an out-of-range value is,
 * and gets a visible, announced message under the field.
 */
const fieldError = (
  raw: string,
  bounds: typeof PRICE_BOUNDS | typeof RENT_BOUNDS,
): string | null =>
  raw.trim() === "" ? null : validateToolNumber(raw, bounds).error;

/** The message for each field as typed, or null while it is in range. */
export function grmFieldErrors(raw: { price: string; rent: string }) {
  return {
    price: fieldError(raw.price, PRICE_BOUNDS),
    rent: fieldError(raw.rent, RENT_BOUNDS),
  };
}

const num = (s: string) => {
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
};

const fmtMoney = (n: number) =>
  `${n < 0 ? "-" : ""}$${Math.abs(Math.round(n)).toLocaleString("en-US")}`;

function classify(grm: number): { label: string; note: string } {
  if (grm <= 0)
    return {
      label: "Invalid",
      note: "Enter a price and monthly rent above 0.",
    };
  if (grm < 6)
    return {
      label: "Very strong",
      note: "Cash-flow-heavy market or a deeply distressed deal — verify everything.",
    };
  if (grm < 10)
    return {
      label: "Healthy",
      note: "Typical cash-flow market — Midwest / Sun Belt / older multifamily.",
    };
  if (grm < 14)
    return {
      label: "Balanced",
      note: "Mixed cash-flow / appreciation market.",
    };
  if (grm < 20)
    return {
      label: "Appreciation play",
      note: "Coastal / Tier-1 market — return depends on appreciation, not cash flow.",
    };
  return {
    label: "Expensive",
    note: "Very low yield relative to price. Common in luxury / ultra-coastal markets.",
  };
}

export function GrmCalculatorWidget() {
  const [priceInput, setPriceInput] = useState("295000");
  const [rentInput, setRentInput] = useState("2950");

  const { price: priceError, rent: rentError } = grmFieldErrors({
    price: priceInput,
    rent: rentInput,
  });
  const hasFieldError = priceError !== null || rentError !== null;

  const result = useMemo(() => {
    const price = num(priceInput);
    const monthlyRent = num(rentInput);
    const annualRent = monthlyRent * 12;
    const grm = annualRent > 0 ? price / annualRent : 0;
    return { price, monthlyRent, annualRent, grm };
  }, [priceInput, rentInput]);

  const c = classify(result.grm);
  // No multiple from a value the fields reject, and none without both
  // numbers: the em-dash placeholder, the same contract the 1%, 2% and
  // Break-Even tools use for an input they do not have.
  const hasResult = !hasFieldError && result.grm > 0;

  // Carry the user's price + rent into the full analyzer (P2-2 handoff).
  const handoffHref = buildAnalyzerHandoffUrl(
    { purchasePrice: num(priceInput), monthlyRent: num(rentInput) },
    { utmSource: "gross-rent-multiplier-calculator" },
  );

  return (
    // The page and the /embed iframe both show an H1 naming the calculator,
    // so the widget's own heading is for the outline only.
    <ToolFrame aria-labelledby="grm-heading">
      <h2 id="grm-heading" className="sr-only">
        GRM calculator
      </h2>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-x-8 gap-y-6 @lg:grid-cols-2">
        {/* Inputs */}
        <div className="min-w-0 space-y-5">
          <ToolNumberField
            id="grm-price"
            label="Property price"
            prefix="$"
            min={0}
            max={PRICE_BOUNDS.max}
            value={priceInput}
            onChange={(e) => setPriceInput(e.target.value)}
            error={priceError}
          />
          <ToolNumberField
            id="grm-rent"
            label="Monthly gross rent"
            prefix="$"
            min={0}
            max={RENT_BOUNDS.max}
            value={rentInput}
            onChange={(e) => setRentInput(e.target.value)}
            error={rentError}
            hint="Gross rent — not net. Don't subtract expenses for this metric."
          />
        </div>

        {/* Output. On one column it opens on the rule under the fields. */}
        <ToolResult
          className="border-t border-border pt-5 @lg:border-t-0 @lg:pt-0"
          label="GRM"
          figure={hasResult ? result.grm.toFixed(1) : "—"}
          pending={!hasResult}
          verdict={
            hasFieldError ? null : (
              <span className="font-semibold">{c.label}</span>
            )
          }
          note={
            hasFieldError ? "Fix the highlighted input to calculate." : c.note
          }
        />
      </div>

      {/* One plain action, then one line saying what is free and what is not
          (the 1% rule widget's pattern). The label claims no carry-over: a
          partner's iframe opens the analyzer without these numbers. */}
      <AnalyzerHandoffLink
        handoffHref={handoffHref}
        target="_top"
        aria-describedby="grm-handoff-note"
        className={cn(buttonVariants({ size: "cta" }), "mt-6 w-full sm:w-auto")}
      >
        Run the full analysis
      </AnalyzerHandoffLink>
      <p
        id="grm-handoff-note"
        className="mt-2 text-pretty text-sm text-muted-foreground"
      >
        Cap rate, CoC, DSCR and cash flow are free in TrueCap. The 10-year
        projection is a Pro feature.
      </p>

      {/* What the multiple was computed from, after the action, so the
          fields lead straight to the result and the action on a phone.
          Withheld while a field is in error, so a rejected value is never
          printed as a figure. */}
      <dl
        className={cn(
          "mt-6 border-t border-border text-sm",
          hasFieldError && "hidden",
        )}
      >
        <Row label="Property price" value={fmtMoney(result.price)} />
        <Row label="Monthly rent" value={fmtMoney(result.monthlyRent)} />
        <Row label="Annual rent" value={fmtMoney(result.annualRent)} bold />
      </dl>
    </ToolFrame>
  );
}

/** One input row on a soft rule: the name in Ink 2, the figure in DM Mono. */
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
    <div className="flex items-baseline justify-between gap-4 border-b border-rule-soft py-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd>
        <LedgerFigure className={cn("text-foreground", bold && "font-medium")}>
          {value}
        </LedgerFigure>
      </dd>
    </div>
  );
}
