/**
 * IndexNow submitter — tell Bing/Yandex about URLs that changed since the last
 * measured telemetry snapshot.
 *
 * ---------------------------------------------------------------------------
 * READ THIS BEFORE YOU EXPECT ANYTHING FROM IT: GOOGLE IGNORES INDEXNOW.
 * ---------------------------------------------------------------------------
 * Google has never joined IndexNow and has repeatedly said it is evaluating it
 * and nothing more. Submitting here does NOT get a page into Google, does not
 * speed up Googlebot, and does not touch the "2% of 429 pages indexed" number
 * that is this site's actual problem. If you came here looking for a fix for
 * Google indexing, this is not it — internal links, off-domain corroboration
 * and fewer/better pages are, and none of them are a POST request.
 *
 * So why ship it at all? Because the protocol's real consumers are the Bing
 * index and everything that retrieves from it — **Bing, Copilot,
 * ChatGPT Search, Perplexity** (and Yandex, DuckDuckGo via Bing). That set
 * matters here more than it would for most sites, for a specific measured
 * reason: TrueCap has **zero third-party mentions anywhere** — no AlternativeTo
 * listing, no SaaSHub, no G2, no Product Hunt, no roundup, no Reddit thread
 * (2026-08-02 baseline, unchanged since). Assistants answer "what should I use
 * to underwrite a rental" by assembling corroborated sources, and TrueCap has
 * none. When the only corroboration available is the site's own pages, having
 * those pages in the index those assistants retrieve from is the difference
 * between "never mentioned" and "mentioned from its own docs". That is a small
 * lever, honestly described. `docs/seo/off-domain-outreach.md` and the
 * submission packets in `docs/seo/submissions/` are the big one.
 *
 * WE DELIBERATELY DO NOT BUILD A GOOGLE INDEXING API SUBMITTER.
 * The Google Indexing API accepts `JobPosting` and `BroadcastEvent` pages
 * ONLY. TrueCap has neither. Using it for ordinary pages is documented misuse
 * and the documented consequence is losing API access — a real cost for a
 * guaranteed-zero benefit. Do not add one, however tempting the symmetry with
 * this file looks.
 *
 * ---------------------------------------------------------------------------
 * WHAT IT SUBMITS
 * ---------------------------------------------------------------------------
 * The diff between the live sitemap and the newest telemetry snapshot in
 * `docs/seo/telemetry/` (written by scripts/seo/gsc-scoreboard.mjs, whose
 * `inspection.urls[]` is the full sitemap URL list as it stood that week):
 *
 *   1. URLs in the live sitemap that are not in the snapshot  -> NEW pages
 *   2. URLs whose sitemap <lastmod> is newer than the snapshot's generatedAt
 *      -> pages we have declared changed since it was taken
 *
 * NOT the whole sitemap. Re-POSTing 429 unchanged URLs every week is exactly
 * the "submitting content that has not changed" pattern the protocol's own
 * guidance calls out, and the penalty for it is being ignored — which would
 * cost us the one thing this file buys.
 *
 * NO PREVIOUS SNAPSHOT = NO SUBMISSION. If `docs/seo/telemetry/` is empty (or
 * only holds an unmerged week), the diff would be "the entire sitemap", so the
 * run reports that and submits nothing. `--all` overrides it for a deliberate
 * one-time seeding by a human; it is not wired to any workflow.
 *
 * ---------------------------------------------------------------------------
 * THE KEY
 * ---------------------------------------------------------------------------
 * `public/0844053b531d3cd133a1182198501707.txt` contains the key and nothing
 * else, so it is served at
 * https://usetruecap.com/0844053b531d3cd133a1182198501707.txt and proves we
 * control the host. IndexNow keys are PUBLIC by design — the file has to be
 * fetchable by the search engine — so this is not a secret and does not belong
 * in env vars or GitHub secrets. If the key here and the filename in public/
 * ever disagree, the API answers 403; this script verifies the live key file
 * before it POSTs anything, because a silent 403 every week is the failure
 * mode that would otherwise never be noticed.
 *
 * Usage:
 *   node scripts/seo/indexnow.mjs              # diff and submit
 *   node scripts/seo/indexnow.mjs --dry-run    # print what it would submit
 *   node scripts/seo/indexnow.mjs --all        # submit the whole sitemap (seeding only)
 *
 * Exit code 0 unless the submission itself failed. A "nothing to submit" run
 * is a success — it is the normal state of a week where no page changed.
 *
 * Plain .mjs, no deps, same as healthcheck.mjs: the weekly workflow runs it
 * without `npm ci`.
 */

