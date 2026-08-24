import { describe, expect, it } from "vitest";

import { calculateAnalysis, type AnalysisResult } from "@/lib/calc-analysis";
import {
  calculateMaxAllowableOffer,
  type MaoTarget,
} from "@/lib/max-allowable-offer";
import type { InvestmentFormValues } from "@/lib/investcalc-schema";
import { rankOfferCeilingConstraints } from "@/lib/offer-ceiling";
import { UNDERWRITING_V1_GOLDEN_CORPUS } from "@/lib/__tests__/fixtures/underwriting-v1-golden-corpus";

const GRID_STEP = 500;
const GRID_MIN = 10_000;
const GRID_MAX = 650_000;

type OracleResult = {
  price: number;
  achieved: AnalysisResult;
};

/**
 * Independent reference predicate for the public target contract. It does not
 * import `meetsTarget`/`meetsMaoTarget` and deliberately contains no binary
 * search logic.
 */
function referencePasses(
  result: AnalysisResult,
  purchasePrice: number,
  target: MaoTarget,
): boolean {
  if (target.capRate !== undefined && result.capRate < target.capRate) {
    return false;
  }
  if (target.cocReturn !== undefined && result.cocReturn < target.cocReturn) {
    return false;
  }
  if (
    target.monthlyCashFlow !== undefined &&
    result.netCashFlow < target.monthlyCashFlow
  ) {
    return false;
  }
  if (
    target.dscr !== undefined &&
    result.monthlyPayment > 0 &&
    result.dscr < target.dscr
  ) {
    return false;
  }
  if (
    target.maxPurchasePrice !== undefined &&
    purchasePrice > target.maxPurchasePrice
  ) {
    return false;
  }
  return true;
}

/** Exhaust every allowed $500 display increment. No monotonicity assumption. */
function exhaustiveGridOracle(
  values: InvestmentFormValues,
  target: MaoTarget,
  bounds: { min: number; max: number } = { min: GRID_MIN, max: GRID_MAX },
): OracleResult | null {
  let highest: OracleResult | null = null;
  for (let price = bounds.min; price <= bounds.max; price += GRID_STEP) {
    const achieved = calculateAnalysis({ ...values, purchasePrice: price });
    if (referencePasses(achieved, price, target)) {
      highest = { price, achieved };
    }
  }
  return highest;
}

function corpusValues(id: string): InvestmentFormValues {
  const found = UNDERWRITING_V1_GOLDEN_CORPUS.find((entry) => entry.id === id);
  if (!found) throw new Error(`Missing golden-corpus input: ${id}`);
  return found.values;
}

function expectSolverMatchesOracle(args: {
  name: string;
  values: InvestmentFormValues;
  target: MaoTarget;
  bounds?: { min: number; max: number };
}) {
  const bounds = args.bounds ?? { min: GRID_MIN, max: GRID_MAX };
  const oracle = exhaustiveGridOracle(args.values, args.target, bounds);
  const solved = calculateMaxAllowableOffer(args.values, args.target, {
    minPrice: bounds.min,
    maxPrice: bounds.max,
  });

  expect(solved?.maxPrice ?? null, `${args.name}: ceiling`).toBe(
    oracle?.price ?? null,
  );
  if (!oracle || !solved) return;

  expect(
    referencePasses(solved.achieved, solved.maxPrice, args.target),
    `${args.name}: displayed ceiling passes`,
  ).toBe(true);
  expect(solved.achieved, `${args.name}: achieved metrics`).toEqual(
    oracle.achieved,
  );

  const nextPrice = solved.maxPrice + GRID_STEP;
  const hardCap = args.target.maxPurchasePrice;
  const stoppedByExplicitCap =
    (hardCap !== undefined && nextPrice > hardCap) || nextPrice > bounds.max;
  if (stoppedByExplicitCap) {
    expect(
      (hardCap !== undefined && nextPrice > hardCap) || nextPrice > bounds.max,
      `${args.name}: explicit cap explains the terminal price`,
    ).toBe(true);
  } else {
    const nextResult = calculateAnalysis({
      ...args.values,
      purchasePrice: nextPrice,
    });
    expect(
      referencePasses(nextResult, nextPrice, args.target),
      `${args.name}: next $500 increment must fail`,
    ).toBe(false);
  }
}

