import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

import { UNRELEASED_UNDERWRITING_CALCULATORS } from "@/lib/calculator-registry";
import { resolveFeatureFlags } from "@/lib/feature-flags";
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

/**
 * Go-to-market audit 2026-10, row P1-51. The ten pages are prerendered, so
 * their permanentRedirect() answered with a fixed Location and dropped the
 * query string: an ad click arrived with no gclid and no utm_ value. Redirects
 * declared in next.config.mjs run before the page and pass the query through
 * (node_modules/next/dist/docs/01-app/03-api-reference/05-config/
 * 01-next-config-js/redirects.md: "any query values provided in the request
 * will be passed through to the redirect destination"; measured on production
 * for /guarantee, which is declared the same way).
 */
describe("historical calculator redirects keep the query string", () => {
  type ConfigRedirect = {
    source: string;
    destination: string;
    permanent?: boolean;
    statusCode?: number;
  };
  const FLAG_ENV = "NEXT_PUBLIC_TRUECAP_BRRRR_STRATEGY_MODEL";
  const TEN_SOURCES = [
    "/tools/rental-cash-flow-calculator",
    "/tools/cap-rate-calculator",
    "/tools/cash-on-cash-calculator",
    "/tools/dscr-calculator",
    "/tools/noi-calculator",
    "/tools/roi-calculator",
    "/tools/brrrr-calculator",
    "/tools/house-hacking-calculator",
    "/tools/rental-property-tax-calculator",
    "/tools/50-percent-rule-calculator",
  ];

  /** next.config.mjs redirects() with the BRRRR flag set to `flag` (unset when undefined). */
  async function configRedirects(flag?: string): Promise<ConfigRedirect[]> {
    vi.stubEnv(FLAG_ENV, flag);
    const config = (await import("../../next.config.mjs")).default as {
      redirects: () => Promise<ConfigRedirect[]>;
    };
    return config.redirects();
  }
  const toolRedirects = (redirects: ConfigRedirect[]) =>
    redirects.filter((entry) => TEN_SOURCES.includes(entry.source));

  afterEach(() => vi.unstubAllEnvs());

  it("pins the ten sources", () => {
    expect([...HISTORICAL_TOOL_PATHS]).toEqual(TEN_SOURCES);
  });

  it("declares all ten at the config level: same destination, same 308, nothing but a path", async () => {
    const redirects = await configRedirects();
    expect(toolRedirects(redirects).map((entry) => entry.source)).toEqual(TEN_SOURCES);
    for (const entry of toolRedirects(redirects)) {
      const slug = entry.source.replace("/tools/", "") as HistoricalToolSlug;
      // Exactly these three keys: `permanent: true` is the 308 the page's
      // permanentRedirect() sent, and no `has`/`missing` condition narrows it.
      expect(entry, entry.source).toEqual({
        source: entry.source,
        destination: EXPECTED_REDIRECTS[slug],
        permanent: true,
      });
      // A query-free destination: Next appends the request's own query. A
      // destination that carried one would be merged with it.
      expect(entry.destination, entry.source).not.toMatch(/[?#]/);
    }
    // No source is declared twice (the first match would win silently).
    const sources = redirects.map((entry) => entry.source);
    expect(new Set(sources).size).toBe(sources.length);
  });

  it("redirects only what the page's own release gate redirects", async () => {
    // A config redirect runs before the page and would shadow a released
    // calculator, so releasing a slug must take it out of next.config.mjs.
    // Eight are held back in code, one page redirects unconditionally, and
    // BRRRR follows its flag (next case).
    const gatedInCode = new Set<string>(UNRELEASED_UNDERWRITING_CALCULATORS);
    for (const entry of toolRedirects(await configRedirects())) {
      const slug = entry.source.replace("/tools/", "");
      if (slug === "brrrr-calculator") continue;
      expect(
        slug === "rental-property-tax-calculator" || gatedInCode.has(slug),
        `${slug} is released: remove it from RETIRED_TOOL_REDIRECTS in next.config.mjs`,
      ).toBe(true);
    }
    expect(gatedInCode.size + 2).toBe(TEN_SOURCES.length);
  });

  it("reads the BRRRR flag exactly as lib/feature-flags.ts does", async () => {
    const values = [undefined, "", "0", "false", "off", "no", "disabled", "nonsense", "1", "true", "TRUE", " on ", "yes", "enabled"];
    const releasedCount = values.filter(
      (value) => resolveFeatureFlags({ brrrr_strategy_model: value }).brrrr_strategy_model,
    ).length;
    expect(releasedCount).toBe(6);
    for (const value of values) {
      const released = resolveFeatureFlags({ brrrr_strategy_model: value }).brrrr_strategy_model;
      const sources = toolRedirects(await configRedirects(value)).map((entry) => entry.source);
      expect(sources.includes("/tools/brrrr-calculator"), JSON.stringify(value)).toBe(!released);
      expect(sources, JSON.stringify(value)).toHaveLength(released ? 9 : 10);
    }
  });
});
