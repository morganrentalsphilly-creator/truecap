import { describe, expect, it } from "vitest";
import {
  hasEditedStartingValue,
  matchesFixtureValues,
} from "@/lib/analyzer-pristine";

const starting = {
  address: "",
  purchasePrice: undefined,
  bedrooms: undefined,
  interestRate: 7.28,
  downPaymentPct: 20,
  units: [{ bedrooms: undefined, monthlyRent: undefined, isOwnerOccupied: false }],
};

describe("hasEditedStartingValue (audit A9, C5)", () => {
  it("is false for an untouched form", () => {
    expect(hasEditedStartingValue({}, starting, starting)).toBe(false);
  });

  it("ignores a dirty flag on a number field that only went from empty to NaN", () => {
    // Blurring an empty valueAsNumber input: RHF marks it dirty with NaN.
    expect(
      hasEditedStartingValue(
        { bedrooms: true, purchasePrice: true },
        { ...starting, bedrooms: Number.NaN, purchasePrice: null },
        starting,
      ),
    ).toBe(false);
  });

  it("ignores a dirty flag on a field typed back to its starting value", () => {
    expect(
      hasEditedStartingValue({ interestRate: true }, starting, starting),
    ).toBe(false);
  });

  it("is true once a dirty field holds a different value", () => {
    expect(
      hasEditedStartingValue(
        { interestRate: true },
        { ...starting, interestRate: 6.5 },
        starting,
      ),
    ).toBe(true);
    expect(
      hasEditedStartingValue(
        { address: true },
        { ...starting, address: "12 Elm St" },
        starting,
      ),
    ).toBe(true);
  });

  it("does not count a programmatic (non-dirty) change", () => {
    // A default template or lookup writes values with shouldDirty: false.
    expect(
      hasEditedStartingValue({}, { ...starting, downPaymentPct: 25 }, starting),
    ).toBe(false);
  });

  it("walks the per-unit dirty map", () => {
    const dirty = { units: [{ monthlyRent: true }] };
    expect(
      hasEditedStartingValue(
        dirty,
        { ...starting, units: [{ ...starting.units[0], monthlyRent: Number.NaN }] },
        starting,
      ),
    ).toBe(false);
    expect(
      hasEditedStartingValue(
        dirty,
        { ...starting, units: [{ ...starting.units[0], monthlyRent: 1800 }] },
        starting,
      ),
    ).toBe(true);
  });
});

describe("matchesFixtureValues", () => {
  const fixture = { address: "123 Sample St", purchasePrice: 300000, interestRate: 6.6 };

  it("is true while every fixture value is still in the form", () => {
    expect(
      matchesFixtureValues({ ...fixture, vacancyPct: 5, bedrooms: Number.NaN }, fixture),
    ).toBe(true);
  });

  it("is false once any fixture value was edited", () => {
    expect(matchesFixtureValues({ ...fixture, purchasePrice: 310000 }, fixture)).toBe(false);
    expect(matchesFixtureValues({ ...fixture, address: "" }, fixture)).toBe(false);
  });
});
