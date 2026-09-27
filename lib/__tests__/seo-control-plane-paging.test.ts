import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { assessPerformanceData, readAllPages } from "../../scripts/seo/performance-read.mjs";

const ROOT = join(import.meta.dirname, "../..");

/** A PostgREST stand-in: honours Range but never returns more than `maxRows`. */
function cappedServer(total: number, maxRows: number) {
  const rows = Array.from({ length: total }, (_, i) => ({ id: i }));
  const calls: Array<[number, number]> = [];
  const fetchPage = async (start: number, end: number) => {
    calls.push([start, end]);
    return rows.slice(start, Math.min(end + 1, start + maxRows));
  };
  return { fetchPage, calls };
}

describe("control-plane GSC read-back paging", () => {
  it("reads every row when the server caps pages below the requested size", async () => {
    // The production failure: 5,000 asked, 1,000 returned, loop stopped.
    const server = cappedServer(2_500, 1_000);
    const rows = await readAllPages(server.fetchPage, { pageSize: 5_000 });
    expect(rows).toHaveLength(2_500);
    expect(rows.map((r: { id: number }) => r.id)).toEqual(Array.from({ length: 2_500 }, (_, i) => i));
    // Offsets advance by what came back, not by the page size asked for.
    expect(server.calls.map(([start]) => start)).toEqual([0, 1_000, 2_000, 2_500]);
  });

  it("reads an exact multiple of the cap and an empty source", async () => {
    expect(await readAllPages(cappedServer(3_000, 1_000).fetchPage)).toHaveLength(3_000);
    expect(await readAllPages(cappedServer(0, 1_000).fetchPage)).toEqual([]);
  });

  it("treats a null page (204 / no body) as the end", async () => {
    expect(await readAllPages(async () => null)).toEqual([]);
  });

  it("refuses a partial read instead of returning a truncated set", async () => {
    const server = cappedServer(10_000, 1_000);
    await expect(readAllPages(server.fetchPage, { maxPages: 3 })).rejects.toThrow(/refusing a partial read/);
  });
});

describe("control-plane performance status", () => {
  const window = { currentFrom: "2026-08-28", currentTo: "2026-09-24", staleBefore: "2026-09-17" };

  it("is DEGRADED when only old rows came back (the 1,000-row symptom)", () => {
    const rows = [{ date: "2026-07-29" }, { date: "2026-08-10" }];
    const result = assessPerformanceData(rows, window);
    expect(result.available).toBe(false);
    expect(result.reason).toMatch(/stale/);
    expect(result.newestDate).toBe("2026-08-10");
  });

  it("is DEGRADED with no rows, and when the current window is empty", () => {
    expect(assessPerformanceData([], window)).toMatchObject({ available: false, currentWindowRows: 0 });
    // Fresh but outside the window (e.g. only data-lag days) is not usable either.
    const lagOnly = assessPerformanceData([{ date: "2026-09-26" }], window);
    expect(lagOnly).toMatchObject({ available: false, currentWindowRows: 0 });
    expect(lagOnly.reason).toMatch(/current window/);
  });

  it("is available when the current window has recent rows", () => {
    const rows = [{ date: "2026-08-01" }, { date: "2026-09-10" }, { date: "2026-09-24" }];
    expect(assessPerformanceData(rows, window)).toEqual({
      available: true,
      reason: null,
      newestDate: "2026-09-24",
      currentWindowRows: 2,
    });
  });
});

describe("control-plane.mjs uses the fixed read", () => {
  const source = readFileSync(join(ROOT, "scripts/seo/control-plane.mjs"), "utf8");
  const workflow = readFileSync(join(ROOT, ".github/workflows/seo-control-plane.yml"), "utf8");

  it("pages through readAllPages in primary-key order and gates SUCCEEDED on the assessment", () => {
    expect(source).toContain('from "./performance-read.mjs"');
    expect(source).toMatch(/readAllPages\(\(start, end\) => rest\(pathname/);
    expect(source).not.toMatch(/rows\.length < pageSize/);
    expect(source).toContain("&order=date.asc,query.asc,page.asc,device.asc,country.asc");
    expect(source).toMatch(/available: health\.available/);
    expect(source).toContain('output.status = output.performance.available ? "SUCCEEDED" : "DEGRADED"');
  });

  it("raises a DEGRADED cycle as an alert on the status issue", () => {
    expect(workflow).toMatch(/cycle\?\.status === 'DEGRADED' \? \[\{ severity: 'high', check: 'performance data degraded'/);
  });
});
