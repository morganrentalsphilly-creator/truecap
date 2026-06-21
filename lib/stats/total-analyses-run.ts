import "server-only";

import { unstable_cache } from "next/cache";

/**
 * Total number of analyses RUN — the count of the `analyzer_started` PostHog
 * event across all users, all time. This is the HONEST "deals analyzed" figure:
 * the saved-deals count (lib/stats/deals-analyzed-count) only counts the small
 * fraction of runs a user chose to save, so it dramatically undercounts usage.
 *
 * Reads PostHog's HogQL query API (read-only). On the static homepage this runs
 * at build / hourly revalidation — never per visitor. Returns null on ANY error
 * or missing config so the ticker hides gracefully — it never shows a
 * fabricated or stale number.
 *
 * Required env:
 *   - POSTHOG_API_KEY     personal key (phx_...), must have query/read scope
 *   - POSTHOG_PROJECT_ID  the numeric project id (PostHog → Settings → Project)
 * Optional:
 *   - NEXT_PUBLIC_POSTHOG_HOST (defaults to US cloud)
 */
async function fetchTotalAnalysesRun(): Promise<number | null> {
  const apiKey = process.env.POSTHOG_API_KEY;
  const projectId = process.env.POSTHOG_PROJECT_ID;
  if (!apiKey || !projectId) return null;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";

  try {
    const res = await fetch(`${host}/api/projects/${projectId}/query/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: {
          kind: "HogQLQuery",
          query: "SELECT count() FROM events WHERE event = 'analyzer_started'",
        },
      }),
      // Next's unstable_cache (below) owns the caching window; tell fetch not
      // to also cache so a stale build-time response can't pin the number.
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { results?: Array<Array<number>> };
    const count = json.results?.[0]?.[0];
    return typeof count === "number" && Number.isFinite(count) ? count : null;
  } catch {
    return null;
  }
}

/**
 * Cached public entry point. 1-hour TTL — long enough to avoid hammering the
 * PostHog query API on every homepage revalidation, short enough that the
 * number stays fresh.
 */
export const getTotalAnalysesRunCount = unstable_cache(
  async () => fetchTotalAnalysesRun(),
  ["total-analyses-run"],
  { revalidate: 3600, tags: ["analyses-run-count"] }
);
