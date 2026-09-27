/**
 * Minimum-data bar for the /markets/<slug> pages (programmatic and bespoke).
 *
 * Rule (from the SEO growth audit): no market page ships below the data
 * bar. Every MARKET_CITIES slug and every bespoke metro MUST resolve real HUD
 * Fair Market Rent (hud-rents.ts — regenerate with `npm run
 * build-market-rents`), and every HUD row must be the figure HUD's own FY
 * documentation page shows for the row's FMR area (hud-fmr-areas.ts —
 * `node scripts/build-market-fmr-areas.ts`). SAFMR ZIP tables
 * (safmr-rents.ts, via `npm run build-market-safmr`) are conditional — HUD
 * only publishes Small Area FMRs for some entities — but every entry that
 * exists must be well-formed and match HUD's ZIP table, and the data-first
 * metadata title must fit the SERP window for every city name.
 */

import { describe, it, expect } from "vitest";
import { BESPOKE_MARKETS, MARKET_CITIES } from "@/lib/markets/cities";
import { CITY_GEO } from "@/lib/markets/city-geo";
import { HUD_FMR_AREAS, HUD_FMR_AREAS_RETRIEVED_AT } from "@/lib/markets/hud-fmr-areas";
import { HUD_RENTS } from "@/lib/markets/hud-rents";
import { SAFMR_RENTS, SAFMR_RENTS_RETRIEVED_AT } from "@/lib/markets/safmr-rents";
import {
  MARKET_DESCRIPTION_MAX,
  MARKET_TITLE_MAX,
  buildMarketCityDescription,
  buildMarketCityH1,
  buildMarketCityTitle,
} from "@/lib/markets/market-city-seo";
import { isIsoDate } from "@/lib/seo/site-path";

const PAGES = [
  ...MARKET_CITIES.map((c) => ({ slug: c.slug, name: c.name, stateCode: c.stateCode })),
  ...BESPOKE_MARKETS.map((m) => ({ slug: m.slug, name: m.name, stateCode: m.stateCode })),
];
const slugs = new Set(PAGES.map((c) => c.slug));

describe("markets data bar — HUD FMR (guaranteed)", () => {
  it("every market page (programmatic and bespoke) has a CITY_GEO county mapping", () => {
    const missing = PAGES.filter((c) => !CITY_GEO[c.slug]).map((c) => c.slug);
    expect(missing).toEqual([]);
  });

  it("every market page resolves a real HUD rent entry (no estimate fallbacks)", () => {
    const missing = PAGES.filter((c) => !HUD_RENTS[c.slug]).map((c) => c.slug);
    // If this fails after adding cities: fix CITY_GEO for the listed slugs
    // and re-run `npm run build-market-rents` — do NOT ship on estimates.
    expect(missing).toEqual([]);
  });

  it("every HUD rent entry is plausible, current and dated by its retrieval", () => {
    for (const c of PAGES) {
      const hud = HUD_RENTS[c.slug]!;
      expect(hud.rent2br, c.slug).toBeGreaterThan(0);
      expect(hud.rent3br, c.slug).toBeGreaterThanOrEqual(hud.rent2br);
      expect(hud.year, c.slug).toBeGreaterThanOrEqual(2025);
      expect(isIsoDate(hud.retrievedAt), `${c.slug} retrievedAt`).toBe(true);
      // A row cannot be fetched before the pipeline existed (git ab92536).
      expect(hud.retrievedAt >= "2026-06-20", c.slug).toBe(true);
    }
  });

  it("has no orphaned HUD entries for pages that no longer exist", () => {
    for (const slug of Object.keys(HUD_RENTS)) {
      expect(slugs.has(slug), `HUD_RENTS has stale slug "${slug}"`).toBe(true);
    }
  });
});

