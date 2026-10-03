import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { FEATURE_CATALOG } from "@/lib/entitlements-catalog";

/**
 * Go-to-market audit, first-screen rulings of 2026-10-03 (third round):
 * P1-03 co-branding is qualified, P1-64 the homepage's one-field form is the
 * first action on both audience pages, P2-19 no page states how long a
 * TrueCap analysis takes. The cue's position (P1-01) is held in
 * public-funnel-trust-guards.test.ts beside the hero's other lines.
 */

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");
const flat = (source: string) => source.replace(/\s+/g, " ");
const stripComments = (source: string) =>
  source
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, " ")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/^\s*\/\/.*$/gm, " ");

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(join(root, dir))) {
    if (name === "__tests__" || name === "node_modules") continue;
    const rel = `${dir}/${name}`;
    if (statSync(join(root, rel)).isDirectory()) out.push(...sourceFiles(rel));
    else if (/\.(ts|tsx)$/.test(name)) out.push(rel);
  }
  return out;
}

describe("co-branding in the hero names the plan it comes with (P1-03)", () => {
  it("Pro includes custom branding, so 'with Pro' is true", () => {
    expect(FEATURE_CATALOG.custom_branding.tiers).toContain("pro");
    expect(FEATURE_CATALOG.custom_branding.tiers).toContain("agent_pro");
  });

  it("neither hero says 'Send it co-branded' without the plan", () => {
    const home = flat(read("components/marketing/marketing-hero.tsx"));
    const agents = flat(read("app/for-agents/page.tsx"));
    expect(home).toContain("Send it co-branded with Pro.");
    expect(agents).toContain("Send it co-branded with Pro or Agent Pro;");
    for (const source of [home, agents]) {
      expect(source).not.toMatch(/Send it co-branded(?! with Pro)/);
    }
  });
});

describe("the audience pages open with the homepage's one-field form (P1-64)", () => {
  it.each(["app/for-agents/page.tsx", "app/for-investors/page.tsx"])(
    "%s mounts HeroAddressForm once, in the hero's actions, before any other action",
    (path) => {
      const source = stripComments(read(path));
      expect(source).toContain('import { HeroAddressForm } from "@/components/marketing/hero-address-form";');
      const mounts = [...source.matchAll(/<HeroAddressForm\b[^>]*\/>/g)];
      expect(mounts).toHaveLength(1);
      // The homepage's own component in its hero placement: a class for the
      // slot's margin and nothing else (no placement, no new prop).
      expect(mounts[0][0]).toBe('<HeroAddressForm className="mt-0 sm:mt-0" />');
      const heroStart = source.search(/<PageHero\b/);
      const actionsAt = source.indexOf("actions={", heroStart);
      const noteAt = source.indexOf("note={", heroStart);
      expect(heroStart).toBeGreaterThan(-1);
      expect(mounts[0].index).toBeGreaterThan(actionsAt);
      expect(mounts[0].index).toBeLessThan(noteAt);
      // First in the slot: no link or button precedes the form.
      expect(source.slice(actionsAt, mounts[0].index)).not.toMatch(/<(?:Link|a|button|TrackedMarketingLink|IntentPrefetchLink)\b/);
      // The page adds no field and no capture of its own.
      expect(source).not.toMatch(/<(?:input|form|textarea|select)\b/);
    },
  );

  it("the form is still one address field with the homepage's placeholder and handoff", () => {
    const form = stripComments(read("components/marketing/hero-address-form.tsx"));
    expect(form.match(/<AddressAutocomplete\b/g)).toHaveLength(1);
    expect(form).not.toMatch(/<input\b|type="email"/);
    expect(form).toContain('placeholder="Address or listing link"');
    expect(form).toContain('action="/analyze"');
    expect(form).toContain('router.push("/analyze")');
  });

  it("/for-agents still redirects while Agent Pro is not configured", () => {
    const agents = read("app/for-agents/page.tsx");
    expect(agents).toMatch(/if \(!agentProConfigured\) \{?\s*permanentRedirect\(/);
  });
});

describe("no page states how long a TrueCap analysis takes (P2-19)", () => {
  // /pricing, /terms and /privacy belong to other packages; the two posts
  // whose slug carries "60 seconds" teach a manual screen and keep their
  // title and method (the product's own timing is not claimed in them).
  const SKIP = /^app\/(?:pricing|terms|privacy)\/|^app\/blog\/(?:how-to-underwrite-a-rental-property-in-60-seconds|spot-bad-rental-in-60-seconds)\//;
  const files = [...sourceFiles("app"), ...sourceFiles("components"), ...sourceFiles("lib")].filter(
    (file) => !SKIP.test(file),
  );

  // The sentences this ruling removed, in every form the site carried.
  const RETIRED: RegExp[] = [
    /in about 60 seconds/i,
    /Run a deal — 60 seconds/,
    /60 seconds, no signup/,
    /Underwrite rentals in 60 seconds/,
    /60-second (?:analysis|analyzer|underwrite\.|answer)/i,
    /(?:Run a real|Try a) deal in 60 seconds|same analysis in 60 seconds|side by side in about 60 seconds/,
    /TrueCap<\/Link> in 60 seconds|60 seconds via TrueCap|underwrite leads in 60 seconds/,
    /number in 30 seconds/,
    /in about (?:two|four) minutes/,
    /about two minutes for the real/,
    /takes about a minute (?:per property|in the)/,
    /in about a minute instead of half an hour/,
    /Both promise underwriting in seconds/,
    /in [35] seconds/,
  ];

  it("none of the retired speed sentences is back", () => {
    const hits: string[] = [];
    for (const file of files) {
      const text = flat(stripComments(read(file)));
      for (const pattern of RETIRED) {
        const match = pattern.exec(text);
        if (match) hits.push(`${file}: ${text.slice(Math.max(0, match.index - 40), match.index + 60).trim()}`);
      }
    }
    expect(hits).toEqual([]);
  });

  it("the first-screen surfaces carry no time figure at all", () => {
    for (const file of [
      "components/marketing/marketing-hero.tsx",
      "components/marketing/site-footer.tsx",
      "components/marketing/seo-analyzer-cta.tsx",
      "app/for-agents/page.tsx",
      "app/for-investors/page.tsx",
      "app/for-investors/opengraph-image.tsx",
      "app/about/page.tsx",
      "app/not-found.tsx",
      "app/llms.txt/route.ts",
      "app/vs/page.tsx",
    ]) {
      const text = flat(stripComments(read(file)))
        // A link to the post named "…in 60 seconds" and its link text are the
        // post's name, not a claim about the product.
        .replace(/href="\/blog\/[^"]*60-seconds"/g, " ")
        .replace(/60-second underwriting workflow/g, " ");
      expect(text, file).not.toMatch(/\b\d+[- ]seconds?\b|\bin seconds\b|about a minute|\b(?:two|four) minutes\b/i);
    }
  });
});
