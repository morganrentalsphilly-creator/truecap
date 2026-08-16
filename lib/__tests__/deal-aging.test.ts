import { describe, expect, it } from "vitest";
import { DEAL_AGING_MIN_DAYS, DEAL_AGING_STAGES, daysSinceSaved } from "@/lib/deal-aging";

const DAY_MS = 86_400_000;

describe("deal-aging shared thresholds", () => {
  it("targets only the time-sensitive acquisition stages", () => {
    // The workspace DealAgingNudge and the dashboard aging line both consume
    // these — widening them silently changes two surfaces at once.
    expect(DEAL_AGING_STAGES).toEqual(["negotiating", "offer", "under_contract"]);
    expect(DEAL_AGING_MIN_DAYS).toBe(7);
  });
});

describe("daysSinceSaved", () => {
  const now = Date.parse("2026-07-13T12:00:00.000Z");

  it("floors to whole days since the save timestamp", () => {
    expect(daysSinceSaved(new Date(now - 9 * DAY_MS).toISOString(), now)).toBe(9);
    // 6.9 days is NOT 7 — the nudge threshold is whole elapsed days.
    expect(daysSinceSaved(new Date(now - 6.9 * DAY_MS).toISOString(), now)).toBe(6);
    expect(daysSinceSaved(new Date(now).toISOString(), now)).toBe(0);
  });

  it("returns null for missing or unparseable created_at", () => {
    expect(daysSinceSaved(null, now)).toBeNull();
    expect(daysSinceSaved(undefined, now)).toBeNull();
    expect(daysSinceSaved("", now)).toBeNull();
    expect(daysSinceSaved("not-a-date", now)).toBeNull();
  });
});
