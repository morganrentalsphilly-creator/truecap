/**
 * 2026-09 audit — enrichPropertyAction resolution ladder and failure modes,
 * with the network stubbed. Complements the browser tests in
 * e2e/audit-analyzer-autofill.spec.ts (which use the loopback mock server).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildAssumptionEntries } from "@/components/investcalc/assumptions-source-strip";
import { enrichmentRentSourceLabel } from "@/components/investcalc/enrichment-receipt";
import {
  buildDataConfidence,
  dataConfidenceSourceLabel,
  normalizeDataConfidence,
  type EnrichmentProvenanceInput,
} from "@/lib/data-confidence";
import { buildInputConfidence } from "@/lib/input-confidence";
import type { InvestmentFormValues } from "@/lib/investcalc-schema";
import type { EnrichPropertyResult } from "../../app/actions/enrich-property";

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

/**
 * The rent provenance the analyzer keeps for a single-family fill: the same
 * mapping as the capture in components/investcalc/investcalc-page.tsx
 * (source, county as detail, year as fetchedAt, and the statewide flag only
 * when the action set it). The source scan below pins that the page still
 * does this.
 */
function rentProvenanceFor(out: EnrichPropertyResult): EnrichmentProvenanceInput {
  const rent = out.meta.rent;
  if (!rent) return {};
  return {
    monthlyRent: {
      source: rent.source,
      detail: rent.county,
      fetchedAt: String(rent.year),
      overridden: false,
      ...(rent.stateAverage ? { stateAverage: true } : {}),
    },
  };
}

/** A complete single-family form for Input Confidence. */
function formValues(monthlyRent: number | undefined): InvestmentFormValues {
  return {
    propertyType: "single-family",
    address: "1 Test St, Columbus, OH 43215, USA",
    purchasePrice: 250_000,
    monthlyRent,
    yearBuilt: 1990,
    units: [],
    downPaymentPct: 20,
    interestRate: 6.42,
    loanTermYears: 30,
    maintenancePct: 10,
    vacancyPct: 5,
    mgmtPct: 8,
    capexPct: 5,
    buildingValuePct: 85,
    depreciationYears: 27.5,
    expenseGrowthPct: 2.5,
    rentGrowthPct: 2.5,
    insuranceInputMode: "percent",
  } as Partial<InvestmentFormValues> as InvestmentFormValues;
}

