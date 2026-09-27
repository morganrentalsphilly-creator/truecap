/**
 * PageSpeed Insights (mobile) for one representative URL per page template:
 * home, a blog article, a market guide, a state guide, a comparison page, a
 * glossary term and a tool. Writes seo/data/psi-<date>.json (Psi).
 *
 * Why per template and not per URL: the sitemap's ~380 URLs render from a
 * handful of templates, so seven measurements describe the site's vitals and
 * stay inside the keyless quota. The report and the baseline print them as the
 * "template vitals" table. Nothing gates on them.
 *
 * Which URL stands in for a template: the page of that family with the most
 * impressions in the latest gsc-<date>.json that is also in the live sitemap
 * (the sitemap lists only indexable pages, and this is the page searchers
 * actually land on). Without a gsc file, or when no page of the family has
 * impressions, it is the family's first sitemap URL. Home is always "/".
 *
 * Lab data vs field data. Anyone reading the output needs this:
 *   - LCP, CLS, TBT and the performance score (×100) come from the Lighthouse
 *     LAB run, a single emulated mobile load. A successful run always has them.
 *   - INP exists ONLY as field data (Chrome UX Report, real users over 28
 *     days). Lighthouse cannot measure INP, and TBT does not substitute for it.
 *     At this site's traffic most URLs have no field data, so `field` is
 *     usually null. Null means "not measured", never "good".
 *   - When CrUX has no URL-level data, PSI puts the ORIGIN's field data in
 *     `loadingExperience` (origin_fallback). Reporting that as the page's INP
 *     would state something nobody measured. So `field` stays null, and the
 *     origin numbers go to `originField`, a local extension of PsiResult.
 *
 * Key handling: PSI_API_KEY is optional. Without it the run is still made
 * keyless. Google rate-limits keyless calls hard, so a 429 (or a quota-reason
 * 403) is recorded as `ok:false, error:"quota"` and the run moves on to the
 * next template. The key travels in the request URL, so it is registered with
 * io.ts, never logged, and scrubbed from any error text before it is stored.
 *
 * Report-only: exits 0 once the artifact is written, even when calls failed,
 * because every failure is recorded per template in the artifact.
 */

import path from "node:path";
import type { Args } from "./lib/cli.ts";
import { check, hasFlag, log, runMain } from "./lib/cli.ts";
import { loadConfig } from "./lib/config.ts";
import { familyOf, type Family } from "./lib/family.ts";
import { readJsonIfExists, registerSecret, writeJson } from "./lib/io.ts";
import { datedDataPath, latestDataFile } from "./lib/paths.ts";
import { fetchSitemap, toPath, type SitemapUrl } from "./lib/sitemap.ts";
import type { GscPull, Psi, PsiResult } from "./lib/types.ts";

const PSI_ENDPOINT = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";
/** A PSI mobile run routinely takes 15-40 s; give it room before calling it a network failure. */
const PSI_TIMEOUT_MS = 120_000;
const RETRY_DELAY_MS = 5_000;

/** Families measured, in report order. Home ("/") is measured first, separately. */
export const PAGE_TEMPLATES: Family[] = ["blog-post", "market-city", "state", "vs", "glossary-term", "tool"];
export const PSI_TEMPLATES: Family[] = ["home", ...PAGE_TEMPLATES];

export type TemplatePick = {
  template: Family;
  path: string;
  url: string;
  pickedBy: "home" | "gsc-impressions" | "sitemap-order";
};

export type FieldData = NonNullable<PsiResult["field"]>;
/** PsiResult plus the origin-level field data PSI substitutes when a URL has none of its own. */
export type PsiResultExt = PsiResult & { originField: FieldData | null };
export type PsiArtifact = Omit<Psi, "results"> & { results: PsiResultExt[] };
export type PsiMeasurement = Omit<PsiResultExt, "template" | "url">;

export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;
export type Sleep = (ms: number) => Promise<void>;

type JsonRecord = Record<string, unknown>;
const isRecord = (value: unknown): value is JsonRecord => typeof value === "object" && value !== null && !Array.isArray(value);
const finite = (value: unknown): number | null => (typeof value === "number" && Number.isFinite(value) ? value : null);
const rounded = (value: number | null, digits = 0): number | null => (value === null ? null : Number(value.toFixed(digits)));

/** A gsc `page` as a site path, or null when it is a full URL on another host. */
function gscPath(page: string, host: string): string | null {
  if (page.startsWith("/")) return page;
  try {
    return new URL(page).host === host ? toPath(page) : null;
  } catch {
    return null;
  }
}

/**
 * One representative URL per template. Ranking: impressions (28d, current
 * window), then clicks, then path, so reruns on the same data pick the same
 * page. Families with no sitemap URL are omitted; the caller logs them.
 */
