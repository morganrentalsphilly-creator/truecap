/**
 * Tests for the stage-aware comps freshness windows (lib/comps-freshness) —
 * the display-only "Comps are N days old — refresh" hint. The windows and
 * the null-over-nonsense rules (no timestamp, future timestamp) are pinned
 * here so the hint can never scare users with a made-up age.
 */
import { describe, expect, it } from "vitest";

import {
  COMPS_FRESHNESS_WINDOW_DAYS,
  DEFAULT_COMPS_FRESHNESS_WINDOW_DAYS,
  getCompsFreshness,
} from "../comps-freshness";
import { PIPELINE_STAGES } from "../pipeline";

const NOW = new Date("2026-07-13T12:00:00.000Z");
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000).toISOString();

describe("COMPS_FRESHNESS_WINDOW_DAYS", () => {
  it("covers every pipeline stage with a positive window", () => {
    for (const s of PIPELINE_STAGES) {
      expect(COMPS_FRESHNESS_WINDOW_DAYS[s.id]).toBeGreaterThan(0);
    }
  });

  it("tightens as the deal nears a binding number", () => {
    expect(COMPS_FRESHNESS_WINDOW_DAYS.under_contract).toBeLessThan(
      COMPS_FRESHNESS_WINDOW_DAYS.offer
    );
    expect(COMPS_FRESHNESS_WINDOW_DAYS.offer).toBeLessThan(
      COMPS_FRESHNESS_WINDOW_DAYS.researching
    );
  });

  it("no stage window exceeds the no-stage default (the loosest)", () => {
    for (const s of PIPELINE_STAGES) {
      expect(COMPS_FRESHNESS_WINDOW_DAYS[s.id]).toBeLessThanOrEqual(
        DEFAULT_COMPS_FRESHNESS_WINDOW_DAYS
      );
    }
  });
});

describe("getCompsFreshness", () => {
  it("returns null with nothing truthful to say", () => {
    expect(getCompsFreshness(null, "analyzing", NOW)).toBeNull();
    expect(getCompsFreshness(undefined, null, NOW)).toBeNull();
    expect(getCompsFreshness("not-a-date", "analyzing", NOW)).toBeNull();
    // Future timestamp (clock skew) must not produce a scary warning.
    expect(getCompsFreshness(daysAgo(-1), "analyzing", NOW)).toBeNull();
  });

  it("computes whole-day age (floored)", () => {
    expect(getCompsFreshness(daysAgo(0.5), "analyzing", NOW)?.ageDays).toBe(0);
    expect(getCompsFreshness(daysAgo(30), "analyzing", NOW)?.ageDays).toBe(30);
  });

  it("goes stale at the stage's window, not before", () => {
    expect(getCompsFreshness(daysAgo(44), "analyzing", NOW)).toEqual({
      ageDays: 44,
      windowDays: 45,
      stale: false,
    });
    expect(getCompsFreshness(daysAgo(45), "analyzing", NOW)).toEqual({
      ageDays: 45,
      windowDays: 45,
      stale: true,
    });
  });

  it("the same age can be fresh while researching but stale under contract", () => {
    expect(getCompsFreshness(daysAgo(30), "researching", NOW)?.stale).toBe(false);
    expect(getCompsFreshness(daysAgo(30), "under_contract", NOW)?.stale).toBe(true);
  });

  it("uses the loosest window when the surface has no stage", () => {
    const f = getCompsFreshness(daysAgo(60), null, NOW);
    expect(f).toEqual({
      ageDays: 60,
      windowDays: DEFAULT_COMPS_FRESHNESS_WINDOW_DAYS,
      stale: false,
    });
    expect(getCompsFreshness(daysAgo(90), undefined, NOW)?.stale).toBe(true);
  });
});
