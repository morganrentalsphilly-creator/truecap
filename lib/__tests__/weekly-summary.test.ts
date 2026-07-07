import { describe, expect, it } from "vitest";
import {
  buildWeeklySummary,
  isoWeekKey,
  normalizeWeeklyBuyBoxRow,
  weeklySummarySubject,
  WEEKLY_SUMMARY_MAX_DUE_ITEMS,
  type WeeklySummaryContext,
  type WeeklySummaryDealRow,
} from "@/lib/weekly-summary";
import { recomputeSavedDealVerdict } from "@/lib/recompute-saved-deal-verdict";
import { resolveOwnedEquityBasis } from "@/lib/owned-equity-series";
import { computeOwnedEquity, monthsOwnedBetween } from "@/lib/owned-equity";
import { EMPTY_BUY_BOX, type NamedBuyBox } from "@/lib/buy-box";
import type { InvestmentFormValues } from "@/lib/investcalc-schema";

/** Same canonical single-family fixture as calc-analysis.test.ts. */
function baseDeal(overrides: Partial<InvestmentFormValues> = {}): InvestmentFormValues {
  return {
    propertyType: "single-family",
    address: "1205 N 5th St, Philadelphia, PA 19122, USA",
    purchasePrice: 245_000,
    yearBuilt: 2010,
    bedrooms: 3,
    bathrooms: 2,
    sqft: 1500,
    monthlyRent: 2_100,
    units: [],
    downPaymentPct: 20,
    interestRate: 7,
    loanTermYears: 30,
    closingCostsPct: 3,
    propertyTaxPct: 1.1,
    insuranceInputMode: "percent",
    insurancePct: 0.5,
    insuranceMonthly: undefined,
    hoaMonthly: 0,
    utilitiesMonthly: 0,
    maintenancePct: 5,
    vacancyPct: 5,
    mgmtPct: 0,
    capexPct: 5,
    buildingValuePct: 80,
    depreciationYears: 27.5,
    includeInterestDeduction: true,
    taxRatePct: 24,
    expenseGrowthPct: 2,
    rentGrowthPct: 3,
    appreciationRatePct: 3,
    sellingCostPct: 6,
    ...overrides,
  } as InvestmentFormValues;
}

const ASOF = new Date("2026-07-06T12:00:00Z");

function row(overrides: Partial<WeeklySummaryDealRow> = {}): WeeklySummaryDealRow {
  return {
    id: overrides.id ?? "deal-1",
    title: "N 5th St",
    address: "1205 N 5th St, Philadelphia, PA 19122, USA",
    property_type: "single-family",
    purchase_price: 245_000,
    net_cash_flow_monthly: 111,
    pipeline_stage: "analyzing",
    is_completed: false,
    is_archived: false,
    close_date: null,
    form_snapshot: baseDeal(),
    ...overrides,
  };
}

function ctx(overrides: Partial<WeeklySummaryContext> = {}): WeeklySummaryContext {
  return {
    ratePair: null,
    buyBoxes: [],
    dueDiligence: [],
    todayISO: "2026-07-06",
    asOf: ASOF,
    ...overrides,
  };
}

function namedBox(overrides: Partial<NamedBuyBox> = {}): NamedBuyBox {
  return {
    ...EMPTY_BUY_BOX,
    id: "box-1",
    name: "My Buy Box",
    strategyKind: null,
    isDefault: true,
    sortOrder: 0,
    ...overrides,
  };
}

describe("buildWeeklySummary — skip rules", () => {
  it("returns null for users with no deals at all", () => {
    expect(buildWeeklySummary([], ctx())).toBeNull();
  });

  it("returns null when every deal is passed (nothing to say)", () => {
    const payload = buildWeeklySummary(
      [row({ pipeline_stage: "passed", is_archived: true })],
      ctx()
    );
    expect(payload).toBeNull();
  });
});

