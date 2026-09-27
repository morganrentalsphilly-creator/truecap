import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  WEEKS,
  WINDOW_DAYS,
  aggregateWeekly,
  aggregateWeeklyTotals,
  buildGscPull,
  mondayOf,
  normalizeDatePages,
  normalizePageQueries,
  normalizePages,
  offHostTally,
  pageOf,
  planPull,
  runPull,
  totalsFrom,
  weeklySpan,
} from "../../seo/scripts/gsc-pull.ts";
import type { PullRequest, PullResults } from "../../seo/scripts/gsc-pull.ts";
import type { AnalyticsRow } from "../../seo/scripts/lib/gsc.ts";
import { readJson, writeJson } from "../../seo/scripts/lib/io.ts";
import { addDays, datedDataPath, daysBetween, latestDataFile } from "../../seo/scripts/lib/paths.ts";

/**
 * Unit tests for seo/scripts/gsc-pull.ts — the pure transform from raw Search
 * Analytics rows to seo/data/gsc-<date>.json. No network: the API is replaced
 * by a fake query function, and the only process spawned is a --dry-run,
 * which must not need credentials.
 */

const ORIGIN = "https://usetruecap.com";
const SCRIPT = path.join(import.meta.dirname, "../../seo/scripts/gsc-pull.ts");

const row = (keys: string[], clicks: number, impressions: number, position: number): AnalyticsRow => ({
  keys,
  clicks,
  impressions,
  ctr: impressions ? clicks / impressions : 0,
  position,
});

const isMonday = (date: string): boolean => new Date(`${date}T00:00:00Z`).getUTCDay() === 1;

describe("mondayOf", () => {
  it("maps every day of an ISO week to its Monday", () => {
    for (const day of ["2026-09-21", "2026-09-22", "2026-09-24", "2026-09-26", "2026-09-27"]) {
      expect(mondayOf(day)).toBe("2026-09-21");
    }
    expect(mondayOf("2026-09-28")).toBe("2026-09-28");
  });

  it("crosses month and year boundaries", () => {
    expect(mondayOf("2026-01-01")).toBe("2025-12-29"); // a Thursday
    expect(mondayOf("2026-03-01")).toBe("2026-02-23"); // a Sunday
  });

  it("accepts an ISO timestamp and rejects garbage", () => {
    expect(mondayOf("2026-09-23T23:59:59Z")).toBe("2026-09-21");
    expect(() => mondayOf("not-a-date")).toThrow(/not a date/);
  });
});

describe("weeklySpan", () => {
  it("returns 16 contiguous Mondays ending with the last COMPLETE week before the data lag", () => {
    // Every anchor over three weeks: the last week must be complete (its Sunday
    // is on or before anchor − 3) and it must be the latest such week.
    for (let i = 0; i < 21; i += 1) {
      const anchor = addDays("2026-09-14", i);
      const lastDataDay = addDays(anchor, -3);
      const { weeks, window } = weeklySpan(anchor);
      expect(weeks).toHaveLength(WEEKS);
      expect(weeks.every(isMonday)).toBe(true);
      for (let w = 1; w < weeks.length; w += 1) expect(daysBetween(weeks[w - 1], weeks[w])).toBe(7);
      const lastSunday = addDays(weeks[weeks.length - 1], 6);
      expect(lastSunday <= lastDataDay).toBe(true);
      expect(addDays(lastSunday, 7) > lastDataDay).toBe(true);
      expect(window).toEqual({ startDate: weeks[0], endDate: lastSunday });
    }
  });

  it("pins the Monday-run case: a run on 2026-09-28 ends with the week of 2026-09-14", () => {
    const { weeks, window } = weeklySpan("2026-09-28");
    expect(weeks[weeks.length - 1]).toBe("2026-09-14");
    expect(weeks[0]).toBe("2026-06-01");
    expect(window.endDate).toBe("2026-09-20");
  });

  it("counts a week complete when the last finalised day is its Sunday", () => {
    expect(weeklySpan("2026-09-30").weeks.at(-1)).toBe("2026-09-21");
    expect(weeklySpan("2026-09-29").weeks.at(-1)).toBe("2026-09-14");
  });
});

