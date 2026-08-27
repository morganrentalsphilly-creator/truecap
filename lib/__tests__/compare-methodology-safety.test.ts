import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  arePickerMethodologiesCompatible,
  normalizeMethodologySelection,
  type ComparePickerDeal,
} from "@/components/investcalc/compare-deal-picker";
import {
  areDealMethodologiesComparable,
  getComparableBestValue,
  getLeaderIdsFromHighlightedCounts,
  getShortTermHighlightedWinCounts,
  type CompareDealViewModel,
} from "@/components/investcalc/compare-deals-client";
import {
  METRIC_ROWS,
  areMethodologyCohortsComparable,
  getBestValue,
} from "@/lib/compare-metrics";

function read(relativePath: string): string {
  return readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), "utf8");
}

function pickerDeal(
  id: string,
  methodologyCohort: string,
  methodologyLabel: string
): ComparePickerDeal {
  return {
    id,
    label: `Deal ${id}`,
    score: 50,
    signal: "watch",
    netCashFlow: 100,
    capRate: 6,
    methodologyCohort,
    methodologyLabel,
  };
}

function comparisonDeal(
  id: string,
  methodologyCohort: string,
  metrics: Record<string, number | null>
): CompareDealViewModel {
  return {
    id,
    methodologyCohort,
    metrics,
  } as unknown as CompareDealViewModel;
}

describe("methodology-safe comparison selection", () => {
  const recordedV1 = pickerDeal("recorded-v1", "recorded:1.0", "Frozen Standard v1.0");
  const recordedV11 = pickerDeal("recorded-v11", "recorded:1.1", "Recorded Standard v1.1");
  const computedV11 = pickerDeal(
    "computed-v11",
    "computed:1.1",
    "Legacy analysis · recomputed with current v1.1"
  );
  const unknownLegacyA = pickerDeal(
    "legacy-a",
    "unavailable:legacy-unversioned:legacy-a",
    "Legacy analysis · stored snapshot",
  );
  const unknownLegacyB = pickerDeal(
    "legacy-b",
    "unavailable:legacy-unversioned:legacy-b",
    "Legacy analysis · stored snapshot",
  );

  it("allows only exact version-and-provenance cohorts", () => {
    expect(arePickerMethodologiesCompatible([recordedV1, recordedV1])).toBe(true);
    expect(arePickerMethodologiesCompatible([recordedV1, recordedV11])).toBe(false);
    expect(arePickerMethodologiesCompatible([recordedV11, computedV11])).toBe(false);
  });

  it("repairs a stale mixed cookie without silently changing saved results", () => {
    const normalized = normalizeMethodologySelection(
      [recordedV1, recordedV11, computedV11],
      [recordedV1.id, recordedV11.id, computedV11.id]
    );

    expect(normalized.selectedIds).toEqual([recordedV1.id]);
    expect(normalized.droppedIds).toEqual([recordedV11.id, computedV11.id]);
  });

  it("never compares unknown unversioned snapshots, even with each other", () => {
    expect(
      arePickerMethodologiesCompatible([unknownLegacyA, unknownLegacyB]),
    ).toBe(false);
    expect(
      normalizeMethodologySelection(
        [unknownLegacyA, unknownLegacyB],
        [unknownLegacyA.id, unknownLegacyB.id],
      ),
    ).toEqual({
      selectedIds: [],
      droppedIds: [unknownLegacyA.id, unknownLegacyB.id],
    });
  });

  it("treats missing and unavailable provenance as unsafe before submission", () => {
    expect(areMethodologyCohortsComparable(["recorded:1.1"])).toBe(true);
    expect(
      areMethodologyCohortsComparable(["recorded:1.1", "recorded:1.1"])
    ).toBe(true);
    expect(
      areMethodologyCohortsComparable(["recorded:1.1", "computed:1.1"])
    ).toBe(false);
    expect(areMethodologyCohortsComparable(["unavailable:legacy"])).toBe(
      false
    );
    expect(areMethodologyCohortsComparable([undefined])).toBe(false);
  });
});

