/**
 * Pure helpers for the request boundary's refresh-token recovery. Kept free
 * of Next/Supabase imports so they unit-test without a request object.
 */

/** Supabase auth cookie name pattern (chunked cookies use a `.N` suffix). */
export const SUPABASE_AUTH_COOKIE_RE = /^sb-[a-z0-9-]+-auth-token(?:\.\d+)?$/i;

/** GoTrue error codes that mean "this session is dead; treat as signed out". */
const DEAD_SESSION_CODES = new Set([
  "refresh_token_not_found",
  "refresh_token_already_used",
  "session_not_found",
  "session_expired",
  "validation_failed",
  "bad_jwt",
  "invalid_grant",
]);

/** Messages GoTrue used before it carried structured codes. */
const DEAD_SESSION_MESSAGE_RE =
  /invalid refresh token|refresh token not found|refresh token is not valid|session from session_id claim in jwt does not exist|jwt expired/i;

/**
 * True when the auth error means the visitor's stored session is dead (as
 * opposed to a transient outage). Only for these do we actively clear the
 * cookies — clearing on an outage would sign healthy users out during a blip.
 * Structural on purpose: AuthError's own fields are partly protected, and a
 * plain object from a test or an older auth-js must classify the same way.
 */
export function isDeadSessionAuthError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const { code, message } = error as { code?: unknown; message?: unknown };
  if (typeof code === "string" && DEAD_SESSION_CODES.has(code)) return true;
  if (typeof message === "string" && DEAD_SESSION_MESSAGE_RE.test(message)) return true;
  return false;
}

/** The auth cookie names present in a request cookie list. */
export function authCookieNamesToClear(cookieNames: readonly string[]): string[] {
  return cookieNames.filter((name) => SUPABASE_AUTH_COOKIE_RE.test(name));
}
