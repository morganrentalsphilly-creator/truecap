import { describe, expect, it } from "vitest";

import {
  aggregateInvestorIndex,
  type InvestorIndexObservation,
  toInvestorIndexQuarter,
} from "@/lib/investor-index";

function observation(
  index: number,
  overrides: Partial<InvestorIndexObservation> = {}
): InvestorIndexObservation {
  return {
    privacyRecordKey: `record-${index}`,
    privacyContributorKey: `contributor-${index % 15}`,
    aggregateEligibility: "approved",
    analyzedAt: "2026-05-15T12:34:56.000Z",
    geography: { level: "state", countryCode: "US", regionCode: "PA" },
    metrics: {
      underwritingMethodVersion: "1.0",
      standardScreen: index % 3 === 0 ? "fail" : "pass",
      standardScreenDefinitionVersion: "dscr-screen-v1",
      capRatePct: index + 1,
      cashOnCashReturnPct: index + 2,
      monthlyCashFlow: index * 100,
      askingPrice: 300_000 + index * 1_000,
      maxOffer: 270_000 + index * 1_000,
      maxOfferDefinitionVersion: "buy-box-targets-v1",
      limitingAssumption: index < 18 ? "purchase-price" : "rent",
      limitingAssumptionDefinitionVersion: "thresholds-v1",
      inputConfidence: { score: 60 + (index % 10), methodVersion: "1.0" },
    },
    ...overrides,
  };
}

function cohort(size: number, offset = 0): InvestorIndexObservation[] {
  return Array.from({ length: size }, (_, index) => observation(index + offset));
}

describe("toInvestorIndexQuarter", () => {
  it("uses UTC calendar quarters and rejects invalid dates", () => {
    expect(toInvestorIndexQuarter("2026-03-31T23:59:59.999Z")?.key).toBe("2026-Q1");
    expect(toInvestorIndexQuarter("2026-04-01T00:00:00.000Z")?.key).toBe("2026-Q2");
    expect(toInvestorIndexQuarter("not-a-date")).toBeNull();
  });
});

