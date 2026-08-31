import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const read = (path: string) => readFileSync(join(ROOT, path), "utf8");

describe("listing-to-analyzer handoff", () => {
  it("uses real calculator acknowledgement instead of a cosmetic timeout", () => {
    const hero = read("components/marketing/hero-address-form.tsx");
    expect(hero).toContain("HERO_ANALYZE_STATUS_EVENT");
    expect(hero).toContain('"Looking up starting assumptions…"');
    expect(hero).toContain('"Use this address instead"');
    expect(hero).toContain('"Analyze listing free"');
    expect(hero).not.toContain(
      "window.setTimeout(() => setSubmitting(false), 1200)",
    );
  });

  it("preserves listing ZIP and merges address-derived location fields", () => {
    const hero = read("components/marketing/hero-address-form.tsx");
    const calculator = read("components/investcalc/investcalc-page.tsx");
    expect(hero).toContain("zip: parsed.zip");
    expect(calculator).toContain("zip: parsed.zip");
    expect(calculator).toContain("detail.state ?? parsedLocation.state");
    expect(calculator).toContain("detail.zip ?? parsedLocation.zip");
  });

  it("keeps an accessible receipt and a direct path to the first missing input", () => {
    const input = read("components/investcalc/listing-link-input.tsx");
    expect(input).toContain('role="status"');
    expect(input).toContain('aria-live="polite"');
    expect(input).toContain("Address extracted");
    expect(input).toContain("Continue with {firstMissingField.label}");
  });

  it("never combines a new listing address with the previous property's facts", () => {
    const calculator = read("components/investcalc/investcalc-page.tsx");
    expect(calculator).toContain("const preparePropertySwap = useCallback(");
    expect(calculator).toContain("if (!(await preparePropertySwap(place))) return;");
    const heroHandler = calculator.slice(
      calculator.indexOf("heroAnalyzeHandlerRef.current ="),
      calculator.indexOf("Live provenance + raw capture getters"),
    );
    expect(heroHandler).toContain("if (!(await preparePropertySwap(nextPlace)))");
    expect(heroHandler.indexOf("preparePropertySwap(nextPlace)")).toBeLessThan(
      heroHandler.indexOf('form.setValue("address", address'),
    );
    expect(calculator).toMatch(
      /form\.setValue\(\s*"purchasePrice",\s*undefined as unknown as number/,
    );
    expect(calculator).toContain(
      'form.setValue("monthlyRent", undefined, clearOpts)',
    );
    expect(calculator).toContain(
      'form.setValue("yearBuilt", undefined, clearOpts)',
    );
    expect(calculator).toContain(
      '"units",\n        getDefaultUnitsForPropertyType',
    );
    expect(calculator).toContain(
      'form.setValue("propertyTaxAnnual", undefined, clearOpts)',
    );
    expect(calculator).toContain(
      'form.setValue("propertyTaxPct", undefined, clearOpts)',
    );
    expect(calculator).toContain(
      'form.setValue("insuranceMonthly", undefined, clearOpts)',
    );
    expect(calculator).toContain(
      'form.setValue("insurancePct", undefined, clearOpts)',
    );
    expect(calculator).toContain(
      'form.setValue("hoaMonthly", v2 ? 0 : undefined, clearOpts)',
    );
    expect(calculator).toContain(
      'form.setValue("strategyArv", undefined, clearOpts)',
    );
    expect(calculator).toContain('status: "cancelled"');
    expect(calculator).toContain("releaseStaleHandoff();");
  });
});
