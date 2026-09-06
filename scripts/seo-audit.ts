/**
 * scripts/seo-audit.ts — crawl a LOCAL build and report the Phase 8 gates
 * (docs/site-overhaul.md): indexable pages under 300 words, duplicate titles,
 * sitemap entries without lastmod, pages without a self-canonical, and broken
 * internal links.
 *
 *   npm run build && npm run start -- --hostname 127.0.0.1 --port 3100
 *   npx -y tsx scripts/seo-audit.ts                       # http://127.0.0.1:3100
 *   npx -y tsx scripts/seo-audit.ts --base http://127.0.0.1:3100 --json
 *
 * Loopback only. Exit code 1 when any gate has findings.
 */

const DEFAULT_BASE = "http://127.0.0.1:3100";
const MIN_WORDS = 300;
/**
 * List hubs whose job is to link, not to read: their word count is the size
 * of the list, so the thin-page rule does not apply. Everything else is a
 * content page and must clear MIN_WORDS or carry noindex.
 */
const HUB_PATHS = [/^\/blog\/topics(?:\/[a-z0-9-]+)?$/];
const isHub = (url: string): boolean => HUB_PATHS.some((re) => re.test(new URL(url).pathname));
const CONCURRENCY = 8;

function arg(name: string, fallback: string): string {
  const i = process.argv.indexOf(name);
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1];
  const inline = process.argv.find((a) => a.startsWith(`${name}=`));
  return inline ? inline.slice(name.length + 1) : fallback;
}

function assertLoopback(base: string) {
  const host = new URL(base).hostname;
  if (!["127.0.0.1", "localhost", "::1"].includes(host)) {
    throw new Error(`Only a loopback base is allowed (got ${host}).`);
  }
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function attr(tag: string, name: string): string | null {
  const m = tag.match(new RegExp(`\\s${name}=(?:"([^"]*)"|'([^']*)')`, "i"));
  return m ? decodeEntities(m[1] ?? m[2] ?? "") : null;
}

type PageReport = {
  url: string;
  status: number;
  title: string | null;
  description: string | null;
  canonical: string | null;
  noindex: boolean;
  words: number;
  links: string[];
};

function parsePage(url: string, status: number, html: string): PageReport {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? decodeEntities(titleMatch[1]).trim() : null;
  let canonical: string | null = null;
  let description: string | null = null;
  let noindex = false;
  for (const tag of html.match(/<link\b[^>]*>/gi) ?? []) {
    if ((attr(tag, "rel") ?? "").toLowerCase() === "canonical") canonical = attr(tag, "href");
  }
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const name = (attr(tag, "name") ?? "").toLowerCase();
    if (name === "robots" || name === "googlebot") {
      if (/noindex/i.test(attr(tag, "content") ?? "")) noindex = true;
    }
    if (name === "description") description = attr(tag, "content");
  }
  // Word count of the main content (fallback: body), scripts/styles stripped.
  const mainMatch = html.match(/<main\b[\s\S]*?<\/main>/i);
  const region = mainMatch ? mainMatch[0] : (html.match(/<body\b[\s\S]*<\/body>/i)?.[0] ?? html);
  const text = decodeEntities(
    region
      .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  );
  const words = text.split(/\s+/).filter((w) => /[A-Za-z0-9]/.test(w)).length;
  const links: string[] = [];
  for (const tag of html.match(/<a\b[^>]*>/gi) ?? []) {
    const href = attr(tag, "href");
    if (!href) continue;
    if (href.startsWith("/") && !href.startsWith("//")) links.push(href.split("#")[0]);
  }
  return { url, status, title, description, canonical, noindex, words, links };
}

async function fetchText(url: string): Promise<{ status: number; text: string; location: string | null }> {
  const res = await fetch(url, { redirect: "manual", headers: { "user-agent": "truecap-seo-audit" } });
  const text = res.status >= 200 && res.status < 300 ? await res.text() : "";
  return { status: res.status, text, location: res.headers.get("location") };
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i]);
      }
    }),
  );
  return out;
}

