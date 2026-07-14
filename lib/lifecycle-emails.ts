/**
 * Lifecycle email decision engine — PURE logic, no I/O.
 *
 * Given each user's state (signup date, confirmation, last activity,
 * plan, and which lifecycle emails they've already received), decide the
 * single highest-priority lifecycle email that is due right now.
 *
 * The cron (app/api/cron/send-lifecycle-emails) supplies the user state
 * from Supabase, performs the Resend sends, and writes the
 * lifecycle_email_log rows. Keeping the decision logic pure makes it
 * unit-testable (lib/__tests__/lifecycle-emails.test.ts) and keeps the
 * "who gets what, when" rules in one reviewable place — mirrors the
 * lib/rate-alerts.ts + send-rate-alerts route split.
 *
 * Email keys (stored in lifecycle_email_log.email_key):
 *   "welcome"        — once, after the account is confirmed
 *   "drip_<n>"       — onboarding drip day n (1..MAX_DRIP_DAY)
 *   "pro_nudge"      — once, free users still on free after the drip
 *   "winback_21d"    — once, users inactive >= WINBACK_AFTER_INACTIVE_DAYS
 *
 * Drip catch-up guard: drip day N is an ONBOARDING email — it only makes
 * sense while the account is actually ~N days old. Day N is sendable only
 * while account age <= N + DRIP_CATCH_UP_GRACE_DAYS; once the window has
 * passed the day is expired and must be retired (logged as skipped by the
 * cron via expiredDripKeys), never sent as a late "catch-up". Without this,
 * a user who signed up long before the feature went live receives the
 * entire 30-day sequence as consecutive daily emails.
 *
 * The drip is also free-users-only: it is a Pro-conversion sequence, so
 * paid users never receive drip days (they still get "welcome").
 */

export type LifecyclePlan = "free" | "paid";

export type LifecycleUserState = {
  userId: string;
  email: string;
  /** Account creation timestamp (ISO). */
  signupAt: string;
  /** Account confirmed / active. Welcome must not fire pre-confirmation. */
  confirmed: boolean;
  /** Last meaningful activity (ISO), or null if the user has never been active. */
  lastActivityAt: string | null;
  plan: LifecyclePlan;
  /** lifecycle_email_log.email_key values already sent to this user. */
  sentKeys: string[];
};

export type LifecycleKind = "welcome" | "drip" | "pro_nudge" | "winback";

export type DueLifecycleEmail = {
  userId: string;
  email: string;
  kind: LifecycleKind;
  /** Idempotency key persisted to lifecycle_email_log.email_key. */
  key: string;
  /** Drip day number (1..MAX_DRIP_DAY); present only when kind === "drip". */
  dripDay?: number;
};

export const MAX_DRIP_DAY = 30;
// Drip out-prioritizes the nudge, so with a 30-day drip this naturally
// lands just after onboarding finishes — a "you're still free" upgrade ask.
export const PRO_NUDGE_AFTER_DAYS = 31;
export const WINBACK_AFTER_INACTIVE_DAYS = 21;
/**
 * How many days past its scheduled position a drip day may still send.
 * Day N is in-window while account age <= N + grace — enough slack to
 * absorb a few missed cron runs without ever turning into a daily
 * catch-up blast for accounts older than the drip.
 */
export const DRIP_CATCH_UP_GRACE_DAYS = 4;
/**
 * Marker stored in lifecycle_email_log.resend_id when a drip day is
 * retired as past-window instead of sent. The prod table has no status
 * column (id / user_id / email_key / sent_at / resend_id — see
 * supabase/migrations/20260620170000_lifecycle_email_log.sql), and
 * resend_id is free-form tracing text nothing parses, so a distinct
 * value there is how a skipped row stays distinguishable from a real
 * send (real Resend ids never contain ":").
 */
export const DRIP_SKIPPED_RESEND_ID = "skipped:past_window";

const DAY_MS = 86_400_000;

/** Whole days between an ISO timestamp and `now` (0 if unparseable). */
export function daysBetween(fromIso: string, now: Date): number {
  const from = new Date(fromIso).getTime();
  if (!Number.isFinite(from)) return 0;
  return Math.floor((now.getTime() - from) / DAY_MS);
}