describe("buildWeeklySummary — active pipeline", () => {
  it("counts active deals and sums recomputed cash flow (dashboard pattern)", () => {
    const rows = [row({ id: "a" }), row({ id: "b", pipeline_stage: "offer" })];
    const payload = buildWeeklySummary(rows, ctx());
    expect(payload).not.toBeNull();
    expect(payload!.pipeline).not.toBeNull();
    expect(payload!.pipeline!.count).toBe(2);
    const fresh = recomputeSavedDealVerdict(baseDeal());
    expect(fresh).not.toBeNull();
    expect(payload!.pipeline!.monthlyCashFlow).toBe(
      Math.round(fresh!.netCashFlowMonthly * 2)
    );
  });

  it("falls back to the stored net_cash_flow_monthly when the snapshot is garbage", () => {
    const rows = [row({ form_snapshot: { junk: true }, net_cash_flow_monthly: 275 })];
    const payload = buildWeeklySummary(rows, ctx());
    expect(payload!.pipeline!.monthlyCashFlow).toBe(275);
  });

  it("excludes closed and passed deals from the pipeline", () => {
    const rows = [
      row({ id: "active" }),
      row({ id: "closed", pipeline_stage: "closed", is_completed: true }),
      row({ id: "passed", pipeline_stage: "passed", is_archived: true }),
    ];
    const payload = buildWeeklySummary(rows, ctx());
    expect(payload!.pipeline!.count).toBe(1);
  });

  it("derives the stage from legacy flags when pipeline_stage is null", () => {
    const rows = [row({ pipeline_stage: null, is_completed: true })];
    const payload = buildWeeklySummary(rows, ctx());
    expect(payload!.pipeline).toBeNull();
    expect(payload!.owned).not.toBeNull();
    expect(payload!.owned!.count).toBe(1);
  });
});

describe("buildWeeklySummary — owned portfolio", () => {
  it("computes equity via the shared owned-equity helpers for dated deals", () => {
    const closeDate = "2024-07-01";
    const ownedRow = row({
      id: "own-1",
      pipeline_stage: "closed",
      is_completed: true,
      close_date: closeDate,
    });
    const payload = buildWeeklySummary([ownedRow], ctx());
    expect(payload!.owned).not.toBeNull();
    expect(payload!.owned!.count).toBe(1);
    expect(payload!.owned!.datedCount).toBe(1);

    // Must equal the SAME numbers the dashboard derives from the shared lib.
    const basis = resolveOwnedEquityBasis({
      is_completed: true,
      close_date: closeDate,
      form_snapshot: baseDeal(),
    });
    const summary = computeOwnedEquity(basis!.input, monthsOwnedBetween(basis!.closeDate, ASOF));
    expect(payload!.owned!.totalEquity).toBe(Math.round(summary!.equity));
    expect(payload!.owned!.equityGain).toBe(Math.round(summary!.totalEquityGain));
  });

  it("counts undated owned deals but reports null equity", () => {
    const payload = buildWeeklySummary(
      [row({ pipeline_stage: "closed", is_completed: true, close_date: null })],
      ctx()
    );
    expect(payload!.owned!.count).toBe(1);
    expect(payload!.owned!.datedCount).toBe(0);
    expect(payload!.owned!.totalEquity).toBeNull();
    expect(payload!.owned!.equityGain).toBeNull();
  });
});

