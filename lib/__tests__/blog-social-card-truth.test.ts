import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * A blog post's social card (app/blog/<slug>/opengraph-image.tsx) is the
 * link preview of that post, so it may only say what the post says.
 *
 * The 2026-10 go-to-market audit found ten cards printing claims their posts
 * had already dropped (cap-rate and yield ranges, "25% contingency", "7 lies",
 * a bonus-depreciation "phase-down schedule"). The fact passes edit page.tsx
 * and nothing made them touch the card. These checks tie the two files
 * together: a card on the shared template, a headline the post carries, and
 * no figure the post does not print.
 */

const ROOT = process.cwd();
const BLOG = join(ROOT, "app/blog");
const read = (path: string) => readFileSync(join(ROOT, path), "utf8");

const SLUGS = readdirSync(BLOG)
  .filter((slug) => existsSync(join(BLOG, slug, "opengraph-image.tsx")))
  .sort();

const STRING = String.raw`"((?:[^"\\]|\\.)*)"`;

type Card = { section: string; tag: string; title: string; subline: string };

function cardOf(slug: string): Card {
  const source = read(`app/blog/${slug}/opengraph-image.tsx`);
  const call = /renderBlogOgImage\(\{([\s\S]*?)\}\)/.exec(source)?.[1] ?? "";
  const field = (name: keyof Card): string => {
    const value = new RegExp(String.raw`\b${name}:\s*${STRING}`).exec(call)?.[1];
    // A plain double-quoted literal, so this file can read it.
    expect(value, `${slug}: ${name} must be a plain string literal`).toBeTruthy();
    return (value ?? "").replace(/\\(.)/g, "$1");
  };
  return { section: field("section"), tag: field("tag"), title: field("title"), subline: field("subline") };
}

