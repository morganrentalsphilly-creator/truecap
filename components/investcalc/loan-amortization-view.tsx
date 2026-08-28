/**
 * Loan amortization mini-view.
 *
 * Year-by-year P&I breakdown: interest paid, principal paid, and the
 * ending balance at the end of each year. Investors want this for
 * two reasons:
 *   (1) seeing equity build is motivating (the principal column grows
 *       every year while interest shrinks)
 *   (2) it makes tax math tangible (deductible interest by year)
 *
 * Collapsed by default so the Cash Flow tab stays clean - click to
 * expand. Self-hides on cash purchases (no debt to amortize).
 *
 * Pure presentation over the canonical full-precision loan schedule. This
 * matters for interest-only periods and balloon maturities: reconstructing
 * principal as `12 × headline payment − interest` silently misstates both.
 */
import { ChevronRight } from "lucide-react";
import type { AnalysisResult } from "@/lib/calc-analysis";
import type { InvestmentFormValues } from "@/lib/investcalc-schema";
import {
  buildLoanAmortizationSchedule,
  summarizeLoanByYear,
} from "@/lib/loan-amortization";

type YearRow = {
  year: number;
  interest: number;
  principal: number;
  endingBalance: number;
  balloon: number;
};

function fmtUsd(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function buildAmortization(
  result: AnalysisResult,
  values: Pick<
    InvestmentFormValues,
    | "interestRate"
    | "loanTermYears"
    | "amortizationTermYears"
    | "interestOnlyMonths"
  >,
): YearRow[] {
  return summarizeLoanByYear(
    buildLoanAmortizationSchedule({
      principal: result.loanAmount,
      annualRatePct: values.interestRate,
      termYears: values.loanTermYears,
      maturityTermYears: result.loanMaturityTermYears ?? values.loanTermYears,
      amortizationTermYears:
        result.amortizationTermYears ??
        values.amortizationTermYears ??
        values.loanTermYears,
      interestOnlyMonths:
        result.interestOnlyMonths ?? values.interestOnlyMonths ?? 0,
    }),
  ).map((year) => ({
    year: year.year,
    interest: year.interest,
    principal: Math.max(0, year.principal - year.balloonPrincipal),
    endingBalance: year.endingBalance,
    balloon: year.balloonPrincipal,
  }));
}

export function LoanAmortizationView({
  result,
  values,
}: {
  result: AnalysisResult;
  values: Pick<
    InvestmentFormValues,
    | "interestRate"
    | "loanTermYears"
    | "amortizationTermYears"
    | "interestOnlyMonths"
  >;
}) {
  // Self-hide on cash purchase - no debt to amortize.
  if (result.loanAmount <= 0 || result.monthlyPayment <= 0) return null;

  const rows = buildAmortization(result, values);
  if (rows.length === 0) return null;

  // Show first 10 years in the table to keep it scannable. The full
  // schedule expands behind a "Show full schedule (X years)" toggle.
  const PREVIEW_YEARS = 10;
  const showFull = rows.length <= PREVIEW_YEARS;
  const previewRows = showFull ? rows : rows.slice(0, PREVIEW_YEARS);
  const hasBalloon = rows.some((row) => row.balloon > 0);

  return (
    <details className="group rounded-xl border border-border bg-card p-3 sm:p-4">
      <summary className="min-h-11 flex cursor-pointer items-center gap-2.5 select-none list-none">
        <ChevronRight
          aria-hidden
          className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90"
        />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-foreground">
            Loan amortization
          </span>
          <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">
            Year-by-year interest, scheduled principal and balance ·{" "}
            {values.loanTermYears}-year maturity ·{" "}
            {result.amortizationTermYears ??
              values.amortizationTermYears ??
              values.loanTermYears}
            -year amortization
            {(result.interestOnlyMonths ?? values.interestOnlyMonths ?? 0) > 0
              ? ` · ${result.interestOnlyMonths ?? values.interestOnlyMonths ?? 0} interest-only months`
              : ""}
          </span>
        </span>
      </summary>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th
                scope="col"
                className="py-2 pr-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground"
              >
                Year
              </th>
              <th
                scope="col"
                className="py-2 px-3 text-right text-[10px] font-bold uppercase tracking-widest text-muted-foreground"
              >
                Interest paid
              </th>
              <th
                scope="col"
                className="py-2 px-3 text-right text-[10px] font-bold uppercase tracking-widest text-muted-foreground"
              >
                Principal paid
              </th>
              <th
                scope="col"
                className="py-2 pl-3 text-right text-[10px] font-bold uppercase tracking-widest text-muted-foreground"
              >
                Ending balance
              </th>
              {hasBalloon ? (
                <th
                  scope="col"
                  className="py-2 pl-3 text-right text-[10px] font-bold uppercase tracking-widest text-muted-foreground"
                >
                  Balloon due
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {previewRows.map((row) => (
              <tr
                key={row.year}
                className="border-b border-border/50 last:border-b-0"
              >
                <td className="py-2 pr-3 text-xs font-bold text-foreground">
                  {row.year}
                </td>
                <td className="py-2 px-3 text-right tabular-nums text-muted-foreground">
                  {fmtUsd(row.interest)}
                </td>
                <td className="py-2 px-3 text-right tabular-nums font-semibold text-foreground">
                  {fmtUsd(row.principal)}
                </td>
                <td className="py-2 pl-3 text-right tabular-nums text-foreground">
                  {fmtUsd(row.endingBalance)}
                </td>
                {hasBalloon ? (
                  <td className="py-2 pl-3 text-right tabular-nums font-semibold text-[var(--metric-negative)]">
                    {row.balloon > 0 ? fmtUsd(row.balloon) : "—"}
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
        {!showFull ? (
          <p className="mt-3 text-[11px] text-muted-foreground">
            Showing first {PREVIEW_YEARS} of {rows.length} years. Equity grows
            faster in later years as interest tapers off.
          </p>
        ) : null}
      </div>
    </details>
  );
}
