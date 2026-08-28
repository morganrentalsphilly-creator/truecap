import { describe, expect, it } from "vitest";
import {
  buildBuyBoxQaReport,
  buildCompsQaContext,
  buildGroundedDealContext,
  buildProjectionQaContext,
  DEAL_QA_CONTEXT_MAX_CHARS,
  dealQaExtraContextSchema,
  type DealQaExtraContext,
} from "../deal-qa-context";
import { hashDealInput } from "../deal-summary";
import { calculateAnalysis } from "../calc-analysis";
import {
  EMPTY_BUY_BOX,
  evaluateBuyBoxes,
  summarizeBuyBoxFit,
  type BuyBoxDealMetrics,
  type NamedBuyBox,
} from "../buy-box";
import type { InvestmentFormValues } from "../investcalc-schema";
import type { PropertyEnrichment } from "../property-enrichment/rentcast";
import type { ReturnSummary } from "../returns";

function baseValues(overrides: Partial<InvestmentFormValues> = {}): InvestmentFormValues {
  return {
    propertyType: "single-family",
    address: "1205 N 5th St, Philadelphia, PA 19122, USA",
    purchasePrice: 245_000,
    bedrooms: 3,
    bathrooms: 2,
    sqft: 1500,
    monthlyRent: 2_100,
    units: [],
    downPaymentPct: 20,
    interestRate: 7,
    loanTermYears: 30,
    closingCostsPct: 3,
    propertyTaxPct: 1.1,
    insuranceInputMode: "percent",
    insurancePct: 0.5,
    maintenancePct: 5,
    vacancyPct: 5,
    mgmtPct: 8,
    capexPct: 5,
    buildingValuePct: 80,
    depreciationYears: 27.5,
    includeInterestDeduction: true,
    taxRatePct: 24,
    expenseGrowthPct: 2,
    rentGrowthPct: 3,
    appreciationRatePct: 3,
    sellingCostPct: 6,
    ...overrides,
  } as InvestmentFormValues;
}

function namedBox(overrides: Partial<NamedBuyBox> = {}): NamedBuyBox {
  return {
    ...EMPTY_BUY_BOX,
    id: "box-1",
    name: "Philly cash flow",
    strategyKind: null,
    isDefault: true,
    sortOrder: 0,
    minCapRatePct: 8,
    minCashFlowMonthly: 200,
    ...overrides,
  };
}

function dealMetrics(overrides: Partial<BuyBoxDealMetrics> = {}): BuyBoxDealMetrics {
  return {
    capRatePct: 5.2,
    cocPct: 6.1,
    dscr: 1.1,
    cashFlowMonthly: 150,
    purchasePrice: 245_000,
    propertyType: "single-family",
    state: "PA",
    isCashPurchase: false,
    ...overrides,
  };
}

function enrichment(overrides: Partial<PropertyEnrichment> = {}): PropertyEnrichment {
  return {
    facts: null,
    valueEstimate: 250_000,
    valueRange: { low: 235_000, high: 262_000 },
    saleComps: [
      { address: "123 Main St", price: 248_000, bedrooms: 3, bathrooms: 2, squareFootage: 1450, distanceMiles: 0.3, correlation: 0.9 },
      { address: "45 Oak Ave", price: null, bedrooms: 3, bathrooms: 1, squareFootage: 1400, distanceMiles: 0.5, correlation: 0.8 },
    ],
    rentEstimate: 2_050,
    rentRange: { low: 1_900, high: 2_200 },
    rentComps: [
      { address: "77 Pine Ln", price: 2_100, bedrooms: 3, bathrooms: 2, squareFootage: 1500, distanceMiles: 0.2, correlation: 0.95 },
    ],
    fetchedAt: "2026-07-01T00:00:00.000Z",
    ...overrides,
  };
}

