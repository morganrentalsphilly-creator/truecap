/**
 * Presentation-layer mapping from raw Supabase Storage / Auth error strings
 * to plain-English toast copy.
 *
 * Raw `error.message` values ("new row violates row-level security policy",
 * "The resource already exists", "provider is not enabled") are jargon-heavy
 * and blame-ambiguous exactly where trust is most fragile — a Pro user's
 * uploaded documents, the sign-in button. This is the client-side sibling of
 * `lib/db-error.ts` (server actions): show a friendly line, send the real
 * error to Sentry (§3.9 — never swallow) so triage loses nothing.
 *
 * Usage — replace `toast({ description: error.message })` with
 * `toast({ description: friendlyToastError(error, { feature: "deal-documents" }) })`.
 *
 * NOTE: presentation-only. Server actions keep their discriminated-union
 * `code` + `message` shape (§3.2) — this helper is for client-side calls
 * that talk to Supabase directly (Storage, OAuth) and would otherwise pipe
 * the SDK's raw message into a toast.
 */
import * as Sentry from "@sentry/nextjs";

const GENERIC_FALLBACK = "Something went wrong. Please try again.";

/** Known failure classes, first match wins. Patterns target Supabase Storage
 *  + GoTrue message text, which is stable but not contractual — every miss
 *  still lands on the (per-call-site) fallback, so a wording drift only
 *  costs specificity, never correctness. */
const KNOWN_ERROR_CLASSES: ReadonlyArray<{ pattern: RegExp; message: string }> = [
  // Storage: object already exists at that path (upload with upsert: false).
  {
    pattern: /resource already exists|already exists/i,
    message: "A file with this name already exists — rename it and try again.",
  },
  // Storage: object rejected by the bucket's size cap.
  {
    pattern: /exceeded the maximum allowed size|payload too large|entity too large/i,
    message: "That file is too large to upload.",
  },
  // Storage: bucket mime allowlist rejected the file. Battle-tested live on
  // 2026-08-31: a .zip injected past the picker's accept filter (as drag-drop
  // would be) came back 400 "mime type application/zip is not supported" and
  // the toast said "Please try again" — advice that can never fix a type
  // rejection. Name the real problem and the real remedy instead.
  {
    pattern: /mime type .* is not supported|invalid_mime_type|content.?type not allowed/i,
    message:
      "That file type isn't supported. Upload a PDF, an image, a Word or Excel file, a CSV, or plain text.",
  },
  // Storage: signed-URL / download target no longer exists.
  {
    pattern: /object not found/i,
    message: "That document is no longer available. Refresh the page and try again.",
  },
  // RLS denial — almost always a stale session rather than a real
  // permissions problem for our path-scoped buckets.
  {
    pattern: /row-level security|not authorized|unauthorized/i,
    message: "You don't have access to do that. Refresh the page and sign in again.",
  },
  // Auth: OAuth provider disabled/misconfigured in the Supabase project.
  {
    pattern: /provider is not enabled|unsupported provider/i,
    message: "Google sign-in isn't available right now — use your email and password instead.",
  },
  // Stale/expired session token.
  {
    pattern: /jwt expired|invalid jwt|not authenticated/i,
    message: "Your session expired. Refresh the page and sign in again.",
  },
  // Rate limiting (auth endpoints especially).
  {
    pattern: /rate limit|too many requests/i,
    message: "Too many attempts — wait a moment and try again.",
  },
  // Browser-level network failures (matches the §3.9 ignoreErrors families).
  {
    pattern: /failed to fetch|networkerror|network request failed|load failed/i,
    message: "We couldn't reach the server — check your connection and try again.",
  },
];

/** Extract a raw message string from whatever the SDK threw/returned. */
function rawMessage(error: unknown): string | null {
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    const m = (error as { message?: unknown }).message;
    if (typeof m === "string") return m;
  }
  return null;
}

/**
 * Pure mapping: raw error → plain-English copy. Unknown errors get the
 * `fallback` (pass a call-site-specific line like "We couldn't upload this
 * file. Please try again." when you have one).
 */
export function friendlyErrorMessage(error: unknown, fallback: string = GENERIC_FALLBACK): string {
  const raw = rawMessage(error);
  if (!raw) return fallback;
  for (const klass of KNOWN_ERROR_CLASSES) {
    if (klass.pattern.test(raw)) return klass.message;
  }
  return fallback;
}

/**
 * The toast-side entry point: captures the raw error to Sentry (tagged by
 * `feature`, matching the `lib/db-error.ts` convention) and returns the
 * friendly copy for the toast description.
 */
export function friendlyToastError(
  error: unknown,
  opts: { feature: string; fallback?: string },
): string {
  Sentry.captureException(error, { tags: { feature: opts.feature } });
  return friendlyErrorMessage(error, opts.fallback);
}
