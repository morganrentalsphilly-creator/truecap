/**
 * /for-flippers — persona-specific landing page for fix-and-flippers.
 *
 * Useful as a paid-ad landing page: ad copy targeting flippers
 * ("model your flip's profit + ARV + break-even in 60 seconds")
 * matches the page messaging better than the generic homepage.
 *
 * Flippers are a natural Pro fit — the Fix & Flip analyzer + Rehab
 * Cost Estimator + Sensitivity Grid are all Pro features that directly
 * answer questions flippers ask on every deal.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Calculator, Hammer, ShieldCheck, Sparkles, TrendingUp, Wrench } from "lucide-react";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SiteFooter } from "@/components/marketing/site-footer";

export const metadata: Metadata = {
  title: "For Fix & Flippers",
  description:
    "Underwrite a flip in 60 seconds. Model ARV, rehab cost, holding cost, net profit, break-even, and annualized ROI. Free to start.",
  keywords: [
    "fix and flip calculator",
    "flip analyzer",
    "ARV calculator",
    "flip profit calculator",
    "rehab cost estimator",
  ],
  alternates: { canonical: "/for-flippers" },
  openGraph: {
    title: "For Fix & Flippers — TrueCap",
    description:
      "Underwrite a flip in 60 seconds. ARV, rehab, holding cost, net profit, break-even, annualized ROI — all live.",
    url: "/for-flippers",
    type: "website",
    images: [{ url: "/home.jpg", width: 1200, height: 630, alt: "TrueCap for fix-and-flippers" }],
  },
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
};

const USE_CASES: { icon: typeof Calculator; title: string; body: string }[] = [
  {
    icon: Hammer,
    title: "Estimate rehab cost without a contractor walk",
    body: "Sq-ft-based defaults for cosmetic, kitchen, bath, and systems work. Mid-market 2024-26 contractor pricing. Override line-by-line if you have actual bids.",
  },
  {
    icon: TrendingUp,
    title: "Solve an Offer Ceiling at your target margin",
    body: "Offer Ceiling = (ARV × target margin) − rehab − closing − holding − selling. It is the highest modeled acquisition price that meets the target margin under the assumptions shown, and updates as ARV or rehab changes.",
  },
  {
    icon: ShieldCheck,
    title: "Stress-test before you commit",
    body: "Sensitivity grid shows how the deal looks if ARV comes in 10% low, rehab is 20% over, or holding stretches an extra month. The 'will this still pencil?' answer in one screen.",
  },
  {
    icon: Wrench,
    title: "Compare flip vs hold for the same property",
    body: "Pro models both: flip net profit vs 10-year cash flow + appreciation on a buy-and-hold. Sometimes the BRRRR is the better play and the analyzer makes that obvious.",
  },
];

export default function ForFlippersPage() {
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

        {/* Hero */}
        <section className="mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-card px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-primary mb-4">
            <Sparkles className="size-3" />
            For fix &amp; flippers
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-foreground leading-[1.05] tracking-tight text-balance">
            Screen the acquisition free. <span className="text-primary">Model the full flip with Pro.</span>
          </h1>
          <p className="mt-4 max-w-2xl text-base sm:text-lg leading-relaxed text-muted-foreground">
            Run the rental fallback screen free. Pro adds ARV, rehab, holding
            costs, profit, break-even ARV, sensitivity, and Offer Ceiling.
          </p>

          <div className="mt-7 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            {/* Deep-link into the analyzer with the Fix & Flip play pre-
                selected (?strategy= analyzer handoff) — hard-money defaults
                + the flip model, not a blank buy-and-hold form. */}
            <Link
              href="/?strategy=fix-flip#main"
              prefetch={false}
              className="group inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground shadow-[0_12px_28px_rgba(0,112,196,0.28)] transition-transform hover:-translate-y-0.5"
            >
              <Calculator className="size-4" />
              Screen this property free
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/tools/rehab-cost-estimator"
              className="inline-flex h-12 items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-5 text-sm font-semibold text-foreground hover:bg-muted"
            >
              Rehab cost estimator
            </Link>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Free screen: no card or signup
          </p>
        </section>

        {/* Use cases */}
        <section id="use-cases" className="mb-12 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground mb-2">
            What flippers actually use TrueCap for
          </h2>
          <p className="text-base text-muted-foreground mb-6 leading-relaxed">
            Four questions every flip pivots on. TrueCap answers each
            of them in seconds.
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

        {/* Numbers we model */}
        <section className="mb-12 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground mb-2">
            Every number a flip pivots on
          </h2>
          <div className="not-prose mt-4 overflow-x-auto rounded-2xl border border-border bg-card">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left p-3 font-bold text-foreground">Metric</th>
                  <th className="text-left p-3 font-bold text-foreground">What it tells you</th>
                </tr>
              </thead>
              <tbody className="[&_td]:p-3 [&_td]:border-b [&_td]:border-border [&_tr:last-child_td]:border-0">
                <tr><td className="font-semibold text-foreground">ARV (After Repair Value)</td><td className="text-muted-foreground">Projected sale price after the renovation</td></tr>
                <tr><td className="font-semibold text-foreground">Total rehab cost</td><td className="text-muted-foreground">Sum of all renovation work + contingency</td></tr>
                <tr><td className="font-semibold text-foreground">Total holding cost</td><td className="text-muted-foreground">Mortgage + tax + insurance + utilities × hold months</td></tr>
                <tr><td className="font-semibold text-foreground">Selling cost</td><td className="text-muted-foreground">Agent commission + closing costs at the sale</td></tr>
                <tr><td className="font-semibold text-foreground">Net profit</td><td className="text-muted-foreground">ARV − everything above − purchase price</td></tr>
                <tr><td className="font-semibold text-foreground">Cash-on-cash ROI</td><td className="text-muted-foreground">Net profit ÷ total cash deployed</td></tr>
                <tr><td className="font-semibold text-foreground">Annualized ROI</td><td className="text-muted-foreground">Adjusts ROI for the hold length — makes 3-month vs 12-month flips comparable</td></tr>
                <tr><td className="font-semibold text-foreground">Break-even ARV</td><td className="text-muted-foreground">The ARV at which net profit hits zero. Your worst-case appraisal target.</td></tr>
                <tr><td className="font-semibold text-foreground">Offer Ceiling</td><td className="text-muted-foreground">Highest modeled acquisition price that meets the target margin under the assumptions shown</td></tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Why flippers specifically */}
        <section className="mb-12 sm:mb-16 rounded-2xl border border-[var(--brand-orange)]/25 bg-[var(--brand-orange)]/10 p-6 sm:p-8">
          <h2 className="text-sm font-extrabold uppercase tracking-widest text-[var(--brand-orange)] mb-3">
            Why flippers pick TrueCap
          </h2>
          <ul className="space-y-2 text-sm sm:text-base text-foreground">
            <li><strong>The Offer Ceiling + sensitivity grid combination</strong> shows the highest modeled acquisition price that meets the target margin and how changes to the entered assumptions affect the result.</li>
            <li><strong>Rehab estimator with sq-ft-based defaults</strong> for cosmetic, kitchen, bath, systems. Mid-market 2024-26 pricing so you can ballpark before getting a contractor on-site.</li>
            <li><strong>Flip vs BRRRR side-by-side</strong> on the same property. Sometimes the right answer is to hold what you would have flipped.</li>
            <li><strong>Shareable links</strong> to send the underwrite to your hard-money lender or capital partner.</li>
          </ul>
        </section>

        <section className="mb-12 sm:mb-16 rounded-2xl border border-border bg-card p-6 sm:p-8">
          <h2 className="text-lg sm:text-xl font-extrabold text-foreground mb-3">
            Tools and guides flippers reach for first
          </h2>
          <p className="text-sm leading-relaxed text-foreground">
            Pre-offer, anchor your rehab budget with the{" "}
            <Link href="/blog/how-to-estimate-rehab-costs" className="text-primary font-semibold hover:underline">
              how-to-estimate-rehab-costs guide
            </Link>{" "}
            and stress-test the buy with the{" "}
            <Link href="/tools/brrrr-calculator" className="text-primary font-semibold hover:underline">
              BRRRR calculator
            </Link>{" "}
            as a hold-instead alternative. If you&apos;re hunting deeper
            discounts, the playbook on{" "}
            <Link href="/blog/how-to-find-off-market-rental-properties" className="text-primary font-semibold hover:underline">
              finding off-market properties
            </Link>{" "}
            transfers directly. Post-rehab, the{" "}
            <Link href="/tools/cap-rate-calculator" className="text-primary font-semibold hover:underline">
              cap rate calculator
            </Link>{" "}
            confirms the comps you&apos;re pricing into.
          </p>
        </section>

        {/* CTA */}
        <section className="mb-12 sm:mb-16 rounded-2xl bg-primary p-6 sm:p-8 text-primary-foreground">
          <h2 className="text-2xl sm:text-3xl font-extrabold mb-2">
            Screen the acquisition free. Unlock the flip model when you need it.
          </h2>
          <p className="text-sm sm:text-base opacity-90 mb-5 max-w-2xl">
            Free shows the rental fallback metrics for the property. Pro unlocks
            the Fix &amp; Flip analyzer, Offer Ceiling, sensitivity, BRRRR modeling,
            and the full rehab estimator.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/?strategy=fix-flip#main"
              prefetch={false}
              className="inline-flex items-center gap-2 bg-primary-foreground text-primary px-4 py-2.5 rounded-xl font-bold hover:opacity-90 transition-opacity"
            >
              <Calculator className="w-4 h-4" />
              Open the analyzer
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 border border-primary-foreground/40 bg-primary-foreground/10 text-primary-foreground px-4 py-2.5 rounded-xl font-bold hover:bg-primary-foreground/20 transition-colors"
            >
              See Pro pricing
              <ArrowUpRight className="w-4 h-4" />
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
          <Link href="/for-brrrr" className="font-bold text-foreground hover:underline">
            BRRRR operators
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
