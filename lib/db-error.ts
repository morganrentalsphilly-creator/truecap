import "server-only";
import * as Sentry from "@sentry/nextjs";

/**
 * Canonical SERVER_ERROR result for server actions.
 *
 * Raw Supabase/Postgres `error.message` strings can carry table + column names
 * or SQL fragments. Returning them straight to the browser (as several actions
 * did) lets an observer fingerprint the schema + migration state. This helper
 * returns a generic, user-safe message while still sending the real error to
 * Sentry (tagged by `feature`) so triage loses nothing.
 *
 * Usage — replace `return { ok: false, code: "SERVER_ERROR", message: error.message }`
 * with `return toServerErrorResult(error, "saved-analyses")`.
 *
 * IMPORTANT: keep any MIGRATION_PENDING (Postgres 42703 / 42P01) interception
 * ABOVE this in the action — those map to their own user-facing code. This only
 * replaces the generic catch-all branch. The returned `code` is the literal
 * "SERVER_ERROR", which is a member of every action's result union, so callers
 * that branch on `code` are unaffected — only the human `message` changes.
 */
export function toServerErrorResult(
  error: unknown,
  feature: string,
): { ok: false; code: "SERVER_ERROR"; message: string } {
  Sentry.captureException(error, { tags: { feature } });
  return {
    ok: false,
    code: "SERVER_ERROR",
    message: "We couldn't complete that action. Please try again.",
  };
}
