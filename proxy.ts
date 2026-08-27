/**
 * Next.js 16+ request boundary (replaces middleware.ts). Refreshes Supabase session cookies for SSR.
 * Production builds use webpack via package.json (`next build --webpack`).
 *
 * ALSO: homepage cache split. app/page.tsx is statically generated
 * (edge-cached — the paid-traffic LCP/TTFB win), and the auth-aware
 * cookie verifier lives at app/home-authed/page.tsx. When a request for "/"
 * carries a Supabase auth cookie, we REWRITE to that dynamic verifier; a
 * valid session then redirects to the canonical /dashboard/new analyzer.
 *
 * This is routing-for-caching, NOT auth enforcement (per the no-auth-
 * logic-in-proxy convention): cookie presence is only a cache hint.
 * A forged/stale cookie just routes to the dynamic page, which
 * re-verifies the session server-side and falls back to the same
 * anonymous experience. The static page grants nothing.
 */
import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { isCanonicalHost } from "@/lib/site-url";

function hasSupabaseAuthCookie(request: NextRequest): boolean {
  return request.cookies
    .getAll()
    .some((c) => /^sb-.*-auth-token/.test(c.name) && c.value.length > 0);
}

/**
 * Stamp `X-Robots-Tag: noindex, nofollow` on anything served from a hostname
 * that isn't usetruecap.com.
 *
 * Every *.vercel.app alias OF THIS PROJECT serves the same HTML with a
 * self-referencing canonical, so each is a full duplicate of the site. The
 * 2026-08-02 SEO baseline found `truecap-iota.vercel.app` indexed and
 * outranking the real domain on brand queries.
 *
 * That one is NOT covered by this function: iota belongs to a different
 * Vercel project (verified 2026-08-03 — 200, no X-Robots-Tag, different
 * deployment id), so it never runs this code no matter how often main is
 * redeployed. It has to be deleted in the old Vercel account. See the note on
 * isCanonicalHost in lib/site-url.ts before assuming a redeploy handles it.
 *
 * A response header (not a meta tag) so it also covers /sitemap.xml,
 * /robots.txt, /feed.xml, /llms.txt and the OG image routes, which never pass
 * through Next's metadata layer.
 */
function applyHostGuard(response: NextResponse, request: NextRequest): NextResponse {
  if (!isCanonicalHost(request.headers.get("host"))) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
  }
  return response;
}

export async function proxy(request: NextRequest) {
  // Server layouts cannot otherwise recover the requested child pathname.
  // Forward a private, request-only header so an auth redirect can return the
  // user to the exact protected screen instead of dropping them at "/".
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(
    "x-truecap-request-path",
    `${request.nextUrl.pathname}${request.nextUrl.search}`
  );
  const sessionResponse = await updateSession(request, requestHeaders);

  if (request.nextUrl.pathname === "/" && hasSupabaseAuthCookie(request)) {
    // Clone nextUrl so the QUERY STRING survives the rewrite — the old
    // `new URL("/home-authed", request.url)` form dropped it, which hid
    // params like a legacy Stripe checkout landing's `?billing=success&
    // session_id=…` from /home-authed's validated handoff to /dashboard/new.
    // Path-only change; requests without a query behave exactly as before.
    const rewriteUrl = request.nextUrl.clone();
    rewriteUrl.pathname = "/home-authed";
    const rewritten = NextResponse.rewrite(rewriteUrl, {
      request: { headers: requestHeaders },
    });
    // Preserve any refreshed session cookies updateSession just set —
    // dropping them would silently log users out on token rotation.
    for (const cookie of sessionResponse.cookies.getAll()) {
      rewritten.cookies.set(cookie);
    }
    return applyHostGuard(rewritten, request);
  }

  return applyHostGuard(sessionResponse, request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
