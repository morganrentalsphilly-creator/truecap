import { unstable_cache } from "next/cache";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { formatUsageCount } from "@/lib/testimonials/rules";
import { getUsageCounts } from "@/lib/testimonials/store";

/**
 * Computed usage counter (docs/site-overhaul.md Phase 5.6). Counts REAL rows
 * — saved deals by non-demo accounts — cached one hour. Hidden below 100,
 * exact from 100–999, rounded DOWN to the nearest hundred above 1,000.
 * Never hard-coded, never seeded: the owner-entered cumulative run counter
 * in app_counters is deliberately not used.
 */
const cachedCounts = unstable_cache(
  async () => {
    try {
      return await getUsageCounts(createAdminSupabaseClient());
    } catch {
      return { dealsSaved: null };
    }
  },
  ["site-overhaul-usage-counts"],
  { revalidate: 3600 },
);

export async function loadUsageLabel(): Promise<string | null> {
  const counts = await cachedCounts();
  const formatted = formatUsageCount(counts.dealsSaved);
  return formatted ? `${formatted} deals saved` : null;
}

export async function UsageCounter({ className = "" }: { className?: string }) {
  const label = await loadUsageLabel();
  if (!label) return null;
  return (
    <p data-usage-counter="" className={`text-sm font-semibold text-foreground ${className}`.trim()}>
      {label}
    </p>
  );
}
