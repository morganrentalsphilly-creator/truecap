/**
 * Public /pricing page. Outcome line with the stage chooser beside it, plans
 * (annual-first) with the trial terms and trust row under the cards, the
 * feature table, the value stack, product shots, the DealCheck comparison,
 * FAQ. Amounts come only from
 * lib/public-pricing.ts and the Stripe display prices. For
 * unauthenticated visitors the CTA routes to
 * /auth/sign-up?next=/pricing?checkout=<plan>#plans, so they come back
 * here and PricingPlanButtons auto-resumes the exact checkout they
 * started (the param is read client-side via window.location — no
 * useSearchParams, so no extra Suspense boundary is needed here); for
 * authenticated free users the CTA triggers Stripe checkout directly
 * via the existing billing action. A Stripe cancel returns with
 * ?billing=checkout_cancelled (CheckoutCancelledBanner below), which
 * the auto-resume treats as mutually exclusive — it never re-fires.
 *
 * Set in the design system's grammar (DESIGN.md): the shared hero, Section
 * and FAQ parts, plan cards as the page's only cards, rules instead of
 * boxes everywhere else, and no motion.
 */

import { Suspense } from "react";
import { Testimonials } from "@/components/marketing/testimonials";
import { DECISION_SHOT, MEMO_SHOT, ProductShot, RENT_BREAKDOWN_SHOT } from "@/components/marketing/product-shot";
import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";
import { Header } from "@/components/investcalc/header";
import { LedgerFigure } from "@/components/ledger/ledger-parts";
import { CheckoutCancelledBanner } from "@/components/marketing/checkout-cancelled-banner";
// Links below the first screen prefetch on hover or keyboard focus, not on
// scroll. The hero's links (its actions, the stage chooser's plan jumps and
// the agent line) and the plan cards' checkout actions keep next/link's
// default; /analyze never prefetches. Guarded by
// lib/__tests__/intent-prefetch-landing.test.ts.
import { IntentPrefetchLink } from "@/components/marketing/intent-prefetch-link";
import { FaqSection } from "@/components/marketing/landing-sections";
import { ActionRow, PageHero } from "@/components/marketing/page-parts";
import { PricingTogglePlans } from "@/components/marketing/pricing-toggle-plans";
import { PricingValueStack } from "@/components/marketing/pricing-value-stack";
import { Section, SectionHeading } from "@/components/marketing/section";
import { buttonVariants } from "@/components/ui/button";
import {
  getEntitlementsForUser,
  getActivePaidPlanSlug,
  getProductEvaluationAccessForUser,
  hasAnySubscriptionHistory,
  hasCheckoutRecoverySubscription,
} from "@/lib/entitlements";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isAgentProConfigured } from "@/lib/stripe/plan-prices";
import { loadStripeDisplayPrice } from "@/lib/stripe/display-prices";

import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SiteFooter } from "@/components/marketing/site-footer";
import { getMarketingOfferConfig } from "@/lib/marketing-offer-config";
import { rateAlertEmailsLive } from "@/lib/rate-alerts-mode";
import { getSiteUrl } from "@/lib/site-url";
import {
  DEALCHECK_COMPARISON,
  formatPublicUsd,
  formatUsdWhole,
  PRICING_OUTCOME_EXAMPLE,
  PUBLIC_AGENT_PRO_MONTHLY_USD,
  PUBLIC_PRO_MONTHLY_USD,
} from "@/lib/public-pricing";
import {
  formatPricingEvaluationAllowance,
  summarizePricingEvaluation,
} from "@/lib/pricing-evaluation";
import { PRODUCT_PLAN_FACTS, PROPERTY_TAX_FACTS } from "@/lib/product-facts";
import { ScrollX } from "@/components/ui/scroll-x";
import { JsonLd } from "@/components/seo/json-ld";
import { cn } from "@/lib/utils";
import { OPEN_GRAPH_BASE } from "@/lib/seo/open-graph-base";

