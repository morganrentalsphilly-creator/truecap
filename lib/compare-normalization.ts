import type { DealAssumptions } from "@/lib/compare-assumptions";

export type ComparisonNormalizationMode = "as_saved" | "per_100k_purchase";

const SHORT_TERM_NORMALIZABLE_KEYS = new Set([
  "netCashFlow",
  "afterTaxCF",
  "annualCashFlow",
  "noiMonthly",
  "monthlyRentalIncome",
  "operatingExpensesMonthly",
  "downsideNetCashFlow",
  "totalCashRequired",
  "monthlyPayment",
  "taxSavingsMonthly",
]);

export function isComparisonMetricScalable(input: {
  metricKey: string;
  kind?: "currency" | "percent" | "number" | "year" | "multiple";
  longTerm?: boolean;
}): boolean {
  return input.longTerm
    ? input.kind === "currency"
    : SHORT_TERM_NORMALIZABLE_KEYS.has(input.metricKey);
}

export function normalizeComparisonValue(input: {
  mode: ComparisonNormalizationMode;
  metricKey: string;
  value: number | null;
  purchasePrice: number | null;
  kind?: "currency" | "percent" | "number" | "year" | "multiple";
  longTerm?: boolean;
}): number | null {
  const { mode, metricKey, value, purchasePrice, kind, longTerm = false } = input;
  if (value == null || !Number.isFinite(value)) return null;
  if (mode === "as_saved") return value;
  const shouldNormalize = isComparisonMetricScalable({
    metricKey,
    kind,
    longTerm,
  });
  if (!shouldNormalize) return value;
  if (purchasePrice == null || !Number.isFinite(purchasePrice) || purchasePrice <= 0) return null;
  return value * (100_000 / purchasePrice);
}

export type AssumptionDifference = {
  key: string;
  label: string;
  values: string[];
  differs: boolean;
};

function fmt(value: number | null, suffix = ""): string {
  return value == null || !Number.isFinite(value) ? "N/A" : `${Number(value.toFixed(2))}${suffix}`;
}

function fmtCurrency(value: number | null, suffix: string): string {
  if (value == null || !Number.isFinite(value)) return "N/A";
  return `$${Math.round(value).toLocaleString("en-US")}${suffix}`;
}

export function buildAssumptionDifferences(
  deals: readonly { assumptions: DealAssumptions }[]
): AssumptionDifference[] {
  const rows: Array<{
    key: string;
    label: string;
    read: (assumptions: DealAssumptions) => string;
  }> = [
    { key: "interest", label: "Interest rate", read: (a) => fmt(a.financing.interestRatePct, "%") },
    { key: "term", label: "Loan term", read: (a) => fmt(a.financing.loanTermYears, " yr") },
    { key: "down", label: "Down payment", read: (a) => fmt(a.financing.downPaymentPct, "%") },
    { key: "rent", label: "Total monthly rent", read: (a) => fmtCurrency(a.income.totalMonthlyRent, "/mo") },
    { key: "units", label: "Rent roll", read: (a) => a.income.unitsDescription || "N/A" },
    { key: "vacancy", label: "Vacancy", read: (a) => fmt(a.expenses.vacancyPct, "%") },
    { key: "management", label: "Management", read: (a) => fmt(a.expenses.managementPct, "%") },
    { key: "maintenance", label: "Maintenance", read: (a) => fmt(a.expenses.maintenancePct, "%") },
    { key: "capex", label: "CapEx reserve", read: (a) => fmt(a.expenses.capexPct, "%") },
    {
      key: "property_tax",
      label: "Property tax",
      read: (a) =>
        a.expenses.propertyTaxInputMode === "annual"
          ? fmtCurrency(a.expenses.propertyTaxAnnual, "/yr")
          : fmt(a.expenses.propertyTaxPct, "%"),
    },
    {
      key: "insurance",
      label: "Insurance",
      read: (a) =>
        a.expenses.insuranceInputMode === "percent"
          ? fmt(a.expenses.insurancePct, "%")
          : fmtCurrency(a.expenses.insuranceMonthly, "/mo"),
    },
  ];
  return rows.map((row) => {
    const values = deals.map((deal) => row.read(deal.assumptions));
    return {
      key: row.key,
      label: row.label,
      values,
      differs: new Set(values).size > 1,
    };
  });
}
