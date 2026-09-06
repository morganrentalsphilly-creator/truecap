import { readdirSync, readFileSync } from "node:fs";
import { extname, join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const PUBLIC_ROOTS = [
  "app/pricing",
  "app/vs",
  "app/blog",
  "app/tools",
  "app/markets",
  "app/states",
] as const;
const PUBLIC_FILES = [
  "app/page.tsx",
  "app/for-agents/page.tsx",
  "components/marketing/marketing-hero.tsx",
  "components/marketing/landing-sections.tsx",
  "emails/lifecycle-content/trial-day1.json",
  "emails/lifecycle-content/welcome.json",
  "lib/product-facts.ts",
] as const;
const SOURCE_EXTENSIONS = new Set([".json", ".ts", ".tsx"]);

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return SOURCE_EXTENSIONS.has(extname(entry.name)) ? [path] : [];
  });
}

function withoutComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

const FORBIDDEN_PUBLIC_CLAIMS = [
  /\bTrueCap\s+decides?\b/i,
  /\bTrueCap\s+(?:is\s+)?(?:the\s+)?(?:calculator|underwriter)[\s\S]{0,80}\bdecides?\b/i,
  /\bTrueCap\s+recommends?\b/i,
  /\bTrueCap\s+helps?\s+you\s+decide\b/i,
  /\bTrueCap\s+underwrites?[\s\S]{0,80}\bworth buying\b/i,
  /\bworth buying\b/i,
  /\brecommended stack\b/i,
  /\bplain-English verdict\b/i,
  /\bopinionated verdict\b/i,
  /\bScreening Index\s*\+\s*verdict\b/i,
  /\bverdict on whether to buy\b/i,
  /\b(?:address|listing)[- ]to[- ](?:decision|verdict)\b/i,
  /\bGet your verdict\b/i,
  /\bNew one-time (?:PDF|report|Decision Pack)[\s\S]{0,80}\b(?:is|are)\s+(?:also\s+)?available\b/i,
  /\b(?:Buy|Purchase|Unlock)\s+(?:the\s+)?(?:\$5\s+)?(?:Deal\s+)?Decision Pack\b/i,
  /\$5\s+(?:one-time|Decision Pack)\b/i,
  /\bcomplete first-pass rental underwrit(?:e|ing)\b/i,
  /\bunlimited full underwrites?\b/i,
  /\bfull verdict\b/i,
  /\bHUD Fair Market Rent for the exact address\b/i,
  /\byear[- ]2 move[- ]out modeling\b/i,
  /\b10-year projection for the year[- ]2 transition\b/i,
  /\bit['’]s the guarantee condition\b/i,
  /\bonly tour the ones that pass\b/i,
  /\botherwise,\s*walk\b/i,
  /\bpass all six\b/i,
] as const;

describe("public underwriting claims", () => {
  it("leaves the investment decision with the user and keeps disabled Pack checkout unadvertised", () => {
    const violations: string[] = [];

    const files = [
      ...PUBLIC_FILES.map((file) => join(ROOT, file)),
      ...PUBLIC_ROOTS.flatMap((root) => sourceFiles(join(ROOT, root))),
    ];
    for (const file of files) {
      const visibleSource = withoutComments(readFileSync(file, "utf8"));
      for (const pattern of FORBIDDEN_PUBLIC_CLAIMS) {
        const match = visibleSource.match(pattern);
        if (match) {
          violations.push(
            `${relative(ROOT, file)}: ${match[0].replace(/\s+/g, " ")}`,
          );
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it("frames the PDF around underwriting result and rule fit, not a score-led acquisition directive", () => {
    const generator = readFileSync(join(ROOT, "lib/pdf-generator.ts"), "utf8");

    expect(generator).toContain('doc.text("UNDERWRITING RESULT"');
    expect(generator).toContain('doc.text("BUY BOX FIT"');
    expect(generator).not.toContain("ACQUISITION DECISION");
    expect(generator).not.toContain('doc.text("SCREENING INDEX"');
    // Stored score data remains part of the report contract for compatibility;
    // this guard changes hierarchy, not formulas or historical snapshots.
    expect(generator).toContain("dealScore: number");
  });

  it("keeps the House Hack live-in screen separate from a later full-rental scenario", () => {
    const page = readFileSync(
      join(ROOT, "app/tools/house-hacking-calculator/page.tsx"),
      "utf8",
    );

    expect(page).toContain("TrueCap does not switch occupancy automatically");
    expect(page).toContain("Save a separate full-rental scenario");
    expect(page).not.toMatch(/year[- ]2 move[- ]out modeling/i);
    expect(page).not.toContain("10-year projection for the year-2 transition");
  });

  it("keeps the 60-second article framed as a preliminary screen", () => {
    const page = withoutComments(
      readFileSync(
        join(
          ROOT,
          "app/blog/how-to-underwrite-a-rental-property-in-60-seconds/page.tsx",
        ),
        "utf8",
      ),
    );

    expect(page).toContain("How to screen a rental property in 60 seconds");
    expect(page).toContain("not a complete underwrite or a decision to buy");
    expect(page).toContain(
      "unknown unresolved instead of turning it into zero",
    );
    expect(page).toContain(
      "not a substitute for property-specific rent evidence",
    );
    expect(page).not.toMatch(/use FMR instead/i);
    expect(page).not.toMatch(/quote-able in 60 seconds/i);
    expect(page).not.toMatch(/otherwise,\s*walk/i);
    expect(page).not.toMatch(/pass all six/i);
  });

  it("keeps the 50-percent rule subordinate to the category-level model", () => {
    const page = withoutComments(
      readFileSync(
        join(ROOT, "app/tools/50-percent-rule-calculator/page.tsx"),
        "utf8",
      ),
    );

    expect(page).toContain(
      "not a property-specific NOI, cash-flow forecast, or decision rule",
    );
    expect(page).toContain(
      "Keep the distinction explicit even in a quick screen",
    );
    expect(page).not.toMatch(/difference doesn['’]t matter/i);
    expect(page).not.toMatch(/strong candidate for a full underwrite/i);
  });

  it("describes the free DealCheck alternative as a preliminary screen", () => {
    const page = withoutComments(
      readFileSync(
        join(ROOT, "app/blog/best-dealcheck-alternatives/page.tsx"),
        "utf8",
      ),
    );

    expect(page).toContain(
      "Free preliminary rental screens with no signup or analysis cap",
    );
    expect(page).toContain(
      "Labeled HUD rent and FRED rate benchmarks; manual local property tax",
    );
    expect(page).not.toMatch(/Best free tier\s*[—-]\s*full underwrite/i);
    expect(page).not.toMatch(/HUD rent[^\n]{0,100}populate live/i);
  });

  it("keeps lifecycle onboarding aligned with free access and current guarantee policy", () => {
    const welcome = JSON.parse(
      readFileSync(join(ROOT, "emails/lifecycle-content/welcome.json"), "utf8"),
    ) as { cta_text?: string };
    const trialDayOne = JSON.parse(
      readFileSync(
        join(ROOT, "emails/lifecycle-content/trial-day1.json"),
        "utf8",
      ),
    ) as { preheader?: string };

    expect(welcome.cta_text).toBe("Analyze a property free");
    expect(trialDayOne.preheader).not.toMatch(/guarantee/i);
  });

  it("uses a no-purchase waitlist state when Agent Pro is not configured", () => {
    const page = withoutComments(
      readFileSync(join(ROOT, "app/for-agents/page.tsx"), "utf8"),
    );

    expect(page).toContain(
      "mailto:hello@usetruecap.com?subject=Agent%20Pro%20waitlist",
    );
    expect(page).toContain('"Email to join Agent Pro waitlist"');
    expect(page).toContain("Agent Pro is not accepting new subscriptions yet.");
    expect(page).toContain(
      "Sending a waitlist request does not start a trial or subscription",
    );
    expect(page).not.toMatch(/\bverdict\b/i);
  });

  it("documents historical Pack risk enforcement without claiming durable fulfillment", () => {
    const safetyMap = readFileSync(
      join(ROOT, "docs/ADVOCACY_DECISION_SAFETY_MAP.md"),
      "utf8",
    );
    const recoveryContract = readFileSync(
      join(ROOT, "docs/ONE-TIME-PDF-SECURITY.md"),
      "utf8",
    );

    expect(safetyMap).toContain(
      "Partial or full refunds and lost disputes revoke",
    );
    expect(safetyMap).toContain("do not make fulfillment");
    expect(safetyMap).not.toContain(
      "refund/dispute lifecycle, or Pack reconcile",
    );
    expect(recoveryContract).toContain(
      "approved the refund/dispute policy on 2026-08-24",
    );
    expect(recoveryContract).toContain("do not\nactivate new Pack sales");
    expect(recoveryContract).not.toContain(
      "the current product always writes\n`not_configured`",
    );
    expect(recoveryContract).not.toContain(
      "Before activation, the founder must approve",
    );
  });
});
