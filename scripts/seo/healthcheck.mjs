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
 *   - every sitemap URL is REACHABLE by following <a href> from `/` — the
 *     orphan check (see "Orphan detection" below)
 *   - the foreign truecap-iota.vercel.app deployment is gone (see "The
 *     tripwire" below) — a nag Morgan cannot turn off from this repo
 *   - every `/api/cron/*` route named in vercel.json answers 401, not a 3xx
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
 * ---------------------------------------------------------------------------
 * ORPHAN DETECTION — why it is here and why it crawls from `/`
 * ---------------------------------------------------------------------------
 * Measured position as of 2026-08-03: 429 sitemap URLs, roughly 2% indexed,
 * ranking for 0 of 10 target queries. Commit 4d799ea repaired the link graph
 * (49 orphans -> 0) after a BFS crawl of a production build found that 49
 * sitemap URLs had no inbound internal link from anywhere on the site —
 * including all 40 /vs/<competitor> pages. A sitemap entry is a *request*;
 * an internal link is the *endorsement* Google actually weights, and
 * "Crawled - currently not indexed" is the documented outcome for pages that
 * only ever arrive via a sitemap. Nothing stopped that repair from silently
 * rotting the next time a footer link or a hub page was edited. This check is
 * that ratchet.
 *
 * THE /vs SUBTLETY. `/vs` is `robots: { index: false, follow: true }`
 * (app/vs/page.tsx) and is deliberately NOT in the sitemap — listing a
 * noindex URL in a sitemap is a contradictory signal. But it IS the only
 * crawl path to the 40 /vs/<competitor> pages, reached from the site footer.
 * Googlebot fetches a noindex,follow page and follows its links; so does this
 * crawler. That is why the frontier is "every same-origin <a href> we find",
 * not "every sitemap URL" — restricting the crawl to sitemap URLs would
 * report all 40 comparison pages as orphans forever, which is precisely the
 * wrong answer. `/vs` is also seeded explicitly, so removing the footer link
 * shows up as 40 orphans rather than as a silent 41.
 *
 * The check is DISABLED (reported as info, never as a finding) whenever the
 * crawl could not be complete: a sampled `--limit` run, a non-200 homepage, or
 * a run that hit the fetch budget. A partial crawl makes every unreached page
 * look orphaned, and 429 false highs is how a guard gets ignored.
 *
 * ---------------------------------------------------------------------------
 * THE TRIPWIRE — truecap-iota.vercel.app
 * ---------------------------------------------------------------------------
 * This is a FOREIGN Vercel deployment: a different project, frozen, in
 * Morgan's OLD Vercel account. It is not a preview alias of this project, and
 * NOTHING in this repository is served by it. It is currently the #1 Google
 * result for the brand — above usetruecap.com — and its SERP snippet still
 * advertises dead "$5 one-time PDF" pricing that no longer exists.
 *
 * There is no code fix. The `proxy.ts` host guard, `X-Robots-Tag: noindex`,
 * a 308 redirect — none of them run on that host, because that host runs a
 * build of a different repository. docs/seo/visibility/2026-08-02.md proposed
 * the 308 as its single highest-leverage action; that recommendation is
 * WRONG and is corrected in docs/seo/foreign-deployment-truecap-iota.md.
 *
 * The only fix is Morgan deleting that project in the old Vercel account.
 * So this is a nag with teeth: it prints at the TOP of the weekly report,
 * at `critical` severity, and it fails the run. There is deliberately NO
 * flag and NO environment variable to silence it — a nag you can turn off
 * from inside the repo is a nag that gets turned off in week three and the
 * duplicate keeps outranking the real domain. It stops when the deployment
 * returns 404/410, and only then.
 *
 * ---------------------------------------------------------------------------
 * CRON LIVENESS
 * ---------------------------------------------------------------------------
 * Every `/api/cron/*` path in vercel.json must answer an unauthenticated GET
 * with 401 — not a 3xx. A blanket canonical-host 301 once swallowed every
 * Vercel cron on a sibling project for weeks: the scheduler fires, gets a
 * redirect it does not follow, records a non-error, and the job never runs.
 * Nothing else in this repo notices a cron that has stopped executing, because
 * a cron that never runs also never reports an error.
 *
 * Usage:
 *   node scripts/seo/healthcheck.mjs                     # full crawl of prod
 *   node scripts/seo/healthcheck.mjs --limit 40          # sample, for a fast check
 *   node scripts/seo/healthcheck.mjs --base https://…    # point at a preview
 *   node scripts/seo/healthcheck.mjs --json report.json  # machine-readable too
 *   node scripts/seo/healthcheck.mjs --skip-orphans      # skip the link-graph crawl
 *
 * Exit code 0 = clean, 1 = findings. Writes a markdown report to stdout, which
 * the weekly workflow turns into a GitHub issue.
 *
 * Plain .mjs on purpose: runs with bare `node`, no deps, no tsx bootstrap, so
 * the weekly job doesn't need `npm ci`.
 */

import { readFileSync, writeFileSync } from "node:fs";

const args = process.argv.slice(2);
const flag = (name, fallback = null) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : args[i + 1];
};
const has = (name) => args.includes(`--${name}`);

