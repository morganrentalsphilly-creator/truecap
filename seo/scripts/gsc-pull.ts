/**
 * gsc-pull — the Search Analytics read every other SEO-loop script scores on.
 *
 * Writes seo/data/gsc-<date>.json (`GscPull` in lib/types.ts):
 *   - the last 28 days and the 28 before, by page and by page+query, plus
 *     property totals for both windows;
 *   - the last 16 complete ISO weeks by page (a date+page pull bucketed to the
 *     Monday of each week) for decay and persistence, and site totals for the
 *     same weeks (a date-only pull) for the week-over-week brake.
 *
 * Load-bearing constraints:
 *   - `pages` and `pageQueries` are separate pulls ON PURPOSE. Google drops
 *     anonymized queries from any pull that has the query dimension, so the
 *     page+query rows sum lower than the page rows. `pages` is the page total;
 *     `pageQueries` is only for query-level reasoning.
 *   - Only `site.base` URLs are kept. The domain property also reports www. and
 *     http:// variants; merging them into the canonical page would hide a host
 *     leak, so they are dropped, counted, logged and recorded under `offHost`
 *     (a local extension of GscPull).
 *   - Weeks are COMPLETE ISO weeks ending on or before the last finalised day
 *     (DATA_LAG_DAYS). A partial trailing week reads as a traffic drop and
 *     would trip the site-wide brake on the data lag alone.
 *   - Weekly (and merged-URL) position is impression-weighted. A plain mean of
 *     daily positions lets a day with 1 impression at position 90 count as
 *     much as a day with 500 impressions at position 8.
 *   - main() only fetches. The whole transform (`buildGscPull`) is pure so the
 *     tests pin it without the network.
 *
 * Flags: --site <property> (default config site.gscProperty), --dry-run (print
 * the windows and the call plan; no credentials, no API calls, no writes).
 */

import { check, flagString, hasFlag, log, runMain } from "./lib/cli.ts";
import type { Args } from "./lib/cli.ts";
import { loadConfig } from "./lib/config.ts";
import { DATA_LAG_DAYS, gscSession, gscWindow, searchAnalytics } from "./lib/gsc.ts";
import type { AnalyticsRow, DateWindow } from "./lib/gsc.ts";
import { writeJson } from "./lib/io.ts";
import { addDays, datedDataPath, repoRelative, today } from "./lib/paths.ts";
import { toPath } from "./lib/sitemap.ts";
import type { GscPull, Metric, PageMetric, PageQueryMetric, WeeklyPageMetric } from "./lib/types.ts";

/** The brief's comparison window: the last 28 days vs the 28 before. */
export const WINDOW_DAYS = 28;
/** The brief's decay span. Covers score's 8-vs-8-week decay and 6-week persistence. */
export const WEEKS = 16;

// ------------------------------------------------------------------ types

export type PullDimension = "page" | "query" | "date";
export type PullRequest = DateWindow & { dimensions: PullDimension[] };
export type CallName =
  | "pages.current"
  | "pages.prior"
  | "pageQueries.current"
  | "pageQueries.prior"
  | "totals.current"
  | "totals.prior"
  | "weekly.datePage"
  | "weekly.date";
export type PullCall = { name: CallName; request: PullRequest };
export type PullPlan = {
  site: string;
  anchor: string;
  windows: { current: DateWindow; prior: DateWindow };
  weeks: string[];
  weeklyWindow: DateWindow;
  calls: PullCall[];
};
export type PullResults = Record<CallName, AnalyticsRow[]>;

/** Traffic Search Console attributed to a host other than site.base. */
export type OffHost = { host: string; rows: number; clicks: number; impressions: number };
/** GscPull plus the off-host tally (local extension; consumers may ignore it). */
export type GscPullLocal = GscPull & { offHost: OffHost[] };

export type DailyPageRow = { date: string; page: string; clicks: number; impressions: number; position: number };
export type DailyRow = { date: string; clicks: number; impressions: number; position: number };

// ------------------------------------------------------------------ dates

