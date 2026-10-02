/**
 * Truth guards for the six short-term rental comparison pages (go-to-market
 * audit row P2-23, decided 2026-10-02: the pages stay and each says in one
 * sentence that TrueCap's short-term mode is a beta revenue screen).
 *
 * The audit found the six pages pitching short-term underwriting with no
 * mention that the analyzer labels its Short-term Rental type "Advanced /
 * Beta", three table cells claiming an audience of "1-30 doors" that matches
 * nothing in the product, a cell saying utilities and maintenance fields
 * "handle the STR overhead" (the form has no cleaning or platform-fee line),
 * and a rule of thumb with no source ("75% of expected gross STR revenue /
 * 12") on two pages.
 *
 * The sentence is read from the product: its label and its limitation come
 * from lib/investor-strategies.ts, so a page cannot keep describing the mode
 * in words the analyzer has stopped using. When the mode leaves beta, the
 * first test fails and the pages are rewritten with it.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { getStrategyByKey } from "@/lib/investor-strategies";

const SLUGS = [
  "guesty",
  "hostaway",
  "hostfully",
  "lodgify",
  "dealcheck-for-short-term-rentals",
  "mashvisor-for-short-term-rentals",
] as const;

const VS_DIR = join(process.cwd(), "app", "vs");
const source = (slug: string) => readFileSync(join(VS_DIR, slug, "page.tsx"), "utf8");
/** A source as a reader meets it: comments out, JSX line wraps joined (`{" "}` is a space). */
const flat = (slug: string) =>
  source(slug)
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/^\s*\/\/.*$/gm, " ")
    .replace(/\{"\s*"\}/g, " ")
    .replace(/&apos;/g, "'")
    .replace(/\s+/g, " ");

/** Every `description: "…"` literal in the page: meta, Open Graph and the WebPage JSON-LD. */
const descriptions = (slug: string) =>
  [...source(slug).matchAll(/\bdescription:\s*"((?:[^"\\]|\\.)*)"/g)].map((match) => match[1]);

const strategy = getStrategyByKey("short-term");
const PRODUCT_PREFIX = "Beta revenue screen only. It ";
/** "does not fully model platform fees, turnover, lodging tax, seasonality, or local STR eligibility" */
const limits = (strategy?.limitation ?? "").slice(PRODUCT_PREFIX.length).replace(/\.$/, "");
const BETA_SENTENCE = `TrueCap's ${strategy?.label} mode is a beta revenue screen: it models revenue as nightly rate × occupancy and ${limits}.`;

describe("the six short-term rental comparison pages", () => {
  it("rests on what the analyzer says about the mode today", () => {
    expect(strategy?.productStage).toBe("advanced-beta");
    expect(strategy?.label).toBe("Short-term Rental");
    expect(strategy?.incomeMode).toBe("str");
    expect(strategy?.limitation?.startsWith(PRODUCT_PREFIX)).toBe(true);
    expect(limits).toMatch(/^does not fully model \w/);
    // "revenue is modeled as ADR × occupancy" is the analyzer's own hint.
    expect(strategy?.focusHint).toContain("ADR × occupancy");
  });

  it("says once in the lede, in the product's words, that the short-term mode is a beta revenue screen", () => {
    for (const slug of SLUGS) {
      const page = flat(slug);
      expect(page.split(BETA_SENTENCE).length - 1, slug).toBe(1);
      const lede = /<p className=\{VS_LEDE\}>(.*?)<\/p>/.exec(page)?.[1] ?? "";
      expect(lede, slug).toContain(BETA_SENTENCE);
    }
  });

  it("names the mode's inputs in a table cell or an answer only beside the beta label", () => {
    // A nightly rate and an occupancy are the beta mode's inputs. A cell or an
    // answer that says TrueCap takes them (the DealCheck page said "TrueCap
    // models a blended ADR + occupancy input") says which mode that is.
    for (const slug of SLUGS) {
      const cells = [...source(slug).matchAll(/\btruecap:\s*"((?:[^"\\]|\\.)*)"/g)].map((match) => match[1]);
      for (const cell of cells) {
        if (!/nightly rate|\bADR\b/i.test(cell)) continue;
        expect(cell, `${slug}: ${cell}`).toMatch(/\bbeta\b/);
      }
    }
    expect(flat("dealcheck-for-short-term-rentals")).not.toMatch(/TrueCap models a blended ADR/);
  });

  it("claims no audience size and gives no rule of thumb without a source", () => {
    for (const slug of SLUGS) {
      const page = flat(slug);
      // "1-30 doors", "1-5 STRs", "You own 1-30 STR properties".
      expect(page.match(/\b\d+-\d+ (?:doors|STRs?\b|STR properties)/i)?.[0] ?? null, slug).toBeNull();
      expect(page.match(/\bsolo[- ]investor\b|small-portfolio STR/i)?.[0] ?? null, slug).toBeNull();
      // "75% of expected gross STR revenue / 12".
      expect(page.match(/\d+% of expected/i)?.[0] ?? null, slug).toBeNull();
    }
  });

  it("does not say the expense fields cover cleaning: the form has no cleaning or platform-fee line", () => {
    const page = flat("dealcheck-for-short-term-rentals");
    expect(page).not.toMatch(/handle the STR overhead/i);
    expect(page).toContain("no cleaning or platform-fee line");
    // The four lines the cell names are fields of the analyzer form.
    const form = [
      "components/investcalc/operating-expenses-section.tsx",
      "components/investcalc/buy-and-hold-assumptions-section.tsx",
    ]
      .map((file) => readFileSync(join(process.cwd(), file), "utf8"))
      .join("\n");
    for (const label of ['label="Utilities"', 'label="Maintenance %"', 'label="Turnover reserve / month"', 'label="Other fixed expense / month"']) {
      expect(form, label).toContain(label);
    }
    expect(form).not.toMatch(/label="[^"]*(?:cleaning|platform fee)/i);
  });

  it("does not grade itself or promise short-term underwriting in a description without the label", () => {
    for (const slug of SLUGS) {
      const found = descriptions(slug);
      // Meta, Open Graph and the WebPage JSON-LD each carry one.
      expect(found.length, slug).toBeGreaterThanOrEqual(3);
      for (const description of found) {
        expect(description, slug).not.toMatch(/\bhonest(?:ly)?\b|\bfair\b|\bunbiased\b/i);
        // Everything from the first "TrueCap" on is about TrueCap. A search
        // snippet or a link preview has no room for the lede's sentence, so it
        // says TrueCap underwrites "the deal", or it carries the label.
        const fromTrueCap = description.slice(description.indexOf("TrueCap"));
        expect(description, slug).toContain("TrueCap");
        if (/\b(?:STRs?|short-term)\b/i.test(fromTrueCap)) {
          expect(description, slug).toMatch(/\bbeta revenue screen\b/);
        }
        expect(description, slug).not.toMatch(/different jobs|market scoring|AirDNA-input/i);
      }
    }
  });
});
