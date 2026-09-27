import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  linkCountTotalPages,
  main,
  parseBingDate,
  parseLinkCounts,
  parsePageStats,
  parseQueryStats,
  pullBing,
  redact,
  sitePathOf,
  type BingPull,
  type FetchLike,
} from "../../seo/scripts/bing-pull.ts";
import { parseArgs } from "../../seo/scripts/lib/cli.ts";

/**
 * seo/scripts/bing-pull.ts. seo-prune reads `linkCounts` as KNOWN BACKLINKS,
 * so the tests pin three things:
 *   - the parser counts only this site's URLs and folds URL variants together;
 *   - the pull is all or nothing (a failed or truncated link map writes no file,
 *     rather than a file that reads as "no backlinks");
 *   - without BING_WEBMASTER_API_KEY the script is dormant: exit 0, nothing written.
 * No network: every fetch is a stub.
 */

const BASE = "https://usetruecap.com";
const FAKE_KEY = "0f1e2d3c4b5a69788796a5b4c3d2e1f0"; // 32 hex, the shape of a Bing Webmaster key
const OPTIONS = { base: BASE, userAgent: "TrueCap-SEO-Loop/test", maxLinkPages: 50 };

const queryStats = {
  d: [
    { __type: "QueryStats:#Microsoft.Bing.Webmaster.Api", Query: "dscr calculator", Clicks: 2, Impressions: 40, AvgClickPosition: 7, AvgImpressionPosition: 11, Date: "/Date(1758524400000-0700)/" },
    { __type: "QueryStats:#Microsoft.Bing.Webmaster.Api", Query: "truecap", Clicks: 0, Impressions: 3, AvgClickPosition: -1, AvgImpressionPosition: 1, Date: "/Date(1758524400000-0700)/" },
  ],
};
const pageStats = {
  d: [
    { Query: "https://usetruecap.com/blog/dscr", Clicks: 1, Impressions: 30, AvgClickPosition: 6, AvgImpressionPosition: 9, Date: "/Date(1758524400000-0700)/" },
    { Query: "https://www.usetruecap.com/", Clicks: 0, Impressions: 12, AvgClickPosition: -1, AvgImpressionPosition: 3, Date: "/Date(1758524400000-0700)/" },
    { Query: "https://someone-else.example/page", Clicks: 9, Impressions: 99 },
  ],
};
const linkPage = (links: Array<{ Url: string; Count: number }>, totalPages: number) => ({
  d: { __type: "LinkCounts:#Microsoft.Bing.Webmaster.Api", Links: links.map((l) => ({ __type: "LinkCount:#Microsoft.Bing.Webmaster.Api", ...l })), TotalPages: totalPages },
});

/** The error a promise rejects with; fails the test if it resolves. */
async function rejectionOf(promise: Promise<unknown>): Promise<Error> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof Error) return error;
    throw new Error(`rejected with a non-Error: ${String(error)}`);
  }
  throw new Error("expected the promise to reject, but it resolved");
}

type Route = { status?: number; body: unknown };
/** Routes Bing API methods (and GetLinkCounts pages) to canned answers; records every call. */
function bingStub(routes: Record<string, Route | ((page: number) => Route)>) {
  const calls: URL[] = [];
  const fetchImpl = vi.fn<FetchLike>(async (input) => {
    const url = new URL(input);
    calls.push(url);
    const method = url.pathname.split("/").pop() ?? "";
    const route = routes[method];
    if (!route) throw new Error(`unexpected Bing method ${method}`);
    const answer = typeof route === "function" ? route(Number(url.searchParams.get("page") ?? "0")) : route;
    return new Response(typeof answer.body === "string" ? answer.body : JSON.stringify(answer.body), { status: answer.status ?? 200 });
  });
  return { fetchImpl, calls };
}

