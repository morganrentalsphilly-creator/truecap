import "server-only";

/**
 * Single source of truth for the RATE_ALERTS_MODE parse — the cron and
 * every surface that PROMISES an alert email (the Settings toggle copy,
 * the dashboard RateWatchStrip explainer, the analyzer's inline opt-in
 * nudge) all derive from here, so copy and sends can never disagree.
 * When Morgan flips the env var to "live", the promises come back with
 * zero code changes.
 *
 * `import "server-only"`: reads a non-NEXT_PUBLIC env var — a client
 * import would silently return "off" in the browser; the guard makes
 * that mistake a build error instead (CLAUDE.md §3.11).
 */

export type RateAlertsMode = "off" | "dry" | "live";

export function resolveRateAlertsMode(): RateAlertsMode {
  const raw = (process.env.RATE_ALERTS_MODE ?? "off").trim().toLowerCase();
  if (raw === "live") return "live";
  if (raw === "dry" || raw === "dry-run") return "dry";
  return "off";
}

/** True only when the send-rate-alerts cron will ACTUALLY send emails. */
export function rateAlertEmailsLive(): boolean {
  return resolveRateAlertsMode() === "live";
}
