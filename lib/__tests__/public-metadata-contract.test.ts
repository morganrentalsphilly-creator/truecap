import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import { OPEN_GRAPH_BASE } from "@/lib/seo/open-graph-base";

const ROOT = process.cwd();

const SURFACES = [
  {
    file: "app/page.tsx",
    path: "/",
    pageTitle: "Rental Property Calculator & Max Offer | TrueCap",
    socialTitle: "Rental Property Calculator & Max Offer | TrueCap",
    description:
      "Analyze a rental property from an address, edit every assumption, and see cash flow, cap rate, DSCR, cash-on-cash return, and a target-based Offer Ceiling.",
  },
  {
    file: "app/about/page.tsx",
    path: "/about",
    pageTitle: "About TrueCap",
    socialTitle: "About TrueCap",
    description:
      "How TrueCap is built by one rental investor, and why the analyzer uses editable assumptions, conservative defaults, and transparent formulas.",
  },
  {
    file: "app/why-truecap/page.tsx",
    path: "/why-truecap",
    pageTitle: "Why TrueCap for Rental Property Analysis",
    socialTitle: "Why TrueCap for Rental Property Analysis",
    description:
      "Compare TrueCap with spreadsheets and rental analysis tools, including workflow, assumptions, Offer Ceiling, reports, and where each approach fits.",
  },
  {
    file: "app/tools/rental-property-spreadsheet/page.tsx",
    path: "/tools/rental-property-spreadsheet",
    pageTitle: "Free Rental Property Analysis Spreadsheet",
    socialTitle: "Free Rental Property Analysis Spreadsheet | TrueCap",
    description:
      "Download a free Excel rental property analysis spreadsheet with cash flow, cap rate, cash-on-cash return, DSCR, and a 10-year projection. No email needed.",
  },
  {
    file: "app/vs/page.tsx",
    path: "/vs",
    pageTitle: "Rental Property Calculator Comparisons",
    socialTitle: "Rental Property Calculator Comparisons | TrueCap",
    description:
      "Compare TrueCap with rental property calculators, underwriting tools, marketplaces, and landlord software using side-by-side workflow reviews.",
  },
  {
    file: "app/blog/page.tsx",
    path: "/blog",
    pageTitle: "Rental Property Investing Blog",
    socialTitle: "Rental Property Investing Blog | TrueCap",
    description:
      "Practical guides to rental property analysis, financing, cash flow, taxes, and underwriting, with formulas, worked examples, and editable assumptions.",
  },
  {
    file: "app/markets/page.tsx",
    path: "/markets",
    pageTitle: "Rental Property Markets by City",
    socialTitle: "Rental Property Markets by City | TrueCap",
    description:
      "Browse ${ALL.length}+ U.S. city verification guides and analyze a supported address with editable assumptions.",
  },
] as const;

const read = (file: string): string => readFileSync(join(ROOT, file), "utf8");

function withoutComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

/** An `images` key, the way a metadata object names an image. */
const IMAGES_KEY = /\bimages\s*:/;
const IMAGES_KEYS = /\bimages\s*:/g;

function metadataSource(file: string): string {
  const source = readFileSync(join(ROOT, file), "utf8");
  const start = source.indexOf("export const metadata");
  const end = source.indexOf("\n};", start);
  expect(start, `${file} has no metadata export`).toBeGreaterThanOrEqual(0);
  expect(
    end,
    `${file} metadata object is not statically inspectable`,
  ).toBeGreaterThan(start);
  return source.slice(start, end);
}

