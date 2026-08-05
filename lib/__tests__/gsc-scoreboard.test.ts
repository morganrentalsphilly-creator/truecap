import { describe, it, expect } from "vitest";
import { createVerify, generateKeyPairSync } from "node:crypto";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  GSC_SCOPE,
  ROUTE_FAMILIES,
  assertNoSecrets,
  base64Url,
  buildJwtSigningInput,
  diffFamilies,
  findQueriesWithoutPage,
  isCrawledNotIndexed,
  isIndexed,
  loadServiceAccount,
  previousTelemetryPath,
  routeFamily,
  signJwtAssertion,
  summariseFamilies,
  tokenize,
  topQueryMovers,
  windowForRun,
} from "@/scripts/seo/gsc-scoreboard.mjs";

/**
 * Unit tests for the pure half of scripts/seo/gsc-scoreboard.mjs.
 *
 * The network half (Search Analytics paging, URL Inspection backoff) is not
 * covered here — mocking Google's API surface well enough for the test to mean
 * anything costs more than it proves, and the failure modes that matter there
 * are ones the script is written to FAIL LOUDLY on, so they surface as a red
 * run rather than a wrong number.
 *
 * What is covered is everything that could be silently wrong: the JWT the auth
 * flow stands on, the classifier every per-family ratio is bucketed by, the
 * week-over-week diff, the query-gap heuristic the content agent consumes, and
 * the credential guard that runs before anything is committed to git.
 */

// A throwaway 2048-bit key. Generated per-run rather than checked in, because a
// PEM private key in a repo is a PEM private key in a repo even when it is a
// test fixture — someone always finds it and asks.
const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: { type: "spki", format: "pem" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
});

const SERVICE_ACCOUNT = {
  type: "service_account",
  client_email: "truecap-gsc@truecap-seo.iam.gserviceaccount.com",
  private_key: privateKey,
  token_uri: "https://oauth2.googleapis.com/token",
};

describe("base64Url", () => {
  it("is URL-safe and unpadded", () => {
    // 0xFB 0xFF encodes to "+/8=" in standard base64 — all three characters
    // that RFC 7515 forbids, in one 2-byte input.
    const encoded = base64Url(Buffer.from([0xfb, 0xff]));
    expect(encoded).toBe("-_8");
    expect(encoded).not.toMatch(/[+/=]/);
  });
});

describe("JWT assertion assembly", () => {
  it("builds the claim set Google's token endpoint expects", () => {
    const now = Date.UTC(2026, 7, 3, 12, 0, 0); // 2026-08-03T12:00:00Z
    const { header, claims, signingInput } = buildJwtSigningInput(SERVICE_ACCOUNT, { now });

    expect(header).toEqual({ alg: "RS256", typ: "JWT" });
    expect(claims.iss).toBe(SERVICE_ACCOUNT.client_email);
    expect(claims.aud).toBe("https://oauth2.googleapis.com/token");
    expect(claims.scope).toBe(GSC_SCOPE);

    // Seconds, not milliseconds. Google rejects a millisecond `iat` with an
    // opaque `invalid_grant` that says nothing about why.
    expect(claims.iat).toBe(Math.floor(now / 1000));
    expect(claims.exp).toBe(claims.iat + 3600);

    // Read-only scope: this job never needs to submit a sitemap or remove a URL.
    expect(GSC_SCOPE).toBe("https://www.googleapis.com/auth/webmasters.readonly");

    const [encodedHeader, encodedClaims, ...rest] = signingInput.split(".");
    expect(rest).toHaveLength(0);
    expect(JSON.parse(Buffer.from(encodedHeader, "base64url").toString())).toEqual(header);
    expect(JSON.parse(Buffer.from(encodedClaims, "base64url").toString())).toEqual(claims);
  });

  it("produces an RS256 signature that verifies against the public key", () => {
    const { assertion } = signJwtAssertion(SERVICE_ACCOUNT);
    const parts = assertion.split(".");
    expect(parts).toHaveLength(3);

    const verifier = createVerify("RSA-SHA256");
    verifier.update(`${parts[0]}.${parts[1]}`);
    verifier.end();
    expect(verifier.verify(publicKey, Buffer.from(parts[2], "base64url"))).toBe(true);
  });

  it("rejects a tampered payload", () => {
    const { assertion } = signJwtAssertion(SERVICE_ACCOUNT);
    const [header, , signature] = assertion.split(".");
    const forged = base64Url(
      JSON.stringify({ iss: "attacker@example.com", scope: GSC_SCOPE, iat: 1, exp: 2 }),
    );

    const verifier = createVerify("RSA-SHA256");
    verifier.update(`${header}.${forged}`);
    verifier.end();
    expect(verifier.verify(publicKey, Buffer.from(signature, "base64url"))).toBe(false);
  });
});

