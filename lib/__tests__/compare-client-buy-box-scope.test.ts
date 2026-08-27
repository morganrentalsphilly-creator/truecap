import { describe, expect, it } from "vitest";

import {
  buildCompareBuyBoxFitById,
  type CompareDealViewModel,
} from "@/components/investcalc/compare-deals-client";
import { EMPTY_BUY_BOX, type NamedBuyBox } from "@/lib/buy-box";

function box(
  id: string,
  clientId: string | null,
  minimumCashFlow: number,
): NamedBuyBox {
  return {
    ...EMPTY_BUY_BOX,
    id,
    name: id,
    strategyKind: null,
    isDefault: false,
    sortOrder: 0,
    clientId,
    minCashFlowMonthly: minimumCashFlow,
  };
}

function deal(id: string, clientId: string | null): CompareDealViewModel {
  return {
    id,
    address: "123 Market St, Philadelphia, PA 19106",
    clientId,
    propertyType: "single-family",
    purchasePrice: 250_000,
    metrics: {
      netCashFlow: 300,
      capRate: 6,
      cocReturn: 8,
      dscr: 1.3,
      monthlyPayment: 1_000,
    },
    methodologyCohort: "recorded:1.1",
  } as unknown as CompareDealViewModel;
}

describe("Compare Buy Box client scope", () => {
  it("evaluates each assigned deal against only its own client and personal boxes", () => {
    const fit = buildCompareBuyBoxFitById(
      [deal("deal-a", "client-a"), deal("deal-b", "client-b")],
      [
        box("client-a-strict", "client-a", 500),
        box("client-b-fit", "client-b", 100),
      ],
      true,
    );

    expect(fit?.get("deal-a")?.fit.anyPass).toBe(false);
    expect(fit?.get("deal-b")?.fit.anyPass).toBe(true);
    expect(fit?.get("deal-a")?.fit.activeCount).toBe(1);
    expect(fit?.get("deal-b")?.fit.activeCount).toBe(1);
  });

  it("does not apply a client box to an unassigned deal", () => {
    const fit = buildCompareBuyBoxFitById(
      [deal("personal-deal", null)],
      [
        box("personal-fit", null, 100),
        box("other-client-strict", "client-a", 500),
      ],
      true,
    );

    expect(fit?.get("personal-deal")?.fit.anyPass).toBe(true);
    expect(fit?.get("personal-deal")?.fit.activeCount).toBe(1);
  });

  it("suppresses fit when recorded methodologies are not comparable", () => {
    expect(
      buildCompareBuyBoxFitById(
        [deal("deal-a", "client-a")],
        [box("client-a", "client-a", 100)],
        false,
      ),
    ).toBeNull();
  });
});