describe("buildWeeklySummary — rate mover", () => {
  it("is null without a FRED pair", () => {
    const payload = buildWeeklySummary([row()], ctx({ ratePair: null }));
    expect(payload!.rateMover).toBeNull();
  });

  it("surfaces the changed deal when THIS WEEK'S move is real and flips a verdict", () => {
    // Saved at 8.5%, market at 5.5% — the same flip rate-alerts tests use —
    // AND the week itself moved ≥ the rate-alerts weekly trigger (−0.25pp).
    const rows = [row({ form_snapshot: baseDeal({ interestRate: 8.5 }) })];
    const payload = buildWeeklySummary(
      rows,
      ctx({ ratePair: { current: 5.5, previous: 5.75 } })
    );
    expect(payload!.rateMover).not.toBeNull();
    expect(payload!.rateMover!.currentRatePct).toBe(5.5);
    expect(payload!.rateMover!.weeklyMovePp).toBeCloseTo(-0.25, 6);
    expect(payload!.rateMover!.monitoredCount).toBe(1);
    expect(payload!.rateMover!.changedCount).toBe(1);
    expect(payload!.rateMover!.topDeal).not.toBeNull();
    expect(payload!.rateMover!.topDeal!.label).toBe("N 5th St");
  });

  it("suppresses the mover on a quiet week even when a deal sits far off its saved rate", () => {
    // WEEK-FRAMED digest (verifier should-fix): the deal's saved-vs-current
    // gap alone must NOT headline every week — without this gate the same
    // "biggest mover" repeated identically each Friday. A −0.12pp week is
    // below the rate-alerts weekly trigger, so no mover story.
    const rows = [row({ form_snapshot: baseDeal({ interestRate: 8.5 }) })];
    const payload = buildWeeklySummary(
      rows,
      ctx({ ratePair: { current: 5.5, previous: 5.62 } })
    );
    expect(payload!.rateMover).not.toBeNull();
    expect(payload!.rateMover!.weeklyMovePp).toBeCloseTo(-0.12, 6);
    expect(payload!.rateMover!.changedCount).toBe(0);
    expect(payload!.rateMover!.topDeal).toBeNull();
  });

  it("keeps the section with a null topDeal when nothing changed", () => {
    // Saved at 7%, market at 7.05% — below the per-deal delta, no story.
    const payload = buildWeeklySummary(
      [row()],
      ctx({ ratePair: { current: 7.05, previous: 7.0 } })
    );
    expect(payload!.rateMover).not.toBeNull();
    expect(payload!.rateMover!.changedCount).toBe(0);
    expect(payload!.rateMover!.topDeal).toBeNull();
  });
});

describe("buildWeeklySummary — due this week", () => {
  const items = [
    { id: "inspection", label: "Inspection", done: false, dueDate: "2026-07-04" }, // overdue
    { id: "appraisal", label: "Appraisal", done: false, dueDate: "2026-07-09" }, // due soon
    { id: "title", label: "Title", done: true, dueDate: "2026-07-01" }, // done → excluded
    { id: "survey", label: "Survey", done: false, dueDate: "2026-09-01" }, // scheduled → excluded
  ];

  it("includes only overdue + due-soon items on ACTIVE deals, overdue first", () => {
    const rows = [row({ id: "a" })];
    const payload = buildWeeklySummary(
      rows,
      ctx({ dueDiligence: [{ analysisId: "a", items }] })
    );
    expect(payload!.dueItems).toHaveLength(2);
    expect(payload!.dueItems[0]).toMatchObject({
      dealId: "a",
      dealLabel: "N 5th St",
      itemLabel: "Inspection",
      status: "overdue",
    });
    expect(payload!.dueItems[1]).toMatchObject({ itemLabel: "Appraisal", status: "due-soon" });
  });

  it("ignores checklists on closed/passed deals", () => {
    const rows = [row({ id: "a", pipeline_stage: "closed", is_completed: true }), row({ id: "b" })];
    const payload = buildWeeklySummary(
      rows,
      ctx({ dueDiligence: [{ analysisId: "a", items }] })
    );
    expect(payload!.dueItems).toHaveLength(0);
  });

  it("caps the list at WEEKLY_SUMMARY_MAX_DUE_ITEMS", () => {
    const many = Array.from({ length: 12 }, (_, i) => ({
      id: `item-${i}`,
      label: `Item ${i}`,
      done: false,
      dueDate: "2026-07-05",
    }));
    const payload = buildWeeklySummary(
      [row({ id: "a" })],
      ctx({ dueDiligence: [{ analysisId: "a", items: many }] })
    );
    expect(payload!.dueItems).toHaveLength(WEEKLY_SUMMARY_MAX_DUE_ITEMS);
  });
});

