import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  PSI_TEMPLATES,
  httpFailure,
  main,
  measureAll,
  measureTemplate,
  parsePsi,
  pickTemplateUrls,
  psiRequestUrl,
  redact,
  type FetchLike,
  type PsiArtifact,
  type TemplatePick,
} from "../../seo/scripts/psi.ts";
import { parseArgs } from "../../seo/scripts/lib/cli.ts";
import type { SitemapUrl } from "../../seo/scripts/lib/sitemap.ts";
import type { GscPull } from "../../seo/scripts/lib/types.ts";

/**
 * seo/scripts/psi.ts: template-URL selection, PSI response parsing, and the
 * failure handling the brief pins (a 429 is `error:"quota"`, never a crash,
 * and the run continues). No network: every fetch is a stub.
 *
 * The parsing tests matter most. INP exists only as CrUX field data, and PSI
 * silently substitutes ORIGIN data when a URL has none. A regression that
 * reports origin INP as the page's own would put an unmeasured number into
 * the template-vitals table.
 */

const BASE = "https://usetruecap.com";
const FAKE_KEY = "AIzaFAKEfakeFAKEfakeFAKEfakeFAKEfake123"; // 39 chars, the shape of a Google API key

const sm = (p: string, host = BASE): SitemapUrl => ({ url: `${host}${p}`, path: p, lastmod: null });
const metric = { ctr: 0, position: 12 };
const gscWith = (rows: Array<{ page: string; impressions: number; clicks?: number }>): GscPull =>
  ({ pages: { current: rows.map((r) => ({ clicks: 0, ...metric, ...r })), prior: [] } }) as unknown as GscPull;

const FULL_SITEMAP = [
  "/",
  "/blog",
  "/blog/cap-rate",
  "/blog/dscr",
  "/blog/topics/taxes",
  "/markets/philadelphia",
  "/markets/philadelphia/brrrr",
  "/markets/austin",
  "/states/pennsylvania",
  "/vs/spreadsheet",
  "/glossary/noi",
  "/tools/cap-rate-calculator",
  "/about",
].map((p) => sm(p));

const labBody = (score = 0.87) => ({
  lighthouseResult: {
    categories: { performance: { score } },
    audits: {
      "largest-contentful-paint": { numericValue: 2412.6 },
      "cumulative-layout-shift": { numericValue: 0.01234 },
      "total-blocking-time": { numericValue: 180.4 },
    },
  },
});

