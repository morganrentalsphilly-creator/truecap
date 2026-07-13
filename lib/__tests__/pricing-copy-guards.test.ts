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
});
