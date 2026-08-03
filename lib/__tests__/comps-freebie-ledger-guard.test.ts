import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/**
 * Aug 2026 security fix. `profiles.comps_free_used` is the ONLY gate on a free
 * user's single lifetime RentCast comps lookup, and profiles' RLS update policy
 * is whole-row (auth.uid() = id, no column list) — so while the action claimed
 * the freebie with the user-session client, a signed-in free user could PATCH
 * the column back to false through PostgREST and loop forever. Each loop is a
 * billed RentCast call that also drains the SHARED monthly budget the rent-alert
 * cron and every paying Pro user draw from.
 *
 * Two halves, both guarded here:
 *  1. Every write to the column goes through the service-role client.
 *  2. The refund path does not hand back the global budget unit (the request
 *     left the building; refunding it made the spend cap self-defeating).
 * The DB-side half is supabase/migrations/20260802130000_profiles_lock_comps_free_used.sql.
 */

function read(rel: string): string {
  return readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8");
}

const source = read("../../app/actions/property-comps.ts");

describe("the free-comps freebie ledger is service-role only", () => {
  it("never writes comps_free_used through the user-session client", () => {
    // Each `.update({ comps_free_used: ... })` must be preceded by `admin`
    // (not `supabase`) as the client on the same statement.
    const writes = [...source.matchAll(/(\w+)\s*\n?\s*\.from\("profiles"\)\s*\n?\s*\.update\(\{\s*comps_free_used/g)];
    expect(writes.length).toBeGreaterThan(0);
    for (const w of writes) {
      expect(w[1]).toBe("admin");
    }
  });

  it("claims the freebie conditionally so concurrent lookups can't double-spend it", () => {
    expect(source).toMatch(/\.eq\("comps_free_used",\s*false\)/);
  });
});

describe("the unbilled-lookup refund does not undo the global spend guard", () => {
  it("refundUnbilledLookup contains no decrement_app_counter call", () => {
    const start = source.indexOf("const refundUnbilledLookup");
    expect(start).toBeGreaterThan(-1);
    const end = source.indexOf("// Live fetch.", start);
    expect(end).toBeGreaterThan(start);
    expect(source.slice(start, end)).not.toContain("decrement_app_counter");
  });

  it("bounds how many misses still refund the freebie", () => {
    expect(source).toContain("MISS_REFUND_CAP");
    expect(source).toMatch(/counter_key:\s*`comps_miss_/);
  });
});
