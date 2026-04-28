"use client";

import { SummaryCardGrid } from "@/components/investcalc/analysis-panels/shared/summary-card-grid";
import { formatCurrency } from "@/components/investcalc/analysis-panels/shared/formatters";
import type { ExitScenarioYear } from "@/lib/exit-scenarios";

export function ExitScenarioSummaryCards({
  years,
}: {
  years: ExitScenarioYear[];
}) {
  const bestYear = years.reduce<ExitScenarioYear | null>(
    (best, year) => (!best || year.totalProfit > best.totalProfit ? year : best),
    null
  );
  const year5 = years.find((year) => year.year === 5) ?? null;
  const year10 = years.find((year) => year.year === 10) ?? years[years.length - 1] ?? null;
  const initialInvestment = year10
    ? year10.netSaleProceeds + year10.cumulativeCashFlow + year10.cumulativeTaxBenefit - year10.totalProfit
    : 0;
  const totalRoi = initialInvestment > 0 && year10 ? (year10.totalProfit / initialInvestment) * 100 : 0;

  return (
    <SummaryCardGrid
      columnsClassName="md:grid-cols-2 xl:grid-cols-4"
      items={[
        {
          label: "Best Year to Sell",
          value: bestYear ? `Year ${bestYear.year}` : "—",
          tone: bestYear && bestYear.totalProfit >= 0 ? "positive" : "negative",
        },
        {
          label: "Year 5 Profit",
          value: formatCurrency(year5?.totalProfit ?? 0),
          tone: (year5?.totalProfit ?? 0) >= 0 ? "positive" : "negative",
        },
        {
          label: "Year 10 Profit",
          value: formatCurrency(year10?.totalProfit ?? 0),
          tone: (year10?.totalProfit ?? 0) >= 0 ? "positive" : "negative",
        },
        {
          label: "Total ROI",
          value: `${totalRoi >= 0 ? "+" : ""}${totalRoi.toFixed(1)}%`,
          tone: totalRoi >= 0 ? "positive" : "negative",
        },
      ]}
    />
  );
}
