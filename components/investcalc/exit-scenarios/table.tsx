"use client";

import { formatCurrency } from "@/components/investcalc/analysis-panels/shared/formatters";
import { cn } from "@/lib/utils";
import type { ExitScenarioYear } from "@/lib/exit-scenarios";

const COLUMNS = [
  "Year",
  "Property Value",
  "Loan Balance",
  "Equity",
  "Net Sale Proceeds",
  "Total Profit",
];

export function ExitScenarioTable({
  years,
}: {
  years: ExitScenarioYear[];
}) {
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[840px] text-sm">
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
                <td className="px-4 py-3">{formatCurrency(year.propertyValue)}</td>
                <td className="px-4 py-3">{formatCurrency(year.remainingLoanBalance)}</td>
                <td
                  className={cn(
                    "px-4 py-3 font-semibold",
                    year.equity >= 0 ? "text-[var(--metric-positive)]" : "text-[var(--metric-negative)]"
                  )}
                >
                  {formatCurrency(year.equity)}
                </td>
                <td
                  className={cn(
                    "px-4 py-3 font-semibold",
                    year.netSaleProceeds >= 0
                      ? "text-[var(--metric-positive)]"
                      : "text-[var(--metric-negative)]"
                  )}
                >
                  {formatCurrency(year.netSaleProceeds)}
                </td>
                <td
                  className={cn(
                    "px-4 py-3 font-semibold",
                    year.totalProfit >= 0
                      ? "text-[var(--metric-positive)]"
                      : "text-[var(--metric-negative)]"
                  )}
                >
                  {formatCurrency(year.totalProfit)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
