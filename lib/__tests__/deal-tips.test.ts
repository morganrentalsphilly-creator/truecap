import { describe, expect, it } from "vitest";
import { buildDealTips, type DealTipsInput } from "@/lib/deal-tips";
import type { DealScoreBreakdown } from "@/lib/deal-score";

/** Top-tier breakdown — every subscore at its component max. */
function strongBreakdown(overrides: Partial<DealScoreBreakdown> = {}): DealScoreBreakdown {
  return {
    cashFlowScore: 22,
    cocScore: 20,
    capRateScore: 16,
    dscrScore: 17,
    totalReturnScore: 25,
    riskPenalty: 0,
    ...overrides,
  };
}

function input(overrides: Partial<DealTipsInput> = {}): DealTipsInput {
  return {
    breakdown: strongBreakdown(),
    propertyType: "single-family",
    isCashPurchase: false,
    ...overrides,
  };
}

describe("buildDealTips", () => {
  it("returns null when the breakdown is unavailable (free tier / score not loaded)", () => {
    expect(buildDealTips(input({ breakdown: null }))).toBeNull();
    expect(buildDealTips(input({ breakdown: undefined }))).toBeNull();
  });

  it("returns null for a strong deal — no alarmist tips when every subscore is healthy", () => {
    expect(buildDealTips(input())).toBeNull();
  });

  it("returns null when subscores sit at their healthy-tier floors (nothing weak to call out)", () => {
    // cashFlow 18 = $500+/mo strong, coc 13 = 5–7% healthy, capRate 9 = fair,
    // dscr 13 = clears the 1.20 lender threshold, totalReturn 14 = solid.
    const breakdown = strongBreakdown({
      cashFlowScore: 18,
      cocScore: 13,
      capRateScore: 9,
      dscrScore: 13,
      totalReturnScore: 14,
    });
    expect(buildDealTips(input({ breakdown }))).toBeNull();
  });

  it("ranks the two lowest-ratio subscores first and caps at two tips", () => {
    // Ratios: dscr 3/17 ≈ 0.18 (lowest), capRate 4/16 = 0.25 (second),
    // coc 8/20 = 0.40 (dropped — only two tips render).
    const breakdown = strongBreakdown({ dscrScore: 3, capRateScore: 4, cocScore: 8 });
    const tips = buildDealTips(input({ breakdown }));
    expect(tips).toHaveLength(2);
    expect(tips?.[0]).toContain("DSCR");
    expect(tips?.[1]).toContain("Cap rate");
  });

  it("returns a single tip when only one subscore is weak", () => {
    const breakdown = strongBreakdown({ dscrScore: 7 });
    const tips = buildDealTips(input({ breakdown }));
    expect(tips).toHaveLength(1);
    expect(tips?.[0]).toContain("1.20");
  });

  it("quotes the deal's own metric values when provided", () => {
    // Ratios: coc 8/20 = 0.40 leads, dscr 7/17 ≈ 0.41 second.
    const breakdown = strongBreakdown({ dscrScore: 7, cocScore: 8 });
    const tips = buildDealTips(
      input({ breakdown, metrics: { dscr: 1.12, cocReturn: 4.3 } })
    );
    expect(tips?.[0]).toContain("Cash-on-cash 4.3%");
    expect(tips?.[1]).toContain("DSCR 1.12");
  });

  it("degrades to tier phrasing when metric values are absent", () => {
    const breakdown = strongBreakdown({ dscrScore: 7 });
    const tips = buildDealTips(input({ breakdown }));
    expect(tips?.[0]).toMatch(/^DSCR is your thin spot/);
  });

  it("never tips DSCR on a cash purchase — even when the subscore is low", () => {
    // The engine awards a synthetic full-credit 17 on cash purchases, but the
    // guard must hold even for stale/serialized breakdowns carrying a low score.
    const breakdown = strongBreakdown({ dscrScore: 0, capRateScore: 4 });
    const tips = buildDealTips(input({ breakdown, isCashPurchase: true }));
    expect(tips).toHaveLength(1);
    expect(tips?.[0]).toContain("Cap rate");
    expect(tips?.join(" ")).not.toContain("DSCR");
  });

  it("distinguishes negative cash flow from positive-but-modest", () => {
    const modest = buildDealTips(
      input({
        breakdown: strongBreakdown({ cashFlowScore: 8 }),
        metrics: { netCashFlow: 180 },
      })
    );
    expect(modest?.[0]).toContain("$180/mo is positive");
    expect(modest?.[0]).toContain("$500/mo");

    const negative = buildDealTips(
      input({
        breakdown: strongBreakdown({ cashFlowScore: 3 }),
        metrics: { netCashFlow: -150 },
      })
    );
    expect(negative?.[0]).toContain("negative (-$150/mo)");
  });

  it("uses the owner-occupant house-hack phrasing and 30-pt scale", () => {
    // OO cashFlowScore 0 (well above break-even) vs investor coc 8 (ratio 0.4):
    // the 0/30 cash-flow ratio ranks first.
    const breakdown = strongBreakdown({ cashFlowScore: 0, cocScore: 8 });
    const tips = buildDealTips(
      input({ breakdown, propertyType: "owner-occupant", metrics: { netCashFlow: -450 } })
    );
    expect(tips).toHaveLength(2);
    expect(tips?.[0]).toContain("Owner cost runs $450/mo above break-even");
    expect(tips?.[0]).toContain("$300/mo");
  });

  it("does not tip owner-occupant cash flow inside the near-break-even band", () => {
    // 25 = within $300/mo of break-even — typical for a house-hack, not a weakness.
    const breakdown = strongBreakdown({ cashFlowScore: 25 });
    expect(buildDealTips(input({ breakdown, propertyType: "owner-occupant" }))).toBeNull();
  });

  it("tips weak projected total return with the 8%/yr solid bar", () => {
    const modest = buildDealTips(input({ breakdown: strongBreakdown({ totalReturnScore: 8 }) }));
    expect(modest?.[0]).toContain("8%/yr");
    const weak = buildDealTips(input({ breakdown: strongBreakdown({ totalReturnScore: 0 }) }));
    expect(weak?.[0]).toContain("limited long-term upside");
  });

  it("only quotes thresholds that exist in the deal-score engine", () => {
    // Every subscore weak at once — sweep the emitted copy for the known
    // engine thresholds and make sure no foreign cutoff (e.g. 1.25) leaks in.
    const breakdown: DealScoreBreakdown = {
      cashFlowScore: 3,
      cocScore: 3,
      capRateScore: 0,
      dscrScore: 0,
      totalReturnScore: 3,
      riskPenalty: -10,
    };
    const tips = buildDealTips(input({ breakdown }));
    const text = tips?.join(" ") ?? "";
    expect(text).not.toContain("1.25");
    expect(text).not.toContain("1.15");
  });

  it("never quotes a rounded value that contradicts the bar it cites", () => {
    // Engine tiers on the RAW value, display rounds it: DSCR 1.196 scores
    // "thin" (< 1.20) but toFixed(2) shows "1.20" — the tip must fall back
    // to the bare metric name instead of "DSCR 1.20 … below the 1.20".
    const dscrTips = buildDealTips(
      input({
        breakdown: strongBreakdown({ dscrScore: 7 }),
        metrics: { dscr: 1.196 },
      })
    );
    const dscrText = dscrTips?.join(" ") ?? "";
    expect(dscrText).toContain("below the 1.20 lender threshold");
    expect(dscrText).not.toContain("DSCR 1.20");
    // Same guard for cap rate: raw 4.96 displays "5.0" beside "below the 5%".
    const capTips = buildDealTips(
      input({
        breakdown: strongBreakdown({ capRateScore: 0 }),
        metrics: { capRate: 4.96 },
      })
    );
    const capText = capTips?.join(" ") ?? "";
    expect(capText).toContain("below the 5% market bar");
    expect(capText).not.toContain("5.0%");
  });
});
