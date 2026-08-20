import { describe, expect, it } from "vitest";
import { reportDataSchema } from "@/lib/report-payload-schema";

/**
 * ROUND-TRIP GUARD against silently-stripped report fields.
 *
 * Only the top-level object is .passthrough(); every nested z.object() drops
 * undeclared keys without complaint. That has already shipped twice: the comps
 * $/sqft column rendered "—" on every paid export, and the RentCast pull date
 * never appeared, because neither key was declared here.
 *
 * These tests parse a payload and assert the fields the RENDERER reads are
 * still present afterwards. A source-text grep cannot catch this; only a real
 * parse can.
 */

function payload() {
  const rows = Array.from({ length: 2 }, (_, i) => ({
    y: i + 1, rental: 30000, opex: 11000, debt: 17760, net: 1240, tax: -200, after: 1040, cum: 1040 * (i + 1),
  }));
  return {
    generatedAt: new Date("2026-08-19T00:00:00Z"),
    methodologyVersion: "1.0",
    property: { address: "1 Test St", type: "multi-family", yearBuilt: 1926, purchasePrice: 265000, template: "Standard" },
    financing: { downPaymentPct: 20, downPayment: 53000, interestRate: 6.875, loanTerm: 30, closingCostsPct: 3, closingCosts: 7950 },
    expenses: { propertyTaxPct: 1.4, insurancePct: 0.5, maintenancePct: 5, vacancyPct: 6, managementPct: 8, capexPct: 5, hoaMonthly: 0, utilitiesMonthly: 0, rentGrowth: 3, expenseGrowth: 2.5, appreciation: 3.5, sellingCost: 6, taxRate: 24 },
    units: [
      { label: "Unit 1", beds: 2, baths: 1, sqft: 900, rent: 1300, isOwnerOccupied: true },
      { label: "Unit 2", beds: 2, baths: 1, sqft: 880, rent: 1275 },
    ],
    performance: { recommendation: "Buy", dealScore: 74, risk: "Moderate", rationale: "ok", monthlyCashFlow: 170, cocReturn: 3.4, capRate: 7.5, dscr: 1.24, taxSavings: 1830, afterTaxCF: 2040 },
    operatingStatement: {
      grossScheduledIncome: 43200, vacancyAllowance: 2592, effectiveGrossIncome: 40608,
      operatingExpenses: [{ label: "Property tax", amount: 3710 }],
      operatingExpensesTotal: 12091, noi: 28517, annualDebtService: 16704, pmiAnnual: 0,
      capexReserve: 2160, netCashFlowAnnual: 2040, loanAmount: 212000, monthlyPayment: 1392,
      totalCashRequired: 60950, isCashPurchase: false,
    },
    projection10y: { cumulativeCF: 2080, bestAnnualAfterTax: 1040, totalAfterTax: 2080, rows },
    taxStrategy: { year1Taxable: -100, year1Savings: 400, totalBenefit10y: 800, annualDepreciation: 7636,
      rows: rows.map((r) => ({ y: r.y, rental: r.rental, opex: r.opex, interest: 15900, dep: 7636, total: 34536, taxable: -4536, savings: 400, benefit: 400 })) },
    exitScenarios: { bestYear: 2, year5Profit: 1, year10Profit: 2, totalROI: 10,
      rows: rows.map((r) => ({ y: r.y, value: 270000, loan: 210000, equity: 60000, netSale: 45000, profit: 5000 })) },
    comps: {
      valueEstimate: 258000, valueRange: { low: 236000, high: 279000 },
      rentEstimate: 3640, rentRange: { low: 3380, high: 3910 },
      saleComps: [{ address: "2 Test St", price: 249000, bedrooms: 5, bathrooms: 3, squareFootage: 2380, distanceMiles: 0.05, pricePerSqft: 104.62 }],
      rentComps: [{ address: "3 Test St", price: 1295, bedrooms: 2, bathrooms: 1, squareFootage: 890, distanceMiles: 0.06, pricePerSqft: 1.4551 }],
      fetchedAt: "2026-08-12T00:00:00Z",
    },
  };
}

describe("reportDataSchema round trip", () => {
  it("accepts a full payload", () => {
    expect(reportDataSchema.safeParse(payload()).success).toBe(true);
  });

  it("PRESERVES comps pricePerSqft — stripping it blanks the $/sqft column", () => {
    const parsed = reportDataSchema.parse(payload());
    expect(parsed.comps?.saleComps[0]?.pricePerSqft).toBeCloseTo(104.62);
    // Unrounded, so a rent comp can render cents rather than collapsing to "$1".
    expect(parsed.comps?.rentComps[0]?.pricePerSqft).toBeCloseTo(1.4551);
  });

  it("PRESERVES comps fetchedAt — stripping it drops the provenance line", () => {
    expect(reportDataSchema.parse(payload()).comps?.fetchedAt).toBe("2026-08-12T00:00:00Z");
  });

  it("PRESERVES units isOwnerOccupied — stripping it double-counts the owner's rent", () => {
    const parsed = reportDataSchema.parse(payload());
    expect(parsed.units[0]?.isOwnerOccupied).toBe(true);
    expect(parsed.units[1]?.isOwnerOccupied).toBeUndefined();
  });

  it("PRESERVES the whole operating statement", () => {
    const parsed = reportDataSchema.parse(payload());
    expect(parsed.operatingStatement?.noi).toBe(28517);
    expect(parsed.operatingStatement?.operatingExpenses[0]?.label).toBe("Property tax");
    expect(parsed.operatingStatement?.isCashPurchase).toBe(false);
  });

  it("still accepts legacy payloads missing every optional block", () => {
    const legacy = payload() as Record<string, unknown>;
    delete legacy.comps;
    delete legacy.operatingStatement;
    delete legacy.methodologyVersion;
    expect(reportDataSchema.safeParse(legacy).success).toBe(true);
  });

  it("rejects a non-finite number rather than rendering NaN", () => {
    const bad = payload();
    bad.performance.monthlyCashFlow = Number.NaN;
    expect(reportDataSchema.safeParse(bad).success).toBe(false);
  });
});