/** The post's source without block comments: what the page can render. */
function pageOf(slug: string): string {
  return read(`app/blog/${slug}/page.tsx`).replace(/\/\*[\s\S]*?\*\//g, "");
}

/** Every title the post gives itself: the H1, the SERP title, the article data. */
function pageTitles(page: string): string[] {
  const titles: string[] = [];
  const consts = new RegExp(String.raw`const (?:TITLE|TITLE_PLAIN|SERP_TITLE)\s*=\s*${STRING}`, "g");
  for (const match of page.matchAll(consts)) titles.push(match[1]);
  if (page.includes("buildSourceFirstArticleMetadata(")) {
    const fields = new RegExp(String.raw`\b(?:title|seoTitle):\s*${STRING}`, "g");
    for (const match of page.matchAll(fields)) titles.push(match[1]);
  }
  return titles.map((title) => title.replace(/\\(.)/g, "$1"));
}

/** A title without its year tag, with either separator, in one case. */
const plain = (title: string) =>
  title
    .replace(/\s+\(2026\)$/, "")
    .replace(/\s+—\s+/g, ": ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

/**
 * Cards whose headline is not one of the post's titles. Each pins the
 * headline and names the phrase in the post that carries it; when a rewrite
 * drops the phrase, or the headline changes, the card has to be re-read
 * against the post.
 */
const OWN_HEADLINES: Record<string, { headline: string; carriedBy: string }> = {
  "2-percent-rule-vs-1-percent-rule": {
    headline: "One screen, two bars: which one applies in 2026?",
    carriedBy: "the same rent-to-price screen at two bars",
  },
  "70-percent-rule-house-flipping": {
    headline: "How to calculate a 70%-rule price screen",
    carriedBy: "calculate a 70%-rule price screen",
  },
  "break-even-occupancy-rental-property": {
    headline: "How much vacancy can your rental survive?",
    carriedBy: "how much vacancy a rental can survive",
  },
  "cap-rate-vs-gross-yield": {
    headline: "Three quotes for the same building: which one to trust?",
    carriedBy: "three quotes for the same building",
  },
  "debt-to-income-ratio-investment-property": {
    headline: "How lenders count your rental income",
    carriedBy: "how lenders count rental income",
  },
  "exit-cap-rate-rental-property": {
    headline: "The number that sets your sale price",
    carriedBy: "the number that sets your sale price",
  },
  "negative-leverage-real-estate": {
    headline: "When borrowing lowers your return",
    carriedBy: "when borrowing lowers your return",
  },
  "operating-expense-ratio-rental-property": {
    headline: "How much of the rent survives to NOI",
    carriedBy: "cents survives as",
  },
  "return-on-equity-rental-property": {
    headline: "What is your rental's equity actually earning?",
    carriedBy: "what the equity trapped in a rental earns today",
  },
};

/** Dollar amounts, percentages, multiples, counts and years, as printed. */
const FIGURE = /\$?\d[\d,]*(?:\.\d+)?(?:%|K|x)?/g;

function figuresIn(text: string): string[] {
  return (text.match(FIGURE) ?? []).map((figure) => figure.replace(/,+$/, ""));
}

function printsFigure(page: string, figure: string): boolean {
  const escaped = figure.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // Not the tail or the head of a longer number: "5%" is not in "15%".
  return new RegExp(String.raw`(?<![\d.,$])${escaped}(?!\d)`).test(page);
}

describe("blog social cards say only what their posts say", () => {
  it("finds the cards", () => {
    expect(SLUGS.length).toBeGreaterThanOrEqual(73);
  });

  it("draws every card with the shared template", () => {
    for (const slug of SLUGS) {
      const source = read(`app/blog/${slug}/opengraph-image.tsx`);
      expect(source, `${slug} should use lib/og/blog-og-template`).toContain(
        'import { renderBlogOgImage, OG_SIZE } from "@/lib/og/blog-og-template";',
      );
      // A hand-drawn card is a second design and a place for copy to hide.
      expect(source, `${slug} draws its own image`).not.toContain("ImageResponse");
    }
  });

  it("headlines a card with one of the post's own titles, or a phrase the post carries", () => {
    for (const slug of SLUGS) {
      const card = cardOf(slug);
      const page = pageOf(slug);
      const headline = plain(card.title);
      const mirrors = pageTitles(page).some((title) => {
        const candidate = plain(title);
        return candidate === headline || candidate.startsWith(`${headline} `) || candidate.startsWith(`${headline}:`);
      });
      const own = OWN_HEADLINES[slug];
      if (own === undefined) {
        expect(mirrors, `${slug}: "${card.title}" is none of the post's titles`).toBe(true);
        continue;
      }
      expect(mirrors, `${slug} mirrors a post title now: drop it from OWN_HEADLINES`).toBe(false);
      expect(card.title, `${slug}: re-read the new headline against the post`).toBe(own.headline);
      expect(page.toLowerCase(), `${slug}: the post no longer says "${own.carriedBy}"`).toContain(
        own.carriedBy.toLowerCase(),
      );
    }
  });

  it("keeps OWN_HEADLINES to cards that exist", () => {
    for (const slug of Object.keys(OWN_HEADLINES)) expect(SLUGS, slug).toContain(slug);
  });

  it("prints no figure the post does not print", () => {
    const missing: string[] = [];
    for (const slug of SLUGS) {
      const card = cardOf(slug);
      const page = pageOf(slug);
      for (const figure of figuresIn(`${card.tag} ${card.title} ${card.subline}`)) {
        if (!printsFigure(page, figure)) missing.push(`${slug}: ${figure}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it("makes no claim about the post, its readers or a competitor that a card cannot carry", () => {
    for (const slug of SLUGS) {
      const card = cardOf(slug);
      const text = `${card.section} ${card.tag} ${card.title} ${card.subline}`;
      expect(text, slug).not.toMatch(/\bhonest/i);
      expect(text, slug).not.toMatch(/\bverified\b/i);
      expect(text, slug).not.toMatch(/often used together/i);
      expect(text, slug).not.toMatch(/\blive data\b/i);
      expect(text, slug).not.toMatch(/\bmost (?:investors|beginners|landlords|comparisons|pro formas)\b/i);
    }
  });
});

/**
 * Next 16 serves a route's opengraph-image file only when the page's own
 * metadata sets no `images` (mergeStaticMetadata in
 * next/dist/lib/metadata/resolve-metadata.js tests
 * `openGraph.hasOwnProperty("images")`), and a `twitter` block without
 * `images` inherits the Open Graph image. Until 2026-10 every post named
 * "/home.jpg" in both blocks, so all 73 cards returned 200 at their own URLs
 * and no page used one.
 */
describe("a blog post with its own card lets Next serve it", () => {
  function metadataOf(slug: string): string {
    const source = read(`app/blog/${slug}/page.tsx`);
    const start = source.indexOf("export const metadata");
    expect(start, `${slug} has no metadata export`).toBeGreaterThanOrEqual(0);
    if (/export const metadata = buildSourceFirstArticleMetadata\(ARTICLE\);/.test(source)) {
      const helper = read("components/marketing/source-first-article.tsx");
      const from = helper.indexOf("export function buildSourceFirstArticleMetadata");
      const to = helper.indexOf("\n}\n", from);
      expect(from, "the source-first metadata helper moved").toBeGreaterThanOrEqual(0);
      expect(to).toBeGreaterThan(from);
      // Without the helper's line comments, which explain the missing key.
      return helper.slice(from, to).replace(/^\s*\/\/.*$/gm, "");
    }
    const end = source.indexOf("\n};", start);
    expect(end, `${slug} metadata is not statically inspectable`).toBeGreaterThan(start);
    return source.slice(start, end);
  }

  it("sets no images in openGraph or twitter", () => {
    for (const slug of SLUGS) {
      const metadata = metadataOf(slug);
      expect(metadata, `${slug}: an images key hides the post's own card`).not.toMatch(/\bimages\b/);
      expect(metadata, slug).not.toContain("home.jpg");
    }
  });

  it("keeps an openGraph block and a large-image twitter block", () => {
    for (const slug of SLUGS) {
      const metadata = metadataOf(slug);
      expect(metadata, slug).toMatch(/openGraph:\s*\{/);
      expect(metadata, slug).toMatch(/twitter:\s*\{/);
      expect(metadata, slug).toContain('card: "summary_large_image"');
    }
  });
});
