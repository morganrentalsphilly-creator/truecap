import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { RehabEstimatorCard } from "@/components/investcalc/rehab-estimator-card";
import { ArvCalculatorWidget } from "@/components/tools/arv-calculator-widget";
import { ClosingCostCalculatorWidget } from "@/components/tools/closing-cost-calculator-widget";
import { SeventyPercentRuleWidget } from "@/components/tools/seventy-percent-rule-widget";

/**
 * The template fan-out for the second group of calculator pages (audit rows
 * P2-50, P2-47, P2-71 and P2-80): the 70% rule, ARV, closing cost and rehab
 * pages and the spreadsheet page moved onto the calculator template the 1%
 * rule calculator set. Presentation only: the copy guards keep reading the
 * words where they are written; this file pins the markup.
 */

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

const sha256 = (text: string) => createHash("sha256").update(text).digest("hex");

const textOf = (html: string) =>
  html
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#x27;/g, "'")
    .replace(/\s+/g, " ")
    .trim();

// The tool rendering's handoff: the label the calculators that carry nothing
// use (calculator-handoff-validation-guards.test.tsx), and its one line.
const HANDOFF_LABEL = "Open the rental analyzer";
const HANDOFF_NOTE =
  "The rehab estimate is a planning figure and does not carry over. Enter the price you are evaluating.";

