import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The /pricing plan button keeps one instance per card across the
 * Monthly/Annual toggle: only its `slot` prop changes. The resume / start
 * over choice must therefore show only on the plan it was raised for. Before
 * this was pinned, toggling back to the plan of the open checkout showed
 * "on different terms" for a checkout on identical terms.
 *
 * The component's only `useState(null)` is the open-checkout state, so the
 * test seeds that one call and leaves every other hook alone.
 */

const seeded = vi.hoisted(() => ({ openCheckout: null as unknown }));

vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  const useState = (initial?: unknown) =>
    initial === null && seeded.openCheckout !== null
      ? [seeded.openCheckout, () => {}]
      : actual.useState(initial);
  return { ...actual, default: { ...actual, useState }, useState };
});
vi.mock("@/app/actions/billing", () => ({ createCheckoutSessionAction: vi.fn() }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/lib/analytics/site-events", () => ({ track: vi.fn() }));
vi.mock("next/link", () => ({
  default: ({ children, href }: { children: unknown; href: string }) =>
    createElement("a", { href }, children as never),
}));

import { PricingPlanButtons } from "@/components/marketing/pricing-plan-buttons";

function render(slot: "pro_monthly" | "pro_annual" | "agent_pro_annual") {
  return renderToStaticMarkup(
    createElement(PricingPlanButtons, {
      slot,
      isAuthenticated: true,
      activePaidPlanSlug: null,
      priceLabel: "the shown price",
    }),
  );
}

describe("PricingPlanButtons after CHECKOUT_OPEN_OTHER_PLAN", () => {
  beforeEach(() => {
    // The buyer has a Pro monthly checkout open and pressed Subscribe on the
    // annual period of the same card.
    seeded.openCheckout = {
      requestedPlanSlug: "pro_annual",
      openPlanSlug: "pro_monthly",
      resumeUrl: "https://checkout.stripe.test/c/pay/cs_test_open",
    };
  });

  it("shows the choice on the plan the buyer asked for", () => {
    const html = render("pro_annual");
    expect(html).toContain("You started a Pro monthly checkout earlier and it is still open.");
    expect(html).toContain("Start over with Pro annual");
    expect(html).toContain("Resume the Pro monthly checkout");
    expect(html).not.toContain("on different terms");
  });

  it("shows the normal Subscribe button once the toggle moves the card to the open plan", () => {
    const html = render("pro_monthly");
    expect(html).not.toContain("on different terms");
    expect(html).not.toContain("Start over");
    expect(html).not.toContain("Resume the");
    expect(html).toContain("Subscribe");
    expect(html.match(/<button/g)).toHaveLength(1);
  });

  it("shows the normal Subscribe button on any other plan too", () => {
    const html = render("agent_pro_annual");
    expect(html).not.toContain("Start over");
    expect(html).toContain("Subscribe");
  });

  it("shows the normal Subscribe button when nothing is open", () => {
    seeded.openCheckout = null;
    const html = render("pro_annual");
    expect(html).not.toContain("Start over");
    expect(html).toContain("Subscribe");
  });
});
