"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { formatCurrency } from "@/components/investcalc/analysis-panels/shared/formatters";
import { cn } from "@/lib/utils";
import type { ProjectionYear } from "@/lib/ten-year-projections";
import { ScrollX } from "@/components/ui/scroll-x";

export function TenYearProjectionTable({
  projectionYears,
  showTaxMetrics = false,
}: {
  projectionYears: ProjectionYear[];
  showTaxMetrics?: boolean;
}) {
  const [openYear, setOpenYear] = useState<number | null>(
    projectionYears[0]?.year ?? null,
  );
  const hasBalloon = projectionYears.some(
    (year) => (year.balloonPaymentAnnual ?? 0) > 0,
  );
  // Sentence case, acronyms kept (DESIGN.md chrome rules, table heads
  // included).
  const columns = [
    "Year",
    "Rental income",
    "Operating expenses",
    "Annual debt service (P&I + mortgage insurance)",
    ...(hasBalloon ? ["Balloon due"] : []),
    "Net cash flow",
    ...(showTaxMetrics ? ["Tax effect", "After-tax cash flow"] : []),
    "Cumulative cash flow",
  ];

  return (
    <>
      {/* Phones: one ruled row per year, not a stack of cards. */}
      <div className="divide-y divide-border border-y border-border sm:hidden">
        {projectionYears.map((year) => {
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
                  {formatCurrency(year.rentalIncomeAnnual)} /{" "}
                  {formatCurrency(year.operatingExpensesAnnual)}
                </span>
                {isOpen ? (
                  <ChevronUp className="size-4 shrink-0 text-muted-foreground" />
                ) : (
                  <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
                )}
              </button>

              {isOpen && (
                <div className="pb-2">
                  {(
                    [
                      [
                        "Rental income",
                        formatCurrency(year.rentalIncomeAnnual),
                      ],
                      [
                        "Operating expenses",
                        formatCurrency(year.operatingExpensesAnnual),
                      ],
                      [
                        "Annual debt service (P&I + mortgage insurance)",
                        formatCurrency(year.debtServiceAnnual),
                      ],
                      ...((year.balloonPaymentAnnual ?? 0) > 0
                        ? [
                            [
                              "Balloon due at maturity",
                              formatCurrency(year.balloonPaymentAnnual ?? 0),
                              -(year.balloonPaymentAnnual ?? 0),
                            ],
                            [
                              "Total financing outflow",
                              formatCurrency(
                                year.financingOutflowAnnual ??
                                  year.debtServiceAnnual +
                                    (year.balloonPaymentAnnual ?? 0),
                              ),
                            ],
                          ]
                        : []),
                      [
                        "Net cash flow",
                        formatCurrency(year.netCashFlowAnnual),
                        year.netCashFlowAnnual,
                      ],
                      ...(showTaxMetrics
                        ? [
                            [
                              "Tax effect",
                              formatCurrency(year.taxSavingsAnnual),
                              year.taxSavingsAnnual,
                            ],
                            [
                              "After-tax cash flow",
                              formatCurrency(year.afterTaxCashFlowAnnual),
                              year.afterTaxCashFlowAnnual,
                            ],
                          ]
                        : []),
                      [
                        "Cumulative cash flow",
                        formatCurrency(year.cumulativeCashFlowAnnual),
                        year.cumulativeCashFlowAnnual,
                      ],
                    ] as Array<[string, string, number?]>
                  ).map(([label, value, numericValue]) => (
                    <div
                      key={String(label)}
                      className="flex items-center justify-between gap-3 border-b border-rule-soft py-2 last:border-b-0"
                    >
                      <span className="text-xs font-medium text-muted-foreground">
                        {label}
                      </span>
                      <span
                        className={cn(
                          "text-right font-figure text-sm font-semibold text-foreground",
                          typeof numericValue === "number" &&
                            (numericValue >= 0
                              ? "text-positive"
                              : "text-negative"),
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

      {/* cue + stickyFirstColumn: below about 1120px the 980px table is
          wider than the card, and at 768px its two cash-flow columns were
          off-screen with nothing to say so. The card chrome sits on the
          scroll region itself so the "Scroll for more" cue lands under the
          card, and the head is the solid band so the pinned Year head
          matches its row. */}
      <div className="hidden sm:block">
        {/* The table sits on lines inside the ledger row's card: a 1px line
            above, the head on the band, rows on soft lines; no card of its
            own. */}
        <ScrollX
          label="Table"
          cue
          stickyFirstColumn
          className="overflow-x-auto border-t border-border"
        >
          <table className="w-full min-w-[980px] text-sm">
            <thead className="bg-muted">
              <tr className="h-12 border-b border-border">
                {columns.map((label) => (
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
              {projectionYears.map((year) => (
                <tr
                  key={year.year}
                  className="border-b border-rule-soft last:border-b-0"
                >
                  <td className="px-4 py-3 font-figure font-semibold text-foreground">
                    {year.year}
                  </td>
                  <td className="px-4 py-3 font-figure">
                    {formatCurrency(year.rentalIncomeAnnual)}
                  </td>
                  <td className="px-4 py-3 font-figure">
                    {formatCurrency(year.operatingExpensesAnnual)}
                  </td>
                  <td className="px-4 py-3 font-figure">
                    {formatCurrency(year.debtServiceAnnual)}
                  </td>
                  {hasBalloon ? (
                    <td
                      className={cn(
                        "px-4 py-3 font-figure font-semibold",
                        (year.balloonPaymentAnnual ?? 0) > 0
                          ? "text-negative"
                          : "text-muted-foreground",
                      )}
                    >
                      {(year.balloonPaymentAnnual ?? 0) > 0
                        ? formatCurrency(year.balloonPaymentAnnual ?? 0)
                        : "—"}
                    </td>
                  ) : null}
                  <td
                    className={cn(
                      "px-4 py-3 font-figure font-semibold",
                      year.netCashFlowAnnual >= 0
                        ? "text-positive"
                        : "text-negative",
                    )}
                  >
                    {formatCurrency(year.netCashFlowAnnual)}
                  </td>
                  {showTaxMetrics ? (
                    <>
                      <td
                        className={cn(
                          "px-4 py-3 font-figure",
                          year.taxSavingsAnnual >= 0
                            ? "text-positive"
                            : "text-negative",
                        )}
                      >
                        {formatCurrency(year.taxSavingsAnnual)}
                      </td>
                      <td
                        className={cn(
                          "px-4 py-3 font-figure font-semibold",
                          year.afterTaxCashFlowAnnual >= 0
                            ? "text-positive"
                            : "text-negative",
                        )}
                      >
                        {formatCurrency(year.afterTaxCashFlowAnnual)}
                      </td>
                    </>
                  ) : null}
                  <td
                    className={cn(
                      "px-4 py-3 font-figure font-semibold",
                      year.cumulativeCashFlowAnnual >= 0
                        ? "text-positive"
                        : "text-negative",
                    )}
                  >
                    {formatCurrency(year.cumulativeCashFlowAnnual)}
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
