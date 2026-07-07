import "server-only";

/**
 * Single source of truth for the WEEKLY_SUMMARY_MODE parse — the
 * send-weekly-summary cron and every surface that PROMISES a weekly
 * summary email (the Settings toggle copy) all derive from here, so copy
 * and sends can never disagree. When Morgan flips the env var to "live",
 * the promises come back with zero code changes.
 *
 * Mirrors lib/rate-alerts-mode.ts exactly:
 *   - unset / "off" → off (DEFAULT — the feature ships dormant)
 *   - "dry"         → full compute, JSON preview, zero sends, zero writes
 *   - "live"        → actually sends via Resend + writes the idempotency log
 *
 * `import "server-only"`: reads a non-NEXT_PUBLIC env var — a client
 * import would silently return "off" in the browser; the guard makes
 * that mistake a build error instead (CLAUDE.md §3.11).
 */

export type WeeklySummaryMode = "off" | "dry" | "live";

export function resolveWeeklySummaryMode(): WeeklySummaryMode {
  const raw = (process.env.WEEKLY_SUMMARY_MODE ?? "off").trim().toLowerCase();
  if (raw === "live") return "live";
  if (raw === "dry" || raw === "dry-run") return "dry";
  return "off";
}

/** True only when the send-weekly-summary cron will ACTUALLY send emails. */
export function weeklySummaryEmailsLive(): boolean {
  return resolveWeeklySummaryMode() === "live";
}
