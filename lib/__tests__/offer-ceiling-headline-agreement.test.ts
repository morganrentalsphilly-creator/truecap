import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The Offer Ceiling card and the next-step block must never contradict.
 *
 * The card renders a coarse RANGE when the payload's access mode is "preview",
 * and an exact figure when it is "exact". Those two modes are mutually
 * exclusive (analysis-dashboard derives exactOfferCeiling from
 * access === "exact" and freeOfferCeilingPreview from access === "preview"), so
 * on the free path `offerCeiling` is ALWAYS null.
 *
 * The next-step block tested only `offerCeiling` and, finding it null, declared
 * "No qualifying Offer Ceiling was found under the current assumptions." So the
 * card printed "$250,000-$350,000" under the caption "Highest modeled price
 * that still meets the criteria shown" while a block ~330px below in the same
 * viewport said no such price existed — same payload, opposite claims, on the
 * default path most visitors are on.
 *
 * Verified in production 2026-08-28 on a deal that misses its targets. The
 * range is not a rounding of the negative statement: on identical inputs the
 * product elsewhere computed an exact ceiling of $307,500 and printed the
 * correct copy.
 */

const root = process.cwd();
const source = readFileSync(
  join(root, "components/investcalc/focused-decision-summary.tsx"),
  "utf8",
);

/** The next-step reason chain, from the targets branch to the verification one. */
function nextStepChain(): string {
  // The label became a ternary when the binding rule was named inline
  // ("Review the binding rule: Cash flow ≥ $750/mo"), so anchor on the
  // expression rather than the old literal. The fallback literal is still
  // asserted by decision-summary-target-fit.test.ts.
  const start = source.indexOf("label: bindingCriterionLabel");
  expect(start, "the next-step branch was renamed or removed").toBeGreaterThan(-1);
  const end = source.indexOf("advocacyContractEnabled &&", start);
  expect(end).toBeGreaterThan(start);
  return source.slice(start, end);
}

describe("the next-step block agrees with the Offer Ceiling headline", () => {
  it("consults the range preview, not just the exact solve", () => {
    const chain = nextStepChain();
    expect(
      chain,
      "the no-ceiling branch must check rangePreview — otherwise the free path always contradicts the card",
    ).toContain("rangePreview?.downsideFeasible && rangePreview.lower != null");
  });

  it("does not claim no ceiling exists while a feasible range is on screen", () => {
    const chain = nextStepChain();
    const negative = "No qualifying Offer Ceiling was found";
    const negativeAt = chain.indexOf(negative);
    const rangeAt = chain.indexOf("rangePreview?.downsideFeasible");

    expect(negativeAt, "the genuine no-ceiling message should still exist").toBeGreaterThan(-1);
    expect(
      rangeAt,
      "the feasible-range branch must be evaluated BEFORE the blanket negative",
    ).toBeLessThan(negativeAt);
  });

  it("uses the same feasibility test the headline uses", () => {
    // The headline picks its range with exactly this condition. If the two ever
    // diverge the contradiction returns in a new shape, so pin that they match.
    const headline = source.slice(source.indexOf("const offerCeilingHeadline"), source.indexOf("offerCeilingAnnouncement"));
    const condition = "rangePreview?.downsideFeasible && rangePreview.lower != null";
    expect(headline).toContain(condition);
    expect(nextStepChain()).toContain(condition);
  });

  it("distinguishes an infeasible downside from no range at all", () => {
    // The headline has three outcomes (range / "No feasible downside case" /
    // "No feasible range"); the next step must not collapse them into one.
    const chain = nextStepChain();
    expect(chain).toContain("No feasible downside case was found");
  });
});
