import { describe, expect, it } from "vitest";
import { formatCurrencyInput, parseCurrencyInput } from "@/components/ui/currency-input";

describe("currency input formatting", () => {
  it("keeps separators out of numeric form state", () => {
    expect(parseCurrencyInput("$385,000")).toBe(385000);
    expect(parseCurrencyInput("2,800")).toBe(2800);
  });

  it("formats finite numeric state for display", () => {
    expect(formatCurrencyInput(385000)).toBe("385,000");
    expect(formatCurrencyInput(undefined)).toBe("");
  });

  it("preserves an empty field for schema validation", () => {
    expect(parseCurrencyInput("")).toBeUndefined();
    expect(parseCurrencyInput("$,")).toBeUndefined();
  });
});
