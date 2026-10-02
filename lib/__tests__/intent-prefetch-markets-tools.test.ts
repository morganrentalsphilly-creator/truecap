import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Intent-only prefetch on the market, state and older calculator pages
 * (2026-10 go-to-market audit, row P2-91). The rule and its reasons are in
 * components/marketing/intent-prefetch-link.tsx; intent-prefetch-shared,
 * intent-prefetch-landing and intent-prefetch-vs hold the pages converted
 * before these.
 */

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

/** Source with comments removed, so a comment can neither pass nor trip a rule. */
const code = (path: string) =>
  read(path)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

/** Every <Link …> opening tag's attributes (braces and strings may hold ">"). */
function linkTags(source: string): string[] {
  const out: string[] = [];
  for (const match of source.matchAll(/<Link(?=[\s/>])/g)) {
    const start = (match.index ?? 0) + match[0].length;
    let depth = 0;
    let quote: string | null = null;
    let i = start;
    for (; i < source.length; i += 1) {
      const c = source[i];
      if (quote) {
        if (c === quote) quote = null;
        continue;
      }
      if (c === '"' || c === "'" || c === "`") quote = c;
      else if (c === "{") depth += 1;
      else if (c === "}") depth -= 1;
      else if (c === ">" && depth === 0) break;
    }
    out.push(source.slice(start, i));
  }
  return out;
}

describe("P2-91: market, state and older calculator pages prefetch on intent", () => {
  // Scrolling /markets at 390px requested 105 to 137 route payloads (about
  // 0.9 MB): every city link was a default next/link. Links now go through
  // IntentPrefetchLink (hover or keyboard focus); the only plain next/link
  // left in these files is /analyze with prefetch={false}, which the
  // analyzer guards read as <Link>. The list is files, not rendered pages:
  // a block a page mounts from elsewhere is covered only if it is listed.
  const PAGES = [
    "app/markets/page.tsx",
    "app/markets/[city]/page.tsx",
    "app/markets/[city]/[strategy]/page.tsx",
    "app/states/page.tsx",
    "app/states/[slug]/page.tsx",
    "components/marketing/safe-market-page.tsx",
    "app/tools/2-percent-rule-calculator/page.tsx",
    "app/tools/70-percent-rule-calculator/page.tsx",
    "app/tools/arv-calculator/page.tsx",
    "app/tools/break-even-calculator/page.tsx",
    "app/tools/closing-cost-calculator/page.tsx",
    "app/tools/gross-rent-multiplier-calculator/page.tsx",
    "app/tools/mortgage-payment-calculator/page.tsx",
    "app/tools/vacancy-rate-calculator/page.tsx",
    "app/tools/rehab-cost-estimator/page.tsx",
    "app/tools/rental-property-spreadsheet/page.tsx",
    // A widget, not a page: it renders on /tools/70-percent-rule-calculator
    // (and in its embed frame) and links the ARV calculator, so the page
    // prefetched that route as soon as the widget was in view.
    "components/tools/seventy-percent-rule-widget.tsx",
  ];

  it.each(PAGES)("%s", (path) => {
    const source = code(path);
    const eager = linkTags(source).filter(
      (attrs) => !(/\bhref="\/analyze(?:[?#"]|$)/.test(attrs) && /\bprefetch=\{false\}/.test(attrs)),
    );
    expect(eager.map((attrs) => attrs.replace(/\s+/g, " ").trim())).toEqual([]);
    expect(source).toMatch(/<IntentPrefetchLink\b/);
    expect(source).toContain('from "@/components/marketing/intent-prefetch-link"');
    // No next/link import left behind where no <Link> remains.
    if (linkTags(source).length === 0) expect(source).not.toMatch(/from "next\/link"/);
  });

  it("the markets hub still lists every city as a crawlable link", () => {
    const hub = code("app/markets/page.tsx");
    expect(hub).toMatch(
      /<IntentPrefetchLink\s+href=\{`\/markets\/\$\{city\.slug\}`\}\s+data-market-city-link=""/,
    );
  });

  it("reads tags the way the rule assumes", () => {
    expect(linkTags('<Link href="/pricing" onClick={() => a > b}>x</Link>')).toHaveLength(1);
    expect(linkTags('<IntentPrefetchLink href="/pricing">x</IntentPrefetchLink>')).toEqual([]);
  });
});
