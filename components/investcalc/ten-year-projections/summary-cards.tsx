"use client";

import type { ProjectionYear } from "@/lib/ten-year-projections";
import { SummaryCardGrid } from "@/components/investcalc/analysis-panels/shared/summary-card-grid";
import { formatCurrency } from "@/components/investcalc/analysis-panels/shared/formatters";

export function TenYearProjectionSummaryCards({
  projectionYears,
}: {
  projectionYears: ProjectionYear[];
}) {
  const finalYear = projectionYears[projectionYears.length - 1];
  const bestAfterTax = Math.max(...projectionYears.map((year) => year.afterTaxCashFlowAnnual));
  const totalAfterTax = projectionYears.reduce((sum, year) => sum + year.afterTaxCashFlowAnnual, 0);

  return (
    <SummaryCardGrid
      items={[
        {
          label: "Year 10 Cumulative CF",
          value: formatCurrency(finalYear?.cumulativeCashFlowAnnual ?? 0),
          tone: (finalYear?.cumulativeCashFlowAnnual ?? 0) >= 0 ? "positive" : "negative",
        },
        {
          label: "Best Annual After-Tax CF",
          value: formatCurrency(bestAfterTax),
          tone: bestAfterTax >= 0 ? "positive" : "negative",
        },
        {
          label: "10-Year After-Tax Cash Flow (Projection)",
          value: formatCurrency(totalAfterTax),
          tone: totalAfterTax >= 0 ? "positive" : "negative",
          labelTooltip: "Includes rental cash flow plus estimated tax savings over time",
        },
      ]}
    />
  );
}
