import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

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
  const nextRaw = searchParams.get("next") ?? "/";
  const next = nextRaw.startsWith("/") ? nextRaw : "/";

  // Build the canonical redirect response upfront. Any cookies Supabase
  // sets while exchanging the code or verifying the OTP get re-applied
  // to a freshly minted response inside `setAll`.
  let redirectResponse = NextResponse.redirect(`${origin}${next}`);
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          redirectResponse = NextResponse.redirect(`${origin}${next}`);
          cookiesToSet.forEach(({ name, value, options }) =>
            redirectResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return redirectResponse;
    return NextResponse.redirect(
      `${origin}/auth/login?error=auth&reason=${encodeURIComponent(error.message)}`
    );
  }

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (!error) return redirectResponse;
    return NextResponse.redirect(
      `${origin}/auth/login?error=auth&reason=${encodeURIComponent(error.message)}`
    );
  }

  // No code and no token_hash — the link is malformed or stale. Drop the
  // user on the login page with a specific reason so we can show useful
  // guidance instead of a generic error toast.
  return NextResponse.redirect(`${origin}/auth/login?error=auth&reason=missing_token`);
}
