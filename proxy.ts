/**
 * Next.js 16+ request boundary (replaces middleware.ts). Refreshes Supabase session cookies for SSR.
 * Production builds use webpack via package.json (`next build --webpack`).
 *
 * ALSO: homepage cache split. app/page.tsx is statically generated
 * (edge-cached — the paid-traffic LCP/TTFB win), and the auth-aware
 * homepage lives at app/home-authed/page.tsx. When a request for "/"
 * carries a Supabase auth cookie, we REWRITE (not redirect — the URL
 * bar still shows "/") to the dynamic variant.
 *
 * This is routing-for-caching, NOT auth enforcement (per the no-auth-
 * logic-in-proxy convention): cookie presence is only a cache hint.
 * A forged/stale cookie just routes to the dynamic page, which
 * re-verifies the session server-side and falls back to the same
 * anonymous experience. The static page grants nothing.
 */
import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

function hasSupabaseAuthCookie(request: NextRequest): boolean {
  return request.cookies
    .getAll()
    .some((c) => /^sb-.*-auth-token/.test(c.name) && c.value.length > 0);
}

export async function proxy(request: NextRequest) {
  const sessionResponse = await updateSession(request);

  if (request.nextUrl.pathname === "/" && hasSupabaseAuthCookie(request)) {
    const rewritten = NextResponse.rewrite(new URL("/home-authed", request.url), {
      request,
    });
    // Preserve any refreshed session cookies updateSession just set —
    // dropping them would silently log users out on token rotation.
    for (const cookie of sessionResponse.cookies.getAll()) {
      rewritten.cookies.set(cookie);
    }
    return rewritten;
  }

  return sessionResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
