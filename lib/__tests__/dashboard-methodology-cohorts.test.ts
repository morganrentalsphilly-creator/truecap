import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  resolveDealMethodologyPresentation,
  sortDealsWithinMethodologyCohorts,
} from "../dashboard-deal-mapping";

describe("saved-deal methodology cohorts", () => {
  it("labels a frozen v1.0 snapshot without relabeling its metrics as current", () => {
    expect(
      resolveDealMethodologyPresentation({
        storedMethodologyVersion: "1.0",
        usesRecordedSnapshot: true,
        didRecompute: false,
        currentMethodologyVersion: "1.1",
      }),
    ).toEqual({
      comparisonKey: "recorded:1.0",
      groupLabel: "Recorded v1.0",
      badgeLabel: "Recorded v1.0",
      isCurrent: false,
    });
  });

  it("puts an unversioned compatibility recompute in the current cohort", () => {
    expect(
      resolveDealMethodologyPresentation({
        storedMethodologyVersion: null,
        usesRecordedSnapshot: false,
        didRecompute: true,
        currentMethodologyVersion: "1.1",
      }),
    ).toEqual({
      comparisonKey: "current:1.1",
      groupLabel: "Current v1.1",
      badgeLabel: "Legacy analysis · recomputed with current v1.1",
      isCurrent: true,
    });
  });

  it("keeps an immutable snapshot separate from live recomputation even at the same version", () => {
    expect(
      resolveDealMethodologyPresentation({
        storedMethodologyVersion: "1.1",
        usesRecordedSnapshot: true,
        didRecompute: false,
        currentMethodologyVersion: "1.1",
      }),
    ).toEqual({
      comparisonKey: "recorded:1.1",
      groupLabel: "Recorded v1.1",
      // Every ordinary saved deal lands here, so a per-row badge repeated
      // identically down the list and said nothing — suppressed 2026-09-01.
      // The comparisonKey/groupLabel above still keep the cohort separate;
      // the STALE cohorts below must keep their visible badges.
      badgeLabel: null,
      isCurrent: true,
    });
  });

  it("keeps each unversioned stored fallback out of every comparable cohort", () => {
    expect(
      resolveDealMethodologyPresentation({
        storedMethodologyVersion: null,
        usesRecordedSnapshot: true,
        didRecompute: false,
        currentMethodologyVersion: "1.1",
        recordId: "legacy-a",
      }),
    ).toEqual({
      comparisonKey: "unavailable:legacy-unversioned:legacy-a",
      groupLabel: "Recorded legacy · re-underwrite to compare",
      badgeLabel: "Recorded legacy · re-underwrite",
      isCurrent: false,
    });
    expect(
      resolveDealMethodologyPresentation({
        storedMethodologyVersion: null,
        usesRecordedSnapshot: true,
        didRecompute: false,
        currentMethodologyVersion: "1.1",
        recordId: "legacy-b",
      }).comparisonKey,
    ).not.toBe("unavailable:legacy-unversioned:legacy-a");
  });

  it("never compares a recorded v1.0 cash flow directly with a current v1.1 value", () => {
    const deals = [
      {
        id: "2031-s-colorado",
        createdAt: "2026-08-25T00:00:00.000Z",
        methodologyComparisonKey: "recorded:1.0",
        methodologyGroupLabel: "Recorded v1.0",
        methodologyIsCurrent: false,
        cashFlow: -203,
      },
      {
        id: "2136-e-tucker",
        createdAt: "2026-08-24T00:00:00.000Z",
        methodologyComparisonKey: "current:1.1",
        methodologyGroupLabel: "Current v1.1",
        methodologyIsCurrent: true,
        cashFlow: -133,
      },
      {
        id: "other-recorded-v1",
        createdAt: "2026-08-23T00:00:00.000Z",
        methodologyComparisonKey: "recorded:1.0",
        methodologyGroupLabel: "Recorded v1.0",
        methodologyIsCurrent: false,
        cashFlow: -400,
      },
    ];

    const sorted = sortDealsWithinMethodologyCohorts(
      deals,
      (deal) => deal.cashFlow,
      "desc",
    );

    // The current cohort leads, and the two recorded rows are ranked only
    // against one another. No comparator treats -203 and -133 as equivalent
    // outputs from one formula version.
    expect(sorted.map((deal) => deal.id)).toEqual([
      "2136-e-tucker",
      "2031-s-colorado",
      "other-recorded-v1",
    ]);
  });

  it("keeps missing metrics last inside each cohort in either direction", () => {
    const deals = [
      {
        id: "missing",
        createdAt: "2026-08-25T00:00:00.000Z",
        methodologyComparisonKey: "current:1.1",
        methodologyIsCurrent: true,
        value: null,
      },
      {
        id: "known",
        createdAt: "2026-08-24T00:00:00.000Z",
        methodologyComparisonKey: "current:1.1",
        methodologyIsCurrent: true,
        value: -100,
      },
    ];

    expect(
      sortDealsWithinMethodologyCohorts(deals, (deal) => deal.value, "asc").map(
        (deal) => deal.id,
      ),
    ).toEqual(["known", "missing"]);
    expect(
      sortDealsWithinMethodologyCohorts(
        deals,
        (deal) => deal.value,
        "desc",
      ).map((deal) => deal.id),
    ).toEqual(["known", "missing"]);
  });
});