describe("the rehab estimator has two renderings of one estimate", () => {
  // The signed-in analyzer's strategies panel mounts the card with no
  // variant. The public tool page got its own rendering; the analyzer's must
  // not move. These are the SHA-256 of the default static markup recorded on
  // the commit before the variant existed (gtm/train-5 at 2bdf905b), with no
  // props and with the props the panel passes. If one changes because a
  // shared primitive changed (Input, Label, a lucide icon), check the
  // analyzer's Strategies panel and record the new value; if it changes
  // because the card's default branch was edited, that edit needs the
  // signed-in checkpoint's approval, not this test's.
  it("the default rendering is byte for byte what the analyzer mounted before", () => {
    const bare = renderToStaticMarkup(createElement(RehabEstimatorCard));
    expect(sha256(bare)).toBe("2ca886c57a228f5256c671757696afb4b666d6603a28ee6e96370a320391cdc1");
    const filled = renderToStaticMarkup(
      createElement(RehabEstimatorCard, { defaultSqft: 1850, defaultBathCount: 2 }),
    );
    expect(sha256(filled)).toBe("8200ad202a7b0bb244b22b6c84bf31823bbca402a6e886cc2aeb07698d6bc081");
    // Naming the default changes nothing.
    expect(renderToStaticMarkup(createElement(RehabEstimatorCard, { variant: "card" }))).toBe(bare);
    // It is still the card: its shell, its visible title, no calculator frame.
    expect(bare).toMatch(/^<div class="bg-card rounded-2xl border border-border shadow-sm p-5 sm:p-6">/);
    expect(bare).not.toContain("@container");
    expect(bare).not.toContain("aria-live");
  });

  it("the analyzer mounts the default and the tool page mounts the tool rendering", () => {
    const panel = read("components/investcalc/strategies-panel.tsx");
    expect(panel).toMatch(/<RehabEstimatorCard\s+defaultSqft=\{defaultSqft\}\s+defaultBathCount=\{defaultBaths\}\s+onTotalChange=/);
    expect(panel).not.toMatch(/<RehabEstimatorCard[^>]*\bvariant=/);
    expect(read("app/tools/rehab-cost-estimator/page.tsx")).toContain('<RehabEstimatorCard variant="tool" />');
  });

  it("the tool rendering says the same words on the calculator parts", () => {
    const card = renderToStaticMarkup(createElement(RehabEstimatorCard));
    const tool = renderToStaticMarkup(createElement(RehabEstimatorCard, { variant: "tool" }));
    // ToolFrame: a section on the 2px ink rule, no card, radius or shadow.
    expect(tool).toMatch(/^<section class="@container min-w-0 border-t-2 border-foreground pt-5" aria-labelledby="[^"]+">/);
    expect(tool).not.toMatch(/bg-card|rounded-2xl|shadow-sm|uppercase|tracking-widest/);
    // No icon: the title is for the outline, the switch says what it does.
    expect(tool).not.toContain("<svg");
    expect(tool).toMatch(/<h2 id="[^"]+" class="sr-only">Rehab cost estimator<\/h2>/);
    expect(tool).toMatch(/<button type="button" aria-expanded="false" aria-controls="[^"]+" class="[^"]*\bmin-h-12\b[^"]*">Pick work items<\/button>/);
    // The same three fields, with their placeholders, at the 48px field size.
    for (const placeholder of ["1850", "2", "10"]) {
      expect(tool).toContain(`placeholder="${placeholder}"`);
      expect(card).toContain(`placeholder="${placeholder}"`);
    }
    expect(tool.match(/<input\b[^>]*class="[^"]*\bh-12\b/g)).toHaveLength(3);
    // P2-48: each number field states the range lib/rehab-estimator.ts
    // clamps it to, so the browser marks a negative or absurd entry. The
    // estimate itself was never negative: the clamp is in the estimator.
    const estimator = read("lib/rehab-estimator.ts");
    expect(estimator).toContain("const sqft = Math.max(0, Number(inputs.sqft) || 0);");
    expect(estimator).toContain("const baths = Math.max(1, Number(inputs.bathCount) || 1);");
    expect(estimator).toContain("const ctgPct = Math.max(0, Math.min(50, inputs.contingencyPct ?? 10));");
    expect(tool).toMatch(/<input\b[^>]*\smin="0" step="50"[^>]*placeholder="1850"/);
    expect(tool).toMatch(/<input\b[^>]*\smin="1" step="0\.5"[^>]*placeholder="2"/);
    expect(tool).toMatch(/<input\b[^>]*\smin="0" max="50" step="1"[^>]*placeholder="10"/);
    // The total is the calculator result: one polite live region.
    expect(tool.match(/aria-live="polite"/g)).toHaveLength(1);
    // Same words, plus the analyzer handoff's label and line, which only the
    // tool rendering has (below). The card prints its title and its switch
    // first; the tool rendering puts the switch after the fields. Before the
    // handoff existed this pinned words(tool) === words(card).
    const words = (text: string) => text.split(" ").sort().join(" ");
    expect(textOf(tool).endsWith(` ${HANDOFF_LABEL} ${HANDOFF_NOTE}`)).toBe(true);
    expect(words(textOf(tool).slice(0, -` ${HANDOFF_LABEL} ${HANDOFF_NOTE}`.length))).toBe(words(textOf(card)));
  });

  it("the tool rendering hands off to the analyzer like the ARV and 70% rule calculators; the card does not", () => {
    const tool = renderToStaticMarkup(createElement(RehabEstimatorCard, { variant: "tool" }));
    const anchors = [...tool.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)];
    // One link, to the analyzer, carrying nothing: the handoff has no rehab
    // field, so the line under it says the estimate does not carry over.
    expect(anchors).toHaveLength(1);
    const [, attrs, inner] = anchors[0];
    expect(/\shref="([^"]*)"/.exec(attrs)?.[1]).toBe("/analyze?from=rehab-cost-estimator");
    expect(textOf(inner)).toBe(HANDOFF_LABEL);
    // A 48px button (the cta size), full width on phones, no icon.
    expect(attrs).toMatch(/class="[^"]*\bmin-h-12\b[^"]*\bw-full\b[^"]*\bsm:w-auto\b/);
    expect(attrs).toContain('target="_top"');
    const noteId = /\saria-describedby="([^"]+)"/.exec(attrs)?.[1];
    expect(noteId).toBeDefined();
    const note = tool.slice(tool.indexOf(`<p id="${noteId}"`));
    expect(textOf(note.slice(0, note.indexOf("</p>")))).toBe(HANDOFF_NOTE);
    // It follows the total, and it is the frame's last block.
    expect(tool.indexOf("<a ")).toBeGreaterThan(tool.indexOf('aria-live="polite"'));
    expect(tool).toMatch(/<\/p><\/section>$/);
    // The note must stay true: nothing in the handoff type takes a rehab amount.
    expect(read("lib/analyzer-handoff.ts")).not.toMatch(/rehab/i);
    const source = read("components/investcalc/rehab-estimator-card.tsx");
    expect(source).toMatch(/buildAnalyzerHandoffUrl\(\s*\{\},\s*\{ utmSource: "rehab-cost-estimator" \},?\s*\)/);
    // The analyzer's card has no link at all (and its hash above is unchanged).
    expect(renderToStaticMarkup(createElement(RehabEstimatorCard))).not.toContain("<a ");
  });
});