describe("pickTemplateUrls", () => {
  it("measures home first, then one URL per template family in report order", () => {
    const picks = pickTemplateUrls(FULL_SITEMAP, null, BASE);
    expect(picks.map((p) => p.template)).toEqual(PSI_TEMPLATES);
    expect(picks[0]).toEqual({ template: "home", path: "/", url: `${BASE}/`, pickedBy: "home" });
  });

  it("without gsc data uses the first sitemap URL of each family", () => {
    const byTemplate = Object.fromEntries(pickTemplateUrls(FULL_SITEMAP, null, BASE).map((p) => [p.template, p]));
    expect(byTemplate["blog-post"].path).toBe("/blog/cap-rate");
    expect(byTemplate["market-city"].path).toBe("/markets/philadelphia");
    expect(byTemplate["state"].path).toBe("/states/pennsylvania");
    expect(byTemplate["vs"].path).toBe("/vs/spreadsheet");
    expect(byTemplate["glossary-term"].path).toBe("/glossary/noi");
    expect(byTemplate["tool"].path).toBe("/tools/cap-rate-calculator");
    for (const pick of Object.values(byTemplate)) if (pick.template !== "home") expect(pick.pickedBy).toBe("sitemap-order");
  });

  it("never picks a hub, a topic page or a market sub-strategy page for a template", () => {
    const paths = pickTemplateUrls(FULL_SITEMAP, null, BASE).map((p) => p.path);
    expect(paths).not.toContain("/blog");
    expect(paths).not.toContain("/blog/topics/taxes");
    expect(paths).not.toContain("/markets/philadelphia/brrrr");
  });

  it("with gsc data picks the highest-impression page that is in the sitemap", () => {
    const gsc = gscWith([
      { page: "/blog/cap-rate", impressions: 40 },
      { page: "/blog/dscr", impressions: 274 },
      { page: "/blog/redirected-away", impressions: 5_000 }, // not in the sitemap: not indexable
      { page: "/markets/austin", impressions: 3 },
    ]);
    const byTemplate = Object.fromEntries(pickTemplateUrls(FULL_SITEMAP, gsc, BASE).map((p) => [p.template, p]));
    expect(byTemplate["blog-post"]).toMatchObject({ path: "/blog/dscr", pickedBy: "gsc-impressions" });
    expect(byTemplate["market-city"]).toMatchObject({ path: "/markets/austin", pickedBy: "gsc-impressions" });
    expect(byTemplate["state"]).toMatchObject({ path: "/states/pennsylvania", pickedBy: "sitemap-order" });
  });

  it("ignores zero-impression rows and falls back to sitemap order", () => {
    const gsc = gscWith([{ page: "/blog/dscr", impressions: 0, clicks: 0 }]);
    const pick = pickTemplateUrls(FULL_SITEMAP, gsc, BASE).find((p) => p.template === "blog-post");
    expect(pick).toMatchObject({ path: "/blog/cap-rate", pickedBy: "sitemap-order" });
  });

  it("breaks impression ties by clicks, then by path, so reruns pick the same page", () => {
    const tiedOnImpressions = gscWith([
      { page: "/blog/cap-rate", impressions: 50, clicks: 1 },
      { page: "/blog/dscr", impressions: 50, clicks: 2 },
    ]);
    expect(pickTemplateUrls(FULL_SITEMAP, tiedOnImpressions, BASE).find((p) => p.template === "blog-post")?.path).toBe("/blog/dscr");
    const fullyTied = gscWith([
      { page: "/blog/dscr", impressions: 50, clicks: 1 },
      { page: "/blog/cap-rate", impressions: 50, clicks: 1 },
    ]);
    expect(pickTemplateUrls(FULL_SITEMAP, fullyTied, BASE).find((p) => p.template === "blog-post")?.path).toBe("/blog/cap-rate");
  });

  it("accepts full-URL gsc pages on this host and ignores other hosts", () => {
    const gsc = gscWith([
      { page: "https://usetruecap.com/blog/dscr", impressions: 10 },
      { page: "https://truecap-preview.vercel.app/blog/cap-rate", impressions: 900 },
    ]);
    expect(pickTemplateUrls(FULL_SITEMAP, gsc, BASE).find((p) => p.template === "blog-post")?.path).toBe("/blog/dscr");
  });

  it("builds every URL on the configured origin, whatever host the sitemap loc used", () => {
    const sitemap = [sm("/blog/a", "https://www.usetruecap.com")];
    const picks = pickTemplateUrls(sitemap, null, BASE);
    expect(picks.map((p) => p.url)).toEqual([`${BASE}/`, `${BASE}/blog/a`]);
  });

  it("omits families the sitemap does not have, and home is measured even if / is missing", () => {
    const picks = pickTemplateUrls([sm("/blog/a")], null, BASE);
    expect(picks.map((p) => p.template)).toEqual(["home", "blog-post"]);
  });

  it("defaults the origin to the config base", () => {
    expect(pickTemplateUrls([], null)[0].url).toBe("https://usetruecap.com/");
  });
});