/** Monday (YYYY-MM-DD) of the ISO week containing `date`. */
export function mondayOf(date: string): string {
  const d = new Date(`${date.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) throw new Error(`mondayOf: not a date: "${date}"`);
  const isoDay = d.getUTCDay() || 7; // Sunday → 7
  d.setUTCDate(d.getUTCDate() - (isoDay - 1));
  return d.toISOString().slice(0, 10);
}

/**
 * The last `weeks` complete ISO weeks whose Sunday is on or before the last
 * finalised day (anchor − DATA_LAG_DAYS). Returns the Mondays, oldest first,
 * and the date window that covers them exactly.
 */
export function weeklySpan(anchor: string, weeks: number = WEEKS): { weeks: string[]; window: DateWindow } {
  const lastDataDay = addDays(anchor, -DATA_LAG_DAYS);
  // If lastDataDay is a Sunday its week is complete; otherwise the week before is the last complete one.
  const lastMonday = addDays(mondayOf(addDays(lastDataDay, 1)), -7);
  const mondays: string[] = [];
  for (let i = weeks - 1; i >= 0; i -= 1) mondays.push(addDays(lastMonday, -7 * i));
  return { weeks: mondays, window: { startDate: mondays[0], endDate: addDays(lastMonday, 6) } };
}

/** Every Search Analytics call this run makes, in order. Pure; `--dry-run` prints it. */
export function planPull(site: string, anchor: string): PullPlan {
  const current = gscWindow(WINDOW_DAYS, 0, anchor);
  const prior = gscWindow(WINDOW_DAYS, WINDOW_DAYS, anchor);
  const span = weeklySpan(anchor);
  const calls: PullCall[] = [
    { name: "pages.current", request: { ...current, dimensions: ["page"] } },
    { name: "pages.prior", request: { ...prior, dimensions: ["page"] } },
    { name: "pageQueries.current", request: { ...current, dimensions: ["page", "query"] } },
    { name: "pageQueries.prior", request: { ...prior, dimensions: ["page", "query"] } },
    { name: "totals.current", request: { ...current, dimensions: [] } },
    { name: "totals.prior", request: { ...prior, dimensions: [] } },
    { name: "weekly.datePage", request: { ...span.window, dimensions: ["date", "page"] } },
    { name: "weekly.date", request: { ...span.window, dimensions: ["date"] } },
  ];
  return { site, anchor, windows: { current, prior }, weeks: span.weeks, weeklyWindow: span.window, calls };
}

// ------------------------------------------------------------- aggregation

type Acc = { clicks: number; impressions: number; positionWeight: number };

const emptyAcc = (): Acc => ({ clicks: 0, impressions: 0, positionWeight: 0 });

function addRow(acc: Acc, row: { clicks: number; impressions: number; position: number }): void {
  acc.clicks += row.clicks;
  acc.impressions += row.impressions;
  acc.positionWeight += row.position * row.impressions;
}

const round = (value: number, places: number): number => {
  const f = 10 ** places;
  return Math.round(value * f) / f;
};

/** Clicks and impressions summed; CTR recomputed; position impression-weighted. */
function toMetric(acc: Acc): Metric {
  return {
    clicks: acc.clicks,
    impressions: acc.impressions,
    ctr: acc.impressions > 0 ? round(acc.clicks / acc.impressions, 6) : 0,
    position: acc.impressions > 0 ? round(acc.positionWeight / acc.impressions, 3) : 0,
  };
}

/** Sum daily page rows into Monday-keyed weekly rows. Rows outside `weeks` are dropped. */
export function aggregateWeekly(rows: DailyPageRow[], weeks: string[]): WeeklyPageMetric[] {
  const inSpan = new Set(weeks);
  const byKey = new Map<string, { page: string; weekStart: string; acc: Acc }>();
  for (const row of rows) {
    const weekStart = mondayOf(row.date);
    if (!inSpan.has(weekStart)) continue;
    const key = `${row.page}\u0000${weekStart}`;
    let slot = byKey.get(key);
    if (!slot) {
      slot = { page: row.page, weekStart, acc: emptyAcc() };
      byKey.set(key, slot);
    }
    addRow(slot.acc, row);
  }
  return [...byKey.values()]
    .map((slot) => ({ page: slot.page, weekStart: slot.weekStart, ...toMetric(slot.acc) }))
    .sort((a, b) => (a.page === b.page ? a.weekStart.localeCompare(b.weekStart) : a.page.localeCompare(b.page)));
}

/**
 * Site totals per week. Unlike the sparse per-page rows, every week in the
 * span is present: a week with no rows had zero traffic, and the week-over-week
 * brake must read that as 0, not as "missing".
 */
export function aggregateWeeklyTotals(rows: DailyRow[], weeks: string[]): Array<Metric & { weekStart: string }> {
  const byWeek = new Map<string, Acc>(weeks.map((w) => [w, emptyAcc()]));
  for (const row of rows) {
    const acc = byWeek.get(mondayOf(row.date));
    if (acc) addRow(acc, row);
  }
  return weeks.map((weekStart) => ({ weekStart, ...toMetric(byWeek.get(weekStart) ?? emptyAcc()) }));
}

/** Site path for a GSC page URL on `origin`, or null for another host / an unparseable URL. */
export function pageOf(url: string, origin: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  return parsed.origin === origin ? toPath(url) : null;
}

function hostOf(url: string): string {
  try {
    return new URL(url).host || "(no host)";
  } catch {
    return "(unparseable)";
  }
}

type Normalized<T> = { rows: T[]; dropped: number };

/**
 * Page rows → PageMetric, keeping only `origin`. URLs that collapse to the same
 * path (a trailing slash, a #fragment jump link, a ?query) are merged.
 */
export function normalizePages(rows: AnalyticsRow[], origin: string): Normalized<PageMetric> {
  const byPage = new Map<string, Acc>();
  let dropped = 0;
  for (const row of rows) {
    const page = pageOf(row.keys[0] ?? "", origin);
    if (page === null) {
      dropped += 1;
      continue;
    }
    let acc = byPage.get(page);
    if (!acc) {
      acc = emptyAcc();
      byPage.set(page, acc);
    }
    addRow(acc, row);
  }
  const out = [...byPage.entries()].map(([page, acc]) => ({ page, ...toMetric(acc) }));
  out.sort((a, b) => b.impressions - a.impressions || a.page.localeCompare(b.page));
  return { rows: out, dropped };
}

/** page+query rows → PageQueryMetric (same host rule and merge as normalizePages). */
export function normalizePageQueries(rows: AnalyticsRow[], origin: string): Normalized<PageQueryMetric> {
  const byKey = new Map<string, { page: string; query: string; acc: Acc }>();
  let dropped = 0;
  for (const row of rows) {
    const page = pageOf(row.keys[0] ?? "", origin);
    if (page === null) {
      dropped += 1;
      continue;
    }
    const query = row.keys[1] ?? "";
    const key = `${page}\u0000${query}`;
    let slot = byKey.get(key);
    if (!slot) {
      slot = { page, query, acc: emptyAcc() };
      byKey.set(key, slot);
    }
    addRow(slot.acc, row);
  }
  const out = [...byKey.values()].map((slot) => ({ page: slot.page, query: slot.query, ...toMetric(slot.acc) }));
  out.sort((a, b) => b.impressions - a.impressions || a.page.localeCompare(b.page) || a.query.localeCompare(b.query));
  return { rows: out, dropped };
}

/** date+page rows → DailyPageRow for `origin`. */
export function normalizeDatePages(rows: AnalyticsRow[], origin: string): Normalized<DailyPageRow> {
  const out: DailyPageRow[] = [];
  let dropped = 0;
  for (const row of rows) {
    const page = pageOf(row.keys[1] ?? "", origin);
    const date = row.keys[0] ?? "";
    if (page === null || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      dropped += 1;
      continue;
    }
    out.push({ date, page, clicks: row.clicks, impressions: row.impressions, position: row.position });
  }
  return { rows: out, dropped };
}

/** A no-dimension pull returns one row (or none when there was no traffic). */
export function totalsFrom(rows: AnalyticsRow[]): Metric {
  const acc = emptyAcc();
  for (const row of rows) addRow(acc, row);
  return toMetric(acc);
}

/** Off-host traffic in one page pull, largest first. */
export function offHostTally(rows: AnalyticsRow[], origin: string): OffHost[] {
  const byHost = new Map<string, OffHost>();
  for (const row of rows) {
    const url = row.keys[0] ?? "";
    if (pageOf(url, origin) !== null) continue;
    const host = hostOf(url);
    const slot = byHost.get(host) ?? { host, rows: 0, clicks: 0, impressions: 0 };
    slot.rows += 1;
    slot.clicks += row.clicks;
    slot.impressions += row.impressions;
    byHost.set(host, slot);
  }
  return [...byHost.values()].sort((a, b) => b.impressions - a.impressions || a.host.localeCompare(b.host));
}

/** Raw API rows → the GscPull artifact. Pure. */
export function buildGscPull(
  plan: PullPlan,
  results: PullResults,
  base: string,
  generatedAt: string,
): { pull: GscPullLocal; droppedRows: number } {
  const origin = new URL(base).origin;
  const pagesCurrent = normalizePages(results["pages.current"], origin);
  const pagesPrior = normalizePages(results["pages.prior"], origin);
  const pqCurrent = normalizePageQueries(results["pageQueries.current"], origin);
  const pqPrior = normalizePageQueries(results["pageQueries.prior"], origin);
  const datePages = normalizeDatePages(results["weekly.datePage"], origin);
  const daily: DailyRow[] = results["weekly.date"]
    .filter((row) => /^\d{4}-\d{2}-\d{2}$/.test(row.keys[0] ?? ""))
    .map((row) => ({ date: row.keys[0], clicks: row.clicks, impressions: row.impressions, position: row.position }));

  const pull: GscPullLocal = {
    generatedAt,
    site: plan.site,
    windows: { current: { ...plan.windows.current }, prior: { ...plan.windows.prior } },
    totals: { current: totalsFrom(results["totals.current"]), prior: totalsFrom(results["totals.prior"]) },
    pages: { current: pagesCurrent.rows, prior: pagesPrior.rows },
    pageQueries: { current: pqCurrent.rows, prior: pqPrior.rows },
    weekly: { weeks: [...plan.weeks], rows: aggregateWeekly(datePages.rows, plan.weeks) },
    weeklyTotals: aggregateWeeklyTotals(daily, plan.weeks),
    offHost: offHostTally(results["pages.current"], origin),
  };
  const droppedRows = pagesCurrent.dropped + pagesPrior.dropped + pqCurrent.dropped + pqPrior.dropped + datePages.dropped;
  return { pull, droppedRows };
}

// -------------------------------------------------------------------- I/O

export type QueryFn = (request: PullRequest) => Promise<AnalyticsRow[]>;

/** Run every planned call in order. Sequential: eight calls, and a failure names the one that broke. */
export async function runPull(plan: PullPlan, query: QueryFn): Promise<PullResults> {
  const results = {} as PullResults;
  for (const call of plan.calls) {
    const rows = await query(call.request);
    log(`gsc-pull: ${call.name} ${call.request.startDate}..${call.request.endDate} → ${rows.length} rows`);
    results[call.name] = rows;
  }
  return results;
}

async function main(args: Args): Promise<number> {
  const config = loadConfig();
  const site = flagString(args, "site", config.site.gscProperty);
  const anchor = today();
  const plan = planPull(site, anchor);
  const out = datedDataPath("gsc", anchor);

  if (hasFlag(args, "dry-run")) {
    console.log(JSON.stringify({ dryRun: true, out: repoRelative(out), ...plan }, null, 2));
    return 0;
  }

  const session = await gscSession();
  const results = await runPull(plan, (request) => searchAnalytics(session, site, request));
  const { pull, droppedRows } = buildGscPull(plan, results, config.site.base, new Date().toISOString());

  if (droppedRows > 0) log(`gsc-pull: dropped ${droppedRows} row(s) not on ${new URL(config.site.base).origin}`);
  for (const host of pull.offHost) {
    log(`gsc-pull: off-host ${host.host}: ${host.rows} page(s), ${host.impressions} impressions, ${host.clicks} clicks (28d)`);
  }
  if (pull.totals.current.impressions === 0) {
    log("gsc-pull: WARNING the current window has zero impressions — check the property and the service account's access");
  }

  writeJson(out, pull);
  log(`gsc-pull: wrote ${repoRelative(out)}`);
  console.log(
    JSON.stringify({
      out: repoRelative(out),
      totals: pull.totals,
      pages: pull.pages.current.length,
      pageQueries: pull.pageQueries.current.length,
      weeklyRows: pull.weekly.rows.length,
      offHost: pull.offHost.length,
    }),
  );
  return 0;
}

// -------------------------------------------------------------- self-test

function selfTest(): void {
  check(mondayOf("2026-09-27") === "2026-09-21", "mondayOf(Sunday) is the Monday before");
  check(mondayOf("2026-09-21") === "2026-09-21", "mondayOf(Monday) is itself");
  check(mondayOf("2026-09-23T10:00:00Z") === "2026-09-21", "mondayOf accepts an ISO timestamp");

  // Anchor Monday 2026-09-28 → last finalised day Fri 09-25 → last complete week starts 09-14.
  const span = weeklySpan("2026-09-28");
  check(span.weeks.length === WEEKS, "16 weeks");
  check(span.weeks[WEEKS - 1] === "2026-09-14", `last complete week, got ${span.weeks[WEEKS - 1]}`);
  check(span.window.endDate === "2026-09-20" && span.window.startDate === span.weeks[0], "span covers whole weeks");
  // Anchor Wednesday 2026-09-30 → last finalised day is Sunday 09-27, so that week is complete.
  check(weeklySpan("2026-09-30").weeks[WEEKS - 1] === "2026-09-21", "a Sunday last-data-day completes its week");

  const plan = planPull("sc-domain:example.test", "2026-09-28");
  check(plan.calls.length === 8, "eight calls");
  check(plan.windows.current.endDate === "2026-09-25" && plan.windows.prior.endDate === "2026-08-28", "28-day windows");

  const weekly = aggregateWeekly(
    [
      { date: "2026-09-14", page: "/a", clicks: 1, impressions: 10, position: 4 },
      { date: "2026-09-20", page: "/a", clicks: 1, impressions: 30, position: 8 },
      { date: "2026-09-21", page: "/a", clicks: 5, impressions: 5, position: 1 },
    ],
    ["2026-09-14"],
  );
  check(weekly.length === 1 && weekly[0].clicks === 2 && weekly[0].impressions === 40, "weekly sum, out-of-span dropped");
  check(weekly[0].position === 7 && weekly[0].ctr === 0.05, "impression-weighted position, recomputed CTR");

  const row = (keys: string[], clicks: number, impressions: number, position: number): AnalyticsRow => ({ keys, clicks, impressions, ctr: 0, position });
  const origin = "https://example.test";
  const pages = normalizePages(
    [row(["https://example.test/a"], 1, 10, 5), row(["https://example.test/a/"], 1, 30, 9), row(["https://www.example.test/a"], 3, 50, 2)],
    origin,
  );
  check(pages.rows.length === 1 && pages.rows[0].impressions === 40 && pages.rows[0].position === 8, "merge by path");
  check(pages.dropped === 1, "off-host row dropped");
  check(offHostTally([row(["https://www.example.test/a"], 3, 50, 2)], origin)[0].host === "www.example.test", "off-host tally");
  check(totalsFrom([]).impressions === 0 && totalsFrom([]).position === 0, "empty totals are zeros");
}

/** Every flag this script reads (lib/cli.ts rejects any other). */
export const CLI_FLAGS: readonly string[] = ["dry-run", "site"];

runMain(import.meta.url, main, selfTest, { flags: CLI_FLAGS });
