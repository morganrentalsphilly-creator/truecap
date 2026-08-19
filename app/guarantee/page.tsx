/**
 * /guarantee — the canonical Never Overpay Guarantee statement.
 *
 * Founder-approved 2026-08-17 as part of the Grand Slam Offer rollout. This
 * page is the published terms every guarantee badge and section links to
 * (lib/marketing-offer-config.ts defaults guaranteeTermsUrl here), so it must
 * exist in every deploy where the guarantee renders — that is the structural
 * replacement for the old fail-closed terms-URL env requirement.
 *
 * Copy rules: the refund promise covers subscription payments and decision
 * confidence with the software — never investment results. Trial mentions
 * render from TRIAL_DAYS and stay conditioned on "new subscribers" to mirror
 * the checkout repeat-trial guard (app/actions/billing.ts).
 */

import type { Metadata } from "next";
import Link from "next/link";
import { Mail, ShieldCheck, Sparkles } from "lucide-react";
import { Header } from "@/components/investcalc/header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { GuaranteeViewTracker } from "@/components/analytics/guarantee-view-tracker";
import { isAgentProConfigured } from "@/lib/stripe/plan-prices";
import { getSiteUrl } from "@/lib/site-url";
import { TRIAL_DAYS } from "@/lib/trial";
import { getRequestUser } from "@/lib/request-auth";

export const metadata: Metadata = {
  title: "The Never Overpay Guarantee",
  description:
    "Analyze 10 deals in your first 30 days as a paying Pro subscriber. If you don't feel more confident about exactly what to offer, email us for a full refund.",
  alternates: { canonical: "/guarantee" },
  openGraph: {
    title: "The Never Overpay Guarantee — TrueCap",
    description:
      "Analyze 10 deals in your first 30 days as a paying Pro subscriber. Not more confident about exactly what to offer? Email us for a full refund.",
    url: "/guarantee",
    type: "website",
    images: [{ url: "/home.jpg", width: 1200, height: 630, alt: "TrueCap Never Overpay Guarantee" }],
  },
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
};

const GUARANTEE_FAQS: { q: string; a: string }[] = [
  {
    q: "How do I claim the refund?",
    a: "Email hello@usetruecap.com from your account email within your first 30 days as a paying subscriber and say you're claiming the guarantee. That's the whole process — no call, no form, no exit survey.",
  },
  {
    q: "What counts as an analyzed deal?",
    a: "Running an analysis on a property while signed in to your subscribed account — the same Run analysis you use every day. Ten runs in your first 30 days meets the condition; re-running the same address after editing assumptions counts too, because that's real underwriting work.",
  },
  {
    q: "How fast do I get the money back?",
    a: "We initiate the refund within a few business days of your email. Stripe returns it to your original payment method; banks typically post it within 5–10 business days.",
  },
  {
    q: "What exactly is refunded?",
    a: "Every dollar of subscription payments from your first 30 days as a paying subscriber, back to your original payment method via Stripe. One-time Deal Decision Pack purchases are separate products delivered in full at purchase and aren't part of this guarantee.",
  },
  {
    q: "When does the 30-day clock start?",
    a: "The day your first subscription payment goes through — not the day your trial starts. Deals you analyzed during the free trial count toward the 10; reps are reps.",
  },
  {
    q: "How is this different from the free trial?",
    a: `They stack. New subscribers get ${TRIAL_DAYS} days of full Pro free — cancel online during the trial and you pay nothing at all. The guarantee covers what happens after you start paying: analyze at least 10 deals in your first 30 days as a paying subscriber, and if you're not more confident about exactly what to offer, you get that money back too.`,
  },
];

