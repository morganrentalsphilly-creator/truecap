import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  PRODUCT_EVALUATION_COMPARISON_LIMIT,
  PRODUCT_EVALUATION_DEAL_LIMIT,
  PRODUCT_EVALUATION_DAYS,
} from "@/lib/product-access";
import { FEATURE_CATALOG, featureLimit, tierHas } from "@/lib/entitlements-catalog";
import { PLAN_CATALOG } from "@/lib/public-pricing";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { unusableToolRoutes } from "./unreleased-tool-routes";

/**
 * Regression guards for two promise-vs-product contradictions fixed in the
 * July 2026 core-product audit (style follows deal-score-free-gate.test.ts:
 * lock the policy in the catalog, then scan the copy surfaces so a future
 * edit can't silently re-contradict it).
 *
 * 1. Saved-deal copy: runtime truth (app/actions/saved-analyses.ts) is that
 *    Free CAN create up to 5 deals (save_deal + max_saved_deals=5) while
 *    UPDATING a saved deal is Pro-gated. Three surfaces used to disagree —
 *    the pricing card promised saving with no editing caveat, the homepage
 *    FAQ claimed saving was Pro-only, and the pricing FAQ claimed downgraded
 *    users lose the ability to CREATE.
 *
 * 2. Trial copy: checkout (app/actions/billing.ts) only grants the trial to
 *    FIRST-time subscribers (grantTrial = !priorSubscription, any status).
 *    /pricing used to promise the trial unconditionally to returning
 *    ex-subscribers whose checkout charges immediately.
 */

function read(rel: string): string {
  return readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8");
}

describe("saved-deal copy — surfaces stay aligned with the runtime gates", () => {
  it("catalog policy: Free saves up to 5, Pro unlimited", () => {
    expect(tierHas("free", "save_deal")).toBe(true);
    expect(featureLimit("save_deal", "free")).toBe("up to 5");
    expect(featureLimit("save_deal", "pro")).toBe("unlimited");
  });

  it("pricing card's Free save bullet carries the editing caveat", () => {
    const source = read("../../components/marketing/pricing-toggle-plans.tsx");
    expect(source).toContain("Save up to 5 deals (editing saved deals is Pro)");
    // The bare bullet promised editing the update path doesn't deliver.
    expect(source).not.toContain('"Save up to 5 deals"');
  });

  it("homepage FAQ no longer claims saving is Pro-only", () => {
    // FaqSection moved to its own module; the homepage FAQ renders through it.
    const source = `${read("../../components/marketing/landing-sections.tsx")}\n${read("../../components/marketing/faq-section.tsx")}`;
    // "Pro adds save/compare deals" contradicted both the pricing card and
    // the runtime (free plan grants save_deal with a cap of 5).
    expect(source).not.toContain("Pro adds save/compare deals");
    // "plus save deals" in the upgrade FAQ implied the same falsehood.
    expect(source).not.toContain("plus save deals");
  });

  it("/about does not claim saving is a paid-plan add-on", () => {
    // The E-E-A-T page every blog byline points to said a paid plan "adds
    // saved deals" — Free saves up to 5; Pro adds unlimited saves + editing.
    const source = read("../../app/about/page.tsx");
    expect(source).not.toContain("adds saved deals");
    expect(source).toContain("adds unlimited saved deals you can edit");
    expect(source).toContain("up to 5 saved deals");
  });

  it("pricing FAQ no longer claims downgraded users lose CREATE", () => {
    const source = read("../../app/pricing/page.tsx");
    // Under the 5-deal cap, Free users can still create saves — only
    // editing is Pro-gated.
    expect(source).not.toContain("lose the ability to create or update");
  });
});