describe("parsePsi", () => {
  it("reads the lab metrics and scales the performance score to 0-100", () => {
    const parsed = parsePsi(labBody(0.87));
    expect(parsed).toMatchObject({ ok: true, error: null, performanceScore: 87, lcpMs: 2413, clsLab: 0.012, tbtMs: 180 });
  });

  it("rounds scores that are not exact in binary floating point", () => {
    expect(parsePsi(labBody(0.29)).performanceScore).toBe(29);
    expect(parsePsi(labBody(0.57)).performanceScore).toBe(57);
  });

  it("reads URL-level field data, with CLS percentiles divided by 100", () => {
    const parsed = parsePsi({
      ...labBody(),
      loadingExperience: {
        id: "https://usetruecap.com/blog/dscr",
        metrics: {
          LARGEST_CONTENTFUL_PAINT_MS: { percentile: 2100, category: "FAST" },
          INTERACTION_TO_NEXT_PAINT: { percentile: 180, category: "FAST" },
          CUMULATIVE_LAYOUT_SHIFT_SCORE: { percentile: 7, category: "FAST" },
        },
        overall_category: "FAST",
      },
    });
    expect(parsed.field).toEqual({ lcpMs: 2100, inpMs: 180, cls: 0.07, category: "FAST" });
    expect(parsed.originField).toBeNull();
  });

  it("never reports origin-fallback field data as the page's own", () => {
    const parsed = parsePsi({
      ...labBody(),
      loadingExperience: { origin_fallback: true, metrics: { INTERACTION_TO_NEXT_PAINT: { percentile: 260 } }, overall_category: "AVERAGE" },
    });
    expect(parsed.ok).toBe(true);
    expect(parsed.field).toBeNull();
    expect(parsed.originField).toEqual({ lcpMs: null, inpMs: 260, cls: null, category: "AVERAGE" });
  });

  it("prefers originLoadingExperience for the origin numbers when PSI sends both", () => {
    const parsed = parsePsi({
      ...labBody(),
      loadingExperience: { origin_fallback: true, metrics: { INTERACTION_TO_NEXT_PAINT: { percentile: 260 } } },
      originLoadingExperience: { metrics: { INTERACTION_TO_NEXT_PAINT: { percentile: 240 } }, overall_category: "FAST" },
    });
    expect(parsed.originField?.inpMs).toBe(240);
  });

  it("leaves field null when CrUX has no data at all (null means not measured)", () => {
    const parsed = parsePsi({ ...labBody(), loadingExperience: { initial_url: "https://usetruecap.com/" } });
    expect(parsed.field).toBeNull();
    expect(parsed.originField).toBeNull();
  });

  it("marks a Lighthouse runtime error as ok:false and drops its lab numbers", () => {
    const body = labBody();
    const parsed = parsePsi({ ...body, lighthouseResult: { ...body.lighthouseResult, runtimeError: { code: "NO_FCP", message: "no paint" } } });
    expect(parsed).toMatchObject({ ok: false, error: "lighthouse: NO_FCP", performanceScore: null, lcpMs: null, clsLab: null, tbtMs: null });
  });

  it("treats runtimeError NO_ERROR as success", () => {
    const body = labBody();
    expect(parsePsi({ ...body, lighthouseResult: { ...body.lighthouseResult, runtimeError: { code: "NO_ERROR" } } }).ok).toBe(true);
  });

  it("returns ok:false instead of throwing on responses it cannot read", () => {
    for (const junk of [null, undefined, "text", 42, [], {}, { lighthouseResult: "x" }]) {
      const parsed = parsePsi(junk);
      expect(parsed.ok).toBe(false);
      expect(parsed.error).toBeTruthy();
    }
  });

  it("returns ok:false when the lighthouse result carries no lab metric", () => {
    expect(parsePsi({ lighthouseResult: { categories: {}, audits: {} } })).toMatchObject({ ok: false, error: "no lab metrics in lighthouseResult" });
  });

  it("ignores non-numeric and non-finite metric values", () => {
    const parsed = parsePsi({
      lighthouseResult: {
        categories: { performance: { score: 0.5 } },
        audits: { "largest-contentful-paint": { numericValue: "2400" }, "total-blocking-time": { numericValue: Number.NaN } },
      },
    });
    expect(parsed).toMatchObject({ ok: true, performanceScore: 50, lcpMs: null, tbtMs: null });
  });
});

