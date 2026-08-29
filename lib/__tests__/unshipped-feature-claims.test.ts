import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { FEATURE_CATALOG, isFeatureReleased } from "@/lib/entitlements-catalog";

/**
 * A marketing surface must never sell a capability the product cannot deliver.
 *
 * `lib/entitlements-catalog.ts` is the authority: a feature with
 * `shipped: false` is unavailable to EVERY plan, paid included. Selling one is
 * worse than a missing feature — it is a specific, checkable promise on the
 * pages a shopper reads while deciding to pay, and the discovery happens after
 * the card is charged.
 *
 * This shipped: /vs/mashvisor sold Pro a "10-year projection — full compounding
 * with depreciation" while `tax_strategy` (the feature that produces
 * depreciation output) was shipped:false, and three other live pages correctly
 * said it was unavailable.
 *
 * The rule below is deliberately about the SELLING context, not the word. Pages
 * may freely say a thing is unavailable, explain it, or tell the reader to use a
 * tax professional — that is honest and useful. What they may not do is put the
 * term in a tier promise.
 */

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");
// Same idiom the sibling claim guards use (comparison-claim-guards, plan-claim-truth).
const tracked = (globs: string[]) =>
  execFileSync("git", ["ls-files", ...globs], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  })
    .split("\n")
    .filter((file) => Boolean(file) && existsSync(join(root, file)));

/** Terms that only make sense if an unshipped feature works. */
const UNSHIPPED_TERM_MAP: Record<string, readonly string[]> = {
  tax_strategy: ["depreciation", "tax-loss", "tax loss"],
  exit_scenarios: ["exit scenario", "sale scenario", "modeled sale"],
};

/** A claim is a tier promise when the term sits next to a plan name. */
const TIER_WORDS = /\b(pro|agent pro|paid|subscriber|included|available on)\b/i;

function unshippedTerms(): string[] {
  return Object.entries(UNSHIPPED_TERM_MAP)
    .filter(([key]) => !isFeatureReleased(key as keyof typeof FEATURE_CATALOG))
    .flatMap(([, terms]) => terms);
}

describe("no marketing surface sells an unshipped feature", () => {
  it("the catalog still marks the features this guard is about", () => {
    // If these ship, this suite should start passing trivially rather than
    // silently guarding nothing — assert the premise so that is visible.
    const guarded = Object.keys(UNSHIPPED_TERM_MAP);
    expect(guarded.length).toBeGreaterThan(0);
    for (const key of guarded) {
      expect(FEATURE_CATALOG[key as keyof typeof FEATURE_CATALOG]).toBeDefined();
    }
  });

  it("no /vs comparison cell promises an unshipped capability to a tier", () => {
    const terms = unshippedTerms();
    if (terms.length === 0) return; // everything shipped — nothing to guard

    const offenders: string[] = [];
    for (const path of tracked(["app/vs/**/page.tsx"])) {
      const source = read(path);
      source.split("\n").forEach((line, i) => {
        // Only the comparison-row literals, which carry a `truecap:` cell.
        if (!/truecap:\s*"/.test(line)) return;
        const cell = /truecap:\s*"([^"]*)"/.exec(line)?.[1] ?? "";
        if (!cell) return;
        const hit = terms.find((t) => cell.toLowerCase().includes(t));
        if (hit && TIER_WORDS.test(cell)) {
          offenders.push(`${path}:${i + 1} — "${cell}"`);
        }
      });
    }

    expect(
      offenders,
      `these cells promise an unshipped capability to a paying tier:\n${offenders.join("\n")}`,
    ).toEqual([]);
  });

  it("the mashvisor 10-year row claims only what is released", () => {
    const source = read("app/vs/mashvisor/page.tsx");
    const row = source
      .split("\n")
      .find((l) => l.includes('feature: "10-year projection"'));
    expect(row, "the 10-year projection row disappeared").toBeDefined();
    expect(row).not.toMatch(/depreciation/i);
    // `projections` IS released, so naming it is fair.
    expect(isFeatureReleased("projections")).toBe(true);
  });

  it("the retired spreadsheet comparison rows stay deleted", () => {
    // They contained a "Tax / depreciation math -> truecap: true" row. Dead
    // code that asserts something untrue is one re-render from being live.
    const source = read("components/marketing/landing-sections.tsx");
    expect(source).not.toContain("COMPARISON_ROWS");
    expect(source).not.toMatch(/Tax \/ depreciation math/i);
  });
});