export function pickTemplateUrls(sitemap: SitemapUrl[], gsc: GscPull | null, base: string = loadConfig().site.base): TemplatePick[] {
  const origin = new URL(base);
  const root = origin.origin;
  const picks: TemplatePick[] = [{ template: "home", path: "/", url: `${root}/`, pickedBy: "home" }];

  const traffic = new Map<string, { impressions: number; clicks: number }>();
  for (const row of gsc?.pages?.current ?? []) {
    const p = gscPath(row.page, origin.host);
    if (p === null) continue;
    const prev = traffic.get(p) ?? { impressions: 0, clicks: 0 };
    traffic.set(p, { impressions: prev.impressions + (row.impressions || 0), clicks: prev.clicks + (row.clicks || 0) });
  }

  for (const family of PAGE_TEMPLATES) {
    const seen = new Set<string>();
    const members: string[] = [];
    for (const entry of sitemap) {
      if (familyOf(entry.path) !== family || seen.has(entry.path)) continue;
      seen.add(entry.path);
      members.push(entry.path);
    }
    if (!members.length) continue;

    let best: { path: string; impressions: number; clicks: number } | null = null;
    for (const p of members) {
      const t = traffic.get(p);
      if (!t || t.impressions <= 0) continue;
      const better =
        !best ||
        t.impressions > best.impressions ||
        (t.impressions === best.impressions && (t.clicks > best.clicks || (t.clicks === best.clicks && p < best.path)));
      if (better) best = { path: p, ...t };
    }
    const chosen = best ? best.path : members[0];
    picks.push({ template: family, path: chosen, url: `${root}${chosen}`, pickedBy: best ? "gsc-impressions" : "sitemap-order" });
  }
  return picks;
}

/** CrUX metrics block → FieldData. CLS percentiles are reported ×100 (10 = 0.10). */
function parseField(experience: unknown): FieldData | null {
  if (!isRecord(experience) || !isRecord(experience.metrics)) return null;
  const metrics = experience.metrics;
  const percentile = (name: string): number | null => {
    const metric = metrics[name];
    return isRecord(metric) ? finite(metric.percentile) : null;
  };
  const lcpMs = percentile("LARGEST_CONTENTFUL_PAINT_MS");
  const inpMs = percentile("INTERACTION_TO_NEXT_PAINT");
  const clsX100 = percentile("CUMULATIVE_LAYOUT_SHIFT_SCORE");
  if (lcpMs === null && inpMs === null && clsX100 === null) return null;
  return {
    lcpMs,
    inpMs,
    cls: clsX100 === null ? null : rounded(clsX100 / 100, 2),
    category: typeof experience.overall_category === "string" ? experience.overall_category : null,
  };
}

/**
 * A runPagespeed response → the measured values. Never throws: anything it
 * cannot read becomes null, and a response without usable lab metrics is
 * `ok:false` with a reason.
 */
export function parsePsi(json: unknown): PsiMeasurement {
  const none = { performanceScore: null, lcpMs: null, clsLab: null, tbtMs: null };
  if (!isRecord(json)) return { ok: false, error: "unparseable PSI response", ...none, field: null, originField: null };

  const loading = json.loadingExperience;
  const fellBackToOrigin = isRecord(loading) && loading.origin_fallback === true;
  const field = fellBackToOrigin ? null : parseField(loading);
  const originField = parseField(json.originLoadingExperience) ?? (fellBackToOrigin ? parseField(loading) : null);

  const lighthouse = json.lighthouseResult;
  if (!isRecord(lighthouse)) return { ok: false, error: "no lighthouseResult in PSI response", ...none, field, originField };

  const runtimeError = lighthouse.runtimeError;
  if (isRecord(runtimeError) && typeof runtimeError.code === "string" && runtimeError.code !== "NO_ERROR") {
    // Lab numbers from a failed Lighthouse run are not measurements; drop them.
    return { ok: false, error: `lighthouse: ${runtimeError.code}`, ...none, field, originField };
  }

  const audits = isRecord(lighthouse.audits) ? lighthouse.audits : {};
  const audit = (id: string): number | null => {
    const entry = audits[id];
    return isRecord(entry) ? finite(entry.numericValue) : null;
  };
  const categories = isRecord(lighthouse.categories) ? lighthouse.categories : {};
  const performance = isRecord(categories.performance) ? categories.performance : {};
  const score = finite(performance.score);

  const measured = {
    performanceScore: score === null ? null : Math.round(score * 100),
    lcpMs: rounded(audit("largest-contentful-paint")),
    clsLab: rounded(audit("cumulative-layout-shift"), 3),
    tbtMs: rounded(audit("total-blocking-time")),
  };
  if (Object.values(measured).every((v) => v === null)) {
    return { ok: false, error: "no lab metrics in lighthouseResult", ...measured, field, originField };
  }
  return { ok: true, error: null, ...measured, field, originField };
}