describe("methodology-safe leader and highlight behavior", () => {
  const metric = METRIC_ROWS.find((row) => row.key === "netCashFlow")!;
  const baseMetrics = {
    netCashFlow: 100,
    capRate: 6,
    dscr: 1.25,
    totalCashRequired: 50_000,
    monthlyPayment: 1_000,
  };

  it("preserves ties and deterministic winners inside one cohort", () => {
    const tied = [
      comparisonDeal("a", "recorded:1.1", baseMetrics),
      comparisonDeal("b", "recorded:1.1", baseMetrics),
    ];
    const tiedCounts = getShortTermHighlightedWinCounts(tied);
    expect(Object.fromEntries(tiedCounts)).toEqual({ a: 4, b: 4 });
    expect(getLeaderIdsFromHighlightedCounts(tied, tiedCounts)).toEqual(["a", "b"]);

    const winner = [
      comparisonDeal("a", "recorded:1.1", { ...baseMetrics, netCashFlow: 200 }),
      comparisonDeal("b", "recorded:1.1", baseMetrics),
    ];
    expect(
      getLeaderIdsFromHighlightedCounts(winner, getShortTermHighlightedWinCounts(winner))
    ).toEqual(["a"]);
  });

  it("returns no best value, lead, or winner across mixed methodologies", () => {
    const mixed = [
      comparisonDeal("frozen", "recorded:1.0", { ...baseMetrics, netCashFlow: 500 }),
      comparisonDeal("current", "computed:1.1", baseMetrics),
    ];
    const counts = getShortTermHighlightedWinCounts(mixed);

    expect(areDealMethodologiesComparable(mixed)).toBe(false);
    expect(getComparableBestValue(metric, mixed)).toBeNull();
    expect(Object.fromEntries(counts)).toEqual({ frozen: 0, current: 0 });
    expect(getLeaderIdsFromHighlightedCounts(mixed, counts)).toEqual([]);
  });

  it("does not award a best value, lead, or trophy to a lone eligible candidate", () => {
    const sparse = [
      comparisonDeal("only-value", "recorded:1.1", baseMetrics),
      comparisonDeal("missing", "recorded:1.1", {
        netCashFlow: null,
        capRate: null,
        dscr: null,
        totalCashRequired: null,
        monthlyPayment: null,
      }),
    ];
    const counts = getShortTermHighlightedWinCounts(sparse);

    expect(getBestValue(metric, sparse)).toBeNull();
    expect(Object.fromEntries(counts)).toEqual({
      "only-value": 0,
      missing: 0,
    });
    expect(getLeaderIdsFromHighlightedCounts(sparse, counts)).toEqual([]);
  });
});

describe("methodology safety UX guards", () => {
  const picker = read("../../components/investcalc/compare-deal-picker.tsx");
  const client = read("../../components/investcalc/compare-deals-client.tsx");
  const savedDeals = read(
    "../../components/investcalc/saved-analyses-page-v2.tsx"
  );
  const compareAction = read("../../app/actions/compare.ts");

  it("explains blocked choices and supplies an accessible re-underwrite action", () => {
    expect(picker).toContain('aria-disabled={isMethodologyBlocked}');
    expect(picker).toContain("Different calculation record");
    expect(picker).toContain("Re-underwrite to compare");
    expect(picker).toContain("min-h-11");
    expect(picker).toContain('aria-live="polite"');
  });

  it("keeps old numbers visible but suppresses every comparative endorsement", () => {
    expect(client).toContain("Comparison highlights paused");
    expect(client).toContain("will not name a winner, award metric leads, show trophies, or plot them together");
    expect(client).toContain("methodologiesComparable && riskReturnDeals.length >= 2");
    expect(client).toContain("methodologiesComparable ? (");
    expect(client).toContain("Re-underwrite deal {index + 1} to compare");
  });

  it("blocks mixed or unsafe My Deals submissions before the transition can navigate", () => {
    const handlerStart = savedDeals.indexOf("const handleCompareSelected");
    const handlerEnd = savedDeals.indexOf(
      "// The handoff itself is the shared helper",
      handlerStart
    );
    const handler = savedDeals.slice(handlerStart, handlerEnd);

    expect(handler).toContain("areMethodologyCohortsComparable");
    expect(handler).toContain("Re-underwrite before comparing");
    expect(handler.indexOf("areMethodologyCohortsComparable")).toBeLessThan(
      handler.indexOf("startCompareTransition")
    );
  });

  it("revalidates methodology on every server entry before writing the cookie", () => {
    expect(compareAction).toContain(
      '.select("id, methodology_version, result_snapshot, form_snapshot")'
    );
    for (const actionName of [
      "startCompareAction",
      "addDealToCompareAction",
      "compareScenariosAction",
    ]) {
      const actionStart = compareAction.indexOf(
        `export async function ${actionName}`
      );
      const nextAction = compareAction.indexOf(
        "export async function",
        actionStart + 1
      );
      const body = compareAction.slice(
        actionStart,
        nextAction === -1 ? undefined : nextAction
      );
      expect(body).toContain("getCompareSelectionError");
      expect(body.indexOf("getCompareSelectionError")).toBeLessThan(
        body.indexOf("setCompareCookie")
      );
    }
  });

  it("requires two finite candidates in direct and long-term best-value paths", () => {
    expect(read("../../lib/compare-metrics.ts")).toContain(
      "if (values.length < 2) return null"
    );
    expect(client).toContain("if (candidates.length < 2) return new Set()");
    expect(client).toContain("}).length >= 2");
  });
});