describe("loadServiceAccount", () => {
  it("repairs a private key whose newlines arrived escaped", () => {
    // A key pasted through a shell or an .env file arrives with literal
    // backslash-n. Left alone it fails several layers down in OpenSSL with an
    // error that names nothing useful.
    const escaped = JSON.stringify({
      ...SERVICE_ACCOUNT,
      private_key: privateKey.replace(/\n/g, "\\n"),
    });
    const loaded = loadServiceAccount(escaped);
    expect(loaded.private_key).toBe(privateKey);
    expect(loaded.private_key).toContain("\n");
  });
});

describe("routeFamily", () => {
  it("buckets each sitemap family", () => {
    expect(routeFamily("https://usetruecap.com/blog/cap-rate-explained")).toBe("/blog");
    expect(routeFamily("https://usetruecap.com/blog/topics/financing")).toBe("/blog");
    expect(routeFamily("https://usetruecap.com/markets/philadelphia")).toBe("/markets");
    expect(routeFamily("https://usetruecap.com/markets/cleveland/brrrr")).toBe("/markets");
    expect(routeFamily("https://usetruecap.com/tools/dscr-calculator")).toBe("/tools");
    expect(routeFamily("https://usetruecap.com/vs/dealcheck")).toBe("/vs");
    expect(routeFamily("https://usetruecap.com/glossary/cap-rate")).toBe("/glossary");
    expect(routeFamily("https://usetruecap.com/states/pennsylvania")).toBe("/states");
  });

  it("puts everything else in `other` rather than inventing a family", () => {
    expect(routeFamily("https://usetruecap.com/")).toBe("other");
    expect(routeFamily("https://usetruecap.com/pricing")).toBe("other");
    expect(routeFamily("https://usetruecap.com/changelog")).toBe("other");
  });

  it("is not fooled by a prefix that is not a path segment", () => {
    // `/blogroll` must not count as `/blog`, or the blog ratio silently
    // absorbs a page nobody meant to measure.
    expect(routeFamily("https://usetruecap.com/blogroll")).toBe("other");
    expect(routeFamily("https://usetruecap.com/toolsmith/x")).toBe("other");
  });

  it("ignores query strings, fragments and bare paths", () => {
    expect(routeFamily("/tools/cap-rate-calculator?utm_source=x")).toBe("/tools");
    expect(routeFamily("/glossary/dscr#definition")).toBe("/glossary");
    expect(routeFamily("tools/brrrr-calculator")).toBe("/tools");
  });
});

describe("indexing classifiers", () => {
  it("treats verdict PASS as indexed and everything else as not", () => {
    expect(isIndexed({ verdict: "PASS" })).toBe(true);
    expect(isIndexed({ verdict: "NEUTRAL" })).toBe(false);
    expect(isIndexed({ verdict: "FAIL" })).toBe(false);
    expect(isIndexed(null)).toBe(false);
  });

  it("matches 'Crawled - currently not indexed' with either dash", () => {
    expect(isCrawledNotIndexed("Crawled - currently not indexed")).toBe(true);
    expect(isCrawledNotIndexed("Crawled – currently not indexed")).toBe(true);
    expect(isCrawledNotIndexed("Discovered - currently not indexed")).toBe(false);
    expect(isCrawledNotIndexed("Submitted and indexed")).toBe(false);
    expect(isCrawledNotIndexed(null)).toBe(false);
  });
});

describe("summariseFamilies", () => {
  const inspections = [
    { family: "/blog", inspected: true, indexed: true },
    { family: "/blog", inspected: true, indexed: false },
    { family: "/blog", inspected: false, indexed: null },
    { family: "/tools", inspected: true, indexed: true },
    { family: "other", inspected: true, indexed: false },
  ];

  it("excludes uninspected URLs from the ratio denominator", () => {
    const summary = summariseFamilies(inspections);
    // 3 blog URLs, 1 uninspected → ratio is 1/2, not 1/3. Folding the
    // uninspected URL in would report a quota shortfall as a de-indexing.
    expect(summary["/blog"]).toMatchObject({
      total: 3,
      indexed: 1,
      notIndexed: 1,
      uninspected: 1,
      ratio: 0.5,
    });
    expect(summary["/tools"].ratio).toBe(1);
    expect(summary.other.ratio).toBe(0);
  });

  it("reports null — not zero — for a family with nothing inspected", () => {
    const summary = summariseFamilies([{ family: "/vs", inspected: false, indexed: null }]);
    expect(summary["/vs"].ratio).toBeNull();
    expect(summary["/glossary"].ratio).toBeNull();
    expect(Object.keys(summary).sort()).toEqual([...ROUTE_FAMILIES].sort());
  });
});

