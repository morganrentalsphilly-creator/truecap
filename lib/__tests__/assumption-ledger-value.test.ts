import { describe, expect, it } from "vitest";

import { formatAssumptionLedgerValue } from "@/lib/assumption-ledger-value";
import type { InvestmentFormValues } from "@/lib/investcalc-schema";
import { SAMPLE_DEAL_VALUES } from "@/lib/sample-deal";

describe("formatAssumptionLedgerValue", () => {
  it("shows the frozen sample inputs with the units investors need to audit them", () => {
    const values = SAMPLE_DEAL_VALUES;

    expect(formatAssumptionLedgerValue("purchasePrice", values)).toBe("$265,000");
    expect(formatAssumptionLedgerValue("yearBuilt", values)).toBe("1942");
    expect(formatAssumptionLedgerValue("rent", values)).toBe("$3,050/mo");
    expect(formatAssumptionLedgerValue("propertyTax", values)).toBe(
      "1.49% of price/yr",
    );
    expect(formatAssumptionLedgerValue("insurance", values)).toBe(
      "0.5% of price/yr",
    );
    expect(formatAssumptionLedgerValue("interestRate", values)).toBe(
      "6.6% · 30-year term",
    );
    expect(formatAssumptionLedgerValue("downPayment", values)).toBe("20% down");
    expect(formatAssumptionLedgerValue("closingCosts", values)).toBe(
      "3% of price",
    );
    expect(formatAssumptionLedgerValue("maintenance", values)).toBe("5% of rent");
    expect(formatAssumptionLedgerValue("capex", values)).toBe("5% of rent");
    expect(formatAssumptionLedgerValue("vacancy", values)).toBe("5% of rent");
    expect(formatAssumptionLedgerValue("management", values)).toBe("8% of rent");
    expect(formatAssumptionLedgerValue("utilities", values)).toBe("$0/mo");
    expect(formatAssumptionLedgerValue("hoa", values)).toBe("$0/mo");
    expect(formatAssumptionLedgerValue("rehabBudget", values)).toBe("$0 one-time");
  });

  it("labels active fixed-dollar and cash-financing modes without converting units", () => {
    const values = {
      ...SAMPLE_DEAL_VALUES,
      underwritingModelVersion: "2.0",
      financingMode: "cash",
      downPaymentPct: 100,
      propertyTaxInputMode: "annual",
      propertyTaxAnnual: 4_900,
      insuranceInputMode: "monthly",
      insuranceMonthly: 175,
      closingCostsInputMode: "fixed",
      closingCostsFixed: 7_300,
    } satisfies InvestmentFormValues;

    expect(formatAssumptionLedgerValue("propertyTax", values)).toBe("$4,900/yr");
    expect(formatAssumptionLedgerValue("insurance", values)).toBe("$175/mo");
    expect(formatAssumptionLedgerValue("interestRate", values)).toBe(
      "N/A — cash purchase",
    );
    expect(formatAssumptionLedgerValue("downPayment", values)).toBe(
      "$265,000 · 100% cash",
    );
    expect(formatAssumptionLedgerValue("closingCosts", values)).toBe(
      "$7,300 fixed",
    );
  });

  it("distinguishes unit totals, nightly income, and the v2 scenario rent", () => {
    const multiFamily = {
      ...SAMPLE_DEAL_VALUES,
      propertyType: "owner-occupant",
      units: [
        { monthlyRent: 0, isOwnerOccupied: true },
        { monthlyRent: 1_450, isOwnerOccupied: false },
        { monthlyRent: 1_550, isOwnerOccupied: false },
      ],
    } satisfies InvestmentFormValues;
    expect(formatAssumptionLedgerValue("rent", multiFamily)).toBe(
      "$3,000/mo total",
    );

    const nightly = {
      ...SAMPLE_DEAL_VALUES,
      avgDailyRate: 185,
      occupancyPct: 67.5,
    } satisfies InvestmentFormValues;
    expect(formatAssumptionLedgerValue("rent", nightly)).toBe(
      "$185/night · 67.5% occupancy",
    );

    const v2Scenario = {
      ...SAMPLE_DEAL_VALUES,
      underwritingModelVersion: "2.0",
      operatingScenario: "stabilized",
      stabilizedMonthlyRent: 3_450,
    } satisfies InvestmentFormValues;
    expect(formatAssumptionLedgerValue("rent", v2Scenario)).toBe(
      "$3,450/mo · stabilized",
    );
  });
});