describe("parseBingDate", () => {
  it("reads WCF /Date(ms±hhmm)/ values on the calendar day Bing meant", () => {
    expect(parseBingDate("/Date(1316156400000-0700)/")).toBe("2011-09-16"); // 07:00Z = local midnight at -0700
    expect(parseBingDate("/Date(1316102400000+0800)/")).toBe("2011-09-16"); // 16:00Z the day before = local midnight at +0800
    expect(parseBingDate("/Date(1316131200000)/")).toBe("2011-09-16");
    expect(parseBingDate("/Date(1316131200000+0530)/")).toBe("2011-09-16");
  });

  it("passes ISO dates through and returns null for anything else", () => {
    expect(parseBingDate("2026-09-21T00:00:00")).toBe("2026-09-21");
    for (const junk of ["", "yesterday", "/Date(abc)/", null, undefined, 1316131200000]) expect(parseBingDate(junk)).toBeNull();
  });
});

describe("sitePathOf", () => {
  it("folds apex/www and http/https to one path, dropping query, hash and trailing slash", () => {
    for (const url of ["https://usetruecap.com/blog/dscr", "http://usetruecap.com/blog/dscr/", "https://www.usetruecap.com/blog/dscr?x=1#y"]) {
      expect(sitePathOf(url, BASE)).toBe("/blog/dscr");
    }
    expect(sitePathOf("https://usetruecap.com", BASE)).toBe("/");
  });

  it("returns null for other hosts, other schemes and non-URLs", () => {
    for (const url of ["https://usetruecap.com.evil.example/x", "https://blog.usetruecap.com/x", "ftp://usetruecap.com/x", "/blog/dscr", "", 42, null]) {
      expect(sitePathOf(url, BASE)).toBeNull();
    }
  });
});

describe("parseLinkCounts", () => {
  it("maps each page on this site to its inbound link count", () => {
    const counts = parseLinkCounts(linkPage([{ Url: "https://usetruecap.com/blog/dscr", Count: 4 }, { Url: "https://usetruecap.com/", Count: 11 }], 1), BASE);
    expect(counts).toEqual({ "/": 11, "/blog/dscr": 4 });
  });

  it("sums URL variants of the same page across every response page", () => {
    const counts = parseLinkCounts(
      [
        linkPage([{ Url: "https://usetruecap.com/blog/dscr", Count: 4 }, { Url: "http://www.usetruecap.com/blog/dscr/", Count: 1 }], 2),
        linkPage([{ Url: "https://usetruecap.com/blog/dscr?ref=x", Count: 2 }, { Url: "https://usetruecap.com/markets/philadelphia", Count: 1 }], 2),
      ],
      BASE,
    );
    expect(counts).toEqual({ "/blog/dscr": 7, "/markets/philadelphia": 1 });
  });

  it("drops other hosts, zero or negative counts, and malformed rows", () => {
    const counts = parseLinkCounts(
      linkPage(
        [
          { Url: "https://other.example/", Count: 50 },
          { Url: "https://usetruecap.com/zero", Count: 0 },
          { Url: "https://usetruecap.com/negative", Count: -3 },
          { Url: "not a url", Count: 5 },
        ],
        1,
      ),
      BASE,
    );
    expect(counts).toEqual({});
    const withJunk = { d: { Links: [null, "x", { Url: "https://usetruecap.com/ok", Count: "3" }, { Url: "https://usetruecap.com/ok", Count: 3 }] } };
    expect(parseLinkCounts(withJunk, BASE)).toEqual({ "/ok": 3 });
  });

  it("accepts the unwrapped shape and a bare array of links", () => {
    expect(parseLinkCounts({ Links: [{ Url: `${BASE}/a`, Count: 1 }] }, BASE)).toEqual({ "/a": 1 });
    expect(parseLinkCounts({ d: [{ Url: `${BASE}/b`, Count: 2 }] }, BASE)).toEqual({ "/b": 2 });
  });

  it("returns an empty map for responses it cannot read, and sorts keys for stable diffs", () => {
    for (const junk of [null, "text", 5, {}, { d: null }]) expect(parseLinkCounts(junk, BASE)).toEqual({});
    const counts = parseLinkCounts(linkPage([{ Url: `${BASE}/z`, Count: 1 }, { Url: `${BASE}/a`, Count: 1 }, { Url: `${BASE}/m`, Count: 1 }], 1), BASE);
    expect(Object.keys(counts)).toEqual(["/a", "/m", "/z"]);
  });

  it("defaults the site to the config base", () => {
    expect(parseLinkCounts(linkPage([{ Url: "https://usetruecap.com/x", Count: 2 }], 1))).toEqual({ "/x": 2 });
  });

  it("linkCountTotalPages reads TotalPages or says it does not know", () => {
    expect(linkCountTotalPages(linkPage([], 3))).toBe(3);
    expect(linkCountTotalPages({ TotalPages: 0 })).toBe(0);
    expect(linkCountTotalPages({ d: { Links: [] } })).toBeNull();
    expect(linkCountTotalPages({ d: { TotalPages: 1.5 } })).toBeNull();
  });
});

