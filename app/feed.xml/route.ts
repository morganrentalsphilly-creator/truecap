/**
 * GET /feed.xml
 *
 * RSS 2.0 feed of TrueCap blog posts. Lets readers subscribe via
 * Feedly, Inoreader, NetNewsWire, or any RSS reader. Also pipe-able
 * to Zapier/n8n for auto-distribution to social channels (every new
 * blog post auto-tweets, auto-LinkedIn, etc).
 *
 * Spec: https://www.rssboard.org/rss-specification
 *
 * Auto-stays-current: imports BLOG_POSTS from /app/blog/page.tsx,
 * which is also the source of truth for the blog index + sitemap.
 * Adding a new post anywhere flows through automatically.
 *
 * Caching: public, 1-hour cache. Cheap to regenerate (no DB calls).
 */

import { BLOG_POSTS } from "@/app/blog/page";
import { getSiteUrl } from "@/lib/site-url";

export const dynamic = "force-static";
export const revalidate = 3600;

/** Minimal XML escaping for content embedded in RSS XML. */
function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const siteUrl = getSiteUrl();
  const feedUrl = `${siteUrl}/feed.xml`;

  const items = BLOG_POSTS.filter((p) => p.available)
    // Sort newest first — readers expect that
    .sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1))
    .map((post) => {
      const url = `${siteUrl}/blog/${post.slug}`;
      const pubDate = new Date(post.publishedAt).toUTCString();
      return [
        "    <item>",
        `      <title>${escapeXml(post.title)}</title>`,
        `      <link>${url}</link>`,
        `      <guid isPermaLink="true">${url}</guid>`,
        `      <pubDate>${pubDate}</pubDate>`,
        `      <description>${escapeXml(post.excerpt)}</description>`,
        "      <author>hello@usetruecap.com (TrueCap)</author>",
        "    </item>",
      ].join("\n");
    })
    .join("\n");

  const lastBuildDate = new Date().toUTCString();

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>TrueCap Blog — Rental Property Analysis &amp; Underwriting</title>
    <link>${siteUrl}/blog</link>
    <atom:link href="${feedUrl}" rel="self" type="application/rss+xml" />
    <description>Original long-form content on rental property analysis, real estate math, BRRRR strategy, DSCR loans, tax concepts, and underwriting from the team behind TrueCap.</description>
    <language>en-us</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <generator>TrueCap (Next.js)</generator>
${items}
  </channel>
</rss>
`;

  return new Response(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
