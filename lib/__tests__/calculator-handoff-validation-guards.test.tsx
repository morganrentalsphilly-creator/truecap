import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  ArvCalculatorWidget,
  arvFieldErrors,
  type ArvRawInputs,
} from "@/components/tools/arv-calculator-widget";
import { BreakEvenCalculatorWidget } from "@/components/tools/break-even-calculator-widget";
import { GrmCalculatorWidget } from "@/components/tools/grm-calculator-widget";
import {
  MortgagePaymentWidget,
  validateMortgagePaymentInputs,
  type MortgagePaymentRawInputs,
} from "@/components/tools/mortgage-payment-widget";
import {
  OnePercentRuleWidget,
  onePercentRuleFieldErrors,
} from "@/components/tools/one-percent-rule-widget";
import {
  SeventyPercentRuleWidget,
  seventyPercentRuleFieldErrors,
} from "@/components/tools/seventy-percent-rule-widget";
import { ToolResult } from "@/components/tools/tool-parts";
import { VacancyRateCalculatorWidget } from "@/components/tools/vacancy-rate-calculator-widget";
import { FEATURE_CATALOG } from "@/lib/entitlements-catalog";
import { allToolNumbersValid } from "@/lib/public-tool-validation";

/**
 * The free calculators after the 2026-10 go-to-market audit (rows P2-47,
 * P2-48 and P2-72): how six of them hand off to the analyzer, and what four
 * of them do with a negative or absurd input. Each block says what the page
 * did before.
 */

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

/** Source with comments removed, so a comment can neither pass nor trip a rule. */
const code = (path: string) =>
  read(path)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

const textOf = (html: string) =>
  html
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#x27;/g, "'")
    .replace(/\s+/g, " ")
    .trim();

/** The aria-invalid attribute (the Input's class list names the variant too). */
const INVALID_ATTR = /\saria-invalid="/;

// ---------------------------------------------------------------------------
// P2-47: the analyzer handoff on six calculators
// ---------------------------------------------------------------------------

