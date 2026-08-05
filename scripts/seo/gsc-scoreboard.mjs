/**
 * Google Search Console scoreboard — the instrument panel.
 *
 * WHY THIS EXISTS
 * ---------------
 * Everything else in the SEO program is unsteerable without it. As of
 * 2026-08-03 the measured position is: 429 sitemap URLs, ranking for 0 of 10
 * target queries, roughly 2% of pages indexed, 75 blog posts producing zero
 * rankings. Content volume is the DISPROVEN lever — we published more and
 * nothing moved. But "roughly 2%" is an estimate from a site: query, not a
 * measurement, and `docs/seo/AUTOMATION.md` has said in plain English since
 * the first automation pass that GSC data is "the real scoreboard, and none of
 * it is reachable without wiring up the GSC API". This script is that wiring.
 *
 * The two numbers it produces that nothing else can:
 *
 *   1. The INDEXED RATIO per route family. Not "is the site indexed" but
 *      "is /markets indexed and /blog not", which is the difference between a
 *      technical problem and a scaled-content-policy problem. The mechanical
 *      proxy for "do 150 programmatic /markets pages trip scaled content" is
 *      exactly this ratio over time.
 *   2. QUERIES WITH IMPRESSIONS AND NO MATCHING PAGE. This is the field the
 *      content agent consumes. Topic selection today runs top-down through a
 *      hand-written backlog, and the 2026-07-15 audit found roughly a third of
 *      earlier posts targeted invented phrasings with no search demand. A
 *      query Google is already showing us for is demand we have measured
 *      rather than guessed at.
 *
 * DESIGN CONSTRAINTS (all load-bearing, do not "simplify" them away)
 * ------------------------------------------------------------------
 * · Dependency-free, plain .mjs, same as scripts/seo/healthcheck.mjs. The
 *   weekly workflow runs bare `node` with no `npm ci`. `googleapis` is not
 *   installable in that job, so the RS256 JWT assertion is signed here with
 *   node:crypto and exchanged at Google's token endpoint by hand.
 * · FAILS LOUDLY. A missing secret, a malformed key, an auth failure or a 403
 *   exits non-zero with a message naming exactly what Morgan has to set up.
 *   The specific trap this codebase must never fall into: a service account
 *   added to the property with **Restricted** permission keeps Search
 *   Analytics working while URL Inspection returns 403 on every call. Treated
 *   naively that reports a 0% indexed ratio *as if it were data* — the single
 *   most misleading number this program could produce, because 0% indexed is
 *   also what a genuine catastrophe looks like. It is a hard failure with its
 *   own message. See `assertNotRestrictedPermission`.
 * · NEVER prints the private key or the access token, and the committed
 *   telemetry JSON is scanned for both before it is written
 *   (`assertNoSecrets`). The telemetry files land in git; a leaked key there
 *   is a key leaked forever.
 * · Partial coverage is reported as partial. URL Inspection's quota is
 *   2000/day and the sitemap is 429 URLs, so a full sweep fits today — but
 *   the moment it does not, this reports exactly how many URLs went
 *   uninspected instead of quietly presenting a sample as the whole.
 *
 * Usage:
 *   node scripts/seo/gsc-scoreboard.mjs                        # full run
 *   node scripts/seo/gsc-scoreboard.mjs --skip-inspection      # analytics only
 *   node scripts/seo/gsc-scoreboard.mjs --max-inspections 50   # fast sample
 *   node scripts/seo/gsc-scoreboard.mjs --site https://usetruecap.com/
 *
 * Markdown report → stdout (the workflow turns it into ONE issue, updated in
 * place). Progress + failures → stderr. Telemetry JSON → docs/seo/telemetry/.
 * Exit 0 = a real measurement was taken, 1 = setup is broken and there is no
 * measurement.
 */

import { createSign } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// --------------------------------------------------------------------------
// Constants
// --------------------------------------------------------------------------

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const JWT_BEARER_GRANT = "urn:ietf:params:oauth:grant-type:jwt-bearer";

/**
 * One scope covers both APIs. `webmasters.readonly` is enough for
 * searchAnalytics/query AND urlInspection/index:inspect — asking for the
 * read/write `webmasters` scope would hand a CI job the ability to submit
 * sitemaps and remove URLs, for no gain.
 */
export const GSC_SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";

const SEARCH_ANALYTICS_URL = (site) =>
  `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(site)}/searchAnalytics/query`;
const URL_INSPECTION_URL = "https://searchconsole.googleapis.com/v1/urlInspection/index:inspect";

/** Max rows the Search Analytics API returns per request. */
const ROW_LIMIT = 25000;

/**
 * URL Inspection is quota'd at 2000 queries/day and 600/minute per property.
 * The default cap is the daily quota: at 429 sitemap URLs a full sweep is
 * ~21% of it, so there is headroom for a manual re-run in the same day.
 */
const DEFAULT_MAX_INSPECTIONS = 2000;

/**
 * ~120ms between inspection calls = ~500/min, comfortably under the 600/min
 * ceiling regardless of how many workers are running. Concurrency alone does
 * not bound the rate — a fast API response just makes the workers loop faster
 * — so the spacing is enforced globally by `rateLimitSlot`.
 */
const MIN_INSPECTION_INTERVAL_MS = 120;

/**
 * GSC finalises Search Analytics data on a 2-3 day lag. Ending the window
 * "today" would mix a complete 25 days with 3 partial ones, and every
 * week-over-week delta would then be measuring the lag rather than the site.
 */
const DATA_LAG_DAYS = 3;

/** Route families we report an indexed ratio for, in report order. */
export const ROUTE_FAMILIES = ["/blog", "/markets", "/tools", "/vs", "/glossary", "/states", "other"];

/** Persisted-record caps. See `truncated` flags in the telemetry JSON. */
const MAX_PERSISTED_PAGES = 1000;
const MAX_PERSISTED_QUERIES = 500;
const MAX_PERSISTED_GAP_QUERIES = 200;

// --------------------------------------------------------------------------
// Pure helpers — exported so lib/__tests__/gsc-scoreboard.test.ts can pin them
// --------------------------------------------------------------------------

