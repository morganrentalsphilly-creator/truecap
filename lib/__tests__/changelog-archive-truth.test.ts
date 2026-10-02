import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { FEATURE_CATALOG } from "@/lib/entitlements-catalog";

/**
 * /changelog is a de-surfaced archive of dated release notes (noindex, no
 * inbound link). A reader still takes a release note as something they can
 * use today, so the 2026-10 audit removed the notes whose feature is gone,
 * switched off or replaced. These checks keep those notes from coming back
 * and keep the page saying what it is.
 */
const source = readFileSync(
  join(process.cwd(), "app/changelog/page.tsx"),
  "utf8",
);
/** The entries array alone: the file's comments may name what was removed. */
const entries = source.slice(
  source.indexOf("const ENTRIES: Entry[] = ["),
  source.indexOf("\n];\n", source.indexOf("const ENTRIES: Entry[] = [")),
);

describe("/changelog archive", () => {
  it("reads the entries", () => {
    expect(entries.length).toBeGreaterThan(1000);
    expect(entries.match(/^\s+date: "/gm)?.length ?? 0).toBeGreaterThan(10);
  });

  it("does not say read-only share links are a Pro feature", () => {
    // Plain read-only links are free for every tier.
    expect(FEATURE_CATALOG.share_links.tiers).toContain("free");
    expect(entries).not.toMatch(/share(?:able)?[^."]{0,60}links? moved to Pro/i);
    expect(entries).not.toMatch(/moved to Pro/i);
  });

  it("names no feature that was removed, unmounted or switched off", () => {
    for (const gone of [
      /ROI calculator on \/pricing/i,
      /activity ticker/i,
      /deals-ticker/i,
      /Deal Q&A/i,
      /promo banner/i,
      /Onboarding tour/i,
      /Team Pro/i,
      /one-time (?:single-deal )?PDF/i,
      /sticky CTA/i,
    ]) {
      expect(entries, String(gone)).not.toMatch(gone);
    }
  });

  it("names neither of the two noindex persona stubs", () => {
    expect(entries).not.toMatch(/\/for-brrrr|\/for-flippers/);
  });

  it("states no running count that goes stale", () => {
    expect(entries).not.toMatch(/\bnow at \d+ posts\b/i);
    expect(entries).not.toMatch(/catalog to \d+ posts/i);
    expect(entries).not.toMatch(/\b(?:\d+|nine|ten|eleven|twelve) free calculators now live\b/i);
    expect(entries).not.toMatch(/\bwith \d+ plain-English term definitions\b/i);
  });

  it("makes no legal, search or self-grading claim in an entry", () => {
    expect(entries).not.toMatch(/GDPR|CCPA|compliant/i);
    expect(entries).not.toMatch(/high-intent|SEO|link equity|ranks for/i);
    expect(entries).not.toMatch(/\bhonest\b/i);
  });

  it("says it is a dated archive and promises no updates", () => {
    expect(source).toContain("This archive preserves historical release notes.");
    expect(source).toMatch(/Each note\s+describes the product on its date/);
    expect(source).not.toMatch(/Updated as we ship/i);
    expect(source).not.toMatch(/as they ship/i);
    expect(source).toContain("robots: { index: false, follow: true }");
  });
});
