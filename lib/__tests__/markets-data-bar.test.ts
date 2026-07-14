/**
 * Minimum-data bar for the programmatic /markets/[city] pages.
 *
 * Rule (from the SEO growth audit): no market city ships below the data
 * bar. Every MARKET_CITIES slug MUST resolve real HUD Fair Market Rent
 * (hud-rents.ts — regenerate with `npm run build-market-rents` when a
 * city batch is added); SAFMR ZIP tables (safmr-rents.ts, via
 * `npm run build-market-safmr`) are conditional — HUD only publishes
 * Small Area FMRs for some entities — but every entry that exists must
 * be well-formed, and the question-first metadata title must fit the
 * SERP window for every city name.
 */

import { describe, it, expect } from "vitest";
import { MARKET_CITIES } from "@/lib/markets/cities";
import { CITY_GEO } from "@/lib/markets/city-geo";
import { HUD_RENTS } from "@/lib/markets/hud-rents";
import { SAFMR_RENTS } from "@/lib/markets/safmr-rents";
import {
  buildMarketCityDescription,
  buildMarketCityTitle,
  MARKET_TITLE_MAX,
} from "@/lib/markets/market-city-seo";

const slugs = new Set(MARKET_CITIES.map((c) => c.slug));

describe("markets data bar — HUD FMR (guaranteed)", () => {
  it("every market city has a CITY_GEO county mapping", () => {
    const missing = MARKET_CITIES.filter((c) => !CITY_GEO[c.slug]).map((c) => c.slug);
    expect(missing).toEqual([]);
  });

  it("every market city resolves a real HUD rent entry (no estimate fallbacks)", () => {
    const missing = MARKET_CITIES.filter((c) => !HUD_RENTS[c.slug]).map((c) => c.slug);
    // If this fails after adding cities: fix CITY_GEO for the listed slugs
    // and re-run `npm run build-market-rents` — do NOT ship on estimates.
    expect(missing).toEqual([]);
  });

  it("every HUD rent entry is plausible and current", () => {
    for (const c of MARKET_CITIES) {
      const hud = HUD_RENTS[c.slug]!;
      expect(hud.rent2br, c.slug).toBeGreaterThan(0);
      expect(hud.rent3br, c.slug).toBeGreaterThanOrEqual(hud.rent2br);
      expect(hud.year, c.slug).toBeGreaterThanOrEqual(2025);
    }
  });

  it("has no orphaned HUD entries for cities that no longer exist", () => {
    for (const slug of Object.keys(HUD_RENTS)) {
      expect(slugs.has(slug), `HUD_RENTS has stale slug "${slug}"`).toBe(true);
    }
  });
});

describe("markets data bar — SAFMR ZIP tables (conditional)", () => {
  it("every SAFMR entry belongs to a known market city", () => {
    for (const slug of Object.keys(SAFMR_RENTS)) {
      expect(slugs.has(slug), `SAFMR_RENTS has stale slug "${slug}"`).toBe(true);
    }
  });

  it("every SAFMR entry is well-formed, bounded, and sorted", () => {
    expect(Object.keys(SAFMR_RENTS).length).toBeGreaterThan(0);
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
    }
  });
});

describe("markets metadata — question-first title/description budgets", () => {
  it("title fits the ≤50-char pre-template budget for every city", () => {
    for (const c of MARKET_CITIES) {
      const title = buildMarketCityTitle(c.name);
      expect(title.length, `${c.slug}: "${title}"`).toBeLessThanOrEqual(MARKET_TITLE_MAX);
      expect(title).toContain(c.name);
      expect(title).toContain("2026");
    }
  });

  it("description stays ≤160 chars for every city and tone", () => {
    for (const c of MARKET_CITIES) {
      for (const tone of ["cashflow", "appreciation", "balanced", null] as const) {
        const d = buildMarketCityDescription(c.name, tone);
        expect(d.length, `${c.slug} (${tone})`).toBeLessThanOrEqual(160);
      }
    }
  });
});
