/**
 * Truth guards for the /vs social cards (app/vs/<slug>/opengraph-image.tsx).
 *
 * Until the 2026-10 go-to-market fixes no page served these cards: every
 * comparison page named /home.jpg in its metadata, so nobody read the card
 * copy and it drifted from the pages. The audit found twelve cards stating
 * things their own pages had already corrected, or that no source supports.
 * The pages now set no images, each card is its page's og:image, and the
 * rules below keep the audited lines from coming back.
 *
 * A card restates its page and the /vs hub. It adds no fact of its own.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const VS_DIR = join(ROOT, "app", "vs");

type Card = { slug: string; alt: string; competitor: string; tagline: string };

/** One double-quoted string literal's value after `key`, e.g. `tagline:\n "..."`. */
function literalAfter(source: string, key: RegExp, file: string): string {
  const match = new RegExp(`${key.source}\\s*"((?:[^"\\\\]|\\\\.)*)"`).exec(source);
  if (!match) throw new Error(`${file}: no string literal after ${key.source}`);
  return match[1];
}

const CARDS: Card[] = readdirSync(VS_DIR)
  .filter((slug) => existsSync(join(VS_DIR, slug, "opengraph-image.tsx")))
  .map((slug) => {
    const file = `app/vs/${slug}/opengraph-image.tsx`;
    const source = readFileSync(join(ROOT, file), "utf8");
    return {
      slug,
      alt: literalAfter(source, /export const alt =/, file),
      competitor: literalAfter(source, /competitor:/, file),
      tagline: literalAfter(source, /tagline:/, file),
    };
  });

/**
 * A page's `openGraph: { … }` or `twitter: { … }` object as written, braces
 * balanced one level deep (an `images` array of objects would still fit).
 */
const SOCIAL_BLOCK = /\b(?:openGraph|twitter):\s*\{(?:[^{}]|\{[^{}]*\})*\}/g;

const bySlug = (slug: string): Card => {
  const card = CARDS.find((c) => c.slug === slug);
  if (!card) throw new Error(`no card for /vs/${slug}`);
  return card;
};

