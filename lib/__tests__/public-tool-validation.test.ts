import { describe, expect, it } from "vitest";
import {
  allToolNumbersValid,
  validateToolNumber,
} from "@/lib/public-tool-validation";

describe("public tool numeric validation", () => {
  it("rejects empty and non-finite live input instead of coercing it to zero", () => {
    expect(validateToolNumber("", { label: "Purchase price" })).toEqual({
      ok: false,
      value: null,
      error: "Enter purchase price.",
    });
    expect(validateToolNumber("1e309", { label: "Purchase price" })).toEqual({
      ok: false,
      value: null,
      error: "Enter a valid purchase price.",
    });
  });

  it("enforces inclusive and exclusive lower bounds", () => {
    expect(
      validateToolNumber("0", {
        label: "Purchase price",
        min: 0,
        minExclusive: true,
      })
    ).toEqual({
      ok: false,
      value: null,
      error: "Purchase price must be greater than 0.",
    });
    expect(validateToolNumber("-1", { label: "Closing costs", min: 0 })).toEqual({
      ok: false,
      value: null,
      error: "Closing costs must be at least 0.",
    });
    expect(validateToolNumber("0", { label: "Closing costs", min: 0 })).toEqual({
      ok: true,
      value: 0,
      error: null,
    });
  });

  it("enforces upper bounds while preserving valid negative scenarios", () => {
    expect(validateToolNumber("101", { label: "Rate", max: 100 })).toEqual({
      ok: false,
      value: null,
      error: "Rate must be 100 or less.",
    });
    const validLoss = validateToolNumber("-450", {
      label: "Monthly cash flow",
      min: -1_000_000,
      max: 1_000_000,
    });
    expect(validLoss).toEqual({ ok: true, value: -450, error: null });
    expect(allToolNumbersValid([validLoss])).toBe(true);
  });
});
