import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

/**
 * On phones /pricing quotes both billing periods wherever it quotes one.
 *
 * The hero's stage chooser gave the monthly price ("Agent Pro $59.99
 * /month") while the plan cards open on Annual ("$49.17 /month, billed
 * annually ($590)"). From 768px the Monthly/Annual toggle sits above the card
 * row. On a phone the cards stack, the Agent Pro card is third and the toggle
 * was 1,592px above it, so one plan had two figures and nothing in view to
 * say why (audit row P2-40). The chooser now adds the annual figure under
 * each paid plan's monthly price, and each paid card adds the period the
 * toggle is not on, both hidden from 768px.
 *
 * What this file holds:
 * - the added figures are read exactly as the cards read their own (same
 *   Stripe display price, same catalog fallback), in every period and
 *   price-source state, so a card and the line under it can never disagree;
 * - no amount is typed: expectations are built from lib/public-pricing.ts;
 * - the lines are phone-only and the cards' own figures are untouched.
 */

vi.mock("next/link", async () => {
  const { createElement: h } = await import("react");
  return {
    default: ({ href, className, children }: { href: string; className?: string; children?: ReactNode }) =>
      h("a", { href, className }, children),
  };
});
// A server-action module: nothing here opens checkout.
vi.mock("@/app/actions/billing", () => ({ createCheckoutSessionAction: vi.fn() }));

import {
  OtherPeriodLine,
  paidPlanFigures,
  type PlanPeriodFigures,
} from "@/components/marketing/pricing-card-figures";
import { PricingTogglePlans } from "@/components/marketing/pricing-toggle-plans";
import {
  formatPublicUsd,
  PUBLIC_AGENT_PRO_ANNUAL_USD,
  PUBLIC_AGENT_PRO_MONTHLY_USD,
  PUBLIC_PRO_ANNUAL_USD,
  PUBLIC_PRO_MONTHLY_USD,
} from "@/lib/public-pricing";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

const PRO = { monthlyUsd: PUBLIC_PRO_MONTHLY_USD, annualUsd: PUBLIC_PRO_ANNUAL_USD };
const AGENT = { monthlyUsd: PUBLIC_AGENT_PRO_MONTHLY_USD, annualUsd: PUBLIC_AGENT_PRO_ANNUAL_USD };

/** What loadStripeDisplayPrice returns for a price that matches the catalog. */
const stripe = (usd: number, period: "month" | "year") => ({
  amountLabel: formatPublicUsd(usd),
  period,
});
const RESOLVED = {
  monthly: stripe(PUBLIC_PRO_MONTHLY_USD, "month"),
  annual: stripe(PUBLIC_PRO_ANNUAL_USD, "year"),
  agentMonthly: stripe(PUBLIC_AGENT_PRO_MONTHLY_USD, "month"),
  agentAnnual: stripe(PUBLIC_AGENT_PRO_ANNUAL_USD, "year"),
};
const UNRESOLVED = { monthly: null, annual: null, agentMonthly: null, agentAnnual: null };

function renderPlans(overrides: Partial<Parameters<typeof PricingTogglePlans>[0]>) {
  return renderToStaticMarkup(
    createElement(PricingTogglePlans, {
      ...UNRESOLVED,
      isAuthenticated: false,
      activePaidPlanSlug: null,
      evaluation: { status: "unavailable", dealsRemaining: 0, comparisonsRemaining: 0 },
      agentProConfigured: true,
      ...overrides,
    }),
  );
}

/** One plan card's markup, by its fragment id. */
function card(html: string, id: "pro" | "agent-pro"): string {
  const start = html.indexOf(`<article id="${id}"`);
  expect(start, `the #${id} card renders`).toBeGreaterThan(-1);
  return html.slice(start, html.indexOf("</article>", start));
}

