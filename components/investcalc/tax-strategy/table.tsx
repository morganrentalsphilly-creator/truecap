"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
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
  "Modeled Tax Savings",
  "Modeled Tax Liability",
  "Net Modeled Tax Impact",
  "Cumulative Modeled Tax Impact",
];

export function TaxStrategyTable({
  years,
}: {
  years: TaxStrategyYear[];
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
                  {formatCurrency(year.rentalIncomeAnnual)} / {formatCurrency(year.operatingExpensesAnnual)}
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
                    ["Rental Income", formatCurrency(year.rentalIncomeAnnual)],
                    ["Operating Expenses", formatCurrency(year.operatingExpensesAnnual)],
                    ["Mortgage Interest Deduction", formatCurrency(year.mortgageInterestDeductionAnnual)],
                    ["Depreciation Deduction", formatCurrency(year.depreciationDeductionAnnual)],
                    ["Total Deductions", formatCurrency(year.totalDeductionsAnnual)],
                    ["Taxable Rental Income", formatCurrency(year.taxableRentalIncomeAnnual), -year.taxableRentalIncomeAnnual],
                    ["Modeled Tax Savings", formatCurrency(year.taxSavingsAnnual), year.taxSavingsAnnual],
                    ["Modeled Tax Liability", formatCurrency(year.taxLiabilityAnnual), -year.taxLiabilityAnnual],
                    ["Net Modeled Tax Impact", formatCurrency(year.netTaxBenefitAnnual), year.netTaxBenefitAnnual],
                    ["Cumulative Modeled Tax Impact", formatCurrency(year.cumulativeTaxBenefitAnnual), year.cumulativeTaxBenefitAnnual],
                  ].map(([label, value, numericValue]) => (
                    <div key={String(label)} className="flex items-center justify-between gap-3 border-b border-border/70 py-2 last:border-b-0">
                      <span className="text-xs font-medium text-muted-foreground">{label}</span>
                      <span
                        className={cn(
                          "text-right text-sm font-semibold text-foreground",
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
    </>
  );
}
