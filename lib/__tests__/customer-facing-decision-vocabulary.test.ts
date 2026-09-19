import { readdirSync, readFileSync } from "node:fs";
import { extname, join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const CUSTOMER_SURFACE_ROOTS = ["app", "components", "emails"] as const;
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".json"]);

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return SOURCE_EXTENSIONS.has(extname(entry.name)) ? [path] : [];
  });
}

function withoutComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

describe("customer-facing decision vocabulary", () => {
  it("keeps legacy calculation names internal while rendered copy uses Offer Ceiling", () => {
    const forbidden = [
      /\b(?:maximum|max)(?: allowable)? offer\b/i,
      /\bprice ceiling\b/i,
      /\bMAO\b/,
      /what should i offer/i,
      /what\s+to\s+offer/i,
      /walk[- ]away price/i,
    ];
    const violations: string[] = [];

    for (const root of CUSTOMER_SURFACE_ROOTS) {
      for (const file of sourceFiles(join(ROOT, root))) {
        const visibleSource = withoutComments(readFileSync(file, "utf8"));
        for (const pattern of forbidden) {
          const match = visibleSource.match(pattern);
          if (match) {
            violations.push(`${relative(ROOT, file)}: ${match[0]}`);
          }
        }
      }
    }

    // Phase-4 search metadata intentionally targets the established
    // "max offer" query on both versions of the homepage. Product UI and explanations still use the canonical
    // Offer Ceiling name.
    // The homepage OG card (app/og/home/route.tsx) carries the hero headline
    // verbatim — "Know your walk-away price before you make the offer." —
    // which the founder keeps; it is the same exception the config file
    // (lib/marketing-offer-config.ts) already enjoys by living outside the
    // customer-surface roots.
    // 2026-09-18 positioning pass (founder brief): Offer Ceiling may be
    // explained in one line as "your walk-away price based on your targets",
    // and the Pro tier's outcome tagline is "Know what to offer" (Free —
    // screen the deal; Agent Pro — win investor clients). Those two phrases
    // are allowed on exactly these marketing surfaces; the product UI still
    // names the number Offer Ceiling only.
    expect(violations).toEqual([
      "app/about/page.tsx: walk-away price",
      "app/auth/sign-up/page.tsx: walk-away price",
      "app/home-authed/page.tsx: Max Offer",
      "app/og/home/route.tsx: walk-away price",
      "app/page.tsx: Max Offer",
      "app/pricing/page.tsx: what to offer",
      "app/pricing/page.tsx: walk-away price",
      "components/marketing/landing-sections.tsx: what to offer",
      "components/marketing/landing-sections.tsx: walk-away price",
      "components/marketing/pricing-toggle-plans.tsx: what to offer",
      "components/marketing/pricing-toggle-plans.tsx: walk-away price",
    ]);
  });

  it("uses Deal score as the one public name for the secondary score", () => {
    // docs/voice.md term map: "Screening Index" is retired customer-facing
    // vocabulary; the one public name is "Deal score" (0–100).
    const violations: string[] = [];
    for (const root of CUSTOMER_SURFACE_ROOTS) {
      for (const file of sourceFiles(join(ROOT, root))) {
        const visibleSource = withoutComments(readFileSync(file, "utf8"));
        const match = visibleSource.match(/\bScreening Index\b/i);
        if (match) violations.push(`${relative(ROOT, file)}: ${match[0]}`);
      }
    }

    expect(violations).toEqual([]);
  });
  it("uses plain target and Buy Box language in reusable marketing copy", () => {
    for (const path of [
      "components/marketing/comparison-faq.tsx",
      "components/marketing/seo-analyzer-cta.tsx",
      "components/marketing/landing-sections.tsx",
      "lib/marketing-offer-config.ts",
      "emails/lifecycle-content/pro-nudge.json",
    ]) {
      expect(withoutComments(readFileSync(join(ROOT, path), "utf8")), path)
        .not.toMatch(/selected targets|rule-fit/i);
    }
  });

});
