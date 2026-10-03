/**
 * The rule-of-thumb calculators carry no second count (founder answer 17 of
 * 2026-10-03, report row P2-19: nothing unmeasured is published).
 *
 * The 1%, 2%, 50% and GRM pages, the GRM social card and two registry lines
 * called their rule a "3-second", "5-second" or "10-second" check. Nobody
 * timed any of them, so each sentence now says what the rule is for (a
 * first-pass filter, triage or screening ratio) with no figure.
 *
 * Scope: every file under app/tools and lib/calculator-registry.ts. A link to
 * the post named "…in 60 seconds" and that post's name as link text are the
 * post's title, not a figure for a calculator, and are skipped. Formulas and
 * example amounts are not time figures.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();

function sourceFiles(directory: string): string[] {
  return readdirSync(join(ROOT, directory)).flatMap((name) => {
    const path = `${directory}/${name}`;
    if (statSync(join(ROOT, path)).isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(name) ? [path] : [];
  });
}

describe("rule-of-thumb calculators state no second count", () => {
  const files = [...sourceFiles("app/tools"), "lib/calculator-registry.ts"];
  const SECOND_COUNT = /\b(?:\d+|three|five|ten|thirty|ninety)[- ]seconds?\b|\bunder a minute\b/i;

  it("reads the calculator pages and the registry", () => {
    expect(files.length).toBeGreaterThan(20);
    expect(files).toContain("app/tools/50-percent-rule-calculator/page.tsx");
    expect(files).toContain("app/tools/gross-rent-multiplier-calculator/opengraph-image.tsx");
  });

  it("no calculator page, card or registry line calls a rule an N-second check", () => {
    const hits: string[] = [];
    for (const file of files) {
      const text = readFileSync(join(ROOT, file), "utf8")
        .replace(/href="\/blog\/[^"]*60-seconds"/g, " ")
        .replace(/how to underwrite a rental property in 60 seconds/g, " ")
        .replace(/60-second underwriting workflow/g, " ");
      text.split("\n").forEach((line, index) => {
        if (SECOND_COUNT.test(line)) hits.push(`${file}:${index + 1}: ${line.trim()}`);
      });
    }
    // One sentence is left on purpose: the cap rate page says investors run
    // cap rate "often within 60 seconds of seeing the listing". It describes
    // a habit, not a calculator or a rule, and is outside the three counts
    // the founder's answer names; it is reported as an open question.
    expect(hits.filter((hit) => !/within 60 seconds of seeing the listing/.test(hit))).toEqual([]);
  });

  it("the reworded sentences still say what each rule is for", () => {
    const read = (file: string) => readFileSync(join(ROOT, file), "utf8");
    expect(read("app/tools/1-percent-rule-calculator/page.tsx")).toContain(
      "A first-pass filter for whether a rental property is worth a deeper underwrite.",
    );
    expect(read("app/tools/50-percent-rule-calculator/page.tsx")).toContain("A first-pass expense triage:");
    expect(read("app/tools/gross-rent-multiplier-calculator/page.tsx")).toContain(
      "a first-pass screening ratio for triaging deals",
    );
    const registry = read("lib/calculator-registry.ts");
    expect(registry).toContain("A first-pass screening ratio for triaging rental deals.");
    expect(registry).toContain("First-pass expense triage:");
    expect(read("app/tools/50-percent-rule-calculator/page.tsx")).toContain(
      "has earned the full underwrite",
    );
  });
});
