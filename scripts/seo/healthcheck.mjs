/**
 * Live-site SEO health check.
 *
 * The other half of the automated SEO guards. lib/__tests__/seo-guards.test.ts
 * covers everything decidable from SOURCE and runs on every PR. This covers
 * everything that only exists after render or deploy, and runs weekly against
 * production:
 *
 *   - every sitemap URL actually returns 200 (catches a deleted page still
 *     listed, a broken dynamic route, a deploy that half-shipped)
 *   - <link rel=canonical> points at https://usetruecap.com, not a preview
 *     hostname (the getSiteUrl fail-open in lib/site-url.ts would silently
 *     canonicalise the whole site to a *.vercel.app URL)
 *   - the *.vercel.app aliases serve X-Robots-Tag: noindex, so the staging
 *     deployment stops competing with the real domain on brand queries
 *   - exactly one <h1> per indexable URL
 *   - the JSON-LD @types each route family is supposed to emit are present
 *   - no two indexable URLs ship an identical FAQPage block (duplicate rich
 *     result — Google picks one and discounts the other)
 *   - legacy stubs return 308, not 307
 *
 * Usage:
 *   node scripts/seo/healthcheck.mjs                     # full crawl of prod
 *   node scripts/seo/healthcheck.mjs --limit 40          # sample, for a fast check
 *   node scripts/seo/healthcheck.mjs --base https://…    # point at a preview
 *   node scripts/seo/healthcheck.mjs --json report.json  # machine-readable too
 *
 * Exit code 0 = clean, 1 = findings. Writes a markdown report to stdout, which
 * the weekly workflow turns into a GitHub issue.
 *
 * Plain .mjs on purpose: runs with bare `node`, no deps, no tsx bootstrap, so
 * the weekly job doesn't need `npm ci`.
 */

import { writeFileSync } from "node:fs";

const args = process.argv.slice(2);
const flag = (name, fallback = null) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : args[i + 1];
};

const BASE = (flag("base", "https://usetruecap.com")).replace(/\/$/, "");
const LIMIT = Number(flag("limit", "0")) || 0;
const JSON_OUT = flag("json", null);
const CONCURRENCY = Number(flag("concurrency", "6"));
const CANONICAL_ORIGIN = "https://usetruecap.com";

/**
 * Route family -> JSON-LD @types that family must emit.
 *
 * Deliberately a small, high-confidence table. A missing BreadcrumbList on a
 * blog post is a real defect; inventing a requirement nobody agreed to just
 * produces noise the reader learns to ignore.
 */
const REQUIRED_SCHEMA = [
  { pattern: /^\/blog\/[^/]+$/, types: ["BlogPosting", "BreadcrumbList"], label: "blog post" },
  { pattern: /^\/tools\/[^/]+$/, types: ["BreadcrumbList"], label: "tool page" },
  { pattern: /^\/vs\/[^/]+$/, types: ["BreadcrumbList"], label: "comparison page" },
  { pattern: /^\/glossary\/[^/]+$/, types: ["DefinedTerm", "BreadcrumbList"], label: "glossary term" },
];

/** Legacy routes that must answer 308, not 307. */
const PERMANENT_REDIRECTS = ["/compare", "/saved-analyses", "/templates"];

const findings = [];
const add = (severity, check, detail) => findings.push({ severity, check, detail });

/**
 * When --base points somewhere other than production, origin assertions are
 * expected to "fail" — a preview deploy canonicalising to itself is exactly
 * what you're looking at. Downgrade those to info so a preview run doesn't
 * drown the real findings.
 */
const CHECKING_PROD = BASE === CANONICAL_ORIGIN;
const originSeverity = CHECKING_PROD ? "high" : "info";

// ------------------------------------------------------------------ helpers

async function fetchText(url, options = {}) {
  const response = await fetch(url, {
    redirect: "manual",
    headers: { "user-agent": "TrueCap-SEO-Healthcheck/1.0 (+https://usetruecap.com)" },
    ...options,
  });
  const body = response.status < 400 && response.status >= 300 ? "" : await response.text();
  return { status: response.status, headers: response.headers, body, url };
}

async function mapLimit(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      try {
        results[index] = await worker(items[index], index);
      } catch (error) {
        results[index] = { error: String(error?.message ?? error) };
      }
    }
  });
  await Promise.all(runners);
  return results;
}

const countMatches = (haystack, re) => (haystack.match(re) ?? []).length;

function jsonLdTypes(html) {
  const types = new Set();
  for (const m of html.matchAll(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/g,
  )) {
    for (const t of m[1].matchAll(/"@type"\s*:\s*"([^"]+)"/g)) types.add(t[1]);
  }
  return types;
}

function faqFingerprint(html) {
  for (const m of html.matchAll(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/g,
  )) {
    if (!m[1].includes('"FAQPage"')) continue;
    const questions = [...m[1].matchAll(/"name"\s*:\s*"([^"]{10,})"/g)].map((q) => q[1]);
    if (questions.length) return questions.slice(0, 5).join("|");
  }
  return null;
}

