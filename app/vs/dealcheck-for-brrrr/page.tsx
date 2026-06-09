/**
 * /vs/dealcheck-for-brrrr — niche use-case comparison page.
 *
 * Target queries: "dealcheck brrrr", "dealcheck alternative for brrrr",
 * "best brrrr calculator", "brrrr deal analysis tool". Long-tail
 * audience-slicing: same DealCheck-vs-TrueCap comparison but framed
 * specifically for BRRRR investors. Lower search volume than the base
 * "DealCheck alternative" query but extremely high intent.
 */

import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Calculator,
  Check,
  Minus,
  Sparkles,
  X,
} from "lucide-react";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SiteFooter } from "@/components/marketing/site-footer";
import { ScrollToFormButton } from "@/components/marketing/scroll-to-form-button";
import { ComparisonFaq, type FaqItem } from "@/components/marketing/comparison-faq";
import { getSiteUrl } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "TrueCap vs DealCheck for BRRRR — honest comparison",
  description:
    "Both calculators handle BRRRR. Which one does the cash-out refi math better, models the ARV-driven hold value, and helps you decide whether to refi or sell? Honest BRRRR-specific comparison.",
  keywords: [
    "dealcheck brrrr",
    "dealcheck alternative for brrrr",
    "best brrrr calculator",
    "brrrr deal analysis tool",
    "truecap brrrr calculator",
    "infinite return brrrr",
  ],
  alternates: { canonical: "/vs/dealcheck-for-brrrr" },
  openGraph: {
    title: "TrueCap vs DealCheck for BRRRR",
    description:
      "BRRRR-specific comparison: cash-out refi math, ARV modeling, infinite-return detection. Which calculator fits the BRRRR workflow better.",
    url: "/vs/dealcheck-for-brrrr",
    type: "website",
    images: [{ url: "/home.jpg", width: 1200, height: 630, alt: "TrueCap vs DealCheck for BRRRR" }],
  },
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
};

type Verdict = "truecap" | "dealcheck" | "tie";
type Row = { feature: string; truecap: string; dealcheck: string; winner: Verdict };

const MATRIX: Row[] = [
  { feature: "Purchase-stage underwriting",         truecap: "Yes — free, address auto-fill",                                          dealcheck: "Yes — listing import + standard inputs",              winner: "tie" },
  { feature: "Rehab cost modeling",                  truecap: "Yes — Pro Rehab Estimator (sq-ft-based defaults)",                       dealcheck: "Yes — manual rehab input",                            winner: "truecap" },
  { feature: "ARV (After Repair Value) input",       truecap: "Yes — explicit ARV field in BRRRR analyzer",                             dealcheck: "Yes",                                                 winner: "tie" },
  { feature: "Cash-out refi math (LTV-based)",       truecap: "Yes — Pro BRRRR analyzer (75% LTV default, configurable)",               dealcheck: "Yes — built-in BRRRR mode",                           winner: "tie" },
  { feature: "Post-refi cash flow projection",       truecap: "Yes — separate pre-refi and post-refi cash-flow lines",                 dealcheck: "Yes",                                                 winner: "tie" },
  { feature: "Infinite-return detection",            truecap: "Yes — flags when cash-out refi recovers 100%+ of investment",            dealcheck: "Implicit (you read the cash-on-cash math)",           winner: "truecap" },
  { feature: "Capital-recovered focus",              truecap: "Yes — UI explicitly shows 'capital recovered' as a headline metric",    dealcheck: "Cap rate + CoC as primary metrics",                   winner: "truecap" },
  { feature: "Sensitivity on ARV (what if ARV is 10% lower?)", truecap: "Pro — sensitivity grid stress-tests ARV + rent + rate",         dealcheck: "Manual re-runs",                                      winner: "truecap" },
  { feature: "Hold-period decision modeling",        truecap: "Pro — exit scenarios with year-by-year sell vs hold",                    dealcheck: "Pro — exit modeling available",                       winner: "tie" },
  { feature: "BRRRR-specific deal score",            truecap: "Pro — Deal Score considers BRRRR cash-recovered subscore",               dealcheck: "Standard cap rate / CoC scoring",                     winner: "truecap" },
  { feature: "Refi rate vs purchase rate handling",  "truecap": "Yes — separate refi rate input",                                       dealcheck: "Yes",                                                 winner: "tie" },
  // DealCheck includes its rental/BRRRR calculators on every plan
  // (verified dealcheck.io/pricing June 2026) — its tiers gate saved-
  // property caps, not the calculators. Don't claim otherwise.
  { feature: "Free tier covers BRRRR analyzer",      truecap: "No — Pro feature ($19/mo) but full underwriting math is free",          dealcheck: "Yes — included on all plans (free tier caps saved deals)", winner: "dealcheck" },
  { feature: "Shareable BRRRR analysis link",        truecap: "Pro — public read-only link with branding",                              dealcheck: "Pro — PDF export",                                    winner: "truecap" },
  { feature: "PDF export of BRRRR analysis",         truecap: "Pro — multi-page lender-ready report",                                   dealcheck: "Pro",                                                 winner: "tie" },
];

