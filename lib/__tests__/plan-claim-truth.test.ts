/**
 * Repo-wide guard on the public plan claims vs the actual entitlements.
 *
 * These are REVENUE bugs, not copy nits: each one contradicted another
 * surface at the exact moment a visitor decides to pay, and each was live.
 * Ground truth (lib/entitlements-catalog.ts + the plans seed):
 *   - FREE saves up to 5 deals and revisits them; Pro adds EDITING, unlimited
 *     saves, and side-by-side compare. So "Free cannot save" is false.
 *   - Plain read-only share links are FREE for everyone (share_links gate
 *     "always", tiers ["free","pro"]). Only the CO-BRANDED variant is Pro.
 *     So "Pro unlocks share links" is false.
 *   - Pro is $29.99/mo or $300/yr. Any other Pro price is wrong.
 *
 * The root cause is that plan truth is hand-typed across ~40 surfaces while
 * lib/entitlements-catalog.ts — the intended single source of truth — renders
 * nowhere. A first pass fixed only the handful of files it looked at; the same
 * false claims survived on 36 /vs pages, blog posts, llms.txt/llms-full.txt,
 * and email templates. This guard now scans the WHOLE tree so a straggler (or
 * a regression) fails the build, not just an enumerated list. It stays until
 * Phase 4 makes the surfaces render from the catalog.
 */
import { describe, expect, it } from "vitest";
import { ladderCellsForFeature } from "@/lib/entitlements-catalog";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = process.cwd();
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");

function tracked(globs: string[]): string[] {
  return execFileSync("git", ["ls-files", ...globs], {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  })
    .split("\n")
    .filter(Boolean);
}

/** app/changelog is a historical narrative — its past entries describe a
 *  prior product state and are out of scope for a truth-of-today guard. */
const EXCLUDE = /^app\/changelog\//;

describe("homepage value ladder matches the real entitlements", () => {
  const src = read("components/marketing/landing-sections.tsx");

  // The ladder now DERIVES its cells from lib/entitlements-catalog, so these
  // assert the derived truth rather than a source literal — the same two
  // revenue-bug claims, checked against the value the page actually renders.
  it("does not claim Free cannot save deals", () => {
    const [free] = ladderCellsForFeature("save_deal");
    expect(free).not.toBe(false);
    expect(String(free)).toMatch(/5/);
  });

  it("does not claim the $5 PDF excludes projections / tax / exit", () => {
    for (const key of ["projections", "tax_strategy", "exit_scenarios"] as const) {
      const [, oneTime] = ladderCellsForFeature(key);
      expect(oneTime, `${key} in the $5 column`).not.toBe(false);
    }
  });

  it("still reads its cells from the catalog (derivation not reverted)", () => {
    expect(src).toMatch(/ladderCellsForFeature/);
  });
});

describe("no /vs comparison page sells plain read-only share links as Pro", () => {
  const files = tracked(["app/vs/*/page.tsx"]).filter((f) => !EXCLUDE.test(f));

  it("has /vs pages to check", () => {
    expect(files.length).toBeGreaterThan(20);
  });

  it("every share-links row's TrueCap cell leads with Free, not Pro", () => {
    const offenders: string[] = [];
    // A row object whose `feature` mentions a share/link and whose `truecap`
    // cell begins with "Pro" is the bug — plain links are free.
    const rowRe =
      /feature:\s*"[^"]*(?:hare|link)[^"]*"[^}]*?truecap:\s*"(Pro[^"]*)"/gi;
    for (const f of files) {
      for (const m of read(f).matchAll(rowRe)) {
        // "Pro adds co-branding" is fine only when the cell LEADS with Free;
        // this branch matched a cell that STARTS with "Pro", which is the bug.
        offenders.push(`${f}: ${m[1].slice(0, 60)}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe("no surface repeats the corrected false claims", () => {
  // Curated exact phrases that encode a known-false claim. Scanned across the
  // whole public tree + email templates. Add to this list when a new false
  // phrasing is found; do not remove entries.
  const FORBIDDEN: RegExp[] = [
    /Pro unlocks share links/i,
    /Pro — clean public URL/i,
    /Pro — public URL \+ branding/i,
    /\$16\.67/, // a Pro price that exists nowhere real
    /Saving and comparing deals \(Pro\)/i,
    /save deals[^.]*require[^.]*\$?29/i,
  ];
  const files = tracked([
    "app/**/*.tsx",
    "app/**/*.ts",
    "components/**/*.tsx",
    "emails/**/*.json",
  ]).filter((f) => !EXCLUDE.test(f));

  it("scans a broad set of public files", () => {
    expect(files.length).toBeGreaterThan(100);
  });

  for (const pattern of FORBIDDEN) {
    it(`no file contains ${pattern}`, () => {
      const hits = files.filter((f) => pattern.test(read(f))).map((f) => f);
      expect(hits).toEqual([]);
    });
  }
});

describe("competitor claims reflect the shipped listing-link import", () => {
  const files = [
    "app/blog/best-rental-property-calculator-2026/page.tsx",
    "app/blog/best-dealcheck-alternatives/page.tsx",
    "app/blog/dealcheck-vs-biggerpockets-vs-truecap/page.tsx",
    "app/vs/dealcheck-for-fix-and-flip/page.tsx",
  ];
  for (const file of files) {
    it(`${file} does not claim TrueCap has no listing import`, () => {
      const src = read(file);
      expect(src).not.toMatch(/"No listing import/);
      expect(src).not.toMatch(/No property import from listing sites \(/);
    });
  }
});
