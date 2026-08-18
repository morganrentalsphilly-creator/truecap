/**
 * Public /pricing page. Two plans + free, FAQ, trust strip,
 * conversion-focused. For unauthenticated visitors the CTA routes to
 * /auth/sign-up?next=/pricing?checkout=<plan>#plans, so they come back
 * here and PricingPlanButtons auto-resumes the exact checkout they
 * started (the param is read client-side via window.location — no
 * useSearchParams, so no extra Suspense boundary is needed here); for
 * authenticated free users the CTA triggers Stripe checkout directly
 * via the existing billing action. A Stripe cancel returns with
 * ?billing=checkout_cancelled (CheckoutCancelledBanner below), which
 * the auto-resume treats as mutually exclusive — it never re-fires.
 */

import { TRIAL_DAYS, TRIAL_LABEL } from "@/lib/trial";
import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Check, ShieldCheck, Sparkles, X } from "lucide-react";
import { Header } from "@/components/investcalc/header";
import { CheckoutCancelledBanner } from "@/components/marketing/checkout-cancelled-banner";
import { PricingTogglePlans } from "@/components/marketing/pricing-toggle-plans";
import {
  getEntitlementsForUser,
  getActivePaidPlanSlug,
  hasAnySubscriptionHistory,
} from "@/lib/entitlements";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isAgentProConfigured } from "@/lib/stripe/plan-prices";
import { loadStripeDisplayPrice } from "@/lib/stripe/display-prices";

import { PricingValueStack } from "@/components/marketing/pricing-value-stack";
import { isPackCreditConfigured, PACK_CREDIT_WINDOW_DAYS } from "@/lib/pack-credit";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SiteFooter } from "@/components/marketing/site-footer";
import { DealsAnalyzedTicker } from "@/components/marketing/deals-analyzed-ticker";
import { NeverOverpayGuarantee } from "@/components/marketing/landing-sections";
import { GuaranteeBadge } from "@/components/marketing/guarantee-badge";
import { TestimonialStrip } from "@/components/marketing/testimonial-card";
import { getMarketingOfferConfig } from "@/lib/marketing-offer-config";
import { rateAlertEmailsLive } from "@/lib/rate-alerts-mode";
import { getSiteUrl } from "@/lib/site-url";
export const metadata: Metadata = {
  title: "Pricing — Screen Free, Decide & Act with Pro",
  description:
    `Screen rental deals free. New subscribers get a ${TRIAL_DAYS}-day free trial of Pro to solve Max Offer, apply a Buy Box, stress-test downside, compare opportunities, and generate reports.`,
  alternates: { canonical: "/pricing" },
  openGraph: {
    title: "TrueCap pricing — Free to screen, Pro to decide",
    description: "Screen deals free. Use Pro to know your Max Offer, stress-test downside, compare opportunities, and act.",
    url: "/pricing",
    type: "website",
    images: [{ url: "/home.jpg", width: 1200, height: 630, alt: "TrueCap pricing" }],
  },
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
};

// FREE_FEATURES + PRO_FEATURES lists were lifted into the toggle
// component (components/marketing/pricing-toggle-plans.tsx) so they
// stay co-located with the cards that render them.