/** The figure a card shows: its DM Mono price, the period beside it, the note under it. */
function shownFigures(cardHtml: string): PlanPeriodFigures & { other: string } {
  const price =
    /<span class="font-mono text-section-sm[^"]*">([^<]*)<\/span><span class="text-base text-muted-foreground">([^<]*)<\/span><\/p><p class="mt-1\.5 text-sm text-muted-foreground">([^<]*)<span data-pricing-other-period="" class="block md:hidden">or <span class="font-mono tabular-nums">([^<]*)<\/span>([^<]*)<\/span><\/p>/.exec(
      cardHtml,
    );
  expect(price, "price, period, note and the other-period line").not.toBeNull();
  const [, priceTop, priceSub, note, otherTop, otherRest] = price as RegExpExecArray;
  return {
    priceTop,
    priceSub,
    // The Pro card appends its annual saving after " · "; the note opens
    // with the billing term.
    subline: note.trim().split(" · ")[0],
    other: `or ${otherTop}${otherRest}`,
  };
}

const lineOf = (figures: PlanPeriodFigures) =>
  `or ${figures.priceTop}${figures.priceSub} ${figures.subline}`;

describe("/pricing: the other billing period on phones", () => {
  it("reads both periods from the catalog when Stripe's price is missing", () => {
    for (const catalog of [PRO, AGENT]) {
      const figures = paidPlanFigures(null, null, catalog);
      expect(figures.monthly).toEqual({
        priceTop: formatPublicUsd(catalog.monthlyUsd),
        priceSub: "/month",
        subline: "billed monthly",
      });
      expect(figures.annual).toEqual({
        priceTop: formatPublicUsd(catalog.annualUsd / 12),
        priceSub: "/month",
        subline: `billed annually (${formatPublicUsd(catalog.annualUsd)})`,
      });
    }
  });

  it("reads the same figures from Stripe's display prices", () => {
    expect(paidPlanFigures(RESOLVED.monthly, RESOLVED.annual, PRO)).toEqual(
      paidPlanFigures(null, null, PRO),
    );
    expect(paidPlanFigures(RESOLVED.agentMonthly, RESOLVED.agentAnnual, AGENT)).toEqual(
      paidPlanFigures(null, null, AGENT),
    );
  });

  it("never fills one period from the other when only one Stripe price resolved", () => {
    const onlyMonthly = paidPlanFigures(RESOLVED.agentMonthly, null, AGENT);
    expect(onlyMonthly.annual.priceTop).toBe(formatPublicUsd(PUBLIC_AGENT_PRO_ANNUAL_USD / 12));
    expect(onlyMonthly.annual.subline).toContain(formatPublicUsd(PUBLIC_AGENT_PRO_ANNUAL_USD));
    const onlyAnnual = paidPlanFigures(null, RESOLVED.agentAnnual, AGENT);
    expect(onlyAnnual.monthly.priceTop).toBe(formatPublicUsd(PUBLIC_AGENT_PRO_MONTHLY_USD));
  });

  it.each([
    ["a visitor, catalog fallback (opens on Annual)", {}, "annual"],
    ["a visitor, Stripe prices (opens on Annual)", RESOLVED, "annual"],
    [
      "a monthly subscriber, catalog fallback (opens on Monthly)",
      { isAuthenticated: true, activePaidPlanSlug: "agent_pro_monthly" },
      "monthly",
    ],
    [
      "a monthly subscriber, Stripe prices (opens on Monthly)",
      { ...RESOLVED, isAuthenticated: true, activePaidPlanSlug: "pro_monthly" },
      "monthly",
    ],
  ] as const)(
    "each paid card shows its period and names the other one under it: %s",
    (_label, overrides, period) => {
      const html = renderPlans(overrides);
      expect(html).toMatch(
        period === "annual" ? /aria-pressed="true"[^>]*>Annual/ : /aria-pressed="true"[^>]*>Monthly/,
      );
      const other = period === "annual" ? "monthly" : "annual";
      const prices = { ...UNRESOLVED, ...overrides };
      for (const [id, figures] of [
        ["pro", paidPlanFigures(prices.monthly, prices.annual, PRO)],
        ["agent-pro", paidPlanFigures(prices.agentMonthly, prices.agentAnnual, AGENT)],
      ] as const) {
        const shown = shownFigures(card(html, id));
        // The card's own figure (its expressions live in the toggle) reads
        // exactly as the shared figures do for the pressed period...
        expect(
          { priceTop: shown.priceTop, priceSub: shown.priceSub, subline: shown.subline },
          `#${id} on ${period}`,
        ).toEqual(figures[period]);
        // ...and the line under it is the other period, in the same words.
        expect(shown.other, `#${id}: the ${other} line`).toBe(lineOf(figures[other]));
        expect(figures[other].priceTop).not.toBe(figures[period].priceTop);
      }
    },
  );

  it("adds one line per paid card and none to Free", () => {
    const html = renderPlans({});
    expect(html.match(/data-pricing-other-period/g)).toHaveLength(2);
    expect(renderPlans({ agentProConfigured: false }).match(/data-pricing-other-period/g)).toHaveLength(1);
    const free = html.slice(html.indexOf('<article class="'), html.indexOf("</article>"));
    expect(free).toContain(">Free</h3>");
    expect(free).not.toContain("data-pricing-other-period");
  });

  it("is hidden from 768px, where the toggle sits above the card row", () => {
    const html = renderToStaticMarkup(
      createElement(OtherPeriodLine, { figures: paidPlanFigures(null, null, AGENT).monthly }),
    );
    expect(html).toBe(
      `<span data-pricing-other-period="" class="block md:hidden">or <span class="font-mono tabular-nums">${formatPublicUsd(
        PUBLIC_AGENT_PRO_MONTHLY_USD,
      )}</span>/month billed monthly</span>`,
    );
  });

  it("the stage chooser carries each paid plan's annual figure on phones, from the same inputs", () => {
    const page = read("app/pricing/page.tsx");
    // Agent Pro and Pro: the annual figures from that plan's own Stripe
    // display prices and catalog constants. Free has none.
    expect(page).toMatch(
      /product: "Agent Pro",[\s\S]{0,400}?annual: paidPlanFigures\(agentMonthly, agentAnnual, \{\s*monthlyUsd: PUBLIC_AGENT_PRO_MONTHLY_USD,\s*annualUsd: PUBLIC_AGENT_PRO_ANNUAL_USD,\s*\}\)\.annual,/,
    );
    expect(page).toMatch(
      /product: proOfferName,[\s\S]{0,400}?annual: paidPlanFigures\(monthly, annual, \{\s*monthlyUsd: PUBLIC_PRO_MONTHLY_USD,\s*annualUsd: PUBLIC_PRO_ANNUAL_USD,\s*\}\)\.annual,/,
    );
    expect(page).toMatch(/product: "Free",[\s\S]{0,160}?annual: null,/);
    expect(page.match(/paidPlanFigures\(/g)).toHaveLength(2);
    // Rendered once per stage that has one, under the monthly price, and
    // hidden from 768px.
    expect(page).toMatch(
      /\{stage\.annual \? \(\s*<p className="col-span-2 text-right text-sm text-muted-foreground md:hidden">\s*<OtherPeriodLine figures=\{stage\.annual\} \/>\s*<\/p>\s*\) : null\}/,
    );
    // The chooser's monthly price is untouched: still the Stripe display
    // price, else the catalog amount.
    expect(page).toContain(
      "price: agentMonthly?.amountLabel ?? formatPublicUsd(PUBLIC_AGENT_PRO_MONTHLY_USD),",
    );
    expect(page).toContain("price: monthly?.amountLabel ?? formatPublicUsd(PUBLIC_PRO_MONTHLY_USD),");
  });

  it("types no dollar amount in the shared figures module", () => {
    const source = read("components/marketing/pricing-card-figures.tsx")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/(^|[^:"'`])\/\/[^\n]*/g, "$1");
    expect([...source.matchAll(/\$\d[\d,]*(?:\.\d+)?/g)].map((m) => m[0])).toEqual([]);
    expect(source).toContain('from "@/lib/public-pricing"');
  });
});
