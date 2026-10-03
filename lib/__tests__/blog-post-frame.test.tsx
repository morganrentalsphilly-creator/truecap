import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import OnePercentRulePost from "@/app/blog/1-percent-rule-rental-property/page";
import { BlogStickyCta } from "@/components/marketing/blog-sticky-cta";

/**
 * A standalone post on the article frame (components/marketing/article.tsx).
 * /blog/1-percent-rule-rental-property is the reference post the SEO loop
 * copies (.claude/skills/seo-gap-article), so its frame is pinned here; the
 * source checks cover every post that moves onto the frame after it.
 */

const ROOT = process.cwd();
const read = (path: string) => readFileSync(join(ROOT, path), "utf8");
const count = (haystack: string, needle: string) => haystack.split(needle).length - 1;

const POST_FILES = readdirSync(join(ROOT, "app/blog"))
  .map((slug) => `app/blog/${slug}/page.tsx`)
  .filter((file) => existsSync(join(ROOT, file)));
const onFrame = (source: string) => /from "@\/components\/marketing\/article"/.test(source);

describe("BlogStickyCta on and off the article frame", () => {
  it("renders as before by default, and without its own column when ArticleEnd sets it", () => {
    const framed = renderToStaticMarkup(<BlogStickyCta inArticleColumn />);
    expect(framed).toMatch(/^<aside aria-label="Analyze your own deal"/);
    // A post not on the frame keeps the max-w-3xl column it had.
    expect(renderToStaticMarkup(<BlogStickyCta />)).toBe(`<div class="mx-auto max-w-3xl px-4 sm:px-6">${framed}</div>`);
  });

  it("a post on the frame mounts it inside ArticleEnd with inArticleColumn, and only such a post drops the column", () => {
    const framedPosts = POST_FILES.filter((file) => onFrame(read(file)));
    expect(framedPosts).toContain("app/blog/1-percent-rule-rental-property/page.tsx");
    for (const file of POST_FILES) {
      const source = read(file);
      if (onFrame(source)) {
        // Inside ArticleEnd a bare <BlogStickyCta /> nests its own gutters in the column (off the text's edge).
        expect(source, file).toMatch(/<ArticleEnd>\s*<BlogStickyCta inArticleColumn \/>\s*<\/ArticleEnd>/);
      } else {
        // Without ArticleEnd, inArticleColumn would run the CTA edge to edge.
        expect(source, file).not.toMatch(/<BlogStickyCta\b[^>]*\binArticleColumn\b/);
      }
    }
  });
});

describe("link text in posts", () => {
  it("never ends in an arrow (DESIGN.md: no arrow suffixes)", () => {
    // Ten posts closed their related links with " \u2192" until wave 6. An
    // arrow inside prose or a formula ("$31,200/year \u2192 GRM 8.0") is not
    // link text and is left alone.
    const ARROW_BEFORE_CLOSE = /(?:\u2192|\u00bb|&rarr;|-&gt;)\s*(?:\{" "\}\s*)?<\/(?:Link|IntentPrefetchLink|a)>/;
    for (const file of POST_FILES) expect(read(file), file).not.toMatch(ARROW_BEFORE_CLOSE);
  });
});

