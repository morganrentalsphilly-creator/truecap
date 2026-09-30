import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ArticleBody, ArticleEnd, ArticleMain, ArticlePage } from "@/components/marketing/article";
import { FaqSection } from "@/components/marketing/faq-section";
import { SourceFirstArticle } from "@/components/marketing/source-first-article";

/**
 * The shared article frame (components/marketing/article.tsx), the opt-in
 * `prose-ledger` typography (app/globals.css) and FaqSection's inline variant,
 * plus the SourceFirstArticle posts that render through them.
 */

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");
const count = (haystack: string, needle: string) => haystack.split(needle).length - 1;

const ARTICLE = {
  slug: "what-is-a-good-cap-rate",
  title: "What is a good cap rate? A property-specific framework",
  description: "There is no universal good cap rate.",
  publishedAt: "2026-05-24",
  modifiedAt: "2026-05-24",
  faqs: [
    { question: "How is cap rate calculated?", answer: "Divide modeled annual NOI by price." },
    { question: "Is a higher cap rate always better?", answer: "No." },
  ],
} as const;

describe("SourceFirstArticle renders in the article frame", () => {
  const html = renderToStaticMarkup(
    <SourceFirstArticle article={ARTICLE}>
      <p>Body.</p>
    </SourceFirstArticle>,
  );
  const mainStart = html.indexOf('<main id="main"');
  const mainEnd = html.indexOf("</main>");

  it("mounts the site header before <main> (the three posts had none)", () => {
    expect(mainStart).toBeGreaterThan(-1);
    const siteHeader = html.indexOf("<header");
    expect(siteHeader).toBeGreaterThan(-1);
    expect(siteHeader).toBeLessThan(mainStart);
    expect(html).toContain('<main id="main" tabindex="-1"');
  });

  it("puts the analyzer CTA after </main> and before the footer, once", () => {
    const cta = html.indexOf("Analyze a property free");
    expect(count(html, "Analyze a property free")).toBe(1);
    expect(cta).toBeGreaterThan(mainEnd);
    expect(cta).toBeLessThan(html.indexOf("data-site-footer"));
    expect(count(html, "data-disclaimer")).toBe(1);
  });

  it("links the hub under the H1 without an arrow; nothing sits above the H1", () => {
    const h1 = html.indexOf("<h1", mainStart);
    const postHeader = html.slice(html.indexOf("<header", mainStart), html.indexOf("</header>", mainStart));
    expect(postHeader).toMatch(/<a [^>]*href="\/blog"[^>]*>TrueCap Blog<\/a>/);
    expect(postHeader).not.toContain("←");
    expect(html.indexOf('href="/blog"', mainStart)).toBeGreaterThan(h1);
  });

  it("sets the body in prose-ledger and the FAQ as ruled rows under the one FAQPage node", () => {
    expect(html).toContain('class="prose prose-ledger max-w-none"');
    expect(html).not.toMatch(/prose-slate|prose-neutral/);
    const faq = html.slice(html.indexOf('id="source-first-faq"'), mainEnd);
    expect(faq).toContain('id="source-first-faq-heading"');
    expect(count(faq, "<details")).toBe(ARTICLE.faqs.length);
    expect(faq).not.toContain("mailto:");
    expect(count(html, '"@type":"FAQPage"')).toBe(1);
  });

  it("imports FaqSection without landing-sections' client islands", () => {
    // landing-sections.tsx imports HeroAddressForm; Next's client-entry pass
    // would ship it on every post that imported the FAQ from there.
    for (const path of ["components/marketing/source-first-article.tsx", "components/marketing/article.tsx", "components/marketing/faq-section.tsx"]) {
      expect(read(path), path).not.toMatch(/from "@\/components\/marketing\/(?:landing-sections|hero-address-form)"/);
    }
  });
});