describe("aggregateInvestorIndex", () => {
  it("omits small or contributor-concentrated cohorts entirely", () => {
    expect(aggregateInvestorIndex(cohort(24)).cohorts).toEqual([]);

    const concentrated = cohort(30).map((row) => ({
      ...row,
      privacyContributorKey: "one-contributor",
    }));
    expect(aggregateInvestorIndex(concentrated).cohorts).toEqual([]);
  });

  it("defaults to deny and ignores unapproved records", () => {
    const rows = cohort(30).map((row, index) => ({
      ...row,
      aggregateEligibility: index < 24 ? ("approved" as const) : ("not-approved" as const),
    }));
    expect(aggregateInvestorIndex(rows).cohorts).toEqual([]);
  });

  it("publishes only coarse buckets and never copies PII or privacy keys", () => {
    const rows = cohort(30).map((row, index) => ({
      ...row,
      privacyRecordKey: `secret-record-${index}`,
      privacyContributorKey: `secret-user-${index % 15}`,
      // Simulate a provider accidentally passing a wider database object.
      address: `${index} Private Address`,
      userId: `raw-user-${index}`,
      latitude: 39.95,
      longitude: -75.16,
    })) as InvestorIndexObservation[];

    const release = aggregateInvestorIndex(rows);
    const serialized = JSON.stringify(release);
    expect(release.cohorts).toHaveLength(1);
    expect(release.cohorts[0].period.key).toBe("2026-Q2");
    expect(release.cohorts[0].geography).toEqual({
      level: "state",
      countryCode: "US",
      regionCode: "PA",
    });
    expect(release.cohorts[0].analysisVolume.label).toBe("25–49");
    expect(serialized).not.toContain("Private Address");
    expect(serialized).not.toContain("secret-record");
    expect(serialized).not.toContain("secret-user");
    expect(serialized).not.toContain("raw-user");
    expect(serialized).not.toContain("39.95");
  });

  it("rejects precise or untrusted geography shapes at runtime", () => {
    const zipRows = cohort(30).map((row) => ({
      ...row,
      geography: {
        level: "zip",
        countryCode: "US",
        postalCode: "19103",
      },
    })) as unknown as InvestorIndexObservation[];
    const addressInLabel = cohort(30, 100).map((row) => ({
      ...row,
      geography: {
        level: "metro",
        countryCode: "US",
        marketCode: "123 Main Street",
      },
    })) as unknown as InvestorIndexObservation[];

    expect(aggregateInvestorIndex([...zipRows, ...addressInLabel]).cohorts).toEqual([]);
  });

  it("calculates versioned, rounded aggregate metrics without exact sample counts", () => {
    const result = aggregateInvestorIndex(cohort(30));
    const aggregate = result.cohorts[0];

    expect(aggregate.analysisVolume).toEqual({
      label: "25–49",
      lowerBound: 25,
      upperBound: 49,
    });
    expect(aggregate.passRatePct).toMatchObject({
      status: "published",
      value: 65,
      definitionVersion: "dscr-screen-v1",
    });
    expect(aggregate.medianCapRatePct).toMatchObject({
      status: "published",
      value: 15.5,
      definitionVersion: "1.0",
    });
    expect(aggregate.medianCashOnCashReturnPct).toMatchObject({
      status: "published",
      value: 16.5,
    });
    expect(aggregate.medianMonthlyCashFlow).toMatchObject({
      status: "published",
      value: 1_450,
    });
    expect(aggregate.askingVsMaxOfferGap).toMatchObject({
      status: "published",
      value: {
        medianGapDollars: 30_000,
        medianGapPctOfAsking: 9.5,
      },
      definitionVersion: "1.0:buy-box-targets-v1",
    });
    expect(aggregate.mostLimitingAssumption).toMatchObject({
      status: "published",
      value: { assumption: "purchase-price", sharePct: 60 },
      definitionVersion: "thresholds-v1",
    });
  });

  it("suppresses a metric whose eligible subset is too small", () => {
    const rows = cohort(30).map((row, index) => ({
      ...row,
      metrics: {
        ...row.metrics,
        maxOffer: index < 24 ? row.metrics.maxOffer : null,
      },
    }));
    const aggregate = aggregateInvestorIndex(rows).cohorts[0];
    expect(aggregate.askingVsMaxOfferGap).toEqual({
      status: "suppressed",
      reason: "insufficient-data",
    });
    expect(aggregate.medianCapRatePct.status).toBe("published");
  });

  it("suppresses rather than blending incompatible definition versions", () => {
    const rows = cohort(30).map((row, index) => ({
      ...row,
      metrics: {
        ...row.metrics,
        underwritingMethodVersion: index < 15 ? "1.0" : "2.0",
      },
    }));
    const aggregate = aggregateInvestorIndex(rows).cohorts[0];
    expect(aggregate.medianCapRatePct).toEqual({
      status: "suppressed",
      reason: "mixed-definition-versions",
    });
    expect(aggregate.askingVsMaxOfferGap).toEqual({
      status: "suppressed",
      reason: "mixed-definition-versions",
    });
  });

  it("publishes Input Confidence trend only with safe, comparable prior data", () => {
    const prior = cohort(30).map((row, index) => ({
      ...row,
      privacyRecordKey: `prior-${index}`,
      analyzedAt: "2026-02-10T00:00:00.000Z",
      metrics: {
        ...row.metrics,
        inputConfidence: { score: 50 + (index % 10), methodVersion: "1.0" },
      },
    }));
    const current = cohort(30, 100).map((row, index) => ({
      ...row,
      privacyRecordKey: `current-${index}`,
      analyzedAt: "2026-05-10T00:00:00.000Z",
      metrics: {
        ...row.metrics,
        inputConfidence: { score: 60 + (index % 10), methodVersion: "1.0" },
      },
    }));
    const aggregates = aggregateInvestorIndex([...current, ...prior]).cohorts;
    const q1 = aggregates.find((item) => item.period.key === "2026-Q1");
    const q2 = aggregates.find((item) => item.period.key === "2026-Q2");

    expect(q1?.inputConfidenceTrend).toEqual({
      status: "suppressed",
      reason: "no-comparable-prior-period",
    });
    expect(q2?.inputConfidenceTrend).toMatchObject({
      status: "published",
      value: {
        currentMedianScore: 65,
        previousMedianScore: 55,
        changePoints: 10,
        direction: "up",
        comparedWithPeriod: "2026-Q1",
      },
      definitionVersion: "1.0",
    });
  });

  it("suppresses Input Confidence trend when snapshots are missing or incompatible", () => {
    const prior = cohort(30).map((row, index) => ({
      ...row,
      privacyRecordKey: `prior-missing-${index}`,
      analyzedAt: "2026-02-10T00:00:00.000Z",
      metrics: {
        ...row.metrics,
        inputConfidence:
          index < 24 ? { score: 50 + (index % 10), methodVersion: "1.0" } : null,
      },
    }));
    const current = cohort(30, 100).map((row, index) => ({
      ...row,
      privacyRecordKey: `current-missing-${index}`,
      analyzedAt: "2026-05-10T00:00:00.000Z",
    }));
    const q2 = aggregateInvestorIndex([...prior, ...current]).cohorts.find(
      (item) => item.period.key === "2026-Q2"
    );
    expect(q2?.inputConfidenceTrend).toEqual({
      status: "suppressed",
      reason: "insufficient-data",
    });

    const incompatiblePrior = prior.map((row) => ({
      ...row,
      metrics: {
        ...row.metrics,
        inputConfidence: { score: 50, methodVersion: "0.9" },
      },
    }));
    const incompatibleQ2 = aggregateInvestorIndex([...incompatiblePrior, ...current]).cohorts.find(
      (item) => item.period.key === "2026-Q2"
    );
    expect(incompatibleQ2?.inputConfidenceTrend).toEqual({
      status: "suppressed",
      reason: "mixed-definition-versions",
    });
  });

  it("deduplicates provider retries and is deterministic across input order", () => {
    const rows = cohort(55);
    const duplicates = rows.slice(0, 10).map((row) => ({ ...row }));
    const forward = aggregateInvestorIndex([...rows, ...duplicates]);
    const reversed = aggregateInvestorIndex([...rows, ...duplicates].reverse());

    expect(forward).toEqual(reversed);
    // Five-record contributor caps leave 55 observations publishable, but a
    // retry of the same privacyRecordKey never increases the band or metrics.
    expect(forward.cohorts[0].analysisVolume.label).toBe("50–99");
  });

  it("uses a deterministic limiter tie break from the closed taxonomy", () => {
    const rows = cohort(30).map((row, index) => ({
      ...row,
      metrics: {
        ...row.metrics,
        limitingAssumption: index % 2 === 0 ? ("rent" as const) : ("purchase-price" as const),
      },
    }));
    const metric = aggregateInvestorIndex(rows).cohorts[0].mostLimitingAssumption;
    expect(metric).toMatchObject({
      status: "published",
      value: { assumption: "purchase-price", sharePct: 50 },
    });
  });
});
