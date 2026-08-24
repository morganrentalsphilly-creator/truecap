import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { resolveOfferCeilingForAccess } from "@/lib/offer-ceiling-server";
import {
  readRecordedOfferCeiling,
  recordedDealOfferLine,
} from "@/lib/recorded-offer-ceiling";
import { SAMPLE_DEAL_MAO_TARGET, SAMPLE_DEAL_VALUES } from "@/lib/sample-deal";

function capturedSnapshot() {
  const access = resolveOfferCeilingForAccess({
    values: SAMPLE_DEAL_VALUES,
    target: SAMPLE_DEAL_MAO_TARGET,
    source: "selected-targets",
    paidAccess: true,
  });
  expect(access.access).toBe("exact");
  if (access.access !== "exact") throw new Error("expected exact solve");
  return {
    maxOfferTarget: SAMPLE_DEAL_MAO_TARGET,
    maxOfferTargetSource: "selected-targets",
    offerCeilingExact: access.exact,
  };
}

describe("recorded Offer Ceiling", () => {
  it("round-trips the exact solved output without invoking a new formula", () => {
    const snapshot = capturedSnapshot();
    const captured = readRecordedOfferCeiling(snapshot);
    expect(captured.captured).toBe(true);
    if (!captured.captured || !captured.exact) {
      throw new Error("expected captured Offer Ceiling");
    }

    expect(captured.target).toEqual(SAMPLE_DEAL_MAO_TARGET);
    expect(captured.source).toBe("selected-targets");
    expect(captured.exact.achieved.cocReturn).toEqual(expect.any(Number));
    expect(
      captured.exact.makePriceWork.requiredMonthlyRent?.alreadyMet,
    ).toEqual(expect.any(Boolean));

    const line = recordedDealOfferLine({
      snapshot,
      isShoppingStage: true,
    });
    expect(line?.offer?.kind).toBe("cut");
    expect(
      line?.offer && line.offer.kind !== "blocked"
        ? line.offer.maxPrice
        : null,
    ).toBe(captured.exact.presentation.ceiling);
    expect(line?.basisLabel).toContain("your saved targets");
  });

  it("distinguishes an attempted unsolvable capture from an older absent capture", () => {
    expect(
      readRecordedOfferCeiling({
        maxOfferTarget: SAMPLE_DEAL_MAO_TARGET,
        maxOfferTargetSource: "selected-targets",
      }),
    ).toEqual({ captured: false });

    expect(
      readRecordedOfferCeiling({
        maxOfferTarget: SAMPLE_DEAL_MAO_TARGET,
        maxOfferTargetSource: "selected-targets",
        offerCeilingExact: null,
      }),
    ).toMatchObject({ captured: true, exact: null });
  });

  it("fails closed when exact output is corrupt or paired with different provenance", () => {
    const snapshot = capturedSnapshot();
    expect(
      readRecordedOfferCeiling({
        ...snapshot,
        maxOfferTargetSource: "buy-box",
      }),
    ).toEqual({ captured: false });
    expect(
      readRecordedOfferCeiling({
        ...snapshot,
        offerCeilingExact: { presentation: { ceiling: Number.NaN } },
      }),
    ).toEqual({ captured: false });
  });

  it("captures paid inserts and updates atomically and never copies a prior solve", () => {
    const action = readFileSync(
      join(process.cwd(), "app/actions/saved-analyses.ts"),
      "utf8",
    );
    expect(action).toContain(
      "resultSnapshotWithScore.offerCeilingExact = capturedAccess.exact",
    );
    expect(action).toContain("values: sanitizedValues");
    expect(action).not.toContain(
      "resultSnapshotWithScore.offerCeilingExact = existingSnapshot",
    );
    expect(action.indexOf("result_snapshot: resultSnapshotWithScore")).toBeLessThan(
      action.indexOf('.from("saved_analyses")\n      .update('),
    );
  });
});
