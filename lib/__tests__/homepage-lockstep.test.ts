/**
 * `app/page.tsx` (static anon landing) and `app/home-authed/page.tsx` (the
 * dynamic signed-in variant that proxy.ts rewrites `/` to) must render the
 * SAME marketing sections for anonymous visitors.
 *
 * CLAUDE.md §3.1 calls this out explicitly, and the two files repeat the
 * warning in comments — but nothing enforced it. Adding a section to one and
 * forgetting the other produces a homepage that silently differs depending on
 * whether a Supabase auth cookie happens to be present, which is close to
 * impossible to notice in review and easy to notice in production.
 *
 * This guard compares the rendered marketing section list in both files.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();

/** Marketing sections that must appear on both homepages, in order. */
const SECTION_RE =
  /<(MarketingHero|FeaturedIn|WhyNotSpreadsheet|HowItWorks|DataSourcesSection|SocialProof|AcquisitionPipeline|PdfProUpsell|Personas|HomepageFaq)\s*\/>/g;

function sections(rel: string): string[] {
  const src = readFileSync(join(ROOT, rel), "utf8");
  return [...src.matchAll(SECTION_RE)].map((m) => m[1]);
}

describe("both homepages stay in lockstep", () => {
  it("render the same marketing sections in the same order", () => {
    const anon = sections("app/page.tsx");
    const authed = sections("app/home-authed/page.tsx");
    expect(anon.length).toBeGreaterThan(5); // sanity: the regex still matches
    expect(authed).toEqual(anon);
  });

  it("both import every section they render", () => {
    for (const rel of ["app/page.tsx", "app/home-authed/page.tsx"]) {
      const src = readFileSync(join(ROOT, rel), "utf8");
      for (const name of sections(rel)) {
        // MarketingHero has its own module; the rest come from landing-sections.
        expect(src, `${rel} renders <${name}/> without importing it`).toMatch(
          new RegExp(`\\b${name}\\b[^\\n]*\\n?[\\s\\S]{0,400}?from "@/components/marketing/`),
        );
      }
    }
  });
});
