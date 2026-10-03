import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

/**
 * The /pricing Agent Pro card follows the Monthly/Annual toggle even when
 * Stripe's display price did not resolve for the request.
 *
 * It used to fall back to its MONTHLY branch whenever the agent_pro_annual
 * display price was null (a failed Stripe read, a missing price ID, a catalog
 * mismatch): the page opens on Annual, so an agent saw Annual pressed, the
 * Pro card at "$25/month billed annually", and Agent Pro at "$59.99/month
 * billed monthly" with a billing=monthly sign-up link, while /for-agents said
 * "$49.17/month billed annually". The card now picks its branch from the
 * toggle alone and falls back to the catalog amounts, as the Pro card does;
 * signed-in checkout stays gated on the resolved price (checkoutReady).
 *
 * The sign-up is a plain <a> (a full-document navigation), so Back from the
 * auth page returns to the card; next/link is marked here to tell them apart.
 */

vi.mock("next/link", async () => {
  const { createElement: h } = await import("react");
  return {
    default: ({ href, className, children }: { href: string; className?: string; children?: ReactNode }) =>
      h("a", { href, className, "data-next-link": "" }, children),
  };
});
// A server-action module: nothing here opens checkout.
vi.mock("@/app/actions/billing", () => ({ createCheckoutSessionAction: vi.fn() }));

import { PricingTogglePlans } from "@/components/marketing/pricing-toggle-plans";
import {
  formatPublicUsd,
  PUBLIC_AGENT_PRO_ANNUAL_USD,
  PUBLIC_AGENT_PRO_MONTHLY_USD,
  PUBLIC_PRO_ANNUAL_USD,
  PUBLIC_PRO_MONTHLY_USD,
} from "@/lib/public-pricing";

function renderPlans(overrides: Partial<Parameters<typeof PricingTogglePlans>[0]> = {}) {
  return renderToStaticMarkup(
    createElement(PricingTogglePlans, {
      monthly: null,
      annual: null,
      agentMonthly: null,
      agentAnnual: null,
      isAuthenticated: false,
      activePaidPlanSlug: null,
      evaluation: { status: "unavailable", dealsRemaining: 0, comparisonsRemaining: 0 },
      agentProConfigured: true,
      ...overrides,
    }),
  );
}

/** The Agent Pro card's markup: from its <article id="agent-pro"> to its close. */
function agentCard(html: string): string {
  const start = html.indexOf('<article id="agent-pro"');
  expect(start, "the Agent Pro card renders").toBeGreaterThan(-1);
  const end = html.indexOf("</article>", start);
  return html.slice(start, end);
}

