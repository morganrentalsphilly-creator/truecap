/**
 * The live /sitemap.xml is the loop's URL universe — the set we ASKED Google
 * to index. It is read from production rather than computed from app/sitemap.ts
 * because a standalone runner cannot import that module (JSX + `@/` aliases),
 * and even if it could, env-dependent entries (/for-agents) would differ from
 * the Vercel build. Same approach as scripts/seo/indexnow.mjs and seo-audit.ts.
 */

import { loadConfig } from "./config.ts";

export type SitemapUrl = { url: string; path: string; lastmod: string | null };

export function toPath(url: string): string {
  try {
    const u = new URL(url);
    let p = u.pathname;
    if (p.length > 1) p = p.replace(/\/+$/, "");
    return p || "/";
  } catch {
    return url;
  }
}

export function parseSitemap(xml: string): SitemapUrl[] {
  const out: SitemapUrl[] = [];
  for (const block of xml.matchAll(/<url>([\s\S]*?)<\/url>/g)) {
    const loc = /<loc>\s*([^<]+?)\s*<\/loc>/.exec(block[1])?.[1];
    if (!loc) continue;
    const lastmod = /<lastmod>\s*([^<]+?)\s*<\/lastmod>/.exec(block[1])?.[1] ?? null;
    out.push({ url: loc, path: toPath(loc), lastmod });
  }
  return out;
}

export async function fetchSitemap(base: string = loadConfig().site.base): Promise<SitemapUrl[]> {
  const response = await fetch(`${base.replace(/\/$/, "")}/sitemap.xml`, {
    headers: { "user-agent": loadConfig().site.userAgent },
  });
  if (!response.ok) throw new Error(`GET ${base}/sitemap.xml returned HTTP ${response.status}`);
  const urls = parseSitemap(await response.text());
  if (!urls.length) throw new Error("the live sitemap contains zero <url> entries");
  return urls;
}
