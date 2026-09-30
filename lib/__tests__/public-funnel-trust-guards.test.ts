import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { lastmodFor } from "@/lib/seo/lastmod";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("public funnel and trust guards", () => {
  it("keeps the requested decision positioning and one secondary hero link", () => {
    const config = read("lib/marketing-offer-config.ts");
    const hero = read("components/marketing/marketing-hero.tsx");
    const form = read("components/marketing/hero-address-form.tsx");

    // 2026-09-29 agent-first pass: the headline is the agent's outcome, the
    // subhead keeps the product's topical nouns (rental, Buy Box, Offer
    // Ceiling, 60 seconds), and an investor cue sits under the primary action.
    expect(config).toContain(
      'decision_system: "Stop forwarding listings. Start sending deals that already pencil."',
    );
    expect(hero).toContain(
      "Paste the rental listing. In about 60 seconds, see whether it clears your client's Buy Box, the highest price that still does (the Offer Ceiling), and what could break the deal.",
    );
    expect(hero).toContain('href="/for-investors"');
    expect(hero).toContain("data-hero-investor-cue");
    expect(hero).toContain("Cash flow · Cap rate · Cash-on-cash return · DSCR · Editable");
    expect(hero).toContain(
      "Free. No account. Your first full decision is included.",
    );
    expect(form).toContain('"Analyze a deal free"');
    // The written memo moved to the footer (one primary + one secondary CTA
    // in the hero); the secondary is the live sample in the analyzer.
    expect(form).not.toContain('href="/sample-decision-memo"');
    expect(form.match(/href="\/analyze\?sample=1"/g)?.length ?? 0).toBeGreaterThanOrEqual(1);
    expect(read("components/marketing/site-footer.tsx")).toContain(
      'href: "/sample-decision-memo"',
    );
    expect(form).not.toContain("See How It Works");
    expect(form).not.toContain("See Pro features");
  });

  it("keeps an empty hero submit visible, described, focused, and local", () => {
    const form = read("components/marketing/hero-address-form.tsx");
    const emptyBranch = form.slice(
      form.indexOf("if (!raw) {"),
      form.indexOf("if (looksLikeListingLink(raw))"),
    );

    expect(emptyBranch).toContain("setAddressError(HERO_EMPTY_HELPER)");
    expect(emptyBranch).toContain('form.setFocus("address")');
    expect(emptyBranch).not.toContain("scrollToCalculator");
    expect(form).toContain(
      'HERO_EMPTY_HELPER = "Paste an address or a Zillow/Redfin link"',
    );
    expect(form).toContain('role="alert"');
    expect(form).toContain('errorId="hero-address-error"');
    expect(form).toContain("required");
    // The primary action is NEVER disabled and never dimmed — it hands off
    // to /analyze (a plain GET before hydration, a router push after).
    const submit = form.slice(form.indexOf('type="submit"'), form.indexOf("</button>", form.indexOf('type="submit"')));
    expect(submit).not.toContain("disabled");
    expect(submit).not.toContain("opacity-70");
    expect(form).toContain('action="/analyze"');
    expect(form).toContain('method="get"');
    expect(form).toContain('router.push("/analyze")');
  });

  it("keeps the homepage tail to problem, how-it-works, offer, trust, founder, proof, FAQ, and final CTA blocks", () => {
    for (const path of ["app/page.tsx", "app/home-authed/page.tsx"]) {
      const page = read(path);
      for (const component of [
        "ProblemBlock",
        "HowTrueCapWorks",
        "PdfProUpsell",
        "DataSourcesSection",
        "BuiltByInvestor",
        "SocialProof",
        "CaseStudiesSection",
        "HomepageFaq",
        "FinalCta",
      ]) {
        expect(page, path).toContain(`<${component}`);
      }
      for (const redundant of [
        "OfferEngineSection",
        "Personas",
      ]) {
        expect(page, path).not.toContain(`<${redundant}`);
      }
    }
  });

  it("does not mount seeded analysis counts on the homepage or proof page", () => {
    expect(read("components/marketing/marketing-hero.tsx")).not.toContain(
      "DealsAnalyzedTicker",
    );
    expect(read("app/reviews/page.tsx")).not.toContain("DealsAnalyzedTicker");
  });

  it("keeps repaired handoffs and removes the floating analysis email prompt", () => {
    expect(read("app/sample-decision-memo/page.tsx")).toContain('href="/analyze"');
    expect(read("app/sample-decision-memo/page.tsx")).not.toContain(
      'href="/#calculator"',
    );
    expect(read("components/investcalc/investcalc-page.tsx")).not.toContain(
      "PostAnalysisEmailPrompt",
    );
    expect(read("components/investcalc/address-autocomplete.tsx")).toContain(
      "&loading=async",
    );
  });

  it("names the public trust surface without implying customer reviews exist", () => {
    const reviews = read("app/reviews/page.tsx");
    const footer = read("components/marketing/site-footer.tsx");
    expect(reviews).toContain('title: "Proof & methodology"');
    expect(reviews).not.toContain("Reviews & Proof");
    expect(reviews).not.toContain("The wall of proof");
    expect(footer).toContain('{ label: "Proof & methodology", href: "/reviews" }');
  });

  it("dates and sources the corrected Stessa comparison", () => {
    const comparison = read("app/vs/stessa/page.tsx");
    const article = read("app/blog/dealcheck-vs-stessa-vs-truecap/page.tsx");
    const roundup = read(
      "app/blog/best-rental-property-calculator-2026/page.tsx",
    );
    const freeRoundup = read(
      "app/blog/best-free-rental-property-calculator-2026/page.tsx",
    );
    const biggerPocketsRoundup = read(
      "app/blog/free-biggerpockets-calculator-alternatives/page.tsx",
    );
    const operationsComparison = read(
      "app/blog/stessa-vs-avail-vs-baselane/page.tsx",
    );
    const comparisonHub = read("app/vs/page.tsx");
    const socialCard = read("app/vs/stessa/opengraph-image.tsx");
    const comparisonArticleCard = read(
      "app/blog/dealcheck-vs-stessa-vs-truecap/opengraph-image.tsx",
    );
    const registry = read("lib/blog-posts.ts");
    for (const [path, source] of [
      ["/vs/stessa", comparison],
      ["/blog/dealcheck-vs-stessa-vs-truecap", article],
      ["/blog/stessa-vs-avail-vs-baselane", operationsComparison],
    ] as const) {
      // The 2026-08-27 correction dates the page: its lastmod (the one date
      // source, content/seo/lastmod.json, which dateModified reads) is not earlier.
      expect((lastmodFor(path) ?? "") >= "2026-08-27", path).toBe(true);
      expect(source).toContain("stessa.com/investment-property-marketplace");
      expect(source).toContain(
        "support.stessa.com/en/articles/10779191-stessa-investment-properties-marketplace",
      );
      expect(source).toContain("stessa.com/rental-returns-and-income-tax-calculator");
      expect(source).not.toMatch(/Stessa is (?:unambiguously )?a different category/i);
      expect(source).not.toMatch(/Don&apos;t use Stessa for.*deciding/i);
    }
    for (const source of [
      roundup,
      freeRoundup,
      biggerPocketsRoundup,
      operationsComparison,
      comparisonHub,
      socialCard,
    ]) {
      expect(source).not.toMatch(/Stessa is (?:only )?accounting/i);
      expect(source).not.toMatch(/Stessa is for properties you own, not/i);
      expect(source).not.toMatch(/Stessa[^\n]{0,80}not (?:actually )?a calculator/i);
      expect(source).not.toMatch(/Stessa\s*\(not for underwriting\)/i);
      expect(source).toMatch(/marketplace|acquisition/i);
    }
    expect(biggerPocketsRoundup).not.toContain(
      "covers the post-purchase side free",
    );
    expect(comparison).toContain(
      "support.stessa.com/en/articles/3904791-stress-test-sensitivity-analysis-report",
    );
    expect(comparison).toContain('reviewedDate="August 27, 2026"');
    expect(comparison).toContain("Owned-portfolio Stress Test");
    expect(comparisonHub).toMatch(
      /slug: "stessa"[\s\S]{0,260}group: "Direct alternative"/,
    );
    // The 2026-08-27 Stessa correction is reflected in the post's modified
    // date: MODIFIED_AT reads the lastmod map, whose date is not earlier.
    expect(freeRoundup).toContain(
      'const MODIFIED_AT = lastmodFor("/blog/best-free-rental-property-calculator-2026") ?? PUBLISHED_AT;',
    );
    expect((lastmodFor("/blog/best-free-rental-property-calculator-2026") ?? "") >= "2026-08-27").toBe(true);
    expect(freeRoundup).toContain(
      "stessa.com/rental-returns-and-income-tax-calculator",
    );
    expect(comparisonArticleCard).toContain(
      "Acquisition depth and operations breadth",
    );
    for (const slug of [
      "best-dealcheck-alternatives",
      "free-biggerpockets-calculator-alternatives",
      "best-rental-property-calculator-2026",
      "best-free-rental-property-calculator-2026",
      "dealcheck-vs-stessa-vs-truecap",
      "stessa-vs-avail-vs-baselane",
    ]) {
      // The correction's date lives in the lastmod map (F2 keeps modified
      // dates out of lib/blog-posts.ts), and each post's MODIFIED_AT reads it.
      expect(read(`app/blog/${slug}/page.tsx`), slug).toContain(
        `const MODIFIED_AT = lastmodFor("/blog/${slug}") ?? PUBLISHED_AT;`,
      );
      const modifiedAt = lastmodFor(`/blog/${slug}`);
      expect(modifiedAt, slug).toBeDefined();
      expect((modifiedAt ?? "") >= "2026-08-27", `${slug} lastmod ${modifiedAt} predates the 2026-08-27 correction`).toBe(true);
      expect(registry).toContain(`slug: "${slug}"`);
    }
    expect(registry).not.toMatch(/modifiedAt/);
  });

  it("keeps the beta case-study intake unpublished and evidence based", () => {
    const template = read("docs/BETA-CASE-STUDY-INTAKE-TEMPLATE.md");
    expect(template).toContain("Status: internal and unpublished");
    for (const field of [
      "Investor type",
      "Primary market",
      "Deal stage",
      "Decision changed",
      "Measurable time saved",
      "Publication approval",
    ]) {
      expect(template).toContain(field);
    }
  });
});
