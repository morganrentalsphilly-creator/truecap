import { describe, it, expect } from "vitest";
import {
  ANALYZER_HANDOFF_SESSION_KEY,
  analyzerHandoffBootstrapScript,
  readAnalyzerHandoff,
  buildAnalyzerHandoffUrl,
  consumeAnalyzerHandoff,
  HANDOFF_STRATEGY_KEYS,
  scrubAnalyzerHandoffHref,
  stageAnalyzerHandoffHref,
} from "@/lib/analyzer-handoff";
import { INVESTOR_STRATEGIES } from "@/lib/investor-strategies";

describe("readAnalyzerHandoff", () => {
  it("returns null when no supported params are present", () => {
    expect(readAnalyzerHandoff("")).toBeNull();
    expect(readAnalyzerHandoff("?utm_source=tools&foo=bar")).toBeNull();
  });

  it("parses a full handoff", () => {
    expect(
      readAnalyzerHandoff(
        "?price=300000&rent=2400&beds=3&rate=6.75&tax=1.49&address=123%20Main%20St",
      ),
    ).toEqual({
      purchasePrice: 300000,
      monthlyRent: 2400,
      bedrooms: 3,
      interestRate: 6.75,
      propertyTaxPct: 1.49,
      address: "123 Main St",
    });
  });

  it("accepts a partial handoff (price + rent only)", () => {
    expect(readAnalyzerHandoff("?price=250000&rent=2000")).toEqual({
      purchasePrice: 250000,
      monthlyRent: 2000,
    });
  });

  it("drops out-of-range values instead of prefilling them", () => {
    // price below the $10k floor, beds above 20, address too short
    expect(
      readAnalyzerHandoff("?price=5000&beds=99&rate=31&tax=21&address=abc"),
    ).toBeNull();
    expect(readAnalyzerHandoff("?price=5000&rent=1500")).toEqual({
      monthlyRent: 1500,
    });
  });

  it("ignores non-numeric junk", () => {
    expect(readAnalyzerHandoff("?price=abc&rent=xyz")).toBeNull();
  });

  it("seeds a valid property type (persona deep link)", () => {
    expect(readAnalyzerHandoff("?type=owner-occupant")).toEqual({
      propertyType: "owner-occupant",
    });
    expect(readAnalyzerHandoff("?type=multi-family&price=400000")).toEqual({
      propertyType: "multi-family",
      purchasePrice: 400000,
    });
    // The explicit alias also works.
    expect(readAnalyzerHandoff("?propertyType=single-family")).toEqual({
      propertyType: "single-family",
    });
  });

  it("silently ignores an invalid property type", () => {
    expect(readAnalyzerHandoff("?type=mansion")).toBeNull();
    expect(readAnalyzerHandoff("?type=commercial&rent=1500")).toEqual({
      monthlyRent: 1500,
    });
  });

  it("seeds a released strategy and rejects dark specialist strategies", () => {
    expect(readAnalyzerHandoff("?strategy=brrrr")).toBeNull();
    expect(readAnalyzerHandoff("?strategy=fix-flip&rent=1500")).toEqual({
      monthlyRent: 1500,
    });
    expect(readAnalyzerHandoff("?strategy=house-hack&price=400000")).toEqual({
      strategy: "house-hack",
      purchasePrice: 400000,
    });
  });

  it("silently ignores an invalid strategy", () => {
    expect(readAnalyzerHandoff("?strategy=day-trading")).toBeNull();
    expect(readAnalyzerHandoff("?strategy=airbnb&rent=1500")).toEqual({
      monthlyRent: 1500,
    });
  });

  it("keeps the local strategy-key mirror in sync with the registry", () => {
    // HANDOFF_STRATEGY_KEYS mirrors the "What's your play?" registry — this
    // guard keeps validation from drifting even though release checks can
    // suppress a known key.
    expect([...HANDOFF_STRATEGY_KEYS].sort()).toEqual(
      INVESTOR_STRATEGIES.map((s) => s.key).sort(),
    );
  });
});

