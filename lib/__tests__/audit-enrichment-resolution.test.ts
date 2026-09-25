/**
 * 2026-09 audit — enrichPropertyAction resolution ladder and failure modes,
 * with the network stubbed. Complements the browser tests in
 * e2e/audit-analyzer-autofill.spec.ts (which use the loopback mock server).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const hudState = {
  data: {
    year: 2026,
    counties: [
      { county_name: "Franklin County", fips_code: "3904999999", smallarea_status: "1", "Three-Bedroom": 1850, "Two-Bedroom": 1350 },
      { county_name: "Cuyahoga County", fips_code: "3903599999", smallarea_status: "0", "Three-Bedroom": 1650, "Two-Bedroom": 1200 },
    ],
    metroareas: [],
  },
};
const hudSafmr = {
  data: { year: 2026, basicdata: [{ zip_code: "43215", "Three-Bedroom": "2150", "Two-Bedroom": "1600" }] },
};
const fredOk = { observations: [{ date: "2026-09-18", value: "6.42" }] };

type Handler = (url: string, init?: RequestInit) => Promise<Response> | Response;

function transport(handler: Handler) {
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    return handler(url, init);
  });
}

async function freshAction() {
  vi.resetModules();
  const mod = await import("../../app/actions/enrich-property");
  return mod.enrichPropertyAction;
}

describe("audit: enrichPropertyAction", () => {
  beforeEach(() => {
    process.env.HUD_API_KEY = "hud-test-key";
    process.env.FRED_API_KEY = "fred-test-key";
    delete process.env.HUD_API_BASE_URL;
    delete process.env.FRED_API_BASE_URL;
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("resolves ZIP-level SAFMR rent when state, county and ZIP are known", async () => {
    vi.stubGlobal(
      "fetch",
      transport((url) => {
        if (url.includes("/fred/")) return Response.json(fredOk);
        if (url.includes("/statedata/OH")) return Response.json(hudState);
        if (url.includes("/fmr/data/3904999999")) return Response.json(hudSafmr);
        return new Response("nope", { status: 404 });
      }),
    );
    const enrich = await freshAction();
    const out = await enrich({ state: "OH", county: "Franklin", zip: "43215", propertyType: "single-family", bedrooms: 3 });
    expect(out.interestRate).toBe(6.42);
    expect(out.meta.mortgageRate).toEqual({ source: "fred", asOf: "2026-09-18" });
    expect(out.monthlyRent).toBe(2150);
    expect(out.meta.rent).toMatchObject({ source: "hud-safmr", zip: "43215", county: "Franklin County", year: 2026 });
  });

  it("falls back to the county figure when the ZIP is not in the SAFMR table", async () => {
    vi.stubGlobal(
      "fetch",
      transport((url) => {
        if (url.includes("/fred/")) return Response.json(fredOk);
        if (url.includes("/statedata/OH")) return Response.json(hudState);
        if (url.includes("/fmr/data/")) return Response.json(hudSafmr);
        return new Response("nope", { status: 404 });
      }),
    );
    const enrich = await freshAction();
    const out = await enrich({ state: "OH", county: "Franklin", zip: "43999", bedrooms: 3 });
    expect(out.monthlyRent).toBe(1850);
    expect(out.meta.rent?.source).toBe("hud-fmr");
    expect(out.meta.rent?.stateAverage).toBeUndefined();
  });

  it("uses the state average, and says so, when only state + ZIP are known (typed address)", async () => {
    vi.stubGlobal(
      "fetch",
      transport((url) => {
        if (url.includes("/fred/")) return Response.json(fredOk);
        if (url.includes("/statedata/OH")) return Response.json(hudState);
        return new Response("nope", { status: 404 });
      }),
    );
    const enrich = await freshAction();
    const out = await enrich({ state: "OH", zip: "43215", bedrooms: 3 });
    expect(out.monthlyRent).toBe(1750);
    expect(out.meta.rent).toMatchObject({ source: "hud-fmr", stateAverage: true, county: "OH avg" });
  });

  it("clamps 5+ bedrooms to the four-bedroom figure and skips HUD without bedrooms", async () => {
    const fetchSpy = transport((url) => {
      if (url.includes("/fred/")) return Response.json(fredOk);
      if (url.includes("/statedata/OH")) return Response.json({ data: { year: 2026, counties: [{ county_name: "Franklin County", "Four-Bedroom": 2200 }], metroareas: [] } });
      return new Response("nope", { status: 404 });
    });
    vi.stubGlobal("fetch", fetchSpy);
    const enrich = await freshAction();
    const six = await enrich({ state: "OH", county: "Franklin", bedrooms: 6 });
    expect(six.monthlyRent).toBe(2200);
    const none = await enrich({ state: "OH", county: "Franklin" });
    expect(none.monthlyRent).toBeUndefined();
    expect(none.interestRate).toBe(6.42);
  });

  it.each([
    ["HUD 500", () => new Response("boom", { status: 500 })],
    ["HUD malformed JSON", () => new Response("{ not json", { status: 200, headers: { "content-type": "application/json" } })],
    ["HUD empty dataset", () => Response.json({ data: { year: 2026, counties: [], metroareas: [] } })],
    ["HUD network error", () => { throw new TypeError("fetch failed"); }],
  ])("%s → no rent, rate still resolves, nothing throws", async (_name, hudResponse) => {
    vi.stubGlobal(
      "fetch",
      transport((url) => {
        if (url.includes("/fred/")) return Response.json(fredOk);
        return hudResponse();
      }),
    );
    const enrich = await freshAction();
    const out = await enrich({ state: "OH", county: "Franklin", zip: "43215", bedrooms: 3 });
    expect(out.monthlyRent).toBeUndefined();
    expect(out.meta.rent).toBeUndefined();
    expect(out.interestRate).toBe(6.42);
  });

  it.each([
    ["FRED 500", () => new Response("boom", { status: 500 })],
    ["FRED malformed JSON", () => new Response("<html>", { status: 200 })],
    ["FRED missing observation", () => Response.json({ observations: [{ date: "2026-09-18", value: "." }] })],
    ["FRED network error", () => { throw new TypeError("fetch failed"); }],
  ])("%s → no rate, rent still resolves, nothing throws", async (_name, fredResponse) => {
    vi.stubGlobal(
      "fetch",
      transport((url) => {
        if (url.includes("/fred/")) return fredResponse();
        if (url.includes("/statedata/OH")) return Response.json(hudState);
        if (url.includes("/fmr/data/")) return Response.json(hudSafmr);
        return new Response("nope", { status: 404 });
      }),
    );
    const enrich = await freshAction();
    const out = await enrich({ state: "OH", county: "Franklin", zip: "43215", bedrooms: 3 });
    expect(out.interestRate).toBeUndefined();
    expect(out.meta.mortgageRate).toBeUndefined();
    expect(out.monthlyRent).toBe(2150);
  });

  it("aborts a hung provider at the 5 s timeout and returns the other benchmark", async () => {
    vi.useFakeTimers();
    try {
      vi.stubGlobal(
        "fetch",
        transport((url, init) => {
          if (url.includes("/fred/")) return Response.json(fredOk);
          // Hang until the caller's AbortSignal fires.
          return new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" })));
          });
        }),
      );
      const enrich = await freshAction();
      const pending = enrich({ state: "OH", county: "Franklin", zip: "43215", bedrooms: 3 });
      await vi.advanceTimersByTimeAsync(5_100);
      const out = await pending;
      expect(out.monthlyRent).toBeUndefined();
      expect(out.interestRate).toBe(6.42);
    } finally {
      vi.useRealTimers();
    }
  });

  it("rejects malformed input fields one at a time instead of dropping the whole lookup", async () => {
    vi.stubGlobal(
      "fetch",
      transport((url) => {
        if (url.includes("/fred/")) return Response.json(fredOk);
        if (url.includes("/statedata/OH")) return Response.json(hudState);
        return new Response("nope", { status: 404 });
      }),
    );
    const enrich = await freshAction();
    // NaN bedrooms (empty input) and a 4-digit ZIP must not kill the rate.
    const out = await enrich({ state: "oh", zip: "4321", bedrooms: Number.NaN } as never);
    expect(out.interestRate).toBe(6.42);
    expect(out.monthlyRent).toBeUndefined();
  });

  it("only honours loopback provider overrides", async () => {
    process.env.FRED_API_BASE_URL = "https://evil.example";
    process.env.HUD_API_BASE_URL = "http://127.0.0.1:3199";
    const seen: string[] = [];
    vi.stubGlobal(
      "fetch",
      transport((url) => {
        seen.push(url);
        if (url.includes("/fred/")) return Response.json(fredOk);
        return Response.json(hudState);
      }),
    );
    const enrich = await freshAction();
    await enrich({ state: "OH", bedrooms: 3 });
    expect(seen.some((u) => u.startsWith("https://api.stlouisfed.org/"))).toBe(true);
    expect(seen.some((u) => u.startsWith("https://evil.example"))).toBe(false);
    expect(seen.some((u) => u.startsWith("http://127.0.0.1:3199/hudapi/"))).toBe(true);
  });
});
