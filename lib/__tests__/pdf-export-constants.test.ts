/**
 * Pins the PDF cache-version encoding (finding NT-3).
 *
 * The numeric pdf_snapshot_version column now stores a COMPOSITE of the
 * template version and every engine snapshot version that feeds the PDF's
 * numbers. These tests guarantee the properties the cache logic relies on:
 * legacy plain-template values can never match (one-time flush, no crash),
 * any single engine bump changes the composite (auto-invalidation), and the
 * value stays inside the Postgres `integer` column without a migration.
 */
import { describe, expect, it } from "vitest";

import {
  encodePdfCacheVersion,
  PDF_CACHE_VERSION,
  PDF_CACHE_VERSION_UNCACHEABLE,
  PDF_SNAPSHOT_VERSION,
} from "../pdf-export-constants";
import { EXIT_SCENARIOS_SNAPSHOT_VERSION } from "../exit-scenarios";
import { INVESTCALC_SCHEMA_VERSION } from "../investcalc-schema";
import { TAX_STRATEGY_SNAPSHOT_VERSION } from "../tax-strategy";
import { TEN_YEAR_PROJECTION_SNAPSHOT_VERSION } from "../ten-year-projections";

const CURRENT_COMPONENTS: readonly number[] = [
  PDF_SNAPSHOT_VERSION,
  INVESTCALC_SCHEMA_VERSION,
  TEN_YEAR_PROJECTION_SNAPSHOT_VERSION,
  TAX_STRATEGY_SNAPSHOT_VERSION,
  EXIT_SCENARIOS_SNAPSHOT_VERSION,
];

describe("PDF_CACHE_VERSION", () => {
  it("fits the existing numeric column (positive int, within Postgres integer)", () => {
    expect(Number.isSafeInteger(PDF_CACHE_VERSION)).toBe(true);
    expect(PDF_CACHE_VERSION).toBeGreaterThan(0);
    expect(PDF_CACHE_VERSION).toBeLessThanOrEqual(2_147_483_647);
    // Worst case (all five components at the radix ceiling) still fits, so a
    // future bump can never silently overflow the column.
    expect(encodePdfCacheVersion([49, 49, 49, 49, 49])).toBeLessThanOrEqual(2_147_483_647);
  });

  it("never matches a legacy plain template version (0-9) — old cached PDFs regenerate", () => {
    for (let legacy = 0; legacy <= 9; legacy++) {
      expect(PDF_CACHE_VERSION).not.toBe(legacy);
    }
  });

  it("is the deterministic encoding of the current template + engine versions", () => {
    expect(PDF_CACHE_VERSION).toBe(encodePdfCacheVersion([...CURRENT_COMPONENTS]));
  });

  it("changes when ANY component version bumps — engine fixes auto-invalidate cached PDFs", () => {
    for (let i = 0; i < CURRENT_COMPONENTS.length; i++) {
      const bumped = [...CURRENT_COMPONENTS];
      bumped[i] = bumped[i]! + 1;
      expect(encodePdfCacheVersion(bumped)).not.toBe(PDF_CACHE_VERSION);
    }
  });

  it("uncacheable sentinel (buy-box PDFs) can never match the composite", () => {
    // Buy-box-carrying PDFs are stored with this sentinel so the cache can
    // never serve them again (e.g. after the user deletes their last box).
    expect(PDF_CACHE_VERSION_UNCACHEABLE).not.toBe(PDF_CACHE_VERSION);
    // The composite is >= RADIX^4 whenever the template version is >= 1, so
    // the sentinel stays permanently un-matchable, like legacy plain values.
    expect(PDF_CACHE_VERSION_UNCACHEABLE).toBeLessThan(50 ** 4);
    expect(PDF_CACHE_VERSION).toBeGreaterThanOrEqual(50 ** 4);
  });

  it("rejects out-of-range components loudly instead of colliding", () => {
    expect(() => encodePdfCacheVersion([50, 0, 0, 0, 0])).toThrow(/out of range/);
    expect(() => encodePdfCacheVersion([-1, 0, 0, 0, 0])).toThrow(/out of range/);
    expect(() => encodePdfCacheVersion([1.5, 0, 0, 0, 0])).toThrow(/out of range/);
  });
});
