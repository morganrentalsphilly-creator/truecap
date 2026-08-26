import { describe, expect, it } from "vitest";

import {
  autofillPropertyIdentity,
  decideAutofillFieldWrite,
  isSameAutofillProperty,
  normalizeAutofillPropertyAddress,
} from "@/lib/autofill-field-ownership";

describe("decideAutofillFieldWrite", () => {
  it.each([
    ["undefined", undefined],
    ["null", null],
    ["an empty string", ""],
    ["a whitespace-only string", "   "],
    ["NaN", Number.NaN],
    ["positive infinity", Number.POSITIVE_INFINITY],
    ["negative infinity", Number.NEGATIVE_INFINITY],
    ["a nonnumeric string", "not-a-number"],
  ])(
    "allows a valid proposal when the current value is empty or nonfinite: %s",
    (_, currentValue) => {
      expect(
        decideAutofillFieldWrite({
          currentValue,
          proposedValue: 215_000,
        }),
      ).toEqual({ action: "write", reason: "empty-current" });
    },
  );

  it.each([
    [215_000, 215_000],
    [0, 0],
    [6.65, 6.65],
    ["215000", 215_000],
    ["6.65", 6.65],
  ])(
    "allows an equal finite value without treating it as a conflict",
    (currentValue, proposedValue) => {
      expect(
        decideAutofillFieldWrite({
          currentValue,
          proposedValue,
        }),
      ).toEqual({ action: "write", reason: "same-value" });
    },
  );

  it("protects a differing populated value restored with form.reset, even though that field is non-dirty", () => {
    // The helper intentionally has no isDirty input. A restored value receives
    // the same ownership protection as a value typed during this session.
    expect(
      decideAutofillFieldWrite({
        currentValue: 215_000,
        proposedValue: 225_000,
      }),
    ).toEqual({ action: "conflict", reason: "different-value" });
  });

  it.each([
    ["purchase price", 215_000, 225_000],
    ["monthly rent", 1_550, 1_700],
    ["bedrooms", 1, 2],
    ["zero", 0, 1],
    ["numeric string", "1550", 1_700],
  ])(
    "requires review for a differing populated %s",
    (_, currentValue, proposedValue) => {
      expect(
        decideAutofillFieldWrite({
          currentValue,
          proposedValue,
        }),
      ).toEqual({ action: "conflict", reason: "different-value" });
    },
  );

  it("allows a caller-proven untouched product benchmark to be replaced", () => {
    expect(
      decideAutofillFieldWrite({
        currentValue: 6.75,
        proposedValue: 6.9,
        replaceableDefault: true,
      }),
    ).toEqual({ action: "write", reason: "replaceable-default" });
  });

  it("allows an explicitly approved overwrite of a differing populated value", () => {
    expect(
      decideAutofillFieldWrite({
        currentValue: 215_000,
        proposedValue: 225_000,
        explicitlyApproved: true,
      }),
    ).toEqual({ action: "write", reason: "approved-overwrite" });
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    "skips a nonfinite proposed value, even when overwrite approval is present: %s",
    (proposedValue) => {
      expect(
        decideAutofillFieldWrite({
          currentValue: 215_000,
          proposedValue,
          explicitlyApproved: true,
        }),
      ).toEqual({ action: "skip", reason: "invalid-proposed-value" });
    },
  );
});

describe("address-bound autofill provenance", () => {
  it("keeps the same property bound across punctuation and a trailing country", () => {
    const previous = autofillPropertyIdentity({
      formattedAddress: "2560 Collins St, Philadelphia, PA 19125",
      zip: "19125",
    });

    expect(
      isSameAutofillProperty(previous, {
        formattedAddress: "2560 Collins St., Philadelphia, PA 19125, USA",
        zip: "19125",
      }),
    ).toBe(true);
    expect(
      normalizeAutofillPropertyAddress(
        "2560 Collins St., Philadelphia, PA 19125, USA",
      ),
    ).toBe("2560 collins st philadelphia pa 19125");
  });

  it("never treats a different street with the same number and ZIP as the same property", () => {
    const previous = autofillPropertyIdentity({
      formattedAddress: "123 Main St, Philadelphia, PA 19125",
      zip: "19125",
    });

    expect(
      isSameAutofillProperty(previous, {
        formattedAddress: "123 Pine St, Philadelphia, PA 19125, USA",
        zip: "19125",
      }),
    ).toBe(false);
  });

  it("fails closed when a ZIP cannot be bound", () => {
    const previous = autofillPropertyIdentity({
      formattedAddress: "123 Main St, Philadelphia, PA",
    });

    expect(
      isSameAutofillProperty(previous, {
        formattedAddress: "123 Main St, Philadelphia, PA",
      }),
    ).toBe(false);
  });
});
