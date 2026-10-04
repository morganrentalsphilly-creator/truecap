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
    if (!res.ok) return "unavailable";
    const json = (await res.json()) as { success?: unknown };
    return json.success === true ? "ok" : "failed";
  } catch {
    return "unavailable";
  }
}
