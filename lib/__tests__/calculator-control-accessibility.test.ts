import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

function read(relativePath: string): string {
  return readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), "utf8");
}

const financing = read("../../components/investcalc/financing-section.tsx");
const expenses = read("../../components/investcalc/operating-expenses-section.tsx");

function controlWindow(source: string, id: string): string {
  const idAt = source.indexOf(`id="${id}"`);
  expect(idAt, `${id} should be rendered`).toBeGreaterThan(-1);
  return source.slice(Math.max(0, idAt - 500), idAt + 1_200);
}

function expectErrorConnection(source: string, id: string): void {
  const control = controlWindow(source, id);
  expect(control).toContain("aria-invalid=");
  expect(control).toContain(`"${id}-error"`);
  expect(source).toMatch(new RegExp(`<FieldError\\s+id="${id}-error"`));
}

describe("calculator control accessibility guards", () => {
  it("matches financing DOM constraints to the investment schema", () => {
    const expected = [
      ["downPaymentPct", "min={0}", "max={100}", 'step="0.01"'],
      ["interestRate", "min={0}", "max={30}", 'step="0.01"'],
      ["loanTermYears", "min={1}", "max={50}", "step={1}"],
      ["closingCostsPct", "min={0}", "max={100}", 'step="0.01"'],
      ["rehabBudget", "min={0}", "max={1_000_000}", "step={100}"],
      ["pmiAnnualRatePct", "min={0}", "max={5}", 'step="0.05"'],
    ] as const;

    for (const [id, min, max, step] of expected) {
      const control = controlWindow(financing, id);
      expect(control).toContain(min);
      expect(control).toContain(max);
      expect(control).toContain(step);
      expectErrorConnection(financing, id);
    }
  });

  it("matches expense percentage limits to the investment schema", () => {
    const expected = [
      ["maintenancePct", 50],
      ["vacancyPct", 50],
      ["mgmtPct", 50],
      ["capexPct", 50],
      ["buildingValuePct", 100],
      ["expenseGrowthPct", 20],
      ["rentGrowthPct", 20],
      ["appreciationRatePct", 100],
      ["sellingCostPct", 100],
      ["taxRatePct", 100],
    ] as const;

    for (const [id, max] of expected) {
      const control = controlWindow(expenses, id);
      expect(control).toContain("min={0}");
      expect(control).toContain(`max={${max}}`);
      expect(control).toContain('step="0.01"');
      expectErrorConnection(expenses, id);
    }
  });

  it("keeps currency values numeric while displaying separators", () => {
    expect(financing).toContain("<CurrencyInput");
    for (const id of ["rehabBudget", "propertyTaxAmount", "insuranceAmount", "hoaMonthly", "utilitiesMonthly"]) {
      expect(controlWindow(id === "rehabBudget" ? financing : expenses, id)).toContain("<CurrencyInput");
      expectErrorConnection(id === "rehabBudget" ? financing : expenses, id);
    }
    expect(expenses.match(/max=\{1_000_000\}/g)?.length).toBeGreaterThanOrEqual(4);
  });

  it("keeps the interest-deduction help and switch accessible", () => {
    const interestBlock = expenses.slice(expenses.indexOf('htmlFor="include-interest-deduction"'));
    expect(interestBlock).toContain("size-11");
    expect(interestBlock).toContain('aria-label="Include interest deduction guidance"');
    expect(interestBlock).toContain('htmlFor="include-interest-deduction"');
    expect(interestBlock).toContain('id="include-interest-deduction"');
    expect(interestBlock).toContain(
      'aria-label="Include interest deduction in estimated tax savings"'
    );
  });

  it("names the standalone hero address combobox without relying on placeholder text", () => {
    const hero = read("../../components/marketing/hero-address-form.tsx");
    const autocomplete = read("../../components/investcalc/address-autocomplete.tsx");

    expect(hero).toContain('ariaLabel="Property address"');
    expect(autocomplete).toContain("aria-label={ariaLabel}");
  });

  it("gives listing-link entry a labeled, error-connected, keyboard-sized control", () => {
    const hero = read("../../components/marketing/hero-address-form.tsx");

    expect(hero).toContain('aria-label="Property entry method"');
    expect(hero).toContain('aria-pressed={entryMode === "listing"}');
    expect(hero).toContain('htmlFor="hero-listing-url"');
    expect(hero).toContain('id="hero-listing-url"');
    expect(hero).toContain('aria-invalid={Boolean(listingError)}');
    expect(hero.replace(/\s+/g, "")).toContain(
      'aria-describedby={listingError?"hero-listing-url-error":"hero-listing-url-help"}',
    );
    expect(hero).toContain("min-h-11");
  });
});
