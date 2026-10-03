import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ReactElement, ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * /pricing sends its first screen before it reads the session or Stripe
 * (go-to-market audit rows P2-85 and P2-161).
 *
 * The page function used to await the session, four Stripe display prices and
 * the signed-in plan state before any HTML left the server. It now awaits
 * nothing: those reads happen inside Suspense boundaries, so the response
 * opens with the headline, the actions, the feature table and the FAQ, and the
 * plan cards follow in the same response.
 *
 * Two renders stand in for the two moments of that response:
 *   - the static render returns each boundary's fallback, which is what the
 *     first bytes carry;
 *   - the settled render (the streaming prerender) waits for every boundary,
 *     which is what the whole response carries.
 */

const state = vi.hoisted(() => ({
  user: null as null | { id: string; email: string },
  activePaidPlanSlug: null as string | null,
  priceCalls: [] as string[],
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: async () => ({
    auth: { getUser: async () => ({ data: { user: state.user } }) },
  }),
}));
// The page also mounts <Testimonials />, which reads published rows through
// the service-role client. With Supabase variables set (CI sets placeholders)
// that became a real request, retried until it gave up. No row is published,
// so the section renders nothing, which is what the live page does today.
vi.mock("@/lib/testimonials/store", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/testimonials/store")>()),
  listPublishedTestimonials: async () => [],
}));
vi.mock("@/lib/stripe/display-prices", async () => {
  const pricing = await import("@/lib/public-pricing");
  const amounts: Record<string, [number, string]> = {
    pro_monthly: [pricing.PUBLIC_PRO_MONTHLY_USD, "month"],
    pro_annual: [pricing.PUBLIC_PRO_ANNUAL_USD, "year"],
    agent_pro_monthly: [pricing.PUBLIC_AGENT_PRO_MONTHLY_USD, "month"],
    agent_pro_annual: [pricing.PUBLIC_AGENT_PRO_ANNUAL_USD, "year"],
  };
  return {
    loadStripeDisplayPrice: async (slot: string) => {
      state.priceCalls.push(slot);
      const [unitAmount, period] = amounts[slot]!;
      return { amountLabel: pricing.formatPublicUsd(unitAmount), period, currency: "USD", unitAmount };
    },
  };
});
vi.mock("@/lib/stripe/plan-prices", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/stripe/plan-prices")>()),
  isAgentProConfigured: () => true,
}));
vi.mock("@/lib/entitlements", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/entitlements")>()),
  getActivePaidPlanSlug: async () => state.activePaidPlanSlug,
  hasAnySubscriptionHistory: async () => state.activePaidPlanSlug != null,
  hasCheckoutRecoverySubscription: async () => false,
  getProductEvaluationAccessForUser: async () => null,
  getEntitlementsForUser: async () => ({ features: [] }),
}));
// A server-action module: nothing here opens checkout.
vi.mock("@/app/actions/billing", () => ({ createCheckoutSessionAction: vi.fn() }));
vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({ push() {}, replace() {}, prefetch() {}, back() {}, forward() {}, refresh() {} }),
  usePathname: () => "/pricing",
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("next/link", async () => {
  const { createElement: h } = await import("react");
  return {
    default: ({ href, className, children }: { href: string; className?: string; children?: ReactNode }) =>
      h("a", { href, className }, children),
  };
});

import PricingPage from "@/app/pricing/page";
import {
  formatPublicUsd,
  PUBLIC_AGENT_PRO_ANNUAL_USD,
  PUBLIC_AGENT_PRO_MONTHLY_USD,
  PUBLIC_PRO_ANNUAL_USD,
  PUBLIC_PRO_MONTHLY_USD,
} from "@/lib/public-pricing";
import { extractLdJsonBlocks } from "../../seo/scripts/jsonld-validate.ts";

const source = readFileSync(join(process.cwd(), "app/pricing/page.tsx"), "utf8");

/** What the first bytes carry: every boundary's fallback. */
const firstBytes = () => renderToStaticMarkup(PricingPage() as ReactElement);

/** What the whole response carries: every boundary's content. */
async function wholeResponse(): Promise<string> {
  const { prerenderToNodeStream } = await import("react-dom/static");
  const { prelude } = await prerenderToNodeStream(PricingPage() as ReactElement);
  let html = "";
  for await (const chunk of prelude) html += chunk.toString();
  return html;
}

const ldTypes = (html: string) =>
  extractLdJsonBlocks(html).map((block) => (block.value as { "@type"?: string })["@type"]);
const planCards = (html: string) => [...html.matchAll(/<article\b[^>]*>/g)].length;
const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

beforeEach(() => {
  state.user = null;
  state.activePaidPlanSlug = null;
  state.priceCalls = [];
});

