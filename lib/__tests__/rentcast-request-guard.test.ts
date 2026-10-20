import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The RentCast request-budget invariant, enforced on the source tree:
 *
 *   No code path may send an HTTP request to RentCast without first holding
 *   an atomic reservation for that exact request.
 *
 * Mechanically: `api.rentcast.io` (and the `BASE_URL` fetch) exists in exactly
 * one file; that file has exactly one `fetch(`, inside `fetchJson`; `fetchJson`
 * consumes a `RentCastReservation` before fetching; and both exported fetchers
 * call `reserveRentCastRequests` before their first `fetchJson`.
 */

const root = process.cwd();
const RENTCAST = "lib/property-enrichment/rentcast.ts";
const SEARCH_DIRS = ["app", "lib", "components", "hooks", "scripts", "emails", "proxy.ts", "instrumentation.ts"];
const SKIP = new Set(["node_modules", ".next", "__tests__"]);

function files(dir: string, acc: string[] = []): string[] {
  const full = join(root, dir);
  let st;
  try {
    st = statSync(full);
  } catch {
    return acc;
  }
  if (!st.isDirectory()) {
    if (/\.(ts|tsx|mjs|js)$/.test(dir)) acc.push(dir);
    return acc;
  }
  for (const entry of readdirSync(full)) {
    if (SKIP.has(entry)) continue;
    files(join(dir, entry), acc);
  }
  return acc;
}

const read = (rel: string) => readFileSync(join(root, rel), "utf8");
const source = read(RENTCAST);

describe("api.rentcast.io is reached from exactly one file", () => {
  it("no other source file names the API host or fetches BASE_URL", () => {
    const offenders: string[] = [];
    for (const dir of SEARCH_DIRS) {
      for (const file of files(dir)) {
        if (file === RENTCAST || /\.test\.tsx?$/.test(file)) continue;
        const text = read(file);
        if (/api\.rentcast\.io/.test(text) || /fetch\(\s*`\$\{BASE_URL\}/.test(text)) offenders.push(file);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("the module has exactly one fetch(, inside fetchJson, after consuming a reservation", () => {
    expect(source.match(/\bfetch\(/g)).toHaveLength(1);
    const fnStart = source.indexOf("async function fetchJson(");
    const fnEnd = source.indexOf("\nfunction buildQuery(", fnStart);
    expect(fnStart).toBeGreaterThan(-1);
    expect(fnEnd).toBeGreaterThan(fnStart);
    const fetchJson = source.slice(fnStart, fnEnd);
    expect(fetchJson).toContain("reservation: RentCastReservation");
    const consumeAt = fetchJson.indexOf("consumeReservedRequest(reservation)");
    const fetchAt = fetchJson.indexOf("fetch(`${BASE_URL}${path}`");
    expect(consumeAt).toBeGreaterThan(-1);
    expect(fetchAt).toBeGreaterThan(consumeAt);
  });
});

describe("every fetchJson call sits behind a reservation", () => {
  const section = (startMarker: string, endMarker: string) => {
    const start = source.indexOf(startMarker);
    expect(start, startMarker).toBeGreaterThan(-1);
    const end = endMarker ? source.indexOf(endMarker, start + 1) : source.length;
    expect(end, endMarker).toBeGreaterThan(start);
    return source.slice(start, end);
  };

  it("fetchRentCastEnrichment reserves 2 or 3 before the reserved fetch runs", () => {
    const fn = section("export async function fetchRentCastEnrichment(", "\nasync function fetchReservedEnrichment(");
    const reserveAt = fn.indexOf("reserveRentCastRequests(enrichmentRequestCount(opts)");
    expect(reserveAt).toBeGreaterThan(-1);
    expect(fn).not.toContain("fetchJson(");
    expect(fn.indexOf("fetchReservedEnrichment(")).toBeGreaterThan(reserveAt);
    expect(source).toContain('return opts?.includeListing ? 3 : 2;');
    // The reserved helper receives the reservation and hands it to every call.
    const helper = section("async function fetchReservedEnrichment(", "\nexport type RentCastRentEstimateResult");
    expect(helper.match(/fetchJson\(/g)).toHaveLength(3);
    expect(helper.match(/apiKey, reservation\)/g)).toHaveLength(3);
  });

  it("fetchRentCastRentEstimate reserves 1 before its single fetchJson", () => {
    const fn = section("export async function fetchRentCastRentEstimate(", "");
    const reserveAt = fn.indexOf("reserveRentCastRequests(1,");
    const fetchAt = fn.indexOf("fetchJson(");
    expect(reserveAt).toBeGreaterThan(-1);
    expect(fetchAt).toBeGreaterThan(reserveAt);
    expect(fn.match(/fetchJson\(/g)).toHaveLength(1);
  });

  it("nothing in the module refunds after a send", () => {
    expect(source).not.toContain("decrement_app_counter");
  });
});

describe("the budget module itself", () => {
  const budget = read("lib/property-enrichment/rentcast-budget.ts");

  it("is server-only and passes amount: 1 only", () => {
    expect(budget.startsWith('import "server-only";')).toBe(true);
    const amounts = [...budget.matchAll(/increment_app_counter_if_under"[\s\S]{0,200}?amount:\s*([^,\n]+)/g)].map((m) => m[1].trim());
    expect(amounts.length).toBeGreaterThan(0);
    for (const a of amounts) expect(a).toBe("1");
  });

  it("the retired enrichment cap is gone from both call sites and the env example", () => {
    for (const file of ["app/actions/property-comps.ts", "app/api/cron/send-rent-alerts/route.ts", ".env.example"]) {
      expect(read(file), file).not.toContain("RENTCAST_MONTHLY_ENRICHMENT_CAP=");
      expect(read(file), file).not.toMatch(/process\.env\.RENTCAST_MONTHLY_ENRICHMENT_CAP/);
    }
    // No legacy read-gate fallback anywhere near RentCast.
    expect(read("app/actions/property-comps.ts")).not.toMatch(/legacy/i);
    expect(read("app/api/cron/send-rent-alerts/route.ts")).not.toContain("rpcMissing");
  });

  it("documents the three env vars with safe defaults", () => {
    const env = read(".env.example");
    expect(env).toContain("RENTCAST_MONTHLY_REQUEST_CAP=50");
    expect(env).toContain("RENTCAST_BILLING_ANCHOR_DAY=19");
    expect(env).toContain("RENTCAST_PERIOD_OVERLAP_HOURS=48");
    expect(env).toContain("RENTCAST_AUTOPULL_ON_SAVE=off");
    expect(env).toContain("RENTCAST_INTERACTIVE_RESERVE=30");
    expect(env).toContain("RENTCAST_PER_USER_MONTHLY_CAP=10");
  });
});

describe("the rent-alert cron", () => {
  const cron = read("app/api/cron/send-rent-alerts/route.ts");

  it("reads the shared budget, keeps the interactive reserve, stops on capped and never refunds", () => {
    expect(cron).toContain("getRentCastBudgetStatus()");
    expect(cron).toContain("RENTCAST_INTERACTIVE_RESERVE");
    expect(cron).toContain('if (estimate.status === "capped")');
    expect(cron).not.toContain("decrement_app_counter");
    expect(cron).not.toContain("increment_app_counter_if_under");
  });
});
