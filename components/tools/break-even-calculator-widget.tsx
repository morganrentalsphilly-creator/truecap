"use client";

/**
 * Standalone break-even calculator widget.
 *
 *   Months to break-even = Total Cash Invested ÷ Monthly Net Cash Flow
 *
 * Quick way for investors to see "how many months until this property has
 * returned my initial capital from cash flow alone (excluding appreciation
 * + equity build)."
 *
 * Set on the calculator parts (components/tools/tool-parts.tsx), like the
 * 1% rule widget: the frame opens on the 2px ink rule with no card, the four
 * fields are the shared ToolNumberField, and the months are the key figure
 * in DM Mono over the double rule (LedgerTotal). The band's name is in ink
 * at 600 with no color: a recovery period is a description of the entered
 * scenario, not a pass or a miss against a rule, and green and orange are
 * kept for those (DESIGN.md). The result is announced by its own one-line
 * status, so the visible block is not a second live region (ToolResult is
 * one, and has no switch for that). The grid reads the frame's own width
 * (@container), so the widget lays out the same in the tool page's hero
 * column and in the /embed iframe.
 */

import { useMemo, useState } from "react";
import { AnalyzerHandoffLink } from "@/components/analyzer-handoff-link";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { buildAnalyzerHandoffUrl } from "@/lib/analyzer-handoff";
import { LedgerTotal } from "@/components/ledger/ledger-parts";
import { ToolNumberField } from "@/components/tools/tool-number-field";
import { ToolFrame } from "@/components/tools/tool-parts";
import { validateToolNumber } from "@/lib/public-tool-validation";

const fmtMoney = (n: number) =>
  `${n < 0 ? "-" : ""}$${Math.abs(Math.round(n)).toLocaleString("en-US")}`;

function classify(
  months: number | null,
  cashFlow: number,
): { label: string; note: string } {
  if (cashFlow <= 0) {
    return {
      label: "No cash-flow break-even",
      note: "Monthly cash flow is zero or negative, so the entered cash is not recovered from cash flow alone.",
    };
  }
  if (months == null) {
    return {
      label: "Break-even unavailable",
      note: "Fix the highlighted inputs to calculate.",
    };
  }
  if (months <= 60) {
    return {
      label: "Under 5 years",
      note: "At the entered monthly cash flow, the modeled initial cash is recovered within 60 months.",
    };
  }
  if (months <= 120) {
    return {
      label: "5 to 10 years",
      note: "At the entered monthly cash flow, modeled recovery takes between 60 and 120 months.",
    };
  }
  if (months <= 180) {
    return {
      label: "10 to 15 years",
      note: "At the entered monthly cash flow, modeled recovery takes between 120 and 180 months.",
    };
  }
  return {
    label: "More than 15 years",
    note: "Cash-flow recovery alone takes more than 180 months under the entered assumptions.",
  };
}

