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
          label: "Year 1 Taxable Rental Income",
          value: formatCurrency(yearOne?.taxableRentalIncomeAnnual ?? 0),
          tone: (yearOne?.taxableRentalIncomeAnnual ?? 0) >= 0 ? "negative" : "positive",
        },
        {
          label: "Year 1 Estimated Tax Savings",
          value: formatCurrency(yearOne?.taxSavingsAnnual ?? 0),
          tone: (yearOne?.taxSavingsAnnual ?? 0) > 0 ? "positive" : "neutral",
        },
        {
          label: "10-Year Tax Benefit",
          value: formatCurrency(totalTaxBenefit),
          tone: totalTaxBenefit >= 0 ? "positive" : "negative",
          labelTooltip: "Represents tax impact from depreciation and mortgage interest deductions",
        },
        {
          label: "Annual Depreciation",
          value: formatCurrency(yearOne?.depreciationDeductionAnnual ?? 0),
          tone: "neutral",
        },
        {
          label: "Year 1 Mortgage Interest Deduction",
          value: formatCurrency(yearOne?.mortgageInterestDeductionAnnual ?? 0),
          tone: (yearOne?.mortgageInterestDeductionAnnual ?? 0) > 0 ? "positive" : "neutral",
        },
      ]}
    />
  );
}
