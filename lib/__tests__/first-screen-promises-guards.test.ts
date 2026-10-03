import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Go-to-market audit, fix batch 15 (first-screen promises), as the founder
 * answered on 2026-10-03. Each block holds one corrected claim in place.
 */

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");
/** Source with every run of whitespace collapsed, so a phrase split across
 * JSX lines is still found. */
const flat = (path: string) => read(path).replace(/\s+/g, " ");

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(join(root, dir))) {
    if (name === "__tests__" || name === "node_modules") continue;
    const rel = `${dir}/${name}`;
    if (statSync(join(root, rel)).isDirectory()) out.push(...sourceFiles(rel));
    else if (/\.(ts|tsx)$/.test(name)) out.push(rel);
  }
  return out;
}

describe("the address promise names what the analyzer asks for (P1-14)", () => {
  // Without an account an address alone produces no numbers: the analyzer
  // also needs the asking price and a bedroom count (or the rent), as
  // getListingImportMissingFields in lib/hero-handoff.ts lists them.
  const SETTLED = "an address, the asking price and a bedroom count";
  // "from an address" and its variants, unless the settled phrase follows.
  const BARE =
    /from (?:just |only )?(?:an|one|a single) address(?!, the asking price and)|from the address alone|one address away|One address\. Four answers/g;
  // Not the promise: a sentence that says the analyzer starts there and then
  // lists what else to enter, and the bio, which is the builder's own account
  // of why the tool exists (seo/author.md holds its text).
  const ALLOWED: Record<string, string> = {
    "app/blog/dealcheck-vs-stessa-vs-truecap/page.tsx": "TrueCap starts from an address. Review",
    "lib/author.ts": "a way to get from an address to a source-labeled first-pass answer",
  };
  // /pricing, /terms and /privacy are held by their own packages' guards.
  const files = [...sourceFiles("app"), ...sourceFiles("components"), ...sourceFiles("lib")].filter(
    (file) => !/^app\/(pricing|terms|privacy)\//.test(file),
  );

  it("no page, component or module promises numbers from an address alone", () => {
    const hits: string[] = [];
    for (const file of files) {
      // Comments describe the code; they are not customer copy.
      const text = flat(file)
        .replace(/\/\*.*?\*\//g, " ")
        .replace(/\{\/\*.*?\*\/\}/g, " ");
      for (const match of text.matchAll(BARE)) {
        const around = text.slice(Math.max(0, match.index - 60), match.index + 80);
        if (/^\s*\/\//.test(around)) continue;
        const allowed = ALLOWED[file];
        if (allowed && around.includes(allowed.slice(0, 40))) continue;
        hits.push(`${file}: ${around.trim()}`);
      }
    }
    expect(hits).toEqual([]);
  });

  it("the sentences the audit named carry the settled phrase", () => {
    for (const file of [
      "app/for-agents/page.tsx",
      "app/for-buy-and-hold/page.tsx",
      "app/why-truecap/page.tsx",
      "app/page.tsx",
      "app/home-authed/page.tsx",
      "app/llms.txt/route.ts",
    ]) {
      expect(flat(file), file).toContain(SETTLED);
    }
    // /analyze: the social descriptions, twice (og and twitter).
    expect(flat("app/analyze/page.tsx").split(`from ${SETTLED}. No account.`)).toHaveLength(3);
  });

  it("the analyzer still asks for exactly those fields", () => {
    const handoff = read("lib/hero-handoff.ts");
    expect(handoff).toContain('missing.push({ path: "purchasePrice", label: "asking price" });');
    expect(handoff).toContain('label: "bedrooms to estimate area rent, or monthly rent"');
  });
});

describe("the shared analyzer CTA says what is free (P2-09)", () => {
  const cta = flat("components/marketing/seo-analyzer-cta.tsx");

  it("puts the Offer Ceiling in the first complete decision, then with Pro", () => {
    expect(cta).not.toContain("Pro calculates your Offer Ceiling");
    expect(cta).toContain(
      "Your first complete decision includes the Offer Ceiling: the highest price that still meets your targets under the assumptions shown. After that, the exact figure comes with Pro.",
    );
    // The grant this describes: one exact deal without an account.
    const catalog = read("lib/entitlements-catalog.ts");
    expect(catalog).toMatch(/mao: \{[^}]*anonymousLimit: "one exact deal"/);
  });
});

describe("/for-buy-and-hold matches the Buy & Hold starter its buttons open (P1-08, P2-08, P2-11, P2-19)", () => {
  const page = flat("app/for-buy-and-hold/page.tsx");

  it("opens the analyzer on the Buy & Hold starter, which writes a rate and a tax rate", () => {
    expect(page.split('href="/analyze?strategy=buy-hold"')).toHaveLength(3);
    const starters = read("lib/starter-templates.ts");
    const longTerm = starters.slice(
      starters.indexOf('key: "long-term-rental"'),
      starters.indexOf('key: "house-hack"'),
    );
    expect(longTerm).toMatch(/propertyTaxPct: [\d.]+,/);
    expect(longTerm).toMatch(/interestRatePct: [\d.]+,/);
  });

  it("says the starter supplies the rate and the tax rate, not FRED and a manual field", () => {
    expect(page).not.toContain("FRED owner-occupied mortgage-rate benchmark can pre-fill");
    expect(page).not.toContain("property tax stays a manual local input");
    expect(page).toContain(
      "The Buy & Hold starter supplies an interest rate and a property-tax rate, labeled with the starter's name.",
    );
    // No starter number is retyped into the page.
    expect(page).not.toMatch(/6\.75|1\.5%/);
  });

  it("drops the per-item hedges, the 1-second claim and the 10-deal count", () => {
    expect(page).not.toMatch(/pencils/);
    expect(page).not.toContain("in 1 second");
    expect(page).not.toContain("Save 10 deals");
    expect(page).toContain("Save your deals");
  });
});

describe("retired hedge sentences stay out (P2-08)", () => {
  it.each([
    ["app/for-investors/page.tsx", "Not a recommended offer"],
    ["app/playbook/page.tsx", "does not tell you to make, submit, or avoid an offer"],
  ])("%s no longer says %j", (file, hedge) => {
    expect(flat(file)).not.toContain(hedge);
  });
});