describe("priority public metadata", () => {
  it("keeps every document title unique", () => {
    expect(new Set(SURFACES.map((surface) => surface.pageTitle)).size).toBe(
      SURFACES.length,
    );
  });

  it.each(SURFACES)(
    "$path has aligned canonical and social metadata",
    (surface) => {
      const source = metadataSource(surface.file);
      expect(source).toContain(surface.pageTitle);
      expect(source).toContain(`canonical: "${surface.path}"`);
      expect(source).toContain(`url: "${surface.path}"`);
      expect(source).toContain(`title: "${surface.socialTitle}"`);
      expect(source).toContain("twitter:");
      expect(source.split(surface.description)).toHaveLength(4);
    },
  );

  it("/analyze declares a complete share card (page-level openGraph replaces the root's)", () => {
    // A page-level `openGraph` object REPLACES app/layout.tsx's wholesale, so
    // the page carries its own type, site name and locale, and its own
    // `twitter` block, or the primary conversion page ships the root's
    // generic twitter:title (live on 2026-09-07). The image is the sibling
    // card file: the page names none, or Next would serve that one instead
    // (the June card was the preview of this page until 2026-10).
    const source = withoutComments(metadataSource("app/analyze/page.tsx"));
    expect(source).toContain('canonical: "/analyze"');
    expect(source).toContain('url: "/analyze"');
    expect(source).toContain('type: "website"');
    expect(source).toContain("...OPEN_GRAPH_BASE,");
    expect(source).not.toMatch(IMAGES_KEY);
    expect(source).toContain('card: "summary_large_image"');
    expect(
      source.split('title: "Analyze a Rental Property Free | TrueCap"'),
    ).toHaveLength(3);
    expect(existsSync(join(ROOT, "app/analyze/opengraph-image.tsx"))).toBe(true);
  });

  it("the /analyze and /pricing cards say what their pages say", () => {
    // Both cards were added in 2026-10 (their card URLs returned 404). A card
    // is copy nobody re-reads when the page changes, so each is held to its
    // page here: the /analyze card's line is the page's own Open Graph
    // description, and the /pricing card builds its headline and its trial
    // sentence from the constants the page reads, in the page's words.
    const analyzeCard = read("app/analyze/opengraph-image.tsx");
    const analyzePage = metadataSource("app/analyze/page.tsx");
    const analyzeLine =
      "Cash flow, DSCR, and the highest price that still meets your targets, from an address. No account.";
    expect(analyzeCard).toContain(analyzeLine);
    expect(analyzePage.split(analyzeLine)).toHaveLength(3);

    const pricingCard = read("app/pricing/opengraph-image.tsx");
    const pricingPage = read("app/pricing/page.tsx");
    for (const fragment of [
      "before you collect a dollar of rent.",
      "Complete a rental decision free, then create an account for a ${",
      "-day free trial with ${",
    ]) {
      expect(pricingCard, fragment).toContain(fragment);
      expect(pricingPage, fragment).toContain(fragment);
    }
    expect(pricingCard).toContain("PRICING_OUTCOME_EXAMPLE.overpayUsd");
    // No plan price and no hand-typed amount on the card.
    expect(withoutComments(pricingCard)).not.toMatch(/\$\d|\d\s*\/\s*mo\b/);
    expect(withoutComments(pricingPage)).toContain("...OPEN_GRAPH_BASE,");
  });

  it("keeps the now-indexable comparison hub free of a noindex override", () => {
    expect(metadataSource("app/vs/page.tsx")).not.toMatch(
      /robots:\s*\{[^}]*index:\s*false/,
    );
  });
});

/**
 * The social-card contract for the whole site.
 *
 * Next serves a page's sibling opengraph-image.tsx as og:image (and, through
 * its Open Graph fallback, twitter:image) ONLY when the page's own metadata
 * names no image. Until 2026-10 every page named "/home.jpg", so all 130 card
 * files answered 200 at their own URLs and none was ever the preview: the
 * June card was the link preview of the whole site. The other half matters as
 * much: a page-level `openGraph` replaces the root layout's wholesale, so a
 * page WITHOUT a card that drops its image ships no og:image at all.
 *
 * Checked on the source of every app page: a card file is its own route, so
 * the two halves cannot be seen from one rendered page.
 */