// ---------------------------------------------------------------------------
// The five pages and the three widgets in components/tools
// ---------------------------------------------------------------------------

const PAGES = [
  "70-percent-rule-calculator",
  "arv-calculator",
  "closing-cost-calculator",
  "rehab-cost-estimator",
  "rental-property-spreadsheet",
] as const;

const WIDGETS = [
  ["components/tools/seventy-percent-rule-widget.tsx", SeventyPercentRuleWidget],
  ["components/tools/arv-calculator-widget.tsx", ArvCalculatorWidget],
  ["components/tools/closing-cost-calculator-widget.tsx", ClosingCostCalculatorWidget],
] as const;

/** Source with comments removed, so a comment can neither pass nor trip a rule. */
const code = (path: string) =>
  read(path)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

describe("the second group of calculator pages is on the calculator template", () => {
  it.each(PAGES)("/tools/%s: hero with the tool beside the H1, one analyzer link under it", (slug) => {
    const source = code(`app/tools/${slug}/page.tsx`);
    // PageHero prints the page's one H1; the page writes none of its own.
    expect(source.match(/<PageHero\b/g)).toHaveLength(1);
    expect(source).not.toMatch(/<h1\b/);
    expect(source).toMatch(/\baside=\{/);
    // P2-80: the one short "Analyze a deal free" link, as the hero's action.
    expect(source.match(/<UnderTitleAnalyzeLink \/>/g)).toHaveLength(1);
    expect(source).toContain("actions={<UnderTitleAnalyzeLink />}");
    // Nothing above the H1, and the hub link has no arrow.
    expect(source).not.toContain("←");
    expect(source).toMatch(/<main id="main" tabIndex=\{-1\}/);
  });

  it.each(PAGES)("/tools/%s: no card chrome, icons or legacy type left in the page", (slug) => {
    const source = code(`app/tools/${slug}/page.tsx`);
    expect(source).not.toContain("lucide-react");
    expect(source).not.toMatch(/prose-slate|rounded-2xl|rounded-xl|rounded-full|shadow-|bg-primary text-primary-foreground/);
    expect(source).not.toMatch(/\btext-(?:xs|2xs|3xs)\b|\buppercase\b|tracking-widest/);
    expect(source).not.toContain("text-primary font-semibold hover:underline");
    expect(source).toContain("<ArticleBody>");
  });

  it.each(PAGES)("/tools/%s: the FAQ is ruled rows under the page's own single FAQPage node", (slug) => {
    const source = code(`app/tools/${slug}/page.tsx`);
    expect(source).not.toMatch(/<details\b/);
    const faq = /<FaqSection\b[^>]*\/>/.exec(source)?.[0] ?? "";
    expect(faq).toContain('variant="inline"');
    expect(faq).toContain("items={FAQS}");
    // The page builds faqLd from FAQS and mounts it; the section must not
    // emit a second FAQPage node for the same rows.
    expect(faq).toContain("structuredData={false}");
    expect(source.match(/<JsonLd data=\{faqLd\} \/>/g)).toHaveLength(1);
    expect(source.match(/"@type": "FAQPage"/g)).toHaveLength(1);
  });

  it("each page closes once, and the closing cost page (which has no ask of its own) not at all", () => {
    for (const slug of PAGES) {
      const closes = code(`app/tools/${slug}/page.tsx`).match(/<CloseSection\b/g) ?? [];
      expect(closes, slug).toHaveLength(slug === "closing-cost-calculator" ? 0 : 1);
    }
  });

  it("the spreadsheet's two download links keep the file and the download attribute", () => {
    const source = code("app/tools/rental-property-spreadsheet/page.tsx");
    expect(source).toContain('const DOWNLOAD_PATH = "/downloads/truecap-rental-property-analyzer.xlsx";');
    const links = [...source.matchAll(/<a\s+href=\{DOWNLOAD_PATH\}\s+download\s+className=\{cn\(buttonVariants\(\{ size: "cta" \}\), "mt-6 w-full sm:w-auto"\)\}\s*>\s*Download the spreadsheet\s*<\/a>/g)];
    expect(links).toHaveLength(2);
    // e2e/audit-free-tools.spec.ts takes the first link named "download":
    // the hero's, which comes before any other link whose text says so.
    expect(source.indexOf("Download the spreadsheet")).toBeLessThan(source.indexOf("<ArticleBody>"));
  });

  it.each(WIDGETS)("%s is set on ToolFrame with the shared field and no card or icon", (path, Widget) => {
    const source = code(path);
    expect(source).not.toContain("lucide-react");
    expect(source).not.toMatch(/bg-card|rounded-2xl|rounded-xl|shadow-|tracking-widest|\buppercase\b|\btext-(?:xs|2xs|3xs)\b/);
    expect(source).not.toMatch(/--metric-(?:positive|negative)/);
    expect(source).toContain("<ToolNumberField");
    const html = renderToStaticMarkup(createElement(Widget));
    expect(html).toMatch(/^<section class="@container min-w-0 border-t-2 border-foreground pt-5"/);
    // One key figure in DM Mono over the double rule.
    expect(html.match(/class="ledger-rule /g)).toHaveLength(1);
    // Every field is the 48px field with 16px text.
    const inputs = html.match(/<input\b[^>]*>/g) ?? [];
    expect(inputs.length).toBeGreaterThan(0);
    for (const input of inputs) expect(input).toMatch(/class="[^"]*\bh-12\b[^"]*\btext-base\b/);
    // One polite status line reads the result; the figure block adds no
    // second live region.
    expect(html.match(/aria-live="polite"/g)).toHaveLength(1);
    expect(html).toMatch(/<span class="sr-only" role="status" aria-live="polite" aria-atomic="true">/);
  });

  it("the input ids the 70% rule and closing cost fields had are the ones they have", () => {
    const rule = renderToStaticMarkup(createElement(SeventyPercentRuleWidget));
    for (const id of ["seventypct-arv", "seventypct-repairs", "seventypct-multiplier"]) {
      expect(rule, id).toMatch(new RegExp(`<input\\b[^>]*\\sid="${id}"`));
    }
    const closing = renderToStaticMarkup(createElement(ClosingCostCalculatorWidget));
    for (const id of ["cc-price", "cc-down", "cc-orig", "cc-title", "cc-record", "cc-transfer", "cc-ins", "cc-tax", "cc-appr", "cc-inspect"]) {
      expect(closing, id).toMatch(new RegExp(`<input\\b[^>]*\\sid="${id}"`));
    }
  });

  it("the closing cost handoff is the plain button with one line under it", () => {
    // It was a 14px text link between a sparkle and an arrow: "Run the full
    // analysis with these numbers — cash flow, cash-to-close, returns —
    // free". The same words, split where the first dash was.
    const source = code("components/tools/closing-cost-calculator-widget.tsx");
    expect(source).not.toMatch(/\b(?:Sparkles|ArrowUpRight)\b/);
    const html = renderToStaticMarkup(createElement(ClosingCostCalculatorWidget));
    const anchors = [...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)].filter(([, attrs]) =>
      /\shref="\/analyze\?/.test(attrs),
    );
    expect(anchors).toHaveLength(1);
    const [, attrs, inner] = anchors[0];
    expect(textOf(inner)).toBe("Run the full analysis with these numbers");
    expect(inner).not.toContain("<svg");
    expect(attrs).toMatch(/class="[^"]*\bmin-h-12\b[^"]*\bw-full\b[^"]*\bsm:w-auto\b/);
    expect(attrs).toContain('target="_top"');
    expect(attrs).toContain('aria-describedby="cc-handoff-note"');
    expect(/<p id="cc-handoff-note"[^>]*>([\s\S]*?)<\/p>/.exec(html)?.[1]).toBe(
      "cash flow, cash-to-close, returns — free",
    );
    // The handoff still carries the purchase price and nothing else.
    expect(source).toContain("? { purchasePrice: validated.purchasePrice.value }");
    expect(source).toContain('{ utmSource: "closing-cost-calculator" }');
  });
});
