/**
 * /for-investors — the investor hub (2026-09 agent-first pass).
 *
 * The homepage now speaks to real estate agents first, so investors buying
 * for their own portfolio need one named destination from the header and
 * from the hero's investor cue. This page states the investor value prop
 * once and routes to the strategy pages. It mirrors /for-agents in shape
 * (hero → what you get → strategies → sources → FAQ → CTA) and adds nothing
 * the product does not do: the free first decision, Pro, labeled HUD/FRED
 * benchmarks, manual property tax.
 *
 * BRRRR and fix-and-flip route to their guides and calculators rather than
 * /for-brrrr and /for-flippers: those two are deliberately noindexed
 * planning stubs outside the sitemap (no integrated model is offered), and
 * the link-graph guard will not let a sitemap page link them.
 */

import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  Hammer,
  Home,
  Repeat,
  ShieldCheck,
  Target,
} from "lucide-react";
import { Header } from "@/components/investcalc/header";
// Below-the-fold cross-links prefetch on hover or keyboard focus, not on
// scroll; hero and primary CTA links keep the default (see the component).
import { IntentPrefetchLink } from "@/components/marketing/intent-prefetch-link";
import { HomepageFaq } from "@/components/marketing/landing-sections";
import { DECISION_SHOT, ProductShot } from "@/components/marketing/product-shot";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SiteFooter } from "@/components/marketing/site-footer";
import {
  PRODUCT_EVALUATION_COMPARISON_LIMIT,
  PRODUCT_EVALUATION_DAYS,
  PRODUCT_EVALUATION_DEAL_LIMIT,
} from "@/lib/product-access";
import { DATA_SOURCE_FACTS, PROPERTY_TAX_FACTS } from "@/lib/product-facts";
import { isAgentProConfigured } from "@/lib/stripe/plan-prices";

const PAGE_TITLE = "For Rental Investors — Buy Box & Offer Ceiling";
const PAGE_DESCRIPTION =
  "Paste a listing and see whether it meets your Buy Box, the highest price that still does, and what could break it. Cash flow, cap rate, DSCR. Free first decision.";

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  keywords: [
    "rental property analysis",
    "investment property calculator",
    "buy box real estate",
    "cash on cash return",
    "rental property cash flow",
    "DSCR calculator",
  ],
  alternates: { canonical: "/for-investors" },
  openGraph: {
    title: `${PAGE_TITLE} | TrueCap`,
    description: PAGE_DESCRIPTION,
    url: "/for-investors",
    type: "website",
    images: [{ url: "/og/home", width: 1200, height: 630, alt: "TrueCap for rental investors" }],
  },
  twitter: { card: "summary_large_image", images: ["/og/home"] },
};

const STRATEGIES: { icon: typeof Home; title: string; body: string; href: string; cta: string }[] = [
  {
    icon: Building2,
    title: "Buy-and-hold",
    body: "Stabilized rentals for cash flow and equity: cap rate, cash-on-cash, DSCR, downside, the Offer Ceiling, and a 10-year projection.",
    href: "/for-buy-and-hold",
    cta: "For buy-and-hold investors",
  },
  {
    icon: Home,
    title: "House hacking",
    body: "Two to four units, owner-occupied: your unit's cost against the rent from the others, with low-down-payment financing modeled honestly.",
    href: "/for-house-hackers",
    cta: "For house hackers",
  },
  {
    icon: Repeat,
    title: "BRRRR",
    body: "Research each stage in the analyzer and the BRRRR calculator: rehab budget, ARV, DSCR on the refinance, stabilized returns. No integrated lifecycle model is offered yet.",
    href: "/blog/brrrr-method-explained",
    cta: "Read the BRRRR guide",
  },
  {
    icon: Hammer,
    title: "Fix and flip",
    body: "Rehab, ARV, and 70%-rule screening for early research. A complete flip model also needs time, financing, and selling costs; the guide says where.",
    href: "/blog/70-percent-rule-house-flipping",
    cta: "Read the 70% rule guide",
  },
];