// ------------------------------------------------------------------- checks

console.error(`Crawling ${BASE} …`);

// 1. Sitemap fetch + origin assertion -------------------------------------
let urls = [];
try {
  const sitemap = await fetchText(`${BASE}/sitemap.xml`);
  if (sitemap.status !== 200) {
    add("high", "sitemap", `GET /sitemap.xml returned ${sitemap.status}`);
  } else {
    urls = [...sitemap.body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
    const foreign = urls.filter((u) => !u.startsWith(CANONICAL_ORIGIN));
    if (foreign.length) {
      add(
        originSeverity,
        "sitemap origin",
        `${foreign.length} sitemap URL(s) do not start with ${CANONICAL_ORIGIN} — ` +
          `NEXT_PUBLIC_SITE_URL is probably unset on this deploy, so getSiteUrl() ` +
          `fell back to VERCEL_URL. First: ${foreign[0]}`,
      );
    }
    console.error(`  ${urls.length} URLs in sitemap`);
  }
} catch (error) {
  add("high", "sitemap", `could not fetch /sitemap.xml: ${error.message}`);
}

// 2. robots.txt ------------------------------------------------------------
try {
  const robots = await fetchText(`${BASE}/robots.txt`);
  if (robots.status !== 200) {
    add("high", "robots.txt", `returned ${robots.status}`);
  } else {
    if (!robots.body.includes(`${CANONICAL_ORIGIN}/sitemap.xml`)) {
      add(
        originSeverity,
        "robots.txt",
        `Sitemap: line does not point at ${CANONICAL_ORIGIN}/sitemap.xml`,
      );
    }
    if (/^\s*Disallow:\s*\/\s*$/m.test(robots.body)) {
      add("high", "robots.txt", "contains a blanket `Disallow: /` — the whole site is blocked");
    }
  }
} catch (error) {
  add("high", "robots.txt", `could not fetch: ${error.message}`);
}

// 3. Preview-host noindex guard -------------------------------------------
// The proxy.ts host guard is what stops truecap-*.vercel.app from competing
// with the real domain. Assert it is actually live rather than trusting that
// the code shipped.
for (const host of ["truecap-iota.vercel.app", "truecap-pink.vercel.app"]) {
  try {
    const response = await fetch(`https://${host}/`, {
      redirect: "manual",
      headers: { "user-agent": "TrueCap-SEO-Healthcheck/1.0" },
    });
    // 401/403 = Vercel deployment protection is on for this alias. It can't
    // be crawled, so it can't be indexed — that's the desired end state, just
    // reached a different way. 5xx = alias retired.
    if (response.status >= 500 || response.status === 401 || response.status === 403) continue;
    const tag = response.headers.get("x-robots-tag") ?? "";
    if (!/noindex/i.test(tag)) {
      add(
        "high",
        "preview host indexable",
        `https://${host}/ responded ${response.status} without X-Robots-Tag: noindex ` +
          `(got "${tag || "no header"}"). This hostname serves a full duplicate of the ` +
          `site and will compete with usetruecap.com on brand queries. ` +
          `Check the host guard in proxy.ts.`,
      );
    }
  } catch {
    // DNS failure = the alias is gone. Good.
  }
}

// 4. Permanent-redirect stubs ---------------------------------------------
for (const route of PERMANENT_REDIRECTS) {
  try {
    const response = await fetch(`${BASE}${route}`, { redirect: "manual" });
    if (response.status === 404) continue; // route removed
    if (response.status !== 308 && response.status >= 300 && response.status < 400) {
      add(
        "medium",
        "redirect permanence",
        `${route} returned ${response.status}; expected 308 so Google transfers ` +
          `the old URL's equity instead of keeping it indexed.`,
      );
    }
  } catch {
    /* ignore */
  }
}

// 5. Per-URL crawl ---------------------------------------------------------
const toCrawl = LIMIT ? urls.slice(0, LIMIT) : urls;
if (LIMIT && urls.length > LIMIT) {
  // Never let a sampled run read as full coverage.
  add(
    "info",
    "coverage",
    `SAMPLED RUN — crawled ${LIMIT} of ${urls.length} sitemap URLs. ` +
      `The remaining ${urls.length - LIMIT} were not checked.`,
  );
}

const faqSeen = new Map();
let crawled = 0;

const pageResults = await mapLimit(toCrawl, CONCURRENCY, async (url) => {
  const path = url.replace(CANONICAL_ORIGIN, "").replace(BASE, "") || "/";
  const page = await fetchText(url.replace(CANONICAL_ORIGIN, BASE));
  crawled++;
  if (crawled % 50 === 0) console.error(`  …${crawled}/${toCrawl.length}`);

  if (page.status !== 200) {
    add("high", "broken URL", `${path} is in the sitemap but returned ${page.status}`);
    return null;
  }

  const html = page.body;

  // canonical
  const canonical = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i)?.[1];
  if (!canonical) {
    add("medium", "canonical", `${path} has no <link rel="canonical">`);
  } else if (!canonical.startsWith(CANONICAL_ORIGIN)) {
    add(
      originSeverity,
      "canonical origin",
      `${path} canonicalises to ${canonical} — not ${CANONICAL_ORIGIN}.`,
    );
  }

  // exactly one h1
  const h1s = countMatches(html, /<h1[\s>]/gi);
  if (h1s === 0) {
    add("medium", "heading structure", `${path} has no <h1>`);
  } else if (h1s > 1) {
    add("medium", "heading structure", `${path} has ${h1s} <h1> elements; expected 1`);
  }

  // noindex on a sitemapped URL is a contradiction
  if (/<meta[^>]+name=["']robots["'][^>]+content=["'][^"']*noindex/i.test(html)) {
    add("high", "noindex in sitemap", `${path} is in the sitemap but serves meta robots noindex`);
  }
  if (/noindex/i.test(page.headers.get("x-robots-tag") ?? "")) {
    add("high", "noindex in sitemap", `${path} is in the sitemap but serves X-Robots-Tag noindex`);
  }

  // required JSON-LD
  const types = jsonLdTypes(html);
  for (const rule of REQUIRED_SCHEMA) {
    if (!rule.pattern.test(path)) continue;
    const missing = rule.types.filter((t) => !types.has(t));
    if (missing.length) {
      add(
        "medium",
        "missing schema",
        `${path} (${rule.label}) is missing JSON-LD @type: ${missing.join(", ")}`,
      );
    }
  }

  // duplicate FAQPage
  const fingerprint = faqFingerprint(html);
  if (fingerprint) {
    if (faqSeen.has(fingerprint)) {
      add(
        "medium",
        "duplicate FAQPage",
        `${path} ships the same FAQPage block as ${faqSeen.get(fingerprint)} — ` +
          `Google will pick one for the rich result and discount the other.`,
      );
    } else {
      faqSeen.set(fingerprint, path);
    }
  }

  // og:image
  const ogImage = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1];
  if (!ogImage) add("low", "og:image", `${path} has no og:image`);

  // title / description presence (length is a source-side ratchet)
  if (!/<title[^>]*>[^<]{5,}<\/title>/i.test(html)) {
    add("high", "title", `${path} has an empty or missing <title>`);
  }
  if (!/<meta[^>]+name=["']description["'][^>]+content=["'][^"']{20,}/i.test(html)) {
    add("medium", "description", `${path} has no usable meta description`);
  }
  // Entity leakage into rendered meta tags — the rendered counterpart to the
  // source-side hard gate.
  const renderedDescription = html.match(
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i,
  )?.[1];
  if (renderedDescription && /&(?:apos|quot|lsquo|rsquo|#\d+);/.test(renderedDescription)) {
    add("high", "entity in meta", `${path} meta description contains a literal HTML entity`);
  }

  return { path, ok: true };
});

const okCount = pageResults.filter((r) => r?.ok).length;

// ------------------------------------------------------------------ report

const order = { high: 0, medium: 1, low: 2, info: 3 };
findings.sort((a, b) => order[a.severity] - order[b.severity]);

const counts = findings.reduce((acc, f) => {
  acc[f.severity] = (acc[f.severity] ?? 0) + 1;
  return acc;
}, {});

const lines = [];
lines.push(`# SEO health check — ${BASE}`);
lines.push("");
lines.push(
  `Crawled **${okCount}/${toCrawl.length}** sitemap URLs` +
    (LIMIT && urls.length > LIMIT ? ` (sampled from ${urls.length})` : "") +
    ".",
);
lines.push("");

if (!findings.length) {
  lines.push("No findings. Everything checked is clean.");
} else {
  lines.push(
    `**${counts.high ?? 0} high · ${counts.medium ?? 0} medium · ` +
      `${counts.low ?? 0} low · ${counts.info ?? 0} info**`,
  );
  lines.push("");
  let currentSeverity = null;
  for (const f of findings) {
    if (f.severity !== currentSeverity) {
      currentSeverity = f.severity;
      lines.push("");
      lines.push(`## ${f.severity}`);
      lines.push("");
    }
    lines.push(`- **${f.check}** — ${f.detail}`);
  }
}

lines.push("");
lines.push("---");
lines.push(
  "_Generated by `scripts/seo/healthcheck.mjs`. Source-side checks " +
    "(title/description length, internal linking, entity leakage) run on every " +
    "PR via `lib/__tests__/seo-guards.test.ts`._",
);

const report = lines.join("\n");
console.log(report);

if (JSON_OUT) {
  writeFileSync(
    JSON_OUT,
    `${JSON.stringify({ base: BASE, crawled: okCount, total: toCrawl.length, findings }, null, 2)}\n`,
  );
}

// Only high-severity findings fail the run — medium/low become issue content
// rather than a red X that trains everyone to ignore the job.
process.exit((counts.high ?? 0) > 0 ? 1 : 0);