describe("no-card product evaluation", () => {
  it("locks the published duration and usage allowances", () => {
    expect(PRODUCT_EVALUATION_DAYS).toBe(21);
    expect(PRODUCT_EVALUATION_DEAL_LIMIT).toBe(3);
    expect(PRODUCT_EVALUATION_COMPARISON_LIMIT).toBe(1);
  });

  it("keeps Stripe checkout separate from the evaluation", () => {
    const billing = read("../../app/actions/billing.ts");
    expect(billing).toContain("trialDays: 0");
    expect(billing).not.toContain('from "@/lib/trial"');
    expect(billing).not.toContain("process.env.PRO_TRIAL_DAYS");
  });

  it("does not turn metered PDF access into an unmetered fourth Pro deal", () => {
    const entitlements = read("../../lib/entitlements.ts");
    const capabilities = read("../../lib/analyzer-capabilities.ts");
    expect(entitlements).toContain(
      '...(access.canAnalyzeProDeal ? ["projections"] : [])',
    );
    expect(capabilities).not.toMatch(
      /canUseProjections:[\s\S]{0,180}hasEvaluationArtifactAccess/,
    );
  });

  it("starts at signup without auto-opening checkout", () => {
    const plans = read("../../components/marketing/pricing-toggle-plans.tsx");
    const buttons = read("../../components/marketing/pricing-plan-buttons.tsx");
    const signup = read("../../components/auth/sign-up-form.tsx");
    // The Pro card's anonymous CTA starts the no-card evaluation. The Agent
    // Pro card's cannot claim to (the evaluation never includes the client
    // roster — lib/entitlements.ts), so it promises only the free account.
    expect(buttons).toContain("`Start ${tierName} evaluation — no card`");
    expect(buttons).toContain('"Create a free account — no card"');
    expect(buttons).toContain("plan=${plan}&billing=${billing}");
    expect(buttons).not.toContain("resolveCheckoutResumeForSlot");
    // The allowance is stated once, under the CTA, in every trial state
    // (2026-09 audit removed the duplicate pill beside the price).
    expect(plans).toContain("New account: $0 today, no card.");
    // The deal and comparison limits are interpolated from lib/product-access
    // beside the day count. They were typed as words ("three ... one"), which
    // a limit change would have left stale on /pricing and on sign-up.
    expect(plans).toContain("includes {PRODUCT_EVALUATION_DEAL_LIMIT} complete");
    expect(plans).toMatch(
      /Pro deals and \{PRODUCT_EVALUATION_COMPARISON_LIMIT\} comparison\./,
    );
    expect(signup).toContain(
      "Complete {PRODUCT_EVALUATION_DEAL_LIMIT} Pro analyses and",
    );
    expect(signup).toContain("{PRODUCT_EVALUATION_COMPARISON_LIMIT} full comparison.");
    // Row P1-07: the sign-up box says what the trial counts. The ledger holds
    // one row per distinct set of inputs (lib/evaluation-resource-key.ts).
    expect(signup).toMatch(
      /full comparison\. A rerun with\s+changed inputs counts as a new analysis\./,
    );
    for (const source of [plans, signup]) {
      expect(source).not.toMatch(
        /\b(?:one|two|three|four|five)\s+(?:complete\s+|full\s+)?(?:Pro\s+deal|comparison)/i,
      );
    }
    expect(signup).toContain("Nothing auto-renews");
    expect(signup).toContain("No card is requested and no subscription starts today");
  });

  it("names what the trial leaves out: co-branding and, for Agent Pro, the roster", () => {
    // Runtime truth: the evaluation grants neither custom_branding nor
    // client_buy_box. The homepage once said the co-branded send was
    // "included in your first complete decision", and the trial sentences
    // excluded only the roster, so an agent could sign up to try the
    // co-branded memo and find it locked.
    const entitlements = read("../../lib/entitlements.ts");
    const evaluation = entitlements.slice(
      entitlements.indexOf("const evaluationFeatures = ["),
      entitlements.indexOf("] as const;", entitlements.indexOf("const evaluationFeatures = [")),
    );
    expect(evaluation).toContain('"cash_flow"');
    expect(evaluation).not.toContain("custom_branding");
    expect(evaluation).not.toContain("client_buy_box");
    expect(FEATURE_CATALOG.custom_branding.anonymousLimit).toBeUndefined();

    const plans = read("../../components/marketing/pricing-toggle-plans.tsx");
    const agentPage = read("../../app/for-agents/page.tsx");
    const faqs = read("../../lib/agent-faqs.ts");
    const signup = read("../../components/auth/sign-up-form.tsx");
    const home = read("../../components/marketing/landing-sections.tsx");
    expect(plans).toContain(
      "Co-branded share pages and PDFs start with a Pro or Agent Pro subscription, and the client roster and client Buy Boxes with Agent Pro, not the trial.",
    );
    expect(plans).toContain("Co-branded share pages and PDFs start with a Pro subscription, not the trial.");
    expect(agentPage).toMatch(/Co-branding,\s+the client roster and client Buy Boxes are part of the Agent Pro\s+subscription, not the trial\./);
    expect(faqs).toContain(
      "Co-branding, client rosters and client Buy Boxes are part of the Agent Pro subscription, not the trial",
    );
    expect(signup).toMatch(
      /selectedPlan === "agent-pro"\s*\?\s*"Co-branding, the client roster and client Buy Boxes are part of the Agent Pro subscription, not the trial\. "/,
    );
    expect(home).toContain("co-branding comes with Pro and Agent Pro");
    expect(home).not.toContain('proNote: "Included in your first complete decision"');
  });

  it("does not sell the no-card trial as an Agent Pro trial", () => {
    const agentPage = read("../../app/for-agents/page.tsx");
    const faqs = read("../../lib/agent-faqs.ts");
    // The close's third price column is the trial, labeled as the trial.
    expect(agentPage).not.toMatch(/<dt[^>]*>To start<\/dt>/);
    expect(agentPage).toMatch(/<dt[^>]*>Free trial<\/dt>/);
    expect(faqs).not.toMatch(/Agent Pro trial/i);
  });

  it("shows the immediate charge only when the user explicitly subscribes", () => {
    const buttons = read("../../components/marketing/pricing-plan-buttons.tsx");
    const plans = read("../../components/marketing/pricing-toggle-plans.tsx");
    expect(buttons).toContain("Subscribe — {priceLabel ?? \"shown price\"} today");
    expect(plans).toContain("priceLabel={proChargeToday}");
    expect(plans).toContain("checkoutReady=");
  });

  it("fails closed when subscription history cannot be verified", () => {
    const entitlements = read("../../lib/entitlements.ts");
    const historyHelper = entitlements.slice(
      entitlements.indexOf("export async function hasAnySubscriptionHistory"),
      entitlements.length
    );
    expect(historyHelper).toMatch(/if \(error\)[\s\S]*return true;/);
  });

  it("drives signed-in evaluation copy from the real record and usage ledger", () => {
    const page = read("../../app/pricing/page.tsx");
    const plans = read("../../components/marketing/pricing-toggle-plans.tsx");
    const cancelled = read("../../components/marketing/checkout-cancelled-banner.tsx");

    expect(page).toContain("getProductEvaluationAccessForUser(supabase, user.id)");
    expect(page).toContain("summarizePricingEvaluation(productEvaluationAccess)");
    expect(page).toContain("evaluation={pricingEvaluation}");
    expect(plans).not.toContain("evaluationEligible = !hadPriorSubscription");
    expect(plans).toContain('evaluation.status === "exhausted"');
    expect(plans).toContain('evaluation.status === "expired"');
    expect(cancelled).toContain('evaluation.status === "active"');
  });
});