describe("buildAnalyzerHandoffUrl", () => {
  it("round-trips through readAnalyzerHandoff", () => {
    const url = buildAnalyzerHandoffUrl({
      purchasePrice: 320000,
      monthlyRent: 2500,
      bedrooms: 3,
      interestRate: 6.75,
      propertyTaxPct: 1.49,
    });
    const search = url.slice(url.indexOf("?"));
    expect(readAnalyzerHandoff(search)).toEqual({
      purchasePrice: 320000,
      monthlyRent: 2500,
      bedrooms: 3,
      interestRate: 6.75,
      propertyTaxPct: 1.49,
    });
  });

  it("rounds money + always sets a utm_source", () => {
    const url = buildAnalyzerHandoffUrl({
      purchasePrice: 299999.6,
      monthlyRent: 2000.4,
    });
    expect(url).toContain("price=300000");
    expect(url).toContain("rent=2000");
    expect(url).toContain("utm_source=tool-handoff");
  });

  it("omits empty / invalid fields", () => {
    const url = buildAnalyzerHandoffUrl({
      purchasePrice: 0,
      monthlyRent: 1800,
    });
    expect(url).not.toContain("price=");
    expect(url).toContain("rent=1800");
  });

  it("carries a non-default property type but omits single-family", () => {
    expect(
      buildAnalyzerHandoffUrl({ propertyType: "owner-occupant" }),
    ).toContain("type=owner-occupant");
    // single-family is the analyzer default → keep links clean.
    expect(
      buildAnalyzerHandoffUrl({
        purchasePrice: 200000,
        propertyType: "single-family",
      }),
    ).not.toContain("type=");
  });

  it("carries a released strategy and never emits a dark one", () => {
    const releasedUrl = buildAnalyzerHandoffUrl({ strategy: "buy-hold" });
    expect(releasedUrl).toContain("strategy=buy-hold");
    expect(
      readAnalyzerHandoff(releasedUrl.slice(releasedUrl.indexOf("?"))),
    ).toEqual({
      strategy: "buy-hold",
    });

    const darkUrl = buildAnalyzerHandoffUrl({
      purchasePrice: 200000,
      strategy: "fix-flip",
    });
    expect(darkUrl).not.toContain("strategy=");
    expect(readAnalyzerHandoff(darkUrl.slice(darkUrl.indexOf("?")))).toEqual({
      purchasePrice: 200000,
    });
  });
});

describe("private analyzer handoff transport", () => {
  function memoryStorage() {
    const values = new Map<string, string>();
    return {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    };
  }

  it("renders only safe attribution and strategy parameters", () => {
    const privateHref =
      "/?price=325000&rent=2450&beds=3&rate=6.8&tax=1.4&address=123%20Main%20St&type=multi-family&strategy=buy-hold&utm_source=tool#main";
    expect(scrubAnalyzerHandoffHref(privateHref)).toBe(
      "/?type=multi-family&strategy=buy-hold&utm_source=tool#main",
    );
  });

  it("stages exact values briefly, consumes them once, and merges safe params", () => {
    const storage = memoryStorage();
    const now = 1_000_000;
    const privateHref =
      "/?price=325000&rent=2450&address=123%20Main%20St&strategy=buy-hold&utm_source=tool";
    expect(stageAnalyzerHandoffHref(privateHref, storage, now)).toBe(true);
    expect(storage.getItem(ANALYZER_HANDOFF_SESSION_KEY)).not.toContain(
      "utm_source",
    );
    expect(
      consumeAnalyzerHandoff(
        "?strategy=buy-hold&utm_source=tool",
        storage,
        now,
      ),
    ).toEqual({
      purchasePrice: 325000,
      monthlyRent: 2450,
      address: "123 Main St",
      strategy: "buy-hold",
    });
    expect(storage.getItem(ANALYZER_HANDOFF_SESSION_KEY)).toBeNull();
    expect(consumeAnalyzerHandoff("", storage, now)).toBeNull();
  });

  it("drops an expired staged payload", () => {
    const storage = memoryStorage();
    expect(stageAnalyzerHandoffHref("/?price=325000", storage, 1_000)).toBe(
      true,
    );
    expect(consumeAnalyzerHandoff("", storage, 301_001)).toBeNull();
    expect(storage.getItem(ANALYZER_HANDOFF_SESSION_KEY)).toBeNull();
  });

  it("bootstraps old/direct URLs into storage before scrubbing location", () => {
    const storage = memoryStorage();
    let replaced = "";
    const windowLike = {
      location: {
        href: "https://usetruecap.com/?price=325000&address=123%20Main%20St&utm_source=legacy#main",
      },
      sessionStorage: storage,
      history: {
        state: { existing: true },
        replaceState: (_state: unknown, _title: string, href: string) => {
          replaced = href;
        },
      },
    };
    const execute = new Function(
      "window",
      "URL",
      "URLSearchParams",
      analyzerHandoffBootstrapScript(),
    );
    execute(windowLike, URL, URLSearchParams);
    expect(replaced).toBe("/?utm_source=legacy#main");
    expect(storage.getItem(ANALYZER_HANDOFF_SESSION_KEY)).not.toContain(
      "utm_source",
    );
    expect(consumeAnalyzerHandoff("", storage)).toMatchObject({
      purchasePrice: 325000,
      address: "123 Main St",
    });
  });
});
