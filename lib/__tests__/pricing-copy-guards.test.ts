import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { TRIAL_DAYS, TRIAL_LABEL, willCheckoutGrantTrial } from "@/lib/trial";
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

describe("trial copy — mirrors the checkout repeat-trial guard", () => {
  it("willCheckoutGrantTrial matches billing.ts (grantTrial = !priorSubscription)", () => {
    expect(willCheckoutGrantTrial(false)).toBe(true); // first-timer → trial granted
    expect(willCheckoutGrantTrial(true)).toBe(false); // ex-subscriber → charged immediately
  });

  it("TRIAL_LABEL stays in lockstep with TRIAL_DAYS", () => {
    expect(TRIAL_LABEL).toBe(`${TRIAL_DAYS}-day free trial`);
  });

  it("checkout has no hidden trial-length override that can contradict public copy", () => {
    const billing = read("../../app/actions/billing.ts");
    expect(billing).toContain("const proTrialDays = TRIAL_DAYS");
    expect(billing).not.toContain("process.env.PRO_TRIAL_DAYS");
  });

  it("/pricing conditions its trial promises on the guard mirror", () => {
    // The server page computes prior-subscription history…
    const page = read("../../app/pricing/page.tsx");
    expect(page).toContain("hasAnySubscriptionHistory");
    expect(page).toContain("hadPriorSubscription");
    // …and both card components route every trial mention through the
    // shared mirror instead of showing TRIAL_LABEL unconditionally.
    const plans = read("../../components/marketing/pricing-toggle-plans.tsx");
    expect(plans).toContain("willCheckoutGrantTrial");
    expect(plans).toContain("hadPriorSubscription");
    const buttons = read("../../components/marketing/pricing-plan-buttons.tsx");
    expect(buttons).toContain("willCheckoutGrantTrial");
    expect(buttons).toContain("hadPriorSubscription");
  });

  it("treats anonymous and unverifiable trial eligibility as unknown", () => {
    const page = read("../../app/pricing/page.tsx");
    const plans = read("../../components/marketing/pricing-toggle-plans.tsx");
    const buttons = read("../../components/marketing/pricing-plan-buttons.tsx");
    const entitlements = read("../../lib/entitlements.ts");

    // Anonymous visitors may be signed-out returning subscribers. Their CTA is
    // neutral and the card/hero state the first-time eligibility condition.
    const anonymousBranch = buttons.slice(
      buttons.indexOf("if (!isAuthenticated)"),
      buttons.indexOf("// Authenticated free user")
    );
    expect(anonymousBranch).toContain("Continue to {tierName}");
    expect(anonymousBranch).not.toContain("Start");
    expect(plans).toContain("verifiedTrialEligible");
    // "New subscribers" is the approved conditional phrasing (2026-08 offer
    // rollout): it states the first-time eligibility condition in plain words
    // without the "if eligible" hedge, which is banned site-wide.
    expect(plans).toContain("New subscribers get a");
    expect(page).toContain("New subscribers get");
    expect(page).toMatch(
      /\{!user \? \([\s\S]*New subscribers get a[\s\S]*\) : hadPriorSubscription \? \(/
    );
    expect(plans).not.toContain("if eligible");
    expect(page).not.toContain("if eligible");

    // A failed history query is not verified eligibility; marketing fails
    // closed and checkout remains the billing authority.
    const historyHelper = entitlements.slice(
      entitlements.indexOf("export async function hasAnySubscriptionHistory"),
      entitlements.length
    );
    expect(historyHelper).toMatch(/if \(error\)[\s\S]*return true;/);
  });

  it("states the card, billing, cancellation, and repeat-trial terms before checkout", () => {
    const plans = read("../../components/marketing/pricing-toggle-plans.tsx");
    const landing = read("../../components/marketing/landing-sections.tsx");

    expect(plans).toContain("Card required at checkout");
    expect(plans).toContain("Subscription billing starts after");
    expect(plans).toContain("unless you cancel first");
    expect(plans).toContain("The free trial is a first-time offer");
    expect(landing).toContain("not eligible for another free trial");
  });
});

describe("pricing offer hierarchy", () => {
  it("does not imply that every Decision Pack PDF includes comps", () => {
    const plans = read("../../components/marketing/pricing-toggle-plans.tsx");
    expect(plans).not.toMatch(/report[^\n]*with[^\n]*comps/i);
  });

  it("does not market white-label embeds while that license is on hold", () => {
    const agentPage = read("../../app/for-agents/page.tsx");
    expect(agentPage).not.toMatch(/white-label embeds/i);
  });

  it("keeps Free → Pro → Agent order at every viewport", () => {
    const plans = read("../../components/marketing/pricing-toggle-plans.tsx");
    expect(plans).not.toMatch(/\border-[123]\b/);
    expect(plans).not.toMatch(/\blg:order-[123]\b/);
  });

  it("keeps the Decision Pack in the secondary non-subscription section", () => {
    const page = read("../../app/pricing/page.tsx");
    expect(page).toContain("Not ready for a subscription?");
    expect(page.indexOf("<PricingTogglePlans")).toBeLessThan(
      page.indexOf("Not ready for a subscription?")
    );
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