async function main() {
  const base = arg("--base", DEFAULT_BASE).replace(/\/$/, "");
  assertLoopback(base);
  const json = process.argv.includes("--json");

  // 1. Sitemap → URLs + lastmod.
  const sitemap = await fetchText(`${base}/sitemap.xml`);
  if (sitemap.status !== 200) throw new Error(`sitemap.xml returned ${sitemap.status}`);
  const entries = [...sitemap.text.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((m) => {
    const block = m[1];
    const loc = block.match(/<loc>([^<]+)<\/loc>/)?.[1]?.trim() ?? "";
    const lastmod = block.match(/<lastmod>([^<]+)<\/lastmod>/)?.[1]?.trim() ?? null;
    return { loc, lastmod };
  });
  const siteOrigin = entries[0] ? new URL(entries[0].loc).origin : base;
  const toLocal = (loc: string) => loc.replace(siteOrigin, base);
  const missingLastmod = entries.filter((e) => !e.lastmod).map((e) => e.loc);

  // 2. Crawl every sitemap page.
  const pages = await mapLimit(entries, CONCURRENCY, async (e) => {
    const local = toLocal(e.loc);
    const r = await fetchText(local);
    return parsePage(e.loc, r.status, r.text);
  });

  const notOk = pages.filter((p) => p.status !== 200).map((p) => `${p.url} → ${p.status}`);
  const indexable = pages.filter((p) => p.status === 200 && !p.noindex);
  const thin = indexable
    .filter((p) => !isHub(p.url) && p.words < MIN_WORDS)
    .map((p) => `${p.url} (${p.words} words)`);
  const hubsExempt = indexable.filter((p) => isHub(p.url)).map((p) => `${p.url} (${p.words} words)`);
  const titles = new Map<string, string[]>();
  for (const p of indexable) {
    if (!p.title) continue;
    titles.set(p.title, [...(titles.get(p.title) ?? []), p.url]);
  }
  const duplicateTitles = [...titles.entries()].filter(([, urls]) => urls.length > 1).map(([t, urls]) => `${t} ← ${urls.length} pages`);
  // Compare canonical by PATH: a local build serves its own origin
  // (NEXT_PUBLIC_SITE_URL), the sitemap carries the canonical origin.
  const pathOf = (value: string) => {
    try {
      return new URL(value, base).pathname.replace(/\/$/, "") || "/";
    } catch {
      return value;
    }
  };
  const noSelfCanonical = indexable
    .filter((p) => !p.canonical || pathOf(p.canonical) !== pathOf(p.url))
    .map((p) => `${p.url} (canonical: ${p.canonical ?? "missing"})`);
  const longTitles = indexable
    .filter((p) => (p.title ?? "").length > 60)
    .map((p) => `${p.url} (${(p.title ?? "").length} chars)`);
  const longDescriptions = indexable
    .filter((p) => p.description !== null && p.description.length > 155)
    .map((p) => `${p.url} (${p.description!.length} chars)`);
  const missingDescriptions = indexable.filter((p) => !p.description).map((p) => p.url);

  // 3. Internal links from indexable pages → 4xx/5xx or missing redirect targets.
  const linkTargets = new Set<string>();
  for (const p of indexable) for (const l of p.links) linkTargets.add(l);
  const cache = new Map<string, number>();
  await mapLimit([...linkTargets], CONCURRENCY, async (path) => {
    if (cache.has(path)) return;
    const r = await fetchText(`${base}${path}`);
    let status = r.status;
    if (status >= 300 && status < 400 && r.location) {
      const target = r.location.startsWith("/") ? `${base}${r.location}` : r.location;
      if (target.startsWith(base)) status = (await fetchText(target)).status;
    }
    cache.set(path, status);
  });
  const brokenLinks = [...cache.entries()].filter(([, s]) => s >= 400 || s === 0).map(([p, s]) => `${p} → ${s}`);

  const report = {
    base,
    sitemap_urls: entries.length,
    crawled: pages.length,
    indexable: indexable.length,
    noindex: pages.filter((p) => p.noindex).length,
    findings: {
      not_ok: notOk,
      thin_indexable_pages: thin,
      duplicate_titles: duplicateTitles,
      missing_lastmod: missingLastmod,
      no_self_canonical: noSelfCanonical,
      broken_internal_links: brokenLinks,
    },
    // Advisory (reported, not gating): the ≤ 60 / ≤ 155 character targets.
    advisory: {
      hub_pages_exempt_from_word_rule: hubsExempt,
      titles_over_60: longTitles,
      descriptions_over_155: longDescriptions,
      missing_descriptions: missingDescriptions,
    },
  };
  const failing = Object.values(report.findings).reduce((n, list) => n + list.length, 0);
  if (json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(`seo-audit: ${report.sitemap_urls} sitemap URLs, ${report.indexable} indexable, ${report.noindex} noindex`);
    for (const [key, list] of Object.entries(report.findings)) {
      console.log(`  ${key}: ${list.length}`);
      for (const line of list.slice(0, 15)) console.log(`    - ${line}`);
      if (list.length > 15) console.log(`    … ${list.length - 15} more`);
    }
    for (const [key, list] of Object.entries(report.advisory)) {
      console.log(`  (advisory) ${key}: ${list.length}`);
      for (const line of list.slice(0, 5)) console.log(`    - ${line}`);
      if (list.length > 5) console.log(`    … ${list.length - 5} more`);
    }
  }
  process.exitCode = failing > 0 ? 1 : 0;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
