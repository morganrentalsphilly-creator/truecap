import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-url";

/**
 * robots.txt — discoverable at /robots.txt thanks to Next's
 * MetadataRoute convention.
 *
 * Strategy:
 *   - Allow the public marketing surface (/, /pricing, /tools/*, /privacy, /terms).
 *   - Disallow user-only routes (auth redirects, dashboard, API).
 *     These pages either redirect unauthenticated visitors or return
 *     JSON; crawling them wastes Googlebot's crawl budget and
 *     occasionally surfaces useless thin pages in search.
 *   - Disallow per-deal /d/<encoded> share links — these are meant for
 *     1:1 sharing, not indexed search results. Each shared deal has
 *     unique content but they shouldn't dilute the site's topical
 *     focus on calculators + the analyzer.
 *   - Point to the sitemap explicitly so every crawler picks it up
 *     on first hit instead of waiting to discover it.
 */
export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/auth/",
          "/dashboard/",
          "/profile/",
          "/settings/",
          "/d/",
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
