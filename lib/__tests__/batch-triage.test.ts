import { describe, expect, it } from "vitest";
import {
  parseTriageInput,
  triageListing,
  rankTriageRows,
  buildTriageSnapshot,
  formatTriageRowsAsText,
  BATCH_UNDERWRITING_MAX_TRIAGE_ROWS,
  MAX_TRIAGE_ROWS,
  resolveMaxTriageRows,
  type TriageRowResult,
} from "@/lib/batch-triage";
import { EMPTY_BUY_BOX, type NamedBuyBox } from "@/lib/buy-box";
import { resolveFeatureFlags } from "@/lib/feature-flags";

// ── Parsing ──────────────────────────────────────────────────────────────────
describe("parseTriageInput", () => {
  it("supports 50 rows behind the batch-underwriting rollout flag", () => {
    expect(MAX_TRIAGE_ROWS).toBe(10);
    expect(
      resolveMaxTriageRows(resolveFeatureFlags({ batch_underwriting: true }))
    ).toBe(50);
    const text = Array.from(
      { length: BATCH_UNDERWRITING_MAX_TRIAGE_ROWS },
      (_, i) => `${100 + i} Main St, Philadelphia, PA\t${200_000 + i}\t2000\t3`
    ).join("\n");
    const parsed = parseTriageInput(text);
    expect(parsed.errors).toEqual([]);
    expect(parsed.rows).toHaveLength(BATCH_UNDERWRITING_MAX_TRIAGE_ROWS);
  });

  it("parses tab-separated rows (spreadsheet paste), $ and thousands commas intact", () => {
    const { rows, errors } = parseTriageInput(
      "1700 W Erie Ave, Philadelphia, PA 19140\t$265,000\t$2,100\t3"
    );
    expect(errors).toEqual([]);
    expect(rows).toEqual([
      { address: "1700 W Erie Ave, Philadelphia, PA 19140", purchasePrice: 265000, monthlyRent: 2100, bedrooms: 3 },
    ]);
  });

  it("parses pipe-separated rows", () => {
    const { rows } = parseTriageInput("123 Main St, Austin, TX | 350000 | 2400 | 4");
    expect(rows[0]).toMatchObject({ address: "123 Main St, Austin, TX", purchasePrice: 350000, monthlyRent: 2400, bedrooms: 4 });
  });

  it("comma mode: peels trailing numbers, keeps a comma-laden address whole", () => {
    const { rows, errors } = parseTriageInput("1205 N 5th St, Philadelphia, PA, 245000, 2100, 3");
    expect(errors).toEqual([]);
    expect(rows[0]).toEqual({
      address: "1205 N 5th St, Philadelphia, PA",
      purchasePrice: 245000,
      monthlyRent: 2100,
      bedrooms: 3,
    });
  });

  it("accepts a partial row (address + price only)", () => {
    const { rows } = parseTriageInput("456 Oak Ave, Denver CO\t400000");
    expect(rows[0]).toEqual({ address: "456 Oak Ave, Denver CO", purchasePrice: 400000 });
  });

  it("skips blank lines and flags unparseable ones without dropping the batch", () => {
    const { rows, errors } = parseTriageInput(
      ["100 Real St\t300000\t2200\t3", "", "no price here", "x\t250000"].join("\n")
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]!.purchasePrice).toBe(300000);
    // "no price here" (no trailing number) + "x" (address too short)
    expect(errors.map((e) => e.line).sort()).toEqual([3, 4]);
  });

  it("rejects a sub-$1000 'price' as not a price", () => {
    const { rows, errors } = parseTriageInput("123 Main Street\t500");
    expect(rows).toEqual([]);
    expect(errors[0]!.reason).toMatch(/purchase price/i);
  });

  it("formatTriageRowsAsText round-trips through parseTriageInput", () => {
    const rows = [
      { address: "1700 W Erie Ave, Philadelphia, PA 19140", purchasePrice: 265000, monthlyRent: 2100, bedrooms: 3 },
      { address: "456 Oak Ave, Denver, CO", purchasePrice: 420000 },
    ];
    const reparsed = parseTriageInput(formatTriageRowsAsText(rows));
    expect(reparsed.errors).toEqual([]);
    expect(reparsed.rows).toEqual(rows);
  });
});