describe("the /vs social cards", () => {
  it("reads every card", () => {
    expect(CARDS.length).toBeGreaterThan(35);
    for (const card of CARDS) {
      expect(card.tagline.length, card.slug).toBeGreaterThan(40);
      // The template sets the tagline at 30px across 1000px: three lines hold about 190 characters.
      expect(card.tagline.length, card.slug).toBeLessThanOrEqual(170);
    }
  });

  it("names the comparison in its alt text and does not grade itself", () => {
    for (const card of CARDS) {
      expect(card.alt, card.slug).toMatch(/^TrueCap vs \S/);
      // "Honest comparison" sat on cards whose pages carried false competitor cells.
      expect(`${card.alt} ${card.tagline}`, card.slug).not.toMatch(/\bhonest\b|\bfair\b|\bunbiased\b/i);
      expect(`${card.alt} ${card.tagline}`, card.slug).not.toContain("—");
    }
  });

  it("draws no self-grading footer on the shared template", () => {
    // "Honest comparison" footed all 38 cards while more than a dozen of the
    // pages carried false competitor cells. The frame's label already says "Comparison".
    const template = readFileSync(join(ROOT, "lib/og/vs-og-template.tsx"), "utf8");
    expect(template).not.toMatch(/honest comparison/i);
    expect(template).not.toMatch(/footerLeft=/);
  });

  it("has no self-grading line beside it in the link preview", () => {
    // A link preview prints og:description next to the card (and Next fills
    // twitter:description from it when the page sets none). A description
    // that calls the page honest or fair grades a comparison the reader has
    // not seen yet, and it sat beside cards that had stopped doing so.
    for (const card of CARDS) {
      const page = readFileSync(join(VS_DIR, card.slug, "page.tsx"), "utf8");
      const social = [...page.matchAll(SOCIAL_BLOCK)].map((block) => block[0]).join("\n");
      expect(social, card.slug).toContain("openGraph:");
      const descriptions = [...social.matchAll(/\bdescription:\s*"((?:[^"\\]|\\.)*)"/g)].map(
        (m) => m[1],
      );
      expect(descriptions.length, card.slug).toBeGreaterThan(0);
      for (const description of descriptions) {
        expect(description, card.slug).not.toMatch(/\bhonest(?:ly)?\b|\bfair\b|\bunbiased\b/i);
      }
    }
  });

  const openGraphOf = (slug: string): string => {
    const page = readFileSync(join(VS_DIR, slug, "page.tsx"), "utf8");
    const block = [...page.matchAll(SOCIAL_BLOCK)].find((b) => b[0].startsWith("openGraph"));
    if (!block) throw new Error(`app/vs/${slug}/page.tsx: no openGraph block`);
    return block[0];
  };

  it("repeats the card line as the preview text where the old line contradicted it", () => {
    // Five previews said beside the card what the card had stopped saying:
    // "Different jobs" about PropStream, BatchLeads, DealMachine and
    // Mashvisor, which all publish their own rental analysis, and "Honest
    // comparison" on RentCast.
    for (const slug of ["propstream", "batchleads", "rentcast", "dealmachine", "mashvisor"]) {
      expect(openGraphOf(slug), slug).toContain(`"${bySlug(slug).tagline}"`);
    }
  });

  it("does not print \"Different jobs\" beside a card whose vendor analyzes properties too", () => {
    // /vs/privy's card says Privy is "deal sourcing and property analysis".
    // Its preview is the page's own description, not the card line, so it is
    // held here with the four above: none frames underwriting as a job the
    // vendor leaves to TrueCap.
    for (const slug of ["propstream", "batchleads", "dealmachine", "mashvisor", "privy"]) {
      expect(openGraphOf(slug), slug).not.toMatch(/different jobs|finds the leads?\b/i);
    }
    // Two ledes said it under the H1 until the 2026-10 integration pass,
    // beside cards that credit the vendor with property analysis.
    for (const slug of ["mashvisor", "privy"]) {
      const page = readFileSync(join(VS_DIR, slug, "page.tsx"), "utf8").replace(/\s+/g, " ");
      expect(page, slug).not.toMatch(/different jobs/i);
    }
  });

  it("states no number about a competitor that is not listed here with its source", () => {
    /**
     * A size, price or count on a card is a competitor fact with a shelf life.
     * AppFolio: "*Minimum spend and 50 unit minimum apply" under the Core plan
     * on appfolio.com/pricing, rendered 2026-10-02; /vs/appfolio says the same.
     * Cozy: "mid-2021", the move to Apartments.com. Cozy's homepage said in
     * June 2021 that accounts would move "by mid-2021" and on 2021-08-11 that
     * Cozy had moved (web.archive.org captures of cozy.co, rendered
     * 2026-10-02); /vs/cozy says the same. The card once said 2022.
     */
    const ALLOWED: Record<string, string[]> = { appfolio: ["50"], cozy: ["2021"] };
    /** How the page states each allowed number. */
    const ON_PAGE: Record<string, (n: string) => RegExp> = {
      appfolio: (n) => new RegExp(`\\b${n}[- ]unit`),
      cozy: (n) => new RegExp(`\\bmid-${n}\\b`),
    };
    expect(Object.keys(ON_PAGE).sort(), "every ALLOWED slug needs its on-page pattern").toEqual(Object.keys(ALLOWED).sort());
    for (const card of CARDS) {
      const numbers = card.tagline.match(/\d[\d,.]*/g) ?? [];
      expect(numbers, `${card.slug}: ${card.tagline}`).toEqual(ALLOWED[card.slug] ?? []);
    }
    // The card must not outlive its page: the weekly SEO loop may edit
    // app/vs/<slug>/page.tsx and may not edit the card, so a number the page
    // stops stating fails here until the card line is changed with it.
    for (const [slug, numbers] of Object.entries(ALLOWED)) {
      const page = readFileSync(join(VS_DIR, slug, "page.tsx"), "utf8");
      for (const n of numbers) {
        expect(page, `${slug}: the page no longer states ${n}`).toMatch(ON_PAGE[slug](n));
      }
    }
  });

  it("does not restore the lines the audit found false or unsupported", () => {
    const text = CARDS.map((card) => `${card.slug}: ${card.tagline}`).join("\n");
    // Sizes no vendor publishes: AppFolio "1000+ units", Buildium "50+ unit
    // operators", Guesty "50+ properties", Rentec Direct "5-100 unit", and an
    // audience TrueCap has never had ("1-30 doors").
    expect(text).not.toMatch(/\d+\s*\+\s*(?:units?|properties|doors|listings)|\d+-\d+ (?:unit|door)/i);
    expect(text).not.toMatch(/\benterprise (?:PM|STR|property)\b|small-(?:landlord|operator)|solo[- ]investor|\bsolo STR\b/i);
    // TrueCap's starting rent is a HUD benchmark the reader replaces, and
    // Rentometer's Pro worksheet also underwrites, so neither card says
    // TrueCap's deal "includes the rent".
    expect(text).not.toMatch(/including the rent/i);
    // The analyzer has no "effective rent saved" output.
    expect(text).not.toMatch(/rent[- ]saved/i);
    // Nothing establishes a validation, and the model does not forecast.
    expect(text).not.toMatch(/\bvalidated\b|\bwill earn\b/i);
    // /vs/dealcheck states no DealCheck price, so its card promises no pricing comparison.
    expect(bySlug("dealcheck").tagline).not.toMatch(/pricing|free tier/i);
    // There is no AirDNA integration: the reader types AirDNA's numbers in.
    expect(text).not.toMatch(/AirDNA inputs|using AirDNA/i);
    // Internal shorthand.
    expect(text).not.toMatch(/\bSTR cut\b/i);
    // /vs/propstream, /vs/batchleads and /vs/dealmachine score rental
    // analysis a tie: each vendor publishes its own rental calculator. Their
    // cards name what each product is and do not frame underwriting as a job
    // the vendor leaves to TrueCap.
    for (const slug of ["propstream", "batchleads", "dealmachine"]) {
      expect(bySlug(slug).tagline, slug).not.toMatch(/different jobs|finds (?:the )?leads/i);
    }
  });

  it("keeps a card neutral while its page's competitor rows wait on a decision", () => {
    /**
     * When a page's competitor rows are an open report row, its card says
     * only what TrueCap does and repeats none of the claims; list the slug
     * here until the page and its card are rewritten in one commit. None is
     * open now: Baselane (P0-05), Arrived (P0-08) and Fundrise (P1-20) came
     * off on 2026-10-02 (vs-money-pages-truth.test.ts holds them), and so
     * did Cozy (P1-18) and Roofstock (P1-31) (vs-held-pages-truth.test.ts).
     */
    const WAITING: string[] = [];
    for (const slug of WAITING) {
      const { tagline, competitor } = bySlug(slug);
      expect(tagline, slug).toMatch(/^TrueCap /);
      expect(tagline.toLowerCase(), slug).not.toContain(competitor.toLowerCase());
      expect(tagline, slug).not.toMatch(/shut down|20\d\d|REIT|FDIC|fractional|shares|turnkey|marketplace|banking/i);
    }
  });

  it("names TrueCap's short-term mode on a card only with the product's beta label", () => {
    // lib/investor-strategies.ts labels the short-term type "Beta revenue
    // screen only". The six short-term comparison pages stay and each says so
    // in one sentence (report row P2-23, decided 2026-10-02). A card has no
    // room for that sentence, so the cards for the short-term rental tools
    // say TrueCap underwrites "the deal", not "the STR deal".
    // Everything from the first "TrueCap" on is about TrueCap, including a
    // closing sentence of its own ("Different STR lifecycle stages." placed
    // TrueCap as a stage of the short-term rental lifecycle).
    for (const slug of ["guesty", "hostaway", "hostfully", "lodgify", "airdna"]) {
      const { tagline } = bySlug(slug);
      const fromTrueCap = tagline.slice(tagline.indexOf("TrueCap"));
      expect(tagline, slug).toContain("TrueCap");
      expect(fromTrueCap, slug).not.toMatch(/\b(?:STRs?|short-term)\b/i);
    }
    // The two short-term slices compare the mode itself, so their cards name
    // it for what it is.
    for (const slug of ["dealcheck-for-short-term-rentals", "mashvisor-for-short-term-rentals"]) {
      expect(bySlug(slug).tagline, slug).toContain("TrueCap's beta revenue screen");
    }
  });
});
