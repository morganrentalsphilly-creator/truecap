import { createElement, type ComponentType } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

/**
 * What five free calculators print for the same inputs, pinned before their
 * widgets moved onto the calculator parts (components/tools/tool-parts.tsx)
 * in the 2026-10 template fan-out. A restyle changes markup and class names;
 * it must not change a figure, a verdict, a note, an input id or a handoff
 * href. Each case seeds the widget's fields and reads the rendered text, so
 * the assertions hold whatever elements carry it.
 *
 * The widgets keep their inputs in useState and take no props, and the suite
 * runs in node (no DOM to type into), so a case swaps a field's default for
 * its own value as the widget asks for its initial state: the map is keyed by
 * the default string each field starts from.
 */
const seeds = vi.hoisted(() => ({ current: {} as Record<string, string> }));
vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  const useState = (initial: unknown) =>
    actual.useState(
      typeof initial === "string" && initial in seeds.current ? seeds.current[initial] : initial,
    );
  return {
    ...actual,
    default: { ...(actual as unknown as { default: object }).default, useState },
    useState,
  };
});

import { BreakEvenCalculatorWidget } from "@/components/tools/break-even-calculator-widget";
import { GrmCalculatorWidget } from "@/components/tools/grm-calculator-widget";
import { MortgagePaymentWidget } from "@/components/tools/mortgage-payment-widget";
import { TwoPercentRuleWidget } from "@/components/tools/two-percent-rule-widget";
import { VacancyRateCalculatorWidget } from "@/components/tools/vacancy-rate-calculator-widget";

const textOf = (html: string) =>
  html
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#x27;/g, "'")
    .replace(/\s+/g, " ")
    .trim();

function render(Widget: ComponentType, fields: Record<string, string>) {
  seeds.current = fields;
  try {
    const html = renderToStaticMarkup(createElement(Widget));
    const inputs = Object.fromEntries(
      [...html.matchAll(/<input\b[^>]*>/g)].map(([tag]) => [
        /\sid="([^"]+)"/.exec(tag)?.[1] ?? "",
        /\svalue="([^"]*)"/.exec(tag)?.[1] ?? "",
      ]),
    );
    const hrefs = [...html.matchAll(/<a\b[^>]*\shref="(\/analyze[^"]*)"/g)].map(([, href]) =>
      href.replace(/&amp;/g, "&"),
    );
    return { html, text: textOf(html), inputs, hrefs };
  } finally {
    seeds.current = {};
  }
}

/** Every fragment is in the rendered text. */
function expectText(text: string, fragments: readonly string[]) {
  for (const fragment of fragments) expect(text, fragment).toContain(fragment);
}

describe("2% rule calculator: pinned outputs", () => {
  const HREF = "/analyze?from=2-percent-rule-calculator";
  it.each([
    [
      {},
      { "twopct-price": "120000", "twopct-rent": "1500" },
      ["1.25%", "Passes 1%, below 2%", "Strong screening territory for a cash-flow market — worth the full underwrite."],
    ],
    [
      { "120000": "287500", "1500": "2475" },
      { "twopct-price": "287500", "twopct-rent": "2475" },
      ["0.86%", "Below the 1% rule", "Either an appreciation play, or the price is too high relative to rent."],
    ],
    [
      { "120000": "100000", "1500": "2100" },
      { "twopct-price": "100000", "twopct-rent": "2100" },
      [
        "2.10%",
        "Meets the 2% rule — verify why",
        "A ratio this high usually signals a distressed area, deferred maintenance, or optimistic rent — underwrite before celebrating.",
      ],
    ],
  ] as const)("%o", (fields, inputs, fragments) => {
    const out = render(TwoPercentRuleWidget, fields);
    expect(out.inputs).toEqual(inputs);
    expect(out.hrefs).toEqual([HREF]);
    expectText(out.text, fragments);
  });

  it("the figure is one text node (e2e/site-overhaul-conversion.spec.ts finds it by exact text)", () => {
    const { html } = render(TwoPercentRuleWidget, { "120000": "287500", "1500": "2475" });
    expect(html.match(/>0\.86%</g)).toHaveLength(1);
  });

  it("a cleared field asks for both numbers and gives no ratio", () => {
    const { text } = render(TwoPercentRuleWidget, { "120000": "" });
    expect(text).toContain("—");
    expect(text).toContain("Enter a purchase price and monthly rent to calculate.");
    expect(text).not.toMatch(/\d\.\d\d%/);
  });
});

