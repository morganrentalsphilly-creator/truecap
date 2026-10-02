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
      // The ledger row was removed with the Deal Q&A row (2026-08-17).
      /Where these numbers came from/i,
    ]) {
      expect(entries, String(gone)).not.toMatch(gone);
    }
  });

  it("quotes no control label or placement that has since changed", () => {
    for (const stale of [
      // The sample deal is a link under the homepage address form.
      /sample deal' button next to/i,
      /next to the analyzer's H1/i,
      // Notes is the last ledger row; results are rows, not tabs.
      /Lives at the top of the analysis dashboard/i,
      /inside the Cash Flow tab/i,
      // The analyzer is not on the homepage.
      /Server-side fetch on the homepage/i,
      // The card's headline is "Create an account to save {deal}".
      /Save \[your address\] for later/i,
      // BRRRR and depreciation years are switched off on the templates page.
      /Five prebuilt starting points/i,
      /depreciation years/i,
    ]) {
      expect(entries, String(stale)).not.toMatch(stale);
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
    // Not every note about a withdrawn feature was removed: the entries
    // marked "(retired)" and "(partly retired)" are still on the page, and
    // the notice's next clause says so.
    expect(source).not.toMatch(
      /notes about features\s+that were later withdrawn have been removed/i,
    );
    expect(source).toMatch(/Notes about some withdrawn\s+features have been removed/);
    expect(entries).toContain("(retired)");
    expect(source).not.toMatch(/Updated as we ship/i);
    expect(source).not.toMatch(/as they ship/i);
    expect(source).toContain("robots: { index: false, follow: true }");
  });

  it("does not tell a free account it gets the dashboard screen", () => {
    // /dashboard redirects an account without dashboard_insights to My Deals.
    expect(source).not.toMatch(/opens\s+the dashboard/i);
    expect(source).toMatch(/in\s+My Deals\./);
    const route = readFileSync(
      join(process.cwd(), "app/dashboard/page.tsx"),
      "utf8",
    );
    expect(route).toMatch(
      /if \(!canViewDashboardInsights\) \{\s+redirect\("\/dashboard\/saved-analyses"\);/,
    );
  });
});