describe("psiRequestUrl, redact and httpFailure", () => {
  it("asks for mobile + performance only and carries a key only when given one", () => {
    const keyless = new URL(psiRequestUrl(`${BASE}/blog/x`, null));
    expect(keyless.origin + keyless.pathname).toBe("https://www.googleapis.com/pagespeedonline/v5/runPagespeed");
    expect(keyless.searchParams.get("url")).toBe(`${BASE}/blog/x`);
    expect(keyless.searchParams.get("strategy")).toBe("mobile");
    expect(keyless.searchParams.getAll("category")).toEqual(["performance"]);
    expect(keyless.searchParams.has("key")).toBe(false);
    expect(new URL(psiRequestUrl(`${BASE}/`, FAKE_KEY)).searchParams.get("key")).toBe(FAKE_KEY);
  });

  it("records 429 and quota-reason 403s as exactly \"quota\"", () => {
    expect(httpFailure(429, null, null)).toBe("quota");
    expect(httpFailure(403, { error: { errors: [{ reason: "rateLimitExceeded" }] } }, null)).toBe("quota");
    expect(httpFailure(403, { error: { status: "RESOURCE_EXHAUSTED" } }, null)).toBe("quota");
  });

  it("keeps other failures distinct from quota", () => {
    expect(httpFailure(403, { error: { message: "The caller does not have permission" } }, null)).toBe("http-403: The caller does not have permission");
    expect(httpFailure(500, "not json", null)).toBe("http-500");
  });

  it("scrubs the key from stored error text and caps its length", () => {
    const error = httpFailure(400, { error: { message: `API key not valid: ${FAKE_KEY} ${"x".repeat(400)}` } }, FAKE_KEY);
    expect(error).not.toContain(FAKE_KEY);
    expect(error).toContain("[redacted]");
    expect(error.length).toBeLessThanOrEqual(200);
    expect(redact("nothing to hide", null)).toBe("nothing to hide");
  });
});

