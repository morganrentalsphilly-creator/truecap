/**
 * /for-brrrr — persona page for BRRRR operators (Buy, Rehab, Rent,
 * Refinance, Repeat).
 *
 * BRRRR is a multi-stage strategy: hard-money or cash purchase at
 * acquisition, value-add rehab, lease-up, then refinance at the new
 * ARV to recover capital and roll into the next deal. Standard
 * rental analyzers don't model the cash recycle properly — TrueCap's
 * dedicated BRRRR analyzer does.
 */

import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Calculator,
  Hammer,
  RefreshCw,
  Sparkles,
  TrendingUp,
  Wallet,
  Zap,
} from "lucide-react";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SiteFooter } from "@/components/marketing/site-footer";
import { ScrollToFormButton } from "@/components/marketing/scroll-to-form-button";

export const metadata: Metadata = {
  title: "For BRRRR Operators",
  description:
    "Model the full BRRRR loop: hard-money buy, rehab cost, ARV, lease-up, refi at the new appraisal. See how much cash you actually recover.",
  keywords: [
    "brrrr calculator",
    "brrrr analyzer",
    "buy rehab rent refinance repeat",
    "value-add rental analysis",
  ],
  alternates: { canonical: "/for-brrrr" },
  openGraph: {
    title: "For BRRRR Operators — TrueCap",
    description:
      "Buy, Rehab, Rent, Refinance, Repeat. Model every stage and see your real cash recovered at refi.",
    url: "/for-brrrr",
    type: "website",
    images: [{ url: "/home.jpg", width: 1200, height: 630, alt: "TrueCap for BRRRR operators" }],
  },
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
};

const USE_CASES: { icon: typeof Calculator; title: string; body: string }[] = [
  {
    icon: Hammer,
    title: "Realistic rehab budgets, not back-of-napkin",
    body: "Use the standalone rehab cost estimator at /tools/rehab-cost-estimator (cosmetic / mid / gut tiers by sqft) to ground your rehab number before feeding it into the BRRRR loop.",
  },
  {
    icon: TrendingUp,
    title: "ARV-driven refinance math",
    body: "Set the post-rehab ARV. The BRRRR analyzer (Pro) computes the refi loan amount at your LTV, the cash returned, and your stabilized cash flow against the new debt service.",
  },
  {
    icon: RefreshCw,
    title: "Capital recycle is the whole point",
    body: "See exactly how much of your original cash comes back at refi. The deal that 'doesn't pencil' as a buy-and-hold can look great when you recover 95% of capital and roll it into the next one.",
  },
  {
    icon: Wallet,
    title: "Hard-money initial rate, refi rate after",
    body: "The 'BRRRR' starter template (/dashboard/templates) seeds 9.5% hard-money rate, 15% down, higher CapEx + maint for the value-add property. Re-run at your refi rate after stabilization to see the long-term picture.",
  },
];

