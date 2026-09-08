import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const profilePage = readFileSync(join(process.cwd(), "app/profile/page.tsx"), "utf8");
const profileForm = readFileSync(join(process.cwd(), "components/profile/profile-form.tsx"), "utf8");

describe("profile subscription display wiring", () => {
  it("uses the Price-ID-derived slug when the plan relation is missing", () => {
    expect(profilePage).toContain("planSlug: subscribedPlanSlug ?? null");
    expect(profilePage).toContain("planName: subscribedPlanSlug");
    expect(profilePage).not.toContain("planSlug: currentPlan?.slug ?? null");
  });

  it("mounts no Google Ads conversion tracker (nothing produces /profile?billing=success)", () => {
    // The only paid_subscribed emitter is billing-success-banner.tsx after a
    // Stripe-verified checkout return. A subscription-id-keyed mount here
    // re-fired the Purchase conversion for any active subscriber who opened
    // /profile?billing=success by hand.
    expect(profilePage).not.toContain("BillingConversionTracker");
    expect(profilePage).not.toContain("justSubscribedSlug");
  });
});

describe("profile hydration determinism", () => {
  it("does not generate a new avatar URL during the initial render", () => {
    expect(profileForm).toContain("initialAvatarUrl ?? undefined");
    expect(profileForm).not.toContain(
      "initialAvatarUrl ? `${initialAvatarUrl}?v=${Date.now()}` : undefined"
    );
  });
});
