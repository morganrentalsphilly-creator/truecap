"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
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
  const [openYear, setOpenYear] = useState<number | null>(years[0]?.year ?? null);

  return (
    <>
      <div className="space-y-2 sm:hidden">
        {years.map((year) => {
          const isOpen = openYear === year.year;
          return (
            <div key={year.year} className="rounded-xl border border-border bg-card shadow-sm">
              <button
                type="button"
                onClick={() => setOpenYear(isOpen ? null : year.year)}
                className={cn(
                  "flex w-full items-center justify-between gap-3 px-3.5 py-3 text-left",
                  isOpen && "border-b border-border"
                )}
              >
                <span className={cn("text-sm font-bold", isOpen ? "text-primary" : "text-foreground")}>
                  Year {year.year}
                </span>
                <span className="ml-auto min-w-0 truncate text-right text-xs font-medium text-muted-foreground">
                  {formatCurrency(year.propertyValue)} / {formatCurrency(year.remainingLoanBalance)}
                </span>
                {isOpen ? (
                  <ChevronUp className="size-4 shrink-0 text-muted-foreground" />
                ) : (
                  <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
                )}
              </button>

              {isOpen && (
                <div className="px-3.5 py-2">
                  {[
                    ["Property Value", formatCurrency(year.propertyValue)],
                    ["Loan Balance", formatCurrency(year.remainingLoanBalance)],
                    ["Equity", formatCurrency(year.equity), year.equity],
                    ["Net Sale Proceeds", formatCurrency(year.netSaleProceeds), year.netSaleProceeds],
                    ["Total Profit", formatCurrency(year.totalProfit), year.totalProfit],
                  ].map(([label, value, numericValue]) => (
                    <div key={String(label)} className="flex items-center justify-between border-b border-border/70 py-2 last:border-b-0">
                      <span className="text-xs font-medium text-muted-foreground">{label}</span>
                      <span
                        className={cn(
                          "text-sm font-semibold text-foreground",
                          typeof numericValue === "number" &&
                            (numericValue >= 0 ? "text-[var(--metric-positive)]" : "text-[var(--metric-negative)]")
                        )}
                      >
                        {value}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="hidden rounded-2xl border border-border bg-card overflow-hidden sm:block">
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
    </>
  );
}
