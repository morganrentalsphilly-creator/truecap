import { describe, expect, it } from "vitest";
import {
  buildDataConfidence,
  computeConfidenceLevel,
  confidenceLabel,
  normalizeDataConfidence,
  type EnrichmentProvenanceInput,
} from "@/lib/data-confidence";

const complete = { hasRent: true, hasPrice: true, hasBeds: true };

describe("computeConfidenceLevel", () => {
  it("is low when a key input is missing", () => {
    expect(computeConfidenceLevel({}, { hasRent: false, hasPrice: true })).toBe("low");
    expect(computeConfidenceLevel({}, { hasRent: true, hasPrice: false })).toBe("low");
  });

  it("is medium when complete but rent/rate aren't tracked", () => {
    expect(computeConfidenceLevel({}, complete)).toBe("medium");
    expect(
      computeConfidenceLevel({ propertyTaxPct: { source: "state-static", verified: false } }, complete)
    ).toBe("medium");
  });

  it("is high when rent and rate are both tracked (live-sourced or verified)", () => {
    expect(
      computeConfidenceLevel(
        {
          monthlyRent: { source: "hud-safmr", verified: false },
          interestRate: { source: "fred", verified: false },
        },
        complete
      )
    ).toBe("high");
  });
});

describe("buildDataConfidence", () => {
  const now = new Date("2026-06-21T12:00:00Z");

  it("records live sources and reaches High", () => {
    const input: EnrichmentProvenanceInput = {
      monthlyRent: { source: "hud-safmr", fetchedAt: "2026", detail: "Philadelphia County" },
      interestRate: { source: "fred", fetchedAt: "2026-06-19" },
      propertyTaxPct: { source: "state-static" },
    };
    const dc = buildDataConfidence(input, complete, now);
    expect(dc.level).toBe("high");
    expect(dc.fields.monthlyRent).toEqual({
      source: "hud-safmr",
      fetchedAt: "2026",
      verified: false,
      detail: "Philadelphia County",
    });
    expect(dc.fields.interestRate?.source).toBe("fred");
    expect(dc.computedAt).toBe("2026-06-21T12:00:00.000Z");
  });

  it("marks overridden fields as verified manual entries", () => {
    const input: EnrichmentProvenanceInput = {
      monthlyRent: { source: "hud-safmr", overridden: true },
      interestRate: { source: "fred" },
    };
    const dc = buildDataConfidence(input, complete, now);
    expect(dc.fields.monthlyRent).toMatchObject({ source: "manual", verified: true });
    // Still High: an overridden field is "verified", which counts as trusted.
    expect(dc.level).toBe("high");
  });

  it("is medium for a fully-manual complete deal (no enrichment tracked)", () => {
    const dc = buildDataConfidence(null, complete, now);
    expect(dc.fields).toEqual({});
    expect(dc.level).toBe("medium");
  });

  it("is low when rent is missing even if sourced fields exist", () => {
    const dc = buildDataConfidence(
      { interestRate: { source: "fred" } },
      { hasRent: false, hasPrice: true },
      now
    );
    expect(dc.level).toBe("low");
  });
});

describe("normalizeDataConfidence", () => {
  it("round-trips a built object", () => {
    const dc = buildDataConfidence({ monthlyRent: { source: "hud-fmr" }, interestRate: { source: "fred" } }, complete);
    const parsed = normalizeDataConfidence(JSON.parse(JSON.stringify(dc)));
    expect(parsed?.level).toBe("high");
    expect(parsed?.fields.monthlyRent?.source).toBe("hud-fmr");
  });

  it("rejects garbage", () => {
    expect(normalizeDataConfidence(null)).toBeNull();
    expect(normalizeDataConfidence({})).toBeNull();
    expect(normalizeDataConfidence({ level: "bogus" })).toBeNull();
    expect(normalizeDataConfidence("nope")).toBeNull();
  });

  it("drops unknown field sources but keeps valid ones", () => {
    const parsed = normalizeDataConfidence({
      level: "medium",
      fields: {
        monthlyRent: { source: "alien", verified: true },
        interestRate: { source: "fred", verified: false },
      },
      computedAt: "2026-06-21T00:00:00.000Z",
    });
    expect(parsed?.fields.monthlyRent).toBeUndefined();
    expect(parsed?.fields.interestRate?.source).toBe("fred");
  });
});

describe("confidenceLabel", () => {
  it("maps levels to labels", () => {
    expect(confidenceLabel("high")).toBe("High");
    expect(confidenceLabel("medium")).toBe("Medium");
    expect(confidenceLabel("low")).toBe("Low");
  });
});