describe("the article frame", () => {
  it("renders the root, main, reading column, end column and prose body", () => {
    const html = renderToStaticMarkup(
      <ArticlePage>
        <ArticleMain>
          <ArticleBody>
            <p>Text</p>
          </ArticleBody>
        </ArticleMain>
        <ArticleEnd>
          <p>After</p>
        </ArticleEnd>
      </ArticlePage>,
    );
    expect(html).toMatch(/^<div class="relative overflow-x-clip bg-background">/);
    expect(html).toMatch(/<main id="main" tabindex="-1" class="[^"]*mx-auto w-full max-w-7xl[^"]*"><div class="max-w-\[68ch\]">/);
    expect(html).toContain('<div class="prose prose-ledger max-w-none"><p>Text</p></div>');
    expect(html.indexOf("After")).toBeGreaterThan(html.indexOf("</main>"));
  });

  it("scopes every prose-ledger rule to .prose-ledger.prose and leaves .prose alone", () => {
    const css = read("app/globals.css");
    const start = css.indexOf("@utility prose-ledger {");
    expect(start).toBeGreaterThan(-1);
    // The block ends at the first line that closes it at column 0.
    const block = css.slice(start, css.indexOf("\n}\n", start));
    // Everything at the block's first nesting level that is not a comment or
    // a closing brace: an unscoped rule (`  a {`, `  :where(h2) {`) or a bare
    // declaration would compile to `.prose-ledger …` and escape both the
    // .prose pairing and the not-prose escape, so it must be caught here.
    const selectors = [...block.matchAll(/^ {2}([^\s}/][^{]*)\{/gm)].map((m) => m[1].trim());
    expect(selectors.length).toBeGreaterThan(8);
    for (const selector of selectors) expect(selector, selector).toMatch(/^&\.prose\b/);
    // Element rules keep the plugin's not-prose escape.
    for (const selector of selectors.filter((s) => s !== "&.prose")) {
      expect(selector, selector).toContain(':not(:where([class~="not-prose"], [class~="not-prose"] *))');
    }
    // No global redefinition of the plugin's classes.
    expect(css).not.toMatch(/^\s*\.prose(?:-slate|-neutral)?\s*[,{]/m);
    expect(css).not.toMatch(/@utility prose(?:-slate|-neutral)?\s*\{/);
  });
});

describe("FaqSection variant=inline", () => {
  const items = [
    { q: "Does the answer keep its link?", a: "Yes, see the NOI guide.", href: "/glossary/noi" },
  ];
  const html = renderToStaticMarkup(
    <FaqSection
      id="inline"
      variant="inline"
      heading="FAQ"
      items={items}
      contact={null}
      renderAnswer={(item) => (
        <>
          Yes, see the <a href={item.href}>NOI guide</a>.
        </>
      )}
    />,
  );

  it("sits in the column without a Section, outside the article's prose, on the 2px ink rule", () => {
    // data-faq-section: an AuthorBio after the list drops its top rule.
    expect(html).toMatch(/^<section id="inline" data-faq-section="" aria-labelledby="inline-heading" class="not-prose mt-16">/);
    expect(html).not.toContain("max-w-7xl");
    expect(html).toContain('<h2 id="inline-heading" class="font-display');
    expect(html).toContain('<div class="mt-8 border-t-2 border-foreground"><details');
    expect(html).not.toContain("mailto:");
  });

  it("adds no contact line unless one is passed (the section variant keeps its default)", () => {
    const bare = renderToStaticMarkup(<FaqSection variant="inline" heading="FAQ" items={items} structuredData={false} />);
    expect(bare).toContain("<details");
    expect(bare).not.toContain("mailto:");
    expect(bare).not.toContain("Still have a question?");
    const section = renderToStaticMarkup(<FaqSection heading="FAQ" items={items} structuredData={false} />);
    expect(section).toContain('href="mailto:hello@usetruecap.com"');
  });

  it("renders the answer's link while the FAQPage JSON-LD reads the plain answer", () => {
    expect(html).toContain('<a href="/glossary/noi">NOI guide</a>');
    expect(html).toContain("[&amp;_a]:tc-link");
    expect(html).toContain('"text":"Yes, see the NOI guide."');
  });
});
