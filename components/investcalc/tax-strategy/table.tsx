"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { formatCurrency } from "@/components/investcalc/analysis-panels/shared/formatters";
import { cn } from "@/lib/utils";
import type { TaxStrategyYear } from "@/lib/tax-strategy";
import { ScrollX } from "@/components/ui/scroll-x";

// Sentence case, acronyms kept (DESIGN.md chrome rules, table heads included).
const COLUMNS = [
  "Year",
  "Rental income",
  "Operating expenses",
  "Mortgage interest deduction",
  "Depreciation deduction",
  "Total deductions",
  "Taxable rental income",
  "Modeled tax savings",
  "Modeled tax liability",
  "Net modeled tax impact",
  "Cumulative modeled tax impact",
];

export function TaxStrategyTable({
  years,
}: {
  years: TaxStrategyYear[];
}) {
  const [openYear, setOpenYear] = useState<number | null>(years[0]?.year ?? null);

  return (
    <>
      {/* Phones: one ruled row per year, not a stack of cards. */}
      <div className="divide-y divide-border border-y border-border sm:hidden">
        {years.map((year) => {
          const isOpen = openYear === year.year;
          return (
            <div key={year.year}>
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => setOpenYear(isOpen ? null : year.year)}
                className="flex min-h-11 w-full items-center justify-between gap-3 py-3 text-left focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                <span className="text-sm font-semibold text-foreground">
                  Year {year.year}
                </span>
                <span className="ml-auto min-w-0 truncate text-right font-figure text-xs text-muted-foreground">
                  {formatCurrency(year.rentalIncomeAnnual)} / {formatCurrency(year.operatingExpensesAnnual)}
                </span>
                {isOpen ? (
                  <ChevronUp className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                ) : (
                  <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                )}
              </button>

              {isOpen && (
                <div className="pb-2">
                  {[
                    ["Rental income", formatCurrency(year.rentalIncomeAnnual)],
                    ["Operating expenses", formatCurrency(year.operatingExpensesAnnual)],
                    ["Mortgage interest deduction", formatCurrency(year.mortgageInterestDeductionAnnual)],
                    ["Depreciation deduction", formatCurrency(year.depreciationDeductionAnnual)],
                    ["Total deductions", formatCurrency(year.totalDeductionsAnnual)],
                    ["Taxable rental income", formatCurrency(year.taxableRentalIncomeAnnual), -year.taxableRentalIncomeAnnual],
                    ["Modeled tax savings", formatCurrency(year.taxSavingsAnnual), year.taxSavingsAnnual],
                    ["Modeled tax liability", formatCurrency(year.taxLiabilityAnnual), -year.taxLiabilityAnnual],
                    ["Net modeled tax impact", formatCurrency(year.netTaxBenefitAnnual), year.netTaxBenefitAnnual],
                    ["Cumulative modeled tax impact", formatCurrency(year.cumulativeTaxBenefitAnnual), year.cumulativeTaxBenefitAnnual],
                  ].map(([label, value, numericValue]) => (
                    <div key={String(label)} className="flex items-center justify-between gap-3 border-b border-rule-soft py-2 last:border-b-0">
                      <span className="text-xs font-medium text-muted-foreground">{label}</span>
                      <span
                        className={cn(
                          "text-right font-figure text-sm font-semibold text-foreground",
                          typeof numericValue === "number" &&
                            (numericValue >= 0 ? "text-positive" : "text-negative")
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

      {/* The table sits on lines inside the ledger row's card: a 1px line
          above, the head on the band, rows on soft lines; no card of its own. */}
      <div className="hidden border-t border-border sm:block">
        <ScrollX label="Table" className="overflow-x-auto">
        <table className="w-full min-w-[1320px] text-sm">
          <thead className="bg-muted">
            <tr className="h-12 border-b border-border">
              {COLUMNS.map((label) => (
                <th
                  key={label}
                  className="px-4 text-left text-xs font-semibold text-muted-foreground"
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {years.map((year) => (
              <tr key={year.year} className="border-b border-rule-soft last:border-b-0">
                <td className="px-4 py-3 font-figure font-semibold text-foreground">{year.year}</td>
                <td className="px-4 py-3 font-figure">{formatCurrency(year.rentalIncomeAnnual)}</td>
                <td className="px-4 py-3 font-figure">{formatCurrency(year.operatingExpensesAnnual)}</td>
                <td className="px-4 py-3 font-figure">{formatCurrency(year.mortgageInterestDeductionAnnual)}</td>
                <td className="px-4 py-3 font-figure">{formatCurrency(year.depreciationDeductionAnnual)}</td>
                <td className="px-4 py-3 font-figure">{formatCurrency(year.totalDeductionsAnnual)}</td>
                <td
                  className={cn(
                    "px-4 py-3 font-figure font-semibold",
                    year.taxableRentalIncomeAnnual < 0
                      ? "text-positive"
                      : "text-negative"
                  )}
                >
                  {formatCurrency(year.taxableRentalIncomeAnnual)}
                </td>
                <td className="px-4 py-3 font-figure font-semibold text-positive">
                  {formatCurrency(year.taxSavingsAnnual)}
                </td>
                <td className="px-4 py-3 font-figure font-semibold text-negative">
                  {formatCurrency(year.taxLiabilityAnnual)}
                </td>
                <td
                  className={cn(
                    "px-4 py-3 font-figure font-semibold",
                    year.netTaxBenefitAnnual >= 0
                      ? "text-positive"
                      : "text-negative"
                  )}
                >
                  {formatCurrency(year.netTaxBenefitAnnual)}
                </td>
                <td
                  className={cn(
                    "px-4 py-3 font-figure font-semibold",
                    year.cumulativeTaxBenefitAnnual >= 0
                      ? "text-positive"
                      : "text-negative"
                  )}
                >
                  {formatCurrency(year.cumulativeTaxBenefitAnnual)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </ScrollX>
      </div>
    </>
  );
}
