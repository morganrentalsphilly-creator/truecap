import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * A link must not promise a standalone single-metric calculator and then
 * deliver either a 404 (the gated /tools pages) or the generic analyzer form.
 *
 * Two shapes of this bug shipped. The first put the promise INSIDE the anchor
 * (`<Link href="/tools/cap-rate-calculator">cap rate calculator</Link>`). The
 * second split it, so the anchor reads "DSCR" and the word "calculators" sits
 * in the following text node:
 *
 *   <Link href="/#main">cap rate</Link>{" "}and{" "}
 *   <Link href="/#main">DSCR</Link>{" "}calculators
 *
 * A regex over anchor inner-text found the first shape and was structurally
 * blind to the second, so a sweep reported "clean" while five pages — including
 * the indexed /tools/70-percent-rule-calculator — still promised two tools that
 * do not exist and pointed both links at the same href.
 *
 * This test flattens JSX whitespace expressions first, which is what makes the
 * split shape visible at all.
 */

const ROOTS = ["app", "components"];

/** /tools slugs that are gated or unreleased — these URLs 404 for visitors. */
const GATED_TOOL_SLUGS = new Set([
  "cap-rate-calculator",
  "noi-calculator",
  "cash-on-cash-calculator",
  "dscr-calculator",
  "50-percent-rule-calculator",
  "house-hacking-calculator",
  "rental-cash-flow-calculator",
  "roi-calculator",
]);

/**
 * "Open the calculator" on a CTA is honest — the analyzer is a calculator.
 * What is dishonest is naming a SPECIFIC METRIC's calculator, because that
 * promises a single-purpose tool. So the offense is metric + "calculator",
 * not the word "calculator" on its own. Testing for the metric also survives
 * labels built from a JSX expression, where an allow-list of exact generic
 * strings would not.
 */
const METRIC =
  /\b(cap rate|cash[- ]on[- ]cash|dscr|noi|roi|grm|gross rent multiplier|rental cash flow|house[- ]hacking?|[0-9]{1,2}\s?%|[0-9]{1,2}[- ]percent)\b/i;

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next") continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (full.endsWith(".tsx")) out.push(full);
  }
  return out;
}

function gatedToolHref(href: string): boolean {
  const match = /^\/tools\/([a-z0-9-]+)/.exec(href);
  return match != null && GATED_TOOL_SLUGS.has(match[1]);
}

/** A page under a gated slug is already dead; links between them are out of scope. */
function isGatedPage(path: string): boolean {
  const match = /app\/tools\/([a-z0-9-]+)\//.exec(path);
  return match != null && GATED_TOOL_SLUGS.has(match[1]);
}

type Offender = { file: string; href: string; label: string; shape: string };

function findOffenders(): Offender[] {
  const offenders: Offender[] = [];
  for (const root of ROOTS) {
    for (const file of walk(root)) {
      if (isGatedPage(file)) continue;
      // Collapse {" "} and runs of whitespace so a split anchor reads as one line.
      const flat = readFileSync(file, "utf8")
        .replace(/\{"\s*"\}/g, " ")
        .replace(/\s+/g, " ");

      const anchor = /<Link href="([^"]+)"[^>]*>(.*?)<\/Link>(.{0,90})/g;
      let match: RegExpExecArray | null;
      while ((match = anchor.exec(flat)) != null) {
        const [, href, inner, trailing] = match;
        if (!href.startsWith("/#main") && !gatedToolHref(href)) continue;

        const label = inner.replace(/<[^>]+>/g, "").trim();
        if (!METRIC.test(label)) continue;

        if (/calculator/i.test(label)) {
          offenders.push({ file, href, label, shape: "inside the anchor" });
          continue;
        }
        // The split shape: anchor says "DSCR", the next text node says "calculators".
        if (/^\s*(and\s+)?[A-Za-z ]{0,12}calculators?\b/.test(trailing)) {
          offenders.push({ file, href, label, shape: "label outside the anchor" });
        }
      }
    }
  }
  return offenders;
}

describe("links do not promise calculators the site does not ship", () => {
  it("names no standalone metric calculator that resolves to a 404 or the generic form", () => {
    const offenders = findOffenders();
    const report = offenders
      .map((o) => `  ${o.file}: "${o.label}" -> ${o.href} (${o.shape})`)
      .join("\n");
    expect(offenders, `promised calculators that do not exist:\n${report}`).toEqual([]);
  });

  it("still detects the split-anchor shape it was written for", () => {
    // Guard the guard: if the flattening regresses, this fixture stops matching
    // and the suite would go quietly green on a real regression.
    const fixture = '<Link href="/#main">DSCR</Link>{" "}calculators before you commit.';
    const flat = fixture.replace(/\{"\s*"\}/g, " ").replace(/\s+/g, " ");
    const match = /<Link href="([^"]+)"[^>]*>(.*?)<\/Link>(.{0,90})/.exec(flat);
    expect(match).not.toBeNull();
    expect(/^\s*(and\s+)?[A-Za-z ]{0,12}calculators?\b/.test(match![3])).toBe(true);
  });
});
