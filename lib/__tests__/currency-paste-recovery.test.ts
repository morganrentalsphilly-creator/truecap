import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { parsePastedCurrency, parseCurrencyInput } from "@/components/ui/currency-input";

/**
 * Pasting a price out of a listing used to do nothing at all.
 *
 * parseCurrencyInput rejects rather than strips — correct for typing, because a
 * stray character must never silently change a number someone is underwriting.
 * But updateCurrencyDraft answers a rejected edit by re-showing the PREVIOUS
 * display, so a paste of "$450K" produced no value change, no cursor movement,
 * no error, and no explanation. The field simply appeared broken.
 *
 * parsePastedCurrency runs only after the strict path has already refused the
 * text, and only recovers shapes with one unambiguous reading.
 */
describe("parsePastedCurrency", () => {
  it("recovers the shapes people actually paste from listings", () => {
    expect(parsePastedCurrency("$450K")).toBe(450_000);
    expect(parsePastedCurrency("450k")).toBe(450_000);
    expect(parsePastedCurrency("1.25M")).toBe(1_250_000);
    expect(parsePastedCurrency("450,000 USD")).toBe(450_000);
    expect(parsePastedCurrency("US$450,000")).toBe(450_000);
    expect(parsePastedCurrency("  $450,000  ")).toBe(450_000);
    expect(parsePastedCurrency("$2,400/mo")).toBe(2_400);
    expect(parsePastedCurrency("$450,000*")).toBe(450_000);
  });

  it("handles the non-breaking space that rides along with web copy", () => {
    // Copying from a rendered page very often yields U+00A0 rather than a
    // plain space. Written as an escape on purpose: a literal nbsp in the
    // source is invisible, so a later edit could "tidy" it into a normal
    // space and this test would keep passing while covering nothing.
    const NBSP = "\u00a0";
    expect(parsePastedCurrency(`$${NBSP}450,000`)).toBe(450_000);
    expect(parsePastedCurrency(`450,000${NBSP}USD`)).toBe(450_000);
    expect(parsePastedCurrency(`${NBSP}$450,000${NBSP}`)).toBe(450_000);
    // NOTE: a bare "$<nbsp>450,000" needs no recovery at all — JS \s matches
    // U+00A0 and String.trim() strips it, so the STRICT parser already accepts
    // it. Asserting otherwise here failed, which is how that was discovered.
    expect(parseCurrencyInput(`$${NBSP}450,000`)).toBe(450_000);
    // What genuinely needs recovery is an nbsp plus something the strict
    // parser rejects outright, which is the common real-world paste.
    expect(parseCurrencyInput(`450,000${NBSP}USD`)).toBeUndefined();
  });

  it("refuses anything with two numbers in it", () => {
    // Guessing which end of a range the user meant is how you underwrite the
    // wrong price. Rejecting leaves the field untouched, which is honest.
    expect(parsePastedCurrency("$450,000 - $475,000")).toBeNull();
    expect(parsePastedCurrency("$450,000 | 2,100 sqft")).toBeNull();
  });

  it("refuses text that is not a price at all", () => {
    expect(parsePastedCurrency("")).toBeNull();
    expect(parsePastedCurrency("   ")).toBeNull();
    expect(parsePastedCurrency("call for price")).toBeNull();
    expect(parsePastedCurrency("$")).toBeNull();
    expect(parsePastedCurrency("-450000")).toBeNull();
  });

  it("only ever runs on input the strict parser already rejected", () => {
    // The two must not disagree about ordinary values, or a paste would take a
    // different code path from typing the same characters.
    for (const good of ["450000", "$450,000", "450,000.50", "0"]) {
      expect(parseCurrencyInput(good), `${good} should pass the strict parser`)
        .not.toBeUndefined();
    }
    // ...and these are exactly the ones the strict parser turns away.
    for (const bad of ["$450K", "450,000 USD", "$2,400/mo"]) {
      expect(parseCurrencyInput(bad), `${bad} should be rejected when typed`)
        .toBeUndefined();
      expect(parsePastedCurrency(bad), `${bad} should be recovered when pasted`)
        .not.toBeNull();
    }
  });

  it("is wired to onPaste and defers to the strict path first", () => {
    const source = readFileSync(
      join(process.cwd(), "components/ui/currency-input.tsx"),
      "utf8",
    );
    expect(source).toContain("onPaste={(event)");
    // If this guard is dropped, a normal paste would take the recovery branch
    // and round away a legitimate third decimal.
    expect(source).toContain("if (updateCurrencyDraft(display, pasted).accepted) return;");
  });
});