export default async function GuaranteePage() {
  // Only to suppress the footer's Sign in / Create account column for a
  // signed-in visitor — no gating, no personalization.
  const user = await getRequestUser();

  const siteUrl = getSiteUrl();
  const agentProConfigured = isAgentProConfigured();

  const guaranteeLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${siteUrl}/guarantee#page`,
        url: `${siteUrl}/guarantee`,
        name: "The Never Overpay Guarantee",
        isPartOf: { "@id": `${siteUrl}/#website` },
        about: { "@id": `${siteUrl}/#organization` },
        inLanguage: "en-US",
      },
      {
        "@type": "FAQPage",
        "@id": `${siteUrl}/guarantee#faq`,
        mainEntity: GUARANTEE_FAQS.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
    ],
  };

  return (
    <>
      <Header initialUser={null} initialEntitlements={null} />
      <GuaranteeViewTracker guarantee="never_overpay" placement="guarantee_page" />
      <ScrollDepthTracker />
      <main className="bg-background">
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-border bg-gradient-to-b from-[var(--brand-green-light)] via-background to-background">
          <div className="mx-auto max-w-3xl px-4 py-14 text-center sm:px-6 sm:py-20">
            <div className="mx-auto mb-5 flex w-fit items-center gap-2 rounded-full border border-[var(--brand-green)]/30 bg-card/70 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-[var(--brand-green)] shadow-sm backdrop-blur">
              <ShieldCheck className="size-3.5" />
              Risk reversal
            </div>
            <h1 className="text-balance text-3xl font-extrabold leading-[1.1] tracking-tight text-foreground sm:text-5xl">
              The Never Overpay Guarantee
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-balance text-base leading-relaxed text-muted-foreground sm:text-lg">
              If TrueCap Pro doesn&apos;t make you more confident about exactly
              what to offer, you shouldn&apos;t pay for it. Here is that
              promise, in full, with no fine-print tricks.
            </p>
          </div>
        </section>

        {/* The guarantee itself */}
        <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
          <div className="rounded-3xl border-2 border-[var(--brand-green)]/30 bg-[var(--brand-green-light)] p-6 sm:p-8">
            <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--brand-green)]">
              TrueCap Pro
            </p>
            <h2 className="mt-1 text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
              Analyze 10 deals. Feel the difference — or get every dollar back.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-foreground sm:text-base">
              New subscribers try TrueCap Pro free for {TRIAL_DAYS} days. After
              that, if you analyze at least 10 deals by day 30 of paid access
              — deals from your free trial count — and don&apos;t feel more
              confident about exactly what to offer, email us within those 30
              days and we&apos;ll refund every dollar you&apos;ve paid. No forms, no hoops. Keep anything
              you&apos;ve downloaded.
            </p>
            <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
              Why the 10-deal condition? Because the promise is about decision
              confidence, and confidence comes from reps. Run ten real
              properties through the workflow — if your walk-away number still
              feels like a guess, we haven&apos;t earned the money.
            </p>
          </div>

          {agentProConfigured ? (
            <div className="mt-5 rounded-3xl border border-border bg-card p-6 sm:p-8">
              <p className="text-[11px] font-bold uppercase tracking-widest text-primary">
                Agent Pro
              </p>
              <h2 className="mt-1 text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
                Send 5 branded analyses. Better conversations — or a full refund.
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-foreground sm:text-base">
                Send 5 branded analyses to clients or prospects in your first 30
                days as an Agent Pro subscriber. If they don&apos;t change your
                investor-client conversations, email us within those 30 days
                for a full refund.
              </p>
            </div>
          ) : null}

          <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
            This is a software-satisfaction guarantee, not a guarantee of
            returns, cash flow, appreciation, financing, or deal success.
            TrueCap computes screening math from sourced, editable assumptions;
            the investment decision — and its outcome — is always yours.
          </p>

          {/* Claim block */}
          <div className="mt-8 flex flex-col items-start gap-3 rounded-2xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div>
              <p className="text-sm font-bold text-foreground">Claiming is one email.</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                From your account email, within your first 30 days as a paying subscriber.
              </p>
            </div>
            <a
              href="mailto:hello@usetruecap.com?subject=Never%20Overpay%20Guarantee"
              className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-border bg-background px-4 text-sm font-bold text-foreground hover:bg-muted"
            >
              <Mail className="size-4" />
              hello@usetruecap.com
            </a>
          </div>
        </section>

        {/* FAQ */}
        <section className="border-t border-border bg-card/40">
          <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
            <h2 className="text-center text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
              The honest details
            </h2>
            <div className="mt-8 divide-y divide-border rounded-2xl border border-border bg-card shadow-sm">
              {GUARANTEE_FAQS.map((faq) => (
                <details key={faq.q} className="group px-5 py-4 sm:px-6 sm:py-5">
                  <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <span className="text-left font-semibold text-foreground">{faq.q}</span>
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
          </div>
        </section>

        {/* CTA */}
        <section className="border-t border-border">
          <div className="mx-auto max-w-3xl px-4 py-12 text-center sm:px-6 sm:py-16">
            <h2 className="text-balance text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
              All of the risk is on us. <span className="text-primary">The next deal is on you.</span>
            </h2>
            <div className="mt-6 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
              <Link
                href="/pricing#plans"
                className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-[0_8px_22px_rgba(0,112,196,0.24)] transition hover:bg-primary/95"
              >
                <Sparkles className="size-4" />
                See Pro plans
              </Link>
              <Link
                href="/#main"
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border bg-card px-5 py-3 text-sm font-bold text-foreground transition hover:bg-muted"
              >
                Get My Max Offer
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter hideAccountLinks={Boolean(user)} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(guaranteeLd) }}
      />
    </>
  );
}