const BASE = (flag("base", "https://usetruecap.com")).replace(/\/$/, "");
const LIMIT = Number(flag("limit", "0")) || 0;
const JSON_OUT = flag("json", null);
const CONCURRENCY = Number(flag("concurrency", "6"));
const SKIP_ORPHANS = has("skip-orphans");
/**
 * Fetch budget for the link-graph crawl. The sitemap is ~429 URLs and the
 * reachable set adds maybe 30 non-sitemap pages (/vs, /pricing, /login, the
 * legal pages), so 1200 is roughly 2.5x headroom. It exists so a rendering bug
 * that generates infinite paginated URLs cannot turn the weekly job into an
 * unbounded crawl of production.
 */
const MAX_CRAWL = Number(flag("max-crawl", "1200"));
const CANONICAL_ORIGIN = "https://usetruecap.com";

/** The foreign deployment. See the header. Not configurable, on purpose. */
const FOREIGN_DEPLOYMENT = "https://truecap-iota.vercel.app/";

/**
 * Route family -> JSON-LD @types that family must emit.
 *
 * Deliberately a small, high-confidence table. A missing BreadcrumbList on a
 * blog post is a real defect; inventing a requirement nobody agreed to just
 * produces noise the reader learns to ignore.
 */
/**
 * A requirement is satisfied by ANY type in its group. The blog rule is a
 * group because `BlogPosting` is a SUBTYPE of `Article` in schema.org and
 * Google documents them as equivalent for article rich results — this repo's
 * posts emit `Article`, which is correct.
 *
 * Written as a one-element array first and caught on the first real run: it
 * reported all 37 blog posts as "missing JSON-LD @type: BlogPosting" when
 * every one of them carries valid `Article` markup. 37 medium findings that
 * are all wrong is worse than no check at all — it is exactly how a weekly
 * report becomes something nobody opens.
 */
const REQUIRED_SCHEMA = [
  { pattern: /^\/blog\/topics$/, types: [["CollectionPage"], ["BreadcrumbList"]], label: "topic directory" },
  { pattern: /^\/blog\/(?!topics$)[^/]+$/, types: [["BlogPosting", "Article"], ["BreadcrumbList"]], label: "blog post" },
  { pattern: /^\/tools\/[^/]+$/, types: [["BreadcrumbList"]], label: "tool page" },
  { pattern: /^\/vs\/[^/]+$/, types: [["BreadcrumbList"]], label: "comparison page" },
  { pattern: /^\/glossary\/[^/]+$/, types: [["DefinedTerm"], ["BreadcrumbList"]], label: "glossary term" },
];

/** Legacy routes that must answer 308, not 307. */
const PERMANENT_REDIRECTS = ["/compare", "/saved-analyses", "/templates"];

/**
 * Crawl seeds. `/` is the real entry point; `/vs` is seeded because it is the
 * hub for 40 otherwise-unreachable pages and is intentionally absent from the
 * sitemap. Seeding it means a broken footer link surfaces as "40 pages lost
 * their only inbound link" rather than as a single missing hub — the /vs pages
 * are what we care about, and they are still legitimately reachable if some
 * other page starts linking the hub.
 */
const CRAWL_SEEDS = ["/", "/vs"];

/**
 * Paths robots.txt disallows (app/robots.ts). A crawler that walks into
 * /dashboard or /d/<encoded> is not modelling Googlebot, and /d/ in particular
 * is an unbounded space of stateless share links.
 */
