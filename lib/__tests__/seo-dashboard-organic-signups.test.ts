import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * loadSeoDashboard's organic sign-ups query, run against a small in-memory
 * stand-in for the service-role client that applies the filters and the
 * column projection the loader actually sends. The summarizer is tested on
 * its own in seo-signups.test.ts; this covers the wiring: the right table,
 * event, cluster, date bound and selected columns.
 */

type Row = Record<string, unknown>;
type Call = [method: string, ...args: unknown[]];
type Result = { data: Row[] | null; error: { message: string } | null; count: number | null };
type Builder = { [method: string]: (...args: unknown[]) => Builder } & PromiseLike<Result>;

const db = vi.hoisted(() => ({
  tables: {} as Record<string, Row[]>,
  queries: [] as Array<{ table: string; calls: Array<[string, ...unknown[]]> }>,
  failTable: null as string | null,
}));

function run(query: { table: string; calls: Call[] }): Result {
  if (db.failTable === query.table) return { data: null, error: { message: `${query.table} unavailable` }, count: null };
  let rows = [...(db.tables[query.table] ?? [])];
  let columns: string[] | null = null;
  let head = false;
  for (const [method, ...args] of query.calls) {
    const [column, value] = args as [string, unknown];
    if (method === "select") {
      columns = String(args[0]).split(",").map((c) => c.trim());
      head = Boolean((args[1] as { head?: boolean } | undefined)?.head);
    } else if (method === "eq") rows = rows.filter((r) => r[column] === value);
    else if (method === "gte") rows = rows.filter((r) => String(r[column]) >= String(value));
    else if (method === "gt") rows = rows.filter((r) => Number(r[column]) > Number(value));
    else if (method === "in") rows = rows.filter((r) => (value as unknown[]).includes(r[column]));
    else if (method === "limit") rows = rows.slice(0, Number(args[0]));
    else if (method !== "order") throw new Error(`fake client: unsupported ${method}`);
  }
  if (head) return { data: null, error: null, count: rows.length };
  const projected = columns
    ? rows.map((r) => Object.fromEntries((columns ?? []).filter((c) => c in r).map((c) => [c, r[c]])))
    : rows;
  return { data: projected, error: null, count: null };
}

function from(table: string): Builder {
  const query = { table, calls: [] as Call[] };
  db.queries.push(query);
  const builder = {} as Builder;
  for (const method of ["select", "eq", "gte", "gt", "in", "order", "limit"]) {
    builder[method] = (...args: unknown[]) => {
      query.calls.push([method, ...args]);
      return builder;
    };
  }
  (builder as { then: PromiseLike<Result>["then"] }).then = (resolve, reject) =>
    Promise.resolve(run(query)).then(resolve, reject);
  return builder;
}

vi.mock("@/lib/supabase/admin", () => ({
  createAdminSupabaseClient: () => ({ from }),
}));

import { loadSeoDashboard } from "@/lib/seo/control-plane/dashboard";

const NOW = Date.parse("2026-09-27T12:00:00.000Z");

const organic = (date: string, section: string, conversions: number, overrides: Row = {}): Row => ({
  date,
  landing_page: section === "home" ? "/" : `/${section}`,
  event_name: "signup_completed",
  page_type: section,
  topic_cluster: "organic",
  conversions,
  ...overrides,
});

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
  db.tables = {};
  db.queries = [];
  db.failTable = null;
});

afterEach(() => {
  vi.useRealTimers();
});

function conversionsQuery() {
  const queries = db.queries.filter((q) => q.table === "seo_conversions_daily");
  expect(queries).toHaveLength(1);
  return queries[0].calls;
}

describe("loadSeoDashboard: organic sign-ups", () => {
  it("reads organic signup_completed rows of the last four weeks, by landing section", async () => {
    db.tables.seo_conversions_daily = [
      organic("2026-09-01", "tools", 2),
      organic("2026-09-21", "blog", 3),
      organic("2026-09-27", "home", 1),
      // None of these may count:
      organic("2026-09-22", "blog", 50, { event_name: "signup_started" }),
      organic("2026-09-22", "blog", 40, { topic_cluster: "cap-rate" }),
      organic("2026-08-20", "blog", 30),
      organic("2026-09-23", "markets", 0),
    ];

    const data = await loadSeoDashboard();

    expect(data.error).toBeNull();
    expect(conversionsQuery()).toEqual([
      ["select", "date,page_type,conversions"],
      ["eq", "event_name", "signup_completed"],
      ["eq", "topic_cluster", "organic"],
      ["gte", "date", "2026-08-31"],
      ["gt", "conversions", 0],
    ]);
    expect(data.organicSignups?.sections).toEqual([
      { section: "blog", counts: [0, 0, 0, 3], total: 3 },
      { section: "tools", counts: [2, 0, 0, 0], total: 2 },
      { section: "home", counts: [0, 0, 0, 1], total: 1 },
    ]);
    expect(data.organicSignups?.weekTotals).toEqual([2, 0, 0, 4]);
    expect(data.organicSignups?.weeks.at(-1)).toEqual({ start: "2026-09-21", end: "2026-09-27" });
    // The growth card reads the same number.
    expect(data.growth.signups).toBe(6);
  });

  it("renders nothing when there are no organic rows in the window (invisible until useful)", async () => {
    db.tables.seo_conversions_daily = [
      organic("2026-09-22", "blog", 5, { topic_cluster: "cap-rate" }),
      organic("2026-08-01", "blog", 4),
    ];
    const data = await loadSeoDashboard();
    expect(data.error).toBeNull();
    expect(data.configured).toBe(true);
    expect(data.organicSignups).toBeNull();
    expect(data.growth.signups).toBe(0);
  });

  it("falls back without a summary when the table read fails", async () => {
    db.tables.seo_conversions_daily = [organic("2026-09-21", "blog", 3)];
    db.failTable = "seo_conversions_daily";
    const data = await loadSeoDashboard();
    expect(data.error).not.toBeNull();
    expect(data.organicSignups).toBeNull();
    expect(data.growth.signups).toBe(0);
  });
});
