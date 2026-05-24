/**
 * Public /pricing page. Two plans + free, FAQ, trust strip,
 * conversion-focused. For unauthenticated visitors the CTA routes to
 * /auth/sign-up?next=/pricing (so they come back here to subscribe);
 * for authenticated free users the CTA triggers Stripe checkout
 * directly via the existing billing action.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { Check, ShieldCheck, Sparkles, X } from "lucide-react";
import { Header } from "@/components/investcalc/header";
import { PricingTogglePlans } from "@/components/marketing/pricing-toggle-plans";
import { getEntitlementsForUser, hasPaidPlanSubscription } from "@/lib/entitlements";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe/client";

import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SiteFooter } from "@/components/marketing/site-footer";
export const metadata: Metadata = {
  title: "Pricing — Free + Pro plans for rental property analysis",
  description:
    "TrueCap is free to start — no card required. Upgrade to Pro for 10-year projections, tax strategy, exit scenarios, Deal Score, PDF export, and unlimited saved deals.",
  alternates: { canonical: "/pricing" },
  openGraph: {
    title: "TrueCap pricing — free + Pro",
    description: "Free to start. Pro unlocks projections, tax, exit, PDF, and unlimited saves.",
    url: "/pricing",
    type: "website",
    images: [{ url: "/home.jpg", width: 1200, height: 630, alt: "TrueCap pricing" }],
  },
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
};

type StripePrice = { amountLabel: string; period: string } | null;

async function loadStripePrice(slug: "pro_monthly" | "pro_annual"): Promise<StripePrice> {
  const envKey = slug === "pro_monthly" ? "STRIPE_PRICE_PRO_MONTHLY" : "STRIPE_PRICE_PRO_ANNUAL";
  const priceId = process.env[envKey];
  if (!priceId || !process.env.STRIPE_SECRET_KEY) return null;
  try {
    const stripe = getStripe();
    const price = await stripe.prices.retrieve(priceId);
    if (price.unit_amount == null) return null;
    const amountLabel = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: price.currency,
      maximumFractionDigits: price.unit_amount % 100 === 0 ? 0 : 2,
    }).format(price.unit_amount / 100);
    const period = price.recurring?.interval ?? (slug === "pro_annual" ? "year" : "month");
    return { amountLabel, period };
  } catch {
    return null;
  }
}

// FREE_FEATURES + PRO_FEATURES lists were lifted into the toggle
// component (components/marketing/pricing-toggle-plans.tsx) so they
// stay co-located with the cards that render them.

const FAQS: { q: string; a: string }[] = [
  {
    q: "Is TrueCap really free?",
    a: "Yes. The cash-flow analyzer — cap rate, CoC, DSCR, monthly cash flow, address auto-fill, MAO, sensitivity, BRRRR, fix-and-flip — is free forever and unlimited. No card required to start. Pro adds the longer-horizon and reporting features.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. Cancel from your profile in one click. Your Pro features stay active until the end of the period you've paid for, then automatically downgrade to Free.",
  },
  {
    q: "Do I keep my saved deals if I downgrade?",
    a: "Yes. Your saved deals and PDF exports never leave your account. You'll lose the ability to create or update them on Free, but everything is still readable.",
  },
  {
    q: "How accurate is the auto-fill?",
    a: "Rent is pulled from HUD Fair Market Rent for your county. Mortgage rate comes from the FRED 30-year fixed series. Property tax uses your state's effective rate. All editable — these are sensible defaults, not absolutes.",
  },
  {
    q: "Is this for agents, investors, or both?",
    a: "Both. Investors use TrueCap to underwrite their own deals. Agents use it to send a defensible analysis to a client at the showing. The shared-link feature was built for exactly that hand-off.",
  },
];

export default async function PricingPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [monthly, annual, isPaid] = await Promise.all([
    loadStripePrice("pro_monthly"),
    loadStripePrice("pro_annual"),
    user ? hasPaidPlanSubscription(supabase, user.id) : Promise.resolve(false),
  ]);
  const entitlements = user ? await getEntitlementsForUser(supabase, user.id) : null;
  // The Monthly ↔ Annual savings math is now done inside
  // <PricingTogglePlans> so it can react to the user's toggle state.
  // We just hand it both Stripe prices.

  return (
    <>
      <Header initialUser={user} initialEntitlements={entitlements} />

      <main id="main" className="min-h-screen bg-background">
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-border bg-gradient-to-b from-[var(--brand-blue-light)] via-background to-background">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-32 left-1/2 -z-10 h-[420px] w-[820px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl"
          />
          <div className="mx-auto max-w-5xl px-4 pb-10 pt-12 sm:px-6 sm:pb-14 sm:pt-16 text-center">
            <div className="mx-auto mb-5 flex w-fit items-center gap-2 rounded-full border border-primary/20 bg-card/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-primary shadow-sm backdrop-blur">
              <Sparkles className="size-3" />
              Free to start · No card
            </div>
            <h1 className="text-balance text-3xl font-black leading-[1.1] tracking-tight text-foreground sm:text-5xl">
              Pricing that pays for itself <span className="text-primary">on the first deal.</span>
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-balance text-[15px] leading-relaxed text-muted-foreground sm:text-lg">
              Start free — unlimited analyses, every core metric, auto-fill from the address. Upgrade to Pro
              when you need projections, tax modeling, and lender-ready PDFs.
            </p>
          </div>
        </section>

        {/* Plans — 2-card layout with Monthly ↔ Annual toggle on Pro
            (replaced the previous 3-card side-by-side). The toggle
            consistently outperforms separate cards because users
            directly compare per-month cost. ~10-15% lift on annual. */}
        <section className="mx-auto -mt-2 max-w-5xl px-4 pb-6 sm:px-6">
          <PricingTogglePlans
            monthly={monthly}
            annual={annual}
            isAuthenticated={Boolean(user)}
            isPaid={isPaid}
          />

          {/* Trust strip */}
          <div className="mx-auto mt-8 flex max-w-2xl flex-wrap items-center justify-center gap-x-6 gap-y-2 rounded-2xl border border-border bg-card px-5 py-4 text-center text-xs text-muted-foreground sm:text-sm">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="size-4 text-[var(--metric-positive)]" />
              <strong className="text-foreground">Free to start — no card</strong>
            </span>
            <span aria-hidden className="text-muted-foreground/40">·</span>
            <span><strong className="text-foreground">Cancel anytime</strong> from your profile</span>
            <span aria-hidden className="text-muted-foreground/40">·</span>
            <span>Powered by <strong className="text-foreground">Stripe</strong></span>
          </div>
        </section>

        {/* Feature comparison */}
        <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
          <h2 className="text-center text-2xl font-black tracking-tight text-foreground sm:text-3xl">
            What you get
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-center text-sm text-muted-foreground sm:text-base">
            Free is generous on purpose. Pro is for when you want the full picture.
          </p>
          <div className="mt-8 overflow-hidden rounded-2xl border border-border bg-card">
            <table className="w-full text-sm">
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
                  ["Auto-fill (HUD rent · FRED rate · state tax)", true, true],
                  ["MAO solver · Sensitivity grid", false, true],
                  ["BRRRR + fix-and-flip + rehab estimator", false, true],
                  ["Shareable read-only deal links", false, true],
                  ["10-year cash flow projection", false, true],
                  ["Tax strategy + depreciation", false, true],
                  ["Exit scenarios (best year to sell)", false, true],
                  ["Pro Deal Score (0-100)", false, true],
                  ["Lender-ready PDF export", false, true],
                  ["Save deals", "Limited", "Unlimited"],
                  ["Compare deals side-by-side", false, "Up to 4"],
                  ["Priority support", false, true],
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

        {/* FAQ */}
        <section className="mx-auto max-w-3xl px-4 pb-16 sm:px-6 sm:pb-24">
          <h2 className="text-center text-2xl font-black tracking-tight text-foreground sm:text-3xl">
            Frequently asked
          </h2>
          <div className="mt-8 divide-y divide-border rounded-2xl border border-border bg-card">
            {FAQS.map((faq) => (
              <details key={faq.q} className="group px-5 py-4 sm:px-6 sm:py-5">
                <summary className="flex cursor-pointer items-center justify-between gap-3 list-none">
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
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
            >
              Try the calculator first — it's free →
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
              mainEntity: FAQS.map((f) => ({
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
  return (
    <td className="px-4 py-3 text-center sm:px-6">
      {value === true ? (
        <Check className={`mx-auto size-4 ${pro ? "text-primary" : "text-[var(--metric-positive)]"}`} />
      ) : value === false ? (
        <X className="mx-auto size-4 text-muted-foreground/30" />
      ) : (
        <span className={`text-sm font-semibold ${pro ? "text-primary" : "text-foreground"}`}>{value}</span>
      )}
    </td>
  );
}