const DISALLOWED_PREFIXES = [
  "/api/",
  "/auth/",
  "/dashboard/",
  "/profile/",
  "/settings/",
  "/d/",
  "/home-authed",
];

/** Non-HTML endpoints that are legitimately linked but have no link graph. */
const NON_HTML = /\.(?:png|jpe?g|gif|svg|ico|webp|avif|pdf|xml|txt|json|css|js|mp4|webm|zip|csv)$/i;

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

/**
 * Canonical path form. Both sides of the orphan comparison — sitemap URLs and
 * extracted hrefs — go through this, so a trailing slash or a `?utm=` cannot
 * make a linked page look orphaned.
 */
function toPath(absoluteUrl) {
  try {
    const u = new URL(absoluteUrl);
    let p = u.pathname;
    if (p.length > 1) p = p.replace(/\/+$/, "");
    return p || "/";
  } catch {
    return null;
  }
}

const isDisallowed = (path) => DISALLOWED_PREFIXES.some((p) => path.startsWith(p));

/**
 * Every same-origin <a href> on the page, as normalised paths.
 *
 * Deliberately only <a href>: that is the edge Google treats as a link. A
 * <link rel="next">, a JS-driven router push, or a URL in a JSON blob does not
 * make a page discoverable, and counting them would let the orphan check pass
 * on a graph Googlebot cannot actually walk.
 */
function extractLinkRecords(html, pageUrl, origin) {
  const out = new Map();
  for (const m of html.matchAll(/<a\b([^>]*)\shref=["']([^"']+)["']([^>]*)>([\s\S]*?)<\/a>/gi)) {
    const raw = m[2].trim();
    if (!raw || raw.startsWith("#") || /^(?:mailto|tel|javascript):/i.test(raw)) continue;
    let resolved;
    try {
      resolved = new URL(raw, pageUrl);
    } catch {
      continue;
    }
    if (resolved.origin !== origin) continue;
    const path = toPath(resolved.href);
    if (!path) continue;
    if (NON_HTML.test(path)) continue;
    const index = m.index ?? 0;
    const inOpenElement = (name) =>
      html.lastIndexOf(`<${name}`, index) > html.lastIndexOf(`</${name}`, index);
    const placement = inOpenElement("footer") ? "footer" : inOpenElement("nav") ? "navigation" : "contextual";
    const anchor = m[4].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 240);
    const key = `${path}\u0000${anchor}\u0000${placement}`;
    out.set(key, { target: path, anchor, placement });
  }
  return [...out.values()];
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

// 2b. FOREIGN-DEPLOYMENT TRIPWIRE -----------------------------------------
//
// Runs on every invocation, including --limit sample runs and preview runs:
// the foreign deployment has nothing to do with which base URL we are
// checking, and a sampled run is exactly when someone is most likely to be
// looking. See the header for why there is no off switch.
const foreignDeployment = { url: FOREIGN_DEPLOYMENT, status: null, live: null, note: null };
try {
  const response = await fetch(FOREIGN_DEPLOYMENT, {
    redirect: "manual",
    headers: { "user-agent": "TrueCap-SEO-Healthcheck/1.0 (+https://usetruecap.com)" },
  });
  foreignDeployment.status = response.status;
  // 404/410 are the only two states that mean the project is actually gone.
  // Deployment protection (401/403) hides it from crawlers but leaves the
  // project — and therefore the possibility of it being re-exposed — in place,
  // so it still nags, just with different wording.
  if (response.status === 404 || response.status === 410) {
    foreignDeployment.live = false;
    foreignDeployment.note = "gone";
  } else {
    foreignDeployment.live = true;
    foreignDeployment.note =
      response.status === 401 || response.status === 403
        ? "protected but not deleted"
        : "serving";
    add(
      "critical",
      "foreign deployment live",
      `${FOREIGN_DEPLOYMENT} returned ${response.status} (${foreignDeployment.note}).`,
    );
  }
} catch (error) {
  // A DNS failure is the deployment being gone. Anything else is a network
  // problem on our side, and "we could not check" must never read as "fixed".
  const code = error?.cause?.code ?? error?.code ?? "";
  if (code === "ENOTFOUND") {
    foreignDeployment.live = false;
    foreignDeployment.note = "DNS does not resolve — deployment deleted";
  } else {
    foreignDeployment.live = null;
    foreignDeployment.note = `could not verify: ${error.message}`;
    add(
      "medium",
      "foreign deployment unverified",
      `Could not reach ${FOREIGN_DEPLOYMENT} (${error.message}). This is NOT evidence ` +
        `it is gone — re-run before concluding anything.`,
    );
  }
}

