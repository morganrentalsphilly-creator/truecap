import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import * as Article from "@/components/marketing/article";
import { PageHero, UnderTitleAnalyzeLink } from "@/components/marketing/page-parts";
import { ToolFormula } from "@/components/tools/tool-parts";

/**
 * The shared parts the template fan-out (fix batch 20) builds on, added to
 * the article frame (components/marketing/article.tsx) and the page parts
 * (components/marketing/page-parts.tsx): the one under-H1 analyze link (audit
 * row P2-80), the formula and table parts a post needs, and the second meta
 * line. A post imports them from the frame, inside the SEO loop's import
 * fence (seo/config.json paths.importAllow).
 */

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");
const count = (haystack: string, needle: string) => haystack.split(needle).length - 1;

const LINK_HTML = renderToStaticMarkup(<UnderTitleAnalyzeLink />);

describe("UnderTitleAnalyzeLink", () => {
  it("is one plain Signal Blue text link to /analyze with a 44px target, not a button", () => {
    expect(LINK_HTML).toMatch(/^<p class="mt-1 text-base"><a [^>]*>Analyze a deal free<\/a><\/p>$/);
    expect(LINK_HTML).toContain('href="/analyze"');
    expect(LINK_HTML).toContain('class="tc-link inline-flex min-h-11 items-center font-medium"');
    expect(count(LINK_HTML, "<a ")).toBe(1);
    expect(LINK_HTML).not.toMatch(/<button|<form|<input|bg-primary|rounded|shadow|uppercase|→/);
  });

  it("is the same part from the frame and from the page parts", () => {
    expect(Article.UnderTitleAnalyzeLink).toBe(UnderTitleAnalyzeLink);
  });

  it("sits as PageHero's action under the lede, with the slot's own spacing", () => {
    const html = renderToStaticMarkup(
      <PageHero title="T" lede="L" actions={<UnderTitleAnalyzeLink />}>
        <p>After</p>
      </PageHero>,
    );
    const h1 = html.indexOf("<h1");
    const link = html.indexOf(LINK_HTML);
    expect(link).toBeGreaterThan(html.indexOf(">L</p>"));
    expect(link).toBeGreaterThan(h1);
    expect(link).toBeLessThan(html.indexOf("<p>After</p>"));
    expect(html).toContain(`<div class="mt-6 sm:mt-7">${LINK_HTML}</div>`);
  });
});

describe("the frame's parts for converted posts", () => {
  it("re-exports the calculator template's ToolFormula unchanged", () => {
    expect(Article.ToolFormula).toBe(ToolFormula);
  });

  it("sets a second meta line in the meta line's own style, 4px under the first", () => {
    expect(Article.ARTICLE_META).toBe("mt-4 text-sm text-muted-foreground");
    expect(Article.ARTICLE_META_NEXT).toBe("mt-1 text-sm text-muted-foreground");
  });

  it("wraps a prose table in ScrollX: scrolls in the column, pins the first column on the paper", () => {
    const table = (
      <table>
        <thead>
          <tr>
            <th>Metric</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Cap rate</td>
            <td>6%</td>
          </tr>
        </tbody>
      </table>
    );
    const html = renderToStaticMarkup(<Article.ArticleTable label="Data table">{table}</Article.ArticleTable>);
    const region = /^<div class="([^"]*)">(<table>[\s\S]*<\/table>)<\/div>$/.exec(html);
    expect(region, html).not.toBeNull();
    const classes = region![1].replaceAll("&amp;", "&").split(" ");
    expect(classes).toContain("overflow-x-auto");
    for (const cell of ["td", "th"]) {
      expect(classes).toContain(`[&_table_${cell}:first-child]:sticky`);
      expect(classes).toContain(`[&_table_${cell}:first-child]:bg-background`);
    }
    // cn() (tailwind-merge) drops ScrollX's raised card and band for the pinned cells.
    expect(classes).not.toContain("[&_table_td:first-child]:bg-card");
    expect(classes).not.toContain("[&_table_th:first-child]:bg-muted");
    // The table stays bare and inside the prose, so prose-ledger styles it.
    expect(html).not.toContain("not-prose");
    expect(region![2]).not.toMatch(/class=/);

    const loose = renderToStaticMarkup(
      <Article.ArticleTable label="Data table" stickyFirstColumn={false}>
        {table}
      </Article.ArticleTable>,
    );
    expect(loose).toMatch(/^<div class="overflow-x-auto"><table>/);
  });

  it("keeps the frame inside the SEO loop's import fence", () => {
    const config = JSON.parse(read("seo/config.json")) as { paths: { importAllow: string[] } };
    expect(config.paths.importAllow).toContain("@/components/marketing/*");
    expect(config.paths.importAllow).not.toContain("@/components/tools/*");
    // The reference post imports its parts from the frame only.
    const post = read("app/blog/1-percent-rule-rental-property/page.tsx");
    expect(post).not.toMatch(/from "@\/components\/(?:tools|ledger)\//);
  });

  it("passes verify-static's whole-file rules on the reference post with the new import", async () => {
    const { wholeFileViolations } = await import("../../seo/scripts/verify-static.ts");
    const file = "app/blog/1-percent-rule-rental-property/page.tsx";
    expect(wholeFileViolations(file, read(file)).map((v) => `${v.rule} ${v.detail}`)).toEqual([]);
  }, 60_000);
});
