import "server-only";

/**
 * Global daily ceiling on Anthropic-billed calls.
 *
 * Why this exists: the two anonymous AI endpoints (Deal Q&A, AI deal summary)
 * are reachable with no session, and their only brake was a per-caller counter
 * held in a module-level Map — i.e. per serverless instance, keyed on the first
 * x-forwarded-for entry. That is fine for a human hitting refresh (its stated
 * design), but it is not a spend ceiling: rotating source IPs mints a fresh
 * free allowance per IP, and instance churn multiplies it. Nothing anywhere
 * capped the dollars, so the practical ceiling was the Anthropic account limit.
 *
 * This is the missing outer bound: one shared counter in `app_counters`,
 * incremented atomically only while it is under the cap
 * (increment_app_counter_if_under — the same primitive the RentCast budget
 * uses), so no matter how the per-IP bucket is defeated, the day's LLM spend is
 * bounded. Keep the in-memory per-caller bucket as the cheap first gate; this
 * is the backstop.
 *
 * Deliberately FAILS OPEN: if the RPC isn't deployed or the DB call errors, the
 * request proceeds. A counter outage must not take a shipped feature down — the
 * per-caller limiter is still in front of it.
 *
 * Tunable via ANTHROPIC_DAILY_CALL_CAP (0 or negative disables the ceiling).
 */

import { createAdminSupabaseClient } from "@/lib/supabase/admin";

const RAW_CAP = Number.parseInt(process.env.ANTHROPIC_DAILY_CALL_CAP ?? "500", 10);
const DAILY_CALL_CAP = Number.isFinite(RAW_CAP) ? RAW_CAP : 500;

/**
 * Reserve one Anthropic call against today's global budget.
 * Returns false ONLY when the cap is provably reached; true otherwise.
 */
export async function reserveAnthropicCall(): Promise<boolean> {
  if (!(DAILY_CALL_CAP > 0)) return true;
  try {
    const day = new Date().toISOString().slice(0, 10);
    const admin = createAdminSupabaseClient();
    const { data, error } = await admin.rpc("increment_app_counter_if_under", {
      counter_key: `anthropic_calls_${day}`,
      max_value: DAILY_CALL_CAP,
      amount: 1,
    });
    if (error) return true; // RPC absent / transient DB error → fail open
    return data != null; // null = already at the cap
  } catch {
    return true; // never let the guard itself break the feature
  }
}