export default function ForInvestorsPage() {
  const agentProConfigured = isAgentProConfigured();
  return (
    <div className="min-h-screen bg-background">
      <Header initialUser={null} initialEntitlements={null} />
      <main id="main" className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        {/* Hero: the investor's outcome; the same free analyzer as every page. */}
        <section className="mb-12 sm:mb-16">
          <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:gap-12">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-card px-3 py-1 text-2xs font-semibold uppercase tracking-widest text-primary">
                <Target className="size-3" />
                For rental investors
              </div>
              <h1 className="text-balance text-3xl font-extrabold leading-[1.05] tracking-tight text-foreground sm:text-5xl">
                Know the highest price that still meets your targets before you write the offer.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                Paste a listing. In about 60 seconds, see whether the rental
                works at asking, whether it meets your Buy Box, the Offer
                Ceiling for your targets, and what could break the deal.
                Every assumption is labeled and yours to change.
              </p>
              <p className="mt-2 text-xs font-semibold tracking-wide text-muted-foreground">
                Cash flow · Cap rate · Cash-on-cash return · DSCR · Deal score · Offer Ceiling
              </p>
              <div className="mt-6 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
                <Link
                  href="/analyze"
                  prefetch={false}
                  className="group inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground shadow-[0_12px_28px_rgba(0,112,196,0.28)] transition-transform hover:-translate-y-0.5"
                >
                  Analyze a property free
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <Link
                  href="/pricing"
                  className="inline-flex h-12 items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-5 text-sm font-semibold text-foreground hover:bg-muted"
                >
                  See Pro pricing
                </Link>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Free. No account. Your first full decision is included. A free
                account adds a {PRODUCT_EVALUATION_DAYS}-day trial with{" "}
                {PRODUCT_EVALUATION_DEAL_LIMIT} Pro deals and{" "}
                {PRODUCT_EVALUATION_COMPARISON_LIMIT} comparison, no card.
              </p>
            </div>
            <div>
              <ProductShot
                shot={DECISION_SHOT}
                priority
                alt="TrueCap's decision view for the sample deal: the Offer Ceiling beside the asking price, cash flow after reserves, DSCR, and the best next step"
                caption={
                  <>
                    Real output from the free sample deal.{" "}
                    <Link href="/analyze?sample=1" prefetch={false} className="font-semibold text-primary underline underline-offset-4">
                      Run it yourself →
                    </Link>
                  </>
                }
              />
            </div>
          </div>
        </section>

        {/* Strategies */}
        <section className="mb-12 sm:mb-16" aria-labelledby="strategies-heading">
          <h2 id="strategies-heading" className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
            Pick your strategy
          </h2>
          <p className="mt-2 max-w-2xl text-base leading-relaxed text-muted-foreground">
            The analyzer is the same; each page shows how the numbers apply to
            the way you buy.
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {STRATEGIES.map(({ icon: Icon, title, body, href, cta }) => (
              <article key={title} className="rounded-2xl border border-border bg-card p-5 sm:p-6">
                <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="size-5" aria-hidden />
                </span>
                <h3 className="mt-3 text-base font-extrabold text-foreground sm:text-lg">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{body}</p>
                <IntentPrefetchLink href={href} className="mt-4 inline-flex min-h-11 items-center gap-1.5 text-sm font-bold text-primary hover:underline">
                  {cta}
                  <ArrowRight className="size-4" aria-hidden />
                </IntentPrefetchLink>
              </article>
            ))}
          </div>
        </section>

        {/* What you get, free and Pro */}
        <section className="mb-12 rounded-3xl border-2 border-primary/25 bg-gradient-to-br from-[var(--brand-blue-light)] via-card to-card p-6 sm:mb-16 sm:p-8" aria-labelledby="get-heading">
          <h2 id="get-heading" className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
            Free screens the deal. Pro answers four questions on every deal.
          </h2>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2">
            {[
              ["Does it meet my Buy Box?", "Your cash-flow, cash-on-cash, DSCR, cap-rate, and price targets, checked on every deal with the reason for a miss."],
              ["What is my Offer Ceiling?", "The highest price that still meets your targets under the assumptions shown. Not a recommended offer; your line, computed."],
              ["What could make it fail?", "Rent, vacancy, rate, and price stressed against the assumptions that drive the decision."],
              ["Can I defend it?", "Save unlimited deals, compare up to four, and hand a lender or partner a report with the assumptions and risks intact."],
            ].map(([title, body]) => (
              <li key={title} className="rounded-2xl border border-border bg-card p-4">
                <p className="text-sm font-extrabold text-foreground">{title}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{body}</p>
              </li>
            ))}
          </ul>
          <IntentPrefetchLink href="/pricing" className="mt-5 inline-flex min-h-11 items-center gap-1.5 text-sm font-bold text-primary underline decoration-primary/40 underline-offset-4 hover:decoration-primary">
            Compare Free and Pro →
          </IntentPrefetchLink>
        </section>

        {/* Sources */}
        <section className="mb-12 rounded-2xl border border-border bg-card p-6 sm:mb-16 sm:p-8" aria-labelledby="sources-heading">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-primary" aria-hidden />
            <h2 id="sources-heading" className="text-lg font-extrabold text-foreground sm:text-xl">
              Where the starting numbers come from
            </h2>
          </div>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-muted-foreground">
            <li><strong className="text-foreground">Rent:</strong> {DATA_SOURCE_FACTS.rent}, labeled as a benchmark to check against local comps.</li>
            <li><strong className="text-foreground">Mortgage rate:</strong> {DATA_SOURCE_FACTS.mortgageRate}, with its date shown; replace it with your lender&apos;s quote.</li>
            <li><strong className="text-foreground">Property tax:</strong> {PROPERTY_TAX_FACTS.notAutoFilled} {PROPERTY_TAX_FACTS.blankFieldBehavior}</li>
          </ul>
          <IntentPrefetchLink href="/methodology" className="mt-4 inline-flex min-h-11 items-center text-sm font-bold text-primary underline decoration-primary/40 underline-offset-4 hover:decoration-primary">
            Read the methodology →
          </IntentPrefetchLink>
        </section>
      </main>

      {/* The investor FAQ set; the homepage owns its FAQPage JSON-LD. */}
      <HomepageFaq structuredData={false} audience="investors" />

      <section className="border-t border-border">
        <div className="mx-auto max-w-3xl px-4 py-14 text-center sm:px-6 sm:py-20">
          <h2 className="text-balance text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
            Paste a listing. See if it works before you write the offer.
          </h2>
          <Link
            href="/analyze"
            prefetch={false}
            className="group mt-6 inline-flex h-12 items-center gap-1.5 rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground shadow-[0_12px_28px_rgba(0,112,196,0.28)] transition-transform hover:-translate-y-0.5"
          >
            Analyze a property free
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          {agentProConfigured ? (
            <p className="mt-6 text-sm text-muted-foreground">
              Working with investor clients as an agent?{" "}
              <IntentPrefetchLink href="/for-agents" className="font-semibold text-primary underline underline-offset-4">
                See TrueCap for agents →
              </IntentPrefetchLink>
            </p>
          ) : null}
        </div>
      </section>
      <SiteFooter />
      <ScrollDepthTracker />
    </div>
  );
}
