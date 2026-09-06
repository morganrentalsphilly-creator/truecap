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
    // "max offer" query. Product UI and explanations still use the canonical
    // Offer Ceiling name.
    // The homepage OG card (app/og/home/route.tsx) carries the hero headline
    // verbatim — "Know your walk-away price before you make the offer." —
    // which the founder keeps; it is the same exception the config file
    // (lib/marketing-offer-config.ts) already enjoys by living outside the
    // customer-surface roots.
    expect(violations).toEqual([
      "app/og/home/route.tsx: walk-away price",
      "app/page.tsx: Max Offer",
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
});
