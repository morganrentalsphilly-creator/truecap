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
    // Ceiling). 2026-10-03 rulings: the subhead carries no speed figure
    // (P2-19), co-branding is qualified "with Pro" (P1-03), and the investor
    // cue sits ABOVE the primary action (P1-01).
    expect(config).toContain(
      'decision_system: "Stop forwarding listings. Start sending deals that already pencil."',
    );
    expect(hero).toContain(
      "Paste the rental listing. See whether it clears your client's Buy Box, the highest price that still does (the Offer Ceiling), and what could break the deal. Send it co-branded with Pro.",
    );
    expect(hero).not.toContain('Send it co-branded."');
    expect(hero).not.toMatch(/\b\d+ seconds|about a minute/);
    expect(hero).toContain('href="/for-investors"');
    expect(hero).toContain("data-hero-investor-cue");
    // The cue's words and link are unchanged, and it comes before the form
    // and the risk line in the source (so in the DOM and on screen).
    expect(hero.replace(/\s+/g, " ")).toContain(
      "Buying for your own portfolio? Same analyzer, your own Buy Box.",
    );
    const cueAt = hero.indexOf('data-hero-investor-cue=""');
    const formAt = hero.indexOf("<HeroAddressForm className");
    expect(cueAt).toBeGreaterThan(-1);
    expect(formAt).toBeGreaterThan(cueAt);
    expect(hero.indexOf("Free. No account. Your first full decision is included.")).toBeGreaterThan(formAt);
    expect(hero.slice(cueAt, formAt)).toContain('href="/for-investors"');
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
    // The helper names the same sites as the unsupported-link error and the
    // analyzer's listing-link help (one list; it used to name only two).
    expect(form).toContain(
      "HERO_EMPTY_HELPER = `Paste an address or a ${SUPPORTED_LISTING_SITES_TEXT} link`",
    );
    expect(form).toContain('role="alert"');
    expect(form).toContain('const errorId = isHero ? "hero-address-error" : "close-address-error";');
    expect(form).toContain("errorId={errorId}");
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

  // 2026-09 design pass (DESIGN.md "Homepage structure", approved at
  // checkpoint 1): the opened ledger replaced the problem block's three
  // question cards, and "What your client receives" joined the page.
  it("keeps the homepage tail to how-it-works, sources, client, offer, founder, proof, FAQ, and final CTA blocks", () => {
    for (const path of ["app/page.tsx", "app/home-authed/page.tsx"]) {
      const page = read(path);
      for (const component of [
        "HowTrueCapWorks",
        "ClientReceivesSection",
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
        "ProblemBlock",
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
    expect(comparison).toContain('reviewedDate="October 2026"');
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
