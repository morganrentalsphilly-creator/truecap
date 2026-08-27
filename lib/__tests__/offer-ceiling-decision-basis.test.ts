import { describe, expect, it } from "vitest";

import type { NamedBuyBox } from "@/lib/buy-box";
import {
  captureBuyBoxDecisionBasis,
  captureSelectedTargetsDecisionBasis,
  captureStarterCriteriaDecisionBasis,
  namedBuyBoxFromDecisionBasis,
  normalizeOfferCeilingDecisionBasis,
} from "@/lib/offer-ceiling-decision-basis";

function box(overrides: Partial<NamedBuyBox> = {}): NamedBuyBox {
  return {
    id: "box-a",
    name: "Box A",
    strategyKind: "buy_hold",
    isDefault: true,
    sortOrder: 0,
    clientId: null,
    minCapRatePct: 7,
    minCocPct: null,
    minDscr: 1.25,
    minCashFlowMonthly: 200,
    maxPurchasePrice: null,
    propertyTypes: [],
    targetStates: ["PA"],
    isActive: true,
    ...overrides,
  };
}

describe("Offer Ceiling decision basis", () => {
  it("freezes a Buy Box identity, target, strategy, and complete rule snapshot", () => {
    const basis = captureBuyBoxDecisionBasis({
      box: box(),
      target: { capRate: 7, dscr: 1.25, monthlyCashFlow: 200 },
      strategyKey: "buy-hold",
      capturedAt: "2026-08-26T12:00:00.000Z",
    });

    expect(normalizeOfferCeilingDecisionBasis(basis, {
      target: { capRate: 7, dscr: 1.25, monthlyCashFlow: 200 },
      source: "buy-box",
      strategyKey: "buy-hold",
    })).toEqual(basis);
    expect(namedBuyBoxFromDecisionBasis(basis)).toMatchObject({
      id: "box-a",
      name: "Box A",
      minCapRatePct: 7,
      minCashFlowMonthly: 200,
      targetStates: ["PA"],
    });
  });

  it("rejects target, source, strategy, snapshot, and fingerprint drift", () => {
    const basis = captureBuyBoxDecisionBasis({
      box: box(),
      target: { capRate: 7 },
      strategyKey: "buy-hold",
      capturedAt: "2026-08-26T12:00:00.000Z",
    });

    expect(
      normalizeOfferCeilingDecisionBasis(basis, { target: { capRate: 8 } }),
    ).toBeNull();
    expect(
      normalizeOfferCeilingDecisionBasis(basis, {
        strategyKey: "house-hack",
      }),
    ).toBeNull();
    expect(
      normalizeOfferCeilingDecisionBasis({
        ...basis,
        rules: {
          ...basis.rules,
          boxName: "A different live box",
        },
      }),
    ).toBeNull();
  });

  it("captures custom criteria without inventing a Buy Box identity", () => {
    const basis = captureSelectedTargetsDecisionBasis({
      target: { monthlyCashFlow: 300, dscr: 1.3 },
      strategyKey: "buy-hold",
      capturedAt: "2026-08-26T12:00:00.000Z",
    });

    expect(basis.source).toBe("selected-targets");
    expect(namedBuyBoxFromDecisionBasis(basis)).toBeNull();
    expect(normalizeOfferCeilingDecisionBasis(basis)).toEqual(basis);
  });

  it("captures unchanged starter criteria as an adopted starter source", () => {
    const basis = captureStarterCriteriaDecisionBasis({
      target: { monthlyCashFlow: 0, dscr: 1.25 },
      strategyKey: "buy-hold",
      capturedAt: "2026-08-26T12:00:00.000Z",
    });

    expect(basis.source).toBe("starter-criteria");
    expect(basis.rules.kind).toBe("starter-criteria");
    expect(namedBuyBoxFromDecisionBasis(basis)).toBeNull();
    expect(
      normalizeOfferCeilingDecisionBasis(basis, {
        source: "starter-criteria",
      }),
    ).toEqual(basis);
    expect(
      normalizeOfferCeilingDecisionBasis(basis, {
        source: "selected-targets",
      }),
    ).toBeNull();
  });
});