const FAQS: { q: string; a: string }[] = [
  {
    q: "Is TrueCap really free?",
    // Keep this answer in lockstep with the homepage FAQ
    // (components/marketing/landing-sections.tsx), the plan cards
    // (pricing-toggle-plans.tsx), and the actual gating in
    // app/page.tsx. MAO, sensitivity, BRRRR/fix-and-flip, and share
    // links are PRO features — a previous version of this answer
    // claimed they were free, contradicting every other surface.
    a: "Yes. The cash-flow analyzer — cap rate, CoC, DSCR, monthly cash flow, address auto-fill, the 0–100 Deal Score, and a plain-English verdict — is free forever and unlimited. No card required to start. Pro adds a personal buy box (your criteria, checked on every deal), MAO solver, sensitivity grid, BRRRR + fix-and-flip, 10-year projections, illustrative tax impact, modeled exit comparisons, co-branded shareable links, and Deal Decision Pack PDFs.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. Cancel from your profile in one click. Your Pro features stay active until the end of the period you've paid for, then automatically downgrade to Free.",
  },
  {
    q: "How does the Pro trial work?",
    a: `Stripe collects a card at checkout. New subscribers get full Pro access for ${TRIAL_DAYS} days, and you can cancel online anytime. Subscription billing starts after the trial unless you cancel first. Returning subscribers start paid access immediately and are not eligible for another free trial.`,
  },
  {
    q: "What is the Never Overpay Guarantee?",
    a: "Analyze at least 10 deals in your first 30 days as a paying Pro subscriber. If you don't feel more confident about exactly what to offer, email us within those 30 days and we'll refund every dollar you've paid — back to your original payment method via Stripe. Full terms at usetruecap.com/guarantee.",
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
    a: "Rent uses a HUD area benchmark (ZIP-level when available, otherwise county-level), not a property-specific rent comp. The rate uses FRED's national owner-occupied 30-year benchmark, not an investor lender quote. Property tax starts from a state effective-rate estimate. Every field is editable — replace these screening defaults with local comps, the actual tax bill, insurance, and written loan terms before making an offer.",
  },
  {
    q: "Is this for agents, investors, or both?",
    a: "Both. Investors use TrueCap to underwrite their own deals. Agents use it to send a defensible analysis to a client at the showing. The shared-link feature was built for exactly that hand-off.",
  },
];