describe("social card contract", () => {
  function pageFiles(dir = "app"): string[] {
    return readdirSync(join(ROOT, dir), { withFileTypes: true }).flatMap(
      (entry) => {
        const path = `${dir}/${entry.name}`;
        if (entry.isDirectory()) return pageFiles(path);
        return entry.name === "page.tsx" ? [path] : [];
      },
    );
  }
  const hasCard = (page: string) =>
    existsSync(join(ROOT, dirname(page), "opengraph-image.tsx"));
  const visible = (file: string) => withoutComments(read(file));
  const setsOpenGraph = (source: string) => /\bopenGraph\s*:/.test(source);

  const PAGES = pageFiles();
  const WITH_CARD = PAGES.filter(hasCard);
  const WITHOUT_CARD = PAGES.filter((page) => !hasCard(page));

  /**
   * Pages that set a page-level openGraph and name no image on purpose.
   * /s/[token] is a private, noindexed share page with a "summary" card:
   * whether it should show an image is a product decision, not this test's.
   */
  const NO_IMAGE_BY_DESIGN = new Set(["app/s/[token]/page.tsx"]);

  it("walks the real tree (a walker that finds nothing guards nothing)", () => {
    expect(PAGES.length).toBeGreaterThan(150);
    expect(WITH_CARD.length).toBeGreaterThan(100);
    expect(WITHOUT_CARD).toContain("app/markets/page.tsx");
    expect(WITH_CARD).toContain("app/pricing/page.tsx");
    expect(WITH_CARD).toContain("app/analyze/page.tsx");
  });

  it("a page with its own card file names no image, so the card is served", () => {
    const offenders = WITH_CARD.filter((page) => IMAGES_KEY.test(visible(page)));
    expect(
      offenders,
      "these pages have a sibling opengraph-image.tsx and still set `images` in their metadata, so Next serves that image and never the card: remove the `images` key from openGraph and from twitter",
    ).toEqual([]);
  });

  it("a page without its own card that sets openGraph names an image", () => {
    const offenders = WITHOUT_CARD.filter((page) => {
      if (NO_IMAGE_BY_DESIGN.has(page)) return false;
      const source = visible(page);
      return setsOpenGraph(source) && !IMAGES_KEY.test(source);
    });
    expect(
      offenders,
      "these pages set a page-level openGraph, have no opengraph-image.tsx, and name no image: they would ship no og:image. Add a card file or keep the default image",
    ).toEqual([]);
  });

  it("every page that sets openGraph keeps a twitter block of its own", () => {
    // Without one the page inherits the ROOT twitter block: the root's
    // twitter:title and twitter:image ("/home.jpg") next to the page's own
    // og:title and og:image.
    const offenders = PAGES.filter((page) => {
      const source = visible(page);
      return setsOpenGraph(source) && !/\btwitter\s*:/.test(source);
    });
    expect(offenders).toEqual([]);
  });

  const builder = (file: string, name: string): string => {
    const source = read(file);
    const start = source.indexOf(`export function ${name}(`);
    const end = source.indexOf("\n}\n", start);
    expect(start, `${file} has no ${name}`).toBeGreaterThanOrEqual(0);
    expect(end).toBeGreaterThan(start);
    return withoutComments(source.slice(start, end));
  };
  const builderUsers = (name: string) =>
    PAGES.filter((page) => read(page).includes(`${name}(`));

  it("the article metadata builder names no image: every post it serves has a card", () => {
    const users = builderUsers("buildSourceFirstArticleMetadata");
    expect(users.length).toBeGreaterThan(0);
    expect(
      users.filter((page) => !hasCard(page)),
      "a post built by this helper has no opengraph-image.tsx and would ship no og:image",
    ).toEqual([]);
    expect(
      builder(
        "components/marketing/source-first-article.tsx",
        "buildSourceFirstArticleMetadata",
      ),
    ).not.toMatch(IMAGES_KEY);
  });

  it("the market metadata builder keeps the default image: no market page has a card", () => {
    const users = builderUsers("buildSafeMarketMetadata");
    expect(users.length).toBeGreaterThan(0);
    expect(users.filter(hasCard)).toEqual([]);
    const market = builder(
      "components/marketing/safe-market-page.tsx",
      "buildSafeMarketMetadata",
    );
    expect(market.match(IMAGES_KEYS) ?? []).toHaveLength(2);
    expect(market.split('"/home.jpg"')).toHaveLength(3);
  });

  it("the root layout names the default image and builds openGraph from the shared base", () => {
    const layout = withoutComments(metadataSource("app/layout.tsx"));
    expect(layout).toContain("...OPEN_GRAPH_BASE,");
    expect(layout.split('"/home.jpg"')).toHaveLength(3);
    // og:site_name and og:locale have one source. A page that types its own
    // is the drift the base exists to prevent.
    expect(OPEN_GRAPH_BASE).toEqual({ siteName: "TrueCap", locale: "en_US" });
    const typed = [...PAGES, "app/layout.tsx"].filter((file) =>
      /\b(?:siteName|locale)\s*:/.test(visible(file)),
    );
    expect(typed).toEqual([]);
  });

  it("a page with a card outside /vs and /blog carries the site name and locale", () => {
    // Page-level openGraph drops og:site_name and og:locale unless the page
    // spreads the base. The comparison pages and the blog posts are edited by
    // the weekly SEO loop and take the base in their own pass.
    const offenders = WITH_CARD.filter(
      (page) => !/^app\/(?:vs|blog)\//.test(page),
    ).filter((page) => {
      const source = visible(page);
      // The legacy /d share page builds a deliberately bare card.
      if (page === "app/d/[encoded]/page.tsx") return false;
      return setsOpenGraph(source) && !source.includes("...OPEN_GRAPH_BASE,");
    });
    expect(offenders).toEqual([]);
  });

  it("each persona card prints its page's own headline and lede", () => {
    // lib/og/persona-og-template.tsx says a wrapper passes "its page's own H1
    // and hero subhead, so the card cannot drift from the page". Nothing
    // held it to that: the /for-brrrr card still listed ARV as something the
    // analyzer covers after the page stopped saying so (2026-10 audit).
    const personaCards = PAGES.filter(
      (page) => /^app\/for-[^/]+\/page\.tsx$/.test(page) && hasCard(page),
    );
    expect(personaCards.length).toBeGreaterThanOrEqual(4);
    for (const page of personaCards) {
      const card = read(join(dirname(page), "opengraph-image.tsx"));
      const headline = /headline:\s*"([^"]+)"/.exec(card)?.[1];
      const subhead = /subhead:\s*"([^"]+)"/.exec(card)?.[1];
      expect(headline, `${page}: card headline`).toBeTruthy();
      expect(subhead, `${page}: card subhead`).toBeTruthy();
      // The page's source with inline wrappers taken out, so an H1 split
      // over a fragment, a <span> or a {" "} still reads as one sentence.
      // (Not every tag: the hero's title and lede are props of <PageHero>.)
      const text = read(page)
        .replace(/\{" "\}/g, " ")
        .replace(/<\/?span\b[^>]*>|<\/?>/g, " ")
        .replace(/\s+/g, " ");
      expect(text, `${page}: the card's headline is not the page's`).toContain(headline);
      expect(text, `${page}: the card's subhead is not the page's lede`).toContain(subhead);
    }
  });

  it("the default image is a 1200 x 630 JPEG", () => {
    // public/home.jpg is the image of every page without a card and of the
    // Article JSON-LD. Assert its measured size, not that the file exists.
    const bytes = readFileSync(join(ROOT, "public/home.jpg"));
    expect(bytes[0]).toBe(0xff);
    expect(bytes[1]).toBe(0xd8);
    let offset = 2;
    let size: { width: number; height: number } | null = null;
    while (offset + 9 < bytes.length) {
      if (bytes[offset] !== 0xff) break;
      const marker = bytes[offset + 1];
      const length = bytes.readUInt16BE(offset + 2);
      // SOF0..SOF15 carry the frame size, except DHT (C4), JPG (C8), DAC (CC).
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
        size = {
          height: bytes.readUInt16BE(offset + 5),
          width: bytes.readUInt16BE(offset + 7),
        };
        break;
      }
      offset += 2 + length;
    }
    expect(size).toEqual({ width: 1200, height: 630 });
  });
});