describe("diffFamilies", () => {
  it("computes week-over-week deltas", () => {
    const current = summariseFamilies([
      { family: "/blog", inspected: true, indexed: true },
      { family: "/blog", inspected: true, indexed: true },
      { family: "/blog", inspected: true, indexed: false },
      { family: "/blog", inspected: true, indexed: false },
    ]);
    const previous = summariseFamilies([
      { family: "/blog", inspected: true, indexed: true },
      { family: "/blog", inspected: true, indexed: false },
      { family: "/blog", inspected: true, indexed: false },
      { family: "/blog", inspected: true, indexed: false },
    ]);

    const diff = diffFamilies(current, previous);
    expect(diff["/blog"].ratio).toBe(0.5);
    expect(diff["/blog"].previousRatio).toBe(0.25);
    expect(diff["/blog"].ratioDelta).toBeCloseTo(0.25, 10);
    expect(diff["/blog"].indexedDelta).toBe(1);
    expect(diff["/blog"].totalDelta).toBe(0);
  });

  it("returns null rather than 0 when there is nothing to compare against", () => {
    const current = summariseFamilies([{ family: "/tools", inspected: true, indexed: true }]);
    const diff = diffFamilies(current, null);
    // A null delta prints as "—". A zero delta would print "+0.0pp" and invent
    // a flat trend out of a first run.
    expect(diff["/tools"].ratioDelta).toBeNull();
    expect(diff["/tools"].indexedDelta).toBeNull();
    expect(diff["/tools"].ratio).toBe(1);
  });
});

describe("findQueriesWithoutPage", () => {
  const sitemap = [
    "https://usetruecap.com/tools/cap-rate-calculator",
    "https://usetruecap.com/tools/dscr-calculator",
    "https://usetruecap.com/glossary/cash-on-cash-return",
    "https://usetruecap.com/markets/philadelphia",
  ];

  it("excludes a query a sitemap slug already targets", () => {
    const gaps = findQueriesWithoutPage(
      [{ query: "cap rate calculator", impressions: 120, clicks: 2, position: 18 }],
      sitemap,
    );
    expect(gaps).toHaveLength(0);
  });

  it("tolerates a stemmed / prefixed form", () => {
    // "calculate" is a prefix of "calculator"; "returns" singularises to
    // "return". Neither is an exact slug token, and both should still match.
    const gaps = findQueriesWithoutPage(
      [{ query: "how to calculate cash on cash returns", impressions: 40, clicks: 0, position: 30 }],
      sitemap,
    );
    expect(gaps).toHaveLength(0);
  });

  it("surfaces measured demand with no page behind it", () => {
    const gaps = findQueriesWithoutPage(
      [
        { query: "section 8 rental analysis spreadsheet", impressions: 90, clicks: 0, position: 44 },
        { query: "cap rate calculator", impressions: 120, clicks: 3, position: 12 },
      ],
      sitemap,
    );
    expect(gaps.map((g) => g.query)).toEqual(["section 8 rental analysis spreadsheet"]);
    // Every row carries what it came closest to, so a wrong heuristic call is
    // visible to whoever reads the report rather than silently acted on.
    expect(gaps[0]).toHaveProperty("nearestPage");
    expect(gaps[0].nearestCoverage).toBeLessThan(0.6);
  });

  it("ranks by impressions and honours the impressions floor", () => {
    const gaps = findQueriesWithoutPage(
      [
        { query: "quadplex underwriting checklist", impressions: 30, clicks: 0, position: 51 },
        { query: "wholesaling assignment fee norms", impressions: 75, clicks: 0, position: 60 },
        { query: "obscure zero volume phrasing here", impressions: 2, clicks: 0, position: 90 },
      ],
      sitemap,
    );
    expect(gaps.map((g) => g.impressions)).toEqual([75, 30]);
  });

  it("never flags a brand query as a content gap", () => {
    const gaps = findQueriesWithoutPage(
      [{ query: "truecap", impressions: 300, clicks: 40, position: 2 }],
      sitemap,
    );
    expect(gaps).toHaveLength(0);
    expect(tokenize("truecap")).toEqual([]);
  });
});