describe("/pricing Agent Pro card", () => {
  it("opens on Annual with the catalog's annual figures when Stripe's price is missing", () => {
    const html = renderPlans();
    // The page opens on Annual (the toggle's pressed segment).
    expect(html).toMatch(/aria-pressed="true"[^>]*>Annual/);
    const card = agentCard(html);
    expect(card).toContain(formatPublicUsd(PUBLIC_AGENT_PRO_ANNUAL_USD / 12));
    expect(card).toContain(`billed annually (${formatPublicUsd(PUBLIC_AGENT_PRO_ANNUAL_USD)})`);
    expect(card).not.toContain("billed monthly");
    expect(card).not.toContain(formatPublicUsd(PUBLIC_AGENT_PRO_MONTHLY_USD));
    // Its sign-up carries the period the card shows, as /for-agents' does.
    expect(card).toContain("/auth/sign-up?plan=agent-pro&amp;billing=annual&amp;");
  });

  it("uses Stripe's annual display price when it resolved", () => {
    const card = agentCard(
      renderPlans({ agentAnnual: { amountLabel: "$590", period: "year" } }),
    );
    expect(card).toContain("$49.17");
    expect(card).toContain("billed annually ($590)");
  });

  // Row P2-13: the saving was printed on the Pro card only, rounded up to the
  // dollar, under a toggle percentage worked out from the Pro prices.
  it("prints each paid plan's own annual saving, to the cent, from its two catalog prices", () => {
    const cents = (monthly: number, annual: number) => Math.round(monthly * 1200 - annual * 100);
    const label = (monthly: number, annual: number) =>
      `Save $${(cents(monthly, annual) / 100).toFixed(2)}/yr`;
    const proSaving = label(PUBLIC_PRO_MONTHLY_USD, PUBLIC_PRO_ANNUAL_USD);
    const agentSaving = label(PUBLIC_AGENT_PRO_MONTHLY_USD, PUBLIC_AGENT_PRO_ANNUAL_USD);
    expect(proSaving).not.toBe(agentSaving);

    const html = renderPlans();
    const pro = html.slice(html.indexOf('<article id="pro"'), html.indexOf('<article id="agent-pro"'));
    expect(pro).toContain(
      `billed annually (${formatPublicUsd(PUBLIC_PRO_ANNUAL_USD)}) · ${proSaving}`,
    );
    expect(pro).not.toContain(agentSaving);
    const agent = agentCard(html);
    expect(agent).toContain(
      `billed annually (${formatPublicUsd(PUBLIC_AGENT_PRO_ANNUAL_USD)}) · ${agentSaving}`,
    );
    expect(agent).not.toContain(proSaving);
    // The same figures when Stripe's display prices resolved.
    const resolved = renderPlans({
      monthly: { amountLabel: formatPublicUsd(PUBLIC_PRO_MONTHLY_USD), period: "month" },
      annual: { amountLabel: formatPublicUsd(PUBLIC_PRO_ANNUAL_USD), period: "year" },
      agentMonthly: { amountLabel: formatPublicUsd(PUBLIC_AGENT_PRO_MONTHLY_USD), period: "month" },
      agentAnnual: { amountLabel: formatPublicUsd(PUBLIC_AGENT_PRO_ANNUAL_USD), period: "year" },
    });
    expect(resolved).toContain(proSaving);
    expect(agentCard(resolved)).toContain(agentSaving);
  });

  it("gives the billing toggle no figure, so it is true beside both paid cards", () => {
    const html = renderPlans();
    const toggle = html.slice(html.indexOf('role="group"'), html.indexOf("<article"));
    const text = toggle.replace(/<[^>]+>/g, "|").replace(/^[^|]*\|/, "");
    expect(text).toContain("Annual |costs less");
    expect(text).not.toMatch(/\d|%/);
    const source = readFileSync(
      join(process.cwd(), "components/marketing/pricing-toggle-plans.tsx"),
      "utf8",
    );
    // No saving is typed by hand, and none is rounded to the dollar.
    expect(source).not.toMatch(/Save \$\d/);
    expect(source).not.toMatch(/annualSavingsPct|months free/);
  });

  it("keeps signed-in checkout gated on the resolved annual price", () => {
    const card = agentCard(renderPlans({ isAuthenticated: true }));
    expect(card).toContain("Billing setup pending");
    expect(card).toMatch(/<button[^>]*disabled=""/);
  });

  it("sends a visitor to sign-up with a plain <a>, not next/link", () => {
    const card = agentCard(renderPlans());
    const signUp = /<a\b[^>]*href="\/auth\/sign-up\?[^"]*"[^>]*>/.exec(card)?.[0];
    expect(signUp, "the Agent Pro sign-up link").toBeDefined();
    expect(signUp).not.toContain("data-next-link");
  });

  it("takes the #agent-pro scroll margin from 768px, where the toggle sits above the row", () => {
    const source = readFileSync(
      join(process.cwd(), "components/marketing/pricing-toggle-plans.tsx"),
      "utf8",
    );
    expect(source).toMatch(/<PlanCard\s+id="agent-pro"\s+className="[^"]*\bmd:scroll-mt-28\b/);
    expect(agentCard(renderPlans())).toContain("md:scroll-mt-28");
  });
});

// Row P2-122: the signed-in Subscribe button says only "today".
describe("/pricing renewal sentence", () => {
  const renewal = (html: string) =>
    /<p data-pricing-renewal-terms=""[^>]*>(.*?)<\/p>/
      .exec(html)?.[1]
      .replace(/<!-- -->/g, "") ?? null;

  it("is absent for a signed-out visitor and for a subscriber", () => {
    expect(renewal(renderPlans())).toBeNull();
    expect(
      renewal(renderPlans({ isAuthenticated: true, activePaidPlanSlug: "pro_annual" })),
    ).toBeNull();
  });

  it("gives a signed-in visitor the annual catalog amounts on the annual toggle", () => {
    expect(renewal(renderPlans({ isAuthenticated: true }))).toBe(
      `A subscription renews automatically each year at the price shown (Pro ${formatPublicUsd(PUBLIC_PRO_ANNUAL_USD)}, Agent Pro ${formatPublicUsd(PUBLIC_AGENT_PRO_ANNUAL_USD)}) until you cancel from your profile.`,
    );
  });

  it("names only Pro when Agent Pro is not on the page", () => {
    expect(renewal(renderPlans({ isAuthenticated: true, agentProConfigured: false }))).toBe(
      `A subscription renews automatically each year at the price shown (Pro ${formatPublicUsd(PUBLIC_PRO_ANNUAL_USD)}) until you cancel from your profile.`,
    );
  });
});