describe("GRM calculator: pinned outputs", () => {
  const HREF = "/analyze?from=gross-rent-multiplier-calculator";
  it.each([
    [
      {},
      { "grm-price": "295000", "grm-rent": "2950" },
      "8.3",
      [
        "Healthy",
        "Typical cash-flow market — Midwest / Sun Belt / older multifamily.",
        "Property price $295,000",
        "Monthly rent $2,950",
        "Annual rent $35,400",
      ],
    ],
    [
      { "295000": "500000", "2950": "2000" },
      { "grm-price": "500000", "grm-rent": "2000" },
      "20.8",
      [
        "Expensive",
        "Very low yield relative to price. Common in luxury / ultra-coastal markets.",
        "Property price $500,000",
        "Monthly rent $2,000",
        "Annual rent $24,000",
      ],
    ],
    [
      { "295000": "120000", "2950": "1800" },
      { "grm-price": "120000", "grm-rent": "1800" },
      "5.6",
      [
        "Very strong",
        "Cash-flow-heavy market or a deeply distressed deal — verify everything.",
        "Property price $120,000",
        "Monthly rent $1,800",
        "Annual rent $21,600",
      ],
    ],
  ] as const)("%o", (fields, inputs, figure, fragments) => {
    const out = render(GrmCalculatorWidget, fields);
    expect(out.inputs).toEqual(inputs);
    expect(out.hrefs).toEqual([HREF]);
    // The multiple is its own text node, with no unit.
    expect(out.html).toContain(`>${figure}<`);
    expectText(out.text, fragments);
  });

  it("a cleared rent keeps the placeholder and the corrective line", () => {
    const { text } = render(GrmCalculatorWidget, { "2950": "" });
    expectText(text, ["—", "Invalid", "Enter a price and monthly rent above 0."]);
  });
});

describe("vacancy rate calculator: pinned outputs", () => {
  const HREF = "/analyze?from=vacancy-rate-calculator";
  it.each([
    [
      {},
      { "vr-rent": "1500", "vr-days": "21", "vr-turn": "400" },
      [
        "7.98%",
        "$1,436 lost per year",
        "Realistic",
        "Annual gross rent $18,000",
        "Lost rent (vacant days) $1,036",
        "Turnover cost $400",
        "Effective annual rent $16,564",
      ],
    ],
    [
      { "1500": "2200", "21": "45", "400": "0" },
      { "vr-rent": "2200", "vr-days": "45", "vr-turn": "0" },
      [
        "12.33%",
        "$3,255 lost per year",
        "Distressed",
        "Annual gross rent $26,400",
        "Lost rent (vacant days) $3,255",
        "Turnover cost $0",
        "Effective annual rent $23,145",
      ],
    ],
    [
      { "1500": "1000", "21": "7", "400": "150" },
      { "vr-rent": "1000", "vr-days": "7", "vr-turn": "150" },
      [
        "3.17%",
        "$380 lost per year",
        "Aggressive (low)",
        "Annual gross rent $12,000",
        "Lost rent (vacant days) $230",
        "Turnover cost $150",
        "Effective annual rent $11,620",
      ],
    ],
    [
      { "1500": "1800", "21": "60", "400": "900" },
      { "vr-rent": "1800", "vr-days": "60", "vr-turn": "900" },
      [
        "20.61%",
        "$4,451 lost per year",
        "Distressed",
        "Annual gross rent $21,600",
        "Lost rent (vacant days) $3,551",
        "Turnover cost $900",
        "Effective annual rent $17,149",
      ],
    ],
  ] as const)("%o", (fields, inputs, fragments) => {
    const out = render(VacancyRateCalculatorWidget, fields);
    expect(out.inputs).toEqual(inputs);
    expect(out.hrefs).toEqual([HREF]);
    expectText(out.text, fragments);
  });
});

