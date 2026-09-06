import { describe, expect, it } from "vitest";
import {
  evaluatePublishEligibility,
  formatUsageCount,
  isNearDuplicate,
  quoteSimilarity,
  validateQuote,
} from "@/lib/testimonials/rules";

const GOOD = "TrueCap made me stop guessing at rent and start checking the number before I offered.";

describe("validateQuote", () => {
  it("accepts a plain 40–280 character sentence and normalizes whitespace", () => {
    const result = validateQuote(`  ${GOOD.replace("stop", "stop\n\n")}  `);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.quote).not.toMatch(/\s{2,}/);
  });
  it("rejects too short / too long", () => {
    expect(validateQuote("Great tool.")).toEqual({ ok: false, reason: "too_short" });
    expect(validateQuote("x".repeat(281))).toEqual({ ok: false, reason: "too_long" });
  });
  it("rejects URLs, emails, and phone numbers", () => {
    expect(validateQuote(`${GOOD} See https://example.com`)).toEqual({ ok: false, reason: "contains_url" });
    expect(validateQuote(`${GOOD} Visit example.com today`)).toEqual({ ok: false, reason: "contains_url" });
    expect(validateQuote(`${GOOD} Email me at bob@example.com`)).toEqual({ ok: false, reason: "contains_email" });
    expect(validateQuote(`${GOOD} Call 215-555-0134 anytime`)).toEqual({ ok: false, reason: "contains_phone" });
  });
  it("rejects obvious profanity", () => {
    expect(validateQuote(`${GOOD} It is fucking great.`)).toEqual({ ok: false, reason: "profanity" });
  });
});

describe("near-duplicate detection", () => {
  it("flags a near-identical quote and passes a different one", () => {
    expect(quoteSimilarity(GOOD, GOOD)).toBe(1);
    expect(isNearDuplicate(`${GOOD} Really.`, [GOOD])).toBe(true);
    expect(isNearDuplicate("The Offer Ceiling stopped me from overpaying on a duplex in Kensington.", [GOOD])).toBe(false);
  });
});

describe("evaluatePublishEligibility (all rules must hold)", () => {
  const now = new Date("2026-09-08T12:00:00Z");
  const base = {
    quote: GOOD,
    consent: true,
    publishAfter: "2026-09-07T12:00:00Z",
    isDemoAccount: false,
    savedDealCount: 3,
    exportedReportCount: 0,
    existingPublishedQuotes: [] as string[],
  };
  it("publishes when every rule holds", () => {
    expect(evaluatePublishEligibility(base, now)).toEqual({ publish: true });
  });
  it("accepts one exported report in place of three saved deals", () => {
    expect(evaluatePublishEligibility({ ...base, savedDealCount: 0, exportedReportCount: 1 }, now)).toEqual({ publish: true });
  });
  it.each([
    [{ consent: false }, "no_consent"],
    [{ isDemoAccount: true }, "demo_account"],
    [{ savedDealCount: 2, exportedReportCount: 0 }, "not_enough_activity"],
    [{ quote: "Too short." }, "too_short"],
    [{ quote: `${GOOD} https://x.co` }, "contains_url"],
    [{ existingPublishedQuotes: [GOOD] }, "near_duplicate"],
    [{ publishAfter: "2026-09-09T00:00:00Z" }, "delay_not_elapsed"],
  ] as const)("skips %j with %s", (override, reason) => {
    expect(evaluatePublishEligibility({ ...base, ...override }, now)).toEqual({ publish: false, reason });
  });
});

describe("formatUsageCount", () => {
  it("hides below 100, exact to 999, rounds DOWN to the hundred above 1,000", () => {
    expect(formatUsageCount(null)).toBeNull();
    expect(formatUsageCount(99)).toBeNull();
    expect(formatUsageCount(100)).toBe("100");
    expect(formatUsageCount(999)).toBe("999");
    expect(formatUsageCount(1000)).toBe("1,000+");
    expect(formatUsageCount(1299)).toBe("1,200+");
    expect(formatUsageCount(12345)).toBe("12,300+");
  });
});
