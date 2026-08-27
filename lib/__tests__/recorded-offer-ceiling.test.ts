import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { resolveOfferCeilingForAccess } from "@/lib/offer-ceiling-server";
import {
  invalidateRecordedOfferCeilingForTargetEdit,
  readRecordedOfferCeiling,
  recordedDealOfferLine,
} from "@/lib/recorded-offer-ceiling";
import {
  SAMPLE_DEAL_FIXTURE,
  SAMPLE_DEAL_MAO_TARGET,
  SAMPLE_DEAL_VALUES,
} from "@/lib/sample-deal";

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

  it("round-trips an adopted starter solve without relabeling it as user-selected", () => {
    const access = resolveOfferCeilingForAccess({
      values: SAMPLE_DEAL_VALUES,
      target: SAMPLE_DEAL_MAO_TARGET,
      source: "starter-criteria",
      paidAccess: true,
    });
    expect(access.access).toBe("exact");
    if (access.access !== "exact") return;

    const snapshot = {
      maxOfferTarget: SAMPLE_DEAL_MAO_TARGET,
      maxOfferTargetSource: "starter-criteria",
      offerCeilingExact: access.exact,
    };
    const captured = readRecordedOfferCeiling(snapshot);
    expect(captured).toMatchObject({
      captured: true,
      source: "starter-criteria",
    });
    expect(
      recordedDealOfferLine({ snapshot, isShoppingStage: true })?.basisLabel,
    ).toContain("TrueCap starter criteria");
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

  it("restores the exact shared-sample ceiling after a target is edited away and back", () => {
    // Target editing must not turn a live result into recorded historical
    // mode. The dashboard only calls the entitlement-checked server resolver
    // when this state remains null.
    const afterLiveTargetEdit =
      invalidateRecordedOfferCeilingForTargetEdit(null);
    expect(afterLiveTargetEdit).toBeNull();

    const changed = resolveOfferCeilingForAccess({
      values: SAMPLE_DEAL_FIXTURE.values,
      target: { ...SAMPLE_DEAL_FIXTURE.maoTarget, monthlyCashFlow: 800 },
      source: "selected-targets",
      paidAccess: false,
    });
    expect(changed.access).toBe("preview");

    const restored = resolveOfferCeilingForAccess({
      values: SAMPLE_DEAL_FIXTURE.values,
      target: { ...SAMPLE_DEAL_FIXTURE.maoTarget, monthlyCashFlow: 750 },
      source: "selected-targets",
      paidAccess: false,
    });
    expect(restored.access).toBe("exact");
    if (restored.access !== "exact") return;
    expect(restored.exact?.presentation.ceiling).toBe(236_000);

    // A genuinely historical result still fails closed after the same edit;
    // it must not mix recorded base metrics with today's inverse solver.
    expect(
      invalidateRecordedOfferCeilingForTargetEdit({
        captured: true,
        exact: restored.exact,
      }),
    ).toEqual({ captured: false, exact: null });
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
