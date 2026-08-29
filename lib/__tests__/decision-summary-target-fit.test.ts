import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The decision card exists to answer "does this deal clear my rules?".
 * Two things stopped it doing that without extra work from the reader.
 *
 * 1. The next-step block said "Review the binding target rule" and never named
 *    the rule — even though the collapsed disclosure a few hundred pixels below
 *    already printed "Binding: Cash flow ≥ $750/mo" from the same
 *    offerCeiling.bindingConstraints data.
 *
 * 2. The two metric tiles rendered identically whether the number passed or
 *    failed. Observed live on the sample deal: cash flow $554 against a $750
 *    target (misses) and DSCR 1.52 against 1.25 (meets), shown with the same
 *    styling and no words, so the reader had to do both comparisons themselves.
 */

const source = readFileSync(
  join(process.cwd(), "components/investcalc/focused-decision-summary.tsx"),
  "utf8",
);

describe("the binding rule is named where it is referenced", () => {
  it("derives a label from the same data the disclosure uses", () => {
    expect(source).toContain("const bindingCriterionLabel");
    expect(source).toMatch(/bindingCriterionLabel[\s\S]{0,200}bindingConstraints/);
  });

  it("puts the rule in the next-step headline, not only in the accordion", () => {
    const at = source.indexOf('label: bindingCriterionLabel');
    expect(at, "the next-step label no longer uses the binding rule").toBeGreaterThan(-1);
    expect(source.slice(at, at + 200)).toContain("Review the binding rule:");
  });

  it("still reads correctly when no constraint resolved", () => {
    // Empty label must fall back rather than render "Review the binding rule: ".
    const at = source.indexOf('label: bindingCriterionLabel');
    expect(source.slice(at, at + 200)).toContain('"Review the binding target rule"');
  });
});

describe("each metric tile says whether it clears its target", () => {
  it("renders a fit indicator component", () => {
    expect(source).toContain("function TargetFit");
  });

  it("states pass/fail in WORDS, not colour alone", () => {
    // Colour-only would fail a colour-blind reader and every screen reader.
    const at = source.indexOf("function TargetFit");
    const body = source.slice(at, at + 900);
    expect(body).toMatch(/"Meets"\s*:\s*"Misses"|\{meets \? "Meets" : "Misses"\}/);
  });

  it("compares each metric against its own target", () => {
    expect(source).toContain("result.netCashFlow >= cashFlowTarget");
    expect(source).toContain("result.dscr >= dscrTarget");
  });

  it("treats a cash purchase as N/A rather than a DSCR failure", () => {
    // monthlyPayment <= 0 means no debt service; showing "Misses 1.25 target"
    // there would be a false negative on a perfectly good all-cash deal.
    expect(source).toContain("const dscrApplies = result.monthlyPayment > 0");
    const at = source.indexOf("const dscrApplies");
    const after = source.slice(at);
    const naAt = after.indexOf("NO_DEBT_SERVICE_DSCR_LABEL");
    const fitAt = after.indexOf("dscrTarget");
    expect(naAt).toBeGreaterThan(-1);
    expect(fitAt).toBeGreaterThan(naAt);
  });

  it("renders nothing when the user adopted no targets", () => {
    // The no-criteria path must not sprout empty chips.
    expect(source).toContain('typeof cashFlowTarget === "number"');
    expect(source).toContain('typeof dscrTarget === "number"');
  });

  it("only receives targets on the adopted-target call site", () => {
    const calls = [...source.matchAll(/<FirstYearSnapshot\b[\s\S]{0,180}?\/>/g)].map((m) => m[0]);
    expect(calls.length).toBe(2);
    expect(calls.filter((c) => c.includes("target={target}")).length).toBe(1);
  });
});
