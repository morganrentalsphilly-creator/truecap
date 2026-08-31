"use client";

/**
 * Standalone break-even calculator widget.
 *
 *   Months to break-even = Total Cash Invested ÷ Monthly Net Cash Flow
 *
 * Quick way for investors to see "how many months until this property has
 * returned my initial capital from cash flow alone (excluding appreciation
 * + equity build)."
 */

import { useMemo, useState } from "react";
import { AnalyzerHandoffLink } from "@/components/analyzer-handoff-link";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { buildAnalyzerHandoffUrl } from "@/lib/analyzer-handoff";
import { ToolNumberField } from "@/components/tools/tool-number-field";
import { validateToolNumber } from "@/lib/public-tool-validation";

const fmtMoney = (n: number) =>
  `${n < 0 ? "-" : ""}$${Math.abs(Math.round(n)).toLocaleString("en-US")}`;

function classify(
  months: number | null,
  cashFlow: number,
): { label: string; color: string; note: string } {
  if (cashFlow <= 0) {
    return {
      label: "No cash-flow break-even",
      color: "text-[var(--metric-negative)]",
      note: "Monthly cash flow is zero or negative, so the entered cash is not recovered from cash flow alone.",
    };
  }
  if (months == null) {
    return {
      label: "Break-even unavailable",
      color: "text-muted-foreground",
      note: "Fix the highlighted inputs to calculate.",
    };
  }
  if (months <= 60) {
    return {
      label: "Under 5 years",
      color: "text-[var(--metric-positive)]",
      note: "At the entered monthly cash flow, the modeled initial cash is recovered within 60 months.",
    };
  }
  if (months <= 120) {
    return {
      label: "5 to 10 years",
      color: "text-foreground",
      note: "At the entered monthly cash flow, modeled recovery takes between 60 and 120 months.",
    };
  }
  if (months <= 180) {
    return {
      label: "10 to 15 years",
      color: "text-amber-700",
      note: "At the entered monthly cash flow, modeled recovery takes between 120 and 180 months.",
    };
  }
  return {
    label: "More than 15 years",
    color: "text-amber-700",
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
    <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
      <fieldset
        aria-describedby={
          hasInvestmentTotalError ? "be-investment-error" : undefined
        }
      >
        <legend className="sr-only">Break-even inputs</legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
            className="mt-3 text-xs font-medium text-destructive"
          >
            Enter a positive amount for down payment, closing costs, or initial
            repairs.
          </p>
        ) : null}
      </fieldset>

      <div className="mt-6 rounded-xl border border-border bg-muted/30 p-5">
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
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
          Break-even
        </p>
        <p
          className={cn(
            "mt-1 text-4xl font-extrabold tabular-nums",
            verdict?.color ?? "text-muted-foreground",
          )}
        >
          {result?.months != null ? `${Math.round(result.months)} months` : "—"}
        </p>
        <p className="mt-1 text-sm text-muted-foreground tabular-nums">
          {result?.months != null && result.years != null
            ? `${result.years.toFixed(1)} years · ${fmtMoney(result.totalInvested)} modeled initial cash`
            : result
              ? `${fmtMoney(result.totalInvested)} modeled initial cash · enter positive monthly cash flow to calculate recovery time`
              : "Fix the highlighted inputs to calculate"}
        </p>
        {verdict ? (
          <p className="mt-3 text-sm">
            <span className={cn("font-bold", verdict.color)}>
              {verdict.label}.
            </span>{" "}
            <span className="text-muted-foreground">{verdict.note}</span>
          </p>
        ) : null}
      </div>

      <AnalyzerHandoffLink
        handoffHref={handoffHref}
        target="_top"
        className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-md text-sm font-bold text-primary hover:underline"
      >
        <Sparkles className="w-4 h-4" />
        Run the free core property screen; projections appear when your access
        includes them
        <ArrowUpRight className="w-4 h-4" />
      </AnalyzerHandoffLink>
    </div>
  );
}