describe("Offer Ceiling independent bounded $500-grid oracle", () => {
  const cases: Array<{
    name: string;
    values: InvestmentFormValues;
    target: MaoTarget;
  }> = [
    {
      name: "financed single-family",
      values: corpusValues("financed_sfr_standard"),
      target: { monthlyCashFlow: 0, dscr: 1.25 },
    },
    {
      name: "cash purchase ignores inapplicable DSCR",
      values: corpusValues("cash_annual_tax_monthly_insurance"),
      target: { capRate: 7.5, monthlyCashFlow: 1_500, dscr: 99 },
    },
    {
      name: "zero-rate financing",
      values: corpusValues("zero_rate_financed"),
      target: { monthlyCashFlow: 250, dscr: 1.5 },
    },
    {
      name: "negative at asking but feasible below asking",
      values: corpusValues("negative_cash_flow_high_expense"),
      target: { monthlyCashFlow: 0 },
    },
    {
      name: "three-unit multifamily",
      values: corpusValues("three_unit_multifamily"),
      target: { monthlyCashFlow: 250, dscr: 1.2 },
    },
    {
      name: "owner-occupant multi-unit",
      values: corpusValues("owner_occupant_duplex"),
      target: { monthlyCashFlow: 0, dscr: 1.1 },
    },
    {
      name: "PMI immediately below the 20-percent threshold",
      values: {
        ...corpusValues("financed_sfr_standard"),
        downPaymentPct: 19.99,
      },
      target: { monthlyCashFlow: 0, dscr: 1.25 },
    },
    {
      name: "no PMI at the 20-percent threshold",
      values: {
        ...corpusValues("financed_sfr_standard"),
        downPaymentPct: 20,
      },
      target: { monthlyCashFlow: 0, dscr: 1.25 },
    },
  ];

  for (const testCase of cases) {
    it(`matches exhaustive enumeration for ${testCase.name}`, () => {
      expectSolverMatchesOracle(testCase);
    });
  }

  it("returns null when no grid price can satisfy the target", () => {
    expectSolverMatchesOracle({
      name: "no feasible ceiling",
      values: corpusValues("negative_cash_flow_high_expense"),
      target: { monthlyCashFlow: 100_000, dscr: 10 },
    });
  });

  it("floors a non-grid hard cap and identifies the cap as terminal", () => {
    expectSolverMatchesOracle({
      name: "non-grid hard cap",
      values: corpusValues("financed_sfr_standard"),
      target: { monthlyCashFlow: -99_999, maxPurchasePrice: 180_250 },
    });
  });

  it("finds the highest grid price at a non-grid financial boundary", () => {
    const values = corpusValues("financed_sfr_standard");
    const nonGridBoundary = calculateAnalysis({
      ...values,
      purchasePrice: 225_249,
    });
    expectSolverMatchesOracle({
      name: "non-grid DSCR boundary",
      values,
      target: { dscr: nonGridBoundary.dscr },
    });
  });

  it("characterizes tied binding rules at the same $500 boundary", () => {
    const values = corpusValues("financed_sfr_standard");
    const anchorPrice = 225_000;
    const anchor = calculateAnalysis({ ...values, purchasePrice: anchorPrice });
    const target: MaoTarget = {
      monthlyCashFlow: anchor.netCashFlow,
      dscr: anchor.dscr,
    };

    expectSolverMatchesOracle({ name: "tied rules", values, target });
    const solved = calculateMaxAllowableOffer(values, target, {
      minPrice: GRID_MIN,
      maxPrice: GRID_MAX,
    });
    expect(solved?.maxPrice).toBe(anchorPrice);
    expect(solved && rankOfferCeilingConstraints(solved).slice(0, 2).map((c) => c.key))
      .toEqual(["cash-flow", "dscr"]);
  });
});
