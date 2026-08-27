import type { InvestmentFormValues } from "@/lib/investcalc-schema";
import type { InputConfidenceFieldKey } from "@/lib/input-confidence";

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function numberOrNull(value: unknown): number | null {
  const parsed =
    typeof value === "number"
      ? value
      : value == null || value === ""
        ? Number.NaN
        : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatMoney(value: number): string {
  return money.format(Math.round(value));
}

function formatPercent(value: number): string {
  return Number(value.toFixed(2)).toLocaleString("en-US");
}

function formatRent(values: InvestmentFormValues): string {
  if (values.underwritingModelVersion === "2.0") {
    const scenarioRent =
      values.operatingScenario === "stabilized"
        ? numberOrNull(values.stabilizedMonthlyRent)
        : numberOrNull(values.currentMonthlyRent);
    if (scenarioRent != null) {
      const scenarioLabel =
        values.operatingScenario === "stabilized" ? "stabilized" : "current";
      return `${formatMoney(scenarioRent)}/mo · ${scenarioLabel}`;
    }
  }

  const nightlyRate = numberOrNull(values.avgDailyRate);
  const occupancy = numberOrNull(values.occupancyPct);
  if (nightlyRate != null && nightlyRate > 0 && occupancy != null) {
    return `${formatMoney(nightlyRate)}/night · ${formatPercent(occupancy)}% occupancy`;
  }

  if (values.propertyType !== "single-family") {
    const incomeUnitRents = (values.units ?? [])
      .filter((unit) => !unit.isOwnerOccupied)
      .map((unit) => numberOrNull(unit.monthlyRent))
      .filter((rent): rent is number => rent != null);
    if (incomeUnitRents.length > 0) {
      const total = incomeUnitRents.reduce((sum, rent) => sum + rent, 0);
      return `${formatMoney(total)}/mo total`;
    }
  }

  const monthlyRent = numberOrNull(values.monthlyRent);
  return monthlyRent == null ? "Not entered" : `${formatMoney(monthlyRent)}/mo`;
}

/**
 * Formats the exact frozen input represented by each Assumption Ledger row.
 * Display fallbacks intentionally mirror the released v1 calculation engine:
 * taxes 1.1%, insurance 0.5%, closing costs 3%, and omitted monthly extras 0.
 * This function is presentation-only and never participates in calculations.
 */
export function formatAssumptionLedgerValue(
  key: InputConfidenceFieldKey,
  values: InvestmentFormValues,
): string {
  switch (key) {
    case "purchasePrice": {
      const value = numberOrNull(values.purchasePrice);
      return value == null ? "Not entered" : formatMoney(value);
    }
    case "yearBuilt": {
      const value = numberOrNull(values.yearBuilt);
      return value == null ? "Not entered" : String(Math.round(value));
    }
    case "rent":
      return formatRent(values);
    case "propertyTax": {
      const annual = numberOrNull(values.propertyTaxAnnual);
      if (values.propertyTaxInputMode === "annual" && annual != null) {
        return `${formatMoney(annual)}/yr`;
      }
      return `${formatPercent(numberOrNull(values.propertyTaxPct) ?? 1.1)}% of price/yr`;
    }
    case "insurance": {
      const monthly = numberOrNull(values.insuranceMonthly);
      if (values.insuranceInputMode === "monthly" && monthly != null) {
        return `${formatMoney(monthly)}/mo`;
      }
      return `${formatPercent(numberOrNull(values.insurancePct) ?? 0.5)}% of price/yr`;
    }
    case "interestRate": {
      const v2Cash =
        values.underwritingModelVersion === "2.0" &&
        values.financingMode === "cash";
      if (v2Cash || values.downPaymentPct >= 100) {
        return "N/A — cash purchase";
      }
      const rate = numberOrNull(values.interestRate);
      const term = numberOrNull(values.loanTermYears);
      if (rate == null) return "Not entered";
      return term == null
        ? `${formatPercent(rate)}%`
        : `${formatPercent(rate)}% · ${formatPercent(term)}-year term`;
    }
    case "downPayment": {
      const usesV2Financing = values.underwritingModelVersion === "2.0";
      if (usesV2Financing && values.financingMode === "cash") {
        const price = numberOrNull(values.purchasePrice);
        return price == null ? "100% cash" : `${formatMoney(price)} · 100% cash`;
      }
      if (usesV2Financing && values.financingMode === "fixed-down") {
        const fixedDown = numberOrNull(values.fixedDownPaymentAmount);
        return fixedDown == null ? "Not entered" : `${formatMoney(fixedDown)} fixed down`;
      }
      if (usesV2Financing && values.financingMode === "fixed-loan") {
        const fixedLoan = numberOrNull(values.fixedLoanAmount);
        return fixedLoan == null ? "Not entered" : `${formatMoney(fixedLoan)} fixed loan`;
      }
      const down = numberOrNull(values.downPaymentPct);
      return down == null ? "Not entered" : `${formatPercent(down)}% down`;
    }
    case "closingCosts": {
      const fixed = numberOrNull(values.closingCostsFixed);
      if (
        values.underwritingModelVersion === "2.0" &&
        values.closingCostsInputMode === "fixed" &&
        fixed != null
      ) {
        return `${formatMoney(fixed)} fixed`;
      }
      return `${formatPercent(numberOrNull(values.closingCostsPct) ?? 3)}% of price`;
    }
    case "maintenance":
      return `${formatPercent(numberOrNull(values.maintenancePct) ?? 0)}% of rent`;
    case "capex":
      return `${formatPercent(numberOrNull(values.capexPct) ?? 0)}% of rent`;
    case "vacancy":
      return `${formatPercent(numberOrNull(values.vacancyPct) ?? 0)}% of rent`;
    case "management":
      return `${formatPercent(numberOrNull(values.mgmtPct) ?? 0)}% of rent`;
    case "utilities":
      return `${formatMoney(numberOrNull(values.utilitiesMonthly) ?? 0)}/mo`;
    case "hoa":
      return `${formatMoney(numberOrNull(values.hoaMonthly) ?? 0)}/mo`;
    case "rehabBudget":
      return `${formatMoney(numberOrNull(values.rehabBudget) ?? 0)} one-time`;
    default: {
      const exhaustive: never = key;
      return exhaustive;
    }
  }
}
