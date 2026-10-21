"use client";

import { SummaryCardGrid } from "@/components/investcalc/analysis-panels/shared/summary-card-grid";
import { formatCurrency } from "@/components/investcalc/analysis-panels/shared/formatters";
import type { TaxStrategyYear } from "@/lib/tax-strategy";

export function TaxStrategySummaryCards({
  years,
}: {
  years: TaxStrategyYear[];
}) {
  const yearOne = years[0];
  const totalTaxBenefit = years.reduce((sum, year) => sum + year.netTaxBenefitAnnual, 0);

  return (
    <SummaryCardGrid
      columnsClassName="md:grid-cols-2 xl:grid-cols-5"
      items={[
        {
          label: "Year 1 taxable rental income",
          value: formatCurrency(yearOne?.taxableRentalIncomeAnnual ?? 0),
          tone: (yearOne?.taxableRentalIncomeAnnual ?? 0) >= 0 ? "negative" : "positive",
        },
        {
          label: "Year 1 estimated tax savings",
          value: formatCurrency(yearOne?.taxSavingsAnnual ?? 0),
          tone: (yearOne?.taxSavingsAnnual ?? 0) > 0 ? "positive" : "neutral",
        },
        {
          label: "10-year illustrative tax impact",
          value: formatCurrency(totalTaxBenefit),
          tone: totalTaxBenefit >= 0 ? "positive" : "negative",
          labelTooltip:
            "Modeled net impact from rental income and entered deductions at the assumed marginal rate; actual tax treatment varies.",
        },
        {
          label: "Annual depreciation",
          value: formatCurrency(yearOne?.depreciationDeductionAnnual ?? 0),
          tone: "neutral",
        },
        {
          label: "Year 1 mortgage interest deduction",
          value: formatCurrency(yearOne?.mortgageInterestDeductionAnnual ?? 0),
          tone: (yearOne?.mortgageInterestDeductionAnnual ?? 0) > 0 ? "positive" : "neutral",
        },
      ]}
    />
  );
}
