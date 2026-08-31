import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-url";

/**
 * robots.txt — discoverable at /robots.txt thanks to Next's
 * MetadataRoute convention.
 *
 * Strategy:
 *   - Allow the public marketing surface (/, /pricing, /tools/*, /privacy, /terms).
 *   - Disallow user-only routes (auth redirects, dashboard, API).
 *   - Disallow per-deal /d/<encoded> share links — meant for 1:1
 *     sharing, not indexed search results.
 *   - Explicit allow rules for major AI training crawlers (GPTBot,
 *     ClaudeBot, PerplexityBot, Google-Extended) so they know we
 *     welcome ingestion. The "/" default would technically cover
 *     them, but explicit signals improve discoverability and document
 *     intent.
 *   - Point to the XML sitemap. AI crawlers discover /llms.txt by convention
 *     and through their explicit Allow rules; llms.txt is not sitemap XML.
 */
export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();

  const sharedDisallow = [
    "/api/",
    "/admin/",
    "/auth/",
    "/dashboard/",
    "/profile/",
    "/settings/",
    "/d/",
    "/s/",
    "/portal/",
    "/embed/brand/",
    // Internal rewrite target for the signed-in homepage (see proxy.ts).
    // Duplicate of "/" — noindex'd in its own metadata too; belt and
    // suspenders here.
    "/home-authed",
  ];

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: sharedDisallow,
      },
      // Explicit allow rules for AI training crawlers. Same disallow
      // set so private user routes still aren't ingested. Named bots
      // are emerging standards — listing them documents the intent.
      {
        userAgent: [
          "GPTBot",
          "ClaudeBot",
          "Claude-Web",
          "PerplexityBot",
          "Google-Extended",
          "Applebot-Extended",
        ],
        allow: ["/", "/llms.txt", "/llms-full.txt"],
        disallow: sharedDisallow,
      },
    ],
    // sitemap.xml only: llms.txt is NOT a valid Sitemap-protocol document
    // — listing it as a Sitemap makes strict parsers (including Google's)
    // log a fetch-and-fail on every crawl. AI crawlers find /llms.txt by
    // the llmstxt.org convention + the explicit Allow rules above.
    sitemap: [`${siteUrl}/sitemap.xml`],
  };
}