describe("topQueryMovers", () => {
  it("marks new queries and signs the deltas", () => {
    const movers = topQueryMovers(
      [
        { query: "dscr calculator", impressions: 300, position: 12 },
        { query: "brrrr calculator", impressions: 10, position: 40 },
      ],
      [
        { query: "dscr calculator", impressions: 100, position: 22 },
      ],
    );
    const dscr = movers.find((m) => m.query === "dscr calculator");
    expect(dscr?.impressionsDelta).toBe(200);
    expect(dscr?.previousPosition).toBe(22);
    expect(dscr?.isNew).toBe(false);

    const brrrr = movers.find((m) => m.query === "brrrr calculator");
    expect(brrrr?.isNew).toBe(true);
    expect(brrrr?.impressionsDelta).toBeNull();
  });

  it("surfaces a query that disappeared, not just ones that moved", () => {
    // A query that went from 500 impressions to none is the most important
    // thing a scoreboard can report, and iterating only the current rows —
    // the obvious implementation — makes it invisible.
    const movers = topQueryMovers(
      [{ query: "dscr calculator", impressions: 40, position: 30 }],
      [
        { query: "dscr calculator", impressions: 45, position: 28 },
        { query: "rental property analysis", impressions: 500, position: 9 },
      ],
    );

    const lost = movers.find((m) => m.query === "rental property analysis");
    expect(lost?.isLost).toBe(true);
    expect(lost?.impressions).toBe(0);
    expect(lost?.impressionsDelta).toBe(-500);
    expect(lost?.previousPosition).toBe(9);
    // Ranked by magnitude, so the disappearance leads rather than being
    // buried under a query that wobbled by five impressions.
    expect(movers[0].query).toBe("rental property analysis");
  });
});

describe("windowForRun", () => {
  it("ends the window behind Google's data lag and spans the requested days", () => {
    const { startDate, endDate, days } = windowForRun(Date.UTC(2026, 7, 3), { days: 28 });
    // 2026-08-03 minus the 3-day finalisation lag.
    expect(endDate).toBe("2026-07-31");
    // Inclusive 28-day window.
    expect(startDate).toBe("2026-07-04");
    expect(days).toBe(28);
  });
});

describe("previousTelemetryPath", () => {
  it("picks the newest dated file, skipping today's and latest.json", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "gsc-telemetry-"));
    for (const name of ["2026-07-20.json", "2026-07-27.json", "2026-08-03.json", "latest.json"]) {
      writeFileSync(path.join(dir, name), "{}");
    }
    // latest.json is a copy of today's file — comparing against it would
    // diff a run with itself and report every delta as zero.
    expect(previousTelemetryPath(dir, "2026-08-03.json")).toBe(path.join(dir, "2026-07-27.json"));
  });

  it("returns null on a first run", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "gsc-telemetry-empty-"));
    expect(previousTelemetryPath(dir, "2026-08-03.json")).toBeNull();
    expect(previousTelemetryPath(path.join(dir, "nope"), "2026-08-03.json")).toBeNull();
  });
});

describe("assertNoSecrets", () => {
  it("refuses output containing the private key or the access token", () => {
    expect(() => assertNoSecrets(`{"leak":${JSON.stringify(privateKey)}}`, [privateKey])).toThrow(
      /credential|private key/i,
    );
    expect(() => assertNoSecrets('{"t":"ya29.a0AfB_byExampleTokenValue"}', ["ya29.a0AfB_byExampleTokenValue"])).toThrow(
      /credential/i,
    );
  });

  it("catches a PEM block even when the exact secret was not passed in", () => {
    expect(() =>
      assertNoSecrets('{"x":"-----BEGIN PRIVATE KEY-----\\nMIIE...\\n-----END PRIVATE KEY-----"}', []),
    ).toThrow(/private key/i);
  });

  it("passes clean telemetry", () => {
    const clean = JSON.stringify({ site: "sc-domain:usetruecap.com", sitemap: { urlCount: 429 } });
    expect(assertNoSecrets(clean, [privateKey, "ya29.token"])).toBe(true);
  });
});
