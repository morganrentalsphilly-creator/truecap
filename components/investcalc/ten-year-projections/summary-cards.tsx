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
          label: "10-Yr Cumulative CF (Pre-Tax)",
          value: formatCurrency(finalYear?.cumulativeCashFlowAnnual ?? 0),
          tone: (finalYear?.cumulativeCashFlowAnnual ?? 0) >= 0 ? "positive" : "negative",
          labelTooltip:
            "Operating cash flow summed across the 10-year hold, before tax. The after-tax total is higher once the depreciation + mortgage-interest shield is applied - compare the after-tax card.",
        },
        {
          label: "Best Annual After-Tax CF",
          value: formatCurrency(bestAfterTax),
          tone: bestAfterTax >= 0 ? "positive" : "negative",
        },
        {
          label: "10-Yr Cumulative CF (After-Tax)",
          value: formatCurrency(totalAfterTax),
          tone: totalAfterTax >= 0 ? "positive" : "negative",
          labelTooltip:
            "Pre-tax cumulative cash flow plus the estimated depreciation + interest tax shield over the 10-year hold. The gap between this and the pre-tax card is your tax benefit.",
        },
      ]}
    />
  );
}
