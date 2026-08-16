"use client";

import { SummaryCardGrid } from "@/components/investcalc/analysis-panels/shared/summary-card-grid";
import { formatCurrency } from "@/components/investcalc/analysis-panels/shared/formatters";
import { formatRoiHeadline } from "@/lib/extreme-value-format";
import type { ExitScenarioYear } from "@/lib/exit-scenarios";
import { computeReturnSummaryFromExitYears } from "@/lib/returns";

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
  // One return basis everywhere. This helper correctly adds exit tax back
  // when recovering cash invested; the former inline identity omitted it and
  // understated the denominator whenever tax was owed at sale.
  const returnSummary = computeReturnSummaryFromExitYears(years);
  const totalRoi = returnSummary?.roiPct ?? null;
  // Extreme cumulative ROI (finding 5): the card shows the framed band in
  // a neutral tone (no green celebration); the raw figure stays one hover
  // away on the label tooltip. Sane values keep today's exact formatting.
  const roiHeadline =
    totalRoi == null
      ? null
      : formatRoiHeadline(totalRoi, { decimals: 1, signed: true, compact: true });

  return (
    <SummaryCardGrid
      columnsClassName="md:grid-cols-2 xl:grid-cols-4"
      items={[
        {
          label: "Highest Modeled Profit",
          value: bestYear
            ? `${formatCurrency(bestYear.totalProfit)} · Y${bestYear.year}`
            : "—",
          tone: bestYear && bestYear.totalProfit >= 0 ? "positive" : "negative",
          labelTooltip: bestYear
            ? `Highest modeled profit among the exits shown (Year ${bestYear.year}); not a risk-adjusted recommendation to sell in that year.`
            : undefined,
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
          value:
            totalRoi == null
              ? "—"
              : roiHeadline?.extreme
                ? roiHeadline.text
                : `${totalRoi >= 0 ? "+" : ""}${totalRoi.toFixed(1)}%`,
          tone:
            totalRoi == null || roiHeadline?.extreme
              ? "neutral"
              : totalRoi >= 0
                ? "positive"
                : "negative",
          labelTooltip: roiHeadline?.title,
        },
      ]}
    />
  );
}
