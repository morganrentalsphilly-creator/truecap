/**
 * Canonical site origin for Supabase email links (confirm signup, reset password).
 * Set NEXT_PUBLIC_SITE_URL in production (e.g. https://yourdomain.com).
 */
export function getSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) {
    return explicit.replace(/\/$/, "");
  }
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    return vercel.startsWith("http") ? vercel.replace(/\/$/, "") : `https://${vercel.replace(/\/$/, "")}`;
  }
  return "http://localhost:3000";
}

/**
 * The one hostname Google is allowed to index.
 *
 * Every Vercel deployment is reachable at several hostnames — the production
 * alias (usetruecap.com), the project alias (truecap-<hash>.vercel.app), the
 * branch alias, and per-deploy preview URLs. They all serve identical HTML
 * with a SELF-referencing canonical, so each one is a complete duplicate of
 * the site competing with the real domain.
 *
 * This is not hypothetical: the 2026-08-02 SEO baseline found
 * `truecap-iota.vercel.app` indexed and OUTRANKING usetruecap.com on brand
 * queries ("TrueCap rental calculator"). It served `robots: index, follow`
 * with a canonical pointing at itself.
 *
 * `isCanonicalHost` is the predicate `proxy.ts` uses to stamp
 * `X-Robots-Tag: noindex` on every response served from any other hostname.
 * Header-level rather than metadata-level on purpose: it covers /sitemap.xml,
 * /robots.txt, /feed.xml, /llms.txt and the OG image routes too, none of
 * which go through Next's metadata layer.
 */
export const CANONICAL_HOST = "usetruecap.com";

export function isCanonicalHost(host: string | null | undefined): boolean {
  if (!host) return false;
  // Strip port (":3000") and normalise case; Host headers are case-insensitive.
  const bare = host.split(":")[0].trim().toLowerCase();
  if (bare === CANONICAL_HOST || bare === `www.${CANONICAL_HOST}`) return true;
  // Local development must not be treated as a rogue host — noindex there is
  // harmless, but returning false would make the dev experience diverge from
  // prod for anyone debugging the header itself.
  return bare === "localhost" || bare === "127.0.0.1" || bare === "[::1]";
}