// 2c. CRON LIVENESS --------------------------------------------------------
//
// vercel.json is read from the checkout rather than hardcoded, so adding a
// cron there automatically adds it here. Unreadable or unparsable vercel.json
// is a finding, not a skip: "we could not enumerate the crons" and "there are
// no crons" must not produce the same silence.
const cronResults = [];
let cronPaths = [];
try {
  const raw = readFileSync(new URL("../../vercel.json", import.meta.url), "utf8");
  const parsed = JSON.parse(raw);
  cronPaths = (parsed.crons ?? []).map((c) => c.path).filter(Boolean);
  if (!cronPaths.length) {
    add("medium", "cron liveness", "vercel.json declares no crons — expected 5. Check the file.");
  }
} catch (error) {
  add("high", "cron liveness", `could not read/parse vercel.json: ${error.message}`);
}

for (const path of cronPaths) {
  try {
    // No Authorization header on purpose. Every cron route checks
    // `authorization !== "Bearer ${CRON_SECRET}"` and answers 401, so 401 is
    // the proof that the route exists, is reachable, and is auth-gated.
    const response = await fetch(`${BASE}${path}`, {
      redirect: "manual",
      headers: { "user-agent": "TrueCap-SEO-Healthcheck/1.0 (+https://usetruecap.com)" },
    });
    cronResults.push({ path, status: response.status });
    if (response.status >= 300 && response.status < 400) {
      add(
        "high",
        "cron redirected",
        `${path} returned ${response.status} (Location: ${response.headers.get("location") ?? "?"}) ` +
          `instead of 401. Vercel's cron invoker does NOT follow redirects: it fires, gets ` +
          `the 3xx, records a non-error, and the job never runs. A cron that never runs also ` +
          `never reports an error, so nothing else here would notice. Whatever added a ` +
          `site-wide redirect must exempt /api/cron/.`,
      );
    } else if (response.status === 401) {
      /* the expected, healthy answer */
    } else if (response.status === 404) {
      add(
        "high",
        "cron missing",
        `${path} is scheduled in vercel.json but returned 404 — the route does not exist on ` +
          `this deploy. Vercel will invoke it on schedule and get nothing.`,
      );
    } else if (response.status === 200) {
      add(
        "high",
        "cron unauthenticated",
        `${path} returned 200 to a request with NO Authorization header. The CRON_SECRET ` +
          `bearer check is not in force, so anyone can trigger this job.`,
      );
    } else if (response.status === 500) {
      add(
        "medium",
        "cron misconfigured",
        `${path} returned 500 to an unauthenticated GET. Every cron route answers 500 when ` +
          `CRON_SECRET is unset in the environment (it fails closed rather than running ` +
          `unguarded), so the secret is probably missing on this deploy.`,
      );
    } else {
      add(
        "medium",
        "cron unexpected status",
        `${path} returned ${response.status}; expected 401 from the CRON_SECRET bearer check.`,
      );
    }
  } catch (error) {
    cronResults.push({ path, status: null, error: String(error?.message ?? error) });
    add("medium", "cron unreachable", `${path} could not be fetched: ${error.message}`);
  }
}

