import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { calculateAnalysis } from "../calc-analysis";
import { isAllCashDownPayment } from "../financing-classification";
import { SAMPLE_DEAL_FIXTURE } from "../sample-deal";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");
const normalizeSource = (source: string) =>
  source.replace(/\s+/g, "").replace(/,([)}\]])/g, "$1");

describe("v1 all-cash classification", () => {
  it("treats 0% down as financed and only 100% or more as all-cash", () => {
    expect(isAllCashDownPayment(undefined)).toBe(false);
    expect(isAllCashDownPayment(Number.NaN)).toBe(false);
    expect(isAllCashDownPayment(0)).toBe(false);
    expect(isAllCashDownPayment(99.99)).toBe(false);
    expect(isAllCashDownPayment(100)).toBe(true);
    expect(isAllCashDownPayment(120)).toBe(true);
  });

  it("matches the calculation engine at the 0% and 100% boundaries", () => {
    const fullyFinanced = calculateAnalysis({
      ...SAMPLE_DEAL_FIXTURE.values,
      downPaymentPct: 0,
    });
    const allCash = calculateAnalysis({
      ...SAMPLE_DEAL_FIXTURE.values,
      downPaymentPct: 100,
    });

    expect(fullyFinanced.monthlyPayment).toBeGreaterThan(0);
    expect(isAllCashDownPayment(0)).toBe(false);
    expect(allCash.monthlyPayment).toBe(0);
    expect(isAllCashDownPayment(100)).toBe(true);
  });

  it("uses the same classifier in the financing UI and pre-analysis analytics", () => {
    const financing = read("components/investcalc/financing-section.tsx");
    const calculator = read("components/investcalc/investcalc-page.tsx");

    expect(financing).toContain("isAllCashDownPayment(downPaymentPct)");
    expect(normalizeSource(financing)).toContain(
      normalizeSource("downPaymentPct >= 0 && downPaymentPct < 20"),
    );
    expect(calculator).toContain(
      "is_cash_purchase: isAllCashDownPayment(values.downPaymentPct)"
    );
    expect(financing).not.toContain("downPaymentPct === 0");
    expect(calculator).not.toContain("!values.downPaymentPct || values.downPaymentPct >= 100");
  });

  it("does not replace an explicit 0% down payment with 20% in strategy cards", () => {
    const brrrr = read("components/investcalc/brrrr-card.tsx");
    const flip = read("components/investcalc/fix-flip-card.tsx");

    expect(brrrr).toContain("Number(values?.downPaymentPct ?? 20)");
    expect(flip).toContain("Number(values?.downPaymentPct ?? 20)");
    expect(brrrr).not.toContain("Number(values?.downPaymentPct) || 20");
    expect(flip).not.toContain("Number(values?.downPaymentPct) || 20");
  });
});