export function BreakEvenCalculatorWidget() {
  const [downPayment, setDownPayment] = useState("60000");
  const [closingCosts, setClosingCosts] = useState("8000");
  const [rehab, setRehab] = useState("5000");
  const [monthlyCashFlow, setMonthlyCashFlow] = useState("450");

  const validated = useMemo(
    () => ({
      downPayment: validateToolNumber(downPayment, {
        label: "Down payment",
        min: 0,
        max: 100_000_000,
      }),
      closingCosts: validateToolNumber(closingCosts, {
        label: "Closing costs",
        min: 0,
        max: 100_000_000,
      }),
      rehab: validateToolNumber(rehab, {
        label: "Rehab and initial repairs",
        min: 0,
        max: 100_000_000,
      }),
      monthlyCashFlow: validateToolNumber(monthlyCashFlow, {
        label: "Monthly net cash flow",
        min: -1_000_000,
        max: 1_000_000,
      }),
    }),
    [closingCosts, downPayment, monthlyCashFlow, rehab],
  );
  const investmentTotal =
    validated.downPayment.ok && validated.closingCosts.ok && validated.rehab.ok
      ? validated.downPayment.value +
        validated.closingCosts.value +
        validated.rehab.value
      : null;
  const hasPositiveInvestment = investmentTotal != null && investmentTotal > 0;
  const hasInvestmentTotalError =
    investmentTotal != null && investmentTotal <= 0;

  const result = useMemo(() => {
    if (
      !validated.downPayment.ok ||
      !validated.closingCosts.ok ||
      !validated.rehab.ok ||
      !validated.monthlyCashFlow.ok ||
      !hasPositiveInvestment
    ) {
      return null;
    }
    const totalInvested =
      validated.downPayment.value +
      validated.closingCosts.value +
      validated.rehab.value;
    const cashFlow = validated.monthlyCashFlow.value;
    if (cashFlow <= 0)
      return { totalInvested, months: null, years: null, cashFlow };
    const months = totalInvested / cashFlow;
    const years = months / 12;
    return { totalInvested, months, years, cashFlow };
  }, [hasPositiveInvestment, validated]);

  const verdict = result ? classify(result.months, result.cashFlow) : null;

  // Moment-of-result handoff into the full analyzer (P2-2 pattern shared by
  // the other tool widgets). Down payment / closing / rehab don't map onto
  // the analyzer's price/rent handoff fields, so this is a bare tagged link
  // — the analyzer derives cash flow (and break-even) from its own inputs.
  const handoffHref = buildAnalyzerHandoffUrl(
    {},
    { utmSource: "break-even-calculator" },
  );

  return (
    // The page and the /embed iframe both show an H1 naming the calculator,
    // so the widget's own heading is for the outline only.
    <ToolFrame aria-labelledby="be-heading">
      <h2 id="be-heading" className="sr-only">
        Break-even calculator
      </h2>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-x-8 gap-y-6 @lg:grid-cols-2">
        <fieldset
          className="min-w-0"
          aria-describedby={
            hasInvestmentTotalError ? "be-investment-error" : undefined
          }
        >
          <legend className="sr-only">Break-even inputs</legend>
          {/* Two fields a row on a phone, so the result and the action stay
              near the first screen, and again once the frame is 672px wide;
              between the two the field column is too narrow for a pair and
              they stack. */}
          <div className="grid grid-cols-2 items-start gap-x-4 gap-y-5 @lg:grid-cols-1 @2xl:grid-cols-2">
            <ToolNumberField
              id="be-down"
              label="Down payment"
              prefix="$"
              min={0}
              max={100_000_000}
              value={downPayment}
              onChange={(e) => setDownPayment(e.target.value)}
              error={validated.downPayment.error}
            />
            <ToolNumberField
              id="be-closing"
              label="Closing costs"
              prefix="$"
              min={0}
              max={100_000_000}
              value={closingCosts}
              onChange={(e) => setClosingCosts(e.target.value)}
              error={validated.closingCosts.error}
            />
            <ToolNumberField
              id="be-rehab"
              label="Rehab / initial repairs"
              prefix="$"
              min={0}
              max={100_000_000}
              value={rehab}
              onChange={(e) => setRehab(e.target.value)}
              error={validated.rehab.error}
            />
            <ToolNumberField
              id="be-cf"
              label="Monthly net cash flow"
              prefix="$"
              min={-1_000_000}
              max={1_000_000}
              value={monthlyCashFlow}
              onChange={(e) => setMonthlyCashFlow(e.target.value)}
              error={validated.monthlyCashFlow.error}
            />
          </div>
          {hasInvestmentTotalError ? (
            <p
              id="be-investment-error"
              role="alert"
              className="mt-3 text-sm text-destructive-text"
            >
              Enter a positive amount for down payment, closing costs, or initial
              repairs.
            </p>
          ) : null}
        </fieldset>

        {/* On one column the result opens on the rule under the fields. */}
        <div className="min-w-0 border-t border-border pt-5 @lg:border-t-0 @lg:pt-0">
          <span
            className="sr-only"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            {result && verdict
              ? result.months == null
                ? `${verdict.label}. ${verdict.note}`
                : `${verdict.label}. Modeled break-even ${Math.round(result.months)} months, or ${result.years?.toFixed(1)} years.`
              : "Fix the highlighted inputs to calculate cash-flow break-even."}
          </span>
          <p className="text-sm leading-snug font-semibold text-foreground">
            Break-even
          </p>
          {/* The figure carries its unit ("162 months"), so it stays at the
              smaller key size at every width and fits the result column.
              The color sits on the line, as in ToolResult. */}
          <p
            className={cn(
              "mt-3 wrap-anywhere",
              result?.months != null ? "text-foreground" : "text-muted-foreground",
            )}
          >
            <LedgerTotal className="text-key-sm">
              {result?.months != null ? `${Math.round(result.months)} months` : "—"}
            </LedgerTotal>
          </p>
          <p className="mt-4 text-pretty text-base text-muted-foreground">
            {result?.months != null && result.years != null
              ? `${result.years.toFixed(1)} years · ${fmtMoney(result.totalInvested)} modeled initial cash`
              : result
                ? `${fmtMoney(result.totalInvested)} modeled initial cash · enter positive monthly cash flow to calculate recovery time`
                : "Fix the highlighted inputs to calculate"}
          </p>
          {verdict ? (
            <p className="mt-2 max-w-[46ch] text-pretty text-base leading-relaxed">
              <span className="font-semibold">{verdict.label}.</span>{" "}
              <span className="text-muted-foreground">{verdict.note}</span>
            </p>
          ) : null}
        </div>
      </div>

      {/* One plain action, then one line saying what is free and what is not
          (the 1% rule widget's pattern). Nothing typed here carries over, and
          the label does not say it does. */}
      <AnalyzerHandoffLink
        handoffHref={handoffHref}
        target="_top"
        aria-describedby="be-handoff-note"
        className={cn(buttonVariants({ size: "cta" }), "mt-6 w-full sm:w-auto")}
      >
        Run the full analysis
      </AnalyzerHandoffLink>
      <p
        id="be-handoff-note"
        className="mt-2 text-pretty text-sm text-muted-foreground"
      >
        Cap rate, CoC, DSCR and cash flow are free in TrueCap. The 10-year
        projection is a Pro feature.
      </p>
    </ToolFrame>
  );
}