describe("planPull", () => {
  const plan = planPull("sc-domain:usetruecap.com", "2026-09-28");

  it("uses two back-to-back 28-day windows ending three days before the anchor", () => {
    expect(plan.windows.current).toEqual({ startDate: "2026-08-29", endDate: "2026-09-25" });
    expect(daysBetween(plan.windows.current.startDate, plan.windows.current.endDate)).toBe(WINDOW_DAYS - 1);
    expect(daysBetween(plan.windows.prior.startDate, plan.windows.prior.endDate)).toBe(WINDOW_DAYS - 1);
    expect(addDays(plan.windows.prior.endDate, 1)).toBe(plan.windows.current.startDate);
  });

  it("makes the eight calls the artifact needs, with the right dimensions and windows", () => {
    const byName = Object.fromEntries(plan.calls.map((c) => [c.name, c.request]));
    expect(plan.calls.map((c) => c.name)).toEqual([
      "pages.current",
      "pages.prior",
      "pageQueries.current",
      "pageQueries.prior",
      "totals.current",
      "totals.prior",
      "weekly.datePage",
      "weekly.date",
    ]);
    expect(byName["pages.current"]).toEqual({ ...plan.windows.current, dimensions: ["page"] });
    expect(byName["pageQueries.prior"]).toEqual({ ...plan.windows.prior, dimensions: ["page", "query"] });
    expect(byName["totals.current"].dimensions).toEqual([]);
    expect(byName["weekly.datePage"]).toEqual({ ...plan.weeklyWindow, dimensions: ["date", "page"] });
    expect(byName["weekly.date"]).toEqual({ ...plan.weeklyWindow, dimensions: ["date"] });
    expect(plan.weeks).toEqual(weeklySpan("2026-09-28").weeks);
  });
});

describe("aggregateWeekly", () => {
  const weeks = ["2026-09-07", "2026-09-14"];

  it("sums clicks and impressions, recomputes CTR and weights position by impressions", () => {
    const out = aggregateWeekly(
      [
        { date: "2026-09-14", page: "/a", clicks: 1, impressions: 10, position: 4 },
        { date: "2026-09-20", page: "/a", clicks: 1, impressions: 30, position: 8 },
      ],
      weeks,
    );
    expect(out).toEqual([{ page: "/a", weekStart: "2026-09-14", clicks: 2, impressions: 40, ctr: 0.05, position: 7 }]);
  });

  it("drops rows outside the span and keeps pages and weeks apart, sorted by page then week", () => {
    const out = aggregateWeekly(
      [
        { date: "2026-09-21", page: "/a", clicks: 9, impressions: 9, position: 1 }, // week not in span
        { date: "2026-08-31", page: "/a", clicks: 9, impressions: 9, position: 1 }, // week not in span
        { date: "2026-09-15", page: "/b", clicks: 0, impressions: 5, position: 12 },
        { date: "2026-09-08", page: "/b", clicks: 1, impressions: 4, position: 3 },
        { date: "2026-09-09", page: "/a", clicks: 0, impressions: 2, position: 20 },
      ],
      weeks,
    );
    expect(out.map((r) => `${r.page}@${r.weekStart}`)).toEqual(["/a@2026-09-07", "/b@2026-09-07", "/b@2026-09-14"]);
    expect(out.reduce((sum, r) => sum + r.clicks, 0)).toBe(1);
  });

  it("does not let a low-impression day dominate the weekly position", () => {
    const [week] = aggregateWeekly(
      [
        { date: "2026-09-14", page: "/a", clicks: 0, impressions: 1, position: 90 },
        { date: "2026-09-15", page: "/a", clicks: 5, impressions: 499, position: 8 },
      ],
      weeks,
    );
    expect(week.position).toBeCloseTo((90 + 8 * 499) / 500, 3);
    expect(week.position).toBeLessThan(9);
  });
});