describe("P2-47: calculators hand off with a plain button and one honest line", () => {
  // Three widgets said "Run the free core analysis; projections appear when
  // your access includes them", break-even said "Run the free core property
  // screen; projections appear when your access includes them", and the ARV
  // and 70% rule widgets said "Open the rental analyzer with a separately
  // verified purchase price": each a hedged sentence set as a 14px text link.
  const RENTAL = [
    ["components/tools/mortgage-payment-widget.tsx", MortgagePaymentWidget],
    ["components/tools/grm-calculator-widget.tsx", GrmCalculatorWidget],
    ["components/tools/vacancy-rate-calculator-widget.tsx", VacancyRateCalculatorWidget],
    ["components/tools/break-even-calculator-widget.tsx", BreakEvenCalculatorWidget],
  ] as const;
  const HEURISTIC = [
    ["components/tools/arv-calculator-widget.tsx", ArvCalculatorWidget],
    ["components/tools/seventy-percent-rule-widget.tsx", SeventyPercentRuleWidget],
  ] as const;

  const FREE_NOTE =
    "Cap rate, CoC, DSCR and cash flow are free in TrueCap. The 10-year projection is a Pro feature.";
  const HEURISTIC_NOTE =
    "The price screen above is a rule of thumb and does not carry over. Enter the price you are evaluating.";

  /** The handoff anchor (the one link to /analyze) and the line it is described by. */
  function handoff(html: string) {
    const anchors = [...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)].filter(
      ([, attrs]) => /\shref="\/analyze\?/.test(attrs),
    );
    expect(anchors, "one analyzer handoff link").toHaveLength(1);
    const [, attrs, inner] = anchors[0];
    const noteId = /\saria-describedby="([^"]+)"/.exec(attrs)?.[1];
    expect(noteId, "the link is described by its note").toBeDefined();
    const note = new RegExp(`<p id="${noteId}"[^>]*>([\\s\\S]*?)</p>`).exec(html)?.[1];
    return { attrs, label: textOf(inner), note: note ? textOf(note) : null };
  }

  it.each([...RENTAL, ...HEURISTIC])("%s drops the hedged sentence and the icons", (path) => {
    const source = code(path);
    expect(source).not.toMatch(/projections appear when/i);
    expect(source).not.toMatch(/free core (?:analysis|property screen)/i);
    expect(source).not.toMatch(/separately\s+verified\s+purchase/i);
    // DESIGN.md chrome: no sparkle before a label, no arrow after it.
    expect(source).not.toMatch(/\b(?:Sparkles|ArrowUpRight)\b/);
  });

  it.each(RENTAL)("%s: 'Run the full analysis', then what is free and what is Pro", (_path, Widget) => {
    const { attrs, label, note } = handoff(renderToStaticMarkup(createElement(Widget)));
    expect(label).toBe("Run the full analysis");
    expect(note).toBe(FREE_NOTE);
    // A 48px button (the cta size), full width on phones.
    expect(attrs).toMatch(/class="[^"]*\bmin-h-12\b[^"]*\bw-full\b[^"]*\bsm:w-auto\b/);
    // The label makes no carry-over claim: mortgage hands on only the price,
    // vacancy only the rent, break-even nothing, and a partner's iframe
    // nothing at all (lib/analyzer-handoff-navigation.ts).
    expect(label).not.toMatch(/these numbers|this price|this rent/i);
  });

  it.each(HEURISTIC)("%s: 'Open the rental analyzer', then what does not carry over", (_path, Widget) => {
    const { label, note } = handoff(renderToStaticMarkup(createElement(Widget)));
    expect(label).toBe("Open the rental analyzer");
    expect(note).toBe(HEURISTIC_NOTE);
  });

  it("the free and Pro halves of the note are what the catalog says", () => {
    // Measured, not assumed: if either tier moves, the sentence is wrong and
    // this fails before the page does.
    expect(FEATURE_CATALOG.cash_flow.label).toBe("Cap rate · CoC · DSCR · cash flow");
    expect(FEATURE_CATALOG.cash_flow.tiers).toContain("free");
    expect(FEATURE_CATALOG.projections.label).toBe("10-year cash flow & equity projection");
    expect(FEATURE_CATALOG.projections.tiers).toContain("pro");
    expect(FEATURE_CATALOG.projections.tiers).not.toContain("free");
    expect(FEATURE_CATALOG.projections.shipped).not.toBe(false);
    // Nothing gives an anonymous visitor a projection either.
    expect(FEATURE_CATALOG.projections.anonymousLimit).toBeUndefined();
  });

  it("the heuristic widgets still hand nothing to the analyzer", () => {
    // The note says the price screen does not carry over; the href must agree.
    for (const [, Widget] of HEURISTIC) {
      const html = renderToStaticMarkup(createElement(Widget));
      const href = /<a\b[^>]*\shref="(\/analyze\?[^"]*)"/.exec(html)?.[1] ?? "";
      expect(href.replace(/&amp;/g, "&")).toMatch(/^\/analyze\?from=[a-z0-9-]+$/);
    }
  });
});

// ---------------------------------------------------------------------------
// P2-48 and P2-72: validation and announced results
// ---------------------------------------------------------------------------