const EVALUATION_FACTS = PRODUCT_PLAN_FACTS.evaluation;
export const metadata: Metadata = {
  title: "Pricing — Screen Free, Know Your Offer with Pro",
  description: `Complete a rental decision free, then create an account for a ${EVALUATION_FACTS.durationDays}-day free trial with ${EVALUATION_FACTS.dealLimit} Pro deals and ${EVALUATION_FACTS.comparisonLimit} comparison.`,
  alternates: { canonical: "/pricing" },
  openGraph: {
    ...OPEN_GRAPH_BASE,
    title: "TrueCap pricing — Screen free, know your offer with Pro",
    description:
      "Screen deals free. Use Pro to apply your targets, calculate an Offer Ceiling, stress-test downside, compare opportunities, and share the underwrite.",
    url: "/pricing",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

// FREE_FEATURES + PRO_FEATURES lists were lifted into the toggle
// component (components/marketing/pricing-toggle-plans.tsx) so they
// stay co-located with the cards that render them.

const FAQS: { q: string; a: string }[] = [
  {
    // Agent-first (2026-09): the audience question leads, and its answer
    // leads with the agent workflow. Facts per lib/agent-faqs.ts.
    q: "Is this for agents, investors, or both?",
    a: "Both, and the analyzer is the same. Agents with investor clients use Agent Pro to assign Buy Boxes to clients (up to 12 per account), screen each listing against the client's Buy Box, and send a co-branded decision memo the client can open without an account and rerun with their own assumptions. Investors use the same analyzer, with Pro, for deals they are buying themselves.",
  },
  {
    q: "Is TrueCap really free?",
    // Keep this answer in lockstep with the homepage FAQ
    // (components/marketing/landing-sections.tsx), the plan cards
    // (pricing-toggle-plans.tsx), and the actual gating in
    // app/page.tsx. The Offer Ceiling and downside sensitivity are included
    // in the anonymous first decision (FEATURE_CATALOG anonymousLimit) and
    // are Pro after that; 10-year projection, comparison, PDF and templates
    // are Pro-only. Tool, /vs and blog copy is guarded against re-labelling
    // the first-decision features "(Pro)" in pricing-copy-guards.test.ts.
    a: "Yes. Your first decision includes asking-price cash flow, Buy Box fit, the Offer Ceiling, a downside check, and next steps. No account or card is required. Create an account to keep the work and start the free trial.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. Cancel anytime from your profile. Your Pro features stay active until the end of the period you've paid for, then automatically downgrade to Free.",
  },
  {
    q: "How does the free trial work?",
    a: `A new account gets ${EVALUATION_FACTS.durationDays} days to complete ${EVALUATION_FACTS.dealLimit} Pro deal analyses and ${EVALUATION_FACTS.comparisonLimit} full comparison. No card is collected, no charge is scheduled, and nothing auto-renews. If you later subscribe, checkout shows the exact charge before you confirm.`,
  },
  {
    q: "What does Pro add?",
    a: "Pro tells you what to offer on every deal: whether it meets your Buy Box, your Offer Ceiling (your walk-away price based on your targets), what could make it fail under downside stress tests, and a report you can hand to a partner or lender, plus side-by-side comparisons. If you only need metrics, the free analyzer already gives you those.",
  },
  {
    q: "Do I keep my saved deals if I downgrade?",
    // Runtime truth (app/actions/saved-analyses.ts): Free CAN create saves up
    // to its 5-deal cap; only UPDATING a saved deal is Pro-gated. A previous
    // version claimed downgraded users lose both creating AND updating — the
    // creating half was false while under the cap
    // (pricing-copy-guards.test.ts locks this).
    a: "Yes. Your saved deals and PDF exports never leave your account. On Free you'll lose the ability to edit them — and new saves cap at Free's 5-deal limit — but everything is still readable.",
  },
  {
    q: "How accurate is the auto-fill?",
    a: `Rent uses a HUD area benchmark (ZIP-level when available, otherwise an FMR area), not a property-specific rent comp. The rate uses FRED's national owner-occupied 30-year benchmark, not an investor lender quote. ${PROPERTY_TAX_FACTS.notAutoFilled} ${PROPERTY_TAX_FACTS.blankFieldBehavior} Replace every screening assumption with property-specific evidence before relying on the result.`,
  },
];

const FEATURE_COMPARISON: Array<
  [label: string, free: boolean | string, pro: boolean | string]
> = [
  ["Unlimited preliminary core screens", true, true],
  ["Cap rate · CoC · DSCR · cash flow", true, true],
  ["Labeled HUD rent · FRED rate benchmarks", true, true],
  ["Deal score (0–100) with factor breakdown", true, true],
  ["Sale + rent comps from the address", "1 free", "50 / mo"],
  ["Offer Ceiling · downside sensitivity", "First complete decision", true],
  ["Shareable read-only deal links", true, true],
  ["10-year cash flow projection", false, true],
  ["Buy Box auto-screening", false, true],
  ["Deal pipeline + tags (CRM)", false, true],
  ["Saved analysis templates", false, true],
  ["Due-diligence checklist + document vault", true, true],
  ["Rate-drop alerts on saved deals", false, true],
  ["Decision memo/report", "First decision", true],
  ["Lender · partner report modes", false, true],
  ["Save deals", PRODUCT_PLAN_FACTS.free.savedDealLimit, "Unlimited"],
  ["Compare deals side-by-side", false, "Up to 4"],
  ["Co-branded share pages + PDFs", false, true],
  ["Priority support", false, true],
  // Agent Pro only (lib/entitlements-catalog.ts client_buy_box). These rows
  // keep the [label, free, pro] shape the catalog guard parses; the Agent Pro
  // cell comes from AGENT_PRO_CELLS below.
  ["Client roster (up to 100 clients)", false, false],
  ["Buy Boxes assigned to clients", false, false],
  ["Client-report share links", false, false],
];

/**
 * The Agent Pro column: everything in Pro, plus the client-roster rows. Rows
 * absent from this map inherit the Pro cell. Rendered only when the tier is
 * configured on this deployment.
 */
const AGENT_PRO_CELLS: Record<string, boolean | string> = {
  "Client roster (up to 100 clients)": true,
  "Buy Boxes assigned to clients": "Up to 12 per account",
  "Client-report share links": true,
};
const agentProCell = (label: string, pro: boolean | string) =>
  AGENT_PRO_CELLS[label] ?? pro;

/**
 * One frame box for the tier shots from 768px (ProductShot puts the class on
 * its figure; the frame is the figure's div). The captures differ in
 * proportion (the rent breakdown is a wide strip, the memo a tall page), so
 * each fits inside a shared 4:3 frame from the top instead of setting the
 * frame's height.
 */
const SHOT_FRAME =
  "md:[&>div]:aspect-[4/3] md:[&_img]:h-full md:[&_img]:object-contain md:[&_img]:object-top";

export default async function PricingPage() {
  const { proOfferName } = getMarketingOfferConfig();
  const alertsLive = rateAlertEmailsLive();
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Signed-in evaluation copy comes from the actual evaluation row plus its
  // immutable usage ledger. Subscription history is still needed for checkout
  // recovery messaging, but it is never treated as proof of live allowances.
  // Agent Pro renders ONLY when its Stripe price env is configured — until
  // then the tier is fully plumbed but invisible (nothing to sell yet).
  // Whether Agent Pro EXISTS is a configuration fact (env + plan rows), not a
  // function of whether Stripe answered this request. Deriving visibility from
  // the fetched price meant one transient Stripe error deleted a live tier from
  // the pricing page for that visitor.
  const agentProConfigured = isAgentProConfigured();
  const faqs = FAQS;
  const [
    monthly,
    annual,
    agentMonthly,
    agentAnnual,
    activePaidPlanSlug,
    hadPriorSubscription,
    billingRecoveryRequired,
    productEvaluationAccess,
  ] = await Promise.all([
    loadStripeDisplayPrice("pro_monthly"),
    loadStripeDisplayPrice("pro_annual"),
    agentProConfigured
      ? loadStripeDisplayPrice("agent_pro_monthly")
      : Promise.resolve(null),
    agentProConfigured
      ? loadStripeDisplayPrice("agent_pro_annual")
      : Promise.resolve(null),
    user ? getActivePaidPlanSlug(supabase, user.id) : Promise.resolve(null),
    user
      ? hasAnySubscriptionHistory(supabase, user.id)
      : Promise.resolve(false),
    user
      ? hasCheckoutRecoverySubscription(supabase, user.id)
      : Promise.resolve(false),
    user
      ? getProductEvaluationAccessForUser(supabase, user.id)
      : Promise.resolve(null),
  ]);
  const pricingEvaluation = summarizePricingEvaluation(productEvaluationAccess);
  const evaluationAllowance =
    formatPricingEvaluationAllowance(pricingEvaluation);
  const entitlements = user
    ? await getEntitlementsForUser(supabase, user.id)
    : null;
  const siteUrl = getSiteUrl();
  const recurringOffers = [
    [`${proOfferName} Monthly`, monthly],
    [`${proOfferName} Annual`, annual],
    ["Agent Pro Monthly", agentMonthly],
    ["Agent Pro Annual", agentAnnual],
  ] as const;
  // The product the homepage declares (app/page.tsx, @id /#software), again,
  // to carry the paid Offers: same @id, name and url, so a crawler reads one
  // entity with every offer rather than two "TrueCap" apps (F4 review).
  const pricingSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "@id": `${siteUrl}/#software`,
    name: "TrueCap",
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web",
    url: siteUrl,
    offers: [
      {
        "@type": "Offer",
        name: "TrueCap Free",
        price: 0,
        priceCurrency: "USD",
        url: `${siteUrl}/`,
      },
      ...recurringOffers.flatMap(([name, price]) =>
        price
          ? [
              {
                "@type": "Offer",
                name,
                price: price.unitAmount,
                priceCurrency: price.currency,
                url: `${siteUrl}/pricing`,
              },
            ]
          : [],
      ),
    ],
  };
  // The Monthly ↔ Annual savings math is now done inside
  // <PricingTogglePlans> so it can react to the user's toggle state.
  // We just hand it both Stripe prices.

  // The exit-intent "50% off" offer was removed entirely (founder decision,
  // 2026-07): no discount offers anywhere — full price only.

  // Which plan answers which job, with its monthly price: the hero's aside.
  // Each paid price is the same expression its card shows on Monthly (the
  // Stripe display price, else the catalog fallback), so the two never
  // disagree; nothing here is typed by hand. Agent stage first (2026-09
  // agent-first pass); investor stages follow. The plan name jumps to its
  // card (Free has no fragment of its own, so it lands on the plans).
  const stages = [
    ...(agentProConfigured
      ? [
          {
            job: "Win investor clients",
            product: "Agent Pro",
            href: "#agent-pro",
            price: agentMonthly?.amountLabel ?? formatPublicUsd(PUBLIC_AGENT_PRO_MONTHLY_USD),
            period: agentMonthly ? `/${agentMonthly.period}` : "/month",
            answer: "Screen each listing against the client's own Buy Box and send the decision memo under your name.",
          },
        ]
      : []),
    {
      job: "Screen the deal",
      product: "Free",
      href: "#plans",
      price: "$0",
      period: "forever",
      answer: "Understand the economics before spending more time on the property.",
    },
    {
      job: "Know what to offer",
      product: proOfferName,
      href: "#pro",
      price: monthly?.amountLabel ?? formatPublicUsd(PUBLIC_PRO_MONTHLY_USD),
      period: `/${monthly?.period ?? "month"}`,
      answer: "Find your Offer Ceiling and what could break the deal before you make the offer.",
    },
  ];

  return (
    <>
      <Header initialUser={user} initialEntitlements={entitlements} />

      <main id="main" className="min-h-screen bg-background">
        <JsonLd data={pricingSchema} />
        {/* Hero. Lead with the outcome (docs/site-overhaul.md Phase 9). The
            arithmetic is deliberately simple and checkable and every figure
            comes from PRICING_OUTCOME_EXAMPLE, not this file. */}
        <PageHero
          data-pricing-outcome=""
          title={
            <>
              Overpaying by {PRICING_OUTCOME_EXAMPLE.overpayPct}% on a{" "}
              {formatUsdWhole(PRICING_OUTCOME_EXAMPLE.purchasePriceUsd)} rental costs{" "}
              {formatUsdWhole(PRICING_OUTCOME_EXAMPLE.overpayUsd)}{" "}
              — before you collect a dollar of rent.
            </>
          }
          lede={
            !user
              ? `Complete your first decision free. Create an account for ${EVALUATION_FACTS.durationDays} days, ${EVALUATION_FACTS.dealLimit} ${proOfferName} deals, and ${EVALUATION_FACTS.comparisonLimit} comparison — no card.`
              : activePaidPlanSlug || billingRecoveryRequired
                ? `Screen any deal free. Use ${proOfferName} to review Buy Box fit, the Offer Ceiling, what could break, and how to share the underwrite.`
                : pricingEvaluation.status === "active" && evaluationAllowance
                  ? `Your free trial has ${evaluationAllowance}.`
                  : pricingEvaluation.status === "exhausted"
                    ? "Your free-trial runs are complete. Keep screening deals free, or subscribe when you want another complete Pro decision."
                    : pricingEvaluation.status === "expired"
                      ? "Your free trial has ended. Keep screening deals free, or subscribe when you want another complete Pro decision."
                      : `Screen any deal free. Use ${proOfferName} to review Buy Box fit, the Offer Ceiling, what could break, and how to share the underwrite.`
          }
          actions={
            <ActionRow>
              <Link
                href="/analyze" prefetch={false}
                className={buttonVariants({ size: "cta" })}
              >
                Analyze a property free
              </Link>
              <Link
                href="#pro"
                className={buttonVariants({ size: "cta", variant: "outline" })}
              >
                See Pro plans
              </Link>
            </ActionRow>
          }
          aside={
            /* The stage chooser, set as a ledger in the hero's wider column
               (the homepage's 5/7 grid from 1024px; it follows the text on
               phones): a caption on the heavy rule, then one ruled row per
               plan with the job, the plan and its price in DM Mono, and what
               it answers. It puts every price in the first screen. */
            <div data-pricing-stages="">
              <h2
                id="pricing-stage-title"
                className="text-balance border-b-2 border-foreground pb-2.5 text-base font-semibold"
              >
                Which stage are you at?
              </h2>
              <ul>
                {stages.map((stage) => (
                  <li
                    key={stage.job}
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4 border-b border-rule-soft py-3.5"
                  >
                    <h3 className="col-span-2 text-balance text-lg font-semibold">
                      {stage.job}
                    </h3>
                    <p className="mt-0.5 min-w-0 text-base">
                      {/* A 44px tap target from padding that the negative
                          margin takes back out of the line box. */}
                      <Link
                        href={stage.href}
                        className="tc-link -my-3 inline-block min-w-11 py-3 font-semibold"
                      >
                        {stage.product}
                      </Link>
                    </p>
                    <p className="mt-0.5 flex items-baseline justify-end gap-x-1 whitespace-nowrap">
                      <LedgerFigure className="text-xl font-medium">{stage.price}</LedgerFigure>
                      <span className="text-sm text-muted-foreground">{stage.period}</span>
                    </p>
                    <p className="col-span-2 mt-1 max-w-[64ch] text-pretty text-base leading-relaxed text-muted-foreground">
                      {stage.answer}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          }
        >
          {/* Keep-and-add (2026-09 agent-first pass): the overpay arithmetic
              stays the headline; one line speaks to the agent, set like the
              homepage's investor cue on its soft rule. */}
          {!user && agentProConfigured ? (
            <p
              data-pricing-agent-line=""
              className="mt-6 border-t border-rule-soft pt-2.5 text-base"
            >
              Working with investor clients? The client remembers who caught
              it.{" "}
              {/* A 44px tap target from padding that the negative margin
                  takes back out of the line box. */}
              <Link href="/for-agents" className="tc-link -my-3 inline-block py-3">
                TrueCap for agents
              </Link>
            </p>
          ) : null}
        </PageHero>

        {/* Plans — the Free / Pro (/ Agent Pro) cards under one Monthly ↔
            Annual toggle. The toggle consistently outperforms separate
            cards because users directly compare per-month cost. ~10-15%
            lift on annual. */}
        {/* id="plans" — scroll target for exit-intent CTAs, Stripe's
            cancel_url (app/actions/billing.ts) and any other deep link that
            needs to land directly on the plan toggle. The hero's rule sits
            above it, so the section adds none. */}
        <Section
          id="plans"
          rhythm="tight"
          rule="none"
          aria-labelledby="pricing-plans-title"
        >
          <h2 id="pricing-plans-title" className="sr-only">Plans</h2>
          {/* Abandoned-checkout reassurance — cancel_url (app/actions/billing.ts)
              points back here with ?billing=checkout_cancelled. Suspense keeps
              the page's rendering unaffected by the banner's useSearchParams. */}
          <Suspense fallback={null}>
            <CheckoutCancelledBanner
              hadPriorSubscription={hadPriorSubscription}
              evaluation={pricingEvaluation}
            />
          </Suspense>
          <PricingTogglePlans
            monthly={monthly}
            annual={annual}
            agentMonthly={agentMonthly}
            agentAnnual={agentAnnual}
            isAuthenticated={Boolean(user)}
            activePaidPlanSlug={activePaidPlanSlug}
            evaluation={pricingEvaluation}
            billingRecoveryRequired={billingRecoveryRequired}
            agentProConfigured={agentProConfigured}
            proOfferName={proOfferName}
          />
          {/* Trust row (Phase 9): the four facts a buyer checks before the
              card form, set under the card row and its trial terms, on one
              rule. Each is true today: no card to start (evaluation flow),
              cancel from the profile, Stripe Checkout, and the public
              methodology page. */}
          <ul
            data-pricing-trust-row
            className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-1 border-t border-border py-2 text-base font-semibold"
          >
            <li>Free to start — no card</li>
            <li>Cancel anytime from your profile</li>
            <li>Payments handled by Stripe</li>
            <li>
              <IntentPrefetchLink
                href="/methodology"
                className="tc-link inline-flex min-h-11 items-center"
              >
                Methodology is public
              </IntentPrefetchLink>
            </li>
          </ul>
        </Section>

        {/* Feature comparison: the ladder under the cards (DESIGN.md
            "Homepage structure": plans, then the comparison table under
            them), so the plans block reads cards, terms, table. */}
        <Section rhythm="tight" aria-labelledby="pricing-compare-title">
          <div className="max-w-3xl">
            <SectionHeading id="pricing-compare-title">What you get</SectionHeading>
            <p className="mt-3 max-w-[62ch] text-pretty text-lg leading-relaxed text-muted-foreground">
              Free answers whether the deal deserves attention. Pro shows the
              Offer Ceiling, what could break, and what to verify next.
              {agentProConfigured
                ? " Agent Pro does all of that per client, with a roster."
                : ""}
            </p>
          </div>
          {/* Phones use ruled rows (the tiers side by side under each
              feature); tablet and desktop keep the denser semantic table.
              No narrow viewport has to pan sideways. */}
          <ul className="mt-8 border-t-2 border-foreground sm:hidden">
            {FEATURE_COMPARISON.map(([label, free, pro]) =>
              !alertsLive &&
              label === "Rate-drop alerts on saved deals" ? null : (
                <li key={label} className="border-b border-rule-soft py-3">
                  <p className="text-base font-semibold">{label}</p>
                  <dl
                    className={
                      agentProConfigured
                        ? "mt-1.5 grid grid-cols-3 gap-x-4 text-sm"
                        : "mt-1.5 grid grid-cols-2 gap-x-4 text-sm"
                    }
                  >
                    <div className="min-w-0">
                      <dt className="text-muted-foreground">Free</dt>
                      <dd className="mt-0.5">
                        <MobileFeatureValue value={free} />
                      </dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-muted-foreground">{proOfferName}</dt>
                      <dd className="mt-0.5">
                        <MobileFeatureValue value={pro} />
                      </dd>
                    </div>
                    {agentProConfigured ? (
                      <div className="min-w-0">
                        <dt className="text-muted-foreground">Agent Pro</dt>
                        <dd className="mt-0.5">
                          <MobileFeatureValue value={agentProCell(label, pro)} />
                        </dd>
                      </div>
                    ) : null}
                  </dl>
                </li>
              ),
            )}
          </ul>
          {/* The homepage ladder's grammar: opens on the heavy rule, a rule
              under the heads, soft rules between rows, marks in ink. */}
          <ScrollX label="Table" className="mt-8 hidden border-t-2 border-foreground sm:block">
            <table className="w-full border-collapse text-sm sm:text-base">
              <caption className="sr-only">
                Features included with Free, {proOfferName}
                {agentProConfigured ? ", and Agent Pro" : ""}
              </caption>
              <thead>
                <tr className="border-b border-border">
                  <th scope="col" className="py-2.5 pr-4 text-left font-semibold">
                    Feature
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-center font-semibold">
                    Free
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-center font-semibold">
                    {proOfferName}
                  </th>
                  {agentProConfigured ? (
                    <th scope="col" className="px-4 py-2.5 text-center font-semibold">
                      Agent Pro
                    </th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {FEATURE_COMPARISON.map(([label, free, pro]) =>
                  !alertsLive &&
                  label === "Rate-drop alerts on saved deals" ? null : (
                    <tr key={label} className="border-b border-rule-soft">
                      <th scope="row" className="py-2.5 pr-4 text-left font-normal">
                        {label}
                      </th>
                      <Cell value={free} />
                      <Cell value={pro} />
                      {agentProConfigured ? (
                        <Cell value={agentProCell(label, pro)} />
                      ) : null}
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </ScrollX>
        </Section>

        {/* The explanation after the table: the paid tiers as outcomes (its
            own Section), the tier shots, then the DealCheck comparison. The
            value stack sits between the table ("What you get") and the shots
            ("What you get at each tier") so the two headings never meet. */}
        <PricingValueStack agentProConfigured={agentProConfigured} />

        {/* What each tier produces — REAL screenshots from the sample flow
            (Phase 4). One per tier; Agent Pro only when it is sold. The
            Agent Pro shot is a capture of the /sample-decision-memo page
            (public/product/manifest.json), not of the co-branded share page
            or PDF, and its caption says so. Set as
            documents (a 1px rule, no browser chrome), captions kept. From
            768px the shots sit side by side in one shared frame box
            (SHOT_FRAME), so the frames and captions line up whatever each
            capture's proportion; phones keep each capture's own. */}
        <Section aria-labelledby="pricing-shots-title">
          <div className="max-w-3xl">
            <SectionHeading id="pricing-shots-title">
              What you get at each tier
            </SectionHeading>
            <p className="mt-3 max-w-[62ch] text-pretty text-lg leading-relaxed text-muted-foreground">
              Real output from the free sample deal, not mockups.{" "}
              <Link href="/analyze?sample=1" prefetch={false} className="tc-link">
                Run it yourself
              </Link>
            </p>
          </div>
          <div className={cn("mt-8 grid gap-8 md:grid-cols-2", agentProConfigured && "lg:grid-cols-3")}>
            <ProductShot
              shot={DECISION_SHOT}
              frame="document"
              className={SHOT_FRAME}
              alt="Free tier: the decision view for the sample deal — the Offer Ceiling beside the asking price, cash flow after reserves, DSCR, and the best next step"
              caption={<><strong className="font-semibold text-foreground">Free.</strong> Your first full decision.</>}
            />
            <ProductShot
              shot={RENT_BREAKDOWN_SHOT}
              frame="document"
              className={SHOT_FRAME}
              alt={`${proOfferName}: the cash-flow breakdown for the sample deal — where each month's rent goes, from operating expenses and reserves to debt service and cash flow`}
              caption={<><strong className="font-semibold text-foreground">{proOfferName}.</strong> Know what to offer on every deal.</>}
            />
            {agentProConfigured ? (
              <ProductShot
                shot={MEMO_SHOT}
                frame="document"
                className={SHOT_FRAME}
                alt="Agent Pro: the sample decision memo page for the sample deal, with the decision at asking, the Offer Ceiling with its targets, cash flow, cap rate, cash-on-cash and DSCR, what could break the decision, and what to verify next"
                caption={<><strong className="font-semibold text-foreground">Agent Pro.</strong> The sample decision memo page. Your client&apos;s co-branded share link and PDF are laid out differently.</>}
              />
            ) : null}
          </div>
        </Section>

        {/* One honest comparison (docs/site-overhaul.md Phase 9). The
            DealCheck figures live in DEALCHECK_COMPARISON so this file holds
            no amounts. As rendered on dealcheck.io/pricing on 2026-10-01 they
            are the per-month prices under yearly billing (paying monthly
            costs more); the heading does not say so yet, and changing it
            waits on the founder (the constants are in the pricing module).
            Branding on DealCheck's PDF reports is a DealCheck Pro feature;
            every plan exports the report itself. */}
        <Section
          data-pricing-comparison
          aria-labelledby="pricing-dealcheck-title"
        >
          <div className="max-w-3xl">
            <SectionHeading id="pricing-dealcheck-title">
              How this compares to DealCheck ({formatUsdWhole(DEALCHECK_COMPARISON.plusMonthlyUsd)}{" "}
              Plus / {formatUsdWhole(DEALCHECK_COMPARISON.proMonthlyUsd)} Pro)
            </SectionHeading>
            <p className="mt-3 max-w-[62ch] text-pretty text-lg leading-relaxed text-muted-foreground">
              DealCheck is a calculator; TrueCap is a decision — Offer Ceiling, Buy
              Box fit, downside stress test, and a memo. If you only need metrics,
              DealCheck or a spreadsheet is fine.
              {agentProConfigured
                ? " Every DealCheck plan exports a PDF report; putting your own name and logo on it needs DealCheck Pro. For agents, Agent Pro is for screening each listing against a specific client's Buy Box, that client's Offer Ceiling, and a co-branded decision memo the client can open without an account."
                : ""}
            </p>
            <IntentPrefetchLink
              href={DEALCHECK_COMPARISON.href}
              className="tc-link mt-3 inline-flex min-h-11 items-center"
            >
              Read the full DealCheck comparison
            </IntentPrefetchLink>
          </div>
        </Section>

        {/* Consented quotes from the in-product prompt (Phase 5); renders
            nothing until real published rows exist. */}
        {/* No paid-customer heading override: publication is gated on activity
            (lib/testimonials/rules.ts), not on plan, so a free account's
            quote can publish here — the component default is the truthful
            label. The component is its own Section. */}
        <Testimonials limit={3} />

        {/* FAQ: the shared ruled list. The page emits its own FAQPage below
            (the same FAQS records), so the section adds none — one FAQPage
            node per page, mirroring exactly the visible questions. Split as
            on the homepage: from 1024px the heading, the contact line and
            the page's close (the free action again) sit in the left 5
            columns beside the ruled questions. */}
        <FaqSection
          id="faq"
          heading="Frequently asked"
          items={faqs}
          structuredData={false}
          layout="split"
          contact={
            <>
              <p className="mt-4 text-base text-muted-foreground">
                Still have a question?{" "}
                <a
                  href="mailto:hello@usetruecap.com"
                  className="tc-link inline-flex min-h-11 items-center"
                >
                  Email hello@usetruecap.com
                </a>
              </p>
              <ActionRow className="mt-6">
                <Link
                  href="/analyze" prefetch={false}
                  className={buttonVariants({ size: "cta" })}
                >
                  Analyze a deal free
                </Link>
              </ActionRow>
            </>
          }
        />

        {/* JSON-LD FAQPage for SEO */}
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faqs.map((f) => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
          }}
        />
      </main>
      <SiteFooter hideAccountLinks={Boolean(user)} />
      <ScrollDepthTracker />
    </>
  );
}

function Cell({ value }: { value: boolean | string }) {
  // sr-only text keeps the mark cells legible for screen readers and
  // for crawlers/AI assistants — icon-only cells read as empty in
  // both, which made the whole Free-vs-Pro table invisible to them.
  // Marks are ink (DESIGN.md Sign Rule: green is for a number's sign or
  // a pass/fail, blue is for actions).
  return (
    <td className="px-4 py-2.5 text-center">
      {value === true ? (
        <>
          <Check aria-hidden className="mx-auto size-4 text-foreground" />
          <span className="sr-only">Included</span>
        </>
      ) : value === false ? (
        <>
          <span aria-hidden className="text-muted-foreground">–</span>
          <span className="sr-only">Not included</span>
        </>
      ) : (
        <span className="text-sm">{value}</span>
      )}
    </td>
  );
}

function MobileFeatureValue({ value }: { value: boolean | string }) {
  if (value === true) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <Check aria-hidden className="size-4" /> Included
      </span>
    );
  }
  if (value === false) {
    return <span className="text-muted-foreground">Not included</span>;
  }
  return <span>{value}</span>;
}
