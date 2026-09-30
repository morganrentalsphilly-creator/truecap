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
    expect(meta).toMatch(/<a [^>]*href="\/blog"[^>]*>Blog<\/a> · [A-Z][a-z]{2} \d{1,2}, 2026 · 10 min read$/);
    expect(main).not.toContain("←");
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