describe("parseQueryStats / parsePageStats", () => {
  it("normalizes query rows; -1 positions become null", () => {
    expect(parseQueryStats(queryStats)).toEqual([
      { query: "dscr calculator", date: "2025-09-22", clicks: 2, impressions: 40, avgClickPosition: 7, avgImpressionPosition: 11 },
      { query: "truecap", date: "2025-09-22", clicks: 0, impressions: 3, avgClickPosition: null, avgImpressionPosition: 1 },
    ]);
  });

  it("drops rows without a query and survives junk", () => {
    expect(parseQueryStats({ d: [{ Clicks: 1 }, { Query: "  " }, null] })).toEqual([]);
    expect(parseQueryStats("junk")).toEqual([]);
  });

  it("keeps page rows on this site as paths and counts the rest as foreign", () => {
    const { rows, foreign } = parsePageStats(pageStats, BASE);
    expect(rows.map((r) => [r.path, r.clicks, r.impressions])).toEqual([
      ["/blog/dscr", 1, 30],
      ["/", 0, 12],
    ]);
    expect(foreign).toBe(1);
  });
});

describe("pullBing (stubbed fetch)", () => {
  beforeEach(() => vi.spyOn(console, "error").mockImplementation(() => {}));
  afterEach(() => vi.restoreAllMocks());

  it("calls the three methods with siteUrl and apikey, paging GetLinkCounts from 0", async () => {
    const { fetchImpl, calls } = bingStub({
      GetQueryStats: { body: queryStats },
      GetPageStats: { body: pageStats },
      GetLinkCounts: (page) => ({ body: linkPage(page === 0 ? [{ Url: `${BASE}/blog/dscr`, Count: 2 }] : [{ Url: `${BASE}/`, Count: 5 }], 2) }),
    });
    const pull = await pullBing(FAKE_KEY, fetchImpl, OPTIONS);

    expect(calls.map((u) => `${u.pathname.split("/").pop()}${u.searchParams.has("page") ? `#${u.searchParams.get("page")}` : ""}`)).toEqual([
      "GetQueryStats",
      "GetPageStats",
      "GetLinkCounts#0",
      "GetLinkCounts#1",
    ]);
    for (const url of calls) {
      expect(url.origin + url.pathname).toMatch(/^https:\/\/ssl\.bing\.com\/webmaster\/api\.svc\/json\/Get/);
      expect(url.searchParams.get("siteUrl")).toBe("https://usetruecap.com/");
      expect(url.searchParams.get("apikey")).toBe(FAKE_KEY);
    }
    expect(Object.keys(pull)).toEqual(["generatedAt", "queries", "pages", "linkCounts"]);
    expect(pull.queries).toHaveLength(2);
    expect(pull.pages).toHaveLength(2);
    expect(pull.linkCounts).toEqual({ "/": 5, "/blog/dscr": 2 });
    expect(JSON.stringify(pull)).not.toContain(FAKE_KEY);
  });

  it("stops paging when a page comes back empty", async () => {
    const { fetchImpl, calls } = bingStub({
      GetQueryStats: { body: { d: [] } },
      GetPageStats: { body: { d: [] } },
      GetLinkCounts: () => ({ body: linkPage([], 5) }),
    });
    const pull = await pullBing(FAKE_KEY, fetchImpl, OPTIONS);
    expect(calls.filter((u) => u.pathname.endsWith("GetLinkCounts"))).toHaveLength(1);
    expect(pull.linkCounts).toEqual({});
  });

  it("keeps paging when a response omits TotalPages, until a page comes back empty", async () => {
    const { fetchImpl, calls } = bingStub({
      GetQueryStats: { body: { d: [] } },
      GetPageStats: { body: { d: [] } },
      GetLinkCounts: (page) => ({ body: { d: { Links: page < 2 ? [{ Url: `${BASE}/p${page}`, Count: 1 }] : [] } } }),
    });
    const pull = await pullBing(FAKE_KEY, fetchImpl, OPTIONS);
    expect(calls.filter((u) => u.pathname.endsWith("GetLinkCounts")).map((u) => u.searchParams.get("page"))).toEqual(["0", "1", "2"]);
    expect(pull.linkCounts).toEqual({ "/p0": 1, "/p1": 1 });
  });

  it("pages the bare-array shape (which carries no TotalPages) the same way", async () => {
    const { fetchImpl, calls } = bingStub({
      GetQueryStats: { body: { d: [] } },
      GetPageStats: { body: { d: [] } },
      GetLinkCounts: (page) => ({ body: { d: page < 2 ? [{ Url: `${BASE}/p${page}`, Count: 2 }] : [] } }),
    });
    const pull = await pullBing(FAKE_KEY, fetchImpl, OPTIONS);
    expect(calls.filter((u) => u.pathname.endsWith("GetLinkCounts"))).toHaveLength(3);
    expect(pull.linkCounts).toEqual({ "/p0": 2, "/p1": 2 });
  });

  it("refuses to write when TotalPages is missing and the pages outrun --max-link-pages", async () => {
    const { fetchImpl, calls } = bingStub({
      GetQueryStats: { body: { d: [] } },
      GetPageStats: { body: { d: [] } },
      GetLinkCounts: (page) => ({ body: { d: { Links: [{ Url: `${BASE}/p${page}`, Count: 1 }] } } }),
    });
    await expect(pullBing(FAKE_KEY, fetchImpl, { ...OPTIONS, maxLinkPages: 3 })).rejects.toThrow(/did not report TotalPages.*refusing to write a partial backlink map/);
    expect(calls.filter((u) => u.pathname.endsWith("GetLinkCounts")).map((u) => u.searchParams.get("page"))).toEqual(["0", "1", "2"]);
  });

  it("refuses a link map longer than --max-link-pages rather than writing a partial one", async () => {
    const { fetchImpl } = bingStub({
      GetQueryStats: { body: { d: [] } },
      GetPageStats: { body: { d: [] } },
      GetLinkCounts: () => ({ body: linkPage([{ Url: `${BASE}/a`, Count: 1 }], 80) }),
    });
    await expect(pullBing(FAKE_KEY, fetchImpl, { ...OPTIONS, maxLinkPages: 50 })).rejects.toThrow(/refusing to write a partial backlink map/);
  });

  it("fails the whole pull when GetLinkCounts fails, even though the stats succeeded", async () => {
    const { fetchImpl } = bingStub({
      GetQueryStats: { body: queryStats },
      GetPageStats: { body: pageStats },
      GetLinkCounts: { status: 500, body: "Internal Server Error" },
    });
    await expect(pullBing(FAKE_KEY, fetchImpl, OPTIONS)).rejects.toThrow(/GetLinkCounts failed: HTTP 500/);
  });

  it("surfaces Bing's error code and scrubs the key from the message", async () => {
    const { fetchImpl } = bingStub({
      GetQueryStats: { status: 400, body: { ErrorCode: 3, Message: `ERROR!!! InvalidApiKey ${FAKE_KEY}` } },
    });
    const error = await rejectionOf(pullBing(FAKE_KEY, fetchImpl, OPTIONS));
    expect(error.message).toMatch(/GetQueryStats failed: HTTP 400: ErrorCode 3: ERROR!!! InvalidApiKey/);
    expect(error.message).not.toContain(FAKE_KEY);
  });

  it("scrubs the key from network errors too", async () => {
    const fetchImpl = vi.fn<FetchLike>(async (input) => {
      throw new Error(`request to ${input} failed`);
    });
    const error = await rejectionOf(pullBing(FAKE_KEY, fetchImpl, OPTIONS));
    expect(error.message).toMatch(/^GetQueryStats failed: request to/);
    expect(error.message).not.toContain(FAKE_KEY);
    expect(redact(`a${FAKE_KEY}b${FAKE_KEY}`, FAKE_KEY)).toBe("a[redacted]b[redacted]");
  });

  it("fails on a 200 whose body is not JSON", async () => {
    const { fetchImpl } = bingStub({ GetQueryStats: { body: "<html>maintenance</html>" } });
    await expect(pullBing(FAKE_KEY, fetchImpl, OPTIONS)).rejects.toThrow(/not JSON/);
  });
});

