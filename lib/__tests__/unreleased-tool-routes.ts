import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Which /tools routes a visitor CANNOT actually use, derived from the pages
 * themselves rather than from a hand-maintained list.
 *
 * UNRELEASED_UNDERWRITING_CALCULATORS in lib/calculator-registry.ts is not the
 * whole truth, and trusting it shipped a real bug. A tool is unusable if ANY of
 * these hold, and each was missed by the registry at least once:
 *
 *   notFound()          - 9 pages do this; only 8 are in the registry, so
 *                         /tools/brrrr-calculator was invisible to the guards.
 *   permanentRedirect() - /tools/rental-property-tax-calculator sends readers
 *                         to /blog/rental-property-tax-deductions with the
 *                         comment "not part of the released product". It is in
 *                         no list at all, so a CTA labelled "rental property tax
 *                         calculator" was pointed straight at it — the exact
 *                         defect the calculator-honesty work existed to remove.
 *   no page.tsx         - nothing to serve.
 */

const TOOLS_DIR = "app/tools";

export type UnusableReason = "not-found" | "redirects-away" | "missing-page";

export function unusableToolRoutes(root = process.cwd()): Map<string, UnusableReason> {
  const out = new Map<string, UnusableReason>();
  const dir = join(root, TOOLS_DIR);
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (!statSync(full).isDirectory()) continue;
    const page = join(full, "page.tsx");
    let source: string;
    try {
      source = readFileSync(page, "utf8");
    } catch {
      out.set(entry, "missing-page");
      continue;
    }
    // Strip comments so a page merely DESCRIBING these calls is not flagged.
    const code = source.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");
    if (/\b(permanentRedirect|redirect)\s*\(\s*["'`]/.test(code)) {
      out.set(entry, "redirects-away");
    } else if (/\bnotFound\s*\(\s*\)/.test(code)) {
      out.set(entry, "not-found");
    }
  }
  return out;
}

/** True when `href` targets a /tools route a visitor cannot actually use. */
export function targetsUnusableTool(href: string, root = process.cwd()): boolean {
  const match = /^\/tools\/([a-z0-9-]+)/.exec(href);
  return match != null && unusableToolRoutes(root).has(match[1]);
}