function returnSummary(overrides: Partial<ReturnSummary> = {}): ReturnSummary {
  return {
    initialCashInvested: 60_000,
    cashInvested: 60_000,
    totalContributions: 60_000,
    totalDistributions: 180_000,
    hasLaterContributions: false,
    totalProfit: 120_000,
    roiPct: 200,
    roiDefinition: "net-profit-over-all-contributions",
    equityMultiple: 3,
    cagrPct: 11.6,
    cagrStatus: "available",
    irrPct: 14.2,
    irrStatus: "unique",
    irrRootsPct: [14.2],
    irrReason: null,
    exitTax: 9_000,
    years: 10,
    ...overrides,
  };
}

function fullExtra(): DealQaExtraContext {
  const results = evaluateBuyBoxes([namedBox()], dealMetrics());
  const report = buildBuyBoxQaReport(results, summarizeBuyBoxFit(results))!;
  return {
    buyBox: report.context,
    mao: { maxOffer: 218_500, basis: "cap rate ≥ 8% · cash flow ≥ $200/mo", fromBuyBox: true },
    projection: buildProjectionQaContext(returnSummary())!,
    comps: buildCompsQaContext(enrichment())!,
  };
}

describe("buildBuyBoxQaReport", () => {
  it("reports the primary box's verdict, checks, and MAO thresholds", () => {
    const results = evaluateBuyBoxes([namedBox()], dealMetrics());
    const report = buildBuyBoxQaReport(results, summarizeBuyBoxFit(results));
    expect(report).not.toBeNull();
    expect(report!.context.passes).toBe(false);
    expect(report!.context.headline).toContain("Misses the user's buy box on");
    expect(report!.context.personalLine).toContain("Biggest gap");
    expect(report!.context.checks).toHaveLength(2);
    expect(report!.maoThresholds.minCapRatePct).toBe(8);
    expect(report!.maoThresholds.minCashFlowMonthly).toBe(200);
    // Single box → no multi-box extras.
    expect(report!.context.boxName).toBeUndefined();
    expect(report!.context.summary).toBeUndefined();
  });

  it("uses the passing box for both fit and Offer Ceiling while keeping the rollup", () => {
    const boxes = [
      namedBox(),
      namedBox({ id: "box-2", name: "Anything cheap", isDefault: false, sortOrder: 1, minCapRatePct: 1, minCashFlowMonthly: null }),
    ];
    const results = evaluateBuyBoxes(boxes, dealMetrics());
    const report = buildBuyBoxQaReport(results, summarizeBuyBoxFit(results));
    expect(report!.context.boxName).toBe("Anything cheap");
    expect(report!.context.passes).toBe(true);
    expect(report!.selectedBox).toEqual({ id: "box-2", name: "Anything cheap" });
    expect(report!.maoThresholds.minCapRatePct).toBe(1);
    expect(report!.context.summary).toContain("1 of 2");
  });

  it("returns null when there is nothing evaluated", () => {
    expect(buildBuyBoxQaReport([], { activeCount: 0, passingCount: 0, anyPass: false, bestFit: null })).toBeNull();
  });
});

describe("buildCompsQaContext", () => {
  it("keeps only priced comps and caps each list at 5", () => {
    const many = Array.from({ length: 8 }, (_, i) => ({
      address: `${i + 1} Test St`,
      price: 200_000 + i,
      bedrooms: null,
      bathrooms: null,
      squareFootage: null,
      distanceMiles: null,
      correlation: null,
    }));
    const ctx = buildCompsQaContext(enrichment({ saleComps: many }));
    expect(ctx).not.toBeNull();
    expect(ctx!.saleComps).toHaveLength(5);
    // The null-price comp from the default fixture is dropped.
    const withNull = buildCompsQaContext(enrichment());
    expect(withNull!.saleComps).toHaveLength(1);
    expect(withNull!.saleComps[0]!.address).toBe("123 Main St");
  });

  it("returns null when the enrichment has nothing usable", () => {
    const ctx = buildCompsQaContext(
      enrichment({
        valueEstimate: null,
        valueRange: null,
        rentEstimate: null,
        rentRange: null,
        saleComps: [],
        rentComps: [],
      })
    );
    expect(ctx).toBeNull();
  });
});

