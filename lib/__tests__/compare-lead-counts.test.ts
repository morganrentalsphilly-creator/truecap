import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  METRIC_ROWS,
  getLeadCountLeaderIds,
  tallyScoreMetricLeads,
  type ScoreMetricRule,
} from "@/lib/compare-metrics";
import { calculateAnalysis } from "@/lib/calc-analysis";
import {
  buildCompareSnapshotPayload,
  COMPARE_RESULT_SNAPSHOT_VERSION,
  parseCompareSnapshotV1,
} from "@/lib/compare-result-snapshot";
import { SAMPLE_DEAL_FIXTURE } from "@/lib/sample-deal";

function read(relativePath: string): string {
  return readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), "utf8");
}

type Deal = {
  id: string;
  cashFlow: number;
  capRate: number;
  dscr: number;
  cashRequired: number;
  duplicatedAnnualCashFlow: number;
};

const rules: ScoreMetricRule<Deal>[] = [
  { key: "cashFlow", direction: "higher", scoreMetric: true, getValue: (deal) => deal.cashFlow },
  { key: "capRate", direction: "higher", scoreMetric: true, getValue: (deal) => deal.capRate },
  { key: "dscr", direction: "higher", scoreMetric: true, getValue: (deal) => deal.dscr },
  { key: "cashRequired", direction: "lower", scoreMetric: true, getValue: (deal) => deal.cashRequired },
  {
    key: "duplicatedAnnualCashFlow",
    direction: "higher",
    scoreMetric: false,
    getValue: (deal) => deal.duplicatedAnnualCashFlow,
  },
];

describe("comparison lead-count formula", () => {
  it("opts in exactly four nonduplicative near-term decision rows", () => {
    expect(METRIC_ROWS.filter((row) => row.scoreMetric).map((row) => row.key)).toEqual([
      "netCashFlow",
      "capRate",
      "dscr",
      "totalCashRequired",
    ]);
  });

  it("ignores display-only duplicates and preserves true ties", () => {
    const deals: Deal[] = [
      { id: "a", cashFlow: 500, capRate: 8, dscr: 1.4, cashRequired: 60_000, duplicatedAnnualCashFlow: 1 },
      { id: "b", cashFlow: 500, capRate: 8, dscr: 1.4, cashRequired: 60_000, duplicatedAnnualCashFlow: 999_999 },
      { id: "c", cashFlow: 100, capRate: 5, dscr: 1.1, cashRequired: 90_000, duplicatedAnnualCashFlow: 2_000_000 },
    ];

    const counts = tallyScoreMetricLeads(deals, rules);
    expect(Object.fromEntries(counts)).toEqual({ a: 4, b: 4, c: 0 });
    expect(getLeadCountLeaderIds(deals, counts)).toEqual(["a", "b"]);
  });

  it("does not use score, ROI, recency, or array order to break equal totals", () => {
    const deals: Deal[] = [
      { id: "older-low-score", cashFlow: 500, capRate: 8, dscr: 1.4, cashRequired: 60_000, duplicatedAnnualCashFlow: 0 },
      { id: "newer-high-score", cashFlow: 500, capRate: 8, dscr: 1.4, cashRequired: 60_000, duplicatedAnnualCashFlow: 0 },
    ];
    const counts = tallyScoreMetricLeads(deals, rules);
    expect(getLeadCountLeaderIds(deals, counts)).toEqual([
      "older-low-score",
      "newer-high-score",
    ]);
  });
});

describe("comparison recorded return metrics", () => {
  it("freezes canonical cash invested, equity multiple, and IRR in snapshot v3", () => {
    const values = SAMPLE_DEAL_FIXTURE.values;
    const payload = buildCompareSnapshotPayload(calculateAnalysis(values), values);

    expect(COMPARE_RESULT_SNAPSHOT_VERSION).toBe(3);
    expect(payload.snapshotVersion).toBe(3);
    expect(payload.compareSnapshot.returnSummary?.cashInvested).toBeGreaterThan(0);
    expect(payload.compareSnapshot.returnSummary?.equityMultiple).toBeGreaterThan(0);
    expect(payload.compareSnapshot.returnSummary?.irrPct).not.toBeNull();
    expect(
      payload.compareSnapshot.exitScenarios.years.find((year) => year.year === 10)
        ?.netSaleProceeds
    ).toBeTypeOf("number");
  });

  it("keeps older recorded snapshots readable without fabricating new return fields", () => {
    const values = SAMPLE_DEAL_FIXTURE.values;
    const current = buildCompareSnapshotPayload(calculateAnalysis(values), values).compareSnapshot;
    const { returnSummary: _removed, ...legacy } = current;

    expect(parseCompareSnapshotV1(legacy)?.returnSummary).toBeUndefined();
  });

  it("drops a malformed optional return summary instead of exposing nonnumeric cells", () => {
    const values = SAMPLE_DEAL_FIXTURE.values;
    const current = buildCompareSnapshotPayload(calculateAnalysis(values), values).compareSnapshot;

    expect(
      parseCompareSnapshotV1({
        ...current,
        returnSummary: { ...current.returnSummary, irrPct: "not-a-number" },
      })?.returnSummary
    ).toBeUndefined();
  });
});

describe("comparison selection recovery", () => {
  const page = read("../../app/dashboard/compare/page.tsx");
  const action = read("../../app/actions/compare.ts");
  const client = read("../../components/investcalc/compare-deals-client.tsx");

  it("never renders a one-deal comparison after stale rows are filtered", () => {
    expect(page).toContain("if (deals.length < 2)");
    expect(page).toContain("initialSelectedIds={deals.map((deal) => deal.id)}");
    expect(page).toContain("staleSelectionRecovered");
    expect(page).not.toContain("deals.length === 0");
  });

  it("allows a one-deal seed but requires the picker to reach 2 before comparing", () => {
    expect(action).toContain("selectedIds.length < 1");
    expect(action).toContain('One ID is a valid seed from "Compare with another deal"');
    expect(client).toContain("Edit selection");
    const picker = read("../../components/investcalc/compare-deal-picker.tsx");
    expect(picker).toContain("selected.length >= 2");
    expect(client).toContain('aria-live="polite"');
    expect(client).toContain("selectionLoadError");
    expect(client).toContain("removeCompareDealAction(deal.id)");
  });

  it("uses exactly three disclosed long-term score rows", () => {
    for (const key of ["ltTenYearCashFlow", "ltYear10NetSaleProceeds", "ltIrr"]) {
      const rowStart = client.indexOf(`key: "${key}"`);
      expect(rowStart).toBeGreaterThan(-1);
      expect(client.slice(rowStart, rowStart + 500)).toContain("scoreMetric: true");
    }
    expect(client).toContain("Long-term counts only 10-year cash flow, year-10 net sale proceeds, and recorded IRR when available");
  });
});
