import { describe, expect, it } from "vitest";

import {
  buildTenYearProjectionInputHash,
  type TenYearProjectionInput,
} from "../ten-year-projections";
import { buildTaxStrategyInputHash, type TaxStrategyInput } from "../tax-strategy";

// ──────────────────────────────────────────────────────────────────
// Snapshot input hashes — every input the compute uses must be keyed.
//
// v4 of both engines subtracts capexReserveMonthly from the taxable-income
// line, but the hash builders omitted it: a Pro user lowering CapEx% and
// raising Maintenance% by offsetting amounts (total opex unchanged) got an
// identical hash, so the saved-deal panels served the STALE cached snapshot
// with the old tax lines while the live in-page calc showed the new ones.
// ──────────────────────────────────────────────────────────────────

const baseProjectionInput: TenYearProjectionInput = {
  monthlyRentalIncome: 2_000,
  totalOperatingExpenses: 800,
  capexReserveMonthly: 100,
  monthlyPayment: 1_100,
  pmiMonthly: 0,
  loanAmount: 240_000,
  purchasePrice: 300_000,
  taxSavingsMonthly: 150,
  annualDepreciation: 8_700,
  yearlyInterestSchedule: [16_700, 16_500, 16_300],
  rentGrowthPct: 3,
  expenseGrowthPct: 2,
  taxRate: 0.24,
  includeInterestDeduction: true,
};

const baseTaxInput: TaxStrategyInput = {
  monthlyRentalIncome: 2_000,
  totalOperatingExpenses: 800,
  capexReserveMonthly: 100,
  annualDepreciation: 8_700,
  yearlyInterestSchedule: [16_700, 16_500, 16_300],
  rentGrowthPct: 3,
  expenseGrowthPct: 2,
  taxRate: 0.24,
  includeInterestDeduction: true,
};

describe("buildTenYearProjectionInputHash", () => {
  it("is stable for identical input", () => {
    expect(buildTenYearProjectionInputHash({ ...baseProjectionInput })).toBe(
      buildTenYearProjectionInputHash({ ...baseProjectionInput })
    );
  });

  it("changes when only capexReserveMonthly changes (offsetting opex edit)", () => {
    // The audited collision: capex 5%→4% offset by maintenance 5%→6% leaves
    // totalOperatingExpenses identical — only the reserve moves.
    const before = buildTenYearProjectionInputHash({ ...baseProjectionInput });
    const after = buildTenYearProjectionInputHash({
      ...baseProjectionInput,
      capexReserveMonthly: 80,
    });
    expect(after).not.toBe(before);
  });
});

describe("buildTaxStrategyInputHash", () => {
  it("is stable for identical input", () => {
    expect(buildTaxStrategyInputHash({ ...baseTaxInput })).toBe(
      buildTaxStrategyInputHash({ ...baseTaxInput })
    );
  });

  it("changes when only capexReserveMonthly changes (offsetting opex edit)", () => {
    const before = buildTaxStrategyInputHash({ ...baseTaxInput });
    const after = buildTaxStrategyInputHash({ ...baseTaxInput, capexReserveMonthly: 80 });
    expect(after).not.toBe(before);
  });
});