describe("/blog/1-percent-rule-rental-property renders in the article frame", () => {
  const source = read("app/blog/1-percent-rule-rental-property/page.tsx");
  const html = renderToStaticMarkup(<OnePercentRulePost />);
  const mainStart = html.indexOf('<main id="main"');
  const mainEnd = html.indexOf("</main>");
  const main = html.slice(mainStart, mainEnd);
  const h1 = html.indexOf("<h1", mainStart);

  it("mounts the site header before <main>, in the page container's reading column", () => {
    expect(mainStart).toBeGreaterThan(-1);
    expect(html.indexOf("<header")).toBeLessThan(mainStart);
    expect(html).toMatch(/<main id="main" tabindex="-1" class="[^"]*mx-auto w-full max-w-7xl[^"]*"><div class="max-w-\[68ch\]">/);
    expect(source).not.toContain("anonymousByDefault");
  });

  it("puts nothing above the H1 and the hub link in the meta line under it, without an arrow", () => {
    // Only the frame's wrappers sit between <main> and the H1: any eyebrow, kicker or back link
    // (a <div>, <span>, <p> or <a>, whatever its classes) breaks this.
    expect(html.slice(mainStart, h1)).toMatch(/^<main [^>]*><div class="max-w-\[68ch\]"><article><header class="[^"]*">$/);
    expect(html.slice(h1, html.indexOf("</h1>", h1))).toMatch(/^<h1 class="font-display [^"]*text-display-sm[^"]*lg:text-display[^"]*">/);
    const meta = html.slice(html.indexOf("</h1>", h1), html.indexOf("</p>", h1));
    // PUBLISHED_AT is 2026-06-23, formatted in UTC: a render west of UTC printed Jun 22.
    expect(meta).toMatch(/<a [^>]*href="\/blog"[^>]*>Blog<\/a> · Jun 23, 2026 · 10 min read$/);
    expect(main).not.toContain("←");
  });

  it("holds the one under-H1 analyze link in the header, after the byline and before the lede (P2-80)", () => {
    const header = html.slice(h1, html.indexOf("</header>", h1));
    const link = /<p class="mt-1 text-base"><a [^>]*href="\/analyze"[^>]*>Analyze a deal free<\/a><\/p>/g;
    const found = [...header.matchAll(link)];
    expect(found).toHaveLength(1);
    expect(found[0][0]).toContain('class="tc-link inline-flex min-h-11 items-center font-medium"');
    expect(found[0].index).toBeGreaterThan(header.indexOf("By <a"));
    expect(found[0].index).toBeLessThan(header.indexOf("Glance at a listing price"));
    expect(source).toMatch(/<BlogByline \/>\s*<UnderTitleAnalyzeLink \/>\s*<p className=\{ARTICLE_LEDE\}>/);
  });

  it("sets the body in prose-ledger with bare H2s", () => {
    expect(count(main, 'class="prose prose-ledger max-w-none"')).toBe(1);
    expect(count(main, 'class="prose prose-ledger max-w-none mt-16"')).toBe(1);
    const article = main.slice(0, main.indexOf("</article>"));
    expect(article).not.toMatch(
      /prose-neutral|prose-slate|font-extrabold|font-bold|text-(?:xs|2xs|3xs)\b|uppercase|tracking-wide(?:r|st)?\b/,
    );
    expect(main).toContain("<h2>What the 1% rule actually says</h2>");
    expect(main).toContain("<h2>The bottom line</h2>");
  });

  it("sets the compared figures in DM Mono, held with their term, and pass/fail in the verdict colors", () => {
    // JSX dropped the space at the line break after the colon ("price screen:100").
    // The rule-of-thumb price is a price screen, not an Offer Ceiling
    // (released-tool-surface-guards.test.ts holds that line).
    expect(main).toContain("price screen: <strong>100 × the monthly rent</strong>");
    const figure = (value: string) => `<span class="font-mono tabular-nums">${value}</span>`;
    for (const ratio of ["1.00%", "1.04%", "0.69%"]) expect(main).toContain(`<strong>${figure(ratio)}</strong>`);
    expect(count(main, '<span class="font-semibold text-positive">Passes</span>.')).toBe(2);
    expect(count(main, '<span class="font-semibold text-caution-text">Fails</span>.')).toBe(1);
    for (const [value, term] of [
      ["0.57%", " rent-to-price"],
      ["0.76%", " rent-to-price"],
      ["+$321", "/month"],
      ["~9%", " cash-on-cash return"],
      ["+$453", "/month"],
      ["~6.5%", " cash-on-cash return"],
    ]) {
      expect(main).toContain(`<strong class="whitespace-nowrap">${figure(value)}${term}</strong>.`);
    }
    // The page takes the ledger parts from the frame: the SEO loop's import allow-list has no @/components/ledger/*.
    expect(source).not.toMatch(/from "@\/components\/ledger\//);
  });

  it("renders the FAQ as ruled rows between the body and the bottom line, with the Census links, under one FAQPage", () => {
    const faqStart = main.indexOf('<section id="faq"');
    const faqEnd = main.indexOf("</section>", faqStart);
    const faq = main.slice(faqStart, faqEnd);
    expect(faqStart).toBeGreaterThan(main.indexOf("How to use the 1% rule without getting burned"));
    expect(faqEnd).toBeLessThan(main.indexOf("<h2>The bottom line</h2>"));
    expect(faq).toContain('<h2 id="faq-heading" class="font-display');
    expect(count(faq, "<details")).toBe(5);
    expect(faq).toContain('href="https://data.census.gov/api/access/data/table?id=ACSDT1Y2024.B25103&amp;g=010XX00US$0400000"');
    expect(faq).toContain('href="https://data.census.gov/api/access/data/table?id=ACSDT1Y2024.B25077&amp;g=010XX00US$0400000"');
    expect(faq).not.toContain("mailto:");
    expect(count(html, '"@type":"FAQPage"')).toBe(1);
  });

  it("puts the analyzer CTA after </main>, on the column's edge, before the footer; one Disclaimer; no newsletter mount", () => {
    expect(count(html, "Analyze a property free")).toBe(1);
    const cta = html.indexOf('<aside aria-label="Analyze your own deal"');
    expect(cta).toBeGreaterThan(mainEnd);
    expect(cta).toBeLessThan(html.indexOf("data-site-footer"));
    expect(html.slice(cta - '<div class="max-w-[68ch]">'.length, cta)).toBe('<div class="max-w-[68ch]">');
    expect(count(html, "data-disclaimer")).toBe(1);
    expect(source).not.toMatch(/NewsletterSignup|newsletter-signup/);
  });
});
