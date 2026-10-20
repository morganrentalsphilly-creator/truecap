/**
 * RentCast billing-period math — PURE, client-safe, unit-tested
 * (lib/__tests__/rentcast-billing-period.test.ts).
 *
 * RentCast's free Developer plan allows 50 requests per billing period and
 * bills every request past that at $0.20 with no hard cap on their side. The
 * period renews on the subscription's anchor day (the 19th today) at a time of
 * day and in a timezone RentCast does not publish. The app enforces the cap
 * itself, so the counters it keeps must be keyed so that every REAL RentCast
 * period sits entirely inside one app period:
 *
 *   App period k = [anchor day k at 00:00 UTC,
 *                   anchor day k+1 at 00:00 UTC + RENTCAST_PERIOD_OVERLAP_HOURS)
 *
 * The trailing overlap (48h by default) absorbs the unknown renewal time and
 * timezone. A request made inside an overlap window belongs to TWO app
 * periods and is reserved against both keys (all-or-nothing), so whichever
 * app period the real period maps onto, its counter bounds the real spend.
 * The one assumption: the real renewal instant is never EARLIER than 00:00
 * UTC on the anchor day (true for UTC and every US timezone).
 *
 * The anchor day is clamped to the month's last day in short months (an
 * anchor of 31 lands on Feb 28/29, Apr 30, …).
 */

export const DEFAULT_RENTCAST_BILLING_ANCHOR_DAY = 19;
export const DEFAULT_RENTCAST_PERIOD_OVERLAP_HOURS = 48;

export type RentCastPeriodConfig = {
  /** Day of month the RentCast subscription renews (1–31). */
  anchorDay: number;
  /** Hours an app period keeps accepting reservations past the next anchor. */
  overlapHours: number;
};

export type RentCastPeriod = {
  /** `rentcast_requests_<YYYY-MM-DD of this period's anchor>` */
  key: string;
  /** The anchor day as YYYY-MM-DD — the suffix of every counter keyed to this period. */
  anchorIso: string;
  /** Anchor day, 00:00 UTC — the moment this period starts. */
  start: Date;
  /** Next anchor day 00:00 UTC + overlap — the moment this period ends. */
  end: Date;
  /** Next anchor day, 00:00 UTC (the per-user cap resets here). */
  nextAnchor: Date;
};

const HOUR_MS = 60 * 60 * 1000;

function clampInt(raw: unknown, fallback: number, min: number, max: number): number {
  const n = typeof raw === "number" ? raw : Number.parseInt(String(raw ?? ""), 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(n)));
}

/** Read the period config from env with safe defaults (nothing set → 19th, 48h). */
export function readRentCastPeriodConfig(
  env: Record<string, string | undefined> = process.env
): RentCastPeriodConfig {
  return {
    anchorDay: clampInt(env.RENTCAST_BILLING_ANCHOR_DAY, DEFAULT_RENTCAST_BILLING_ANCHOR_DAY, 1, 31),
    overlapHours: clampInt(env.RENTCAST_PERIOD_OVERLAP_HOURS, DEFAULT_RENTCAST_PERIOD_OVERLAP_HOURS, 0, 24 * 27),
  };
}

function daysInUtcMonth(year: number, monthIndex: number): number {
  // Day 0 of the next month is the last day of this month.
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

/** The anchor instant (00:00 UTC) for a given UTC year + month index, clamped
 *  to the month's last day. */
export function anchorFor(year: number, monthIndex: number, anchorDay: number): Date {
  // Normalise an out-of-range month index (e.g. 12 → next January) first.
  const norm = new Date(Date.UTC(year, monthIndex, 1));
  const y = norm.getUTCFullYear();
  const m = norm.getUTCMonth();
  const day = Math.min(anchorDay, daysInUtcMonth(y, m));
  return new Date(Date.UTC(y, m, day));
}

function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function periodKeyFor(anchor: Date): string {
  return `rentcast_requests_${isoDay(anchor)}`;
}

/** Build the app period that starts at `anchor`. */
export function periodStartingAt(anchor: Date, config: RentCastPeriodConfig): RentCastPeriod {
  const nextAnchor = anchorFor(anchor.getUTCFullYear(), anchor.getUTCMonth() + 1, config.anchorDay);
  return {
    key: periodKeyFor(anchor),
    anchorIso: isoDay(anchor),
    start: anchor,
    end: new Date(nextAnchor.getTime() + config.overlapHours * HOUR_MS),
    nextAnchor,
  };
}

/** The latest anchor at or before `now` (the period `now` most recently entered). */
export function currentAnchorAt(now: Date, anchorDay: number): Date {
  const thisMonth = anchorFor(now.getUTCFullYear(), now.getUTCMonth(), anchorDay);
  if (thisMonth.getTime() <= now.getTime()) return thisMonth;
  return anchorFor(now.getUTCFullYear(), now.getUTCMonth() - 1, anchorDay);
}

/**
 * Every app period that contains `now`, oldest first. One period outside an
 * overlap window; two inside one (the period that just ended its anchor
 * month plus the one that just began).
 */
export function activePeriodsAt(now: Date, config: RentCastPeriodConfig): RentCastPeriod[] {
  const current = periodStartingAt(currentAnchorAt(now, config.anchorDay), config);
  const previousAnchor = anchorFor(
    current.start.getUTCFullYear(),
    current.start.getUTCMonth() - 1,
    config.anchorDay
  );
  const previous = periodStartingAt(previousAnchor, config);
  const periods: RentCastPeriod[] = [];
  if (now.getTime() < previous.end.getTime()) periods.push(previous);
  periods.push(current);
  return periods;
}

/** The period whose anchor `now` most recently passed — the one the per-user
 *  cap is keyed to. */
export function currentPeriodAt(now: Date, config: RentCastPeriodConfig): RentCastPeriod {
  return periodStartingAt(currentAnchorAt(now, config.anchorDay), config);
}

/**
 * The earliest moment at which every exhausted period has ended — i.e. the
 * latest `end` among them. Null when nothing is exhausted.
 */
export function resumesAtFor(exhausted: readonly RentCastPeriod[]): Date | null {
  if (exhausted.length === 0) return null;
  return new Date(Math.max(...exhausted.map((p) => p.end.getTime())));
}

/** "Nov 21" — the user-facing day a paused pool comes back (UTC calendar day). */
export function formatResumesOn(at: Date | string): string {
  const d = typeof at === "string" ? new Date(at) : at;
  if (!Number.isFinite(d.getTime())) return "soon";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}