/**
 * The single highest-priority lifecycle email due for one user, or null.
 * At most one per user per run, to avoid flooding an inbox.
 * Priority order: welcome > drip > pro_nudge > winback.
 */
export function selectDueLifecycleEmail(
  user: LifecycleUserState,
  now: Date = new Date()
): DueLifecycleEmail | null {
  const sent = new Set(user.sentKeys);

  // 1) Welcome — once, only after the account is confirmed.
  if (user.confirmed && !sent.has("welcome")) {
    return { userId: user.userId, email: user.email, kind: "welcome", key: "welcome" };
  }

  // 2) Onboarding drip — the earliest unsent day that is due AND still
  //    inside its onboarding window (age <= day + grace). Past-window days
  //    are never sent from here; the cron retires them via expiredDripKeys.
  //    Free users only: the drip is a Pro-conversion sequence, so pitching
  //    "upgrade to Pro" at users who already pay is wrong.
  if (user.confirmed && user.plan === "free") {
    const daysSinceSignup = daysBetween(user.signupAt, now);
    for (let d = 1; d <= MAX_DRIP_DAY; d++) {
      if (
        d <= daysSinceSignup &&
        daysSinceSignup <= d + DRIP_CATCH_UP_GRACE_DAYS &&
        !sent.has(`drip_${d}`)
      ) {
        return {
          userId: user.userId,
          email: user.email,
          kind: "drip",
          key: `drip_${d}`,
          dripDay: d,
        };
      }
    }
  }

  // 3) Free -> Pro nudge — once, for free users who moved through the
  //    onboarding drip without upgrading. (Free users have no per-user
  //    activity signal — they can't save deals — so this is age-based.)
  if (
    user.plan === "free" &&
    daysBetween(user.signupAt, now) >= PRO_NUDGE_AFTER_DAYS &&
    !sent.has("pro_nudge")
  ) {
    return { userId: user.userId, email: user.email, kind: "pro_nudge", key: "pro_nudge" };
  }

  // 4) Win-back — once, for users inactive for a while.
  if (
    user.lastActivityAt !== null &&
    daysBetween(user.lastActivityAt, now) >= WINBACK_AFTER_INACTIVE_DAYS &&
    !sent.has("winback_21d")
  ) {
    return { userId: user.userId, email: user.email, kind: "winback", key: "winback_21d" };
  }

  return null;
}

/**
 * Drip-day keys whose onboarding window has already passed for this user
 * and that were never sent: they must be RETIRED (logged with
 * DRIP_SKIPPED_RESEND_ID), not queued. Time-based only — applies to free
 * and paid users alike, so a later plan change can never resurrect a
 * stale day. Once a key is retired it shows up in sentKeys and stops
 * being reported here, so the cron's mark-skipped write is idempotent.
 */
export function expiredDripKeys(user: LifecycleUserState, now: Date = new Date()): string[] {
  if (!user.confirmed) return [];
  const sent = new Set(user.sentKeys);
  const daysSinceSignup = daysBetween(user.signupAt, now);
  const expired: string[] = [];
  for (let d = 1; d <= MAX_DRIP_DAY; d++) {
    const key = `drip_${d}`;
    if (daysSinceSignup > d + DRIP_CATCH_UP_GRACE_DAYS && !sent.has(key)) {
      expired.push(key);
    }
  }
  return expired;
}

/** Map a batch of users to the lifecycle emails due this run (skips users with none). */
export function selectDueLifecycleEmails(
  users: LifecycleUserState[],
  now: Date = new Date()
): DueLifecycleEmail[] {
  const due: DueLifecycleEmail[] = [];
  for (const user of users) {
    const next = selectDueLifecycleEmail(user, now);
    if (next) due.push(next);
  }
  return due;
}

/** The content-file key for a due email: drip days map to day-NN, others to their key. */
export function contentKeyFor(due: DueLifecycleEmail): string {
  if (due.kind === "drip" && typeof due.dripDay === "number") {
    return `day-${String(due.dripDay).padStart(2, "0")}`;
  }
  return due.key;
}