describe("aggregateWeeklyTotals", () => {
  it("returns every week in the span, zero-filled, so a silent week reads as zero traffic", () => {
    const weeks = ["2026-08-31", "2026-09-07", "2026-09-14"];
    const out = aggregateWeeklyTotals(
      [
        { date: "2026-09-14", clicks: 3, impressions: 100, position: 20 },
        { date: "2026-09-16", clicks: 1, impressions: 300, position: 10 },
        { date: "2026-09-22", clicks: 50, impressions: 50, position: 1 }, // outside the span
      ],
      weeks,
    );
    expect(out.map((w) => w.weekStart)).toEqual(weeks);
    expect(out[0]).toEqual({ weekStart: "2026-08-31", clicks: 0, impressions: 0, ctr: 0, position: 0 });
    expect(out[1].impressions).toBe(0);
    expect(out[2]).toEqual({ weekStart: "2026-09-14", clicks: 4, impressions: 400, ctr: 0.01, position: 12.5 });
  });
});

describe("host filtering and URL normalisation", () => {
  it("pageOf keeps only the canonical origin", () => {
    expect(pageOf("https://usetruecap.com/blog/x/", ORIGIN)).toBe("/blog/x");
    expect(pageOf("https://usetruecap.com/", ORIGIN)).toBe("/");
    expect(pageOf("https://usetruecap.com/#faq", ORIGIN)).toBe("/");
    expect(pageOf("https://www.usetruecap.com/blog/x", ORIGIN)).toBeNull();
    expect(pageOf("http://usetruecap.com/blog/x", ORIGIN)).toBeNull();
    expect(pageOf("https://truecap-preview.vercel.app/blog/x", ORIGIN)).toBeNull();
    expect(pageOf("not a url", ORIGIN)).toBeNull();
  });

  it("normalizePages merges URLs that collapse to one path and drops other hosts", () => {
    const { rows, dropped } = normalizePages(
      [
        row(["https://usetruecap.com/a"], 1, 10, 5),
        row(["https://usetruecap.com/a/"], 1, 30, 9),
        row(["https://usetruecap.com/b"], 0, 100, 30),
        row(["https://www.usetruecap.com/a"], 3, 50, 2),
        row(["http://usetruecap.com/a"], 0, 5, 2),
        row([], 0, 1, 1),
      ],
      ORIGIN,
    );
    expect(dropped).toBe(3);
    expect(rows).toEqual([
      { page: "/b", clicks: 0, impressions: 100, ctr: 0, position: 30 },
      { page: "/a", clicks: 2, impressions: 40, ctr: 0.05, position: 8 },
    ]);
  });

  it("normalizePageQueries merges per (page, query) and keeps distinct queries apart", () => {
    const { rows, dropped } = normalizePageQueries(
      [
        row(["https://usetruecap.com/a", "dscr calculator"], 0, 10, 12),
        row(["https://usetruecap.com/a/", "dscr calculator"], 1, 10, 8),
        row(["https://usetruecap.com/a", "cap rate"], 0, 30, 15),
        row(["https://www.usetruecap.com/a", "cap rate"], 0, 30, 15),
      ],
      ORIGIN,
    );
    expect(dropped).toBe(1);
    expect(rows).toEqual([
      { page: "/a", query: "cap rate", clicks: 0, impressions: 30, ctr: 0, position: 15 },
      { page: "/a", query: "dscr calculator", clicks: 1, impressions: 20, ctr: 0.05, position: 10 },
    ]);
  });

  it("normalizeDatePages reads [date, page] keys and drops bad dates and other hosts", () => {
    const { rows, dropped } = normalizeDatePages(
      [
        row(["2026-09-14", "https://usetruecap.com/a"], 1, 2, 3),
        row(["2026-09-14", "https://www.usetruecap.com/a"], 1, 2, 3),
        row(["yesterday", "https://usetruecap.com/a"], 1, 2, 3),
      ],
      ORIGIN,
    );
    expect(rows).toEqual([{ date: "2026-09-14", page: "/a", clicks: 1, impressions: 2, position: 3 }]);
    expect(dropped).toBe(2);
  });

  it("offHostTally counts off-host traffic per host, largest first", () => {
    const tally = offHostTally(
      [
        row(["https://usetruecap.com/a"], 5, 500, 3),
        row(["https://www.usetruecap.com/a"], 1, 20, 5),
        row(["https://www.usetruecap.com/b"], 0, 10, 5),
        row(["http://usetruecap.com/a"], 0, 40, 5),
      ],
      ORIGIN,
    );
    expect(tally).toEqual([
      { host: "usetruecap.com", rows: 1, clicks: 0, impressions: 40 },
      { host: "www.usetruecap.com", rows: 2, clicks: 1, impressions: 30 },
    ]);
  });

  it("totalsFrom passes the single no-dimension row through and zero-fills an empty pull", () => {
    expect(totalsFrom([row([], 24, 3033, 30.7)])).toEqual({ clicks: 24, impressions: 3033, ctr: 0.007913, position: 30.7 });
    expect(totalsFrom([])).toEqual({ clicks: 0, impressions: 0, ctr: 0, position: 0 });
  });
});