describe("markets data bar — HUD's own FMR area pages (hud-fmr-areas.ts)", () => {
  it("names the FMR area of every HUD row, with HUD's FY documentation page", () => {
    expect(isIsoDate(HUD_FMR_AREAS_RETRIEVED_AT)).toBe(true);
    for (const slug of Object.keys(HUD_RENTS)) {
      const area = HUD_FMR_AREAS[slug];
      expect(area, slug).toBeDefined();
      expect(area!.areaName.length, slug).toBeGreaterThan(3);
      const url = new URL(area!.sourceUrl);
      expect(url.protocol, slug).toBe("https:");
      expect(url.hostname, slug).toBe("www.huduser.gov");
      expect(url.pathname, slug).toBe(`/portal/datasets/fmr/fmrs/FY${area!.year}_code/${area!.year}summary.odn`);
    }
  });

  it("holds hud-rents.ts to the figures and fiscal year HUD's page shows (a refresh of one without the other fails)", () => {
    const mismatched = Object.entries(HUD_RENTS).flatMap(([slug, hud]) => {
      const area = HUD_FMR_AREAS[slug];
      return area && area.year === hud.year && area.rent2br === hud.rent2br && area.rent3br === hud.rent3br
        ? []
        : [`${slug}: HUD_RENTS FY${hud.year} ${hud.rent2br}/${hud.rent3br} vs HUD page ${area ? `FY${area.year} ${area.rent2br}/${area.rent3br}` : "missing"}`];
    });
    expect(mismatched).toEqual([]);
  });

  it("matches New England cities by their town, never by a neighbouring town in the county", () => {
    // HUD defines New England FMR areas by town. Matching the county gave these
    // three pages a neighbouring area's rent until 2026-09-27.
    expect(HUD_FMR_AREAS.worcester?.countyName).toMatch(/^Worcester city \(/);
    expect(HUD_FMR_AREAS.lowell?.countyName).toMatch(/^Lowell city \(/);
    expect(HUD_FMR_AREAS.manchester?.countyName).toMatch(/^Manchester city \(/);
    expect(HUD_RENTS.worcester).toMatchObject({ rent2br: 2056, rent3br: 2548 });
    expect(HUD_RENTS.lowell).toMatchObject({ rent2br: 2351, rent3br: 2819 });
    expect(HUD_RENTS.manchester).toMatchObject({ rent2br: 2037, rent3br: 2442 });
  });

  it("records the prior fiscal year from the same HUD page", () => {
    for (const [slug, area] of Object.entries(HUD_FMR_AREAS)) {
      if (!area.prior) continue;
      expect(area.prior.year, slug).toBe(area.year - 1);
      expect(area.prior.rent2br, slug).toBeGreaterThan(0);
      expect(area.prior.rent3br, slug).toBeGreaterThan(0);
    }
  });
});

describe("markets data bar — SAFMR ZIP tables (conditional)", () => {
  it("every SAFMR entry belongs to a known market page", () => {
    for (const slug of Object.keys(SAFMR_RENTS)) {
      expect(slugs.has(slug), `SAFMR_RENTS has stale slug "${slug}"`).toBe(true);
    }
  });

  it("every SAFMR entry is well-formed, bounded, sorted, and linked to HUD's ZIP table", () => {
    expect(Object.keys(SAFMR_RENTS).length).toBeGreaterThan(0);
    expect(isIsoDate(SAFMR_RENTS_RETRIEVED_AT)).toBe(true);
    for (const [slug, entry] of Object.entries(SAFMR_RENTS)) {
      expect(entry.areaName.length, slug).toBeGreaterThan(2);
      expect(entry.year, slug).toBeGreaterThanOrEqual(2025);
      expect(entry.rows.length, slug).toBeGreaterThanOrEqual(1);
      expect(entry.rows.length, slug).toBeLessThanOrEqual(12);
      expect(entry.zipCount, slug).toBeGreaterThanOrEqual(entry.rows.length);
      for (const row of entry.rows) {
        expect(row.zip, `${slug} zip`).toMatch(/^\d{5}$/);
        expect(row.rent2br, `${slug} ${row.zip}`).toBeGreaterThan(0);
        expect(row.rent3br, `${slug} ${row.zip}`).toBeGreaterThan(0);
      }
      // Sorted by 2BR rent descending — the render relies on it.
      for (let i = 1; i < entry.rows.length; i++) {
        expect(
          entry.rows[i]!.rent2br,
          `${slug} rows not sorted at index ${i}`
        ).toBeLessThanOrEqual(entry.rows[i - 1]!.rent2br);
      }
      // No duplicate ZIPs within a city.
      const zips = entry.rows.map((r) => r.zip);
      expect(new Set(zips).size, slug).toBe(zips.length);
      // scripts/build-market-fmr-areas.ts records HUD's ZIP-table URL only after
      // every sampled row matched it exactly.
      expect(HUD_FMR_AREAS[slug]?.safmrSourceUrl, slug).toMatch(/^https:\/\/www\.huduser\.gov\/portal\/datasets\/fmr\/fmrs\/FY\d{4}_code\//);
    }
  });
});

describe("markets metadata — data-first title/description budgets", () => {
  it("title is '{City}, {ST} Rental Market Data ({HUD FY})' within the ≤50-char budget for every page", () => {
    for (const c of PAGES) {
      const year = HUD_RENTS[c.slug]!.year;
      const title = buildMarketCityTitle(c.name, c.stateCode, year);
      expect(title.length, `${c.slug}: "${title}"`).toBeLessThanOrEqual(MARKET_TITLE_MAX);
      expect(title).toBe(`${c.name}, ${c.stateCode} Rental Market Data (${year})`);
      expect(buildMarketCityH1(c.name, c.stateCode, year)).toBe(title);
    }
  });

  it("takes the year from the HUD vintage it is given, never a typed or clock year", () => {
    expect(buildMarketCityTitle("Columbus", "OH", 2031)).toBe("Columbus, OH Rental Market Data (2031)");
    expect(buildMarketCityH1("Columbus", "OH", 2019)).toBe("Columbus, OH Rental Market Data (2019)");
    expect(buildMarketCityTitle("Columbus", "OH", null)).toBe("Columbus, OH Rental Market Data");
    // A name too long for the budget drops "Market", never the vintage.
    const long = buildMarketCityTitle("Aaaaaaaaaaaaaaaaaaaaaa", "OH", 2026);
    expect(long.length).toBeLessThanOrEqual(MARKET_TITLE_MAX);
    expect(long).toContain("(2026)");
  });

  it("description stays ≤160 chars and states the page's own HUD figures", () => {
    for (const c of PAGES) {
      const hud = HUD_RENTS[c.slug]!;
      const d = buildMarketCityDescription(c.name, c.stateCode, hud);
      expect(d.length, `${c.slug}: ${d}`).toBeLessThanOrEqual(MARKET_DESCRIPTION_MAX);
      expect(d).toContain(`FY${hud.year}`);
      expect(d).toContain(`$${hud.rent2br.toLocaleString("en-US")}`);
      expect(buildMarketCityDescription(c.name, c.stateCode, null).length).toBeLessThanOrEqual(MARKET_DESCRIPTION_MAX);
    }
  });
});
