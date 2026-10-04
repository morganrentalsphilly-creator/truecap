import "server-only";

/**
 * Server-side Cloudflare Turnstile verification for OUR anonymous actions.
 *
 * The auth forms hand their token to Supabase, which verifies it. An action
 * that never touches Supabase Auth (the decision-memo capture) has to call
 * siteverify itself. It uses ITS OWN widget — NEXT_PUBLIC_MEMO_TURNSTILE_SITE_KEY
 * with MEMO_TURNSTILE_SECRET_KEY — never the auth forms' widget: a Turnstile
 * secret only verifies tokens from its own site key, and the auth widget's
 * secret is held by Supabase.
 *
 * Rollout matches components/auth/captcha-widget.tsx:
 *   - neither key set      → "not_configured": the caller proceeds on its other
 *                            brakes (honeypot + the durable email-capture guard);
 *   - site key, no secret  → "misconfigured": the widget is issuing tokens we
 *                            cannot check, so the caller must fail closed;
 *   - both set             → the token is required and verified.
 */
const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export type TurnstileVerdict = "ok" | "not_configured" | "misconfigured" | "failed" | "unavailable";

export async function verifyTurnstileToken(
  token: string | null | undefined,
  remoteIp: string | null,
  env: Record<string, string | undefined> = process.env,
  fetchImpl: typeof fetch = fetch,
): Promise<TurnstileVerdict> {
  const secret = env.MEMO_TURNSTILE_SECRET_KEY?.trim();
  const siteKey = env.NEXT_PUBLIC_MEMO_TURNSTILE_SITE_KEY?.trim();
  if (!secret) return siteKey ? "misconfigured" : "not_configured";
  if (!token || token.length > 2048) return "failed";
  try {
    const body = new URLSearchParams({ secret, response: token });
    if (remoteIp && remoteIp !== "unknown") body.set("remoteip", remoteIp);
    const res = await fetchImpl(SITEVERIFY_URL, {
      method: "POST",
      body,
      signal: AbortSignal.timeout(8_000),
    });
    // Cloudflare answers a wrong secret with HTTP 400 and the same JSON body
    // as any other rejection ({ success: false, "error-codes": [...] }), so
    // the body is read whatever the status. Only a response with no readable
    // body counts as the service being unavailable.
    const json = (await res.json().catch(() => null)) as {
      success?: unknown;
      "error-codes"?: unknown;
    } | null;
    if (!json) {
      console.warn(`[turnstile] siteverify answered HTTP ${res.status} with no JSON body`);
      return "unavailable";
    }
    if (res.ok && json.success === true) return "ok";
    // Cloudflare's reason, for the server log. The codes name the cause and
    // carry no secret: "invalid-input-secret" (the configured secret is not
    // this widget's), "invalid-input-response" (bad or foreign token),
    // "timeout-or-duplicate" (expired or already verified).
    const codes = Array.isArray(json["error-codes"])
      ? json["error-codes"].filter((c): c is string => typeof c === "string").join(",")
      : "none";
    console.warn(`[turnstile] siteverify rejected the token: ${codes}`);
    return "failed";
  } catch (err) {
    console.warn(
      `[turnstile] siteverify request failed: ${err instanceof Error ? err.name : "unknown"}`,
    );
    return "unavailable";
  }
}