describe("main", () => {
  const ENV = ["SEO_DATA_DIR", "SEO_STATE_DIR", "SEO_TODAY", "BING_WEBMASTER_API_KEY"];
  const saved: Record<string, string | undefined> = {};
  let dir: string;
  let stderr: string[];

  const stubBing = (overrides: Record<string, Route> = {}) => {
    const { fetchImpl } = bingStub({
      GetQueryStats: { body: queryStats },
      GetPageStats: { body: pageStats },
      GetLinkCounts: { body: linkPage([{ Url: `${BASE}/blog/dscr`, Count: 3 }], 1) },
      ...overrides,
    });
    vi.stubGlobal("fetch", fetchImpl);
    return fetchImpl;
  };

  beforeEach(() => {
    for (const k of ENV) saved[k] = process.env[k];
    dir = mkdtempSync(path.join(os.tmpdir(), "seo-bing-"));
    process.env.SEO_DATA_DIR = path.join(dir, "data");
    process.env.SEO_STATE_DIR = dir;
    process.env.SEO_TODAY = "2026-09-28";
    delete process.env.BING_WEBMASTER_API_KEY;
    stderr = [];
    vi.spyOn(console, "error").mockImplementation((...parts: unknown[]) => {
      stderr.push(parts.map(String).join(" "));
    });
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

  it("is dormant without BING_WEBMASTER_API_KEY: exit 0, the dormant line, no fetch, no file", async () => {
    const fetchImpl = stubBing();
    expect(await main(parseArgs([]))).toBe(0);
    expect(stderr).toContain("dormant: needs BING_WEBMASTER_API_KEY");
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(existsSync(path.join(dir, "data"))).toBe(false);
  });

  it("treats a blank key as missing", async () => {
    process.env.BING_WEBMASTER_API_KEY = "   ";
    stubBing();
    expect(await main(parseArgs([]))).toBe(0);
    expect(stderr).toContain("dormant: needs BING_WEBMASTER_API_KEY");
  });

  it("writes seo/data/bing-<date>.json with exactly {generatedAt, queries, pages, linkCounts}", async () => {
    process.env.BING_WEBMASTER_API_KEY = FAKE_KEY;
    stubBing();
    expect(await main(parseArgs([]))).toBe(0);
    const text = readFileSync(path.join(dir, "data", "bing-2026-09-28.json"), "utf8");
    const pull = JSON.parse(text) as BingPull;
    expect(Object.keys(pull)).toEqual(["generatedAt", "queries", "pages", "linkCounts"]);
    expect(pull.linkCounts).toEqual({ "/blog/dscr": 3 });
    expect(text).not.toContain(FAKE_KEY);
    expect(stderr.join("\n")).not.toContain(FAKE_KEY);
  });

  it("writes nothing when any call fails", async () => {
    process.env.BING_WEBMASTER_API_KEY = FAKE_KEY;
    stubBing({ GetLinkCounts: { status: 503, body: "busy" } });
    await expect(main(parseArgs([]))).rejects.toThrow(/GetLinkCounts failed/);
    expect(existsSync(path.join(dir, "data")) ? readdirSync(path.join(dir, "data")) : []).toEqual([]);
  });

  it("registers the key, so a response that echoes it can never be written", async () => {
    process.env.BING_WEBMASTER_API_KEY = FAKE_KEY;
    stubBing({ GetQueryStats: { body: { d: [{ Query: `leak ${FAKE_KEY}`, Clicks: 0, Impressions: 1 }] } } });
    await expect(main(parseArgs([]))).rejects.toThrow(/registered credential/);
    expect(existsSync(path.join(dir, "data", "bing-2026-09-28.json"))).toBe(false);
  });

  it("rejects a non-positive --max-link-pages", async () => {
    process.env.BING_WEBMASTER_API_KEY = FAKE_KEY;
    stubBing();
    await expect(main(parseArgs(["--max-link-pages", "0"]))).rejects.toThrow(/positive integer/);
  });
});
