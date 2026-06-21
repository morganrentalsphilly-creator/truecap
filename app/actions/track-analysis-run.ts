"use server";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";

/**
 * Fire-and-forget increment of the global "analyses run" counter — one bump per
 * fresh "Run analysis" click. Powers the homepage social-proof ticker
 * (lib/stats/total-analyses-run + components/marketing/deals-analyzed-ticker).
 *
 * Called from investcalc-page onSubmit alongside the `analyzer_started` PostHog
 * event — i.e. only on a real Run click, NOT on saved-deal loads or restores —
 * so the figure reflects "times Run analysis was clicked" exactly.
 *
 * Best-effort by design: wrapped so a counter write can NEVER fail or slow the
 * actual analysis. Uses the service-role client because the counter row is
 * locked down (RLS-enabled, no anon/authenticated policies) so it can't be
 * inflated by direct API calls — only this trusted server path may bump it.
 */
export async function trackAnalysisRunAction(): Promise<void> {
  try {
    const admin = createAdminSupabaseClient();
    await admin.rpc("increment_analysis_runs");
  } catch {
    // Swallow — a vanity counter must never interrupt the user's analysis.
  }
}
