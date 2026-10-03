import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { RehabEstimatorCard } from "@/components/investcalc/rehab-estimator-card";

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
    // The total is the calculator result: one polite live region.
    expect(tool.match(/aria-live="polite"/g)).toHaveLength(1);
    // Same words. The card prints its title and its switch first; the tool
    // rendering puts the switch after the fields.
    const words = (html: string) => textOf(html).split(" ").sort().join(" ");
    expect(words(tool)).toBe(words(card));
  });
});