// ── Underwriting one row ─────────────────────────────────────────────────────
describe("triageListing", () => {
  it("underwrites a listing through the canonical pipeline", () => {
    const r = triageListing({ address: "1205 N 5th St, Philadelphia, PA", purchasePrice: 245000, monthlyRent: 2100, bedrooms: 3 });
    expect(r.ok).toBe(true);
    expect(typeof r.score).toBe("number");
    expect(r.recommendation).toBeTruthy();
    expect(typeof r.netCashFlowMonthly).toBe("number");
    expect(r.buyBoxFit).toBeNull(); // no boxes passed
  });

  it("matches recomputeSavedDealVerdict for the same snapshot (one engine)", async () => {
    const input = { address: "1205 N 5th St, Philadelphia, PA", purchasePrice: 245000, monthlyRent: 2100, bedrooms: 3 };
    const { recomputeSavedDealVerdict } = await import("@/lib/recompute-saved-deal-verdict");
    const direct = recomputeSavedDealVerdict(buildTriageSnapshot(input));
    const r = triageListing(input);
    expect(r.score).toBe(direct!.score);
    expect(r.netCashFlowMonthly).toBe(direct!.netCashFlowMonthly);
    expect(r.dscr).toBe(direct!.dscr);
  });

  it("enrichment overlays rate + tax", () => {
    const input = { address: "1205 N 5th St, Philadelphia, PA", purchasePrice: 245000, monthlyRent: 2100 };
    const base = triageListing(input);
    const dear = triageListing(input, { enrichment: { interestRate: 12, propertyTaxPct: 3 } });
    // Higher rate + tax → strictly worse cash flow.
    expect(dear.netCashFlowMonthly!).toBeLessThan(base.netCashFlowMonthly!);
  });

  it("evaluates the buy box when boxes are provided", () => {
    const box: NamedBuyBox = {
      ...EMPTY_BUY_BOX,
      id: "b1",
      name: "Cash-flow floor",
      strategyKind: null,
      isDefault: true,
      sortOrder: 0,
      minCashFlowMonthly: 100_000, // impossible → deal will MISS
    };
    const r = triageListing(
      { address: "1205 N 5th St, Philadelphia, PA", purchasePrice: 245000, monthlyRent: 2100 },
      { buyBoxes: [box] }
    );
    expect(r.buyBoxFit).not.toBeNull();
    expect(r.buyBoxFit!.anyPass).toBe(false);
  });

  it("returns ok:false (not a throw) when inputs don't underwrite", () => {
    // Empty address never normalizes to a valid form.
    const r = triageListing({ address: "", purchasePrice: 245000 });
    expect(r.ok).toBe(false);
    expect(r.score).toBeNull();
  });
});

// ── Ranking ──────────────────────────────────────────────────────────────────
describe("rankTriageRows", () => {
  const mk = (over: Partial<TriageRowResult>): TriageRowResult => ({
    input: { address: "x", purchasePrice: 1 },
    ok: true,
    score: 50,
    recommendation: "Neutral",
    netCashFlowMonthly: 0,
    cocReturnPct: 0,
    capRatePct: 0,
    dscr: 1,
    isCashPurchase: false,
    buyBoxFit: null,
    ...over,
  });

  it("sorts by score desc, unscored rows last", () => {
    const rows = [mk({ score: 40 }), mk({ ok: false, score: null }), mk({ score: 80 })];
    const ranked = rankTriageRows(rows, "score");
    expect(ranked.map((r) => r.score)).toEqual([80, 40, null]);
  });

  it("'fit' leads with buy-box passers then score", () => {
    const fit = (anyPass: boolean) => ({ activeCount: 1, passingCount: anyPass ? 1 : 0, anyPass, bestFit: null });
    const rows = [
      mk({ score: 90, buyBoxFit: fit(false) }),
      mk({ score: 50, buyBoxFit: fit(true) }),
    ];
    const ranked = rankTriageRows(rows, "fit");
    expect(ranked[0]!.score).toBe(50); // the passer leads despite lower score
  });

  it("is stable within equal keys", () => {
    const rows = [mk({ score: 50, dscr: 1.1 }), mk({ score: 50, dscr: 2.2 })];
    const ranked = rankTriageRows(rows, "score");
    expect(ranked.map((r) => r.dscr)).toEqual([1.1, 2.2]);
  });
});
