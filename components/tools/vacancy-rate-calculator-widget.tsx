"use client";

/**
 * Standalone vacancy rate calculator widget.
 *
 * Computes effective vacancy rate from annual vacant days OR from a
 * monthly basis. Also reverses the math to show the rent loss in dollars.
 * The page quotes one sourced national figure (the Census Bureau's Housing
 * Vacancy Survey, app/tools/vacancy-rate-calculator/page.tsx); keep unsourced
 * vacancy figures out of this file so they are not copied back into it.
 *
 * Set on the calculator parts (components/tools/tool-parts.tsx), like the
 * 1% rule widget: the frame opens on the 2px ink rule with no card, the
 * three fields are the shared ToolNumberField, and the rate is the key
 * figure in DM Mono over the double rule, in ink. The band's name is in ink
 * at 600 with no color: a band is a rule-of-thumb reading of the entered
 * scenario, not a pass or a miss against a rule, and green and orange are
 * kept for those (DESIGN.md). The breakdown is a ruled disclosure row after
 * the action. The grid reads the frame's own width (@container), so the
 * widget lays out the same in the tool page's hero column and in the /embed
 * iframe.
 */

import { useMemo, useState } from "react";
import { AnalyzerHandoffLink } from "@/components/analyzer-handoff-link";
import { DisclosureMark, LedgerFigure } from "@/components/ledger/ledger-parts";
import { ToolNumberField } from "@/components/tools/tool-number-field";
import { ToolFrame, ToolResult } from "@/components/tools/tool-parts";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { buildAnalyzerHandoffUrl } from "@/lib/analyzer-handoff";
import { validateToolNumber } from "@/lib/public-tool-validation";

// What the three fields accept. Zero stays a valid entry in each (no
// turnover cost, no vacant days). The rent ceiling is the analyzer
// handoff's (lib/analyzer-handoff.ts); a year has 365 days in this
// widget's daily-rent arithmetic.
const RENT_BOUNDS = { label: "Monthly rent", min: 0, max: 1_000_000 } as const;
const DAYS_BOUNDS = { label: "Vacant days per year", min: 0, max: 365 } as const;
const TURNOVER_BOUNDS = { label: "Turnover cost", min: 0, max: 1_000_000 } as const;

/**
 * A cleared field is not an error: it counts as zero, as it always has. A
 * negative or an out-of-range value is, and gets a visible, announced
 * message under the field.
 */
const fieldError = (
  raw: string,
  bounds: typeof RENT_BOUNDS | typeof DAYS_BOUNDS | typeof TURNOVER_BOUNDS,
): string | null =>
  raw.trim() === "" ? null : validateToolNumber(raw, bounds).error;

/** The message for each field as typed, or null while it is in range. */
export function vacancyRateFieldErrors(raw: {
  monthlyRent: string;
  vacantDays: string;
  turnoverCost: string;
}) {
  return {
    monthlyRent: fieldError(raw.monthlyRent, RENT_BOUNDS),
    vacantDays: fieldError(raw.vacantDays, DAYS_BOUNDS),
    turnoverCost: fieldError(raw.turnoverCost, TURNOVER_BOUNDS),
  };
}

const num = (s: string) => {
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
};

const fmtMoney = (n: number) =>
  `${n < 0 ? "-" : ""}$${Math.abs(Math.round(n)).toLocaleString("en-US")}`;
const fmtPct = (n: number) => `${n.toFixed(2)}%`;

