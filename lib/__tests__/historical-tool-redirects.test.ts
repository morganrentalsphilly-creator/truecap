import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  HISTORICAL_TOOL_PATHS,
  HISTORICAL_TOOL_REDIRECTS,
  type HistoricalToolSlug,
} from "@/lib/historical-tool-redirects";

const ROOT = process.cwd();
const HEALTHCHECK_SOURCE = readFileSync(
  join(ROOT, "scripts/seo/healthcheck.mjs"),
  "utf8",
);

const EXPECTED_REDIRECTS = {
  "rental-cash-flow-calculator": "/",
  "cap-rate-calculator": "/blog/how-to-calculate-cap-rate",
  "cash-on-cash-calculator": "/blog/how-to-calculate-cash-on-cash-return",
  "dscr-calculator": "/blog/how-to-calculate-dscr",
  "noi-calculator": "/blog/how-to-calculate-noi-rental-property",
  "roi-calculator": "/",
  "brrrr-calculator": "/blog/brrrr-method-explained",
  "house-hacking-calculator": "/for-house-hackers",
  "rental-property-tax-calculator": "/blog/rental-property-tax-deductions",
  "50-percent-rule-calculator": "/blog/50-percent-rule-rentals",
} as const satisfies Record<HistoricalToolSlug, string>;

function healthcheckRedirects(): Record<string, string> {
  const objectBody = HEALTHCHECK_SOURCE.match(
    /const HISTORICAL_TOOL_REDIRECTS\s*=\s*\{([\s\S]*?)\n\};/,
  )?.[1];
  expect(
    objectBody,
    "scripts/seo/healthcheck.mjs must declare HISTORICAL_TOOL_REDIRECTS",
  ).toBeDefined();

  return Object.fromEntries(
    [...objectBody!.matchAll(/"([^"]+)"\s*:\s*"([^"]+)"/g)].map(
      ([, source, destination]) => [source, destination],
    ),
  );
}

function pageSource(pathname: string): string {
  const relative =
    pathname === "/" ? "app/page.tsx" : `app${pathname}/page.tsx`;
  return readFileSync(join(ROOT, relative), "utf8");
}

function publicSourceFiles(directory: string): string[] {
  return readdirSync(join(ROOT, directory), { withFileTypes: true }).flatMap(
    (entry) => {
      const relative = join(directory, entry.name);
      if (entry.isDirectory()) return publicSourceFiles(relative);
      return /\.(?:tsx?|json)$/.test(entry.name) &&
        !/\.(?:test|spec)\./.test(entry.name)
        ? [relative]
        : [];
    },
  );
}

function declaresCanonicalPath(source: string, pathname: string): boolean {
  if (source.includes(`canonical: "${pathname}"`)) return true;
  const slug = pathname.split("/").filter(Boolean).at(-1);
  return Boolean(
    slug &&
    source.includes(`const SLUG = "${slug}"`) &&
    /canonical:\s*`\/[^`]*\$\{SLUG\}`/.test(source),
  );
}

describe("historical calculator redirects", () => {
  it("keeps the approved ten-route map exact", () => {
    expect(HISTORICAL_TOOL_REDIRECTS).toEqual(EXPECTED_REDIRECTS);
    expect(HISTORICAL_TOOL_PATHS).toHaveLength(10);
  });

  it("keeps the live healthcheck synchronized with every exact destination", () => {
    expect(healthcheckRedirects()).toEqual(
      Object.fromEntries(
        Object.entries(EXPECTED_REDIRECTS).map(([slug, destination]) => [
          `/tools/${slug}`,
          destination,
        ]),
      ),
    );
  });

  it("uses the shared destination at every historical page boundary", () => {
    for (const slug of Object.keys(
      EXPECTED_REDIRECTS,
    ) as HistoricalToolSlug[]) {
      const source = pageSource(`/tools/${slug}`);
      expect(source, slug).toMatch(
        new RegExp(
          `permanentRedirect\\(\\s*HISTORICAL_TOOL_REDIRECTS\\["${slug}"\\]`,
        ),
      );
    }
  });

  it("does not route rendered internal links or email CTAs through redirect sources", () => {
    const files = [
      ...publicSourceFiles("app"),
      ...publicSourceFiles("components"),
      ...publicSourceFiles("emails"),
      ...publicSourceFiles("email-templates"),
    ];
    const violations: string[] = [];

    for (const file of files) {
      const source = readFileSync(join(ROOT, file), "utf8");
      for (const slug of Object.keys(EXPECTED_REDIRECTS)) {
        const path = `/tools/${slug}`;
        if (
          source.includes(`href="${path}"`) ||
          source.includes(`"cta_url": "https://usetruecap.com${path}"`)
        ) {
          violations.push(`${file}: ${path}`);
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it("preserves each authored calculator behind its existing release gate", () => {
    for (const slug of Object.keys(
      EXPECTED_REDIRECTS,
    ) as HistoricalToolSlug[]) {
      if (slug === "rental-property-tax-calculator") continue;
      const source = pageSource(`/tools/${slug}`);
      const gate =
        slug === "brrrr-calculator"
          ? 'isFeatureEnabled("brrrr_strategy_model")'
          : `isCalculatorReleased("${slug}")`;
      expect(source, `${slug} lost its future release gate`).toContain(gate);
    }
  });

  it("points directly at existing, non-redirecting canonical pages", () => {
    for (const destination of new Set(Object.values(EXPECTED_REDIRECTS))) {
      const relative =
        destination === "/" ? "app/page.tsx" : `app${destination}/page.tsx`;
      expect(existsSync(join(ROOT, relative)), destination).toBe(true);
      const source = readFileSync(join(ROOT, relative), "utf8");
      expect(source, `${destination} creates a redirect chain`).not.toMatch(
        /\b(?:permanentRedirect|redirect)\s*\(/,
      );
      expect(
        declaresCanonicalPath(source, destination),
        `${destination} is not a self-canonical destination`,
      ).toBe(true);
    }
  });
});