const DEALCHECK_BRRRR_FAQ: FaqItem[] = [
  {
    question: "Which is better for BRRRR investors — TrueCap or DealCheck?",
    answer: (
      <>
        Both work. TrueCap edges out on a few BRRRR-specific things: an
        explicit &quot;capital recovered&quot; headline metric (so you instantly see
        if it&apos;s an infinite-return deal), a sensitivity grid that
        stress-tests ARV (the single biggest BRRRR risk), and a Pro tier
        that bundles everything for $19/month — DealCheck&apos;s $10-20/month
        tiers mostly raise saved-deal caps. DealCheck has native iOS/Android apps
        and a longer track record in the BRRRR community — if mobile is
        your primary workflow, that matters.
      </>
    ),
    plainTextAnswer:
      "Both work. TrueCap edges out on BRRRR-specific things: explicit 'capital recovered' headline metric, sensitivity grid that stress-tests ARV, single $19/mo Pro tier. DealCheck has native mobile apps + longer BRRRR community trust.",
  },
  {
    question: "Does TrueCap have a BRRRR-specific calculator?",
    answer: (
      <>
        Yes — TrueCap Pro includes a dedicated BRRRR analyzer that
        models the full Buy / Rehab / Rent / Refi / Repeat cycle:
        purchase price, rehab cost, ARV, refi LTV (default 75%,
        configurable), post-refi mortgage, and the cash recovered from
        the cash-out refi. The headline metric is the &quot;capital
        recovered&quot; percentage — anything ≥100% is an infinite-return
        deal (you pulled all your money back out).
      </>
    ),
    plainTextAnswer:
      "Yes — TrueCap Pro includes a dedicated BRRRR analyzer modeling purchase, rehab, ARV, refi LTV (75% default), post-refi mortgage, and capital recovered. ≥100% capital recovered = infinite-return deal.",
  },
  {
    question: "How does TrueCap handle the ARV (After Repair Value) input for BRRRR?",
    answer: (
      <>
        ARV is an explicit field in the BRRRR analyzer. You enter your
        estimated ARV (typically from CMA comps or an appraiser
        estimate), and TrueCap calculates the cash-out refi amount
        based on your configured LTV (75% default — most BRRRR-friendly
        lenders cap there). The Pro sensitivity grid stress-tests ARV
        at ±10% so you can see what happens if your CMA was optimistic.
      </>
    ),
    plainTextAnswer:
      "ARV is an explicit field in the BRRRR analyzer. Enter estimated ARV (from CMA or appraiser); TrueCap calculates cash-out refi at your configured LTV (75% default — most BRRRR-friendly lenders cap there). Pro sensitivity grid stress-tests ARV ±10%.",
  },
  {
    question: "DealCheck's BRRRR mode is well-known — what does TrueCap do differently?",
    answer: (
      <>
        Three things: (1) explicit infinite-return flagging — TrueCap
        highlights when your capital recovered hits 100%, so you don&apos;t
        have to mentally compute it; (2) sensitivity on ARV — DealCheck
        requires manual re-runs, TrueCap&apos;s Pro grid varies ARV ±10%
        in one view; (3) bundling — TrueCap Pro is $19/mo with BRRRR,
        sensitivity, tax strategy, and exit scenarios all included,
        while DealCheck&apos;s plans ($10-20/mo) mostly raise saved-property
        caps. The fundamental BRRRR math is the same on both.
      </>
    ),
    plainTextAnswer:
      "Three things: (1) explicit infinite-return flagging when capital recovered hits 100%; (2) ARV sensitivity in one view vs manual re-runs; (3) TrueCap Pro at $19/mo bundles BRRRR + sensitivity + tax strategy + exit scenarios, while DealCheck's $10-20/mo plans mostly raise saved-property caps. Fundamental BRRRR math is identical.",
  },
  {
    question: "Can I use TrueCap free for BRRRR?",
    answer: (
      <>
        The standard underwriting (cap rate, cash flow, DSCR) is free on
        any BRRRR property. The dedicated BRRRR analyzer (cash-out refi
        math, capital recovered, infinite-return detection) is a Pro
        feature ($19/month). For your first BRRRR deal evaluation, free
        TrueCap + your spreadsheet covers the cash-out math; if you do
        BRRRR repeatedly, Pro pays for itself in the first deal.
      </>
    ),
    plainTextAnswer:
      "Standard underwriting (cap rate, cash flow, DSCR) is free on BRRRR properties. The dedicated BRRRR analyzer (cash-out refi, capital recovered, infinite-return detection) is Pro ($19/mo). One BRRRR deal pays for Pro.",
  },
  {
    question: "What's the right refi LTV to model in a BRRRR analysis?",
    answer: (
      <>
        75% is the most common cap from BRRRR-friendly DSCR and
        portfolio lenders as of 2026. Some lenders go to 80% for
        seasoned properties (6+ months of rental history). A few
        portfolio lenders go higher for strong borrowers. Default to 75%
        and adjust if you have a specific lender quote. TrueCap&apos;s
        LTV field is configurable so you can model multiple scenarios.
      </>
    ),
    plainTextAnswer:
      "75% is the standard BRRRR-friendly DSCR/portfolio lender cap as of 2026. Some lenders go 80% for seasoned properties (6+ months of rental history). Default to 75%; TrueCap's LTV field is configurable for scenario modeling.",
  },
];