function fixtureResults(plan: ReturnType<typeof planPull>): PullResults {
  const lastWeek = plan.weeks[plan.weeks.length - 1];
  const firstWeek = plan.weeks[0];
  return {
    "pages.current": [
      row(["https://usetruecap.com/blog/dscr-loans"], 3, 274, 12.4),
      row(["https://usetruecap.com/"], 20, 900, 2.1),
      row(["https://www.usetruecap.com/"], 1, 12, 3),
    ],
    "pages.prior": [row(["https://usetruecap.com/blog/dscr-loans"], 1, 180, 14)],
    "pageQueries.current": [
      row(["https://usetruecap.com/blog/dscr-loans", "dscr loan"], 0, 120, 11),
      row(["https://usetruecap.com/", "truecap"], 18, 40, 1),
    ],
    "pageQueries.prior": [],
    "totals.current": [row([], 24, 1186, 7.5)],
    "totals.prior": [row([], 1, 180, 14)],
    "weekly.datePage": [
      row([lastWeek, "https://usetruecap.com/blog/dscr-loans"], 1, 60, 12),
      row([addDays(lastWeek, 6), "https://usetruecap.com/blog/dscr-loans"], 0, 20, 16),
      row([firstWeek, "https://usetruecap.com/"], 2, 50, 2),
      row([addDays(firstWeek, -1), "https://usetruecap.com/"], 99, 99, 1), // day before the span
      row([lastWeek, "https://www.usetruecap.com/"], 1, 1, 1),
    ],
    "weekly.date": [row([lastWeek], 1, 80, 13), row([firstWeek], 2, 50, 2)],
  };
}

