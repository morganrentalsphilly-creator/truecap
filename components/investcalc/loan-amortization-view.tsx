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
 * Collapsed by default so the Cash Flow tab stays clean — click to
 * expand. Self-hides on cash purchases (no debt to amortize).
 *
 * Pure presentation — derived from AnalysisResult.yearlyInterestSchedule
 * (which the engine already computes for the tax-deduction model) plus
 * the monthly P&I. We compute principal-per-year + remaining balance
 * locally so we don't touch lib/calc-analysis.
 */
import type { AnalysisResult } from "@/lib/calc-analysis";

type YearRow = {
  year: number;
  interest: number;
  principal: number;
  endingBalance: number;
};

function fmtUsd(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function buildAmortization(
  loanAmount: number,
  monthlyPayment: number,
  yearlyInterestSchedule: number[],
): YearRow[] {
  if (loanAmount <= 0 || monthlyPayment <= 0 || yearlyInterestSchedule.length === 0) {
    return [];
  }
  const annualPayment = monthlyPayment * 12;
  let balance = loanAmount;
  const rows: YearRow[] = [];
  for (let i = 0; i < yearlyInterestSchedule.length; i += 1) {
    const interest = yearlyInterestSchedule[i]!;
    // Principal is whatever the year's total P&I that didn't go to
    // interest. Clamp at the remaining balance (last year is a stub).
    const principal = Math.min(Math.max(annualPayment - interest, 0), balance);
    balance = Math.max(0, balance - principal);
    rows.push({
      year: i + 1,
      interest,
      principal,
      endingBalance: balance,
    });
  }
  return rows;
}

export function LoanAmortizationView({ result }: { result: AnalysisResult }) {
  // Self-hide on cash purchase — no debt to amortize.
  if (result.loanAmount <= 0 || result.monthlyPayment <= 0) return null;

  const rows = buildAmortization(
    result.loanAmount,
    result.monthlyPayment,
    result.yearlyInterestSchedule,
  );
  if (rows.length === 0) return null;

  // Show first 10 years in the table to keep it scannable. The full
  // schedule expands behind a "Show full schedule (X years)" toggle.
  const PREVIEW_YEARS = 10;
  const showFull = rows.length <= PREVIEW_YEARS;
  const previewRows = showFull ? rows : rows.slice(0, PREVIEW_YEARS);

  return (
    <details className="group rounded-2xl border border-border bg-card p-4 sm:p-5">
      <summary className="min-h-11 -my-1 flex cursor-pointer items-center justify-between gap-3 py-2 select-none list-none">
        <span className="flex items-center gap-2">
          <span
            aria-hidden
            className="text-muted-foreground transition-transform group-open:rotate-90"
          >
            ▸
          </span>
          <span>
            <span className="text-xs font-bold uppercase tracking-widest text-foreground">
              Loan amortization
            </span>
            <span className="ml-2 text-[11px] text-muted-foreground">
              Year-by-year interest, principal, balance
            </span>
          </span>
        </span>
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          {rows.length} yr
        </span>
      </summary>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="py-2 pr-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Year
              </th>
              <th className="py-2 px-3 text-right text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Interest paid
              </th>
              <th className="py-2 px-3 text-right text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Principal paid
              </th>
              <th className="py-2 pl-3 text-right text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Ending balance
              </th>
            </tr>
          </thead>
          <tbody>
            {previewRows.map((row) => (
              <tr key={row.year} className="border-b border-border/50 last:border-b-0">
                <td className="py-2 pr-3 text-xs font-bold text-foreground">{row.year}</td>
                <td className="py-2 px-3 text-right tabular-nums text-muted-foreground">
                  {fmtUsd(row.interest)}
                </td>
                <td className="py-2 px-3 text-right tabular-nums font-semibold text-foreground">
                  {fmtUsd(row.principal)}
                </td>
                <td className="py-2 pl-3 text-right tabular-nums text-foreground">
                  {fmtUsd(row.endingBalance)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!showFull ? (
          <p className="mt-3 text-[11px] text-muted-foreground">
            Showing first {PREVIEW_YEARS} of {rows.length} years. Equity grows faster
            in later years as interest tapers off.
          </p>
        ) : null}
      </div>
    </details>
  );
}
