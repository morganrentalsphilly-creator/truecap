import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  INDEXNOW_ENDPOINT,
  MAX_URLS_PER_BATCH,
  buildPayloads,
  discoverKey,
  keyContentMatches,
  keyLocationFor,
  main,
  normalizeUrls,
  parseUrlList,
  submitBatches,
  toBatches,
  verifyLiveKey,
  type FetchLike,
  type IndexNowPayload,
} from "../../seo/scripts/indexnow.ts";
import { parseArgs } from "../../seo/scripts/lib/cli.ts";
import { REPO_ROOT } from "../../seo/scripts/lib/paths.ts";

/**
 * seo/scripts/indexnow.ts. The properties that matter:
 *   - nothing outside the live sitemap is ever POSTed, whatever the run passes in;
 *   - the key comes from the single public/<32-hex>.txt file whose content is its
 *     name, and the LIVE copy is verified before any POST;
 *   - batches respect the 10,000-URL protocol limit, and a rejection exits 1;
 *   - Google is never contacted.
 * No network: every fetch is a stub.
 */

const BASE = "https://usetruecap.com";
const UA = "TrueCap-SEO-Loop/test";
const SITEMAP = ["/", "/blog/cap-rate", "/blog/dscr", "/markets/philadelphia", "/glossary/noi"];

describe("normalizeUrls", () => {
  it("normalizes paths and URLs to https://usetruecap.com<path>", () => {
    const n = normalizeUrls(
      ["/blog/cap-rate", "http://usetruecap.com/blog/dscr/", "https://www.usetruecap.com/markets/philadelphia?utm_source=x#faq", "https://USETRUECAP.com/glossary/noi"],
      SITEMAP,
      BASE,
    );
    expect(n.urls).toEqual([`${BASE}/blog/cap-rate`, `${BASE}/blog/dscr`, `${BASE}/markets/philadelphia`, `${BASE}/glossary/noi`]);
    expect(n.notInSitemap).toEqual([]);
    expect(n.invalid).toEqual([]);
  });

  it("maps every spelling of home to https://usetruecap.com/", () => {
    for (const home of ["/", "https://usetruecap.com", "https://usetruecap.com/", "http://www.usetruecap.com/?ref=1"]) {
      expect(normalizeUrls([home], SITEMAP, BASE).urls).toEqual([`${BASE}/`]);
    }
  });

  it("dedupes to the first occurrence and keeps input order", () => {
    const n = normalizeUrls(["/glossary/noi", "/blog/dscr", "https://usetruecap.com/glossary/noi/", "/blog/dscr?x=1", "/glossary/noi"], SITEMAP, BASE);
    expect(n.urls).toEqual([`${BASE}/glossary/noi`, `${BASE}/blog/dscr`]);
  });

  it("holds back pages that are not in the live sitemap, deduped, as paths", () => {
    const n = normalizeUrls(["/blog/dscr", "/blog/redirected-post", "https://usetruecap.com/blog/redirected-post/", "/dashboard"], SITEMAP, BASE);
    expect(n.urls).toEqual([`${BASE}/blog/dscr`]);
    expect(n.notInSitemap).toEqual(["/blog/redirected-post", "/dashboard"]);
  });

  it("rejects anything that is not a path or URL on this site", () => {
    const hostile = [
      "https://evil.example/blog/dscr",
      "https://usetruecap.com.evil.example/blog/dscr",
      "https://api.usetruecap.com/blog/dscr",
      "https://usetruecap.com:8443/blog/dscr",
      "https://user:pw@usetruecap.com/blog/dscr",
      "//usetruecap.com/blog/dscr",
      "ftp://usetruecap.com/blog/dscr",
      "javascript:alert(1)",
      "blog/dscr",
      "usetruecap.com/blog/dscr",
      "https://truecap-preview.vercel.app/blog/dscr",
    ];
    const n = normalizeUrls(hostile, SITEMAP, BASE);
    expect(n.urls).toEqual([]);
    expect(n.notInSitemap).toEqual([]);
    expect(n.invalid).toEqual(hostile);
  });

  it("ignores blank entries and surrounding whitespace", () => {
    expect(normalizeUrls(["", "   ", "  /blog/dscr  "], SITEMAP, BASE)).toEqual({ urls: [`${BASE}/blog/dscr`], notInSitemap: [], invalid: [] });
  });

  it("resolves dot segments before the sitemap check, so ../ cannot smuggle a path in", () => {
    const n = normalizeUrls(["/blog/dscr/../../dashboard"], SITEMAP, BASE);
    expect(n.urls).toEqual([]);
    expect(n.notInSitemap).toEqual(["/dashboard"]);
  });

  it("accepts any iterable of sitemap paths and defaults the base to the config", () => {
    const n = normalizeUrls(["/blog/dscr"], new Set(SITEMAP));
    expect(n.urls).toEqual(["https://usetruecap.com/blog/dscr"]);
  });

  it("only ever returns URLs on the configured origin", () => {
    const mixed = ["/", "/blog/dscr", "https://www.usetruecap.com/glossary/noi", "https://evil.example/", "/nope"];
    for (const url of normalizeUrls(mixed, SITEMAP, BASE).urls) expect(new URL(url).origin).toBe(BASE);
  });
});

