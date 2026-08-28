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

import { PRODUCT_EVALUATION_DAYS } from "@/lib/product-access";
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
  getProductEvaluationAccessForUser,
  hasAnySubscriptionHistory,
  hasCheckoutRecoverySubscription,
} from "@/lib/entitlements";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isAgentProConfigured } from "@/lib/stripe/plan-prices";
import { loadStripeDisplayPrice } from "@/lib/stripe/display-prices";

import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SiteFooter } from "@/components/marketing/site-footer";
import { TestimonialStrip } from "@/components/marketing/testimonial-card";
import { getMarketingOfferConfig } from "@/lib/marketing-offer-config";
import { rateAlertEmailsLive } from "@/lib/rate-alerts-mode";
import { getSiteUrl } from "@/lib/site-url";
import { formatPublicUsd, PUBLIC_PRO_MONTHLY_USD } from "@/lib/public-pricing";
import {
  formatPricingEvaluationAllowance,
  summarizePricingEvaluation,
} from "@/lib/pricing-evaluation";
export const metadata: Metadata = {
  title: "Pricing — Screen Free, Repeat with Pro",
  description:
    `Complete a rental decision free, then create an account for a ${PRODUCT_EVALUATION_DAYS}-day no-card evaluation with three Pro deals and one comparison.`,
  alternates: { canonical: "/pricing" },
  openGraph: {
    title: "TrueCap pricing — Free screening, repeatable Pro underwriting",
    description: "Screen deals free. Use Pro to apply your targets, calculate an Offer Ceiling, stress-test downside, compare opportunities, and share the underwrite.",
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
    // app/page.tsx. Offer Ceiling, sensitivity, BRRRR/fix-and-flip, and share
    // links are PRO features — a previous version of this answer
    // claimed they were free, contradicting every other surface.
    a: "Yes. Your first personalized decision includes asking-price cash flow, selected-rule fit, a target-backed Offer Ceiling, a downside check, and next steps. No account or card is required. Create an account to keep the work and begin the no-card evaluation.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. Cancel from your profile in one click. Your Pro features stay active until the end of the period you've paid for, then automatically downgrade to Free.",
  },
  {
    q: "How does the product evaluation work?",
    a: `A new account receives ${PRODUCT_EVALUATION_DAYS} days to complete three Pro deal analyses and one full comparison. No card is collected, no charge is scheduled, and nothing auto-renews. If you later subscribe, checkout shows the exact charge before you confirm.`,
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
    a: "Rent uses a HUD area benchmark (ZIP-level when available, otherwise an FMR area), not a property-specific rent comp. The rate uses FRED's national owner-occupied 30-year benchmark, not an investor lender quote. Property tax is manual: enter a local annual bill or reviewed rate; until then the model discloses its generic 1.1% preliminary fallback. Replace every screening assumption with property-specific evidence before relying on the result.",
  },
  {
    q: "Is this for agents, investors, or both?",
    a: "Both. Investors use TrueCap to screen their own deals. Agents can share a reviewable analysis with a client, with the entered assumptions and verification caveats intact. The shared-link feature was built for that hand-off.",
  },
];

