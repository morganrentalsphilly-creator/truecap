import { createServerClient } from "@supabase/ssr";
import { SUPABASE_COOKIE_OPTIONS } from "@/lib/supabase/cookie-options";
import { NextResponse, after, type NextRequest } from "next/server";
import type { EmailOtpType, User } from "@supabase/supabase-js";
import { safeInternalNextPath } from "@/lib/auth-schema";
import { sendLifecycleEmailNow } from "@/lib/email/send-lifecycle";
import { getSiteUrl } from "@/lib/site-url";
import { captureServerEvent } from "@/lib/posthog-server";
import {
  canonicalAnalyticsEventId,
  claimCanonicalAnalyticsEvent,
  releaseCanonicalAnalyticsEventClaim,
} from "@/lib/analytics/canonical-event-claim";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

const NEW_OAUTH_ACCOUNT_EVENTS = [
  { event: "account_created" as const },
  { event: "product_evaluation_started" as const },
];

/**
 * Fire the instant welcome email after a confirmation establishes a
 * session. Runs via `after()` so it never delays the redirect, and is
 * once-only: sendLifecycleEmailNow claims the lifecycle_email_log row, so
 * repeat logins and the daily cron can't duplicate it. Best-effort.
 */
function scheduleWelcome(
  user: { id: string; email?: string | null } | null | undefined,
) {
  const email = user?.email;
  if (!user || !email) return;
  const id = user.id;
  after(() =>
    sendLifecycleEmailNow(
      { userId: id, email, kind: "welcome", key: "welcome" },
      getSiteUrl(),
    ),
  );
}

/** OAuth sign-up bypasses the email form's client telemetry. Record only a
 * genuinely new Google identity, using the opaque auth UUID and no profile
 * data. Returning OAuth logins intentionally emit nothing. */
function scheduleNewOAuthAccountAnalytics(user: User | null | undefined) {
  if (!user || user.app_metadata?.provider !== "google") return;
  const createdAt = Date.parse(user.created_at);
  if (!Number.isFinite(createdAt)) return;
  const lastSignInAt = Date.parse(user.last_sign_in_at ?? "");
  // These timestamps establish that this is a genuinely new Google identity;
  // they are not the dedupe mechanism. Durable (event, user.id) claims below
  // prevent replayed or parallel callbacks from repeating funnel events.
  if (
    !Number.isFinite(lastSignInAt) ||
    Math.abs(lastSignInAt - createdAt) > 90_000
  ) {
    return;
  }
  const ageMs = Date.now() - createdAt;
  if (ageMs < 0 || ageMs > 10 * 60 * 1000) return;
  after(async () => {
    try {
      const admin = createAdminSupabaseClient();
      for (const analyticsEvent of NEW_OAUTH_ACCOUNT_EVENTS) {
        const claimInput = {
          eventName: analyticsEvent.event,
          dedupeKey: user.id,
        };
        let claimState: "claimed" | "duplicate" | "unavailable";
        try {
          claimState = (await claimCanonicalAnalyticsEvent(admin, claimInput))
            ? "claimed"
            : "duplicate";
        } catch {
          claimState = "unavailable";
        }
        if (claimState === "duplicate") continue;
        const captured = await captureServerEvent({
          distinctId: user.id,
          event: analyticsEvent.event,
          eventId: canonicalAnalyticsEventId(
            claimInput.eventName,
            claimInput.dedupeKey,
          ),
          properties: { referral_source: "google_oauth" },
        });
        if (!captured && claimState === "claimed") {
          await releaseCanonicalAnalyticsEventClaim(admin, claimInput);
        }
      }
    } catch {
      // Analytics remains best-effort and must never change auth redirects or
      // session establishment. A later replay can retry any unclaimed event.
    }
  });
}

/**
 * Single landing page for every Supabase email link (password reset,
 * email confirmation, magic link, email change, invite).
 *
 * Supports BOTH flows the Supabase Auth emails can use:
 *
 *  1. PKCE / hosted-verify flow:
 *       email link  → https://<project>.supabase.co/auth/v1/verify?token=…&redirect_to=https://us/auth/callback?next=…
 *       supabase verifies, then redirects to our callback with ?code=
 *       → call exchangeCodeForSession(code) and we're in.
 *
 *  2. Direct token-hash flow (the email template uses {{ .TokenHash }}
 *     and points straight at our app):
 *       email link  → https://us/auth/callback?token_hash=…&type=recovery&next=/auth/update-password
 *       → call verifyOtp({ token_hash, type }) to mint a session.
 *
 * Either path ends with cookies set on the redirect response and the
 * user dropped on the `next` page (defaulting to "/").
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  // Same-origin only. Concatenating onto `origin` already kept the host, but
  // route it through the shared origin-comparing validator so every ?next
  // consumer applies one rule (and `//evil.com` can't ride along as a path).
  const next = safeInternalNextPath(searchParams.get("next"));

  // Build the canonical redirect response upfront. Any cookies Supabase
  // sets while exchanging the code or verifying the OTP get re-applied
  // to a freshly minted response inside `setAll`.
  let redirectResponse = NextResponse.redirect(`${origin}${next}`);
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: SUPABASE_COOKIE_OPTIONS,
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          redirectResponse = NextResponse.redirect(`${origin}${next}`);
          cookiesToSet.forEach(({ name, value, options }) =>
            redirectResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Signup confirmation comes through the PKCE code flow. Welcome is
      // deduped, so welcoming on any first successful exchange is safe.
      scheduleWelcome(data.user);
      scheduleNewOAuthAccountAnalytics(data.user);
      return redirectResponse;
    }
    return NextResponse.redirect(
      `${origin}/auth/login?error=auth&reason=${encodeURIComponent(error.message)}`,
    );
  }

  if (tokenHash && type) {
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });
    if (!error) {
      // Only signup/email-confirmation token-hash links should welcome —
      // not password recovery, email change, or invite.
      if (type === "signup" || type === "email") scheduleWelcome(data.user);
      return redirectResponse;
    }
    return NextResponse.redirect(
      `${origin}/auth/login?error=auth&reason=${encodeURIComponent(error.message)}`,
    );
  }

  // No code and no token_hash — the link is malformed or stale. Drop the
  // user on the login page with a specific reason so we can show useful
  // guidance instead of a generic error toast.
  return NextResponse.redirect(
    `${origin}/auth/login?error=auth&reason=missing_token`,
  );
}
