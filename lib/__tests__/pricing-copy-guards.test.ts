import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  PRODUCT_EVALUATION_COMPARISON_LIMIT,
  PRODUCT_EVALUATION_DEAL_LIMIT,
  PRODUCT_EVALUATION_DAYS,
} from "@/lib/product-access";
import { featureLimit, tierHas } from "@/lib/entitlements-catalog";

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
    const source = read("../../components/marketing/landing-sections.tsx");
    // "Pro adds save/compare deals" contradicted both the pricing card and
    // the runtime (free plan grants save_deal with a cap of 5).
    expect(source).not.toContain("Pro adds save/compare deals");
    // "plus save deals" in the upgrade FAQ implied the same falsehood.
    expect(source).not.toContain("plus save deals");
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
    expect(buttons).toContain("Start {tierName} evaluation — no card");
    expect(buttons).toContain("plan=${plan}&billing=${billing}");
    expect(buttons).not.toContain("resolveCheckoutResumeForSlot");
    expect(plans).toContain("3 Pro deals + 1 comparison · no card");
    expect(signup).toContain("Nothing auto-renews");
    expect(signup).toContain("No card is requested and no subscription starts today");
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
    expect(plans).toContain('id="pro" className="relative order-1');
    expect(plans).toContain('className="relative order-2');
    expect(plans).toContain('id="agent-pro" className="relative order-3');
  });

  it("does not advertise the temporarily disabled Decision Pack", () => {
    const page = read("../../app/pricing/page.tsx");
    expect(page).not.toContain("Not ready for a subscription?");
    expect(page).not.toContain("TrueCap Deal Decision Pack");
    expect(page).not.toContain("singleDeal.priceLabel");
  });

  it("does not manufacture scarcity around the permanent annual plan", () => {
    const banner = read("../../components/marketing/annual-promo-banner.tsx");
    expect(banner).toContain("Annual plan");
    expect(banner).not.toMatch(/limited|expires|countdown/i);
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