const FEATURE_COMPARISON: Array<[
  label: string,
  free: boolean | string,
  pro: boolean | string,
]> = [
  ["Unlimited preliminary core screens", true, true],
  ["Cap rate · CoC · DSCR · cash flow", true, true],
  ["Labeled HUD rent · FRED rate benchmarks", true, true],
  ["Screening Index (0–100) with factor breakdown", true, true],
  ["Sale + rent comps from the address", "1 free", "50 / mo"],
  ["Offer Ceiling · downside sensitivity", "First complete decision", true],
  ["Shareable read-only deal links", true, true],
  ["10-year cash flow projection", false, true],
  ["Buy Box auto-screening", false, true],
  ["Deal pipeline + tags (CRM)", false, true],
  ["Saved analysis templates", false, true],
  ["Due-diligence checklist + document vault", false, true],
  ["Rate-drop alerts on saved deals", false, true],
  ["Decision memo/report", "First decision", true],
  ["Lender · partner report modes", false, true],
  ["Save deals", "Up to 5", "Unlimited"],
  ["Compare deals side-by-side", false, "Up to 4"],
  ["Priority support", false, true],
];

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
    agentProConfigured ? loadStripeDisplayPrice("agent_pro_monthly") : Promise.resolve(null),
    agentProConfigured ? loadStripeDisplayPrice("agent_pro_annual") : Promise.resolve(null),
    user ? getActivePaidPlanSlug(supabase, user.id) : Promise.resolve(null),
    user ? hasAnySubscriptionHistory(supabase, user.id) : Promise.resolve(false),
    user ? hasCheckoutRecoverySubscription(supabase, user.id) : Promise.resolve(false),
    user
      ? getProductEvaluationAccessForUser(supabase, user.id)
      : Promise.resolve(null),
  ]);
  const pricingEvaluation = summarizePricingEvaluation(productEvaluationAccess);
  const evaluationAllowance = formatPricingEvaluationAllowance(pricingEvaluation);
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
              From first screen to shareable underwrite. <span className="text-primary">One review workflow.</span>
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-balance text-[15px] leading-relaxed text-muted-foreground sm:text-lg">
              {!user
                ? `Complete your first decision free. Create an account for ${PRODUCT_EVALUATION_DAYS} days, three ${proOfferName} deals, and one comparison — no card.`
                : activePaidPlanSlug || billingRecoveryRequired
                  ? `Screen any deal free. Use ${proOfferName} to review rule fit, the Offer Ceiling, what could break, and how to share the underwrite.`
                  : pricingEvaluation.status === "active" && evaluationAllowance
                  ? `Your no-card evaluation has ${evaluationAllowance}.`
                  : pricingEvaluation.status === "exhausted"
                    ? "Your included evaluation runs are complete. Keep screening deals free, or subscribe when you want another complete Pro decision."
                    : pricingEvaluation.status === "expired"
                      ? "Your no-card evaluation has ended. Keep screening deals free, or subscribe when you want another complete Pro decision."
                      : `Screen any deal free. Use ${proOfferName} to review rule fit, the Offer Ceiling, what could break, and how to share the underwrite.`}
            </p>
            <div className="mt-6 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
              <Link
                href="/#main"
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-[0_8px_22px_rgba(0,112,196,0.24)] transition hover:bg-primary/95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                Analyze a property free
              </Link>
              <Link
                href="#pro"
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border bg-card px-5 py-3 text-sm font-bold text-foreground transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                See Pro plans
              </Link>
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
          <div className={`mt-7 grid gap-3 ${agentProConfigured ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
            {[
              { job: "Screen", product: "Free", answer: "Is this worth investigating?" },
              { job: "Repeat", product: proOfferName, answer: "Reuse the underwriting workflow across every deal." },
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
              — before you collect a dollar of rent. {proOfferName} is {formatPublicUsd(PUBLIC_PRO_MONTHLY_USD)}/month and computes
              an Offer Ceiling under the selected targets on every deal you review.
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
              <strong className="text-foreground">
                {PRODUCT_EVALUATION_DAYS}-day evaluation · 3 Pro deals · 1 comparison
              </strong>
            </span>
            <span aria-hidden className="text-muted-foreground/40">·</span>
            <span><strong className="text-foreground">No card, no auto-renewal</strong></span>
          </div>
        </section>

        {/* Feature comparison */}
        <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
          <h2 className="text-center text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
            What you get
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-center text-sm text-muted-foreground sm:text-base">
            Free answers whether the deal deserves attention. Pro shows the
            target-dependent ceiling, what could break, and what to verify next.
          </p>
          {/* Phones use stacked comparison cards; tablet and desktop keep the
              denser semantic table. No narrow viewport has to pan sideways. */}
          <div className="tc-reveal mt-8 space-y-2 sm:hidden">
            {FEATURE_COMPARISON.map(([label, free, pro]) =>
              !alertsLive && label === "Rate-drop alerts on saved deals" ? null : (
              <article key={label} className="rounded-2xl border border-border bg-card p-4">
                <h3 className="text-sm font-bold text-foreground">{label}</h3>
                <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-xl bg-muted/30 p-3">
                    <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Free</dt>
                    <dd className="mt-1"><MobileFeatureValue value={free} /></dd>
                  </div>
                  <div className="rounded-xl bg-primary/5 p-3">
                    <dt className="text-[10px] font-bold uppercase tracking-wider text-primary">Pro</dt>
                    <dd className="mt-1"><MobileFeatureValue value={pro} pro /></dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
          <div className="tc-reveal mt-8 hidden overflow-x-auto rounded-2xl border border-border bg-card sm:block">
            <table className="w-full text-sm">
              <caption className="sr-only">Features included with TrueCap Free and TrueCap Pro</caption>
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-3 text-left font-bold text-foreground sm:px-6">Feature</th>
                  <th className="px-4 py-3 text-center font-bold text-foreground sm:px-6">Free</th>
                  <th className="px-4 py-3 text-center font-bold text-primary sm:px-6">Pro</th>
                </tr>
              </thead>
              <tbody>
                {FEATURE_COMPARISON.map(([label, free, pro], i) =>
                  !alertsLive && label === "Rate-drop alerts on saved deals" ? null : (
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
      <SiteFooter hideAccountLinks={Boolean(user)} />
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

function MobileFeatureValue({ value, pro }: { value: boolean | string; pro?: boolean }) {
  if (value === true) {
    return (
      <span className={`inline-flex items-center gap-1.5 font-semibold ${pro ? "text-primary" : "text-foreground"}`}>
        <Check aria-hidden className="size-4" /> Included
      </span>
    );
  }
  if (value === false) {
    return (
      <span className="inline-flex items-center gap-1.5 text-muted-foreground">
        <X aria-hidden className="size-4" /> Not included
      </span>
    );
  }
  return <span className={pro ? "font-semibold text-primary" : "font-semibold text-foreground"}>{value}</span>;
}