/** RFC 7515 base64url: standard base64 with +/ swapped and padding stripped. */
export function base64Url(input) {
  const buffer = Buffer.isBuffer(input) ? input : Buffer.from(String(input), "utf8");
  return buffer.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * The signed half of a service-account JWT assertion, split out from the
 * signature so a test can assert the claim set without needing a real key.
 *
 * `iat`/`exp` are seconds, not milliseconds — Google rejects the assertion
 * outright if they are off, and the resulting `invalid_grant` says nothing
 * useful about why.
 */
export function buildJwtSigningInput(serviceAccount, { now = Date.now(), lifetimeSeconds = 3600 } = {}) {
  const issuedAt = Math.floor(now / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claims = {
    iss: serviceAccount.client_email,
    scope: GSC_SCOPE,
    aud: serviceAccount.token_uri || TOKEN_URL,
    iat: issuedAt,
    exp: issuedAt + lifetimeSeconds,
  };
  return {
    header,
    claims,
    signingInput: `${base64Url(JSON.stringify(header))}.${base64Url(JSON.stringify(claims))}`,
  };
}

/** Full `header.claims.signature` assertion, RS256 over the signing input. */
export function signJwtAssertion(serviceAccount, options = {}) {
  const { signingInput, claims, header } = buildJwtSigningInput(serviceAccount, options);
  const signer = createSign("RSA-SHA256");
  signer.update(signingInput);
  signer.end();
  const signature = base64Url(signer.sign(serviceAccount.private_key));
  return { assertion: `${signingInput}.${signature}`, claims, header };
}

/**
 * Route family for a URL or path.
 *
 * The families are the ones the sitemap actually generates (app/sitemap.ts:
 * tools from CALCULATOR_REGISTRY, glossary from lib/glossary.ts, states from
 * lib/states.ts, markets from MARKET_CITIES + CITY_STRATEGY_COMBOS, blog from
 * BLOG_POSTS + BLOG_TOPICS). Anything else — `/`, `/pricing`, `/changelog` —
 * is "other" rather than a family of its own: a per-page indexed ratio over
 * two URLs is a number that swings 50 points on one crawl and teaches nothing.
 */
export function routeFamily(urlOrPath) {
  let pathname = String(urlOrPath ?? "");
  if (/^https?:\/\//i.test(pathname)) {
    try {
      pathname = new URL(pathname).pathname;
    } catch {
      return "other";
    }
  }
  pathname = pathname.split("#")[0].split("?")[0];
  if (!pathname.startsWith("/")) pathname = `/${pathname}`;
  for (const family of ROUTE_FAMILIES) {
    if (family === "other") continue;
    if (pathname === family || pathname.startsWith(`${family}/`)) return family;
  }
  return "other";
}

/**
 * `verdict: "PASS"` is the API's own "this URL is on Google". coverageState is
 * the human string underneath it and is what the report lists, but it is not
 * safe to classify on: it is localised prose and Google has changed its
 * wording before.
 */
export function isIndexed(indexStatus) {
  return indexStatus?.verdict === "PASS";
}

/**
 * Matches the "Crawled – currently not indexed" bucket — the one that matters
 * most here, because it means Google fetched the page, read it, and decided it
 * was not worth keeping. Hyphen OR en dash: Google's own docs and the API
 * response have not always agreed on which.
 */
export function isCrawledNotIndexed(coverageState) {
  return /crawled\s*[-–—]\s*currently not indexed/i.test(String(coverageState ?? ""));
}

/**
 * Per-family totals from a list of inspection records.
 *
 * The JSDoc typedefs are not decoration: `tsconfig.json` sets `allowJs`, so
 * the .ts test file that imports this module is type-checked against whatever
 * TypeScript can infer here. Without them, a dynamically-keyed object infers
 * as `{}` and every `summary["/blog"]` in the test is a TS7053 error.
 *
 * @typedef {{ total: number, indexed: number, notIndexed: number, uninspected: number, ratio: number | null }} FamilySummary
 * @typedef {Record<string, FamilySummary>} FamilySummaryMap
 *
 * @param {Array<{ family: string, inspected: boolean, indexed: boolean | null }>} inspections
 * @returns {FamilySummaryMap}
 */
export function summariseFamilies(inspections) {
  /** @type {FamilySummaryMap} */
  const summary = {};
  for (const family of ROUTE_FAMILIES) {
    summary[family] = { total: 0, indexed: 0, notIndexed: 0, uninspected: 0, ratio: null };
  }
  for (const record of inspections) {
    const family = summary[record.family] ?? summary.other;
    family.total += 1;
    if (record.inspected === false) family.uninspected += 1;
    else if (record.indexed) family.indexed += 1;
    else family.notIndexed += 1;
  }
  for (const family of Object.values(summary)) {
    // Ratio is over INSPECTED urls only. Folding uninspected URLs into the
    // denominator would report a quota shortfall as a de-indexing event.
    const inspected = family.indexed + family.notIndexed;
    family.ratio = inspected > 0 ? family.indexed / inspected : null;
  }
  return summary;
}

/**
 * Week-over-week delta between two `summariseFamilies` outputs.
 *
 * `null` deltas are deliberate and distinct from `0`: a family that had no
 * inspected URLs last week has no comparison, and printing "+0.0pp" for it
 * would invent a flat trend out of missing data.
 *
 * @typedef {{ ratio: number | null, previousRatio: number | null, ratioDelta: number | null, indexedDelta: number | null, totalDelta: number | null }} FamilyDelta
 *
 * @param {FamilySummaryMap | null} current
 * @param {FamilySummaryMap | null} previous
 * @returns {Record<string, FamilyDelta>}
 */
export function diffFamilies(current, previous) {
  /** @type {Record<string, FamilyDelta>} */
  const diff = {};
  for (const family of ROUTE_FAMILIES) {
    const now = current?.[family] ?? null;
    const before = previous?.[family] ?? null;
    diff[family] = {
      ratio: now?.ratio ?? null,
      previousRatio: before?.ratio ?? null,
      ratioDelta:
        typeof now?.ratio === "number" && typeof before?.ratio === "number"
          ? now.ratio - before.ratio
          : null,
      indexedDelta:
        typeof now?.indexed === "number" && typeof before?.indexed === "number"
          ? now.indexed - before.indexed
          : null,
      totalDelta:
        typeof now?.total === "number" && typeof before?.total === "number"
          ? now.total - before.total
          : null,
    };
  }
  return diff;
}

/**
 * Query→page matching is a HEURISTIC and is labelled as one in the report.
 *
 * The honest way to answer "does a page target this query" is a human reading
 * the page. The cheap mechanical proxy is token overlap between the query and
 * the URL slug, which is what this does. It exists to produce a ranked
 * shortlist for the content agent, not a verdict — every row carries its
 * `nearestPage` and `coverage` so a wrong call is visible rather than silent.
 */
const STOPWORDS = new Set([
  "a", "an", "the", "for", "of", "in", "on", "at", "to", "and", "or", "with",
  "my", "your", "is", "are", "was", "be", "do", "does", "how", "what", "why",
  "when", "which", "best", "free", "top", "good", "vs", "versus", "online",
  "near", "me", "it", "that", "this", "can", "should", "i", "you",
  // Brand terms match the homepage by construction; a brand query is never a
  // content gap.
  "truecap", "usetruecap",
]);

export function tokenize(text) {
  return String(text ?? "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 2 && !STOPWORDS.has(token))
    // Crude singularisation so "calculators" in a slug matches "calculator" in
    // a query. Deliberately crude: a stemmer is a dependency and this is a
    // ranking heuristic, not a linguistics problem.
    .map((token) => (token.length > 3 && token.endsWith("s") ? token.slice(0, -1) : token));
}

/** Prefix-tolerant token match ("calculate" ↔ "calculator"). */
function tokenMatches(queryToken, pageToken) {
  if (queryToken === pageToken) return true;
  const [short, long] =
    queryToken.length <= pageToken.length ? [queryToken, pageToken] : [pageToken, queryToken];
  return short.length >= 4 && long.startsWith(short);
}

export function findQueriesWithoutPage(queryRows, sitemapUrls, options = {}) {
  const { minImpressions = 5, coverageThreshold = 0.6 } = options;
  const pages = sitemapUrls.map((url) => {
    let pathname = url;
    try {
      pathname = new URL(url).pathname;
    } catch {
      /* already a path */
    }
    return { url, pathname, tokens: tokenize(pathname) };
  });

  const gaps = [];
  for (const row of queryRows) {
    if ((row.impressions ?? 0) < minImpressions) continue;
    const queryTokens = tokenize(row.query);
    if (!queryTokens.length) continue;

    let best = { coverage: 0, page: null };
    for (const page of pages) {
      if (!page.tokens.length) continue;
      let hits = 0;
      for (const token of queryTokens) {
        if (page.tokens.some((pageToken) => tokenMatches(token, pageToken))) hits += 1;
      }
      const coverage = hits / queryTokens.length;
      if (coverage > best.coverage) best = { coverage, page: page.pathname };
      if (best.coverage === 1) break;
    }
    if (best.coverage < coverageThreshold) {
      gaps.push({
        query: row.query,
        impressions: row.impressions ?? 0,
        clicks: row.clicks ?? 0,
        position: row.position ?? null,
        nearestPage: best.page,
        nearestCoverage: Number(best.coverage.toFixed(2)),
      });
    }
  }
  return gaps.sort((a, b) => b.impressions - a.impressions);
}

/**
 * Guard against a credential reaching a committed file. The telemetry JSON is
 * built from API responses, so nothing *should* carry a secret — which is
 * exactly the reasoning that lets one through when a future field is added.
 * Cheap assertion, run on the serialised bytes right before they are written.
 */
export function assertNoSecrets(serialised, secrets) {
  for (const secret of secrets) {
    if (!secret || String(secret).length < 12) continue;
    if (serialised.includes(secret)) {
      throw new Error(
        "Refusing to write telemetry: the serialised output contains a credential. " +
          "This is a bug in the telemetry builder — do not suppress it.",
      );
    }
  }
  if (/-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(serialised)) {
    throw new Error("Refusing to write telemetry: the serialised output contains a private key block.");
  }
  return true;
}

/**
 * Top impression movers between this run's queries and the previous run's.
 *
 * MUST be given the FULL current query list, not a top-N slice. Membership of
 * `currentQueries` is what decides whether a query counts as LOST, so handing
 * this a truncated list would report every query that merely fell out of the
 * top N as having collapsed to zero.
 *
 * Queries present last week and absent this week are emitted with
 * `impressions: 0` and `isLost: true`. Iterating only the current rows — the
 * obvious implementation — makes a disappearance invisible, and a query that
 * went from 500 impressions to none is the single most important thing a
 * scoreboard can tell you. The previous file persists only its top
 * MAX_PERSISTED_QUERIES rows, so this under-reports losses; it never invents
 * one.
 */
export function topQueryMovers(currentQueries, previousQueries, limit = 10) {
  const before = new Map((previousQueries ?? []).map((q) => [q.query, q]));
  const seen = new Set();
  const movers = [];
  for (const row of currentQueries ?? []) {
    const prior = before.get(row.query);
    seen.add(row.query);
    movers.push({
      query: row.query,
      impressions: row.impressions ?? 0,
      previousImpressions: prior ? (prior.impressions ?? 0) : null,
      impressionsDelta: prior ? (row.impressions ?? 0) - (prior.impressions ?? 0) : null,
      position: row.position ?? null,
      previousPosition: prior ? (prior.position ?? null) : null,
      isNew: !prior,
      isLost: false,
    });
  }
  for (const prior of previousQueries ?? []) {
    if (seen.has(prior.query)) continue;
    movers.push({
      query: prior.query,
      impressions: 0,
      previousImpressions: prior.impressions ?? 0,
      impressionsDelta: -(prior.impressions ?? 0),
      position: null,
      previousPosition: prior.position ?? null,
      isNew: false,
      isLost: true,
    });
  }
  return movers
    .filter((m) => m.impressionsDelta !== null || m.impressions > 0)
    .sort((a, b) => Math.abs(b.impressionsDelta ?? b.impressions) - Math.abs(a.impressionsDelta ?? a.impressions))
    .slice(0, limit);
}

/** `YYYY-MM-DD` in UTC. Local time would shift the window on a DST boundary. */
export function isoDate(date) {
  return new Date(date).toISOString().slice(0, 10);
}

export function windowForRun(now = Date.now(), { days = 28, lagDays = DATA_LAG_DAYS } = {}) {
  const end = new Date(now);
  end.setUTCDate(end.getUTCDate() - lagDays);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - (days - 1));
  return { startDate: isoDate(start), endDate: isoDate(end), days };
}

/**
 * The most recent dated telemetry file that is not today's, for the
 * week-over-week diff. `latest.json` is skipped: it is a copy of the newest
 * dated file, so comparing against it would compare a run to itself.
 */
export function previousTelemetryPath(dir, todayFile) {
  if (!existsSync(dir)) return null;
  const candidates = readdirSync(dir)
    .filter((name) => /^\d{4}-\d{2}-\d{2}\.json$/.test(name) && name !== todayFile)
    .sort();
  if (!candidates.length) return null;
  return path.join(dir, candidates[candidates.length - 1]);
}

// --------------------------------------------------------------------------
// I/O helpers
// --------------------------------------------------------------------------

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

/** Report lines accumulated for the markdown emitted on stdout. */
const report = [];
const say = (line = "") => report.push(line);
const progress = (line) => console.error(line);

/**
 * Hard failure. Prints a boxed diagnostic to stderr AND emits the same content
 * as the markdown report, so the workflow's issue-upsert step puts the setup
 * instructions somewhere Morgan actually reads instead of leaving a red X in
 * the Actions tab with the reason buried in a log.
 *
 * Deliberately does NOT write a telemetry file. A run that could not measure
 * anything must not leave a record that looks like a measurement.
 */
function fail(headline, lines) {
  const box = [
    "",
    "==================================================================",
    `  GSC SCOREBOARD FAILED — ${headline}`,
    "==================================================================",
    ...lines.map((l) => `  ${l}`),
    "==================================================================",
    "",
  ];
  for (const line of box) console.error(line);

  console.log(`# GSC scoreboard — SETUP REQUIRED`);
  console.log("");
  console.log(`> **The scoreboard could not run: ${headline}**`);
  console.log(">");
  console.log("> No telemetry file was written. There is no measurement for this run —");
  console.log("> treat the previous file as the latest known state, not as current.");
  console.log("");
  for (const line of lines) console.log(line);
  console.log("");
  console.log("---");
  console.log("_Generated by `scripts/seo/gsc-scoreboard.mjs`._");
  process.exit(1);
}

async function fetchJson(url, { method = "POST", body, token, headers = {} } = {}) {
  const response = await fetch(url, {
    method,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    /* non-JSON error body; `text` is kept for the message */
  }
  return { status: response.status, ok: response.ok, json, text };
}

/**
 * Google's error envelope is `{ error: { code, message, status } }` for the
 * API surfaces and `{ error, error_description }` for the token endpoint.
 * Both are safe to print — neither echoes the assertion back.
 */
function googleErrorMessage(result) {
  const err = result.json?.error;
  if (typeof err === "string") {
    return [err, result.json?.error_description].filter(Boolean).join(": ");
  }
  if (err?.message) return err.message;
  return result.text ? result.text.slice(0, 300) : `HTTP ${result.status}`;
}

// --------------------------------------------------------------------------
// Auth
// --------------------------------------------------------------------------

const SETUP_STEPS = [
  "How to set this up (one time, ~10 minutes):",
  "",
  "  1. Google Cloud Console → APIs & Services → Enable BOTH:",
  "       · Google Search Console API",
  "       · Search Console API (URL Inspection lives here)",
  "  2. IAM & Admin → Service Accounts → Create service account →",
  "     Keys → Add key → Create new key → JSON. Download it.",
  "  3. Google Search Console → the usetruecap.com property → Settings →",
  "     Users and permissions → Add user → paste the service account's",
  "     `client_email` → permission **Full** or **Owner**.",
  "     NOT 'Restricted' — see the note below.",
  "  4. GitHub → repo → Settings → Secrets and variables → Actions →",
  "     New repository secret → name `GSC_SERVICE_ACCOUNT_JSON`,",
  "     value = the ENTIRE contents of the downloaded JSON file.",
  "",
  "  Note on 'Restricted': a Restricted service account can still read Search",
  "  Analytics, so a naive scoreboard looks like it works — but URL Inspection",
  "  returns 403 for every URL, and the indexed ratio silently reports 0%.",
  "  0% is also what a real catastrophe looks like, which is why this script",
  "  refuses to run rather than guess. Full or Owner is required.",
];

export function loadServiceAccount(raw) {
  if (!raw || !String(raw).trim()) {
    fail("the GSC_SERVICE_ACCOUNT_JSON secret is not set", [
      "The scoreboard has no credentials, so no Search Console data can be read.",
      "",
      ...SETUP_STEPS,
    ]);
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    // Never echo `raw` — it is the credential. Length only.
    fail("GSC_SERVICE_ACCOUNT_JSON is not valid JSON", [
      `The secret is set (${String(raw).length} bytes) but does not parse as JSON: ${error.message}`,
      "",
      "The most common cause is pasting only part of the file, or pasting the",
      "base64 of it. The secret value must be the ENTIRE downloaded JSON,",
      "starting with `{` and ending with `}`.",
      "",
      ...SETUP_STEPS,
    ]);
  }

  const missing = ["client_email", "private_key"].filter((key) => !parsed?.[key]);
  if (missing.length) {
    fail("GSC_SERVICE_ACCOUNT_JSON is missing required fields", [
      `Parsed fine, but these keys are absent: ${missing.join(", ")}.`,
      parsed?.type ? `The file's \`type\` is "${parsed.type}".` : "The file has no `type` field.",
      "",
      "Expected a service-account key file (`\"type\": \"service_account\"`), not an",
      "OAuth client secret and not an API key.",
      "",
      ...SETUP_STEPS,
    ]);
  }

  // GitHub secrets round-trip newlines fine, but a key pasted through a shell
  // or an .env file usually arrives with literal backslash-n. Repair it rather
  // than failing with an opaque OpenSSL error 3 layers down.
  const privateKey = String(parsed.private_key).includes("\\n")
    ? String(parsed.private_key).replace(/\\n/g, "\n")
    : String(parsed.private_key);

  if (!/-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(privateKey)) {
    fail("the service account's private_key is malformed", [
      "`private_key` is present but does not contain a PEM header.",
      "Expected it to start with `-----BEGIN PRIVATE KEY-----`.",
      "",
      ...SETUP_STEPS,
    ]);
  }

  return { ...parsed, private_key: privateKey };
}

export async function getAccessToken(serviceAccount) {
  let assertion;
  try {
    ({ assertion } = signJwtAssertion(serviceAccount));
  } catch (error) {
    fail("could not sign the JWT assertion", [
      `node:crypto rejected the private key: ${error.message}`,
      "The key is present and PEM-shaped but unusable — most likely truncated",
      "or corrupted in transit. Re-download the key file and re-paste the secret.",
      "",
      ...SETUP_STEPS,
    ]);
  }

  const result = await fetch(serviceAccount.token_uri || TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: JWT_BEARER_GRANT, assertion }).toString(),
  });
  const text = await result.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    /* handled below */
  }

  if (!result.ok || !json?.access_token) {
    const code = json?.error ?? `HTTP ${result.status}`;
    const description = json?.error_description ?? "";
    const hints = [];
    if (code === "invalid_grant") {
      hints.push(
        "`invalid_grant` from Google's token endpoint almost always means one of:",
        "  · the service-account key was deleted or disabled in Google Cloud",
        "  · the runner's clock is badly skewed (the assertion is time-bound)",
        "  · the JSON belongs to a different, deleted project",
      );
    }
    if (code === "invalid_client") {
      hints.push("`invalid_client` means the `client_email` in the key no longer exists.");
    }
    if (code === "access_denied" || /not been used|is disabled/i.test(description)) {
      hints.push("Enable the Google Search Console API for the service account's project.");
    }
    fail("Google refused the service-account credentials", [
      `Token endpoint returned: ${code}${description ? ` — ${description}` : ""}`,
      "",
      ...(hints.length ? [...hints, ""] : []),
      ...SETUP_STEPS,
    ]);
  }

  return json.access_token;
}

