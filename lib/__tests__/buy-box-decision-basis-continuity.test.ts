import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  evaluateBuyBoxes,
  selectDecidingBuyBoxResult,
  type BuyBoxDealMetrics,
  type NamedBuyBox,
} from "@/lib/buy-box";
import {
  captureBuyBoxDecisionBasis,
  namedBuyBoxFromDecisionBasis,
} from "@/lib/offer-ceiling-decision-basis";

const root = path.resolve(__dirname, "../..");
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

function box(
  id: string,
  name: string,
  minCashFlowMonthly: number,
  sortOrder: number,
): NamedBuyBox {
  return {
    id,
    name,
    strategyKind: "buy_hold",
    isDefault: id === "box-a",
    sortOrder,
    clientId: null,
    minCapRatePct: null,
    minCocPct: null,
    minDscr: null,
    minCashFlowMonthly,
    maxPurchasePrice: null,
    propertyTypes: [],
    targetStates: [],
    isActive: true,
  };
}

const metrics: BuyBoxDealMetrics = {
  capRatePct: 6,
  cocPct: 7,
  dscr: 1.2,
  cashFlowMonthly: 150,
  purchasePrice: 200_000,
  propertyType: "single-family",
  state: "PA",
  isCashPurchase: false,
};

describe("single Buy Box decision basis continuity", () => {
  it("keeps priority Box A as the verdict basis even when Box B would pass", () => {
    const boxA = box("box-a", "Box A", 300, 0);
    const boxB = box("box-b", "Box B", 100, 1);
    const liveAggregate = evaluateBuyBoxes([boxA, boxB], metrics);

    // Characterizes the former bug: post-run aggregate selection switched to B.
    expect(selectDecidingBuyBoxResult(liveAggregate)?.box.id).toBe("box-b");

    const adopted = captureBuyBoxDecisionBasis({
      box: boxA,
      target: { monthlyCashFlow: 300 },
      strategyKey: "buy-hold",
      capturedAt: "2026-08-26T12:00:00.000Z",
    });
    const frozenBox = namedBuyBoxFromDecisionBasis(adopted);
    expect(frozenBox?.id).toBe("box-a");
    const frozenResult = evaluateBuyBoxes([frozenBox!], metrics);
    expect(selectDecidingBuyBoxResult(frozenResult)?.box.id).toBe("box-a");
    expect(frozenResult[0]?.result.passes).toBe(false);
  });

  it("threads the immutable basis through result, save, share, reopen, draft, and repeat", () => {
    const calculator = read("components/investcalc/investcalc-page.tsx");
    const dashboard = read("components/investcalc/analysis-dashboard.tsx");
    const verdict = read("components/investcalc/buy-box-verdict-card.tsx");
    const save = read("app/actions/saved-analyses.ts");
    const shareAction = read("app/actions/public-shares.ts");
    const shareStore = read("lib/public-share.ts");

    expect(calculator).toContain("captureBuyBoxDecisionBasis");
    expect(calculator).toContain("OFFER_CEILING_DECISION_BASIS_FIELD");
    expect(calculator).toContain("carriedDecisionBasis");
    expect(calculator).toContain("adoptedDecisionBasis={analysisDecisionBasis}");
    expect(dashboard).toContain("adoptedDecisionBasis={normalizedDecisionBasis}");
    expect(verdict).toContain("frozenDecisionBox ? [frozenDecisionBox] : []");
    expect(save).toContain(
      "resultSnapshotWithScore[OFFER_CEILING_DECISION_BASIS_FIELD]",
    );
    expect(shareAction).toContain("offerCeilingDecisionBasis: shareDecisionBasis");
    expect(shareStore).toContain("offerCeilingDecisionBasis?: OfferCeilingDecisionBasis");
  });

  it("downgrades anonymous legacy buy-box targets to selected criteria", () => {
    const calculator = read("components/investcalc/investcalc-page.tsx");
    const save = read("app/actions/saved-analyses.ts");
    const shareStore = read("lib/public-share.ts");

    expect(calculator).toContain(
      'return { basis: null, source: "selected-targets", needsReview: true }',
    );
    expect(save).toContain('maxOfferTargetSource = "selected-targets"');
    expect(shareStore).toContain('normalizedMaoTargetSource = "selected-targets"');
  });
});