/** The runPagespeed request URL. Contains the key when one is given: never log it. */
export function psiRequestUrl(pageUrl: string, key: string | null): string {
  const params = new URLSearchParams({ url: pageUrl, strategy: "mobile", category: "performance" });
  if (key) params.set("key", key);
  return `${PSI_ENDPOINT}?${params.toString()}`;
}

export function redact(text: string, secret: string | null): string {
  return secret ? text.split(secret).join("[redacted]") : text;
}

const QUOTA_REASONS = /rateLimitExceeded|dailyLimitExceeded|quotaExceeded|userRateLimitExceeded|RESOURCE_EXHAUSTED/;

/** A non-2xx PSI answer → the stored `error`. Quota answers are always exactly "quota". */
export function httpFailure(status: number, body: unknown, key: string | null): string {
  if (status === 429) return "quota";
  const err: JsonRecord = isRecord(body) && isRecord(body.error) ? body.error : {};
  const details: unknown[] = Array.isArray(err.errors) ? err.errors : [];
  const reasons = details.map((e) => (isRecord(e) ? String(e.reason ?? "") : "")).join(" ");
  if (status === 403 && QUOTA_REASONS.test(`${reasons} ${String(err.status ?? "")}`)) return "quota";
  const message = typeof err.message === "string" ? err.message : "";
  return redact(`http-${status}${message ? `: ${message}` : ""}`, key).slice(0, 200);
}

const defaultSleep: Sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** One template: a single retry on a network error or 5xx, none on quota. */
export async function measureTemplate(pick: TemplatePick, key: string | null, fetchImpl: FetchLike, sleep: Sleep = defaultSleep): Promise<PsiResultExt> {
  const result = (measurement: PsiMeasurement): PsiResultExt => ({ template: pick.template, url: pick.url, ...measurement });
  const failed = (error: string): PsiResultExt =>
    result({ ok: false, error, performanceScore: null, lcpMs: null, clsLab: null, tbtMs: null, field: null, originField: null });

  let lastError = "no attempt made";
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    if (attempt > 1) await sleep(RETRY_DELAY_MS);
    let response: Response;
    try {
      response = await fetchImpl(psiRequestUrl(pick.url, key), { signal: AbortSignal.timeout(PSI_TIMEOUT_MS) });
    } catch (error) {
      lastError = redact(`network: ${error instanceof Error ? error.message : String(error)}`, key).slice(0, 200);
      continue;
    }
    const text = await response.text().catch(() => "");
    let body: unknown = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = null;
    }
    if (response.ok) return result(parsePsi(body));
    lastError = httpFailure(response.status, body, key);
    if (response.status < 500) break;
  }
  return failed(lastError);
}

/** Sequential on purpose: parallel calls burn the keyless quota in one burst. */
export async function measureAll(picks: TemplatePick[], key: string | null, fetchImpl: FetchLike, sleep: Sleep = defaultSleep): Promise<PsiResultExt[]> {
  const results: PsiResultExt[] = [];
  for (const pick of picks) {
    const r = await measureTemplate(pick, key, fetchImpl, sleep);
    const tag = key ? "" : " (keyless)";
    if (r.ok) {
      log(`psi: ${r.template} ${pick.path}: score ${r.performanceScore ?? "?"}, LCP ${r.lcpMs ?? "?"} ms, CLS ${r.clsLab ?? "?"}, TBT ${r.tbtMs ?? "?"} ms, field INP ${r.field?.inpMs ?? "none"}${tag}`);
    } else {
      log(`psi: ${r.template} ${pick.path}: FAILED (${r.error})${tag}`);
    }
    results.push(r);
  }
  return results;
}