// --------------------------------------------------------------------------
// Search Analytics
// --------------------------------------------------------------------------

/**
 * Pages through searchAnalytics/query. The API caps `rowLimit` at 25000 and
 * signals "more rows" only by returning a full page, so the loop stops on a
 * short page. `dataState: "final"` excludes the still-settling last few days:
 * week-over-week deltas built on fresh data measure the settling, not the site.
 */
async function searchAnalytics(site, token, dimension, range) {
  const rows = [];
  for (let startRow = 0; ; startRow += ROW_LIMIT) {
    const result = await fetchJson(SEARCH_ANALYTICS_URL(site), {
      token,
      body: {
        startDate: range.startDate,
        endDate: range.endDate,
        dimensions: dimension ? [dimension] : [],
        type: "web",
        dataState: "final",
        rowLimit: ROW_LIMIT,
        startRow,
      },
    });

    if (!result.ok) {
      const message = googleErrorMessage(result);
      if (result.status === 403) {
        fail("the service account cannot read this Search Console property", [
          `Search Analytics returned 403 for site \`${site}\`: ${message}`,
          "",
          "The credentials are valid — Google accepted them — but this service",
          "account is not a user on the property.",
          "",
          "Search Console → the property → Settings → Users and permissions →",
          "Add user → the service account's client_email → permission **Full**.",
          "",
          ...SETUP_STEPS,
        ]);
      }
      if (result.status === 404) {
        fail("the Search Console property identifier is wrong", [
          `Search Analytics returned 404 for site \`${site}\`: ${message}`,
          "",
          "Search Console has two property kinds and they are addressed differently:",
          "  · Domain property     → --site sc-domain:usetruecap.com",
          "  · URL-prefix property → --site https://usetruecap.com/   (trailing slash)",
          "",
          "Open Search Console and check which one exists, then set `site:` in",
          "`.github/workflows/seo-scoreboard.yml` to match.",
        ]);
      }
      fail(`Search Analytics request failed (HTTP ${result.status})`, [
        `Dimension: ${dimension ?? "totals"}. Google said: ${message}`,
      ]);
    }

    const page = result.json?.rows ?? [];
    rows.push(...page);
    if (page.length < ROW_LIMIT) break;
    progress(`  …${rows.length} ${dimension ?? "total"} rows so far`);
  }
  return rows;
}

