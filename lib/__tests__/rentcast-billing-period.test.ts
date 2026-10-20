import { describe, expect, it } from "vitest";
import {
  activePeriodsAt,
  anchorFor,
  currentPeriodAt,
  formatResumesOn,
  periodKeyFor,
  readRentCastPeriodConfig,
  resumesAtFor,
  type RentCastPeriodConfig,
} from "@/lib/property-enrichment/rentcast-billing-period";

/**
 * The RentCast billing period renews on the anchor day at an unknown time of
 * day and timezone. App periods run from the anchor day at 00:00 UTC to the
 * next anchor day at 00:00 UTC plus the overlap, and a request inside the
 * overlap counts against both periods. These are the pure functions the budget
 * module builds on; every case the spec names is pinned here.
 */

const CFG: RentCastPeriodConfig = { anchorDay: 19, overlapHours: 48 };
const utc = (iso: string) => new Date(iso);
const keys = (now: Date, cfg = CFG) => activePeriodsAt(now, cfg).map((p) => p.key);

describe("period config", () => {
  it("defaults to the 19th and 48 hours when nothing is set", () => {
    expect(readRentCastPeriodConfig({})).toEqual({ anchorDay: 19, overlapHours: 48 });
  });

  it("reads the env and clamps nonsense", () => {
    expect(
      readRentCastPeriodConfig({ RENTCAST_BILLING_ANCHOR_DAY: "31", RENTCAST_PERIOD_OVERLAP_HOURS: "24" })
    ).toEqual({ anchorDay: 31, overlapHours: 24 });
    expect(
      readRentCastPeriodConfig({ RENTCAST_BILLING_ANCHOR_DAY: "0", RENTCAST_PERIOD_OVERLAP_HOURS: "-5" })
    ).toEqual({ anchorDay: 1, overlapHours: 0 });
    expect(
      readRentCastPeriodConfig({ RENTCAST_BILLING_ANCHOR_DAY: "soon", RENTCAST_PERIOD_OVERLAP_HOURS: "" })
    ).toEqual({ anchorDay: 19, overlapHours: 48 });
  });
});

describe("the counter key", () => {
  it("is rentcast_requests_<anchor YYYY-MM-DD>", () => {
    expect(periodKeyFor(utc("2026-10-19T00:00:00Z"))).toBe("rentcast_requests_2026-10-19");
  });
});

describe("before and after the anchor", () => {
  it("the day before the anchor belongs to the previous period only (outside the overlap)", () => {
    expect(keys(utc("2026-10-18T23:59:59Z"))).toEqual(["rentcast_requests_2026-09-19"]);
  });

  it("the anchor instant opens the new period while the old one is still inside its overlap", () => {
    expect(keys(utc("2026-10-19T00:00:00Z"))).toEqual([
      "rentcast_requests_2026-09-19",
      "rentcast_requests_2026-10-19",
    ]);
  });

  it("the per-user period is the one whose anchor most recently passed", () => {
    expect(currentPeriodAt(utc("2026-10-19T00:00:00Z"), CFG).anchorIso).toBe("2026-10-19");
    expect(currentPeriodAt(utc("2026-10-18T23:59:59Z"), CFG).anchorIso).toBe("2026-09-19");
    expect(currentPeriodAt(utc("2026-10-20T12:00:00Z"), CFG).nextAnchor.toISOString()).toBe(
      "2026-11-19T00:00:00.000Z"
    );
  });
});

describe("inside and outside the overlap", () => {
  it("inside the 48h overlap a request belongs to two periods", () => {
    expect(keys(utc("2026-10-20T23:59:59Z"))).toEqual([
      "rentcast_requests_2026-09-19",
      "rentcast_requests_2026-10-19",
    ]);
  });

  it("the overlap ends exactly at anchor + overlap hours", () => {
    expect(keys(utc("2026-10-21T00:00:00Z"))).toEqual(["rentcast_requests_2026-10-19"]);
    expect(keys(utc("2026-11-05T12:00:00Z"))).toEqual(["rentcast_requests_2026-10-19"]);
  });

  it("a zero overlap never produces two periods", () => {
    const cfg = { anchorDay: 19, overlapHours: 0 };
    expect(keys(utc("2026-10-19T00:00:00Z"), cfg)).toEqual(["rentcast_requests_2026-10-19"]);
    expect(keys(utc("2026-10-18T23:59:59Z"), cfg)).toEqual(["rentcast_requests_2026-09-19"]);
  });

  it("a period's end is the next anchor plus the overlap, and a real period of any time-of-day fits inside it", () => {
    const [p] = activePeriodsAt(utc("2026-11-01T00:00:00Z"), CFG);
    expect(p.start.toISOString()).toBe("2026-10-19T00:00:00.000Z");
    expect(p.end.toISOString()).toBe("2026-11-21T00:00:00.000Z");
    // A real RentCast period that renewed at 23:00 US-Pacific on the 19th
    // (06:00 UTC on the 20th) and renews again 31 days later still sits
    // entirely inside [start, end).
    const realStart = utc("2026-10-20T06:00:00Z");
    const realEnd = utc("2026-11-20T06:00:00Z");
    expect(realStart.getTime()).toBeGreaterThanOrEqual(p.start.getTime());
    expect(realEnd.getTime()).toBeLessThan(p.end.getTime());
  });
});