export default function VsDealCheckForBrrrrPage() {
  const siteUrl = getSiteUrl();
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "TrueCap vs DealCheck for BRRRR — honest comparison",
    url: `${siteUrl}/vs/dealcheck-for-brrrr`,
    description:
      "BRRRR-specific comparison of TrueCap and DealCheck — cash-out refi math, ARV modeling, infinite-return detection.",
    dateModified: "2026-06-07",
    publisher: { "@id": `${siteUrl}/#organization` },
  };

  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
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
            BRRRR-specific comparison
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-foreground leading-[1.05] tracking-tight text-balance">
            TrueCap vs DealCheck for BRRRR:{" "}
            <span className="text-primary">which calculator fits the buy → refi → repeat workflow?</span>
          </h1>
          <p className="mt-4 max-w-2xl text-base sm:text-lg leading-relaxed text-muted-foreground">
            Both calculators support BRRRR underwriting. This is the
            BRRRR-investor cut: which one does the cash-out refi math
            faster, surfaces &quot;infinite return&quot; deals more
            clearly, and helps you stress-test the one assumption that
            kills BRRRR deals — your ARV estimate.
          </p>
          <div className="mt-7 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            <ScrollToFormButton className="group inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground shadow-[0_12px_28px_rgba(82,72,212,0.28)] transition-transform hover:-translate-y-0.5">
              <Calculator className="size-4" />
              Underwrite a BRRRR deal
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
            No card · No signup · BRRRR analyzer in Pro
          </p>
        </section>

        {/* TL;DR */}
        <section className="mb-12 sm:mb-16 rounded-2xl border border-border bg-card p-6 sm:p-8">
          <h2 className="text-xl sm:text-2xl font-extrabold text-foreground mb-3">TL;DR for BRRRR investors</h2>
          <p className="text-sm sm:text-base leading-relaxed text-foreground">
            Both work. <strong>TrueCap</strong> edges out on three
            BRRRR-specific things: explicit &quot;capital recovered&quot;
            headline metric (so infinite-return deals are obvious), a
            sensitivity grid that stress-tests ARV (the single biggest
            BRRRR risk), and a single $19/month Pro tier that bundles
            the BRRRR analyzer + everything else.
            <strong> DealCheck</strong> has native iOS/Android apps and a
            longer track record in the BRRRR community — if you
            underwrite at showings on mobile, that matters. Both run
            standard cap rate + DSCR math; the differences are in
            BRRRR-specific workflow polish.
          </p>
        </section>

        {/* Matrix */}
        <section className="mb-12 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground mb-2">
            BRRRR feature-by-feature
          </h2>
          <p className="text-base text-muted-foreground mb-6 leading-relaxed">
            Where each tool wins on the BRRRR-specific workflow.
          </p>
          <div className="overflow-x-auto rounded-2xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr className="text-left">
                  <th className="py-3 px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Feature
                  </th>
                  <th className="py-3 px-3 text-[10px] font-bold uppercase tracking-widest text-primary">
                    TrueCap
                  </th>
                  <th className="py-3 px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    DealCheck
                  </th>
                </tr>
              </thead>
              <tbody>
                {MATRIX.map((row) => (
                  <tr key={row.feature} className="border-t border-border align-top">
                    <td className="py-3 px-3 text-sm font-semibold text-foreground">{row.feature}</td>
                    <td className="py-3 px-3 text-xs leading-relaxed text-foreground/85">
                      <div className="flex items-start gap-2">
                        {row.winner === "tie" ? (
                          <Minus className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/60" />
                        ) : row.winner === "truecap" ? (
                          <Check className="mt-0.5 size-3.5 shrink-0 text-[var(--brand-green)]" />
                        ) : (
                          <X className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/50" />
                        )}
                        <span>{row.truecap}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-xs leading-relaxed text-foreground/85">
                      <div className="flex items-start gap-2">
                        {row.winner === "tie" ? (
                          <Minus className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/60" />
                        ) : row.winner === "dealcheck" ? (
                          <Check className="mt-0.5 size-3.5 shrink-0 text-[var(--brand-green)]" />
                        ) : (
                          <X className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/50" />
                        )}
                        <span>{row.dealcheck}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            DealCheck details based on publicly available product info as
            of 2026. See{" "}
            <a href="https://dealcheck.io" target="_blank" rel="noopener" className="underline">
              dealcheck.io
            </a>{" "}
            for their current state.
          </p>
        </section>

        <ComparisonFaq competitorName="DealCheck (BRRRR)" items={DEALCHECK_BRRRR_FAQ} />

        {/* Pricing CTA */}
        <section className="mb-12 sm:mb-16 rounded-2xl bg-primary p-6 sm:p-8 text-primary-foreground">
          <h2 className="text-2xl sm:text-3xl font-extrabold mb-2">
            Underwrite your next BRRRR — free.
          </h2>
          <p className="text-sm sm:text-base opacity-90 mb-5 max-w-2xl">
            Free covers the standard cap rate, CoC, DSCR, and cash flow
            on the property. Pro ($19/mo) unlocks the full BRRRR
            analyzer with capital recovered, infinite-return flagging,
            and ARV sensitivity stress-testing.
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
              Run a deal now
            </Link>
          </div>
        </section>

        <footer className="border-t border-border pt-6 text-sm text-muted-foreground leading-relaxed">
          Other comparisons:{" "}
          <Link href="/vs/dealcheck" className="font-bold text-foreground hover:underline">TrueCap vs DealCheck</Link>
          {" · "}
          <Link href="/vs/biggerpockets-calculator" className="font-bold text-foreground hover:underline">TrueCap vs BiggerPockets</Link>
          {" · "}
          <Link href="/vs/biggerpockets-for-house-hacking" className="font-bold text-foreground hover:underline">BiggerPockets for House Hackers</Link>
        </footer>
      </main>
      <SiteFooter />
      <ScrollDepthTracker />
    </div>
  );
}