describe("P2-48: the mortgage calculator rejects negative and absurd inputs", () => {
  const DEFAULTS: MortgagePaymentRawInputs = {
    price: "295000",
    downPct: "20",
    rate: "6.75",
    term: "30",
    taxPct: "1.49",
    insurancePct: "0.5",
  };
  const errorsFor = (patch: Partial<MortgagePaymentRawInputs>) => {
    const validated = validateMortgagePaymentInputs({ ...DEFAULTS, ...patch });
    return {
      valid: allToolNumbersValid(Object.values(validated)),
      errors: Object.fromEntries(
        Object.entries(validated)
          .filter(([, v]) => v.error !== null)
          .map(([k, v]) => [k, v.error]),
      ),
    };
  };

  it("accepts the defaults and ordinary edge values", () => {
    expect(errorsFor({})).toEqual({ valid: true, errors: {} });
    // A cash purchase, a 0% rate and no tax or insurance are real inputs.
    expect(errorsFor({ downPct: "100", rate: "0", taxPct: "0", insurancePct: "0" }).valid).toBe(true);
    expect(errorsFor({ downPct: "0", term: "1" }).valid).toBe(true);
    expect(errorsFor({ price: "295000.50", term: "50", rate: "30" }).valid).toBe(true);
  });

  // The audit's input states that printed a negative or absurd figure with
  // no message: a -$489 payment, "Down payment -$5", "-$236,000" total
  // interest for a blank, zero or negative term, a $98,823 payment at 500%.
  it.each([
    [{ price: "-295000" }, { price: "Home price must be greater than 0." }],
    [{ price: "-5" }, { price: "Home price must be greater than 0." }],
    [{ price: "0" }, { price: "Home price must be greater than 0." }],
    [{ price: "" }, { price: "Enter home price." }],
    [{ price: "999999999999999" }, { price: "Home price must be 100,000,000 or less." }],
    [{ term: "" }, { term: "Enter loan term in years." }],
    [{ term: "0" }, { term: "Loan term in years must be at least 1." }],
    [{ term: "-30" }, { term: "Loan term in years must be at least 1." }],
    [{ term: "100000" }, { term: "Loan term in years must be 50 or less." }],
    [{ rate: "-5" }, { rate: "Interest rate must be at least 0." }],
    [{ rate: "500" }, { rate: "Interest rate must be 30 or less." }],
    [{ downPct: "150" }, { downPct: "Down payment percent must be 100 or less." }],
    [{ downPct: "-20" }, { downPct: "Down payment percent must be at least 0." }],
    [{ downPct: "" }, { downPct: "Enter down payment percent." }],
    [{ taxPct: "-5" }, { taxPct: "Property tax rate must be at least 0." }],
    [{ insurancePct: "25" }, { insurancePct: "Insurance rate must be 20 or less." }],
  ] as const)("%o is an error on that field", (patch, errors) => {
    expect(errorsFor(patch)).toEqual({ valid: false, errors });
  });

  it("withholds the result while a field is in error, and says so", () => {
    const source = code("components/tools/mortgage-payment-widget.tsx");
    expect(source).toContain("const inputsValid = allToolNumbersValid(Object.values(validated));");
    expect(source).toContain('{inputsValid ? fmtMoney(result.monthlyTotal) : "—"}');
    expect(source).toContain('"Fix the highlighted inputs to calculate."');
    expect(source).toMatch(/!inputsValid && "hidden"/);
    // Every field is wired: bounds on the input, the message under it.
    for (const field of ["price", "downPct", "rate", "term", "taxPct", "insurancePct"]) {
      expect(source, field).toContain(`error={validated.${field}.error}`);
    }
    // The formula is the one the unit test pins, called as before.
    expect(source).toContain("interestRate: Math.max(0, num(rateInput))");
  });

  it("marks and announces: aria-invalid, a described error with role=alert, a polite status", () => {
    const source = code("components/tools/mortgage-payment-widget.tsx");
    expect(source.match(/aria-invalid=\{error \? true : undefined\}/g)).toHaveLength(3);
    expect(source.match(/aria-describedby=\{error \? errorId : undefined\}/g)).toHaveLength(3);
    expect(source).toMatch(/<p id=\{id\} role="alert"/);
    const html = renderToStaticMarkup(createElement(MortgagePaymentWidget));
    // P2-72: the result is a live region. At the defaults it reads the payment.
    const status = /<span class="sr-only" role="status" aria-live="polite" aria-atomic="true">([^<]*)<\/span>/.exec(html)?.[1];
    expect(status).toBe("Estimated monthly payment $2,020. Monthly principal and interest $1,531.");
    // Bounds reach the DOM, and nothing is in error at the defaults.
    expect(html).toContain('min="0" max="100000000"');
    expect(html).toContain('min="1" max="50"');
    expect(html).not.toMatch(INVALID_ATTR);
    expect(html).not.toContain('role="alert"');
  });
});

