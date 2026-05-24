import "server-only";

import { unstable_cache } from "next/cache";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

/**
 * Aggregate count of saved analyses across all users.
 *
 * Used as a real-data social-proof signal on marketing surfaces
 * ("X deals analyzed this week"). Returns ONLY an aggregate count —
 * no user IDs, no addresses, no anything PII-adjacent.
 *
 * Uses the service-role client to bypass RLS for the count-only query.
 * Safe because:
 *   1. The function lives in a server-only module (cannot be imported
 *      from a client component).
 *   2. Returns a single integer — no row data ever leaves the function.
 *   3. Wrapped in unstable_cache with a 5-minute revalidation window
 *      so we don't thrash the DB on every page load.
 *
 * On any error (Supabase down, env var missing, table absent), returns
 * null so callers can render their fallback / hide the badge entirely.
 */

type Window = "all" | "7d" | "30d";

async function fetchDealsAnalyzedCount(window: Window): Promise<number | null> {
  try {
    const admin = createAdminSupabaseClient();
    let query = admin
      .from("saved_analyses")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null);

    if (window === "7d") {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      query = query.gte("created_at", sevenDaysAgo);
    } else if (window === "30d") {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      query = query.gte("created_at", thirtyDaysAgo);
    }

    const { count, error } = await query;
    if (error) {
      console.warn("[stats] deals-analyzed-count failed:", error.message);
      return null;
    }
    return count ?? 0;
  } catch (err) {
    console.warn(
      "[stats] deals-analyzed-count threw:",
      err instanceof Error ? err.message : String(err)
    );
    return null;
  }
}

/**
 * Public cached entry point. Cache TTL = 5 minutes — long enough to
 * dramatically reduce DB pressure (we'd otherwise hit the count query
 * on every homepage view), short enough that the displayed number
 * feels live.
 *
 * `unstable_cache` is the App Router caching primitive. The `tags`
 * array lets us manually invalidate via revalidateTag() from a
 * server action if we ever want to (e.g. after a deal is saved we
 * could bump the cache so the homepage updates in <60s).
 */
export const getDealsAnalyzedCount = unstable_cache(
  async (window: Window = "all") => fetchDealsAnalyzedCount(window),
  ["deals-analyzed-count"],
  { revalidate: 300, tags: ["saved-analyses-count"] }
);