import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const args = process.argv.slice(2);
const flag = (name, fallback = null) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : args[i + 1];
};
const has = (name) => args.includes(`--${name}`);

const BASE = (flag("base", "https://usetruecap.com")).replace(/\/$/, "");
const DRY_RUN = has("dry-run");
const SUBMIT_ALL = has("all");

/**
 * Must match the filename in public/ exactly (minus `.txt`). Both are checked
 * against the live host below before anything is submitted.
 */
const INDEXNOW_KEY = "0844053b531d3cd133a1182198501707";
const KEY_LOCATION = `${BASE}/${INDEXNOW_KEY}.txt`;
const ENDPOINT = "https://api.indexnow.org/IndexNow";

/** IndexNow accepts up to 10,000 URLs per request; we will never be close. */
const MAX_URLS_PER_REQUEST = 10000;

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const TELEMETRY_DIR = path.join(REPO_ROOT, "docs/seo/telemetry");

const log = (...parts) => console.log(...parts);
const fail = (message) => {
  console.error(`indexnow: ${message}`);
  process.exit(1);
};

// ------------------------------------------------------- the key file check
//
// Done first and treated as fatal. Every other failure mode of this script is
// visible (a non-2xx from the API, an empty diff); a key file that 404s
// produces a 403 from the API that reads like any other transient failure, and
// the submission quietly stops working for months.
{
  let response;
  try {
    response = await fetch(KEY_LOCATION, { headers: { "user-agent": "TrueCap-IndexNow/1.0" } });
  } catch (error) {
    fail(`could not fetch the key file at ${KEY_LOCATION}: ${error.message}`);
  }
  if (response.status !== 200) {
    fail(
      `key file ${KEY_LOCATION} returned ${response.status}. IndexNow verifies ownership by ` +
        `fetching it, so every submission would 403. It must exist at ` +
        `public/${INDEXNOW_KEY}.txt and be deployed.`,
    );
  }
  const served = (await response.text()).trim();
  if (served !== INDEXNOW_KEY) {
    fail(
      `key file ${KEY_LOCATION} serves "${served.slice(0, 40)}" but this script sends ` +
        `"${INDEXNOW_KEY}". They must be identical, or IndexNow answers 403.`,
    );
  }
  log(`Key file OK: ${KEY_LOCATION}`);
}

// ---------------------------------------------------------- the live sitemap
/** @type {{ url: string, lastmod: string | null }[]} */
let sitemapEntries = [];
try {
  const response = await fetch(`${BASE}/sitemap.xml`, {
    headers: { "user-agent": "TrueCap-IndexNow/1.0" },
  });
  if (response.status !== 200) fail(`GET ${BASE}/sitemap.xml returned ${response.status}`);
  const xml = await response.text();
  for (const block of xml.matchAll(/<url>([\s\S]*?)<\/url>/g)) {
    const loc = block[1].match(/<loc>([^<]+)<\/loc>/)?.[1]?.trim();
    if (!loc) continue;
    const lastmod = block[1].match(/<lastmod>([^<]+)<\/lastmod>/)?.[1]?.trim() ?? null;
    sitemapEntries.push({ url: loc, lastmod });
  }
} catch (error) {
  fail(`could not fetch the sitemap: ${error.message}`);
}
if (!sitemapEntries.length) fail("the sitemap parsed to zero URLs — refusing to guess");
log(`Sitemap: ${sitemapEntries.length} URLs`);

