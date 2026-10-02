/**
 * Pacing and 429 handling for per-recipient Resend sends.
 *
 * Resend's documented default is 10 API requests per second for the whole
 * team, enforced per one-second window with no burst allowance, and shared by
 * every API key (resend.com/docs/api-reference/rate-limit, read 2026-10-02).
 * The lifecycle cron leaves most of that for sign-up confirmations and alerts:
 * one request every SEND_GAP_MS.
 *
 * A 429 carries one of three error names in its JSON body:
 *   rate_limit_exceeded     too many requests this second; wait and go on
 *   daily_quota_exceeded    the plan's daily email quota is used up (resets
 *                           at midnight UTC); nothing more can send today
 *   monthly_quota_exceeded  the plan's monthly quota is used up
 * (resend.com/docs/api-reference/errors, read 2026-10-02.)
 */

/** Minimum gap between two Resend requests in one run: 4 a second at most. */
export const SEND_GAP_MS = 250;
/** How many `rate_limit_exceeded` answers a run tolerates before it stops. */
export const MAX_RATE_LIMIT_HITS = 3;
/**
 * Wall-clock budget for the send loop. The route's maxDuration is 120s; the
 * loop stops early so the response and the log line still go out.
 */
export const RUN_BUDGET_MS = 100_000;

const MIN_RETRY_WAIT_MS = 1_000;
const MAX_RETRY_WAIT_MS = 5_000;

/**
 * An object, so a test can replace `wait` and assert the pauses without
 * waiting for them.
 */
export const pacing = {
  wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  },
};

export type Resend429Kind = "rate_limit" | "daily_quota" | "monthly_quota";

/** Classify a 429 from its response body. An unreadable body is a rate limit. */
export function classifyResend429(body: string): Resend429Kind {
  let name = "";
  try {
    const parsed = JSON.parse(body) as { name?: unknown } | null;
    if (typeof parsed?.name === "string") name = parsed.name;
  } catch {
    name = "";
  }
  if (name === "daily_quota_exceeded") return "daily_quota";
  if (name === "monthly_quota_exceeded") return "monthly_quota";
  return "rate_limit";
}

/** How long to wait after a rate-limit 429, from its `retry-after` header (seconds). */
export function retryAfterMs(header: string | null): number {
  const seconds = Number(header);
  if (!Number.isFinite(seconds) || seconds <= 0) return MIN_RETRY_WAIT_MS;
  return Math.min(MAX_RETRY_WAIT_MS, Math.max(MIN_RETRY_WAIT_MS, Math.ceil(seconds * 1000)));
}