describe("break-even calculator: pinned outputs", () => {
  const HREF = "/analyze?from=break-even-calculator";
  it.each([
    [
      {},
      { "be-down": "60000", "be-closing": "8000", "be-rehab": "5000", "be-cf": "450" },
      [
        "10 to 15 years. Modeled break-even 162 months, or 13.5 years.",
        "162 months",
        "13.5 years · $73,000 modeled initial cash",
        "At the entered monthly cash flow, modeled recovery takes between 120 and 180 months.",
      ],
    ],
    [
      { "60000": "20000", "8000": "3000", "5000": "2000", "450": "500" },
      { "be-down": "20000", "be-closing": "3000", "be-rehab": "2000", "be-cf": "500" },
      [
        "Under 5 years. Modeled break-even 50 months, or 4.2 years.",
        "50 months",
        "4.2 years · $25,000 modeled initial cash",
        "At the entered monthly cash flow, the modeled initial cash is recovered within 60 months.",
      ],
    ],
    [
      { "60000": "40000", "8000": "6000", "5000": "0", "450": "400" },
      { "be-down": "40000", "be-closing": "6000", "be-rehab": "0", "be-cf": "400" },
      [
        "5 to 10 years. Modeled break-even 115 months, or 9.6 years.",
        "115 months",
        "9.6 years · $46,000 modeled initial cash",
        "At the entered monthly cash flow, modeled recovery takes between 60 and 120 months.",
      ],
    ],
    [
      { "450": "-100" },
      { "be-down": "60000", "be-closing": "8000", "be-rehab": "5000", "be-cf": "-100" },
      [
        "No cash-flow break-even. Monthly cash flow is zero or negative, so the entered cash is not recovered from cash flow alone.",
        "—",
        "$73,000 modeled initial cash · enter positive monthly cash flow to calculate recovery time",
      ],
    ],
  ] as const)("%o", (fields, inputs, fragments) => {
    const out = render(BreakEvenCalculatorWidget, fields);
    expect(out.inputs).toEqual(inputs);
    expect(out.hrefs).toEqual([HREF]);
    expectText(out.text, fragments);
  });
});

describe("mortgage payment calculator: pinned outputs", () => {
  const HREF = "/analyze?from=mortgage-payment-calculator";
  it.each([
    [
      {},
      ["295000", "20", "6.75", "30", "1.49", "0.5"],
      [
        "Estimated monthly payment $2,020. Monthly principal and interest $1,531.",
        "Principal, interest, property tax, homeowner's insurance .",
        "Loan amount $236,000",
        "Down payment $59,000",
        "Monthly P&I $1,531",
        "Monthly tax $366",
        "Monthly homeowner's insurance $123",
        "Estimated monthly PMI $0",
        "Total interest over loan $315,049",
      ],
    ],
    [
      { "295000": "250000", "20": "5", "6.75": "6", "1.49": "1.2" },
      ["250000", "5", "6", "30", "1.2", "0.5"],
      [
        "Estimated monthly payment $1,936. Monthly principal and interest $1,424.",
        "Principal, interest, property tax, homeowner's insurance , and estimated mortgage insurance.",
        "Loan amount $237,500",
        "Down payment $12,500",
        "Monthly P&I $1,424",
        "Monthly tax $250",
        "Monthly homeowner's insurance $104",
        "Estimated monthly PMI $158",
        "Total interest over loan $275,116",
        "PMI uses TrueCap's 0.8% annual screening estimate on the starting loan. Verify the actual premium and cancellation rules with the lender.",
      ],
    ],
    [
      { "295000": "125000", "6.75": "0", "30": "7" },
      ["125000", "20", "0", "7", "1.49", "0.5"],
      [
        "Estimated monthly payment $1,398. Monthly principal and interest $1,190.",
        "Loan amount $100,000",
        "Down payment $25,000",
        "Monthly P&I $1,190",
        "Monthly tax $155",
        "Monthly homeowner's insurance $52",
        "Estimated monthly PMI $0",
        "Total interest over loan $0",
      ],
    ],
  ] as const)("%o", (fields, values, fragments) => {
    const out = render(MortgagePaymentWidget, fields);
    // The six fields, in reading order on a phone: price, down payment,
    // rate, term, tax, insurance. Their ids are React's (useId), so the
    // values are pinned by position.
    expect(Object.values(out.inputs)).toEqual(values);
    expect(out.hrefs).toEqual([HREF]);
    // The summary sentence is text, a comma or stop, then text: compare
    // with the space a tag boundary leaves.
    expectText(
      out.text.replace(/ ([.,])/g, "$1"),
      fragments.map((f) => f.replace(/ ([.,])/g, "$1")),
    );
  });

  it("the payment figure is one text node", () => {
    const { html } = render(MortgagePaymentWidget, {});
    expect(html.match(/>\$2,020</g)).toHaveLength(1);
  });
});
