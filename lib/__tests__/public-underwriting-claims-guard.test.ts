import { readdirSync, readFileSync } from "node:fs";
import { extname, join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const PUBLIC_ROOTS = ["app/pricing", "app/vs", "app/blog"] as const;
const PUBLIC_FILES = [
  "app/page.tsx",
  "components/marketing/marketing-hero.tsx",
  "components/marketing/landing-sections.tsx",
  "lib/product-facts.ts",
] as const;
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx"]);

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
          violations.push(`${relative(ROOT, file)}: ${match[0].replace(/\s+/g, " ")}`);
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it("frames the PDF around underwriting result and rule fit, not a score-led acquisition directive", () => {
    const generator = readFileSync(join(ROOT, "lib/pdf-generator.ts"), "utf8");

    expect(generator).toContain('doc.text("UNDERWRITING RESULT"');
    expect(generator).toContain('doc.text("RULE FIT"');
    expect(generator).not.toContain("ACQUISITION DECISION");
    expect(generator).not.toContain('doc.text("SCREENING INDEX"');
    // Stored score data remains part of the report contract for compatibility;
    // this guard changes hierarchy, not formulas or historical snapshots.
    expect(generator).toContain("dealScore: number");
  });
});