describe("pricing offer hierarchy", () => {
  it("does not imply that every Pro PDF includes comps", () => {
    const plans = read("../../components/marketing/pricing-toggle-plans.tsx");
    expect(plans).not.toMatch(/report[^\n]*with[^\n]*comps/i);
  });

  it("does not market white-label embeds while that license is on hold", () => {
    const agentPage = read("../../app/for-agents/page.tsx");
    expect(agentPage).not.toMatch(/white-label embeds/i);
  });

  it("puts Pro first in the mobile viewport and keeps Agent behind it", () => {
    const plans = read("../../components/marketing/pricing-toggle-plans.tsx");
    // The cards are PlanCards: Pro first on phones, Free second, Agent Pro
    // third; from 768px the row reads Free, Pro, Agent Pro.
    expect(plans).toMatch(/<PlanCard\s+id="pro"\s+className="order-1 md:order-2[\s"]/);
    expect(plans).toMatch(/<PlanCard\s+className="order-2 md:order-1"\s+name="Free"/);
    expect(plans).toMatch(/<PlanCard\s+id="agent-pro"\s+className="order-3[\s"]/);
  });

  it("does not advertise the temporarily disabled Decision Pack", () => {
    const page = read("../../app/pricing/page.tsx");
    expect(page).not.toContain("Not ready for a subscription?");
    expect(page).not.toContain("TrueCap Deal Decision Pack");
    expect(page).not.toContain("singleDeal.priceLabel");
  });

  it("derives the /profile annual badge from the prices beside it, never a typed percent", () => {
    // The plan switcher printed "17% off" in three places. It is now computed
    // from the two Pro prices the switcher shows (Stripe), with the catalog
    // standing in when Stripe does not answer.
    const profile = read("../../app/profile/page.tsx");
    expect(profile).not.toMatch(/\d+%\s+(?:off|savings)/);
    expect(profile).toContain("PLAN_CATALOG.pro_monthly.unitAmountUsd");
    expect(profile).toContain("PLAN_CATALOG.pro_annual.unitAmountUsd");
    expect(profile).toContain("displays?.pro_monthly?.unitAmount");
    expect(profile).toContain("displays?.pro_annual?.unitAmount");
    expect(profile).toContain('badge: slug === "pro_annual" ? proAnnualOffLabel : undefined');
    // Annual has to save something at catalog prices for a badge to exist.
    expect(PLAN_CATALOG.pro_annual.unitAmountUsd).toBeLessThan(
      PLAN_CATALOG.pro_monthly.unitAmountUsd * 12,
    );
  });
});