export default function ForBrrrrPage() {
  return (
    <div className="min-h-screen bg-background">
      <main id="main" className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="mb-2">
          <Link
            href="/"
            className="text-xs uppercase tracking-widest text-muted-foreground font-bold hover:text-foreground"
          >
            ← TrueCap
          </Link>
        </div>

        <section className="mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-card px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-primary mb-4">
            <Sparkles className="size-3" />
            For BRRRR operators
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-foreground leading-[1.05] tracking-tight text-balance">
            Buy, Rehab, Rent, Refinance —{" "}
            <span className="text-primary">see how much capital comes back.</span>
          </h1>
          <p className="mt-4 max-w-2xl text-base sm:text-lg leading-relaxed text-muted-foreground">
            BRRRR isn&apos;t buy-and-hold. The whole game is the cash
            recycle at refi. TrueCap models the full loop: acquisition,
            rehab, ARV-based refi, and your stabilized cash flow against
            the new debt.
          </p>

          <div className="mt-7 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            <ScrollToFormButton
              className="group inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground shadow-[0_12px_28px_rgba(82,72,212,0.28)] transition-transform hover:-translate-y-0.5"
            >
              <Calculator className="size-4" />
              Run a free analysis
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </ScrollToFormButton>
            <Link
              href="/tools/brrrr-calculator"
              className="inline-flex h-12 items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-5 text-sm font-semibold text-foreground hover:bg-muted"
            >
              Open the BRRRR calculator
            </Link>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            No card · No signup needed to use the analyzer · Cancel anytime
          </p>
        </section>

        <section id="use-cases" className="mb-12 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground mb-2">
            Built for value-add capital recyclers
          </h2>
          <p className="text-base text-muted-foreground mb-6 leading-relaxed">
            Four jobs every BRRRR operator does — modeled correctly so
            the deal you commit to on paper is the deal you close in real life.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            {USE_CASES.map(({ icon: Icon, title, body }) => (
              <div
                key={title}
                className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-sm"
              >
                <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="size-5" />
                </div>
                <h3 className="text-base sm:text-lg font-extrabold text-foreground">
                  {title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {body}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-12 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground mb-2">
            The full BRRRR loop in TrueCap
          </h2>
          <ol className="mt-4 space-y-3">
            {[
              "Estimate the rehab. Open /tools/rehab-cost-estimator and ground your number against per-sqft cosmetic / mid / gut tiers.",
              "Underwrite the buy. Use the calculator with the 'BRRRR' starter template (hard-money rate, 15% down, higher reserves).",
              "Open the BRRRR analyzer tab (Pro): plug in purchase + rehab + ARV. See your projected refi loan amount, cash recovered, and stabilized cash flow.",
              "Stress-test the ARV. If ARV comes in 10% under expectation, does the deal still work? The sensitivity grid will tell you.",
              "Save the deal. Compare BRRRR vs straight buy-and-hold in /dashboard/compare to see which strategy returns more capital on this property.",
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-extrabold tabular-nums">
                  {i + 1}
                </span>
                <span className="text-sm sm:text-base leading-relaxed text-foreground">
                  {step}
                </span>
              </li>
            ))}
          </ol>
        </section>

        <section className="mb-12 sm:mb-16 rounded-2xl border border-[var(--brand-green)]/25 bg-[var(--brand-green-light)] p-6 sm:p-8">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="size-5 text-[var(--brand-green)]" />
            <h2 className="text-sm font-extrabold uppercase tracking-widest text-[var(--brand-green)]">
              Why BRRRR operators pick TrueCap
            </h2>
          </div>
          <ul className="space-y-2 text-sm sm:text-base text-foreground">
            <li><strong>Capital recovered is the headline metric.</strong> Standard analyzers focus on cash flow; BRRRR analyzer focuses on how much of your initial cash comes back at refi. That&apos;s what determines whether you can do another deal.</li>
            <li><strong>Two-stage rate modeling.</strong> Hard-money rate at acquisition, conventional refi rate after stabilization — different math at each stage.</li>
            <li><strong>Rehab cost estimator built in.</strong> Don&apos;t guess. Open the rehab tool, get a per-sqft anchor, feed it into the deal.</li>
            <li><strong>ARV stress-test.</strong> ARV comes in low more often than high. Run the sensitivity grid to see how a 5-10% ARV miss affects your refi recovery.</li>
            <li><strong>Compare strategies.</strong> Same property, BRRRR vs hold — which returns more capital in 3 years?</li>
          </ul>
        </section>

        <section className="mb-12 sm:mb-16 rounded-2xl border border-border bg-card p-6 sm:p-8">
          <h2 className="text-lg sm:text-xl font-extrabold text-foreground mb-3">
            BRRRR-specific tools and reading
          </h2>
          <p className="text-sm leading-relaxed text-foreground">
            The fastest standalone tool for screening a BRRRR is the{" "}
            <Link href="/tools/brrrr-calculator" className="text-primary font-semibold hover:underline">
              BRRRR calculator
            </Link>
            . When estimating the rehab, the{" "}
            <Link href="/blog/how-to-estimate-rehab-costs" className="text-primary font-semibold hover:underline">
              rehab cost guide
            </Link>{" "}
            keeps your number defensible, and the{" "}
            <Link href="/blog/how-to-refinance-a-rental-property" className="text-primary font-semibold hover:underline">
              cash-out refinance walkthrough
            </Link>{" "}
            covers the LTV +{" "}
            <Link href="/tools/dscr-calculator" className="text-primary font-semibold hover:underline">
              DSCR
            </Link>{" "}
            math that determines how much capital you actually recover. For
            sourcing the kind of deal that pencils, see{" "}
            <Link href="/blog/how-to-find-off-market-rental-properties" className="text-primary font-semibold hover:underline">
              how to find off-market rental properties
            </Link>
            .
          </p>
        </section>

        <section className="mb-12 sm:mb-16 rounded-2xl bg-primary p-6 sm:p-8 text-primary-foreground">
          <h2 className="text-2xl sm:text-3xl font-extrabold mb-2">
            Free covers the buy. Pro covers the refi.
          </h2>
          <p className="text-sm sm:text-base opacity-90 mb-5 max-w-2xl">
            Free analyzer + the standalone BRRRR + rehab tools at /tools/* give you the acquisition math. Pro unlocks the full BRRRR analyzer (post-rehab refi modeling, ARV-driven cash recovery), 10-year projection, tax strategy, and compare-deals across strategies. Built for value-add operators doing multiple deals a year.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 bg-primary-foreground text-primary px-4 py-2.5 rounded-xl font-bold hover:opacity-90 transition-opacity"
            >
              See Pro pricing
              <ArrowUpRight className="w-4 h-4" />
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-2 border border-primary-foreground/40 bg-primary-foreground/10 text-primary-foreground px-4 py-2.5 rounded-xl font-bold hover:bg-primary-foreground/20 transition-colors"
            >
              <Calculator className="w-4 h-4" />
              Try the free analyzer
            </Link>
          </div>
        </section>

        <footer className="border-t border-border pt-6 text-sm text-muted-foreground leading-relaxed">
          Different strategy? See pages for{" "}
          <Link href="/for-buy-and-hold" className="font-bold text-foreground hover:underline">
            buy-and-hold
          </Link>
          ,{" "}
          <Link href="/for-house-hackers" className="font-bold text-foreground hover:underline">
            house hackers
          </Link>
          ,{" "}
          <Link href="/for-flippers" className="font-bold text-foreground hover:underline">
            fix-and-flippers
          </Link>
          , and{" "}
          <Link href="/for-agents" className="font-bold text-foreground hover:underline">
            agents
          </Link>
          .
        </footer>
      </main>
      <SiteFooter />
      <ScrollDepthTracker />
    </div>
  );
}