export default async function PricingPage() {
  const { proOfferName, singleDeal, singleDealPriceVariant, guaranteeEnabled } =
    getMarketingOfferConfig();
  const alertsLive = rateAlertEmailsLive();
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // hadPriorSubscription mirrors the repeat-trial guard in
  // app/actions/billing.ts (any subscription row, any status): checkout only
  // grants the free trial to first-time subscribers, so the plan cards swap
  // their trial-promising copy for a "Welcome back" variant when the trial
  // won't be granted. Anonymous visitors keep the trial copy — they're
  // overwhelmingly first-time, and checkout re-checks after signup anyway.
  // Agent Pro renders ONLY when its Stripe price env is configured — until
  // then the tier is fully plumbed but invisible (nothing to sell yet).
  // Whether Agent Pro EXISTS is a configuration fact (env + plan rows), not a
  // function of whether Stripe answered this request. Deriving visibility from
  // the fetched price meant one transient Stripe error deleted a live tier from
  // the pricing page for that visitor.
  const agentProConfigured = isAgentProConfigured();
  // The credit promise renders only when it is fully redeemable as
  // promised: coupon env set AND the $5 'current' variant is selling
  // (redemption hard-filters to the $5 amount; see lib/pack-credit.ts).
  const packCreditConfigured =
    isPackCreditConfigured() && singleDealPriceVariant === "current";
  // The guarantee kill switch must silence EVERY refund promise, including
  // this page's FAQ prose and its FAQPage JSON-LD (review finding 2026-08-17).
  const faqs = guaranteeEnabled
    ? FAQS
    : FAQS.filter((f) => f.q !== "What is the Never Overpay Guarantee?");
  const [monthly, annual, agentMonthly, agentAnnual, activePaidPlanSlug, hadPriorSubscription] = await Promise.all([
    loadStripeDisplayPrice("pro_monthly"),
    loadStripeDisplayPrice("pro_annual"),
    agentProConfigured ? loadStripeDisplayPrice("agent_pro_monthly") : Promise.resolve(null),
    agentProConfigured ? loadStripeDisplayPrice("agent_pro_annual") : Promise.resolve(null),
    user ? getActivePaidPlanSlug(supabase, user.id) : Promise.resolve(null),
    user ? hasAnySubscriptionHistory(supabase, user.id) : Promise.resolve(false),
  ]);
  const entitlements = user ? await getEntitlementsForUser(supabase, user.id) : null;
  const siteUrl = getSiteUrl();
  const recurringOffers = [
    ["TrueCap Pro Monthly", monthly],
    ["TrueCap Pro Annual", annual],
    ["TrueCap Agent Pro Monthly", agentMonthly],
    ["TrueCap Agent Pro Annual", agentAnnual],
  ] as const;
  const pricingSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "TrueCap",
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web",
    url: `${siteUrl}/pricing`,
    offers: [
      { "@type": "Offer", name: "TrueCap Free", price: 0, priceCurrency: "USD", url: `${siteUrl}/` },
      { "@type": "Offer", name: "TrueCap Deal Decision Pack", price: singleDeal.amount, priceCurrency: "USD", url: `${siteUrl}/pricing` },
      ...recurringOffers.flatMap(([name, price]) =>
        price
          ? [{ "@type": "Offer", name, price: price.unitAmount, priceCurrency: price.currency, url: `${siteUrl}/pricing` }]
          : []
      ),
    ],
  };
  // The Monthly ↔ Annual savings math is now done inside
  // <PricingTogglePlans> so it can react to the user's toggle state.
  // We just hand it both Stripe prices.

  // The exit-intent "50% off" offer was removed entirely (founder decision,
  // 2026-07): no discount offers anywhere — full price only.

  return (
    <>
      <Header initialUser={user} initialEntitlements={entitlements} />

      <main id="main" className="min-h-screen bg-background">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(pricingSchema) }}
        />
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-border bg-gradient-to-b from-[var(--brand-blue-light)] via-background to-background">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-32 left-1/2 -z-10 h-[420px] w-[820px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl"
          />
          <div className="mx-auto max-w-5xl px-4 pb-10 pt-12 sm:px-6 sm:pb-14 sm:pt-16 text-center">
            <div className="mx-auto mb-5 flex w-fit items-center gap-2 rounded-full border border-primary/20 bg-card/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-primary shadow-sm backdrop-blur">
              <Sparkles className="size-3" />
              Analyze free · No card required
            </div>
            <h1 className="text-balance text-3xl font-extrabold leading-[1.1] tracking-tight text-foreground sm:text-5xl">
              From listing to confident offer. <span className="text-primary">One decision workflow.</span>
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-balance text-[15px] leading-relaxed text-muted-foreground sm:text-lg">
              {/* Trial-promising hero variant must mirror the checkout guard
                  (billing.ts repeat-trial check) exactly like the plan cards
                  below — an ex-subscriber sees "go Pro", not a trial that
                  checkout won't grant. */}
              {!user
                ? `Screen any deal free. New subscribers get a ${TRIAL_DAYS}-day free trial of ${proOfferName}; returning subscribers start paid access immediately.`
                : hadPriorSubscription
                  ? `Screen any deal free. Use ${proOfferName} to get four acquisition answers: pursue or pass, what to offer, what could break, and how to present the decision.`
                  : `Screen any deal free, then use a ${TRIAL_LABEL} of ${proOfferName} to get four acquisition answers: pursue or pass, what to offer, what could break, and how to present the decision.`}
            </p>
            <div className="mt-6 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
              <Link
                href="/#main"
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-[0_8px_22px_rgba(0,112,196,0.24)] transition hover:bg-primary/95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                Get My Max Offer
              </Link>
              <Link
                href="#plans"
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border bg-card px-5 py-3 text-sm font-bold text-foreground transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                See Pro plans
              </Link>
            </div>
            {/* Guarantee-first: the risk reversal is visible before any
                price is (Never Overpay Guarantee, canonical at /guarantee). */}
            <GuaranteeBadge className="mt-4" />
            {/* Real-data social proof — investors arriving at /pricing
                are evaluating credibility. A live count of recent
                analyses converts skepticism faster than testimonials. */}
            <div className="mt-5 flex justify-center">
              <DealsAnalyzedTicker window="7d" />
            </div>
          </div>
        </section>

        <section aria-labelledby="pricing-stage-title" className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-12">
          <div className="text-center">
            <p className="text-[11px] font-bold uppercase tracking-widest text-primary">Choose the job</p>
            <h2 id="pricing-stage-title" className="mt-2 text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
              Which stage are you at?
            </h2>
          </div>
          <div className={`mt-7 grid gap-3 ${agentProConfigured ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-3"}`}>
            {[
              { job: "Screen", product: "Free", answer: "Is this worth investigating?" },
              { job: "Decide", product: `Deal Decision Pack · ${singleDeal.priceLabel}`, answer: "Should I offer, and what should I offer?" },
              { job: "Acquire", product: proOfferName, answer: "Repeat the decision workflow across every deal." },
              ...(agentProConfigured
                ? [{ job: "Win investor clients", product: "Agent Pro", answer: "Match, present, and follow up professionally." }]
                : []),
            ].map((item) => (
              <div key={item.job} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-widest text-primary">{item.product}</p>
                <h3 className="mt-1 text-lg font-extrabold text-foreground">{item.job}</h3>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.answer}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Plans — 2-card layout with Monthly ↔ Annual toggle on Pro
            (replaced the previous 3-card side-by-side). The toggle
            consistently outperforms separate cards because users
            directly compare per-month cost. ~10-15% lift on annual. */}
        {/* id="plans" — scroll target for exit-intent CTAs and any other
            deep link that needs to land directly on the plan toggle. */}
        <section id="plans" className="mx-auto -mt-2 max-w-5xl px-4 pb-6 sm:px-6">
          {/* Abandoned-checkout reassurance — cancel_url (app/actions/billing.ts)
              points back here with ?billing=checkout_cancelled. Suspense keeps
              the page's rendering unaffected by the banner's useSearchParams. */}
          <Suspense fallback={null}>
            <CheckoutCancelledBanner hadPriorSubscription={hadPriorSubscription} />
          </Suspense>
          <PricingTogglePlans
            monthly={monthly}
            annual={annual}
            agentMonthly={agentMonthly}
            agentAnnual={agentAnnual}
            isAuthenticated={Boolean(user)}
            activePaidPlanSlug={activePaidPlanSlug}
            hadPriorSubscription={hadPriorSubscription}
            agentProConfigured={agentProConfigured}
            proOfferName={proOfferName}
            rateAlertsLive={alertsLive}
          />

          {/* Avoided-mistake frame (2026-08 offer rollout): the price
              objection is answered against the cost of overpaying on the
              asset — not against hourly time savings (the previous $/hr
              ROI widget framing was retired with the repositioning). The
              arithmetic is deliberately simple and checkable: 3% × $250,000
              = $7,500. */}
          <div className="mx-auto mt-8 max-w-2xl rounded-2xl border border-border bg-card p-5 text-center sm:p-6">
            <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
              <strong className="text-foreground">
                Overpaying by even 3% on a $250,000 rental costs $7,500
              </strong>{" "}
              — before you collect a dollar of rent. Pro
              {monthly?.amountLabel ? ` is ${monthly.amountLabel}/mo and` : ""} computes
              your walk-away price on every deal you look at.
            </p>
          </div>

          {/* Verified customer quotes near the CTAs (2026-08 offer rollout,
              superseding the earlier ticker-only stance). Renders null until
              records pass the lib/proof-records.ts verification + approval
              gate, so the ticker below stays the sole proof until real
              quotes exist — nothing fake can render here. */}
          <div className="mx-auto mt-8 max-w-4xl">
            <TestimonialStrip limit={2} />
          </div>

          {/* Trust strip */}
          <div className="mx-auto mt-6 flex max-w-2xl flex-wrap items-center justify-center gap-x-6 gap-y-2 rounded-2xl border border-border bg-card px-5 py-4 text-center text-xs text-muted-foreground sm:text-sm">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="size-4 text-[var(--metric-positive)]" />
              <strong className="text-foreground">Free to start — no card</strong>
            </span>
            <span aria-hidden className="text-muted-foreground/40">·</span>
            <span>
              {!user ? (
                <>
                  <strong className="text-foreground">
                    New subscribers get a {TRIAL_DAYS}-day free trial
                  </strong>
                  ; returning subscribers start paid access immediately
                </>
              ) : hadPriorSubscription ? (
                <><strong className="text-foreground">Full access immediately</strong></>
              ) : (
                <><strong className="text-foreground">{TRIAL_DAYS} days of full Pro</strong> before subscription billing</>
              )}
            </span>
            <span aria-hidden className="text-muted-foreground/40">·</span>
            <span><strong className="text-foreground">Cancel online anytime</strong> from your profile</span>
            <span aria-hidden className="text-muted-foreground/40">·</span>
            <span>Powered by <strong className="text-foreground">Stripe</strong></span>
          </div>
        </section>

        {/* Feature comparison */}
        <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
          <h2 className="text-center text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
            What you get
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-center text-sm text-muted-foreground sm:text-base">
            Free answers whether the deal deserves attention. Pro answers what
            to offer, what could break, and what to do next.
          </p>
          {/* Outcome-framed value stack leads; the exhaustive table below is
              the secondary reference for line-item shoppers. */}
          <div className="mt-8">
            <PricingValueStack
              proOfferName={proOfferName}
              agentProConfigured={agentProConfigured}
            />
          </div>
          {/* overflow-x-auto so narrow viewports scroll horizontally
              instead of clipping columns. The inner min-w-[520px] keeps
              the column widths legible at the smallest phones — without
              it, three columns squeezed into 320px is unreadable. */}
          <div
            role="region"
            aria-label="Free and Pro feature comparison"
            tabIndex={0}
            className="tc-reveal mt-8 overflow-x-auto rounded-2xl border border-border bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <table className="w-full min-w-[520px] text-sm">
              <caption className="sr-only">Features included with TrueCap Free and TrueCap Pro</caption>
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-3 text-left font-bold text-foreground sm:px-6">Feature</th>
                  <th className="px-4 py-3 text-center font-bold text-foreground sm:px-6">Free</th>
                  <th className="px-4 py-3 text-center font-bold text-primary sm:px-6">Pro</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Unlimited analyses", true, true],
                  ["Cap rate · CoC · DSCR · cash flow", true, true],
                  ["Auto-fill screening benchmarks (HUD rent · FRED owner-occupied rate · state tax)", true, true],
                  ["Deal Score (0–100) with breakdown", true, true],
                  ["Sale + rent comps from the address", "1 free", "50 / mo"],
                  ["MAO solver · Sensitivity grid", false, true],
                  ["BRRRR + fix-and-flip + rehab estimator", false, true],
                  ["Shareable read-only deal links", true, true],
                  ["10-year cash flow projection", false, true],
                  ["Illustrative tax impact + depreciation", false, true],
                  ["Modeled exit-year comparison", false, true],
                  ["Buy Box auto-screening", false, true],
                  ["Deal pipeline + tags (CRM)", false, true],
                  ["Saved analysis templates", false, true],
                  ["Due-diligence checklist + document vault", false, true],
                  ...(alertsLive
                    ? [["Rate-drop alerts on saved deals", false, true] as const]
                    : []),
                  ["Lender · partner · personal PDF reports", `${singleDeal.priceLabel} one-time`, true],
                  ["Save deals", "Up to 5", "Unlimited"],
                  ["Compare deals side-by-side", false, "Up to 4"],
                ].map(([label, free, pro], i) => (
                  <tr key={String(label)} className={i % 2 === 0 ? "bg-card" : "bg-muted/20"}>
                    <td className="px-4 py-3 text-foreground sm:px-6">{String(label)}</td>
                    <Cell value={free} />
                    <Cell value={pro} pro />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Deal Decision Pack — one complete acquisition decision
            package without committing to a subscription.
            Fully automated since Jun 2026: run a free analysis, click
            Export PDF, complete Stripe Checkout, and the full report
            downloads instantly (see app/actions/one-time-pdf.ts +
            PdfPurchaseDialog). Replaced the old mailto + "1 business
            day" manual flow. */}
        <section className="mx-auto max-w-3xl px-4 pb-12 sm:px-6 sm:pb-16">
          <div className="rounded-2xl border border-border bg-card p-6 sm:p-7">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="rounded-full bg-[var(--brand-green)]/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-[var(--brand-green)]">
                    One-time · {singleDeal.priceLabel}
                  </span>
                  <span className="text-[11px] text-muted-foreground">No subscription · No account</span>
                </div>
                <h3 className="text-xl font-extrabold text-foreground">
                  Just need one property decided?
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  Run your analysis free, then unlock the Deal Decision Pack once.
                  The report includes your deterministic Max Offer, Deal Doctor
                  rent/rate thresholds, assumptions, verdict, downside scenario,
                  10-year projection, illustrative tax-impact view, and modeled exit comparisons.
                  {packCreditConfigured ? (
                    <>
                      {" "}
                      <strong className="text-foreground">
                        Buy while signed in and your {singleDeal.priceLabel} is
                        credited toward Pro
                      </strong>{" "}
                      if you upgrade within {PACK_CREDIT_WINDOW_DAYS} days.
                    </>
                  ) : (
                    <> Use Pro for the repeat decision workflow.</>
                  )}
                </p>
              </div>
              <Link
                href="/#main"
                className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-bold text-foreground transition-transform hover:-translate-y-0.5 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98]"
              >
                Get My Max Offer
              </Link>
            </div>
          </div>
        </section>

        <NeverOverpayGuarantee />

        {/* FAQ */}
        <section className="mx-auto max-w-3xl px-4 pb-16 sm:px-6 sm:pb-24">
          <h2 className="text-center text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
            Frequently asked
          </h2>
          <div className="tc-reveal mt-8 divide-y divide-border rounded-2xl border border-border bg-card">
            {faqs.map((faq) => (
              <details key={faq.q} className="group px-5 py-4 sm:px-6 sm:py-5">
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <span className="font-semibold text-foreground">{faq.q}</span>
                  <span
                    aria-hidden
                    className="text-2xl font-light text-muted-foreground transition-transform group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{faq.a}</p>
              </details>
            ))}
          </div>

          <div className="mt-10 flex flex-col items-center gap-3 text-center">
            <p className="text-sm text-muted-foreground">Still have questions?</p>
            <Link
              href="/"
              className="inline-flex min-h-11 items-center gap-1.5 rounded text-sm font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Try the calculator first — it&apos;s free →
            </Link>
          </div>
        </section>

        {/* JSON-LD FAQPage for SEO */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: faqs.map((f) => ({
                "@type": "Question",
                name: f.q,
                acceptedAnswer: { "@type": "Answer", text: f.a },
              })),
            }),
          }}
        />
      </main>
      <SiteFooter />
      <ScrollDepthTracker />
    </>
  );
}

function Cell({ value, pro }: { value: boolean | string; pro?: boolean }) {
  // sr-only text keeps the icon cells legible for screen readers and
  // for crawlers/AI assistants — icon-only cells read as empty in
  // both, which made the whole Free-vs-Pro table invisible to them.
  return (
    <td className="px-4 py-3 text-center sm:px-6">
      {value === true ? (
        <>
          <Check aria-hidden className={`mx-auto size-4 ${pro ? "text-primary" : "text-[var(--metric-positive)]"}`} />
          <span className="sr-only">Included</span>
        </>
      ) : value === false ? (
        <>
          <X aria-hidden className="mx-auto size-4 text-muted-foreground/30" />
          <span className="sr-only">Not included</span>
        </>
      ) : (
        <span className={`text-sm font-semibold ${pro ? "text-primary" : "text-foreground"}`}>{value}</span>
      )}
    </td>
  );
}