describe("measureTemplate / measureAll (stubbed fetch)", () => {
  const pick = (template: TemplatePick["template"], p: string): TemplatePick => ({ template, path: p, url: `${BASE}${p}`, pickedBy: "sitemap-order" });
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
  const noSleep = vi.fn(async () => {});

  beforeEach(() => {
    noSleep.mockClear();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it("returns the parsed measurement tagged with template and URL", async () => {
    const fetchStub = vi.fn<FetchLike>(async () => json(labBody()));
    const result = await measureTemplate(pick("blog-post", "/blog/x"), null, fetchStub, noSleep);
    expect(result).toMatchObject({ template: "blog-post", url: `${BASE}/blog/x`, ok: true, performanceScore: 87 });
    expect(new URL(fetchStub.mock.calls[0][0]).searchParams.has("key")).toBe(false);
  });

  it("records a 429 as quota without retrying and without throwing", async () => {
    const fetchStub = vi.fn<FetchLike>(async () => json({ error: { code: 429, message: "Quota exceeded" } }, 429));
    const result = await measureTemplate(pick("state", "/states/pa"), null, fetchStub, noSleep);
    expect(result).toMatchObject({ ok: false, error: "quota", performanceScore: null, field: null });
    expect(fetchStub).toHaveBeenCalledTimes(1);
  });

  it("keeps going after a quota answer: every template gets a result", async () => {
    let call = 0;
    const fetchStub = vi.fn<FetchLike>(async () => {
      call += 1;
      return call === 2 ? json({}, 429) : json(labBody());
    });
    const picks = [pick("home", "/"), pick("blog-post", "/blog/x"), pick("tool", "/tools/t")];
    const results = await measureAll(picks, null, fetchStub, noSleep);
    expect(results.map((r) => [r.template, r.ok, r.error])).toEqual([
      ["home", true, null],
      ["blog-post", false, "quota"],
      ["tool", true, null],
    ]);
  });

  it("retries a 5xx once, then succeeds", async () => {
    const fetchStub = vi.fn<FetchLike>().mockResolvedValueOnce(json({ error: { message: "Lighthouse returned error" } }, 500)).mockResolvedValueOnce(json(labBody()));
    const result = await measureTemplate(pick("vs", "/vs/x"), null, fetchStub, noSleep);
    expect(result.ok).toBe(true);
    expect(fetchStub).toHaveBeenCalledTimes(2);
    expect(noSleep).toHaveBeenCalledTimes(1);
  });

  it("gives up after the retry and records the HTTP error", async () => {
    const fetchStub = vi.fn<FetchLike>(async () => json({ error: { message: "backend error" } }, 503));
    const result = await measureTemplate(pick("vs", "/vs/x"), null, fetchStub, noSleep);
    expect(result).toMatchObject({ ok: false, error: "http-503: backend error" });
    expect(fetchStub).toHaveBeenCalledTimes(2);
  });

  it("does not retry a 4xx that is not quota", async () => {
    const fetchStub = vi.fn<FetchLike>(async () => json({ error: { message: "API key not valid" } }, 400));
    const result = await measureTemplate(pick("vs", "/vs/x"), FAKE_KEY, fetchStub, noSleep);
    expect(result.error).toBe("http-400: API key not valid");
    expect(fetchStub).toHaveBeenCalledTimes(1);
  });

  it("records network errors with the key scrubbed", async () => {
    const fetchStub = vi.fn<FetchLike>(async (url) => {
      throw new Error(`connect ETIMEDOUT for ${url}`);
    });
    const result = await measureTemplate(pick("home", "/"), FAKE_KEY, fetchStub, noSleep);
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/^network: /);
    expect(result.error).not.toContain(FAKE_KEY);
    expect(fetchStub).toHaveBeenCalledTimes(2);
  });
});

describe("main (stubbed network, temp data dir)", () => {
  const saved: Record<string, string | undefined> = {};
  const ENV = ["SEO_DATA_DIR", "SEO_STATE_DIR", "SEO_TODAY", "PSI_API_KEY"];
  let dir: string;
  const psiCalls: string[] = [];

  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?><urlset>${FULL_SITEMAP.map((e) => `<url><loc>${e.url}</loc></url>`).join("")}</urlset>`;
  const stubNetwork = (quotaFor: string | null = null) => {
    psiCalls.length = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string) => {
        const url = new URL(input);
        if (url.pathname === "/sitemap.xml") return new Response(sitemapXml, { status: 200 });
        if (url.host === "www.googleapis.com") {
          psiCalls.push(input);
          if (quotaFor && url.searchParams.get("url") === quotaFor) return new Response("{}", { status: 429 });
          return new Response(JSON.stringify(labBody(0.9)), { status: 200 });
        }
        throw new Error(`unexpected fetch ${url.host}`);
      }),
    );
  };

  beforeEach(() => {
    for (const k of ENV) saved[k] = process.env[k];
    dir = mkdtempSync(path.join(os.tmpdir(), "seo-psi-"));
    process.env.SEO_DATA_DIR = dir;
    process.env.SEO_STATE_DIR = dir;
    process.env.SEO_TODAY = "2026-09-28";
    delete process.env.PSI_API_KEY;
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    for (const k of ENV) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    rmSync(dir, { recursive: true, force: true });
  });

  it("writes psi-<date>.json keyless, records the quota template, and continues", async () => {
    writeFileSync(
      path.join(dir, "gsc-2026-09-27.json"),
      JSON.stringify(gscWith([{ page: "/blog/dscr", impressions: 274 }])),
    );
    stubNetwork(`${BASE}/states/pennsylvania`);
    expect(await main(parseArgs([]))).toBe(0);

    const artifact = JSON.parse(readFileSync(path.join(dir, "psi-2026-09-28.json"), "utf8")) as PsiArtifact;
    expect(artifact.strategy).toBe("mobile");
    expect(artifact.keyed).toBe(false);
    expect(artifact.results.map((r) => r.template)).toEqual(PSI_TEMPLATES);
    expect(artifact.results.find((r) => r.template === "blog-post")?.url).toBe(`${BASE}/blog/dscr`);
    expect(artifact.results.find((r) => r.template === "state")).toMatchObject({ ok: false, error: "quota" });
    expect(artifact.results.filter((r) => r.ok)).toHaveLength(6);
    expect(psiCalls.every((u) => !new URL(u).searchParams.has("key"))).toBe(true);
  });

  it("sends the key when set, and the key never reaches the artifact", async () => {
    process.env.PSI_API_KEY = FAKE_KEY;
    stubNetwork();
    expect(await main(parseArgs([]))).toBe(0);
    const text = readFileSync(path.join(dir, "psi-2026-09-28.json"), "utf8");
    expect(text).not.toContain(FAKE_KEY);
    expect((JSON.parse(text) as PsiArtifact).keyed).toBe(true);
    expect(psiCalls.every((u) => new URL(u).searchParams.get("key") === FAKE_KEY)).toBe(true);
  });

  it("--dry-run calls no PSI endpoint and writes nothing", async () => {
    stubNetwork();
    expect(await main(parseArgs(["--dry-run"]))).toBe(0);
    expect(psiCalls).toHaveLength(0);
    expect(existsSync(path.join(dir, "psi-2026-09-28.json"))).toBe(false);
  });
});