describe("P2-48: the ARV and 70% rule calculators reject negative and absurd inputs", () => {
  const ARV_DEFAULTS: ArvRawInputs = {
    comp1Price: "262000",
    comp1Sqft: "1450",
    comp2Price: "248500",
    comp2Sqft: "1350",
    comp3Price: "270000",
    comp3Sqft: "1500",
    subjectSqft: "1400",
    repairs: "45000",
    multiplier: "70",
  };
  const arvErrors = (patch: Partial<ArvRawInputs>) =>
    Object.fromEntries(
      Object.entries(arvFieldErrors({ ...ARV_DEFAULTS, ...patch })).filter(([, v]) => v !== null),
    );

  it("ARV: the defaults, an unused comp and $0 repairs are not errors", () => {
    expect(arvErrors({})).toEqual({});
    expect(arvErrors({ comp2Price: "", comp2Sqft: "", comp3Price: "", comp3Sqft: "" })).toEqual({});
    expect(arvErrors({ repairs: "" })).toEqual({});
    expect(arvErrors({ repairs: "0", subjectSqft: "" })).toEqual({});
  });

  // Negative repairs raised the price screen from $132,500 to $222,500; a
  // blank, zero or negative multiplier printed a negative price.
  it.each([
    [{ repairs: "-45000" }, { repairs: "Repair costs must be at least 0." }],
    [{ comp1Price: "-262000" }, { comp1Price: "Comp 1 sale price must be at least 0." }],
    [{ comp1Price: "999999999999999" }, { comp1Price: "Comp 1 sale price must be 100,000,000 or less." }],
    [{ subjectSqft: "99999999" }, { subjectSqft: "Subject finished square footage must be 100,000 or less." }],
    [{ comp3Sqft: "-1" }, { comp3Sqft: "Comp 3 square footage must be at least 0." }],
    [{ multiplier: "" }, { multiplier: "Enter rule multiplier." }],
    [{ multiplier: "0" }, { multiplier: "Rule multiplier must be greater than 0." }],
    [{ multiplier: "-70" }, { multiplier: "Rule multiplier must be greater than 0." }],
    [{ multiplier: "500" }, { multiplier: "Rule multiplier must be 100 or less." }],
  ] as const)("ARV: %o is an error on that field", (patch, errors) => {
    expect(arvErrors(patch)).toEqual(errors);
  });

  it("70% rule: the same bounds on its three fields", () => {
    const errors = (raw: { arv: string; repairs: string; multiplier: string }) =>
      Object.fromEntries(
        Object.entries(seventyPercentRuleFieldErrors(raw)).filter(([, v]) => v !== null),
      );
    expect(errors({ arv: "300000", repairs: "45000", multiplier: "70" })).toEqual({});
    expect(errors({ arv: "", repairs: "", multiplier: "70" })).toEqual({});
    expect(errors({ arv: "300000", repairs: "-45000", multiplier: "70" })).toEqual({
      repairs: "Repair costs must be at least 0.",
    });
    expect(errors({ arv: "-300000", repairs: "45000", multiplier: "" })).toEqual({
      arv: "After-repair value must be at least 0.",
      multiplier: "Enter rule multiplier.",
    });
    expect(errors({ arv: "999999999999", repairs: "45000", multiplier: "500" })).toEqual({
      arv: "After-repair value must be 100,000,000 or less.",
      multiplier: "Rule multiplier must be 100 or less.",
    });
  });

  it.each([
    "components/tools/arv-calculator-widget.tsx",
    "components/tools/seventy-percent-rule-widget.tsx",
  ])("%s withholds the result while a field is in error and never prints a negative price", (path) => {
    const source = code(path);
    expect(source).toContain("if (hasErrors) return null;");
    expect(source).toContain('role="alert"');
    expect(source).toContain('role="status"');
    // The rule's own "no price" case (repairs above the allowance) shows the
    // placeholder beside the sentence that explains it, not "-$722,044".
    expect(source).toMatch(/result\.mao > 0 \? fmt\(result\.mao\) : "—"/);
    // The shared arithmetic is called as before.
    expect(source).toMatch(/computeRuleMaxOffer\(/);
  });

  it("both render their defaults with bounds, no error and an announced result", () => {
    const arv = renderToStaticMarkup(createElement(ArvCalculatorWidget));
    expect(arv).toContain('max="100000000"');
    expect(arv).toContain('max="100000"');
    expect(arv).not.toMatch(INVALID_ATTR);
    expect(arv).not.toContain('role="alert"');
    expect(textOf(arv)).toContain("Estimated ARV $254,223. 70%-rule price screen $132,500.");
    const rule = renderToStaticMarkup(createElement(SeventyPercentRuleWidget));
    expect(rule).not.toMatch(INVALID_ATTR);
    expect(rule).not.toContain('role="alert"');
    expect(textOf(rule)).toContain("70%-rule price screen $165,000.");
  });
});

describe("P2-48 and P2-72: the 1% rule calculator", () => {
  it("a cleared field is not an error; zero, a negative and an absurd value are", () => {
    expect(onePercentRuleFieldErrors({ price: "180000", rent: "1900" })).toEqual({ price: null, rent: null });
    expect(onePercentRuleFieldErrors({ price: "", rent: "" })).toEqual({ price: null, rent: null });
    expect(onePercentRuleFieldErrors({ price: "-180000", rent: "-1900" })).toEqual({
      price: "Purchase price must be greater than 0.",
      rent: "Monthly rent must be greater than 0.",
    });
    expect(onePercentRuleFieldErrors({ price: "0", rent: "1900" }).price).toBe(
      "Purchase price must be greater than 0.",
    );
    // "1" over rent in the trillions printed 9999999999999900.00% and "Passes".
    expect(onePercentRuleFieldErrors({ price: "1", rent: "99999999999999" })).toEqual({
      price: null,
      rent: "Monthly rent must be 1,000,000 or less.",
    });
    expect(onePercentRuleFieldErrors({ price: "999999999999999", rent: "1900" }).price).toBe(
      "Purchase price must be 100,000,000 or less.",
    );
  });

  it("gives no ratio from a rejected value and shows the message on the field", () => {
    const source = code("components/tools/one-percent-rule-widget.tsx");
    expect(source).toContain("if (hasFieldError) return { ratio: null, passes: false };");
    expect(source).toContain("error={priceError}");
    expect(source).toContain("error={rentError}");
    expect(source).not.toContain("error={null}");
    // The ratio itself is unchanged.
    expect(source).toContain("const value = (r / p) * 100;");
  });

  it("the result block is a polite live region, read whole, with the figure as one node", () => {
    const html = renderToStaticMarkup(
      createElement(ToolResult, { label: "Rent / price", figure: "1.05%" }),
    );
    expect(html).toMatch(/^<div aria-live="polite" aria-atomic="true"/);
    // The e2e spec finds "1.05%" by text: one element, not a visible figure
    // plus a screen-reader copy.
    expect(html.match(/1\.05%/g)).toHaveLength(1);
    const widget = renderToStaticMarkup(createElement(OnePercentRuleWidget));
    expect(widget.match(/aria-live="polite"/g)).toHaveLength(1);
    expect(widget).toContain('min="0" max="100000000"');
    expect(widget).toContain('min="0" max="1000000"');
  });
});
