import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import sitemap, { SITE_OVERHAUL_LAST_MODIFIED } from "@/app/sitemap";
import { getRelatedContent, tokensOf } from "@/lib/related-content";
import { buildAggregateRating } from "@/lib/schema/aggregate-rating";

const ROOT = process.cwd();
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");

/** Phase 8 (docs/site-overhaul.md): structural SEO rules. */
describe("SEO contract", () => {
  it("gives every sitemap URL a lastmod", () => {
    const entries = sitemap();
    expect(entries.length).toBeGreaterThan(100);
    for (const entry of entries) {
      expect(entry.lastModified, entry.url).toBeTruthy();
    }
    expect(SITE_OVERHAUL_LAST_MODIFIED.toISOString().startsWith("2026-09-06")).toBe(true);
  });

  it("keeps aggregateRating out until five published numeric ratings exist", () => {
    expect(buildAggregateRating([])).toBeNull();
    expect(buildAggregateRating([{ rating: 5 }, { rating: 5 }, { rating: 5 }, { rating: 5 }])).toBeNull();
    expect(buildAggregateRating(Array.from({ length: 5 }, () => ({ rating: 4 })))).toMatchObject({ ratingValue: 4, reviewCount: 5 });
    for (const path of ["app/page.tsx", "app/pricing/page.tsx", "app/reviews/page.tsx", "app/layout.tsx"]) {
      expect(read(path), path).not.toContain("aggregateRating");
    }
  });

  it("related content is deterministic and links the right neighbours", () => {
    expect([...tokensOf("cap-rate-calculator")]).toEqual(expect.arrayContaining(["cap", "rate", "caprate"]));
    const tool = getRelatedContent({ kind: "tool", slug: "cap-rate-calculator", title: "Cap Rate Calculator" });
    expect(tool.some((l) => l.kind === "glossary" && l.href === "/glossary/cap-rate")).toBe(true);
    expect(tool.filter((l) => l.kind === "blog").length).toBeLessThanOrEqual(2);
    expect(tool.at(-1)).toEqual({ href: "/analyze", label: "Analyze a deal free", kind: "analyzer" });
    const vs = getRelatedContent({ kind: "vs", slug: "dealcheck" });
    expect(vs.map((l) => l.href)).toEqual(["/pricing", "/analyze?sample=1", "/analyze"]);
    const blog = getRelatedContent({ kind: "blog", slug: "what-is-a-good-dscr", title: "What is a good DSCR?" });
    expect(blog.filter((l) => l.kind === "tool").length).toBeLessThanOrEqual(1);
    expect(blog.some((l) => l.kind === "analyzer")).toBe(true);
  });

  it("keeps robots open to AI crawlers and llms.txt reachable", () => {
    const robots = read("app/robots.ts");
    for (const bot of ["GPTBot", "ClaudeBot", "PerplexityBot", "Google-Extended"]) expect(robots).toContain(bot);
    expect(robots).not.toMatch(/disallow:\s*\[?\s*"\/llms/i);
  });

  it("thin-page rule: markets and states index only with real data", () => {
    const indexability = read("lib/markets/indexability.ts");
    expect(indexability).toContain("export function isMarketIndexable");
    expect(indexability).toContain("export function isStateIndexable");
    const sitemapSource = read("app/sitemap.ts");
    expect(sitemapSource).toContain("isMarketIndexable");
    expect(sitemapSource).toContain("isStateIndexable");
  });
});