describe("buildProjectionQaContext", () => {
  it("passes finite figures through and nulls non-finite ones", () => {
    const ctx = buildProjectionQaContext(returnSummary({ roiPct: Number.NaN, irrPct: null }));
    expect(ctx).not.toBeNull();
    expect(ctx!.years).toBe(10);
    expect(ctx!.totalProfit).toBe(120_000);
    expect(ctx!.roiPct).toBeNull();
    expect(ctx!.irrPct).toBeNull();
    expect(ctx!.cagrPct).toBeCloseTo(11.6);
  });

  it("returns null without an anchorable summary", () => {
    expect(buildProjectionQaContext(null)).toBeNull();
    expect(buildProjectionQaContext(returnSummary({ totalProfit: Number.NaN }))).toBeNull();
  });

  it("does not reduce a multiple-root IRR timeline to one AI headline", () => {
    const ctx = buildProjectionQaContext(
      returnSummary({
        irrPct: 10,
        irrStatus: "multiple",
        irrRootsPct: [10, 20],
      }),
    );
    expect(ctx?.irrPct).toBeNull();
  });
});

describe("buildGroundedDealContext", () => {
  const values = baseValues();
  const result = calculateAnalysis(values);

  it("with no extra context: base numbers + an explicit NOT PROVIDED note", () => {
    const text = buildGroundedDealContext(values, result);
    expect(text).toContain("THE DEAL");
    expect(text).toContain("Cap rate:");
    expect(text).toContain("NOT PROVIDED");
    expect(text).toContain("buy box");
    expect(text).toContain("Offer Ceiling");
    expect(text).toContain("Run comps");
    expect(text).not.toContain("YOUR BUY BOX");
    expect(text).not.toContain("YOUR MAX ALLOWABLE OFFER");
    expect(text).not.toContain("NaN");
    expect(text).not.toContain("undefined");
  });

  it("renders every provided section with headers and drops the NOT PROVIDED note when all are present", () => {
    const text = buildGroundedDealContext(values, result, fullExtra());
    expect(text).toContain("YOUR BUY BOX");
    expect(text).toContain("Misses the user's buy box on");
    expect(text).toContain("Biggest gap");
    expect(text).toContain("OFFER CEILING");
    expect(text).toContain("$218,500");
    expect(text).toContain("cap rate ≥ 8%");
    expect(text).toContain("10-YEAR PROJECTION");
    expect(text).toContain("PULLED COMPS");
    expect(text).toContain("123 Main St");
    expect(text).not.toContain("NOT PROVIDED");
    expect(text).not.toContain("NaN");
    expect(text).not.toContain("undefined");
  });

  it("omit-when-absent: a lone MAO piece renders only its section, everything else lands in NOT PROVIDED", () => {
    const text = buildGroundedDealContext(values, result, {
      mao: { maxOffer: 218_500, basis: "break-even cash flow · DSCR ≥ 1.25", fromBuyBox: false },
    });
    expect(text).toContain("OFFER CEILING");
    expect(text).not.toContain("YOUR BUY BOX");
    expect(text).not.toContain("PULLED COMPS");
    const note = text.slice(text.indexOf("NOT PROVIDED"));
    expect(note).toContain("buy box");
    expect(note).toContain("comps");
    expect(note).toContain("projection");
    expect(note).not.toContain("max allowable offer");
  });

  it("caps total size by trimming comp LIST entries — never the buy-box or MAO lines", () => {
    const longComps = Array.from({ length: 8 }, (_, i) => ({
      address: `${i + 1} ${"Very Long Street Name Boulevard Apartment Complex".repeat(2)}`,
      price: 240_000 + i,
      bedrooms: null,
      bathrooms: null,
      squareFootage: null,
      distanceMiles: null,
      correlation: null,
    }));
    const extra = {
      ...fullExtra(),
      comps: buildCompsQaContext(enrichment({ saleComps: longComps, rentComps: longComps }))!,
    };
    const uncapped = buildGroundedDealContext(values, result, extra, { maxChars: 100_000 });
    const maxChars = 2_600;
    const capped = buildGroundedDealContext(values, result, extra, { maxChars });
    expect(uncapped.length).toBeGreaterThan(maxChars);
    expect(capped.length).toBeLessThanOrEqual(maxChars);
    // Personal context survives the trim.
    expect(capped).toContain("YOUR BUY BOX");
    expect(capped).toContain("OFFER CEILING");
    expect(capped).toContain("$218,500");
    // Comps got shorter, not the rest.
    expect((capped.match(/Very Long Street/g) ?? []).length).toBeLessThan(
      (uncapped.match(/Very Long Street/g) ?? []).length
    );
    // Default cap is the documented ~2k-token budget.
    expect(DEAL_QA_CONTEXT_MAX_CHARS).toBe(8_000);
    expect(buildGroundedDealContext(values, result, extra).length).toBeLessThanOrEqual(
      DEAL_QA_CONTEXT_MAX_CHARS
    );
  });

  it("never leaks NaN/undefined into the prompt text (bad pieces degrade to NOT PROVIDED)", () => {
    const dirty = {
      mao: { maxOffer: Number.NaN, basis: "broken", fromBuyBox: false },
      projection: { years: 10, totalProfit: 120_000, roiPct: Number.NaN, cagrPct: undefined, irrPct: null, equityMultiple: Number.POSITIVE_INFINITY },
      comps: { saleComps: [{ address: "1 Bad St", price: Number.NaN }], rentComps: [], valueEstimate: Number.NaN },
    } as unknown as DealQaExtraContext;
    const text = buildGroundedDealContext(values, result, dirty);
    expect(text).not.toContain("NaN");
    expect(text).not.toContain("undefined");
    expect(text).not.toContain("Infinity");
    // The unusable MAO piece is treated as absent.
    expect(text).not.toContain("OFFER CEILING (a target-dependent modeled boundary):");
    expect(text.slice(text.indexOf("NOT PROVIDED"))).toContain("Offer Ceiling");
    // The projection anchors (years/profit) are fine → section renders, bad fields skipped.
    expect(text).toContain("10-YEAR PROJECTION");
    expect(text).toContain("$120,000");
  });
});