describe("buildWeeklySummary — buy-box line", () => {
  it("is null when no boxes exist", () => {
    expect(buildWeeklySummary([row()], ctx())!.buyBox).toBeNull();
  });

  it("counts passing deals against active boxes with criteria", () => {
    const generous = namedBox({ id: "box-1", minCashFlowMonthly: -10_000 });
    const payload = buildWeeklySummary([row({ id: "a" }), row({ id: "b" })], ctx({ buyBoxes: [generous] }));
    expect(payload!.buyBox).toEqual({ passingCount: 2, evaluatedCount: 2, boxCount: 1 });
  });

  it("fails deals against an impossible box", () => {
    const impossible = namedBox({ id: "box-2", minCashFlowMonthly: 900_000 });
    const payload = buildWeeklySummary([row()], ctx({ buyBoxes: [impossible] }));
    expect(payload!.buyBox).toEqual({ passingCount: 0, evaluatedCount: 1, boxCount: 1 });
  });

  it("ignores inactive boxes and boxes without criteria", () => {
    const inactive = namedBox({ id: "box-3", minCashFlowMonthly: -10_000, isActive: false });
    const empty = namedBox({ id: "box-4" }); // no criteria at all
    const payload = buildWeeklySummary([row()], ctx({ buyBoxes: [inactive, empty] }));
    expect(payload!.buyBox).toBeNull();
  });
});

describe("weeklySummarySubject", () => {
  it("leads with the pipeline when present", () => {
    const payload = buildWeeklySummary([row()], ctx())!;
    const fresh = recomputeSavedDealVerdict(baseDeal())!;
    expect(weeklySummarySubject(payload)).toBe(
      `Your week in deals — 1 active deal, ${fresh.netCashFlowMonthly < 0 ? "-" : ""}$${Math.abs(
        Math.round(fresh.netCashFlowMonthly)
      ).toLocaleString("en-US")}/mo pipeline`
    );
  });

  it("falls back to the owned line when there's no pipeline", () => {
    const payload = buildWeeklySummary(
      [row({ pipeline_stage: "closed", is_completed: true })],
      ctx()
    )!;
    expect(weeklySummarySubject(payload)).toBe("Your week in deals — 1 owned property");
  });
});

describe("isoWeekKey", () => {
  it("computes ISO-8601 week numbers (UTC)", () => {
    // 2026-07-06 is the Monday of ISO week 28 (W01 Monday = 2025-12-29).
    expect(isoWeekKey(new Date("2026-07-06T00:00:00Z"))).toBe("2026-W28");
    expect(isoWeekKey(new Date("2026-07-12T23:59:59Z"))).toBe("2026-W28");
    expect(isoWeekKey(new Date("2026-07-13T00:00:00Z"))).toBe("2026-W29");
    // 2026 has 53 ISO weeks (Jan 1 is a Thursday) — year-boundary cases.
    expect(isoWeekKey(new Date("2026-01-01T00:00:00Z"))).toBe("2026-W01");
    expect(isoWeekKey(new Date("2026-12-31T00:00:00Z"))).toBe("2026-W53");
    expect(isoWeekKey(new Date("2027-01-01T00:00:00Z"))).toBe("2026-W53");
    expect(isoWeekKey(new Date("2027-01-04T00:00:00Z"))).toBe("2027-W01");
  });
});

describe("normalizeWeeklyBuyBoxRow", () => {
  it("maps a user_buy_boxes row (numeric strings included) to a NamedBuyBox", () => {
    const box = normalizeWeeklyBuyBoxRow({
      id: "b1",
      name: "Philly",
      strategy_kind: "brrrr",
      min_cap_rate_pct: "6.5",
      min_coc_pct: null,
      min_dscr: 1.25,
      min_cash_flow_monthly: "150",
      max_purchase_price: null,
      property_types: ["single-family", "bogus"],
      target_states: ["pa", "NJ"],
      is_active: true,
      is_default: true,
      sort_order: 2,
    });
    expect(box).toMatchObject({
      id: "b1",
      name: "Philly",
      minCapRatePct: 6.5,
      minDscr: 1.25,
      minCashFlowMonthly: 150,
      propertyTypes: ["single-family"],
      targetStates: ["PA", "NJ"],
      isActive: true,
      isDefault: true,
      sortOrder: 2,
    });
  });

  it("returns null for junk rows", () => {
    expect(normalizeWeeklyBuyBoxRow(null)).toBeNull();
    expect(normalizeWeeklyBuyBoxRow({ name: "no id" })).toBeNull();
  });
});