/** The four places the analyzer names the rent source (audit row P0-02). */
function rentSourceLabels(out: EnrichPropertyResult) {
  const provenance = rentProvenanceFor(out);
  const strip = buildAssumptionEntries(provenance, false)[0]!;
  const stored = normalizeDataConfidence(
    JSON.parse(JSON.stringify(buildDataConfidence(provenance, { hasRent: true, hasPrice: true }))),
  )!.fields.monthlyRent!;
  const inputConfidence = buildInputConfidence({
    values: formValues(out.monthlyRent),
    provenance,
  }).fields.find((field) => field.key === "rent")!;
  return {
    strip: strip.source,
    stripShort: strip.short,
    confidenceBadge: dataConfidenceSourceLabel(stored.source, { stateAverage: stored.stateAverage, detail: stored.detail }),
    inputConfidence: inputConfidence.sourceLabel,
    receipt: enrichmentRentSourceLabel(out.meta.rent!.source, out.meta.rent!.stateAverage),
  };
}

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
    expect(rentSourceLabels(out)).toEqual({
      strip: "HUD rent benchmark (ZIP)",
      stripShort: "HUD SAFMR",
      confidenceBadge: "HUD rent benchmark (ZIP)",
      inputConfidence: "HUD Rent Benchmark (ZIP)",
      receipt: "HUD SAFMR",
    });
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
    // A matched county keeps the area labels: only the statewide fallback changes.
    expect(rentSourceLabels(out)).toEqual({
      strip: "HUD rent benchmark (county)",
      stripShort: "HUD FMR",
      confidenceBadge: "HUD rent benchmark (county)",
      inputConfidence: "HUD Rent Benchmark (county)",
      receipt: "HUD FMR",
    });
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
    // The number is the unweighted mean of the state's HUD rows (1850 and
    // 1650), which is what the word "average" in the label refers to.
    expect(out.monthlyRent).toBe(1750);
    expect(out.meta.rent).toMatchObject({ source: "hud-fmr", stateAverage: true, county: "OH avg" });

    // Audit row P0-02: the same result used to read "HUD rent benchmark
    // (county)" on the strip and both confidence labels and "HUD FMR" on the
    // receipt. All four now say statewide, and none says county, ZIP or FMR.
    const labels = rentSourceLabels(out);
    expect(labels).toEqual({
      strip: "HUD rent benchmark (statewide average)",
      stripShort: "HUD statewide",
      confidenceBadge: "HUD rent benchmark (statewide average)",
      inputConfidence: "HUD Rent Benchmark (statewide average)",
      receipt: "HUD statewide average",
    });
    for (const label of Object.values(labels)) {
      expect(label).not.toMatch(/county|ZIP|FMR/);
    }

    // The same result saved before the flag existed: no stateAverage, but the
    // stored detail is the fallback's "OH avg". The two labels a reopened
    // deal shows read the detail, so they say statewide too.
    const legacyRent = { source: "hud-fmr" as const, detail: "OH avg", fetchedAt: "2026", overridden: false };
    const legacyStored = normalizeDataConfidence(
      JSON.parse(JSON.stringify(buildDataConfidence({ monthlyRent: legacyRent }, { hasRent: true, hasPrice: true }))),
    )!.fields.monthlyRent!;
    expect(legacyStored).not.toHaveProperty("stateAverage");
    expect(
      dataConfidenceSourceLabel(legacyStored.source, { stateAverage: legacyStored.stateAverage, detail: legacyStored.detail }),
    ).toBe("HUD rent benchmark (statewide average)");
    expect(
      buildInputConfidence({
        values: formValues(1750),
        provenance: { monthlyRent: legacyRent },
      }).fields.find((field) => field.key === "rent")!.sourceLabel,
    ).toBe("HUD Rent Benchmark (statewide average)");
  });

  it("uses the same statewide figure and label when the matched county has no value for the bedroom count", async () => {
    vi.stubGlobal(
      "fetch",
      transport((url) => {
        if (url.includes("/fred/")) return Response.json(fredOk);
        if (url.includes("/statedata/OH"))
          return Response.json({
            data: {
              year: 2026,
              counties: [
                { county_name: "Franklin County", fips_code: "3904999999", smallarea_status: "0", "Two-Bedroom": 1350 },
                { county_name: "Cuyahoga County", fips_code: "3903599999", smallarea_status: "0", "Three-Bedroom": 1650, "Two-Bedroom": 1200 },
              ],
              metroareas: [{ name: "Columbus, OH HUD Metro FMR Area", code: "METRO18140M18140", "Three-Bedroom": 1950 }],
            },
          });
        return new Response("nope", { status: 404 });
      }),
    );
    const enrich = await freshAction();
    const out = await enrich({ state: "OH", county: "Franklin", zip: "43215", bedrooms: 3 });
    // Mean of the two rows that carry a three-bedroom figure (1650 and 1950).
    expect(out.monthlyRent).toBe(1800);
    expect(out.meta.rent).toMatchObject({ source: "hud-fmr", stateAverage: true, county: "OH avg" });
    expect(rentSourceLabels(out).strip).toBe("HUD rent benchmark (statewide average)");
  });

  const read = (file: string) => readFileSync(join(process.cwd(), file), "utf8").replace(/\s+/g, " ");

  it("the analyzer carries the statewide flag from the lookup to every label", () => {
    const analyzer = read("components/investcalc/investcalc-page.tsx");
    // Single-family capture, straight from the action's meta.
    expect(analyzer).toContain("...(enrichment.meta.rent?.stateAverage ? { stateAverage: true } : {}),");
    // Multi-family per-unit capture.
    expect(analyzer).toContain("if (result.meta.rent?.stateAverage === true) { filledRentStateAverage = true; }");
    // Capture to provenance payload (strip, confidence labels, drafts, save).
    expect(analyzer).toContain("...(capture.monthlyRent.stateAverage ? { stateAverage: true } : {}),");
    // The badge passes the stored flag to the label.
    const badge = read("components/investcalc/data-confidence-badge.tsx");
    expect(badge).toContain("dataConfidenceSourceLabel(p.source, { stateAverage: p.stateAverage, detail: p.detail, })");
  });

  it("the save action keeps the statewide flag in the stored provenance", () => {
    // The save action validates provenance with a zod object, which strips
    // any key it does not declare. Without this line a saved deal loses the
    // flag and reopens as "HUD rent benchmark (county)".
    const save = read("app/actions/saved-analyses.ts");
    expect(save).toMatch(/const provenanceFieldSchema = z\.object\(\{[^}]*stateAverage: z\.boolean\(\)\.optional\(\),[^}]*\}\);/);
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
