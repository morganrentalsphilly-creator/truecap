import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import type { InvestmentFormValues } from "../investcalc-schema";
import { buildRepeatDealDraft } from "../repeat-deal-draft";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

function sourceSection(source: string, start: string, end: string): string {
  const startIndex = source.indexOf(start);
  expect(startIndex, `missing marker: ${start}`).toBeGreaterThanOrEqual(0);
  const endIndex = source.indexOf(end, startIndex + start.length);
  expect(endIndex, `missing marker after ${start}: ${end}`).toBeGreaterThan(
    startIndex,
  );
  return source.slice(startIndex, endIndex);
}

function sourceDeal(): InvestmentFormValues {
  return {
    propertyType: "owner-occupant",
    address: "1700 Example St, Philadelphia, PA 19140",
    purchasePrice: 285_000,
    yearBuilt: 1925,
    bedrooms: 5,
    bathrooms: 2,
    sqft: 2_150,
    monthlyRent: 3_200,
    units: [
      {
        bedrooms: 2,
        bathrooms: 1,
        sqft: 900,
        monthlyRent: 1_550,
        isOwnerOccupied: true,
      },
      {
        bedrooms: 3,
        bathrooms: 1,
        sqft: 1_250,
        monthlyRent: 1_650,
        isOwnerOccupied: false,
      },
      {
        bedrooms: 1,
        bathrooms: 1,
        sqft: 650,
        monthlyRent: 1_250,
        isOwnerOccupied: false,
      },
    ],
    downPaymentPct: 0,
    interestRate: 6.875,
    loanTermYears: 30,
    closingCostsPct: 2.75,
    pmiAnnualRatePct: 0.62,
    pmiNoCancel: false,
    maintenancePct: 9,
    vacancyPct: 6,
    mgmtPct: 7,
    capexPct: 4,
    templateId: "a5cc35f9-969d-4d9a-91e5-092059a01a4a",
    buildingValuePct: 82,
    depreciationYears: 27.5,
    includeInterestDeduction: true,
    taxRatePct: 24,
    expenseGrowthPct: 2.5,
    rentGrowthPct: 3,
    appreciationRatePct: 3.25,
    sellingCostPct: 7,
    propertyTaxPct: 1.42,
    propertyTaxInputMode: "annual",
    propertyTaxAnnual: 7_900,
    insuranceInputMode: "monthly",
    insurancePct: 0.58,
    insuranceMonthly: 265,
    hoaMonthly: 125,
    utilitiesMonthly: 310,
    avgDailyRate: 185,
    occupancyPct: 71,
    strFurnishingCost: 18_000,
    rehabBudget: 42_000,
    strategyArv: 410_000,
    strategyHoldMonths: 7,
    brrrrRefiLtvPct: 72,
    brrrrRefiRatePct: 7.125,
    brrrrRefiTermYears: 30,
    brrrrRefiClosingCostsPct: 2.5,
    fixFlipSellingCostsPct: 8,
    fixFlipDownPaymentPct: 18,
    fixFlipCarryMonthly: 1_450,
  };
}

describe("repeat-deal draft", () => {
  it("keeps reusable financing/policy assumptions while clearing property facts", () => {
    const source = sourceDeal();
    const draft = buildRepeatDealDraft(source);

    expect(draft).toMatchObject({
      propertyType: "owner-occupant",
      address: "",
      downPaymentPct: 0,
      interestRate: 6.875,
      loanTermYears: 30,
      closingCostsPct: 2.75,
      pmiAnnualRatePct: 0.62,
      maintenancePct: 9,
      vacancyPct: 6,
      mgmtPct: 7,
      capexPct: 4,
      propertyTaxInputMode: "percent",
      insuranceInputMode: "percent",
      buildingValuePct: 82,
      expenseGrowthPct: 2.5,
      rentGrowthPct: 3,
      strategyHoldMonths: 7,
      brrrrRefiLtvPct: 72,
      brrrrRefiRatePct: 7.125,
      brrrrRefiTermYears: 30,
      brrrrRefiClosingCostsPct: 2.5,
      fixFlipSellingCostsPct: 8,
      fixFlipDownPaymentPct: 18,
    });

    for (const field of [
      "purchasePrice",
      "yearBuilt",
      "bedrooms",
      "bathrooms",
      "sqft",
      "monthlyRent",
      "propertyTaxPct",
      "propertyTaxAnnual",
      "insurancePct",
      "insuranceMonthly",
      "hoaMonthly",
      "utilitiesMonthly",
      "avgDailyRate",
      "occupancyPct",
      "strFurnishingCost",
      "rehabBudget",
      "strategyArv",
      "fixFlipCarryMonthly",
      "templateId",
    ] as const) {
      expect(draft[field], field).toBeUndefined();
    }

    expect(draft.units).toEqual([
      {
        bedrooms: undefined,
        bathrooms: undefined,
        sqft: undefined,
        monthlyRent: undefined,
        isOwnerOccupied: true,
      },
      {
        bedrooms: undefined,
        bathrooms: undefined,
        sqft: undefined,
        monthlyRent: undefined,
        isOwnerOccupied: false,
      },
    ]);
  });

  it("does not mutate the saved source snapshot", () => {
    const source = sourceDeal();
    const before = structuredClone(source);

    buildRepeatDealDraft(source);

    expect(source).toEqual(before);
  });

  it("is the single fork builder used by both calculator repeat paths", () => {
    const calculator = read("components/investcalc/investcalc-page.tsx");
    const uses = calculator.match(/buildRepeatDealDraft\(/g) ?? [];
    const duplicate = sourceSection(
      calculator,
      "// Duplicate handoff (My Deals",
      "if (reopenPayloadRaw)",
    );
    const analyzeAnother = sourceSection(
      calculator,
      "const handleAnalyzeAnotherLikeThis = async () =>",
      "useEffect(() => {\n    if (!autoExportPdfRef.current)",
    );

    expect(uses).toHaveLength(2);
    expect(calculator).not.toContain(
      "const forked: Partial<InvestmentFormValues> = {",
    );
    for (const caller of [duplicate, analyzeAnother]) {
      expect(caller).toContain("buildRepeatDealDraft(");
      expect(caller).toContain("setInputVerification({})");
      expect(caller).toContain("enrichmentCaptureRef.current = {}");
      expect(caller).toContain("setSavedTemplateFallback(null)");
    }
    expect(analyzeAnother).toContain('setListingUrl("")');
    expect(analyzeAnother).not.toContain("everything else carried over");
    expect(analyzeAnother).toContain(
      'title: "Analyze another property?"',
    );
    expect(analyzeAnother).toContain("enrichedUnitsRef.current.clear()");
  });

  it("invalidates property-bound async work and stale price-estimate state", () => {
    const calculator = read("components/investcalc/investcalc-page.tsx");
    const reset = sourceSection(
      calculator,
      "const resetToNewAnalysis = useCallback(",
      "const propertyType = form.watch",
    );

    expect(reset).toContain("forkGenerationRef.current += 1");
    expect(reset).toContain("enrichedUnitsRef.current.clear()");
    expect(reset).toContain("setPriceEstimated(false)");
    expect(reset).toContain("setEstimatedPriceValue(null)");
    expect(reset).toContain("setPriceEstimateBasis(null)");
    expect(calculator).toContain(
      "forkGenerationRef.current !== enrichmentGeneration",
    );
    expect(calculator).toContain(
      "forkGenerationRef.current !== autofillGeneration",
    );
    expect(calculator).toContain("lastSelectedAddressRef.current !== place");
  });
});