describe("My Deals methodology truth wiring", () => {
  const pageSource = readFileSync(
    join(process.cwd(), "app/dashboard/saved-analyses/page.tsx"),
    "utf8",
  );
  const listSource = readFileSync(
    join(process.cwd(), "components/investcalc/saved-analyses-page-v2.tsx"),
    "utf8",
  );
  const dashboardPageSource = readFileSync(
    join(process.cwd(), "app/dashboard/page.tsx"),
    "utf8",
  );
  const dashboardHomeSource = readFileSync(
    join(process.cwd(), "components/dashboard/DashboardHome.tsx"),
    "utf8",
  );
  const dashboardTableSource = readFileSync(
    join(process.cwd(), "components/dashboard/your-deals-table.tsx"),
    "utf8",
  );
  const screeningRecordSource = readFileSync(
    join(process.cwd(), "components/dashboard/screening-record.tsx"),
    "utf8",
  );

  it("does not blend formula-dependent portfolio rollups across versions", () => {
    expect(pageSource).toContain(
      "items={hasMixedMetricMethodologies ? [] : mappedItems}",
    );
    expect(pageSource).toContain(
      "Recorded and current results are kept separate",
    );
    expect(pageSource).toContain(
      "Portfolio totals are withheld because this view contains",
    );
  });

  it("shows compact methodology pills beside signals and removes the old footnote", () => {
    expect(listSource).toContain(
      'className="rounded-full text-[10px] font-semibold text-muted-foreground"',
    );
    expect(listSource).not.toContain(
      '<p className="mt-1 text-[10px] text-muted-foreground">\n                          {item.methodologyLabel}',
    );
    expect(listSource).toMatch(
      /Current and recorded\s+calculations are never ranked against each other/,
    );
  });

  it("fails closed instead of screening recorded metrics with a live Buy Box", () => {
    expect(listSource).toContain(
      "if (item.methodologyIsCurrent === false) continue;",
    );
  });

  it("withholds dashboard aggregates and winners for a mixed-methodology book", () => {
    expect(dashboardPageSource).toContain(
      "hasMixedActiveMethodologies = methodologyCohorts.size > 1",
    );
    expect(dashboardPageSource).toContain(
      '? "mixed-methodology"',
    );
    expect(dashboardHomeSource).toContain(
      'portfolioAggregateStatus?: "ready" | "unavailable" | "mixed-methodology"',
    );
    expect(dashboardHomeSource).toContain(
      "TrueCap will not blend or crown winners across different model",
    );
  });

  it("withholds only the owned cash-flow total when completed rows cannot share one cohort", () => {
    expect(dashboardPageSource).toContain(
      "const ownedCashFlowCohorts = new Set<string>()",
    );
    expect(dashboardPageSource).toContain(
      "ownedCashFlowComplete && ownedCashFlowCohorts.size === 1",
    );
    expect(dashboardPageSource).toContain(
      'typeof frozenCashFlowRaw === "number"',
    );
    expect(dashboardPageSource).toContain(
      'typeof frozenCashFlowRaw === "string"',
    );
    expect(dashboardPageSource).not.toContain(
      "Number(resolution.snapshot.netCashFlow)",
    );
    expect(dashboardPageSource).toContain("monthlyCashFlow:");
    expect(dashboardHomeSource).toContain("monthlyCashFlow: number | null");
    expect(dashboardHomeSource).toContain(
      "Different calculation records; re-underwrite to combine.",
    );
  });

  it("cohorts client-side dashboard sorts and excludes recorded ceilings from screening ratios", () => {
    expect(dashboardTableSource).toContain(
      "sortDealsWithinMethodologyCohorts(",
    );
    expect(dashboardTableSource).toContain(
      "Sorted only within this model version",
    );
    expect(screeningRecordSource).toContain(
      "deal.methodologyIsCurrent !== false",
    );
    expect(screeningRecordSource).toContain(
      "excluded until explicitly re-underwritten with the current model",
    );
  });

  it("keeps exact Offer Ceiling criteria accessible without repeating prose in every resting row", () => {
    // Desktop rows fold the criteria behind the shared ⓘ popover
    // (OfferCriteriaNote) instead of the former per-row <details> summary,
    // which repeated an identical 44px "View exact criteria" line on every
    // deal. Same intent, one line per row.
    const noteSource = readFileSync(
      join(process.cwd(), "components/investcalc/offer-criteria-note.tsx"),
      "utf8",
    );
    expect(listSource).toContain("<OfferCriteriaNote");
    expect(dashboardTableSource).toContain("<OfferCriteriaNote");
    expect(noteSource).toContain("How this Offer Ceiling is computed");
    expect(noteSource).toContain("Criteria: {basisLabel");
    // The note also renders on the My Deals MOBILE card (via OfferLineRow),
    // so its trigger must honor the repo's 44px touch-target contract —
    // size-11 hit area, negative margin keeps the 24px layout footprint.
    expect(noteSource).toContain("-m-2.5 inline-flex size-11");
    // The dashboard-home MOBILE card keeps its tap-sized disclosure.
    expect(dashboardTableSource).toContain("<details");
    expect(dashboardTableSource).toContain(
      "View exact Offer Ceiling criteria",
    );
  });
});
