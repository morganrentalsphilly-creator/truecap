import "server-only";

/**
 * The ONE hard request budget for RentCast.
 *
 * RentCast's free Developer plan allows 50 requests per billing period and
 * bills every request past that at $0.20 with no hard-cap setting on their
 * side. The app has to enforce the cap itself, so the invariant is:
 *
 *   No code path sends an HTTP request to RentCast without first holding an
 *   atomic reservation for that exact request. Count requests, not
 *   enrichments.
 *
 * `fetchJson` in lib/property-enrichment/rentcast.ts is the only code that
 * reaches RentCast's API host, and it refuses to run without a
 * `RentCastReservation` minted here (lib/__tests__/rentcast-request-guard.test.ts
 * pins both halves).
 *
 * Counting: one `increment_app_counter_if_under` call per request, `amount: 1`
 * only. The RPC's guard is `count < max_value`, so a 2- or 3-unit reserve at
 * 49 would overshoot to 51 or 52; single increments end at exactly the cap.
 * A multi-request reservation is all-or-nothing — a partial grab is released
 * with `decrement_app_counter` and the caller gets `cap`.
 *
 * Fails CLOSED: an RPC error, an unreachable database or a missing service
 * role returns `unavailable` and no request goes out. Over-counting is fine;
 * under-counting costs money, so a reservation is released only when no HTTP
 * request was sent. Never refund after a send (timeouts, non-200s and empty
 * 200s all stay counted).
 *
 * Periods: see lib/property-enrichment/rentcast-billing-period.ts. A request
 * inside an overlap window is reserved against BOTH active periods.
 */

import * as Sentry from "@sentry/nextjs";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { captureServerEvent } from "@/lib/posthog-server";
import {
  activePeriodsAt,
  currentPeriodAt,
  formatResumesOn,
  readRentCastPeriodConfig,
  resumesAtFor,
  type RentCastPeriod,
} from "@/lib/property-enrichment/rentcast-billing-period";

export const DEFAULT_RENTCAST_MONTHLY_REQUEST_CAP = 50;

/** Requests per billing period. Nothing set → 50 (the free Developer plan). */
export function readRentCastRequestCap(env: Record<string, string | undefined> = process.env): number {
  const n = Number.parseInt(env.RENTCAST_MONTHLY_REQUEST_CAP ?? "", 10);
  if (!Number.isFinite(n)) return DEFAULT_RENTCAST_MONTHLY_REQUEST_CAP;
  return Math.max(0, n);
}

/**
 * Proof that `requests` HTTP requests were reserved. Only this module mints
 * one; `fetchJson` consumes one unit per request and throws past the limit.
 */
export type RentCastReservation = {
  readonly __brand: "RentCastReservation";
  readonly requests: number;
  remaining: number;
};

export type RentCastReserveResult =
  | { ok: true; reservation: RentCastReservation }
  | { ok: false; reason: "cap" | "unavailable"; resumesAt: string };

export type RentCastBudgetStatus = {
  /** Requests counted against the binding (fullest) active period. */
  used: number;
  cap: number;
  /** Requests still available right now (the minimum across active periods). */
  remaining: number;
  available: boolean;
  /** ISO instant at which every exhausted period has ended; null while available. */
  resumesAt: string | null;
  /** "Nov 21" — resumesAt as the user sees it. Null while available. */
  resumesOn: string | null;
  reason: "cap" | "unavailable" | null;
  periods: Array<{ key: string; used: number; endsAt: string }>;
};

function mintReservation(requests: number): RentCastReservation {
  return { __brand: "RentCastReservation", requests, remaining: requests };
}

/** Spend one unit of a reservation. Throws when the reservation is exhausted,
 *  so a code path can never send more requests than it reserved. */
export function consumeReservedRequest(reservation: RentCastReservation): void {
  if (reservation.remaining <= 0) {
    throw new Error("[rentcast-budget] request sent without a reservation");
  }
  reservation.remaining -= 1;
}

type Admin = ReturnType<typeof createAdminSupabaseClient>;

function iso(d: Date): string {
  return d.toISOString();
}

/** Once-per-period alerts. `increment_app_counter_if_under(…, max 1)` returns
 *  non-null exactly once for a key, so concurrent callers can't both report.
 *  Best-effort: never throws, never changes the reservation outcome. */
async function alertOnce(
  admin: Admin,
  period: RentCastPeriod,
  threshold: 80 | 100,
  used: number,
  cap: number
): Promise<void> {
  try {
    const { data, error } = await admin.rpc("increment_app_counter_if_under", {
      counter_key: `rentcast_alert${threshold}_${period.anchorIso}`,
      max_value: 1,
      amount: 1,
    });
    if (error || data == null) return;
    Sentry.captureMessage(`RentCast request budget at ${threshold}% for period ${period.anchorIso}`, {
      level: threshold === 100 ? "error" : "warning",
      tags: { feature: "rentcast-budget", threshold: String(threshold) },
      // Aggregate only — no addresses, no user ids.
      extra: { period: period.anchorIso, used, cap, resumesAt: iso(period.end) },
    });
  } catch {
    // Observability must never break the budget path.
  }
}

async function recordCapped(lookupType: string): Promise<void> {
  try {
    await captureServerEvent({
      distinctId: "$server",
      event: "data_lookup_capped",
      properties: { provider: "rentcast", lookup_type: lookupType },
    });
  } catch {
    // Analytics are best-effort.
  }
}