export async function main(args: Args): Promise<number> {
  const config = loadConfig();
  const key = process.env.PSI_API_KEY?.trim() || null;
  registerSecret(key);

  const sitemap = await fetchSitemap(config.site.base);
  const gscFile = latestDataFile("gsc");
  const gsc = readJsonIfExists<GscPull>(gscFile);
  log(gscFile ? `psi: ranking template URLs by impressions in ${path.basename(gscFile)}` : "psi: no gsc-<date>.json yet; using each family's first sitemap URL");

  const picks = pickTemplateUrls(sitemap, gsc, config.site.base);
  for (const template of PSI_TEMPLATES) {
    if (!picks.some((p) => p.template === template)) log(`psi: the sitemap has no ${template} URL; that template is skipped`);
  }
  log(key ? "psi: PSI_API_KEY is set; results are keyed" : "psi: PSI_API_KEY is not set; EVERY result below is keyless (Google rate-limits keyless calls; a 429 is recorded as quota)");

  if (hasFlag(args, "dry-run")) {
    console.log(JSON.stringify({ dryRun: true, keyed: Boolean(key), picks }, null, 2));
    return 0;
  }

  const results = await measureAll(picks, key, fetch);
  const artifact: PsiArtifact = { generatedAt: new Date().toISOString(), strategy: "mobile", keyed: Boolean(key), results };
  const file = datedDataPath("psi");
  writeJson(file, artifact);

  const ok = results.filter((r) => r.ok).length;
  const quota = results.filter((r) => r.error === "quota").length;
  log(`psi: ${ok}/${results.length} templates measured${quota ? `, ${quota} hit the quota` : ""}${key ? "" : " (all keyless)"}; wrote ${path.basename(file)}`);
  return 0;
}

function selfTest(): void {
  const base = "https://usetruecap.com";
  const sm = (p: string): SitemapUrl => ({ url: `${base}${p}`, path: p, lastmod: null });
  const sitemap = ["/", "/blog/a", "/blog/b", "/markets/x", "/states/y", "/tools/t", "/glossary/g"].map(sm);
  const metric = { ctr: 0, position: 10 };
  const gsc = {
    pages: {
      current: [
        { page: "/blog/b", impressions: 40, clicks: 1, ...metric },
        { page: "/blog/a", impressions: 10, clicks: 0, ...metric },
        { page: "/blog/not-in-sitemap", impressions: 900, clicks: 5, ...metric },
      ],
      prior: [],
    },
  } as unknown as GscPull;

  const picks = pickTemplateUrls(sitemap, gsc, base);
  check(picks[0].template === "home" && picks[0].url === `${base}/`, "home is always / first");
  check(picks.find((p) => p.template === "blog-post")?.path === "/blog/b", "highest-impression sitemap blog post wins");
  check(picks.find((p) => p.template === "market-city")?.pickedBy === "sitemap-order", "no impressions → first sitemap URL");
  check(!picks.some((p) => p.template === "vs"), "a family absent from the sitemap is omitted");
  check(pickTemplateUrls(sitemap, null, base).find((p) => p.template === "blog-post")?.path === "/blog/a", "no gsc → first sitemap URL");

  const parsed = parsePsi({
    lighthouseResult: {
      categories: { performance: { score: 0.87 } },
      audits: {
        "largest-contentful-paint": { numericValue: 2412.6 },
        "cumulative-layout-shift": { numericValue: 0.01234 },
        "total-blocking-time": { numericValue: 180.2 },
      },
    },
    loadingExperience: { metrics: { INTERACTION_TO_NEXT_PAINT: { percentile: 190 }, CUMULATIVE_LAYOUT_SHIFT_SCORE: { percentile: 5 } }, overall_category: "FAST" },
  });
  check(parsed.ok && parsed.performanceScore === 87 && parsed.lcpMs === 2413 && parsed.clsLab === 0.012 && parsed.tbtMs === 180, "lab metrics parse");
  check(parsed.field?.inpMs === 190 && parsed.field?.cls === 0.05, "field INP and CLS (×100) parse");

  const fallback = parsePsi({
    lighthouseResult: { categories: { performance: { score: 0.5 } }, audits: {} },
    loadingExperience: { origin_fallback: true, metrics: { INTERACTION_TO_NEXT_PAINT: { percentile: 300 } } },
  });
  check(fallback.field === null && fallback.originField?.inpMs === 300, "origin fallback is never reported as the page's field data");
  check(!parsePsi({ lighthouseResult: { runtimeError: { code: "NO_FCP" } } }).ok, "a Lighthouse runtime error is ok:false");
  check(!parsePsi("nope").ok, "garbage is ok:false, not a throw");

  check(!psiRequestUrl(`${base}/`, null).includes("key="), "keyless request carries no key");
  check(psiRequestUrl(`${base}/`, "k".repeat(39)).includes("strategy=mobile"), "strategy is mobile");
  check(httpFailure(429, null, null) === "quota", "429 → quota");
  check(!httpFailure(400, { error: { message: `bad key ${"s".repeat(39)}` } }, "s".repeat(39)).includes("s".repeat(39)), "the key is scrubbed from errors");
}

/** Every flag this script reads (lib/cli.ts rejects any other). */
export const CLI_FLAGS: readonly string[] = ["dry-run"];

runMain(import.meta.url, main, selfTest, { flags: CLI_FLAGS });