const analyticsRow = (row, key) => ({
  [key]: row.keys?.[0] ?? "",
  clicks: row.clicks ?? 0,
  impressions: row.impressions ?? 0,
  ctr: row.ctr ?? 0,
  position: row.position ?? null,
});

// --------------------------------------------------------------------------
// URL Inspection
// --------------------------------------------------------------------------

/**
 * The Restricted-permission trap, made explicit.
 *
 * A service account with Restricted permission on the property reads Search
 * Analytics happily and 403s on every URL Inspection call. If that were folded
 * into "not indexed", the report would say 0% indexed — which is also exactly
 * what a real catastrophe (robots.txt blanket disallow, deindexed domain)
 * looks like. Both readings are actionable and they are opposite actions. So a
 * 403 here is never a data point; it is a hard stop.
 *
 * Any 403 triggers it, not just "all of them": URL Inspection authorises at
 * the property level, so there is no legitimate per-URL 403.
 */
function assertNotRestrictedPermission(status, message, site) {
  if (status !== 403) return;
  fail("URL Inspection is forbidden while Search Analytics works — Restricted permission", [
    `urlInspection/index:inspect returned 403 for \`${site}\`: ${message}`,
    "",
    "Search Analytics succeeded for the same credentials in this same run, so",
    "the key is valid and the account IS on the property. That combination has",
    "one cause: the service account was added with **Restricted** permission.",
    "",
    "Restricted grants Search Analytics but NOT URL Inspection. Reporting that",
    "as '0% indexed' would be indistinguishable from the site actually being",
    "deindexed, so this run refuses to produce a number at all.",
    "",
    "Fix: Search Console → property → Settings → Users and permissions →",
    "the service account row → change permission to **Full** (or Owner).",
    "",
    "No telemetry file was written. Do not read the previous file as current.",
  ]);
}