// 3. Preview-host noindex guard -------------------------------------------
// The proxy.ts host guard is what stops OUR OWN *.vercel.app aliases from
// competing with the real domain. Assert it is actually live rather than
// trusting that the code shipped.
//
// truecap-iota.vercel.app is deliberately NOT in this list. It is a foreign
// project that proxy.ts does not serve, so testing it for a header this repo
// stamps would be testing code that never runs there — and this loop treats
// 401/403 as an acceptable end state, which for the foreign deployment it is
// not. It has its own tripwire in 2b.
for (const host of ["truecap-pink.vercel.app"]) {
  try {
    const response = await fetch(`https://${host}/`, {
      redirect: "manual",
      headers: { "user-agent": "TrueCap-SEO-Healthcheck/1.0" },
    });
    // 401/403 = Vercel deployment protection is on for this alias. It can't
    // be crawled, so it can't be indexed — that's the desired end state, just
    // reached a different way. 5xx = alias retired.
    //
    // 404/410 = the alias is gone, which is the BEST outcome, and it used to
    // be reported as a high-severity finding: the loop only skipped 5xx/401/403,
    // so a retired alias fell through to "responded 404 without X-Robots-Tag:
    // noindex". Observed on the 2026-08-03 run against truecap-pink.vercel.app.
    // A guard whose green state is a red line is a guard people mute.
    if (
      response.status >= 500 ||
      response.status === 401 ||
      response.status === 403 ||
      response.status === 404 ||
      response.status === 410
    ) {
      continue;
    }
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

// 5. Link-graph crawl + per-URL checks ------------------------------------
//
// One crawl serves both jobs. Phase 1 is the BFS from `/` that builds the link
// graph; phase 2 sweeps up any sitemap URL the BFS never reached, so the
// per-URL checks still cover every sitemap entry — but those pages contribute
// NO edges to the graph. That asymmetry is the point: a page Googlebot cannot
// reach cannot endorse anything, so two mutually-linked orphans must still
// read as two orphans.

const sitemapPaths = urls.map((u) => toPath(u)).filter(Boolean);
const sitemapPathSet = new Set(sitemapPaths);
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
const pageResults = [];

/** Runs every per-URL assertion. Called once per fetched sitemap page. */
function checkPage(path, page) {
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
    // Each entry is a GROUP of acceptable types; the requirement is met if
    // the page emits any one of them (BlogPosting and Article both satisfy
    // the article requirement — see REQUIRED_SCHEMA).
    const missing = rule.types
      .filter((group) => !group.some((t) => types.has(t)))
      .map((group) => group.join(" or "));
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

  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/\s+/g, " ").trim() ?? null;
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1]?.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() ?? null;
  return {
    path,
    ok: true,
    httpStatus: page.status,
    canonical: canonical ?? null,
    noindex: /<meta[^>]+name=["']robots["'][^>]+content=["'][^"']*noindex/i.test(html),
    title,
    h1,
    schemaTypes: [...types].sort(),
  };
}

// --- phase 1: BFS from the seeds -----------------------------------------
const ORPHANS_POSSIBLE = !SKIP_ORPHANS && !LIMIT && urls.length > 0;

const reached = new Set();          // paths seen as the TARGET of an <a href>
const visited = new Set();          // paths fetched in phase 1
const inboundFrom = new Map();      // path -> first page that linked to it
const crawlDepth = new Map(CRAWL_SEEDS.map((path) => [path, 0]));
const internalLinkEdges = new Map();
let crawlBudgetHit = false;
let homepageOk = true;
let bfsFetches = 0;

if (ORPHANS_POSSIBLE) {
  console.error("  building the link graph from / …");
  const frontier = [];
  const queued = new Set();
  const enqueue = (path) => {
    if (queued.has(path) || isDisallowed(path) || NON_HTML.test(path)) return;
    queued.add(path);
    frontier.push(path);
  };
  for (const seed of CRAWL_SEEDS) enqueue(seed);

  let active = 0;
  const runner = async () => {
    for (;;) {
      if (visited.size >= MAX_CRAWL) {
        crawlBudgetHit = true;
        return;
      }
      const path = frontier.shift();
      if (path === undefined) {
        // Nothing queued right now, but a peer may still be about to enqueue.
        if (active === 0) return;
        await new Promise((r) => setTimeout(r, 25));
        continue;
      }
      active++;
      visited.add(path);
      try {
        const page = await fetchText(`${BASE}${path === "/" ? "/" : path}`);
        bfsFetches++;
        if (bfsFetches % 50 === 0) console.error(`  …${bfsFetches} pages walked`);
        if (path === "/" && page.status !== 200) homepageOk = false;
        if (page.status === 200 && page.body) {
          for (const link of extractLinkRecords(page.body, `${BASE}${path}`, new URL(BASE).origin)) {
            const target = link.target;
            reached.add(target);
            if (!inboundFrom.has(target)) inboundFrom.set(target, path);
            const edgeKey = `${path}\u0000${target}\u0000${link.anchor}\u0000${link.placement}`;
            internalLinkEdges.set(edgeKey, { source: path, ...link });
            const candidateDepth = (crawlDepth.get(path) ?? 0) + 1;
            if (!crawlDepth.has(target) || candidateDepth < crawlDepth.get(target)) {
              crawlDepth.set(target, candidateDepth);
            }
            enqueue(target);
          }
          // Sitemap pages fetched here are checked now, so phase 2 does not
          // fetch them a second time.
          if (sitemapPathSet.has(path)) {
            const result = checkPage(path, page);
            if (result) pageResults.push(result);
            crawled++;
          }
        } else if (sitemapPathSet.has(path)) {
          const result = checkPage(path, page);
          if (result) pageResults.push(result);
          crawled++;
        }
      } catch (error) {
        if (path === "/") homepageOk = false;
        add("medium", "crawl error", `${path} could not be fetched: ${error.message}`);
      } finally {
        active--;
      }
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, runner));
  console.error(`  link graph: ${bfsFetches} pages walked, ${reached.size} distinct link targets`);
}

// --- phase 2: sitemap URLs the BFS never reached --------------------------
const unvisited = toCrawl.filter((u) => {
  const p = toPath(u);
  return p && !visited.has(p);
});

const sweepResults = await mapLimit(unvisited, CONCURRENCY, async (url) => {
  const path = toPath(url) ?? "/";
  const page = await fetchText(url.replace(CANONICAL_ORIGIN, BASE));
  crawled++;
  if (crawled % 50 === 0) console.error(`  …${crawled}/${toCrawl.length}`);
  return checkPage(path, page);
});
for (const r of sweepResults) if (r?.ok) pageResults.push(r);

const okCount = pageResults.filter((r) => r?.ok).length;

// --- the orphan verdict ---------------------------------------------------
const linkGraph = {
  ran: false,
  reason: null,
  sitemapUrls: sitemapPaths.length,
  reachable: null,
  orphans: [],
  edges: [],
  depth: {},
};

if (!ORPHANS_POSSIBLE) {
  linkGraph.reason = SKIP_ORPHANS
    ? "--skip-orphans was passed"
    : LIMIT
      ? "sampled run (--limit): an incomplete crawl makes every unreached page look orphaned"
      : "the sitemap could not be read, so there is nothing to check reachability against";
  add("info", "orphan detection", `Did not run — ${linkGraph.reason}.`);
} else if (!homepageOk || crawlBudgetHit) {
  linkGraph.reason = !homepageOk
    ? "the homepage did not return 200, so the crawl had no entry point"
    : `the crawl hit its ${MAX_CRAWL}-fetch budget before the frontier drained`;
  add(
    "high",
    "orphan detection incomplete",
    `The link-graph crawl could not complete — ${linkGraph.reason}. Orphan results are ` +
      `SUPPRESSED rather than reported, because a partial crawl marks every unreached page ` +
      `as an orphan. Fix the crawl before trusting this section.`,
  );
} else {
  linkGraph.ran = true;
  // Non-sitemap pages are not orphan candidates: /vs is noindex-by-design and
  // login/legal pages are not trying to rank. The question is only ever
  // "is every page we ASKED Google to index also endorsed from inside the site".
  const orphans = sitemapPaths.filter((p) => !reached.has(p));
  linkGraph.reachable = sitemapPaths.length - orphans.length;
  linkGraph.orphans = orphans;
  linkGraph.edges = [...internalLinkEdges.values()];
  linkGraph.depth = Object.fromEntries(sitemapPaths.map((path) => [path, crawlDepth.get(path) ?? null]));
  if (orphans.length) {
    const shown = orphans.slice(0, 25);
    add(
      "high",
      "orphaned sitemap URLs",
      `${orphans.length} of ${sitemapPaths.length} sitemap URLs have ZERO inbound internal ` +
        `links — nothing on the site links to them, so the only way Google learns they exist ` +
        `is the sitemap itself, and "Crawled - currently not indexed" is the documented ` +
        `outcome for exactly that. Commit 4d799ea took this from 49 to 0; it has regressed.\n` +
        shown.map((p) => `    - ${p}`).join("\n") +
        (orphans.length > shown.length ? `\n    …and ${orphans.length - shown.length} more.` : ""),
    );
  }
}

// ------------------------------------------------------------------ report

const order = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
findings.sort((a, b) => order[a.severity] - order[b.severity]);

const counts = findings.reduce((acc, f) => {
  acc[f.severity] = (acc[f.severity] ?? 0) + 1;
  return acc;
}, {});

const lines = [];
lines.push(`# SEO health check — ${BASE}`);
lines.push("");

// The tripwire prints FIRST, above the crawl stats and above the findings
// list, because it is the only item here that (a) cannot be fixed from this
// repo and (b) is actively costing the brand its own #1 result. Everything
// below it is a page-quality issue on a site nobody has found yet.
if (foreignDeployment.live === true) {
  lines.push(
    "> 🔴🔴🔴 **FOREIGN DEPLOYMENT STILL LIVE — `truecap-iota.vercel.app` " +
      `returned ${foreignDeployment.status}.**`,
  );
  lines.push("> ");
  lines.push(
    "> It is the **#1 Google result for the TrueCap brand, above usetruecap.com**, " +
      'and its SERP snippet advertises **dead "$5 one-time PDF" pricing** that no longer exists. ' +
      "Every brand search sends people to a frozen build of a different repo quoting a price " +
      "TrueCap does not charge.",
  );
  lines.push("> ");
  lines.push(
    "> **NO CODE IN THIS REPOSITORY CAN FIX THIS.** That host is a different Vercel project. " +
      "`proxy.ts`, `X-Robots-Tag: noindex`, and a 308 redirect all run on *our* deployment and " +
      "are never executed by that one. Do not propose a redirect — " +
      "see `docs/seo/foreign-deployment-truecap-iota.md`.",
  );
  lines.push("> ");
  lines.push(
    "> **ONLY MORGAN CAN FIX IT:** log in to the OLD Vercel account, find the project serving " +
      "`truecap-iota.vercel.app`, and **delete the project** (Project → Settings → Delete). " +
      "Then request removal of the host in Search Console. This banner stops when that URL " +
      "returns 404 or 410, and there is no flag in this repo that silences it.",
  );
  lines.push("");
} else if (foreignDeployment.live === false) {
  lines.push(
    `> ✅ \`truecap-iota.vercel.app\` is gone (${foreignDeployment.note}). ` +
      "Leave this check in place — a deleted Vercel project can be restored, and a " +
      "re-deployed alias would silently start outranking the brand again.",
  );
  lines.push("");
}

lines.push(
  `Crawled **${okCount}/${toCrawl.length}** sitemap URLs` +
    (LIMIT && urls.length > LIMIT ? ` (sampled from ${urls.length})` : "") +
    ".",
);
if (linkGraph.ran) {
  lines.push("");
  lines.push(
    `Link graph: **${linkGraph.reachable}/${linkGraph.sitemapUrls}** sitemap URLs reachable ` +
      `by following \`<a href>\` from \`/\` (${bfsFetches} pages walked). ` +
      "`/vs` is seeded because it is `noindex, follow` and deliberately absent from the " +
      "sitemap, yet it is the only crawl path to the 40 `/vs/<competitor>` pages.",
  );
}
if (cronResults.length) {
  lines.push("");
  lines.push(
    `Cron liveness: ${cronResults
      .map((c) => `\`${c.path}\` → ${c.status ?? c.error}`)
      .join(" · ")} (401 is the healthy answer).`,
  );
}
lines.push("");

if (!findings.length) {
  lines.push("No findings. Everything checked is clean.");
} else {
  lines.push(
    `**${counts.critical ?? 0} critical · ${counts.high ?? 0} high · ${counts.medium ?? 0} medium · ` +
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
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        base: BASE,
        crawled: okCount,
        total: toCrawl.length,
        foreignDeployment,
        crons: cronResults,
        linkGraph,
        pages: pageResults.map((page) => ({
          ...page,
          inSitemap: sitemapPathSet.has(page.path),
          crawlDepth: crawlDepth.get(page.path) ?? null,
        })),
        findings,
      },
      null,
      2,
    )}\n`,
  );
}

// Critical and high findings fail the run — medium/low become issue content
// rather than a red X that trains everyone to ignore the job.
process.exit((counts.critical ?? 0) + (counts.high ?? 0) > 0 ? 1 : 0);
