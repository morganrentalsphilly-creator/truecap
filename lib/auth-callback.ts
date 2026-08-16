import { internalNextPathOrNull } from "@/lib/auth-schema";

const AUTH_RETURN_PATH_BASE = "https://truecap.invalid";

export function authCallbackFailureReason(
  providerError: string | null,
  description: string | null
): string {
  if (providerError === "access_denied") return "oauth_cancelled";
  const reason = (description || providerError || "missing_token").trim();
  return reason.slice(0, 300) || "missing_token";
}

export function buildAuthErrorRedirectUrl(
  origin: string,
  reason: string,
  rawNext: unknown
): string {
  const url = new URL("/auth/login", origin);
  url.searchParams.set("error", "auth");
  url.searchParams.set("reason", reason.slice(0, 300));
  url.searchParams.set("next", authCallbackFailureNextPath(rawNext));
  return url.toString();
}

/**
 * A failed recovery callback must return to the destination that preceded the
 * reset flow, not to the update-password page that requires the now-expired
 * one-time session. Otherwise login -> forgot password nests another
 * update-password URL on every retry and the user can never resume their
 * original task.
 *
 * Validate both layers independently. A malformed outer path or an unsafe /
 * missing nested destination fails closed to the homepage.
 */
export function authCallbackFailureNextPath(rawNext: unknown): string {
  const next = internalNextPathOrNull(rawNext);
  if (!next) return "/";

  let parsed: URL;
  try {
    parsed = new URL(next, AUTH_RETURN_PATH_BASE);
  } catch {
    return "/";
  }

  if (parsed.pathname !== "/auth/update-password") return next;
  return internalNextPathOrNull(parsed.searchParams.get("next")) ?? "/";
}
