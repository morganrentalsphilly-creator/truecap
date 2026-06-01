/**
 * /for-buy-and-hold — persona page for long-term rental investors.
 *
 * This is the largest user segment for TrueCap. Buy-and-hold investors
 * are evaluating dozens of properties per year, often comparing
 * markets and financing structures. Pro features (Sensitivity, Tax
 * Strategy, 10-year projections, Exit Scenarios) map directly to the
 * questions they ask: "what's my real IRR including tax?", "what if
 * vacancy ticks up?", "year 7 sell vs hold?"
 */

import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Calculator,
  Building2,
  LineChart,
  PiggyBank,
  Sparkles,
  Target,
  Zap,
} from "lucide-react";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SiteFooter } from "@/components/marketing/site-footer";
import { ScrollToFormButton } from "@/components/marketing/scroll-to-form-button";

export const metadata: Metadata = {
  title: "For Buy-and-Hold Investors | TrueCap",
  description:
    "Underwrite rental properties for long-term cash flow + appreciation. Cap rate, CoC, DSCR, 10-year projections, tax strategy — every number that matters for a hold strategy.",
  keywords: [
    "buy and hold calculator",
    "rental property analyzer",
    "long-term rental analysis",
    "cash flow + appreciation",
  ],
  alternates: { canonical: "/for-buy-and-hold" },
  openGraph: {
    title: "For Buy-and-Hold Investors — TrueCap",
    description:
      "The numbers a long-term rental investor actually needs — cap rate, CoC, DSCR, 10-year projection, tax strategy, exit modeling.",
    url: "/for-buy-and-hold",
    type: "website",
    images: [{ url: "/home.jpg", width: 1200, height: 630, alt: "TrueCap for buy-and-hold investors" }],
  },
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
};

const USE_CASES: { icon: typeof Calculator; title: string; body: string }[] = [
  {
    icon: Calculator,
    title: "Triage 20 listings in an hour, not a weekend",
    body: "Paste address, see cap rate + cash-on-cash + DSCR in 60 seconds. The 1% rule misses half the math; TrueCap surfaces what actually pencils.",
  },
  {
    icon: LineChart,
    title: "See year-1 vs year-10 in one view",
    body: "10-year projection (Pro) shows how rent growth, expense growth, and appreciation actually compound. The deal that looks marginal in year 1 might be the winner by year 5.",
  },
  {
    icon: PiggyBank,
    title: "Model the depreciation deduction — properly",
    body: "Tax Strategy tab (Pro) computes depreciation, interest deduction, and after-tax cash flow with your bracket. Most investors underestimate this by 15-25%.",
  },
  {
    icon: Target,
    title: "Stress-test before you offer",
    body: "Sensitivity grid (Pro) shows what happens to your return when rent moves ±10%, vacancy moves ±5pp, rates move ±1pp. If the deal still pencils across the grid, the offer is defensible.",
  },
];