let nextInspectionSlot = 0;
async function rateLimitSlot() {
  const now = Date.now();
  const at = Math.max(now, nextInspectionSlot);
  nextInspectionSlot = at + MIN_INSPECTION_INTERVAL_MS;
  if (at > now) await sleep(at - now);
}

/**
 * One inspection with exponential backoff on 429 / 5xx.
 *
 * Returns `{ quotaExhausted: true }` rather than throwing when the retries run
 * out on a 429: quota exhaustion is a REPORTABLE state (the caller stops and
 * counts what it missed), not a failure of the run. Pretending a partial sweep
 * is the whole sweep is the failure mode this guards against.
 */
async function inspectUrl(inspectionUrl, site, token, { maxRetries = 4 } = {}) {
  let delay = 2000;
  for (let attempt = 0; ; attempt += 1) {
    await rateLimitSlot();
    const result = await fetchJson(URL_INSPECTION_URL, {
      token,
      body: { inspectionUrl, siteUrl: site, languageCode: "en-US" },
    });

    if (result.ok) return { ok: true, indexStatus: result.json?.inspectionResult?.indexStatusResult ?? null };

    const message = googleErrorMessage(result);
    assertNotRestrictedPermission(result.status, message, site);

    const retryable = result.status === 429 || result.status >= 500;
    if (!retryable || attempt >= maxRetries) {
      if (result.status === 429) return { ok: false, quotaExhausted: true, message };
      return { ok: false, message: `HTTP ${result.status}: ${message}` };
    }
    // Full jitter — a synchronised retry storm from N workers is how a 429
    // becomes a permanent 429.
    await sleep(delay + Math.floor(Math.random() * 500));
    delay *= 2;
  }
}

/**
 * Bounded-concurrency sweep. Stops scheduling new work the moment quota is
 * exhausted and reports the shortfall; in-flight calls are allowed to finish.
 */
async function inspectAll(urls, site, token, { concurrency, maxInspections }) {
  const capped = urls.slice(0, maxInspections);
  const results = new Array(urls.length).fill(null);
  const state = { quotaExhausted: false, done: 0, errors: 0 };
  let cursor = 0;

  const workers = Array.from({ length: Math.min(concurrency, capped.length) }, async () => {
    while (cursor < capped.length && !state.quotaExhausted) {
      const index = cursor++;
      const url = capped[index];
      try {
        const outcome = await inspectUrl(url, site, token);
        if (outcome.quotaExhausted) {
          state.quotaExhausted = true;
          state.quotaMessage = outcome.message;
          break;
        }
        results[index] = outcome.ok
          ? { inspected: true, indexStatus: outcome.indexStatus }
          : { inspected: false, error: outcome.message };
        if (!outcome.ok) state.errors += 1;
      } catch (error) {
        results[index] = { inspected: false, error: String(error?.message ?? error) };
        state.errors += 1;
      }
      state.done += 1;
      if (state.done % 50 === 0) progress(`  …inspected ${state.done}/${capped.length}`);
    }
  });
  await Promise.all(workers);

  return { results, state, capped: capped.length };
}