export function VacancyRateCalculatorWidget() {
  const [monthlyRent, setMonthlyRent] = useState("1500");
  const [vacantDays, setVacantDays] = useState("21");
  const [turnoverCost, setTurnoverCost] = useState("400");

  const errors = vacancyRateFieldErrors({ monthlyRent, vacantDays, turnoverCost });
  const hasFieldError =
    errors.monthlyRent !== null ||
    errors.vacantDays !== null ||
    errors.turnoverCost !== null;

  const result = useMemo(() => {
    const rent = num(monthlyRent);
    const days = num(vacantDays);
    const turnover = num(turnoverCost);
    const annualRent = rent * 12;
    const dailyRent = annualRent / 365;
    const lostRent = dailyRent * days;
    const totalLoss = lostRent + turnover;
    const vacancyPct = annualRent > 0 ? (totalLoss / annualRent) * 100 : 0;
    const effectiveAnnualRent = annualRent - totalLoss;
    return {
      annualRent,
      lostRent,
      turnover,
      totalLoss,
      vacancyPct,
      effectiveAnnualRent,
    };
  }, [monthlyRent, vacantDays, turnoverCost]);

  const verdict =
    result.vacancyPct < 5
      ? "Aggressive (low)"
      : result.vacancyPct < 8
        ? "Realistic"
        : result.vacancyPct < 12
          ? "Conservative"
          : "Distressed";

  // Moment-of-result handoff into the full analyzer (P2-2 pattern shared by
  // the other tool widgets) — carries the rent the user already typed so the
  // analyzer prefills it (partial handoffs are supported by design).
  const handoffHref = buildAnalyzerHandoffUrl(
    { monthlyRent: num(monthlyRent) },
    { utmSource: "vacancy-rate-calculator" },
  );

  return (
    // The page and the /embed iframe both show an H1 naming the calculator,
    // so the widget's own heading is for the outline only.
    <ToolFrame aria-labelledby="vr-heading">
      <h2 id="vr-heading" className="sr-only">
        Vacancy rate calculator
      </h2>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-x-8 gap-y-6 @lg:grid-cols-2">
        <div className="min-w-0 space-y-5">
          {/* Rent and days share a row on a phone, so the result and the
              action stay near the first screen; in the two-column layout
              the field column is narrow and they stack. */}
          <div className="grid grid-cols-2 items-start gap-x-4 gap-y-5 @lg:grid-cols-1">
            <ToolNumberField
              id="vr-rent"
              label="Monthly rent"
              prefix="$"
              min={0}
              max={RENT_BOUNDS.max}
              value={monthlyRent}
              onChange={(e) => setMonthlyRent(e.target.value)}
              error={errors.monthlyRent}
            />
            <ToolNumberField
              id="vr-days"
              label="Vacant days / year"
              min={0}
              max={DAYS_BOUNDS.max}
              value={vacantDays}
              onChange={(e) => setVacantDays(e.target.value)}
              error={errors.vacantDays}
            />
          </div>
          <ToolNumberField
            id="vr-turn"
            label="Turnover cost (cleaning, repairs, listing fees)"
            prefix="$"
            min={0}
            max={TURNOVER_BOUNDS.max}
            value={turnoverCost}
            onChange={(e) => setTurnoverCost(e.target.value)}
            error={errors.turnoverCost}
          />
        </div>

        {/* On one column the result opens on the rule under the fields. */}
        <ToolResult
          className="border-t border-border pt-5 @lg:border-t-0 @lg:pt-0"
          label="Effective vacancy rate"
          figure={hasFieldError ? "—" : fmtPct(result.vacancyPct)}
          pending={hasFieldError}
          note={
            hasFieldError ? (
              "Fix the highlighted inputs to calculate."
            ) : (
              <>
                {fmtMoney(result.totalLoss)} lost per year ·{" "}
                <span className="font-semibold text-foreground">{verdict}</span>
              </>
            )
          }
        />
      </div>

      {/* One plain action, then one line saying what is free and what is not
          (the 1% rule widget's pattern). The label claims no carry-over: only
          the rent is handed on, and not at all from a partner's iframe. */}
      <AnalyzerHandoffLink
        handoffHref={handoffHref}
        target="_top"
        aria-describedby="vr-handoff-note"
        className={cn(buttonVariants({ size: "cta" }), "mt-6 w-full sm:w-auto")}
      >
        Run the full analysis
      </AnalyzerHandoffLink>
      <p
        id="vr-handoff-note"
        className="mt-2 text-pretty text-sm text-muted-foreground"
      >
        Cap rate, CoC, DSCR and cash flow are free in TrueCap. The 10-year
        projection is a Pro feature.
      </p>

      {/* One ruled disclosure row, the FAQ's grammar, after the action.
          Withheld while a field is in error, so a rejected value is never
          printed. */}
      <details
        className={cn(
          "group mt-6 border-y border-border",
          hasFieldError && "hidden",
        )}
      >
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold text-foreground [&::-webkit-details-marker]:hidden">
          <span>Breakdown</span>
          <DisclosureMark />
        </summary>
        <ul className="pb-2 text-sm">
          <BreakdownRow label="Annual gross rent" value={fmtMoney(result.annualRent)} />
          <BreakdownRow label="Lost rent (vacant days)" value={fmtMoney(result.lostRent)} />
          <BreakdownRow label="Turnover cost" value={fmtMoney(result.turnover)} />
          <BreakdownRow
            label="Effective annual rent"
            value={fmtMoney(result.effectiveAnnualRent)}
            total
          />
        </ul>
      </details>

      {/* The caveat closes the widget at the reading measure, after the
          action, so the fields lead straight to the result (on phones too).
          It stays in the widget, so the /embed iframe keeps it. */}
      <p className="mt-6 max-w-[68ch] text-pretty text-sm text-muted-foreground">
        Vacancy varies by property, lease terms, submarket, season, and
        management. Treat the entered value as an editable scenario, compare it
        with recent relevant local evidence, and stress-test a less favorable
        case before relying on the screen.
      </p>
    </ToolFrame>
  );
}

/** One breakdown row on a soft rule; the last one, the total, on the rule. */
function BreakdownRow({
  label,
  value,
  total,
}: {
  label: string;
  value: string;
  total?: boolean;
}) {
  return (
    <li
      className={cn(
        "flex items-baseline justify-between gap-4 py-2",
        total
          ? "border-t border-border font-semibold text-foreground"
          : "border-t border-rule-soft text-muted-foreground",
      )}
    >
      <span>{label}</span>
      <LedgerFigure className="text-foreground">{value}</LedgerFigure>
    </li>
  );
}
