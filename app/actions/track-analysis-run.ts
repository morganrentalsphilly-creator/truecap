"use server";

import { headers } from "next/headers";
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
 * actual analysis.
 *
 * TRUST NOTE (corrected Aug 2026 — the previous comment here claimed the
 * opposite): `app_counters` is RLS-locked and `increment_analysis_runs` is
 * revoked from anon/authenticated, so nobody can bump the row through PostgREST
 * — but THIS action bypasses all of that with the service-role client, takes no
 * arguments, and is an anonymous public server action whose id ships in the
 * homepage bundle. It is therefore an unauthenticated write into production
 * Postgres, and the RLS lockdown protects the route nobody was using. The
 * per-IP bucket below is the actual brake: it keeps a scripted loop from
 * running the public social-proof number (and Morgan's read of real usage)
 * away from reality.
 * A real person clicking Run cannot reach this ceiling.
 */

// Best-effort per-IP limiter (in-memory, per serverless instance) — mirrors the
// pattern in app/actions/capture-deal-lead.ts. Instance churn can let a few
// extra bumps through; that is fine for a vanity counter. What it stops is the
// cheap unbounded loop.
const RUN_WINDOW_MS = 60 * 60 * 1000;
const RUN_MAX_PER_WINDOW = 30;
const runBuckets = new Map<string, { windowStart: number; count: number }>();

function overRunLimit(ip: string): boolean {
  const now = Date.now();
  const b = runBuckets.get(ip);
  if (!b || now - b.windowStart > RUN_WINDOW_MS) {
    runBuckets.set(ip, { windowStart: now, count: 1 });
    return false;
  }
  b.count += 1;
  if (runBuckets.size > 5000) {
    for (const [k, v] of runBuckets) if (now - v.windowStart > RUN_WINDOW_MS) runBuckets.delete(k);
  }
  return b.count > RUN_MAX_PER_WINDOW;
}

export async function trackAnalysisRunAction(): Promise<void> {
  try {
    let ip = "unknown";
    try {
      const h = await headers();
      ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    } catch {
      /* headers() unavailable — fall through with the shared bucket */
    }
    if (overRunLimit(ip)) return;

    const admin = createAdminSupabaseClient();
    await admin.rpc("increment_analysis_runs");
  } catch {
    // Swallow — a vanity counter must never interrupt the user's analysis.
  }
}
