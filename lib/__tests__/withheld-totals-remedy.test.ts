import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * When My Deals contains more than one underwriting standard, the portfolio
 * rollup is fed an empty array — deliberately. Blending formula-dependent
 * metrics across standards would imply precision those rows do not share, so
 * the aggregate fails closed.
 *
 * The NOTICE, though, was a dead end. It said totals were withheld and why,
 * and stopped: no count of affected deals, no remedy, no way to find them. On
 * a real account with 11 deals the dashboard's headline number simply vanished
 * and the reader had to scan every row for a "Recorded v1.0" badge to guess
 * what was wrong. The remedy existed and was even written in a code comment
 * ("until the old deals are explicitly re-underwritten") — just never shown.
 */

const source = readFileSync(
  join(process.cwd(), "app/dashboard/saved-analyses/page.tsx"),
  "utf8",
);

/** The notice section, from its aria-label to the rollup that follows it. */
function noticeBlock(): string {
  const start = source.indexOf('aria-label="Underwriting version notice"');
  expect(start, "the version notice was renamed or removed").toBeGreaterThan(-1);
  const end = source.indexOf("<PortfolioRollupStrip", start);
  expect(end).toBeGreaterThan(start);
  return source.slice(start, end);
}

describe("the withheld-totals notice is not a dead end", () => {
  it("still fails closed on the aggregate", () => {
    // The fix is about communication. If this regresses into blending
    // standards, the notice becomes a lie rather than an incomplete truth.
    expect(source).toContain("hasMixedMetricMethodologies ? [] : mappedItems");
  });

  it("counts how many deals are on the older standard", () => {
    expect(source).toContain("const staleMethodologyCount");
    expect(source).toMatch(/staleMethodologyCount[\s\S]{0,160}methodologyIsCurrent === false/);
  });

  it("names the remedy in the notice itself", () => {
    const block = noticeBlock();
    expect(block).toMatch(/re-underwrite/i);
    expect(block).toMatch(/totals come back/i);
  });

  it("tells the reader how to find the affected deals", () => {
    const block = noticeBlock();
    expect(block).toMatch(/Recorded v/);
  });

  it("reassures that recorded results are not overwritten", () => {
    // Re-underwriting sounds destructive. Saying it saves a new scenario is
    // what makes the remedy safe to act on.
    const block = noticeBlock();
    expect(block).toMatch(/stay frozen|new scenario/i);
  });

  it("reads correctly for exactly one stale deal", () => {
    // "1 deals were recorded" is the classic pluralisation slip.
    const block = noticeBlock();
    expect(block).toContain("staleMethodologyCount === 1");
    expect(block).toContain('"1 deal was recorded"');
  });
});