describe("dealQaExtraContextSchema (the server-side gate)", () => {
  it("accepts a real client-built context", () => {
    expect(dealQaExtraContextSchema.safeParse(fullExtra()).success).toBe(true);
    expect(dealQaExtraContextSchema.safeParse({}).success).toBe(true);
  });

  it("rejects non-finite numbers and oversized lists", () => {
    expect(
      dealQaExtraContextSchema.safeParse({
        mao: { maxOffer: Number.NaN, basis: "x", fromBuyBox: false },
      }).success
    ).toBe(false);
    const nineComps = Array.from({ length: 9 }, (_, i) => ({ address: `${i} St`, price: 1000 }));
    expect(
      dealQaExtraContextSchema.safeParse({
        comps: { saleComps: nineComps, rentComps: [] },
      }).success
    ).toBe(false);
  });
});

describe("hashDealInput with grounding context", () => {
  it("keeps the legacy bucket when no context is passed", () => {
    expect(hashDealInput(baseValues())).toBe(hashDealInput(baseValues(), undefined));
  });

  it("same deal with vs without context lands in different cache buckets", () => {
    const ctx = fullExtra();
    expect(hashDealInput(baseValues(), ctx)).not.toBe(hashDealInput(baseValues()));
    expect(hashDealInput(baseValues(), ctx)).toBe(hashDealInput(baseValues(), fullExtra()));
  });
});