export default function ForBuyAndHoldPage() {
  return (
    <div className="min-h-screen bg-background">
      <main id="main" className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Eyebrow + back link */}
        <div className="mb-2">
          <Link
            href="/"
            className="text-xs uppercase tracking-widest text-muted-foreground font-bold hover:text-foreground"
          >
            ← TrueCap
          </Link>
        </div>

        {/* Hero */}
        <section className="mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-card px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-primary mb-4">
            <Sparkles className="size-3" />
            For buy-and-hold investors
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-foreground leading-[1.05] tracking-tight text-balance">
            The numbers that decide whether to hold —{" "}
            <span className="text-primary">in one screen.</span>
          </h1>
          <p className="mt-4 max-w-2xl text-base sm:text-lg leading-relaxed text-muted-foreground">
            Cap rate, cash-on-cash, DSCR, 10-year cash flow, depreciation,
            exit scenarios. Every metric a long-term rental investor uses
            — already wired to live HUD rent + FRED rate + state tax data.
          </p>

          {/* CTAs */}
          <div className="mt-7 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            <ScrollToFormButton
              className="group inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground shadow-[0_12px_28px_rgba(82,72,212,0.28)] transition-transform hover:-translate-y-0.5"
            >
              <Calculator className="size-4" />
              Run a free analysis
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </ScrollToFormButton>
            <Link
              href="/pricing"
              className="inline-flex h-12 items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-5 text-sm font-semibold text-foreground hover:bg-muted"
            >
              See Pro pricing
            </Link>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            No card · No signup needed to use the analyzer · Cancel anytime
          </p>
        </section>

        {/* Use cases */}
        <section id="use-cases" className="mb-12 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground mb-2">
            Built for the hold strategy
          </h2>
          <p className="text-base text-muted-foreground mb-6 leading-relaxed">
            Four jobs serious rental investors do over and over —
            faster, more accurate, more defensible.
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

        {/* Workflow */}
        <section className="mb-12 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground mb-2">
            How a buy-and-hold investor uses TrueCap
          </h2>
          <ol className="mt-4 space-y-3">
            {[
              "Paste the listing address. Rent, mortgage rate, and property tax auto-fill from public data sources.",
              "Adjust the financing (down %, term, rate) to match the offer you're considering.",
              "Hit Calculate — cap rate, CoC, DSCR, monthly cash flow appear in 1 second.",
              "Pro: open the 10-year projection to see how cash flow grows. Open Tax Strategy for after-tax CF.",
              "Pro: stress-test in the Sensitivity grid before you write the offer.",
              "Save the deal. The portfolio rollup on /dashboard/saved-analyses shows your aggregate cash flow across everything you're considering.",
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

        {/* Why this persona specifically */}
        <section className="mb-12 sm:mb-16 rounded-2xl border border-[var(--brand-green)]/25 bg-[var(--brand-green-light)] p-6 sm:p-8">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="size-5 text-[var(--brand-green)]" />
            <h2 className="text-sm font-extrabold uppercase tracking-widest text-[var(--brand-green)]">
              Why long-term investors pick TrueCap over a spreadsheet
            </h2>
          </div>
          <ul className="space-y-2 text-sm sm:text-base text-foreground">
            <li><strong>Multi-year math is correct out of the box.</strong> Depreciation, interest deduction declining over time, rent + expense compounding — most spreadsheets get one of these wrong.</li>
            <li><strong>Exit modeling matters.</strong> Year-7 sell vs hold is a 7-figure decision; the engine projects equity, cash-on-cash IRR, and after-tax proceeds at every year.</li>
            <li><strong>Sensitivity is built in.</strong> Hard to do thoroughly in a spreadsheet — trivial here.</li>
            <li><strong>Portfolio view.</strong> Save 10 deals, see total cash flow + weighted cap rate across the book.</li>
            <li><strong>Defensible.</strong> Live HUD/FRED/state data — when the seller pushes back on your rent assumption, you can point at the source.</li>
          </ul>
        </section>

        {/* Recommended reading + tools */}
        <section className="mb-12 sm:mb-16 rounded-2xl border border-border bg-card p-6 sm:p-8">
          <h2 className="text-lg sm:text-xl font-extrabold text-foreground mb-3">
            Recommended reading for buy-and-hold investors
          </h2>
          <p className="text-sm leading-relaxed text-foreground">
            The handful of guides and calculators long-term investors return
            to most often: the{" "}
            <Link href="/blog/how-to-underwrite-a-rental-property-in-60-seconds" className="text-primary font-semibold hover:underline">
              60-second underwriting workflow
            </Link>
            , the deep-dive on{" "}
            <Link href="/blog/cap-rate-vs-cash-on-cash-vs-dscr" className="text-primary font-semibold hover:underline">
              cap rate vs cash-on-cash vs DSCR
            </Link>
            , the breakdown of{" "}
            <Link href="/blog/rental-property-tax-deductions" className="text-primary font-semibold hover:underline">
              every deductible expense
            </Link>
            , and the standalone{" "}
            <Link href="/tools/cap-rate-calculator" className="text-primary font-semibold hover:underline">
              cap rate
            </Link>{" "}
            and{" "}
            <Link href="/tools/dscr-calculator" className="text-primary font-semibold hover:underline">
              DSCR
            </Link>{" "}
            calculators for quick listing triage.
          </p>
        </section>

        {/* Pricing */}
        <section className="mb-12 sm:mb-16 rounded-2xl bg-primary p-6 sm:p-8 text-primary-foreground">
          <h2 className="text-2xl sm:text-3xl font-extrabold mb-2">
            Free covers the offer. Pro covers the hold.
          </h2>
          <p className="text-sm sm:text-base opacity-90 mb-5 max-w-2xl">
            Free analyzer gives you cap rate, CoC, DSCR, monthly cash flow — enough to underwrite the buy. Pro unlocks the 10-year projection, tax strategy, exit scenarios, sensitivity grid, deal score, max-allowable-offer calculator, PDF exports, and share links. Built for serious buy-and-hold operators.
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

        {/* Cross-link to other persona pages */}
        <footer className="border-t border-border pt-6 text-sm text-muted-foreground leading-relaxed">
          <Building2 className="inline-block mr-2 size-4 align-text-bottom" />
          Different strategy? See pages for{" "}
          <Link href="/for-house-hackers" className="font-bold text-foreground hover:underline">
            house hackers
          </Link>
          ,{" "}
          <Link href="/for-brrrr" className="font-bold text-foreground hover:underline">
            BRRRR operators
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
