"use client";

import { formatCurrency } from "@/components/investcalc/analysis-panels/shared/formatters";
import { cn } from "@/lib/utils";
import type { TaxStrategyYear } from "@/lib/tax-strategy";

const COLUMNS = [
  "Year",
  "Rental Income",
  "Operating Expenses",
  "Mortgage Interest Deduction",
  "Depreciation Deduction",
  "Total Deductions",
  "Taxable Rental Income",
  "Tax Savings",
  "Tax Liability",
  "Net Tax Benefit",
  "Cumulative Tax Benefit",
];

export function TaxStrategyTable({
  years,
}: {
  years: TaxStrategyYear[];
}) {
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1320px] text-sm">
          <thead className="bg-muted/40">
            <tr className="h-12 border-b border-border">
              {COLUMNS.map((label) => (
                <th
                  key={label}
                  className="px-4 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground"
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {years.map((year) => (
              <tr key={year.year} className="border-b border-border/70 last:border-b-0">
                <td className="px-4 py-3 font-semibold text-foreground">{year.year}</td>
                <td className="px-4 py-3">{formatCurrency(year.rentalIncomeAnnual)}</td>
                <td className="px-4 py-3">{formatCurrency(year.operatingExpensesAnnual)}</td>
                <td className="px-4 py-3">{formatCurrency(year.mortgageInterestDeductionAnnual)}</td>
                <td className="px-4 py-3">{formatCurrency(year.depreciationDeductionAnnual)}</td>
                <td className="px-4 py-3">{formatCurrency(year.totalDeductionsAnnual)}</td>
                <td
                  className={cn(
                    "px-4 py-3 font-semibold",
                    year.taxableRentalIncomeAnnual < 0
                      ? "text-[var(--metric-positive)]"
                      : "text-[var(--metric-negative)]"
                  )}
                >
                  {formatCurrency(year.taxableRentalIncomeAnnual)}
                </td>
                <td className="px-4 py-3 font-semibold text-[var(--metric-positive)]">
                  {formatCurrency(year.taxSavingsAnnual)}
                </td>
                <td className="px-4 py-3 font-semibold text-[var(--metric-negative)]">
                  {formatCurrency(year.taxLiabilityAnnual)}
                </td>
                <td
                  className={cn(
                    "px-4 py-3 font-semibold",
                    year.netTaxBenefitAnnual >= 0
                      ? "text-[var(--metric-positive)]"
                      : "text-[var(--metric-negative)]"
                  )}
                >
                  {formatCurrency(year.netTaxBenefitAnnual)}
                </td>
                <td
                  className={cn(
                    "px-4 py-3 font-semibold",
                    year.cumulativeTaxBenefitAnnual >= 0
                      ? "text-[var(--metric-positive)]"
                      : "text-[var(--metric-negative)]"
                  )}
                >
                  {formatCurrency(year.cumulativeTaxBenefitAnnual)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