async function readCounts(admin: Admin, periods: RentCastPeriod[]): Promise<Map<string, number> | null> {
  const { data, error } = await admin
    .from("app_counters")
    .select("key, count")
    .in(
      "key",
      periods.map((p) => p.key)
    );
  if (error) return null;
  const counts = new Map<string, number>();
  for (const p of periods) counts.set(p.key, 0);
  for (const row of (data ?? []) as Array<{ key: string; count: number | string | null }>) {
    const n = Number(row.count ?? 0);
    counts.set(row.key, Number.isFinite(n) ? n : 0);
  }
  return counts;
}

/**
 * Reserve `n` RentCast HTTP requests against every active billing period.
 * All-or-nothing across requests AND periods.
 */
export async function reserveRentCastRequests(
  n: number,
  opts?: { lookupType?: string; now?: Date }
): Promise<RentCastReserveResult> {
  const now = opts?.now ?? new Date();
  const lookupType = opts?.lookupType ?? "unknown";
  const config = readRentCastPeriodConfig();
  const cap = readRentCastRequestCap();
  const periods = activePeriodsAt(now, config);
  const currentEnd = iso(resumesAtFor(periods)!);

  if (!Number.isInteger(n) || n <= 0) {
    return { ok: true, reservation: mintReservation(0) };
  }
  if (cap <= 0) {
    // A zero cap means "paused" for the whole period, no RPC needed.
    await recordCapped(lookupType);
    return { ok: false, reason: "cap", resumesAt: currentEnd };
  }

  let admin: Admin;
  try {
    admin = createAdminSupabaseClient();
  } catch {
    return { ok: false, reason: "unavailable", resumesAt: currentEnd };
  }

  // Units acquired so far, per key — released on any failure.
  const acquired = new Map<string, number>();
  const release = async () => {
    for (const [counter_key, amount] of acquired) {
      if (amount <= 0) continue;
      await admin
        .rpc("decrement_app_counter", { counter_key, amount })
        .then(() => undefined, () => undefined);
    }
    acquired.clear();
  };

  try {
    for (const period of periods) {
      let lastCount: number | null = null;
      for (let i = 0; i < n; i += 1) {
        const { data, error } = await admin.rpc("increment_app_counter_if_under", {
          counter_key: period.key,
          max_value: cap,
          amount: 1,
        });
        if (error) {
          await release();
          return { ok: false, reason: "unavailable", resumesAt: currentEnd };
        }
        if (data == null) {
          // At the cap on this period. Give back everything we took.
          await release();
          // Report the exact set of exhausted periods so resumesAt is the
          // moment the pool genuinely reopens (a read, never a reservation).
          const counts = await readCounts(admin, periods);
          const exhausted = counts
            ? periods.filter((p) => (counts.get(p.key) ?? 0) >= cap)
            : [period];
          const resumesAt = resumesAtFor(exhausted.length > 0 ? exhausted : [period])!;
          await alertOnce(admin, period, 100, cap, cap);
          await recordCapped(lookupType);
          return { ok: false, reason: "cap", resumesAt: iso(resumesAt) };
        }
        acquired.set(period.key, (acquired.get(period.key) ?? 0) + 1);
        lastCount = Number(data);
      }
      if (lastCount != null && Number.isFinite(lastCount)) {
        if (lastCount >= cap) await alertOnce(admin, period, 100, lastCount, cap);
        else if (lastCount >= Math.ceil(cap * 0.8)) await alertOnce(admin, period, 80, lastCount, cap);
      }
    }
  } catch {
    await release();
    return { ok: false, reason: "unavailable", resumesAt: currentEnd };
  }

  return { ok: true, reservation: mintReservation(n) };
}

/**
 * Read-only view of the budget: one SELECT, no reservation. Fails closed —
 * an unreadable counter reports `available: false`.
 */
export async function getRentCastBudgetStatus(now: Date = new Date()): Promise<RentCastBudgetStatus> {
  const config = readRentCastPeriodConfig();
  const cap = readRentCastRequestCap();
  const periods = activePeriodsAt(now, config);
  const currentEnd = resumesAtFor(periods)!;

  const unavailable = (): RentCastBudgetStatus => ({
    used: cap,
    cap,
    remaining: 0,
    available: false,
    resumesAt: iso(currentEnd),
    resumesOn: formatResumesOn(currentEnd),
    reason: "unavailable",
    periods: [],
  });

  let counts: Map<string, number> | null = null;
  try {
    counts = await readCounts(createAdminSupabaseClient(), periods);
  } catch {
    counts = null;
  }
  if (!counts) return unavailable();

  const perPeriod = periods.map((p) => ({ period: p, used: counts!.get(p.key) ?? 0 }));
  const used = Math.max(0, ...perPeriod.map((x) => x.used));
  const remaining = cap <= 0 ? 0 : Math.max(0, Math.min(...perPeriod.map((x) => cap - x.used)));
  const exhausted = cap <= 0 ? periods : perPeriod.filter((x) => x.used >= cap).map((x) => x.period);
  const available = remaining > 0;
  const resumesAt = available ? null : resumesAtFor(exhausted.length > 0 ? exhausted : periods);
  return {
    used,
    cap,
    remaining,
    available,
    resumesAt: resumesAt ? iso(resumesAt) : null,
    resumesOn: resumesAt ? formatResumesOn(resumesAt) : null,
    reason: available ? null : "cap",
    periods: perPeriod.map((x) => ({ key: x.period.key, used: x.used, endsAt: iso(x.period.end) })),
  };
}

/** The billing period `now` most recently entered — what per-user caps key on. */
export function currentRentCastPeriod(now: Date = new Date()): RentCastPeriod {
  return currentPeriodAt(now, readRentCastPeriodConfig());
}

export { formatResumesOn };
