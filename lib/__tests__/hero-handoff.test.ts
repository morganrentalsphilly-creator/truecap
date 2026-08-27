import { describe, expect, it, vi } from "vitest";
import {
  dispatchHeroAnalyzeWithFallback,
  getListingImportMissingFields,
  HERO_ANALYZE_STORAGE_KEY,
  type HeroAnalyzeDetail,
} from "@/lib/hero-handoff";

const detail: HeroAnalyzeDetail = {
  token: "sample-token",
  address: "1700 W Erie Ave, Philadelphia, PA 19140",
  state: "PA",
  sample: true,
};

describe("hero analysis handoff", () => {
  it("keeps delayed live delivery available when sessionStorage throws", () => {
    const dispatch = vi.fn();
    const scheduled = new Map<number, () => void>();
    const storage = {
      getItem: vi.fn(() => {
        throw new Error("Storage is blocked");
      }),
      setItem: vi.fn(() => {
        throw new Error("Storage is blocked");
      }),
    };

    dispatchHeroAnalyzeWithFallback(detail, {
      storage,
      dispatch,
      schedule: (callback, delayMs) => scheduled.set(delayMs, callback),
    });

    expect(storage.setItem).toHaveBeenCalledWith(
      HERO_ANALYZE_STORAGE_KEY,
      JSON.stringify(detail)
    );
    expect(dispatch).toHaveBeenCalledTimes(1);

    scheduled.get(250)?.();
    expect(dispatch).toHaveBeenCalledTimes(2);

    scheduled.get(1_000)?.();
    expect(dispatch).toHaveBeenCalledTimes(3);
    expect(dispatch).toHaveBeenLastCalledWith(detail);
  });

  it("stops replaying after the stored handoff has been consumed", () => {
    const dispatch = vi.fn();
    const scheduled = new Map<number, () => void>();
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    };

    dispatchHeroAnalyzeWithFallback(detail, {
      storage,
      dispatch,
      schedule: (callback, delayMs) => scheduled.set(delayMs, callback),
    });

    values.delete(HERO_ANALYZE_STORAGE_KEY);
    scheduled.get(250)?.();
    scheduled.get(1_000)?.();

    expect(dispatch).toHaveBeenCalledTimes(1);
  });
});

describe("listing import completion", () => {
  it("names the minimum next inputs without implying bedrooms and rent are both required", () => {
    expect(
      getListingImportMissingFields({
        propertyType: "single-family",
      }),
    ).toEqual([
      { path: "purchasePrice", label: "asking price" },
      {
        path: "bedrooms",
        label: "bedrooms to estimate area rent, or monthly rent",
      },
    ]);

    expect(
      getListingImportMissingFields({
        propertyType: "single-family",
        purchasePrice: 325_000,
        bedrooms: 3,
      }),
    ).toEqual([{ path: "monthlyRent", label: "monthly rent" }]);
  });

  it("clears once the required single-family inputs are usable", () => {
    expect(
      getListingImportMissingFields({
        propertyType: "single-family",
        purchasePrice: 325_000,
        monthlyRent: 2_600,
      }),
    ).toEqual([]);
  });

  it("identifies the exact rentable unit that remains for a house hack", () => {
    expect(
      getListingImportMissingFields({
        propertyType: "owner-occupant",
        purchasePrice: 450_000,
        units: [
          { isOwnerOccupied: true },
          { monthlyRent: 1_650 },
          { monthlyRent: undefined },
        ],
      }),
    ).toEqual([
      { path: "units.2.monthlyRent", label: "monthly rent for unit 3" },
    ]);
  });
});
