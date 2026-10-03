import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) =>
  readFileSync(join(process.cwd(), path), "utf8");

function expectInsideReleaseConditional(
  path: string,
  flag: string,
  needle: string,
) {
  const value = source(path);
  const fieldIndex = value.indexOf(needle);
  const conditionalIndex = value.lastIndexOf(`{${flag} ? (`, fieldIndex);
  const conditionalEnd = value.indexOf(") : null}", fieldIndex);

  expect(fieldIndex, `${path}: missing ${needle}`).toBeGreaterThan(-1);
  expect(
    conditionalIndex,
    `${path}: ${needle} is not behind ${flag}`,
  ).toBeGreaterThan(-1);
  expect(
    conditionalEnd,
    `${path}: ${flag} closes before ${needle}`,
  ).toBeGreaterThan(fieldIndex);
}

describe("retired capability copy and control boundaries", () => {
  it("does not send readers to the retired tax calculator", () => {
    const articles = [
      "app/blog/piti-explained-rental-property/page.tsx",
      "app/blog/depreciation-recapture-rental-property/page.tsx",
      "app/blog/schedule-e-rental-property/page.tsx",
      "app/blog/rental-property-tax-deductions/page.tsx",
      "app/blog/how-to-calculate-rental-property-depreciation/page.tsx",
    ]
      .map(source)
      .join("\n");

    expect(articles).not.toContain("/tools/rental-property-tax-calculator");
  });

  it("keeps anonymous tax and exit inputs behind shipped-release controls", () => {
    const path = "components/investcalc/operating-expenses-section.tsx";
    for (const field of [
      'htmlFor="buildingValuePct"',
      'htmlFor="depreciationYears"',
      'htmlFor="taxRatePct"',
      'htmlFor="include-interest-deduction"',
    ]) {
      expectInsideReleaseConditional(path, "TAX_STRATEGY_RELEASED", field);
    }
    for (const field of [
      'htmlFor="appreciationRatePct"',
      'htmlFor="sellingCostPct"',
    ]) {
      expectInsideReleaseConditional(path, "EXIT_SCENARIOS_RELEASED", field);
    }

    const value = source(path);
    expect(value.indexOf('htmlFor="expenseGrowthPct"')).toBeLessThan(
      value.indexOf("{EXIT_SCENARIOS_RELEASED ? ("),
    );
    expect(value.indexOf('htmlFor="rentGrowthPct"')).toBeLessThan(
      value.indexOf("{EXIT_SCENARIOS_RELEASED ? ("),
    );
  });

  it("keeps authenticated tax, exit, and specialist template controls dark", () => {
    const dialogPath = "components/investcalc/template-form-dialog.tsx";
    for (const field of [
      'name="buildingValuePct"',
      'name="taxRatePct"',
      'name="depreciationYears"',
      'name="includeInterestDeduction"',
    ]) {
      expectInsideReleaseConditional(
        dialogPath,
        "TAX_STRATEGY_RELEASED",
        field,
      );
    }
    for (const field of [
      'name="appreciationRatePct"',
      'name="sellingCostPct"',
      'name="buyBox.minIrrPct"',
    ]) {
      expectInsideReleaseConditional(
        dialogPath,
        "EXIT_SCENARIOS_RELEASED",
        field,
      );
    }

    const defaults = source("components/settings/user-defaults-card.tsx");
    expect(defaults).toMatch(/key: "taxRatePct"[\s\S]{0,160}release: "tax"/);
    expect(defaults).toMatch(
      /key: "appreciationRatePct"[\s\S]{0,180}release: "exit"/,
    );
    expect(defaults).toMatch(
      /key: "sellingCostPct"[\s\S]{0,180}release: "exit"/,
    );

    const templates = source(
      "components/investcalc/templates-management-page.tsx",
    );
    expect(templates).toContain("RELEASED_STARTER_TEMPLATES.map");
    expect(templates).toContain(
      'return isFeatureEnabled("brrrr_strategy_model")',
    );
    expect(templates).toContain(
      'return isFeatureEnabled("fix_flip_strategy_model")',
    );
    expect(templates).toContain('if (starter.key === "portfolio-refi")');
  });

  it("ignores an Agent Pro signup query until the server releases the plan", () => {
    const form = source("components/auth/sign-up-form.tsx");
    const page = source("app/auth/sign-up/page.tsx");

    expect(form).toContain("agentProConfigured &&");
    expect(form).toContain('searchParams.get("plan") === "agent-pro"');
    expect(page).toContain("isAgentProConfigured()");
    expect(page).toContain(
      "<SignUpForm agentProConfigured={agentProConfigured} />",
    );
  });

  it("labels archived methodology and metadata without advertising retired tools", () => {
    const methodology = source("app/methodology/page.tsx");
    expect(methodology).toContain(
      "Archived BRRRR and fix-and-flip models (reference only)",
    );
    expect(methodology).toMatch(/not currently exposed in the\s+analyzer/);

    const toolsOg = source("app/tools/opengraph-image.tsx");
    expect(toolsOg).not.toContain("BRRRR");
    // Both tool pages redirect, so neither may serve a card at all: a card
    // file is its own public route (/tools/<slug>/opengraph-image) whatever
    // the page does. Stronger than the wording checks these two lines held.
    for (const slug of ["brrrr-calculator", "rental-property-tax-calculator"]) {
      expect(
        existsSync(join(process.cwd(), `app/tools/${slug}/opengraph-image.tsx`)),
        `${slug} redirects and must not serve a social card`,
      ).toBe(false);
    }
    expect(
      existsSync(
        join(process.cwd(), "app/vs/dealcheck-for-brrrr/opengraph-image.tsx"),
      ),
    ).toBe(false);
    expect(
      existsSync(
        join(
          process.cwd(),
          "app/vs/dealcheck-for-fix-and-flip/opengraph-image.tsx",
        ),
      ),
    ).toBe(false);
  });

  it("keeps product and legal facts aligned with current availability", () => {
    const facts = source("lib/product-facts.ts");
    expect(facts).toContain(
      "New one-property purchases are temporarily unavailable; existing paid report claims remain recoverable.",
    );
    expect(facts).toContain(
      "Agent Pro checkout is not configured on this deployment.",
    );

    // Agent Pro is sold again (lib/stripe/plan-prices.ts isAgentProConfigured,
    // the /pricing card, /for-agents), and sign-up binds every agent to these
    // Terms. Until 2026-10 this test required the Terms NOT to name Agent Pro,
    // which left section 5 saying no public page promised a client workflow.
    // It now pins the wording approved on 2026-08-23 (commit 0d7b90f) and the
    // absence of that false sentence. Exit modeling is still not offered
    // (lib/entitlements-catalog.ts exit_scenarios shipped: false), and neither
    // is the client portal (agent_portal shipped: false).
    const terms = source("app/terms/page.tsx").replace(/\s+/g, " ");
    expect(terms).toContain("paid TrueCap Pro and Agent Pro subscriptions");
    expect(terms).toContain("TrueCap Pro and Agent Pro plans are billed in advance");
    expect(terms).toContain("5. Agent Pro and client information");
    expect(terms).toContain(
      "Agent Pro provides client-workspace and co-branded reporting tools.",
    );
    expect(terms).toContain(
      "Co-branding does not transfer ownership of TrueCap or authorize a white-label, resale, or sublicensing arrangement.",
    );
    expect(terms).not.toMatch(/promises that such a workflow is available/);
    expect(terms).not.toMatch(/No current public page/);
    expect(terms).not.toContain("exit modeling");
    expect(terms).not.toMatch(/client portal/i);
  });

  it("rejects the audited universal tax and return promises", () => {
    const copy = [
      "app/blog/cash-flow-vs-appreciation/page.tsx",
      "app/blog/cash-on-cash-vs-irr/page.tsx",
      "app/blog/cap-rate-vs-cash-on-cash-vs-dscr/page.tsx",
      "app/blog/best-states-for-rental-investors-2026/page.tsx",
      "app/blog/how-to-calculate-rental-property-depreciation/page.tsx",
      "app/blog/dealcheck-vs-stessa-vs-truecap/page.tsx",
    ]
      .map(source)
      .join("\n");

    expect(copy).not.toMatch(
      /1-3% effective annual return|12-18% range|3-7% to your real return|after-tax CoC and after-tax IRR are the real numbers|net-positive on an after-tax basis|real after-tax-yield boost|after-tax yield maximized|models cash flow, principal paydown, appreciation, and tax savings|illustrative tax-impact modeling/i,
    );
  });
});