describe("December into January", () => {
  it("rolls the year over", () => {
    expect(keys(utc("2026-12-25T00:00:00Z"))).toEqual(["rentcast_requests_2026-12-19"]);
    expect(keys(utc("2027-01-19T06:00:00Z"))).toEqual([
      "rentcast_requests_2026-12-19",
      "rentcast_requests_2027-01-19",
    ]);
    const dec = currentPeriodAt(utc("2026-12-25T00:00:00Z"), CFG);
    expect(dec.nextAnchor.toISOString()).toBe("2027-01-19T00:00:00.000Z");
    expect(dec.end.toISOString()).toBe("2027-01-21T00:00:00.000Z");
  });

  it("January's previous period is December of the prior year", () => {
    expect(keys(utc("2027-01-10T00:00:00Z"))).toEqual(["rentcast_requests_2026-12-19"]);
  });
});

describe("February and short months", () => {
  it("clamps an anchor of 31 to the last day of February (leap and non-leap)", () => {
    expect(anchorFor(2027, 1, 31).toISOString()).toBe("2027-02-28T00:00:00.000Z");
    expect(anchorFor(2028, 1, 31).toISOString()).toBe("2028-02-29T00:00:00.000Z");
    expect(anchorFor(2027, 3, 31).toISOString()).toBe("2027-04-30T00:00:00.000Z");
  });

  it("a 31st anchor: the February period runs Feb 28 → Mar 31 + overlap and January's ends Mar 2", () => {
    const cfg = { anchorDay: 31, overlapHours: 48 };
    const [jan, feb] = activePeriodsAt(utc("2027-02-28T12:00:00Z"), cfg);
    expect(jan.key).toBe("rentcast_requests_2027-01-31");
    expect(jan.end.toISOString()).toBe("2027-03-02T00:00:00.000Z");
    expect(feb.key).toBe("rentcast_requests_2027-02-28");
    expect(feb.nextAnchor.toISOString()).toBe("2027-03-31T00:00:00.000Z");
    expect(feb.end.toISOString()).toBe("2027-04-02T00:00:00.000Z");
  });

  it("a 19th anchor in February behaves like any other month", () => {
    expect(keys(utc("2027-02-19T00:00:00Z"))).toEqual([
      "rentcast_requests_2027-01-19",
      "rentcast_requests_2027-02-19",
    ]);
    expect(keys(utc("2027-02-21T00:00:00Z"))).toEqual(["rentcast_requests_2027-02-19"]);
    expect(currentPeriodAt(utc("2027-02-21T00:00:00Z"), cfg19()).end.toISOString()).toBe(
      "2027-03-21T00:00:00.000Z"
    );
  });
});

function cfg19() {
  return CFG;
}

describe("resumesAt", () => {
  it("is the moment every exhausted period has ended", () => {
    const [prev, cur] = activePeriodsAt(utc("2026-10-19T12:00:00Z"), CFG);
    // Only the old period is full: live comps come back when its overlap ends.
    expect(resumesAtFor([prev])!.toISOString()).toBe("2026-10-21T00:00:00.000Z");
    // The new period is full: back after ITS overlap.
    expect(resumesAtFor([cur])!.toISOString()).toBe("2026-11-21T00:00:00.000Z");
    // Both: the later of the two.
    expect(resumesAtFor([prev, cur])!.toISOString()).toBe("2026-11-21T00:00:00.000Z");
    expect(resumesAtFor([])).toBeNull();
  });

  it("formats as a short UTC calendar day", () => {
    expect(formatResumesOn(utc("2026-11-21T00:00:00Z"))).toBe("Nov 21");
    expect(formatResumesOn("2027-01-21T00:00:00.000Z")).toBe("Jan 21");
    expect(formatResumesOn("not a date")).toBe("soon");
  });
});
