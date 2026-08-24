import { describe, expect, it } from "vitest";
import {
  parseTriageInput,
  parseTriagePreviewInput,
  previewRowToListing,
  previewRowToScreenableListing,
  formatScreenableTriageRows,
  resolvedTriageLocation,
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
import { calculateAnalysis } from "@/lib/calc-analysis";
import { normalizeInvestmentFormSnapshot } from "@/lib/investcalc-schema";
import { meetsTarget } from "@/lib/max-allowable-offer";

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

  it("does not count a missing-rent preview row as screenable", () => {
    const [missingRent, complete] = parseTriagePreviewInput(
      "456 Oak Ave, Denver, CO\t400000\n123 Main St, Austin, TX\t350000\t2400\t4"
    );

    expect(previewRowToListing(missingRent!)).toMatchObject({ purchasePrice: 400000 });
    expect(previewRowToScreenableListing(missingRent!)).toBeNull();
    expect(previewRowToScreenableListing(complete!)).not.toBeNull();
    expect(formatScreenableTriageRows([missingRent!, complete!])).toBe(
      "123 Main St, Austin, TX\t350000\t2400\t4"
    );
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

describe("editable triage preview", () => {
  it("retains partial and ambiguous rows with field-level issues", () => {
    const rows = parseTriagePreviewInput(
      [
        "1700 W Erie Ave, Philadelphia, PA 19140\t265000\t2100\t3",
        "456 Oak Ave, Denver, CO\t\t2400\t",
        "Unstructured listing with no numeric columns",
        "123 Main St, Austin, TX|350000|2400|4|unexpected",
      ].join("\n")
    );
    expect(rows).toHaveLength(4);
    expect(rows[1]!.address).toContain("Denver");
    expect(rows[1]!.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: "purchasePrice", severity: "error" }),
        expect.objectContaining({ field: "bedrooms", severity: "warning" }),
      ])
    );
    expect(rows[2]!.issues).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "row", message: expect.stringMatching(/identify/i) })])
    );
    expect(rows[3]!.issues).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "row", message: expect.stringMatching(/extra/i) })])
    );
  });

  it("turns a repaired preview row into canonical tab-separated screening input", () => {
    const [partial] = parseTriagePreviewInput("456 Oak Ave, Denver, CO\t\t2400\t");
    expect(partial).toBeTruthy();
    const repaired = {
      ...partial!,
      purchasePrice: "$400,000",
      bedrooms: "4",
      issues: [],
    };
    expect(previewRowToListing(repaired)).toEqual({
      address: "456 Oak Ave, Denver, CO",
      purchasePrice: 400000,
      monthlyRent: 2400,
      bedrooms: 4,
    });
    expect(formatScreenableTriageRows([repaired])).toBe(
      "456 Oak Ave, Denver, CO\t400000\t2400\t4"
    );
  });

  it("resolves the city/state shown as the assumption market", () => {
    expect(resolvedTriageLocation("1700 W Erie Ave, Philadelphia, PA 19140")).toEqual({
      city: "Philadelphia",
      state: "PA",
      label: "Philadelphia, PA",
    });
    expect(resolvedTriageLocation("somewhere unknown").label).toBeNull();
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
    expect(r.maxOffer).toBeNull();
    expect(r.target).toBeNull();
    expect(r.targetLabel).toBeNull();
    expect(r.askingGap).toBeNull();
    expect(r.requiredMonthlyRent).toBeNull();
    expect(r.buyBoxFit).toBeNull(); // no boxes passed
  });

  it("never underwrites a missing rent using the schema demonstration default", () => {
    const r = triageListing({ address: "456 Oak Ave, Denver, CO", purchasePrice: 400000 });
    expect(r.ok).toBe(false);
    expect(r.netCashFlowMonthly).toBeNull();
    expect(r.maxOffer).toBeNull();
    expect(r.requiredMonthlyRent).toBeNull();
  });

  it("uses buy-box return targets for Max Offer and required-rent path", () => {
    const box: NamedBuyBox = {
      ...EMPTY_BUY_BOX,
      id: "b-target",
      name: "Income floor",
      strategyKind: null,
      isDefault: true,
      sortOrder: 0,
      minCashFlowMonthly: 500,
      minDscr: 1.35,
    };
    const r = triageListing(
      { address: "1205 N 5th St, Philadelphia, PA", purchasePrice: 245000, monthlyRent: 2100 },
      { buyBoxes: [box] }
    );
    expect(r.target).toEqual({ monthlyCashFlow: 500, dscr: 1.35 });
    expect(r.targetLabel).toMatch(/cash flow.*500.*DSCR.*1.35/i);
    expect(r.maxOffer).toBeGreaterThan(0);
    expect(r.requiredMonthlyRent).toBeGreaterThanOrEqual(2100);
    const values = normalizeInvestmentFormSnapshot(buildTriageSnapshot(r.input));
    expect(values).not.toBeNull();
    expect(
      meetsTarget(calculateAnalysis({ ...values!, purchasePrice: r.maxOffer! }), r.target!)
    ).toBe(true);
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
    target: null,
    targetLabel: null,
    maxOffer: null,
    askingGap: null,
    requiredMonthlyRent: null,
    requiredRentDelta: null,
    requiredRentUnreachable: false,
    viabilityDistance: null,
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

  it("breaks tied scores by closest-to-working distance before DSCR", () => {
    const rows = [
      mk({ input: { address: "Far St", purchasePrice: 1 }, score: 0, viabilityDistance: 0.5, dscr: 1.3 }),
      mk({ input: { address: "Close St", purchasePrice: 1 }, score: 0, viabilityDistance: 0.1, dscr: 0.9 }),
    ];
    const ranked = rankTriageRows(rows, "score");
    expect(ranked.map((r) => r.input.address)).toEqual(["Close St", "Far St"]);
  });

  it("uses stronger DSCR when target distance is exactly tied", () => {
    const rows = [mk({ score: 50, dscr: 1.1 }), mk({ score: 50, dscr: 2.2 })];
    const ranked = rankTriageRows(rows, "score");
    expect(ranked.map((r) => r.dscr)).toEqual([2.2, 1.1]);
  });

  it("uses address order, never paste order, for otherwise identical zero-score rows", () => {
    const zeta = mk({ input: { address: "Zeta Ave", purchasePrice: 1 }, score: 0, viabilityDistance: 0.2 });
    const alpha = mk({ input: { address: "Alpha Ave", purchasePrice: 1 }, score: 0, viabilityDistance: 0.2 });
    expect(rankTriageRows([zeta, alpha], "score").map((r) => r.input.address)).toEqual([
      "Alpha Ave",
      "Zeta Ave",
    ]);
  });
});