describe("parseUrlList", () => {
  it("reads a JSON array of strings", () => {
    expect(parseUrlList(' ["/a", "https://usetruecap.com/b"] ')).toEqual(["/a", "https://usetruecap.com/b"]);
  });

  it("reads one entry per line, skipping blanks and # comments, CRLF included", () => {
    expect(parseUrlList("# changed this run\r\n/a\r\n\r\n  /b  \n# end\n")).toEqual(["/a", "/b"]);
  });

  it("returns [] for an empty file", () => {
    expect(parseUrlList("   \n")).toEqual([]);
  });

  it("refuses malformed JSON and non-string arrays instead of guessing", () => {
    expect(() => parseUrlList('["/a",')).toThrow(/does not parse/);
    expect(() => parseUrlList('["/a", 3]')).toThrow(/array of strings/);
    expect(() => parseUrlList('[{"path": "/a"}]')).toThrow(/array of strings/);
  });
});

describe("the key file", () => {
  let dir: string;
  const KEY = "0123456789abcdef0123456789abcdef";
  beforeEach(() => {
    dir = mkdtempSync(path.join(os.tmpdir(), "seo-indexnow-"));
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it("discovers the single <32-hex>.txt file whose content is its name", () => {
    writeFileSync(path.join(dir, `${KEY}.txt`), KEY);
    writeFileSync(path.join(dir, "robots.txt"), "User-agent: *");
    writeFileSync(path.join(dir, "llms.txt"), "# TrueCap");
    expect(discoverKey(dir)).toEqual({ key: KEY, fileName: `${KEY}.txt` });
  });

  it("tolerates exactly one trailing newline", () => {
    writeFileSync(path.join(dir, `${KEY}.txt`), `${KEY}\n`);
    expect(discoverKey(dir).key).toBe(KEY);
    expect(keyContentMatches(`${KEY}\r\n`, KEY)).toBe(true);
    expect(keyContentMatches(`${KEY}\n\n`, KEY)).toBe(false);
    expect(keyContentMatches(` ${KEY}`, KEY)).toBe(false);
  });

  it("fails when the content is not the file's name", () => {
    writeFileSync(path.join(dir, `${KEY}.txt`), "fedcba9876543210fedcba9876543210");
    expect(() => discoverKey(dir)).toThrow(/must contain exactly its own name/);
  });

  it("fails when there is no key file (uppercase hex and other lengths do not count)", () => {
    writeFileSync(path.join(dir, `${KEY.toUpperCase()}.txt`), KEY.toUpperCase());
    writeFileSync(path.join(dir, `${KEY.slice(0, 31)}.txt`), KEY.slice(0, 31));
    expect(() => discoverKey(dir)).toThrow(/no IndexNow key file/);
  });

  it("fails when there are two key files", () => {
    const other = "fedcba9876543210fedcba9876543210";
    writeFileSync(path.join(dir, `${KEY}.txt`), KEY);
    writeFileSync(path.join(dir, `${other}.txt`), other);
    expect(() => discoverKey(dir)).toThrow(/expected exactly one/);
  });

  it("the repository's public/ has exactly one valid key file", () => {
    const { key, fileName } = discoverKey(path.join(REPO_ROOT, "public"));
    expect(key).toMatch(/^[0-9a-f]{32}$/);
    expect(readFileSync(path.join(REPO_ROOT, "public", fileName), "utf8").trim()).toBe(key);
  });

  it("keyLocation is the key file on the site origin", () => {
    expect(keyLocationFor(BASE, KEY)).toBe(`${BASE}/${KEY}.txt`);
    expect(keyLocationFor(`${BASE}/`, KEY)).toBe(`${BASE}/${KEY}.txt`);
  });
});

describe("verifyLiveKey", () => {
  const KEY = "0123456789abcdef0123456789abcdef";
  const LOCATION = `${BASE}/${KEY}.txt`;

  it("passes on 200 with the key, fetching without following redirects", async () => {
    const fetchStub = vi.fn<FetchLike>(async () => new Response(KEY, { status: 200 }));
    await expect(verifyLiveKey(LOCATION, KEY, fetchStub, UA)).resolves.toBeUndefined();
    const [url, init] = fetchStub.mock.calls[0];
    expect(url).toBe(LOCATION);
    expect(init?.redirect).toBe("manual");
    expect((init?.headers as Record<string, string>)["user-agent"]).toBe(UA);
  });

  it("fails on a 404, a redirect, or a 5xx", async () => {
    for (const status of [404, 301, 308, 503]) {
      const fetchStub = vi.fn<FetchLike>(async () => new Response(status === 301 || status === 308 ? null : "nope", { status }));
      await expect(verifyLiveKey(LOCATION, KEY, fetchStub, UA)).rejects.toThrow(new RegExp(`HTTP ${status}`));
    }
  });

  it("fails when the live file serves different content", async () => {
    const fetchStub = vi.fn<FetchLike>(async () => new Response("<!doctype html><title>Not found</title>", { status: 200 }));
    await expect(verifyLiveKey(LOCATION, KEY, fetchStub, UA)).rejects.toThrow(/not the key in public/);
  });

  it("fails when the key file cannot be fetched", async () => {
    const fetchStub = vi.fn<FetchLike>(async () => {
      throw new Error("getaddrinfo ENOTFOUND");
    });
    await expect(verifyLiveKey(LOCATION, KEY, fetchStub, UA)).rejects.toThrow(/could not fetch the live key file/);
  });
});

describe("batching and payloads", () => {
  it("splits at the 10,000-URL protocol limit", () => {
    expect(MAX_URLS_PER_BATCH).toBe(10_000);
    expect(toBatches([])).toEqual([]);
    expect(toBatches([1, 2, 3], 2)).toEqual([[1, 2], [3]]);
    const sizes = toBatches(Array.from({ length: 25_001 }, (_, i) => i)).map((b) => b.length);
    expect(sizes).toEqual([10_000, 10_000, 5_001]);
    expect(() => toBatches([1], 0)).toThrow(/positive integer/);
  });

  it("builds IndexNow payloads with host, key and keyLocation, preserving every URL once", () => {
    const key = "0123456789abcdef0123456789abcdef";
    const urls = Array.from({ length: 10_001 }, (_, i) => `${BASE}/p/${i}`);
    const payloads = buildPayloads(BASE, key, urls);
    expect(payloads).toHaveLength(2);
    for (const p of payloads) {
      expect(p).toMatchObject({ host: "usetruecap.com", key, keyLocation: `${BASE}/${key}.txt` });
      expect(p.urlList.length).toBeLessThanOrEqual(MAX_URLS_PER_BATCH);
    }
    expect(payloads.flatMap((p) => p.urlList)).toEqual(urls);
  });
});

describe("submitBatches", () => {
  const payload = (n: number): IndexNowPayload => ({
    host: "usetruecap.com",
    key: "k".repeat(32),
    keyLocation: `${BASE}/${"k".repeat(32)}.txt`,
    urlList: Array.from({ length: n }, (_, i) => `${BASE}/p/${i}`),
  });

  it("POSTs JSON to api.indexnow.org and accepts 200 and 202", async () => {
    const statuses = [200, 202];
    const fetchStub = vi.fn<FetchLike>(async () => new Response("", { status: statuses.shift() }));
    const results = await submitBatches([payload(2), payload(1)], fetchStub, UA);
    expect(results.map((r) => [r.size, r.status, r.ok])).toEqual([
      [2, 200, true],
      [1, 202, true],
    ]);
    for (const [url, init] of fetchStub.mock.calls) {
      expect(url).toBe(INDEXNOW_ENDPOINT);
      expect(new URL(url).host).toBe("api.indexnow.org");
      expect(init?.method).toBe("POST");
      expect((init?.headers as Record<string, string>)["content-type"]).toMatch(/^application\/json/);
    }
    expect(JSON.parse(String(fetchStub.mock.calls[0][1]?.body))).toEqual(payload(2));
  });

  it("stops at the first rejected batch", async () => {
    const fetchStub = vi.fn<FetchLike>(async () => new Response("Key not valid", { status: 403 }));
    const results = await submitBatches([payload(1), payload(1)], fetchStub, UA);
    expect(results).toEqual([{ size: 1, status: 403, ok: false, detail: "Key not valid" }]);
    expect(fetchStub).toHaveBeenCalledTimes(1);
  });

  it("records a network failure as not ok with no status", async () => {
    const fetchStub = vi.fn<FetchLike>(async () => {
      throw new Error("socket hang up");
    });
    const [result] = await submitBatches([payload(1)], fetchStub, UA);
    expect(result).toMatchObject({ ok: false, status: null, detail: "network: socket hang up" });
  });
});

describe("main (stubbed network)", () => {
  const { key } = discoverKey(path.join(REPO_ROOT, "public"));
  let posts: IndexNowPayload[] = [];
  let calledHosts: string[] = [];
  let tmp: string;

  const sitemapXml = `<?xml version="1.0"?><urlset>${SITEMAP.map((p) => `<url><loc>${BASE}${p}</loc></url>`).join("")}</urlset>`;
  const stubNetwork = (opts: { keyStatus?: number; postStatus?: number } = {}) => {
    posts = [];
    calledHosts = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string, init?: RequestInit) => {
        const url = new URL(input);
        calledHosts.push(url.host);
        if (url.pathname === "/sitemap.xml") return new Response(sitemapXml, { status: 200 });
        if (url.pathname === `/${key}.txt`) return new Response(key, { status: opts.keyStatus ?? 200 });
        if (url.href === INDEXNOW_ENDPOINT) {
          posts.push(JSON.parse(String(init?.body)) as IndexNowPayload);
          return new Response("", { status: opts.postStatus ?? 202 });
        }
        throw new Error(`unexpected fetch ${url.href}`);
      }),
    );
  };

  beforeEach(() => {
    tmp = mkdtempSync(path.join(os.tmpdir(), "seo-indexnow-main-"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    rmSync(tmp, { recursive: true, force: true });
  });

  it("submits only sitemap URLs, and never contacts a Google host", async () => {
    stubNetwork();
    const code = await main(parseArgs(["--urls", "/blog/dscr,/not-in-sitemap,https://evil.example/x,https://www.usetruecap.com/glossary/noi/"]));
    expect(code).toBe(0);
    expect(posts).toHaveLength(1);
    expect(posts[0]).toEqual({
      host: "usetruecap.com",
      key,
      keyLocation: `${BASE}/${key}.txt`,
      urlList: [`${BASE}/blog/dscr`, `${BASE}/glossary/noi`],
    });
    expect(calledHosts.some((h) => /google/i.test(h))).toBe(false);
  });

  it("reads --from-file (JSON array or newline list)", async () => {
    const jsonFile = path.join(tmp, "changed.json");
    writeFileSync(jsonFile, JSON.stringify(["/markets/philadelphia", "/"]));
    stubNetwork();
    expect(await main(parseArgs(["--from-file", jsonFile]))).toBe(0);
    expect(posts[0].urlList).toEqual([`${BASE}/markets/philadelphia`, `${BASE}/`]);

    const listFile = path.join(tmp, "changed.txt");
    writeFileSync(listFile, "# run 42\n/blog/cap-rate\n");
    stubNetwork();
    expect(await main(parseArgs(["--from-file", listFile]))).toBe(0);
    expect(posts[0].urlList).toEqual([`${BASE}/blog/cap-rate`]);
  });

  it("--dry-run verifies the key but POSTs nothing", async () => {
    stubNetwork();
    expect(await main(parseArgs(["--urls", "/blog/dscr", "--dry-run"]))).toBe(0);
    expect(posts).toHaveLength(0);
    expect(calledHosts).toContain("usetruecap.com");
  });

  it("submits nothing and exits 0 when no input URL is in the sitemap", async () => {
    stubNetwork();
    expect(await main(parseArgs(["--urls", "/gone,/also-gone"]))).toBe(0);
    expect(posts).toHaveLength(0);
  });

  it("exits 0 without any network call on an empty list", async () => {
    stubNetwork();
    expect(await main(parseArgs(["--urls", ""]))).toBe(0);
    expect(calledHosts).toEqual([]);
  });

  it("refuses to submit when the live key file is not served", async () => {
    stubNetwork({ keyStatus: 404 });
    await expect(main(parseArgs(["--urls", "/blog/dscr"]))).rejects.toThrow(/HTTP 404/);
    expect(posts).toHaveLength(0);
  });

  it("exits 1 when IndexNow rejects the batch", async () => {
    stubNetwork({ postStatus: 403 });
    expect(await main(parseArgs(["--urls", "/blog/dscr"]))).toBe(1);
  });

  it("requires --urls or --from-file", async () => {
    stubNetwork();
    await expect(main(parseArgs([]))).rejects.toThrow(/--urls/);
  });
});

describe("source guard", () => {
  const source = readFileSync(path.join(REPO_ROOT, "seo", "scripts", "indexnow.ts"), "utf8");

  it("the header says who IndexNow reaches and that Google ignores it", () => {
    // Join the comment's lines so a phrase that wraps across " * " still matches.
    const header = source.slice(0, source.indexOf("*/")).replace(/\n\s*\*\s?/g, " ");
    expect(header).toMatch(/Bing/);
    expect(header).toMatch(/Yandex/);
    expect(header).toMatch(/GOOGLE\s+IGNORES\s+INDEXNOW/);
  });

  it("contains no Google endpoint", () => {
    expect(source).not.toMatch(/https?:\/\/[^\s"'`]*google/i);
  });
});
