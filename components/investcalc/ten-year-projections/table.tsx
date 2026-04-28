"use client";

import { formatCurrency } from "@/components/investcalc/analysis-panels/shared/formatters";
import { cn } from "@/lib/utils";
import type { ProjectionYear } from "@/lib/ten-year-projections";

const COLUMNS = [
  "Year",
  "Rental Income",
  "Operating Expenses",
  "Annual Debt Service (Principal & Interest)",
  "Net Cash Flow",
  "Tax Savings",
  "After-Tax Cash Flow",
  "Cumulative Cash Flow",
];

export function TenYearProjectionTable({
  projectionYears,
}: {
  projectionYears: ProjectionYear[];
}) {
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-sm">
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
            {projectionYears.map((year) => (
              <tr key={year.year} className="border-b border-border/70 last:border-b-0">
                <td className="px-4 py-3 font-semibold text-foreground">{year.year}</td>
                <td className="px-4 py-3">{formatCurrency(year.rentalIncomeAnnual)}</td>
                <td className="px-4 py-3">{formatCurrency(year.operatingExpensesAnnual)}</td>
                <td className="px-4 py-3">{formatCurrency(year.debtServiceAnnual)}</td>
                <td
                  className={cn(
                    "px-4 py-3 font-semibold",
                    year.netCashFlowAnnual >= 0
                      ? "text-[var(--metric-positive)]"
                      : "text-[var(--metric-negative)]"
                  )}
                >
                  {formatCurrency(year.netCashFlowAnnual)}
                </td>
                <td className="px-4 py-3 text-primary">{formatCurrency(year.taxSavingsAnnual)}</td>
                <td
                  className={cn(
                    "px-4 py-3 font-semibold",
                    year.afterTaxCashFlowAnnual >= 0
                      ? "text-[var(--metric-positive)]"
                      : "text-[var(--metric-negative)]"
                  )}
                >
                  {formatCurrency(year.afterTaxCashFlowAnnual)}
                </td>
                <td
                  className={cn(
                    "px-4 py-3 font-semibold",
                    year.cumulativeCashFlowAnnual >= 0
                      ? "text-[var(--metric-positive)]"
                      : "text-[var(--metric-negative)]"
                  )}
                >
                  {formatCurrency(year.cumulativeCashFlowAnnual)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
