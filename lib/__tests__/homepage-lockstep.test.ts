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

/**
 * The set of marketing components to compare is DERIVED, not hardcoded: it is
 * every symbol app/page.tsx imports from the marketing modules
 * (landing-sections + marketing-hero). An earlier version enumerated the
 * section names in a regex, which meant a NEW section added to one homepage
 * but not the allow-list was invisible to this guard — the exact drift it
 * exists to catch. Deriving from the imports closes that hole: add a section
 * and it is automatically compared.
 */
function marketingComponents(): string[] {
  const src = readFileSync(join(ROOT, "app/page.tsx"), "utf8");
  const names = new Set<string>();
  const importRe =
    /import\s+(?:\{([^}]+)\}|(\w+))\s+from\s+"@\/components\/marketing\/(?:landing-sections|marketing-hero)"/g;
  for (const m of src.matchAll(importRe)) {
    const body = m[1] ?? m[2] ?? "";
    for (const raw of body.split(",")) {
      const name = raw.replace(/\bas\b.*$/, "").trim();
      if (/^[A-Z]\w+$/.test(name)) names.add(name);
    }
  }
  return [...names];
}

function sections(rel: string): string[] {
  const src = readFileSync(join(ROOT, rel), "utf8");
  const known = marketingComponents();
  // Preserve render order by scanning the file for each known component's
  // self-closing tag.
  const found: { name: string; at: number }[] = [];
  for (const name of known) {
    const at = src.search(new RegExp(`<${name}\\s*/>`));
    if (at >= 0) found.push({ name, at });
  }
  return found.sort((a, b) => a.at - b.at).map((x) => x.name);
}

describe("both homepages stay in lockstep", () => {
  it("neither homepage imports the analyzer bundle (it lives at /analyze)", () => {
    for (const rel of ["app/page.tsx", "app/home-authed/page.tsx"]) {
      const src = readFileSync(join(ROOT, rel), "utf8");
      expect(src, rel).not.toContain("@/components/investcalc/investcalc-page");
    }
    // /analyze and the stale-cookie mirror share ONE props object.
    expect(readFileSync(join(ROOT, "app/analyze/page.tsx"), "utf8")).toContain(
      "ANON_ANALYZER_PROPS",
    );
    expect(readFileSync(join(ROOT, "app/home-authed/page.tsx"), "utf8")).toContain(
      "AnalyzePageContent",
    );
  });


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
