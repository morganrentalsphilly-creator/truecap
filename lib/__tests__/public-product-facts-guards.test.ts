import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GET as getLlms } from "@/app/llms.txt/route";
import { GET as getLlmsFull } from "@/app/llms-full.txt/route";

const ROOT = join(import.meta.dirname, "../..");

function publicCopyFiles(directory: string): string[] {
  const root = join(ROOT, directory);
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const relative = join(directory, entry.name);
    if (entry.isDirectory()) return publicCopyFiles(relative);
    if (!/\.(?:tsx?|json|html)$/.test(entry.name)) return [];
    if (/\.(?:test|spec)\./.test(entry.name)) return [];
    return [relative];
  });
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("public product-fact drift guards", () => {
  it("does not positively claim that released underwriting imports property tax", () => {
    const files = [
      ...publicCopyFiles("app"),
      ...publicCopyFiles("components/marketing"),
      ...publicCopyFiles("emails"),
      ...publicCopyFiles("email-templates"),
    ];
    const positiveAutofill = [
      /(?:auto[- ]?(?:fill|pull)|pre[- ]?fill)(?:s|ed)?[^.;\n]{0,100}(?:state[- ](?:property[- ]?)?tax|property[- ]tax|taxes? from (?:a |your )?state)/gi,
      /(?:state[- ](?:property[- ]?)?tax|property[- ]tax)[^.;\n]{0,100}(?:auto[- ]?(?:fill|pull)|pre[- ]?fill)(?:s|ed)?/gi,
    ];

    const violations: string[] = [];
    for (const file of files) {
      const source = readFileSync(join(ROOT, file), "utf8");
      for (const pattern of positiveAutofill) {
        for (const match of source.matchAll(pattern)) {
          const text = match[0];
          const context = source.slice(
            Math.max(0, (match.index ?? 0) - 60),
            (match.index ?? 0) + text.length + 160,
          );
          if (
            /\b(?:does not|not|no)\b[^.\n]{0,140}(?:auto|pre)/i.test(context)
          ) {
            continue;
          }
          if (
            /\bkeeps?\s+property[- ]tax\s+as\s+a\s+manual(?:\s+local)?\s+input\b/i.test(
              context,
            )
          ) {
            continue;
          }
          if (/\b(?:former|retired)\b/i.test(context)) continue;
          violations.push(`${file}: ${text.replace(/\s+/g, " ").trim()}`);
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it("keeps known product-truth consumers off the retired state-tax behavior", () => {
    const consumers = [
      "lib/glossary.ts",
      "app/actions/post-analysis-email-capture.ts",
      "app/blog/1-percent-rule-rental-property/page.tsx",
      "app/blog/piti-explained-rental-property/page.tsx",
      "app/blog/best-states-for-rental-investors-2026/page.tsx",
      "app/blog/how-to-underwrite-a-rental-property-in-60-seconds/page.tsx",
      "app/markets/memphis/page.tsx",
      "app/vs/zillow-rent-estimate/page.tsx",
    ];
    const copy = consumers
      .map((file) => readFileSync(join(ROOT, file), "utf8"))
      .join("\n");

    expect(copy).not.toMatch(/defaults? to your state'?s effective rate/i);
    expect(copy).not.toMatch(/estimates taxes and insurance from the address/i);
    expect(copy).not.toMatch(
      /starts? with a state(?:-level)? property-tax estimate/i,
    );
    expect(copy).not.toMatch(/state effective-tax benchmarks when available/i);
  });

  it("keeps pricing FAQ JSON-LD on the same visible FAQ records and central facts", () => {
    const pricing = readFileSync(join(ROOT, "app/pricing/page.tsx"), "utf8");
    expect(pricing).toContain('from "@/lib/product-facts"');
    expect(pricing).toContain("const faqs = FAQS");
    expect(pricing).toContain("mainEntity: faqs.map");
    expect(pricing).toContain("PROPERTY_TAX_FACTS.notAutoFilled");
    expect(pricing).not.toContain("PRODUCT_EVALUATION_DAYS");
  });
});

describe("generated AI-facing product facts", () => {
  it("renders configured Agent Pro and Decision Pack availability", async () => {
    vi.stubEnv("STRIPE_PRICE_PRO_MONTHLY", "price_pro");
    vi.stubEnv("STRIPE_PRICE_PRO_ANNUAL", "price_pro_annual");
    vi.stubEnv("STRIPE_PRICE_AGENT_PRO_MONTHLY", "price_agent");
    vi.stubEnv("NEXT_PUBLIC_TRUECAP_DEAL_DECISION_PACK", "true");
    vi.stubEnv("TRUECAP_DECISION_PACK_CHECKOUT_ENABLED", "true");
    vi.stubEnv("NEXT_PUBLIC_SINGLE_DEAL_PRICE_VARIANT", "current");
    vi.stubEnv("STRIPE_PRICE_SINGLE_DEAL_9", "price_pack");

    const [index, full] = await Promise.all([
      getLlms().then((response) => response.text()),
      getLlmsFull().then((response) => response.text()),
    ]);

    expect(index).toContain("Agent Pro is available on this deployment.");
    expect(index).toContain("Investor Pro is available on this deployment");
    expect(index).toContain("Decision Pack is available as a non-renewing $9");
    expect(full).toContain("Agent Pro is available on this deployment");
    expect(full).toContain("Decision Pack is available as a non-renewing $9");
    expect(`${index}\n${full}`).toMatch(
      /property tax[\s\S]{0,160}(?:manual|local annual bill)/i,
    );
    expect(`${index}\n${full}`).not.toMatch(
      /Agent Pro and new one-time report purchases are not currently released/i,
    );
  });

  it("fails availability prose closed when checkout configuration is absent", async () => {
    vi.stubEnv("STRIPE_PRICE_AGENT_PRO_MONTHLY", "");
    vi.stubEnv("STRIPE_PRICE_PRO_MONTHLY", "");
    vi.stubEnv("STRIPE_PRICE_PRO_ANNUAL", "");
    vi.stubEnv("NEXT_PUBLIC_TRUECAP_DEAL_DECISION_PACK", "false");
    vi.stubEnv("TRUECAP_DECISION_PACK_CHECKOUT_ENABLED", "false");
    vi.stubEnv("STRIPE_PRICE_SINGLE_DEAL_9", "");

    const [index, full] = await Promise.all([
      getLlms().then((response) => response.text()),
      getLlmsFull().then((response) => response.text()),
    ]);

    expect(index).toContain("Agent Pro checkout is not configured");
    expect(index).toContain("Investor Pro checkout is not configured");
    expect(index).toContain(
      "New one-time report purchases are temporarily unavailable",
    );
    expect(full).toContain("Agent Pro checkout is not configured");
    expect(full).toContain(
      "New one-property purchases are temporarily unavailable",
    );
  });
});
