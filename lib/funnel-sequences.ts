/**
 * Funnel sequence scheduler — PURE logic, no I/O
 * (docs/funnel-leaks-plan.md Phase B). Flag: FUNNEL_SEQUENCES=on.
 *
 * Two short sequences ride the existing lifecycle estate (the daily cron in
 * app/api/cron/send-lifecycle-emails, LIFECYCLE_EMAILS_MODE, and the
 * lifecycle_email_log claim):
 *
 *   memo_lead  L0 (the memo, sent at capture) · L1 d2 · L2 d5 · L3 d9 · L4 d14
 *              keyed off memo_leads.created_at
 *   trial      T0 d0 · T1 d3 · T2 d7 · T3 d14 · T4 d18 · T5 d21 · T6 d30
 *              keyed off product_evaluations.started_at
 *
 * Rules, all enforced here so they are unit-testable
 * (lib/__tests__/funnel-sequences.test.ts):
 *   - at most one step per recipient per run (the earliest unsent step that
 *     is due and still inside its window);
 *   - a step is never repeated: anything in sentKeys is skipped, and the cron
 *     claims the unique lifecycle_email_log row before sending;
 *   - a step is only sendable from its day through day + STEP_GRACE_DAYS.
 *     Past that it is expired and gets retired, never sent late — so turning
 *     the flag on cannot replay the sequence at accounts older than it;
 *   - unsubscribed or converted recipients (lead → account, trial → paid)
 *     get nothing further.
 *
 * The cron runs once a day (14:00 UTC), so "day N" means the first run at or
 * after N whole days from the start.
 */

import { daysBetween } from "@/lib/lifecycle-emails";

export type SequenceId = "memo_lead" | "trial";
export type SequenceVariant = "investor" | "agent";

export type SequenceStep = {
  /** Idempotency key stored in lifecycle_email_log.email_key. */
  key: string;
  /** Whole days after the sequence start. */
  day: number;
};

/** L0 is the memo itself, sent by app/actions/memo-lead-capture.ts. */
export const MEMO_LEAD_STEPS: readonly SequenceStep[] = [
  { key: "L1", day: 2 },
  { key: "L2", day: 5 },
  { key: "L3", day: 9 },
  { key: "L4", day: 14 },
];

export const TRIAL_STEPS: readonly SequenceStep[] = [
  { key: "T0", day: 0 },
  { key: "T1", day: 3 },
  { key: "T2", day: 7 },
  { key: "T3", day: 14 },
  { key: "T4", day: 18 },
  { key: "T5", day: 21 },
  { key: "T6", day: 30 },
];

export const SEQUENCE_STEPS: Record<SequenceId, readonly SequenceStep[]> = {
  memo_lead: MEMO_LEAD_STEPS,
  trial: TRIAL_STEPS,
};

/**
 * How many days past its day a step may still send. Two absorbs a couple of
 * missed cron runs and keeps the trial-end pair inside the offer: T4's window
 * is days 18–20, T5's is 21–23, and the offer closes after day 23.
 */
export const STEP_GRACE_DAYS = 2;

/** Marker stored in lifecycle_email_log.resend_id for a retired step (the
 *  table has no status column; real Resend ids never contain ":"). */
export const SEQUENCE_SKIPPED_RESEND_ID = "skipped:past_window";

/**
 * T0 replaces the legacy "welcome" email. An account that already received
 * the legacy welcome must not be welcomed again when the flag turns on.
 */
const LEGACY_EQUIVALENT_KEYS: Record<string, string> = { T0: "welcome" };

export type SequenceRecipientState = {
  sequence: SequenceId;
  /** Sequence start (ISO): lead capture time, or trial start. */
  startAt: string;
  /** lifecycle_email_log.email_key values already recorded for the recipient. */
  sentKeys: readonly string[];
  /** Opted out, or the address is in email_suppressions. */
  unsubscribed: boolean;
  /** Lead created an account, or the trial account became a paying customer. */
  converted: boolean;
};

function isSatisfied(step: SequenceStep, sent: ReadonlySet<string>): boolean {
  if (sent.has(step.key)) return true;
  const legacy = LEGACY_EQUIVALENT_KEYS[step.key];
  return legacy !== undefined && sent.has(legacy);
}

function ageInDays(state: SequenceRecipientState, now: Date): number | null {
  if (!Number.isFinite(new Date(state.startAt).getTime())) return null;
  return daysBetween(state.startAt, now);
}

/** The one step due for this recipient right now, or null. */
export function selectDueSequenceStep(
  state: SequenceRecipientState,
  now: Date = new Date(),
): SequenceStep | null {
  if (state.unsubscribed || state.converted) return null;
  const age = ageInDays(state, now);
  if (age === null || age < 0) return null;
  const sent = new Set(state.sentKeys);
  for (const step of SEQUENCE_STEPS[state.sequence]) {
    if (age < step.day) break; // later steps are not due either
    if (age > step.day + STEP_GRACE_DAYS) continue; // expired — retired, not sent
    if (isSatisfied(step, sent)) continue;
    return step;
  }
  return null;
}

/**
 * Steps whose window has passed without a send: the cron records them with
 * SEQUENCE_SKIPPED_RESEND_ID so they can never go out late. Time-based only —
 * it applies to exited recipients too, so a later state change (a refund, a
 * re-subscribe) cannot resurrect a stale step.
 */
export function expiredSequenceKeys(
  state: SequenceRecipientState,
  now: Date = new Date(),
): string[] {
  const age = ageInDays(state, now);
  if (age === null) return [];
  const sent = new Set(state.sentKeys);
  return SEQUENCE_STEPS[state.sequence]
    .filter((step) => age > step.day + STEP_GRACE_DAYS && !isSatisfied(step, sent))
    .map((step) => step.key);
}

// ── Trial-end offer (T4/T5) ────────────────────────────────────────────────

/** Public code carried by the T4/T5 links; resolved server-side at checkout. */
export const TRIAL_END_OFFER_CODE = "TRIALEND";
export const TRIAL_END_OFFER_FIRST_DAY = 18;
export const TRIAL_END_OFFER_LAST_DAY = 23;

/** True on days 18–23 of the trial (whole days since it started). */
export function isWithinTrialEndOfferWindow(
  trialStartedAt: string | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!trialStartedAt) return false;
  const start = new Date(trialStartedAt).getTime();
  if (!Number.isFinite(start) || start > now.getTime()) return false;
  const day = daysBetween(trialStartedAt, now);
  return day >= TRIAL_END_OFFER_FIRST_DAY && day <= TRIAL_END_OFFER_LAST_DAY;
}