// ------------------------------------------------- the previous measurement
//
// `latest.json` is a byte-identical copy of the newest dated file, so it is
// the right thing to read — but it only exists on `main` once the scoreboard's
// long-lived PR has been merged. Falling back to the newest dated file keeps
// this working on a branch where only the dated file landed.
function readPreviousSnapshot() {
  let names;
  try {
    names = readdirSync(TELEMETRY_DIR);
  } catch {
    return null;
  }
  const dated = names.filter((n) => /^\d{4}-\d{2}-\d{2}\.json$/.test(n)).sort();
  const candidates = [];
  if (names.includes("latest.json")) candidates.push("latest.json");
  if (dated.length) candidates.push(dated[dated.length - 1]);
  for (const name of candidates) {
    try {
      const parsed = JSON.parse(readFileSync(path.join(TELEMETRY_DIR, name), "utf8"));
      const urls = (parsed?.inspection?.urls ?? []).map((u) => u.url).filter(Boolean);
      if (urls.length) return { name, generatedAt: parsed.generatedAt ?? null, urls: new Set(urls) };
    } catch {
      /* try the next candidate rather than failing on one corrupt file */
    }
  }
  return null;
}

const previous = readPreviousSnapshot();

let toSubmit = [];
let rationale = "";

if (SUBMIT_ALL) {
  toSubmit = sitemapEntries.map((e) => e.url);
  rationale = "--all: submitting the entire sitemap (one-time seeding)";
} else if (!previous) {
  // Deliberately a no-op, not a full submit. See the header.
  log("");
  log("No usable telemetry snapshot in docs/seo/telemetry/ — nothing submitted.");
  log("The diff would be 'the entire sitemap', which is what IndexNow guidance calls");
  log("out as submitting unchanged content. Merge the scoreboard PR (it writes");
  log("docs/seo/telemetry/latest.json), or run with --all once, on purpose.");
  process.exit(0);
} else {
  const since = previous.generatedAt ? Date.parse(previous.generatedAt) : NaN;
  const added = sitemapEntries.filter((e) => !previous.urls.has(e.url));
  const touched = sitemapEntries.filter(
    (e) =>
      previous.urls.has(e.url) &&
      e.lastmod &&
      Number.isFinite(since) &&
      Date.parse(e.lastmod) > since,
  );
  toSubmit = [...new Set([...added, ...touched].map((e) => e.url))];
  rationale =
    `vs ${previous.name} (${previous.generatedAt ?? "no timestamp"}): ` +
    `${added.length} new URL(s), ${touched.length} with a newer <lastmod>`;
}

log("");
log(rationale);

if (!toSubmit.length) {
  log("Nothing changed since the last snapshot. Nothing submitted — that is a normal week.");
  process.exit(0);
}

if (toSubmit.length > MAX_URLS_PER_REQUEST) {
  // Not expected at 429 sitemap URLs. If it ever happens, something generated
  // a URL explosion and blasting it at an index is the wrong response.
  fail(
    `${toSubmit.length} URLs to submit exceeds the ${MAX_URLS_PER_REQUEST}-per-request limit. ` +
      `That is a sitemap problem, not a submission problem — look at app/sitemap.ts first.`,
  );
}

log(`Submitting ${toSubmit.length} URL(s):`);
for (const url of toSubmit.slice(0, 25)) log(`  ${url}`);
if (toSubmit.length > 25) log(`  …and ${toSubmit.length - 25} more`);

if (DRY_RUN) {
  log("");
  log("--dry-run: nothing was sent.");
  process.exit(0);
}

const payload = {
  host: new URL(BASE).host,
  key: INDEXNOW_KEY,
  keyLocation: KEY_LOCATION,
  urlList: toSubmit,
};

let response;
try {
  response = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "content-type": "application/json; charset=utf-8",
      "user-agent": "TrueCap-IndexNow/1.0 (+https://usetruecap.com)",
    },
    body: JSON.stringify(payload),
  });
} catch (error) {
  fail(`POST ${ENDPOINT} failed: ${error.message}`);
}

const text = await response.text().catch(() => "");
log("");
log(`POST ${ENDPOINT} → ${response.status} ${text.slice(0, 300)}`);

// 200 = accepted. 202 = accepted, key validation pending. Everything else is
// a real failure and should be loud: 400 bad request, 403 key not valid,
// 422 URLs do not belong to the host, 429 too many requests.
if (response.status === 200 || response.status === 202) {
  log("Accepted. Note this affects Bing/Copilot/ChatGPT-Search/Perplexity only — not Google.");
  process.exit(0);
}
fail(`IndexNow rejected the submission with HTTP ${response.status}. Body: ${text.slice(0, 500)}`);
