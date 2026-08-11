/**
 * Guards the public plan claims against the actual entitlements.
 *
 * These are REVENUE bugs, not copy nits: each one contradicted another
 * surface at the exact moment a visitor decides to pay, and each was live.
 *
 *   1. The homepage value ladder said Free could not save deals at all
 *      ([false,false,true]) while the homepage's OWN FAQ two sections down,
 *      the /pricing matrix, and the seeded free plan all say Free saves 5.
 *   2. The same ladder said the $5 one-time PDF excluded the 10-year
 *      projection / tax / exit sections, while the homepage FAQ and /pricing
 *      say it includes them — and the generator produces the same document a
 *      Pro user exports, minus custom branding.
 *   3. /for-agents and /for-buy-and-hold told agents that read-only share
 *      links were a Pro feature. They are free for everyone (there is no
 *      entitlement check on ShareLinkButton or /d/[encoded]); only the
 *      CO-BRANDED variant is Pro.
 *
 * The root cause is that plan truth is hand-typed across several rendered
 * surfaces while lib/entitlements-catalog.ts — the intended single source of
 * truth — renders nowhere. Until that is unified, this test is the tripwire.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");

describe("homepage value ladder matches the real entitlements", () => {
  const src = read("components/marketing/landing-sections.tsx");

  it("does not claim Free cannot save deals", () => {
    // The seeded free plan has save_deal + max_saved_deals:5, so the Free
    // cell must carry a qualifier (not a bare `false`).
    const row = src.match(/\{\s*label:\s*"Save & revisit deals",\s*cells:\s*\[([^\]]+)\]/);
    expect(row, "Save & revisit deals row not found in LADDER_ROWS").not.toBeNull();
    const freeCell = row![1].split(",")[0].trim();
    expect(freeCell).not.toBe("false");
    expect(freeCell).toMatch(/Up to 5/);
  });

  it("does not claim the $5 PDF excludes projections / tax / exit", () => {
    const row = src.match(
      /\{\s*label:\s*"10-year projections · tax · exit",\s*cells:\s*\[([^\]]+)\]/,
    );
    expect(row, "projections row not found in LADDER_ROWS").not.toBeNull();
    const pdfCell = row![1].split(",")[1].trim();
    // The $5 report DOES contain these sections — a bare `false` is the bug.
    expect(pdfCell).not.toBe("false");
  });
});

describe("share links are not sold as Pro-only", () => {
  // Plain read-only share links are ungated (free + logged-out). Only the
  // co-branded variant is Pro. Copy may say "co-branded share links" are Pro;
  // it must not say share links as such are Pro.
  const offenders: Array<[string, RegExp]> = [
    ["app/for-agents/page.tsx", /Pro unlocks share links/],
    ["app/for-buy-and-hold/page.tsx", /PDF exports, and share links/],
  ];

  for (const [file, pattern] of offenders) {
    it(`${file} does not attribute plain share links to Pro`, () => {
      expect(read(file)).not.toMatch(pattern);
    });
  }
});

describe("competitor claims reflect the shipped listing-link import", () => {
  // TrueCap accepts a pasted Zillow/Redfin/Realtor link and extracts the
  // ADDRESS (lib/listing-url.ts). Claiming it has no listing import at all —
  // or steering a reader to a competitor for that reason — is now false, and
  // "honest comparison" is an explicit brand promise.
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
      // The bare "choose DealCheck for listing import" steer, with no
      // acknowledgement that TrueCap takes a listing link at all.
      expect(src).not.toMatch(/I want listing import from Zillow \/ Redfin\.&quot;<\/strong> DealCheck\.</);
    });
  }
});