describe("buildGscPull", () => {
  const plan = planPull("sc-domain:usetruecap.com", "2026-09-28");
  const { pull, droppedRows } = buildGscPull(plan, fixtureResults(plan), "https://usetruecap.com", "2026-09-28T09:41:00.000Z");

  it("produces the GscPull shape with paths, never full URLs", () => {
    expect(Object.keys(pull).sort()).toEqual(
      ["generatedAt", "offHost", "pageQueries", "pages", "site", "totals", "weekly", "weeklyTotals", "windows"].sort(),
    );
    expect(pull.site).toBe("sc-domain:usetruecap.com");
    expect(pull.windows).toEqual(plan.windows);
    const paths = [
      ...pull.pages.current.map((r) => r.page),
      ...pull.pageQueries.current.map((r) => r.page),
      ...pull.weekly.rows.map((r) => r.page),
    ];
    expect(paths.every((p) => p.startsWith("/"))).toBe(true);
  });

  it("keeps the page totals and the page+query rows as separate pulls", () => {
    expect(pull.pages.current[0]).toEqual({ page: "/", clicks: 20, impressions: 900, ctr: 0.022222, position: 2.1 });
    expect(pull.pages.current.find((r) => r.page === "/blog/dscr-loans")?.impressions).toBe(274);
    expect(pull.pageQueries.current.find((r) => r.page === "/blog/dscr-loans")?.impressions).toBe(120);
    expect(pull.pageQueries.prior).toEqual([]);
    expect(pull.totals.current.clicks).toBe(24);
    expect(pull.totals.prior.impressions).toBe(180);
  });

  it("buckets the daily rows into the planned weeks", () => {
    expect(pull.weekly.weeks).toEqual(plan.weeks);
    const lastWeek = plan.weeks[plan.weeks.length - 1];
    expect(pull.weekly.rows).toEqual([
      { page: "/", weekStart: plan.weeks[0], clicks: 2, impressions: 50, ctr: 0.04, position: 2 },
      { page: "/blog/dscr-loans", weekStart: lastWeek, clicks: 1, impressions: 80, ctr: 0.0125, position: 13 },
    ]);
    expect(pull.weeklyTotals).toHaveLength(WEEKS);
    expect(pull.weeklyTotals.at(-1)).toEqual({ weekStart: lastWeek, clicks: 1, impressions: 80, ctr: 0.0125, position: 13 });
    expect(pull.weeklyTotals.slice(1, -1).every((w) => w.impressions === 0)).toBe(true);
  });

  it("records off-host traffic instead of merging it into the canonical page", () => {
    expect(pull.offHost).toEqual([{ host: "www.usetruecap.com", rows: 1, clicks: 1, impressions: 12 }]);
    expect(droppedRows).toBe(2); // one from pages.current, one from weekly.datePage
  });

  it("round-trips through writeJson to the dated path latestDataFile finds", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "seo-gsc-pull-"));
    const previous = process.env.SEO_DATA_DIR;
    process.env.SEO_DATA_DIR = dir;
    try {
      const file = datedDataPath("gsc", "2026-09-28");
      writeJson(file, pull);
      expect(latestDataFile("gsc", "2026-09-28")).toBe(file);
      expect(readJson(file)).toEqual(pull);
    } finally {
      if (previous === undefined) delete process.env.SEO_DATA_DIR;
      else process.env.SEO_DATA_DIR = previous;
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("runPull", () => {
  it("issues every planned request in order and keys the rows by call name", async () => {
    const plan = planPull("sc-domain:usetruecap.com", "2026-09-28");
    const seen: PullRequest[] = [];
    const results = await runPull(plan, async (request) => {
      seen.push(request);
      return [row([String(seen.length)], 0, seen.length, 1)];
    });
    expect(seen).toEqual(plan.calls.map((c) => c.request));
    expect(results["pages.current"][0].impressions).toBe(1);
    expect(results["weekly.date"][0].impressions).toBe(8);
  });

  it("propagates an API failure instead of writing a partial pull", async () => {
    const plan = planPull("sc-domain:usetruecap.com", "2026-09-28");
    await expect(
      runPull(plan, async (request) => {
        if (request.dimensions.includes("query")) throw new Error("searchAnalytics page+query failed: HTTP 500");
        return [];
      }),
    ).rejects.toThrow(/page\+query failed/);
  });
});

describe("gsc-pull CLI", () => {
  let dataDir: string;
  beforeEach(() => {
    dataDir = mkdtempSync(path.join(tmpdir(), "seo-gsc-pull-cli-"));
  });
  afterEach(() => {
    rmSync(dataDir, { recursive: true, force: true });
  });

  it("--dry-run prints the plan without credentials and writes nothing", () => {
    const result = spawnSync(process.execPath, [SCRIPT, "--dry-run", "--site", "sc-domain:example.test"], {
      encoding: "utf8",
      env: {
        ...process.env,
        SEO_TODAY: "2026-09-28",
        SEO_DATA_DIR: dataDir,
        GSC_SERVICE_ACCOUNT_JSON: "",
        GSC_SERVICE_ACCOUNT_FILE: "",
      },
    });
    expect(result.status, result.stderr).toBe(0);
    const printed = JSON.parse(result.stdout) as { dryRun: boolean; site: string; calls: unknown[]; windows: unknown };
    expect(printed.dryRun).toBe(true);
    expect(printed.site).toBe("sc-domain:example.test");
    expect(printed.calls).toHaveLength(8);
    expect(printed.windows).toEqual(planPull("sc-domain:example.test", "2026-09-28").windows);
    expect(existsSync(dataDir) ? readdirSync(dataDir) : []).toEqual([]);
  });

  it("--self-test passes under plain node", () => {
    const result = spawnSync(process.execPath, [SCRIPT, "--self-test"], { encoding: "utf8" });
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain("self-test ok gsc-pull.ts");
  });
});
