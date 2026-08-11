import { describe, expect, it } from "vitest";
import {
  buildDataConfidence,
  computeConfidenceLevel,
  confidenceLabel,
  describeConfidenceGap,
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

describe("describeConfidenceGap", () => {
  const conf = (
    level: "high" | "medium" | "low",
    fields: Parameters<typeof describeConfidenceGap>[0]["fields"]
  ) => ({ level, fields, computedAt: "2026-08-10T00:00:00.000Z" });

  const rentSrc = { source: "hud-fmr" as const, verified: false };
  const rateSrc = { source: "fred" as const, verified: false };

  it("says nothing at High — there is no next step", () => {
    expect(describeConfidenceGap(conf("high", { monthlyRent: rentSrc, interestRate: rateSrc }))).toBeNull();
  });

  it("no sourced fields at all → points at address autocomplete for BOTH feeds", () => {
    const gap = describeConfidenceGap(conf("medium", {}));
    expect(gap).toMatch(/HUD market rent and FRED/i);
  });

  it("names the ONE missing feed rather than both", () => {
    expect(describeConfidenceGap(conf("medium", { interestRate: rateSrc }))).toMatch(/HUD market rent/i);
    expect(describeConfidenceGap(conf("medium", { interestRate: rateSrc }))).not.toMatch(/FRED/i);

    expect(describeConfidenceGap(conf("medium", { monthlyRent: rentSrc }))).toMatch(/FRED mortgage rate/i);
    expect(describeConfidenceGap(conf("medium", { monthlyRent: rentSrc }))).not.toMatch(/HUD/i);
  });

  it("both feeds sourced but still not High ⇒ a completeness gap, so it asks for rent/price", () => {
    // computeConfidenceLevel returns "high" whenever BOTH carry provenance, so
    // this state is only reachable via the completeness check failing.
    const gap = describeConfidenceGap(conf("low", { monthlyRent: rentSrc, interestRate: rateSrc }));
    expect(gap).toMatch(/monthly rent and a purchase price/i);
  });

  it("never contradicts computeConfidenceLevel: advice appears iff the level is not High", () => {
    const cases: { fields: Parameters<typeof describeConfidenceGap>[0]["fields"] }[] = [
      { fields: {} },
      { fields: { monthlyRent: rentSrc } },
      { fields: { interestRate: rateSrc } },
      { fields: { monthlyRent: rentSrc, interestRate: rateSrc } },
    ];
    for (const { fields } of cases) {
      const level = computeConfidenceLevel(fields, complete);
      const gap = describeConfidenceGap(conf(level, fields));
      expect(gap == null).toBe(level === "high");
    }
  });
});

describe("describeConfidenceGap — never advises the impossible (audit regression)", () => {
  const conf = (
    level: "high" | "medium" | "low",
    fields: Parameters<typeof describeConfidenceGap>[0]["fields"]
  ) => ({ level, fields, computedAt: "2026-08-10T00:00:00.000Z" });
  const rateSrc = { source: "fred" as const, verified: false };

  // HUD rent auto-fill runs only on the single-family branch, so a multi-unit
  // deal can NEVER obtain rent provenance. Telling those users to re-pick their
  // address is advice that cannot work — on every deal, forever.
  for (const propertyType of ["multi-family", "owner-occupant"]) {
    it(`${propertyType}: never tells the user to pull HUD rent`, () => {
      const gap = describeConfidenceGap(conf("medium", {}), { propertyType });
      expect(gap).not.toMatch(/HUD/i);
      expect(gap).toMatch(/FRED/i); // the rate IS still attainable
    });

    it(`${propertyType}: stays silent when only the unobtainable rent is missing`, () => {
      expect(describeConfidenceGap(conf("medium", { interestRate: rateSrc }), { propertyType })).toBeNull();
    });
  }

  it("single-family still gets the full rent advice", () => {
    const gap = describeConfidenceGap(conf("medium", { interestRate: rateSrc }), {
      propertyType: "single-family",
    });
    expect(gap).toMatch(/HUD market rent/i);
  });
});
