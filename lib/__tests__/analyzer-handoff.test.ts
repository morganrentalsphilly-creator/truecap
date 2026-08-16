import { describe, it, expect } from "vitest";
import {
  readAnalyzerHandoff,
  buildAnalyzerHandoffUrl,
  HANDOFF_STRATEGY_KEYS,
  analyzerHandoffBootstrapScript,
  consumeEarlyAnalyzerHandoff,
  EARLY_ANALYZER_HANDOFF_KEY,
  mergeAnalyzerHandoffSearch,
} from "@/lib/analyzer-handoff";
import { INVESTOR_STRATEGIES } from "@/lib/investor-strategies";

describe("readAnalyzerHandoff", () => {
  it("returns null when no supported params are present", () => {
    expect(readAnalyzerHandoff("")).toBeNull();
    expect(readAnalyzerHandoff("?utm_source=tools&foo=bar")).toBeNull();
  });

  it("parses a full handoff", () => {
    expect(readAnalyzerHandoff("?price=300000&rent=2400&beds=3&address=123%20Main%20St")).toEqual({
      purchasePrice: 300000,
      monthlyRent: 2400,
      bedrooms: 3,
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
    expect(readAnalyzerHandoff("?price=5000&beds=99&address=abc")).toBeNull();
    expect(readAnalyzerHandoff("?price=5000&rent=1500")).toEqual({ monthlyRent: 1500 });
  });

  it("ignores non-numeric junk", () => {
    expect(readAnalyzerHandoff("?price=abc&rent=xyz")).toBeNull();
  });

  it("seeds a valid property type (persona deep link)", () => {
    expect(readAnalyzerHandoff("?type=owner-occupant")).toEqual({ propertyType: "owner-occupant" });
    expect(readAnalyzerHandoff("?type=multi-family&price=400000")).toEqual({
      propertyType: "multi-family",
      purchasePrice: 400000,
    });
    // The explicit alias also works.
    expect(readAnalyzerHandoff("?propertyType=single-family")).toEqual({ propertyType: "single-family" });
  });

  it("silently ignores an invalid property type", () => {
    expect(readAnalyzerHandoff("?type=mansion")).toBeNull();
    expect(readAnalyzerHandoff("?type=commercial&rent=1500")).toEqual({ monthlyRent: 1500 });
  });

  it("seeds a valid strategy (persona deep link)", () => {
    expect(readAnalyzerHandoff("?strategy=brrrr")).toEqual({ strategy: "brrrr" });
    expect(readAnalyzerHandoff("?strategy=house-hack&price=400000")).toEqual({
      strategy: "house-hack",
      purchasePrice: 400000,
    });
  });

  it("silently ignores an invalid strategy", () => {
    expect(readAnalyzerHandoff("?strategy=day-trading")).toBeNull();
    expect(readAnalyzerHandoff("?strategy=airbnb&rent=1500")).toEqual({ monthlyRent: 1500 });
  });

  it("keeps the local strategy-key mirror in sync with the registry", () => {
    // HANDOFF_STRATEGY_KEYS is a dependency-free mirror of the "What's your
    // play?" registry — this is the guard that keeps them from drifting.
    expect([...HANDOFF_STRATEGY_KEYS].sort()).toEqual(
      INVESTOR_STRATEGIES.map((s) => s.key).sort()
    );
  });
});

describe("buildAnalyzerHandoffUrl", () => {
  it("round-trips through readAnalyzerHandoff", () => {
    const url = buildAnalyzerHandoffUrl({ purchasePrice: 320000, monthlyRent: 2500, bedrooms: 3 });
    const search = url.slice(url.indexOf("?"));
    expect(readAnalyzerHandoff(search)).toEqual({
      purchasePrice: 320000,
      monthlyRent: 2500,
      bedrooms: 3,
    });
  });

  it("rounds money + always sets a utm_source", () => {
    const url = buildAnalyzerHandoffUrl({ purchasePrice: 299999.6, monthlyRent: 2000.4 });
    expect(url).toContain("price=300000");
    expect(url).toContain("rent=2000");
    expect(url).toContain("utm_source=tool-handoff");
  });

  it("omits empty / invalid fields", () => {
    const url = buildAnalyzerHandoffUrl({ purchasePrice: 0, monthlyRent: 1800 });
    expect(url).not.toContain("price=");
    expect(url).toContain("rent=1800");
  });

  it("carries a non-default property type but omits single-family", () => {
    expect(buildAnalyzerHandoffUrl({ propertyType: "owner-occupant" })).toContain("type=owner-occupant");
    // single-family is the analyzer default → keep links clean.
    expect(buildAnalyzerHandoffUrl({ purchasePrice: 200000, propertyType: "single-family" })).not.toContain(
      "type="
    );
  });

  it("carries a strategy and round-trips it", () => {
    const url = buildAnalyzerHandoffUrl({ strategy: "fix-flip" });
    expect(url).toContain("strategy=fix-flip");
    expect(readAnalyzerHandoff(url.slice(url.indexOf("?")))).toEqual({ strategy: "fix-flip" });
  });
});

describe("private handoff capture", () => {
  function storage(initial: string | null = null) {
    let value = initial;
    return {
      getItem: () => value,
      setItem: (_key: string, next: string) => {
        value = next;
      },
      removeItem: () => {
        value = null;
      },
      clear: () => {
        value = null;
      },
      key: () => null,
      get length() {
        return value == null ? 0 : 1;
      },
    } as Storage;
  }

  it("head bootstrap removes every private input before telemetry", () => {
    const script = analyzerHandoffBootstrapScript();
    for (const name of ["address", "price", "rent", "beds"]) {
      expect(script).toContain(name);
    }
    expect(script).toContain("window.history.replaceState");
    expect(script).toContain("if(u.pathname!=='/')return");
    expect(script).toContain(EARLY_ANALYZER_HANDOFF_KEY);
  });

  it("consumes an in-memory payload once when storage is blocked", () => {
    const target = {
      sessionStorage: storage(),
      __truecapAnalyzerHandoffSearch: "address=123+Main+St&price=250000",
    };
    expect(consumeEarlyAnalyzerHandoff(target)).toBe(
      "address=123+Main+St&price=250000"
    );
    expect(consumeEarlyAnalyzerHandoff(target)).toBe("");
  });

  it("rejects stale stored inputs and merges a fresh payload with safe params", () => {
    const now = 2_000_000;
    const stale = JSON.stringify({
      v: 1,
      search: "address=Old",
      capturedAt: now - 11 * 60 * 1000,
    });
    expect(
      consumeEarlyAnalyzerHandoff({ sessionStorage: storage(stale) }, now)
    ).toBe("");

    expect(
      mergeAnalyzerHandoffSearch(
        "address=123+Main+St&price=250000",
        "?strategy=brrrr&utm_source=batch"
      )
    ).toBe(
      "address=123+Main+St&price=250000&strategy=brrrr&utm_source=batch"
    );
  });
});
