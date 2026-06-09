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
 *   - Point to BOTH the sitemap (for traditional search crawlers) AND
 *     the /llms.txt index (for AI training crawlers — the llmstxt.org
 *     convention) so every crawler finds the right index on first hit.
 */
export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();

  const sharedDisallow = [
    "/api/",
    "/auth/",
    "/dashboard/",
    "/profile/",
    "/settings/",
    "/d/",
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
        userAgent: ["GPTBot", "ClaudeBot", "Claude-Web", "PerplexityBot", "Google-Extended", "Applebot-Extended"],
        allow: ["/", "/llms.txt", "/llms-full.txt"],
        disallow: sharedDisallow,
      },
    ],
    // sitemap.xml = traditional crawler index. /llms.txt = AI training
    // crawler index (llmstxt.org convention). Some Robots parsers don't
    // recognize a second `sitemap` field; we pass an array so the route
    // emits both lines.
    sitemap: [`${siteUrl}/sitemap.xml`, `${siteUrl}/llms.txt`],
    host: siteUrl,
  };
}
