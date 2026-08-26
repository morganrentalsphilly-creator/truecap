import { createServerClient } from "@supabase/ssr";
import { SUPABASE_COOKIE_OPTIONS } from "@/lib/supabase/cookie-options";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest, requestHeaders = request.headers) {
  let supabaseResponse = NextResponse.next({
    request: { headers: requestHeaders },
  });

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
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request: { headers: requestHeaders },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Blast-radius cap, NOT a fix for the refresh-token log noise.
  //
  // A stale/revoked refresh token does NOT throw here: @supabase/auth-js
  // catches that AuthApiError internally, returns { user: null, error }, and
  // already clears the dead cookie through the setAll() callback above (so
  // the user degrades to anonymous on the very first request — measured in
  // production: / → 200, /dashboard → 307 /auth/login, no loop, no 500).
  // The paired ERROR lines in Vercel come from auth-js's own console.error
  // inside _emitInitialSession; a catch here cannot silence them, and the
  // Sentry ignore rule in sentry.edge.config.ts is what keeps them from
  // outranking the money-path webhook clusters.
  //
  // What this catch IS for: auth-js still rethrows NON-AuthError failures
  // (GoTrueClient `_getUser` → `throw error`). proxy.ts's matcher covers
  // every non-static route, so one such throw would 500 the entire site,
  // marketing pages included. Degrading that request to "signed out" is the
  // correct fail-closed outcome — every page re-verifies its own session,
  // and viewing a share link needs no session at all.
  try {
    await supabase.auth.getUser();
  } catch {
    // Intentionally not clearing cookies: for the throwing class we cannot
    // tell a dead token from a transient outage, and signing out healthy
    // users during a blip would be the worse failure.
  }

  return supabaseResponse;
}
