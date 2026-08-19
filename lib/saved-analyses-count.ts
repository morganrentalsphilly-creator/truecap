import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * TWO COUNTS, TWO JOBS. Do not collapse them.
 *
 * They differ only in whether archived and completed deals are included, and
 * that difference is load-bearing in opposite directions:
 *
 *   getSavedAnalysesTotalCount — EVERYTHING the user owns. This is the number
 *     the saved-deal LIMIT is measured against. It must keep counting archived
 *     and completed deals: if it did not, a free user could archive their way
 *     past the 5-deal cap indefinitely and the limit would mean nothing.
 *
 *   getActiveSavedAnalysesCount — what the My Deals table shows by DEFAULT.
 *     This is the number for the sidebar badge. The badge used to use the
 *     total, so it read "12" while the page it links to listed 7 rows, and the
 *     gap was invisible — the archived deals making up the difference are on a
 *     tab the user has to go looking for.
 *
 * The filter here mirrors app/dashboard/saved-analyses/page.tsx's "active"
 * branch exactly (`is_completed = false AND is_archived = false`, plus the
 * soft-delete guard). If that page's definition of active changes, change this
 * with it or the badge silently drifts again.
 */

export async function getSavedAnalysesTotalCount(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  const { count, error } = await supabase
    .from("saved_analyses")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("deleted_at", null);

  if (error) return 0;
  return count ?? 0;
}

export async function getActiveSavedAnalysesCount(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  const { count, error } = await supabase
    .from("saved_analyses")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("deleted_at", null)
    .eq("is_completed", false)
    .eq("is_archived", false);

  if (error) return 0;
  return count ?? 0;
}