// --------------------------------------------------------------------------
// Formatting
// --------------------------------------------------------------------------

/**
 * Path for display. `new URL(u).pathname` throws on anything that is not
 * absolute, and this runs AFTER the telemetry file is written — a single
 * malformed `<loc>` in the sitemap would take down the report while leaving a
 * telemetry file on disk, which is the worst of both outcomes. Degrade to the
 * raw string instead.
 */
const pathOf = (url) => {
  try {
    return new URL(url).pathname;
  } catch {
    return String(url);
  }
};

const pct = (value) => (typeof value === "number" ? `${(value * 100).toFixed(1)}%` : "—");
const num = (value) => (typeof value === "number" ? value.toLocaleString("en-US") : "—");
const signed = (value, suffix = "") =>
  typeof value === "number" ? `${value > 0 ? "+" : ""}${value.toFixed(suffix === "pp" ? 1 : 0)}${suffix}` : "—";

// --------------------------------------------------------------------------
// main
// --------------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2);
  const flag = (name, fallback = null) => {
    const i = args.indexOf(`--${name}`);
    return i === -1 ? fallback : args[i + 1];
  };
  const has = (name) => args.includes(`--${name}`);

  const SITE = flag("site", "sc-domain:usetruecap.com");
  const BASE = flag("base", "https://usetruecap.com").replace(/\/$/, "");
  const DAYS = Number(flag("days", "28")) || 28;
  const OUT_DIR = path.resolve(REPO_ROOT, flag("out", "docs/seo/telemetry"));
  const CONCURRENCY = Number(flag("concurrency", "5")) || 5;
  const MAX_INSPECTIONS = Number(flag("max-inspections", String(DEFAULT_MAX_INSPECTIONS))) || DEFAULT_MAX_INSPECTIONS;
  const SKIP_INSPECTION = has("skip-inspection");

  const range = windowForRun(Date.now(), { days: DAYS });
  progress(`GSC scoreboard — ${SITE}, ${range.startDate} → ${range.endDate}`);

  // 1. Auth ----------------------------------------------------------------
  const serviceAccount = loadServiceAccount(process.env.GSC_SERVICE_ACCOUNT_JSON);
  const token = await getAccessToken(serviceAccount);
  progress(`  authenticated as ${serviceAccount.client_email}`);

  // 2. The sitemap is the URL universe -------------------------------------
  //
  // Inspecting "every URL in the live sitemap" rather than every URL GSC knows
  // about is deliberate: the sitemap is what we ASKED Google to index, so the
  // gap between it and what is indexed is the number that means something. It
  // also makes a sudden drop in sitemap size visible at the top of the report
  // — a 429 → 380 drop is a shipped bug, and it would otherwise show up only
  // as an unexplained improvement in the indexed ratio.
  let sitemapUrls = [];
  try {
    const response = await fetch(`${BASE}/sitemap.xml`, {
      headers: { "user-agent": "TrueCap-GSC-Scoreboard/1.0 (+https://usetruecap.com)" },
    });
    if (!response.ok) {
      fail(`the live sitemap returned HTTP ${response.status}`, [
        `GET ${BASE}/sitemap.xml → ${response.status}.`,
        "The sitemap is this report's URL universe, so there is nothing to inspect.",
        "If production is genuinely down, that is the finding — check Vercel.",
      ]);
    }
    const xml = await response.text();
    sitemapUrls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
  } catch (error) {
    fail("could not fetch the live sitemap", [
      `GET ${BASE}/sitemap.xml failed: ${error.message}`,
      "The sitemap is this report's URL universe, so there is nothing to inspect.",
    ]);
  }
  if (!sitemapUrls.length) {
    fail("the live sitemap contains zero URLs", [
      `GET ${BASE}/sitemap.xml returned 200 but no <loc> entries were found.`,
      "app/sitemap.ts is generated from CALCULATOR_REGISTRY / GLOSSARY / STATES /",
      "MARKET_CITIES / BLOG_POSTS — an empty sitemap means one of those imports",
      "is failing at build time. This is a production bug, not a scoreboard bug.",
    ]);
  }
  progress(`  ${sitemapUrls.length} URLs in the sitemap`);

  // 3. Search Analytics ----------------------------------------------------
  progress("  querying Search Analytics by page…");
  const pageRows = (await searchAnalytics(SITE, token, "page", range)).map((r) => {
    const row = analyticsRow(r, "url");
    let pathname = row.url;
    try {
      pathname = new URL(row.url).pathname;
    } catch {
      /* keep as-is */
    }
    return { ...row, path: pathname, family: routeFamily(row.url) };
  });

  progress("  querying Search Analytics by query…");
  const queryRows = (await searchAnalytics(SITE, token, "query", range)).map((r) => analyticsRow(r, "query"));

  const totalsRows = await searchAnalytics(SITE, token, null, range);
  const totals = totalsRows.length
    ? {
        clicks: totalsRows[0].clicks ?? 0,
        impressions: totalsRows[0].impressions ?? 0,
        ctr: totalsRows[0].ctr ?? 0,
        position: totalsRows[0].position ?? null,
      }
    : { clicks: 0, impressions: 0, ctr: 0, position: null };

  pageRows.sort((a, b) => b.impressions - a.impressions);
  queryRows.sort((a, b) => b.impressions - a.impressions);
  progress(`  ${pageRows.length} pages, ${queryRows.length} queries with data`);

  // 4. URL Inspection ------------------------------------------------------
  let inspections = [];
  // `planned`, not `attempted`: it is how many URLs the sweep set out to cover
  // (min(sitemap, --max-inspections)). When quota runs out at URL 6 of 429,
  // "attempted: 429" would read as 423 failures rather than 423 never tried,
  // and this file is the record a future reader trusts.
  let inspectionMeta = {
    planned: 0,
    inspected: 0,
    uninspected: sitemapUrls.length,
    errors: 0,
    quotaExhausted: false,
    skipped: SKIP_INSPECTION,
    uninspectedReason: SKIP_INSPECTION ? "--skip-inspection was passed" : null,
  };

  if (!SKIP_INSPECTION) {
    progress(`  inspecting ${Math.min(sitemapUrls.length, MAX_INSPECTIONS)} URLs (concurrency ${CONCURRENCY})…`);
    const { results, state, capped } = await inspectAll(sitemapUrls, SITE, token, {
      concurrency: CONCURRENCY,
      maxInspections: MAX_INSPECTIONS,
    });

    inspections = sitemapUrls.map((url, index) => {
      const outcome = results[index];
      const status = outcome?.indexStatus ?? null;
      return {
        url,
        family: routeFamily(url),
        inspected: Boolean(outcome?.inspected),
        indexed: outcome?.inspected ? isIndexed(status) : null,
        verdict: status?.verdict ?? null,
        coverageState: status?.coverageState ?? null,
        robotsTxtState: status?.robotsTxtState ?? null,
        indexingState: status?.indexingState ?? null,
        pageFetchState: status?.pageFetchState ?? null,
        lastCrawlTime: status?.lastCrawlTime ?? null,
        googleCanonical: status?.googleCanonical ?? null,
        userCanonical: status?.userCanonical ?? null,
        error: outcome?.error ?? null,
      };
    });

    const inspected = inspections.filter((i) => i.inspected).length;
    const uninspected = sitemapUrls.length - inspected;
    let reason = null;
    if (state.quotaExhausted) {
      reason = `URL Inspection daily quota exhausted (Google: ${state.quotaMessage ?? "429"})`;
    } else if (capped < sitemapUrls.length) {
      reason = `--max-inspections ${MAX_INSPECTIONS} capped the sweep below the sitemap size`;
    } else if (uninspected > 0) {
      reason = `${state.errors} URL(s) errored; see \`error\` in the telemetry JSON`;
    }
    inspectionMeta = {
      planned: capped,
      inspected,
      uninspected,
      errors: state.errors,
      quotaExhausted: state.quotaExhausted,
      skipped: false,
      uninspectedReason: reason,
    };
  } else {
    inspections = sitemapUrls.map((url) => ({
      url,
      family: routeFamily(url),
      inspected: false,
      indexed: null,
      verdict: null,
      coverageState: null,
      robotsTxtState: null,
      indexingState: null,
      pageFetchState: null,
      lastCrawlTime: null,
      googleCanonical: null,
      userCanonical: null,
      error: null,
    }));
  }

  const families = summariseFamilies(inspections);

  // 5. Previous run, for the week-over-week diff ----------------------------
  const today = isoDate(Date.now());
  const todayFile = `${today}.json`;
  const previousPath = previousTelemetryPath(OUT_DIR, todayFile);
  let previous = null;
  if (previousPath) {
    try {
      previous = JSON.parse(readFileSync(previousPath, "utf8"));
    } catch (error) {
      // A corrupt previous file loses the deltas but must not lose the run —
      // this week's measurement is worth more than last week's comparison.
      progress(`  WARNING: could not read ${previousPath}: ${error.message}`);
    }
  }
  const familyDeltas = diffFamilies(families, previous?.inspection?.byFamily ?? null);
  // Full list, not a slice — see the note on topQueryMovers. A top-100 slice
  // here would label every query that slipped to rank 101 as lost.
  const movers = topQueryMovers(queryRows, previous?.searchAnalytics?.queries ?? [], 12);

  // 6. The field the content agent consumes --------------------------------
  const gaps = findQueriesWithoutPage(queryRows, sitemapUrls);

  // 7. Telemetry -----------------------------------------------------------
  const telemetry = {
    generatedAt: new Date().toISOString(),
    site: SITE,
    base: BASE,
    range,
    previousTelemetry: previousPath ? path.basename(previousPath) : null,
    sitemap: {
      url: `${BASE}/sitemap.xml`,
      urlCount: sitemapUrls.length,
      previousUrlCount: previous?.sitemap?.urlCount ?? null,
    },
    searchAnalytics: {
      totals,
      pages: pageRows.slice(0, MAX_PERSISTED_PAGES),
      pagesTruncated: pageRows.length > MAX_PERSISTED_PAGES,
      pageCount: pageRows.length,
      queries: queryRows.slice(0, MAX_PERSISTED_QUERIES),
      queriesTruncated: queryRows.length > MAX_PERSISTED_QUERIES,
      queryCount: queryRows.length,
    },
    inspection: {
      ...inspectionMeta,
      byFamily: families,
      urls: inspections,
    },
    queriesWithoutPage: gaps.slice(0, MAX_PERSISTED_GAP_QUERIES),
    queriesWithoutPageCount: gaps.length,
  };

  const serialised = `${JSON.stringify(telemetry, null, 2)}\n`;
  // Belt and braces: these files are committed to a public-history repo.
  assertNoSecrets(serialised, [serviceAccount.private_key, token]);

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(path.join(OUT_DIR, todayFile), serialised);
  // `latest.json` is a stable path so downstream consumers (the content agent,
  // a future dashboard) never have to guess a date.
  writeFileSync(path.join(OUT_DIR, "latest.json"), serialised);
  progress(`  wrote ${path.join(OUT_DIR, todayFile)} and latest.json`);

  // 8. Report --------------------------------------------------------------
  const sitemapDelta =
    typeof previous?.sitemap?.urlCount === "number"
      ? sitemapUrls.length - previous.sitemap.urlCount
      : null;

  say(`# GSC scoreboard — ${today}`);
  say("");
  say(
    `**Sitemap: ${num(sitemapUrls.length)} URLs**` +
      (sitemapDelta === null
        ? " (no previous run to compare)"
        : sitemapDelta === 0
          ? ` (unchanged since ${telemetry.previousTelemetry?.replace(".json", "")})`
          : ` (${signed(sitemapDelta)} since ${telemetry.previousTelemetry?.replace(".json", "")})`) +
      ` — \`${BASE}/sitemap.xml\``,
  );
  if (typeof sitemapDelta === "number" && sitemapDelta < 0) {
    say("");
    say(
      `> ⚠️ The sitemap SHRANK by ${Math.abs(sitemapDelta)} URLs. Check this before reading ` +
        "anything else below: a smaller sitemap makes the indexed ratio go up for free.",
    );
  }
  say("");
  say(`Property \`${SITE}\` · window ${range.startDate} → ${range.endDate} (${range.days} days, final data).`);
  say("");
  say(
    `**${num(totals.clicks)} clicks · ${num(totals.impressions)} impressions · ` +
      `${pct(totals.ctr)} CTR · avg position ${totals.position === null ? "—" : totals.position.toFixed(1)}**`,
  );
  say("");

  // -- indexed ratio per family
  //
  // The coverage caveat goes BEFORE the table, not after it. A partial sweep
  // presented as a whole-site ratio is the specific way this report could
  // mislead: 4-of-11 inspected reads exactly like 11-of-11 once the number is
  // in a table, and the person skimming it is the person deciding what to
  // build next.
  if (inspectionMeta.uninspected > 0 && !inspectionMeta.skipped) {
    say(
      `> ⚠️ **PARTIAL SWEEP — ${num(inspectionMeta.uninspected)} of ${num(sitemapUrls.length)} sitemap URLs ` +
        `were NOT inspected.** ${inspectionMeta.uninspectedReason ?? "reason unknown"}. Everything below ` +
        `covers only the ${num(inspectionMeta.inspected)} URLs that were — it is not a whole-site figure, ` +
        `and it is not comparable to a week where the whole sitemap was swept.`,
    );
    say("");
  }
  say("## Indexed ratio by route family");
  say("");
  if (inspectionMeta.skipped) {
    say("_URL Inspection was skipped for this run (`--skip-inspection`); no ratios available._");
  } else {
    say("| family | indexed | inspected | ratio | Δ vs last run |");
    say("|---|---:|---:|---:|---:|");
    for (const family of ROUTE_FAMILIES) {
      const summary = families[family];
      if (!summary.total) continue;
      const inspected = summary.indexed + summary.notIndexed;
      const delta = familyDeltas[family].ratioDelta;
      say(
        `| \`${family}\` | ${num(summary.indexed)} | ${num(inspected)} | ${pct(summary.ratio)} | ` +
          `${delta === null ? "—" : signed(delta * 100, "pp")} |`,
      );
    }
    const allInspected = inspections.filter((i) => i.inspected);
    const allIndexed = allInspected.filter((i) => i.indexed).length;
    say(
      `| **site** | **${num(allIndexed)}** | **${num(allInspected.length)}** | ` +
        `**${pct(allInspected.length ? allIndexed / allInspected.length : null)}** | |`,
    );
  }
  say("");

  // -- crawled, not indexed
  const crawledNotIndexed = inspections.filter((i) => i.inspected && isCrawledNotIndexed(i.coverageState));
  say(`## Crawled – currently not indexed (${crawledNotIndexed.length})`);
  say("");
  if (!crawledNotIndexed.length) {
    say(
      inspectionMeta.skipped
        ? "_Not measured this run._"
        : "None. Every inspected URL is either indexed or in another state.",
    );
  } else {
    say(
      "Google fetched these, read them, and chose not to index them. This is the " +
        "bucket that says *thin or duplicative*, not *undiscovered* — more internal " +
        "links will not fix it.",
    );
    say("");
    for (const record of crawledNotIndexed.slice(0, 50)) {
      say(`- \`${pathOf(record.url)}\``);
    }
    if (crawledNotIndexed.length > 50) {
      say(`- …and ${crawledNotIndexed.length - 50} more (full list in the telemetry JSON).`);
    }
  }
  say("");

  // -- other coverage states, so nothing is invisible
  const stateCounts = new Map();
  for (const record of inspections) {
    if (!record.inspected) continue;
    const key = record.coverageState ?? "(no coverageState)";
    stateCounts.set(key, (stateCounts.get(key) ?? 0) + 1);
  }
  if (stateCounts.size) {
    say("## Coverage states");
    say("");
    say("| coverageState | URLs |");
    say("|---|---:|");
    for (const [state, count] of [...stateCounts.entries()].sort((a, b) => b[1] - a[1])) {
      say(`| ${state} | ${num(count)} |`);
    }
    say("");
  }

  // -- top queries + movers
  say("## Top queries by impressions");
  say("");
  if (!queryRows.length) {
    say("_No query rows in this window._");
  } else {
    say("| query | impressions | clicks | avg position |");
    say("|---|---:|---:|---:|");
    for (const row of queryRows.slice(0, 15)) {
      say(
        `| ${row.query} | ${num(row.impressions)} | ${num(row.clicks)} | ` +
          `${row.position === null ? "—" : row.position.toFixed(1)} |`,
      );
    }
  }
  say("");

  say("## Top movers");
  say("");
  if (!previous) {
    say("_First run — no previous telemetry file to diff against._");
  } else {
    say("| query | impressions | Δ | avg position | prev position |");
    say("|---|---:|---:|---:|---:|");
    for (const mover of movers) {
      // "GONE" is spelled out rather than left as a bare "-500": a row reading
      // 0 impressions with a large negative delta is a query that stopped
      // appearing entirely, which is a different event from one that merely
      // fell, and the two should not have to be told apart by arithmetic.
      const deltaCell = mover.isNew
        ? "NEW"
        : mover.isLost
          ? `${signed(mover.impressionsDelta)} · GONE`
          : signed(mover.impressionsDelta);
      say(
        `| ${mover.query} | ${num(mover.impressions)} | ${deltaCell} | ` +
          `${mover.position === null ? "—" : mover.position.toFixed(1)} | ` +
          `${mover.previousPosition === null || mover.previousPosition === undefined ? "—" : mover.previousPosition.toFixed(1)} |`,
      );
    }
  }
  say("");

  // -- the content agent's input
  say(`## Queries with impressions and no matching page (${gaps.length})`);
  say("");
  say(
    "Demand we are already being shown for, with no page aimed at it. This is " +
      "measured demand rather than an invented phrasing — the 2026-07-15 audit " +
      "found roughly a third of earlier posts targeted keywords with no search " +
      "volume at all, which is the failure this list exists to replace.",
  );
  say("");
  say(
    "_Matching is a token-overlap heuristic against sitemap slugs, not a reading " +
      "of the page. `nearest` is what it came closest to — check it before writing._",
  );
  say("");
  if (!gaps.length) {
    say("None above the 5-impression floor.");
  } else {
    say("| query | impressions | avg position | nearest page |");
    say("|---|---:|---:|---|");
    for (const gap of gaps.slice(0, 25)) {
      say(
        `| ${gap.query} | ${num(gap.impressions)} | ${gap.position === null ? "—" : gap.position.toFixed(1)} | ` +
          `\`${gap.nearestPage ?? "—"}\` (${pct(gap.nearestCoverage)}) |`,
      );
    }
    if (gaps.length > 25) say(`\n…and ${gaps.length - 25} more in \`docs/seo/telemetry/latest.json\`.`);
  }
  say("");
  say("---");
  // Path is derived from --out rather than hardcoded, so a run pointed at a
  // scratch directory does not print a docs/ path it never wrote to.
  const outRelative = path.relative(REPO_ROOT, OUT_DIR) || ".";
  say(
    `_Generated by \`scripts/seo/gsc-scoreboard.mjs\`. Telemetry: ` +
      `\`${outRelative}/${todayFile}\` (stable copy at \`latest.json\`)._`,
  );

  console.log(report.join("\n"));
  process.exit(0);
}

// Only run when invoked directly, so lib/__tests__/gsc-scoreboard.test.ts can
// import the pure helpers above without firing a live API sweep.
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  await main();
}
