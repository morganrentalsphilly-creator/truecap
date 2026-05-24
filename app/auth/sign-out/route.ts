import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

function isSupabaseAuthCookie(name: string) {
  return name.startsWith("sb-") && (name.includes("auth-token") || name.includes("code-verifier"));
}

/**
 * Sign-out flow:
 *
 *  1. Call `supabase.auth.signOut()` so the refresh token is revoked
 *     server-side. Without this, a leaked cookie could be re-used until
 *     the token's natural expiry (1 hr default).
 *
 *  2. Belt-and-suspenders: manually expire every Supabase auth cookie on
 *     the response. signOut() should already do this via the cookie
 *     adapter, but some edge cases (already-expired session, partial
 *     cookie set) can leave stale cookies around — the manual sweep
 *     ensures the browser is fully logged out.
 *
 *  3. 302 redirect to /auth/login.
 */
async function handleSignOut(request: NextRequest) {
  let response = NextResponse.redirect(new URL("/auth/login", request.url));

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
          response = NextResponse.redirect(new URL("/auth/login", request.url));
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Best-effort — if the session is already gone or Supabase is briefly
  // unreachable we still want the redirect + cookie sweep to succeed.
  try {
    await supabase.auth.signOut();
  } catch {
    // Intentional: never block the redirect on this.
  }

  request.cookies.getAll().forEach((cookie) => {
    if (!isSupabaseAuthCookie(cookie.name)) return;
    response.cookies.set(cookie.name, "", {
      path: "/",
      maxAge: 0,
      sameSite: "lax",
    });
  });

  return response;
}

export async function GET(request: NextRequest) {
  return handleSignOut(request);
}

export async function POST(request: NextRequest) {
  return handleSignOut(request);
}
