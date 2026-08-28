"use client";

import type { ProjectionYear } from "@/lib/ten-year-projections";
import { SummaryCardGrid } from "@/components/investcalc/analysis-panels/shared/summary-card-grid";
import { formatCurrency } from "@/components/investcalc/analysis-panels/shared/formatters";

export function TenYearProjectionSummaryCards({
  projectionYears,
  showTaxMetrics = false,
}: {
  projectionYears: ProjectionYear[];
  showTaxMetrics?: boolean;
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
            "Operating cash flow summed across the 10-year hold, before tax.",
        },
        ...(showTaxMetrics
          ? [
              {
                label: "Best Annual After-Tax CF",
                value: formatCurrency(bestAfterTax),
                tone: bestAfterTax >= 0 ? ("positive" as const) : ("negative" as const),
              },
              {
                label: "10-Yr Cumulative CF (After-Tax)",
                value: formatCurrency(totalAfterTax),
                tone: totalAfterTax >= 0 ? ("positive" as const) : ("negative" as const),
                labelTooltip:
                  "Pre-tax cumulative cash flow plus the signed illustrative tax effect over the 10-year hold. A positive gap is a modeled benefit; a negative gap is a modeled liability. Actual treatment and loss usability vary.",
              },
            ]
          : []),
      ]}
    />
  );
}