describe("billing recovery safety", () => {
  it("blocks a second checkout for unpaid and paused subscriptions", () => {
    const billing = read("../../app/actions/billing.ts");
    const panel = read("../../components/profile/billing-panel.tsx");
    const pricing = read("../../app/pricing/page.tsx");
    const plans = read("../../components/marketing/pricing-toggle-plans.tsx");

    expect(billing).toContain(
      '["active", "trialing", "past_due", "unpaid", "paused"]'
    );
    expect(panel).toContain('["unpaid", "paused"]');
    expect(panel).toContain("Manage billing to reactivate");
    expect(pricing).toContain("hasCheckoutRecoverySubscription");
    expect(plans).toContain("billingRecoveryRequired");
    expect(plans).toContain('href="/profile#billing"');
  });

  it("fails closed when Stripe cannot verify existing subscriptions", () => {
    const billing = read("../../app/actions/billing.ts");
    expect(billing).toContain("guard: \"stripe_subscriptions_list\"");
    expect(billing).toContain("We couldn't safely verify your Stripe subscriptions");
  });

  it("loads canceled history so the inactive actual-rate display can render", () => {
    const profile = read("../../app/profile/page.tsx");
    expect(profile).toContain(
      '["active", "trialing", "past_due", "unpaid", "paused", "canceled"]'
    );
    expect(profile).toContain("subscriptions.find");
  });
});

/**
 * 3. First-decision features: the Offer Ceiling and the downside sensitivity
 *    grid are included in the anonymous first decision (FEATURE_CATALOG
 *    anonymousLimit; ANON_ANALYZER_PROPS grants canUseMaxOffer +
 *    canUseSensitivity) and are Pro AFTER that. The homepage, /pricing and
 *    /analyze all say so. Tool, /vs and blog pages used to label them a flat
 *    "(Pro)", so a visitor arriving from a tool page was told the Offer
 *    Ceiling was paid and then saw it free in the analyzer.
 */
describe("first-decision features are never labelled a flat \"(Pro)\" on marketing copy", () => {
  const ROOT = process.cwd();
  const FLAT_PRO_RE = /(Offer Ceiling|[Ss]ensitivity)[^.()]{0,40}\(Pro\)/;

  function pagesUnder(dir: string, skip: Set<string> = new Set()): string[] {
    const out: string[] = [];
    for (const entry of readdirSync(join(ROOT, dir))) {
      const rel = join(dir, entry);
      if (!statSync(join(ROOT, rel)).isDirectory() || skip.has(entry)) continue;
      const page = join(rel, "page.tsx");
      try {
        statSync(join(ROOT, page));
        out.push(page);
      } catch {
        /* no page in this folder */
      }
    }
    return out;
  }

  it("catalog policy: both features carry an anonymous first-decision allowance", () => {
    expect(FEATURE_CATALOG.mao.anonymousLimit).toBeTruthy();
    expect(FEATURE_CATALOG.sensitivity.anonymousLimit).toBeTruthy();
  });

  it("released tools, /vs and blog pages do not contradict the first-decision promise", () => {
    // Redirect stubs under /tools never render their CTA lists; only the
    // routes a visitor can actually reach are scanned.
    const unreleased = new Set(unusableToolRoutes(ROOT).keys());
    const pages = [
      ...pagesUnder("app/tools", unreleased),
      ...pagesUnder("app/vs"),
      ...pagesUnder("app/blog"),
    ];
    expect(pages.length).toBeGreaterThan(20);
    const offenders = pages.filter((page) =>
      FLAT_PRO_RE.test(readFileSync(join(ROOT, page), "utf8")),
    );
    expect(
      offenders,
      `Offer Ceiling / sensitivity are included in the first decision (FEATURE_CATALOG.mao.anonymousLimit = "${FEATURE_CATALOG.mao.anonymousLimit}"); say "included in your first decision, Pro after" instead of "(Pro)"`,
    ).toEqual([]);
  });
});