describe("/pricing: the page function awaits nothing", () => {
  it("is a plain function whose reads sit in cached loaders", () => {
    expect(source).toMatch(/\nexport default function PricingPage\(\) \{/);
    expect(source).not.toMatch(/export default async function/);
    const body = source.slice(
      source.indexOf("export default function PricingPage()"),
      source.indexOf("\nfunction Cell("),
    );
    expect(body.length).toBeGreaterThan(2000);
    expect(body).not.toMatch(/\bawait\b/);
    expect(source).toContain("const loadPricingSession = cache(async () => {");
    expect(source).toContain("const loadPricingPrices = cache(async () => {");
  });

  it("keeps loadStripeDisplayPrice as the one price source, for the four slots", () => {
    expect(source.match(/loadStripeDisplayPrice\("/g)).toHaveLength(4);
    for (const slot of ["pro_monthly", "pro_annual", "agent_pro_monthly", "agent_pro_annual"]) {
      expect(source).toContain(`loadStripeDisplayPrice("${slot}")`);
    }
  });

  it("sets no route segment option: force-dynamic would switch off the Stripe price cache", () => {
    expect(source).not.toMatch(/export const (?:dynamic|revalidate|fetchCache|runtime)\b/);
  });
});

describe("/pricing: what the first bytes carry", () => {
  it("the headline, the actions, the table and the FAQ with its JSON-LD", () => {
    const html = firstBytes();
    expect(html).toMatch(/<h1\b[^>]*>[^]*before you collect a dollar of rent\.[^]*<\/h1>/);
    expect(html).toContain("Analyze a property free");
    expect(html).toContain("See Pro plans");
    expect(html).toContain("Sale + rent comps from the address");
    expect(html).toContain("Up to 50 / mo");
    expect(html).toContain("How does the free trial work?");
    expect(ldTypes(html)).toEqual(["FAQPage"]);
    expect(html).toContain("data-pricing-trust-row");
  });

  it("the stage chooser with the catalog's monthly prices, before Stripe answers", () => {
    const html = firstBytes();
    const stages = html.slice(html.indexOf("data-pricing-stages"), html.indexOf("</ul>", html.indexOf("data-pricing-stages")));
    expect(stages).toContain(formatPublicUsd(PUBLIC_AGENT_PRO_MONTHLY_USD));
    expect(stages).toContain(formatPublicUsd(PUBLIC_PRO_MONTHLY_USD));
    expect(stages).toContain("$0");
  });

  it("placeholders where the session or Stripe is still being read, and no plan card yet", () => {
    const html = firstBytes();
    expect(planCards(html)).toBe(0);
    expect(html).not.toContain("SoftwareApplication");
    // The plan block holds one screen of height, so the table stays below the fold.
    expect(html).toContain('<div aria-hidden="true" class="min-h-svh"></div>');
    // The lede and the agent line hold their lines without showing signed-out copy.
    expect(html).toMatch(/<p aria-hidden="true" class="invisible">Complete your first decision free\./);
    expect(html).toMatch(/<p aria-hidden="true" class="[^"]*\binvisible\b[^"]*">Working with investor clients\?/);
    expect(html).not.toContain("data-pricing-agent-line");
    expect(html).not.toContain('href="/for-agents" class="tc-link -my-3');
  });
});

describe("/pricing: what the whole response carries", () => {
  it("for a visitor: every plan card, the terms, both JSON-LD blocks and no placeholder", async () => {
    const html = await wholeResponse();
    expect(planCards(html)).toBe(3);
    for (const id of ['<article id="pro"', '<article id="agent-pro"']) expect(html).toContain(id);
    expect(html).toContain("data-pricing-trial-terms");
    expect(html).toContain("New account: $0 today, no card.");
    expect(ldTypes(html).sort()).toEqual(["FAQPage", "SoftwareApplication"]);
    const app = extractLdJsonBlocks(html)
      .map((block) => block.value as { "@type"?: string; offers?: { name: string; price: number }[] })
      .find((value) => value["@type"] === "SoftwareApplication")!;
    expect(app.offers!.map((offer) => [offer.name, offer.price])).toEqual([
      ["TrueCap Free", 0],
      ["Pro Monthly", PUBLIC_PRO_MONTHLY_USD],
      ["Pro Annual", PUBLIC_PRO_ANNUAL_USD],
      ["Agent Pro Monthly", PUBLIC_AGENT_PRO_MONTHLY_USD],
      ["Agent Pro Annual", PUBLIC_AGENT_PRO_ANNUAL_USD],
    ]);
    // React sends a block as large as the card row after the shell and swaps
    // it in for its placeholder, so the placeholder is still in the HTML; the
    // small boundaries (the lede, the agent line) arrive in place.
    expect(html).not.toMatch(/class="[^"]*\binvisible\b/);
    expect(html).toContain("data-pricing-agent-line");
    expect(html).toContain('href="/for-agents" class="tc-link -my-3');
    expect(text(html)).toContain("Complete your first decision free. Create an account for");
    expect(text(html)).toContain("How does the free trial work?");
    // Every price read went through loadStripeDisplayPrice, for the four slots only.
    expect([...new Set(state.priceCalls)].sort()).toEqual([
      "agent_pro_annual",
      "agent_pro_monthly",
      "pro_annual",
      "pro_monthly",
    ]);
  }, 60_000);

  it("for a subscriber: the server's plan slug still reaches the cards, the lede and the agent line", async () => {
    state.user = { id: "user-1", email: "subscriber@example.com" };
    state.activePaidPlanSlug = "pro_annual";
    const html = await wholeResponse();
    expect(planCards(html)).toBe(3);
    const pro = html.slice(html.indexOf('<article id="pro"'), html.indexOf('<article id="agent-pro"'));
    expect(text(pro)).toContain("Current");
    expect(text(pro)).not.toContain("Recommended");
    expect(text(html)).toContain("Screen any deal free. Use Pro to review Buy Box fit");
    expect(text(html)).not.toContain("Complete your first decision free.");
    expect(html).not.toContain("data-pricing-agent-line");
    // A paid account sees no trial terms.
    expect(html).not.toContain("data-pricing-trial-terms");
  }, 60_000);
});
