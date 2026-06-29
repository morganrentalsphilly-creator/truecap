/**
 * /vs/dealcheck-for-fix-and-flip — niche use-case comparison page (Fix & Flip cut).
 *
 * Target queries: "dealcheck fix and flip", "dealcheck flip calculator", "best fix and flip calculator", "flip deal analyzer", "fix and flip analysis tool". Long-tail audience-slicing comparison.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Calculator, Check, Minus, Sparkles, X } from "lucide-react";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SiteFooter } from "@/components/marketing/site-footer";
import { ScrollToFormButton } from "@/components/marketing/scroll-to-form-button";
import { ComparisonFaq, type FaqItem } from "@/components/marketing/comparison-faq";
import { getSiteUrl } from "@/lib/site-url";
import { VsBreadcrumbSchema } from "@/components/marketing/vs-breadcrumb-schema";

export const metadata: Metadata = {
  title: "TrueCap vs DealCheck for Fix and Flip — honest comparison",
  description:
    "Both calculators handle fix-and-flip. Which one models ARV, rehab budgets, holding costs, and break-even ARV cleanest? Honest flip-specific comparison.",
  keywords: [
    "dealcheck fix and flip",
    "dealcheck flip calculator",
    "best fix and flip calculator",
    "flip deal analyzer",
    "fix and flip analysis tool",
  ],
  alternates: { canonical: "/vs/dealcheck-for-fix-and-flip" },
  openGraph: {
    title: "TrueCap vs DealCheck for Fix and Flip — honest comparison",
    description:
      "Fix-and-flip-specific TrueCap vs DealCheck: ARV, rehab, holding costs, break-even ARV, profit math.",
    url: "/vs/dealcheck-for-fix-and-flip",
    type: "website",
    images: [{ url: "/home.jpg", width: 1200, height: 630, alt: "TrueCap vs DealCheck for Fix and Flip — honest comparison" }],
  },
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
};

type Verdict = "truecap" | "dealcheck" | "tie";
type Row = { feature: string; truecap: string; dealcheck: string; winner: Verdict };

const MATRIX: Row[] = [
  { feature: "Purchase + rehab modeling", truecap: "Yes — Pro Rehab Estimator (sq-ft defaults)", dealcheck: "Yes — manual rehab input", winner: "truecap" },
  { feature: "ARV input + appreciation modeling", truecap: "Yes — dedicated ARV field in flip analyzer", dealcheck: "Yes — ARV-driven sale projection", winner: "tie" },
  { feature: "Holding cost calculation", truecap: "Yes — Pro flip analyzer auto-computes holding by month", dealcheck: "Yes — manual entry", winner: "truecap" },
  { feature: "Break-even ARV solver", truecap: "Yes — Pro flip analyzer shows lowest ARV at which deal still profits", dealcheck: "Manual re-runs", winner: "truecap" },
  { feature: "Profit + annualized ROI", truecap: "Yes — net profit + annualized ROI at sale", dealcheck: "Yes", winner: "tie" },
  { feature: "Sensitivity on ARV (what if it's 10% lower?)", truecap: "Pro — sensitivity grid", dealcheck: "Manual re-runs", winner: "truecap" },
  { feature: "Hard money loan modeling", truecap: "Yes — short-term loan inputs (rate + months + points)", dealcheck: "Yes", winner: "tie" },
  { feature: "Mobile UX at showings", truecap: "PWA installable", dealcheck: "Native iOS + Android", winner: "dealcheck" },
  // DealCheck's house-flipping calculator is included on every plan
  // (verified dealcheck.io/pricing June 2026) — tiers gate saved-
  // property caps, not the calculators.
  { feature: "Free tier covers flip math", truecap: "No — Pro feature ($29.99/mo)", dealcheck: "Yes — included on all plans (free tier caps saved deals)", winner: "dealcheck" },
  { feature: "Shareable flip analysis", truecap: "Pro — public read-only link + branding", dealcheck: "Pro — PDF export", winner: "truecap" },
];

const NICHE_FAQ: FaqItem[] = [
  {
    question: "Which is better for fix-and-flippers — TrueCap or DealCheck?",
    answer: (
      <>
        Both work. TrueCap edges out on break-even ARV math (you see the lowest ARV at which the deal still profits in one view) and Pro sensitivity on ARV (single biggest flip risk). DealCheck has native iOS/Android apps which is the cleaner mobile experience at showings. Both have rehab + holding-cost + ARV modeling.
      </>
    ),
    plainTextAnswer:
      "Both work. TrueCap: break-even ARV in one view + ARV sensitivity. DealCheck: native iOS/Android for mobile-heavy flippers. Both have rehab + holding-cost + ARV modeling.",
  },
  {
    question: "Does TrueCap support hard money loans for flips?",
    answer: (
      <>
        Yes — TrueCap&apos;s flip analyzer (Pro) supports short-term loan inputs: rate, term in months, points paid at close. The holding cost calculation factors in the higher interest rate + points so your profit projection reflects real hard-money costs.
      </>
    ),
    plainTextAnswer:
      "Yes — Pro flip analyzer takes rate + term in months + points. Holding cost factors in higher rate + points so profit projection reflects real hard-money costs.",
  },
  {
    question: "What&apos;s break-even ARV and why does TrueCap surface it?",
    answer: (
      <>
        Break-even ARV is the lowest sale price at which you make $0 profit after rehab, holding, and selling costs. If your CMA says ARV is $350k but your break-even is $310k, you have $40k of margin for ARV being optimistic. TrueCap shows it as a single number; DealCheck requires you to manually re-run the analysis at lower ARVs.
      </>
    ),
    plainTextAnswer:
      "Break-even ARV = lowest sale price where you make $0 after rehab + holding + selling costs. If CMA says $350k ARV but break-even is $310k, you have $40k margin. TrueCap shows it; DealCheck requires manual re-runs.",
  },
  {
    question: "Can I use TrueCap free for flip analysis?",
    answer: (
      <>
        The standard cap rate / cash flow / DSCR underwriting is free on any property. The dedicated flip analyzer (ARV math, holding costs, break-even ARV, profit) is a Pro feature ($29.99/mo). For your first flip evaluation, free TrueCap + a spreadsheet covers the basics; if you do flips repeatedly, Pro pays for itself fast.
      </>
    ),
    plainTextAnswer:
      "Standard underwriting free. Dedicated flip analyzer (ARV math, holding, break-even ARV, profit) is Pro $29.99/mo. One flip pays for Pro.",
  },
  {
    question: "How accurate are ARV estimates in flip analysis?",
    answer: (
      <>
        ARV is the single biggest unknown in any flip. TrueCap&apos;s role isn&apos;t to predict ARV (that&apos;s your CMA&apos;s job) — it&apos;s to stress-test what happens if your ARV is wrong. Pro&apos;s sensitivity grid varies ARV ±10% in one view so you can see whether the deal still works on the downside.
      </>
    ),
    plainTextAnswer:
      "ARV is the biggest flip unknown. TrueCap stress-tests it, doesn&apos;t predict it. Pro sensitivity grid varies ARV ±10% in one view so you see the downside scenario.",
  },
];

export default function VsDealcheckForFixAndFlipPage() {
  const siteUrl = getSiteUrl();
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "TrueCap vs DealCheck for Fix and Flip — honest comparison",
    url: `${siteUrl}/vs/dealcheck-for-fix-and-flip`,
    description: "Both calculators handle fix-and-flip. Which one models ARV, rehab budgets, holding costs, and break-even ARV cleanest? Honest flip-specific comparison.",
    dateModified: "2026-06-07",
    publisher: { "@id": `${siteUrl}/#organization` },
  };

  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <VsBreadcrumbSchema vsPath="/vs/dealcheck-for-fix-and-flip" pageName="TrueCap vs DealCheck for Fix and Flip" />
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
            Fix & Flip-specific comparison
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-foreground leading-[1.05] tracking-tight text-balance">
            TrueCap vs DealCheck for Fix & Flip:{" "}
            <span className="text-primary">which fits the buy → rehab → flip workflow?</span>
          </h1>
          <p className="mt-4 max-w-2xl text-base sm:text-lg leading-relaxed text-muted-foreground">
            Both calculators support fix-and-flip underwriting. This is the flipper&apos;s cut: which one models After Repair Value (ARV), rehab budgets, holding costs, and break-even ARV more cleanly. Both run identical core math; differences are in flip-specific workflow polish.
          </p>
          <div className="mt-7 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            <ScrollToFormButton className="group inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground shadow-[0_12px_28px_rgba(0, 112, 196,0.28)] transition-transform hover:-translate-y-0.5">
              <Calculator className="size-4" />
              Run a deal — 60 seconds
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </ScrollToFormButton>
            <Link
              href="/pricing"
              className="inline-flex h-12 items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-5 text-sm font-semibold text-foreground hover:bg-muted"
            >
              See TrueCap pricing
            </Link>
          </div>
        </section>

        <section className="mb-12 sm:mb-16 rounded-2xl border border-border bg-card p-6 sm:p-8">
          <h2 className="text-xl sm:text-2xl font-extrabold text-foreground mb-3">
            TL;DR for Fix & Flip investors
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-primary mb-2">
                Use TrueCap when
              </p>
              <ul className="space-y-1.5 text-sm leading-relaxed text-foreground">
                <li>You&apos;re evaluating a flip before making an offer.</li>
                <li>You want break-even ARV math + sensitivity on ARV assumptions.</li>
                <li>You want holding-cost detail (per-month).</li>
                <li>You want the deepest analysis bundled in one Pro tier ($29.99/mo all-in).</li>
              </ul>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                Use DealCheck when
              </p>
              <ul className="space-y-1.5 text-sm leading-relaxed text-foreground">
                <li>You flip on mobile at properties all day and need a native app.</li>
                <li>You already have a DealCheck Plus or Pro subscription.</li>
                <li>You want listing-import-from-Zillow as part of the workflow.</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="mb-12 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground mb-2">
            Fix & Flip feature-by-feature
          </h2>
          <p className="text-base text-muted-foreground mb-6 leading-relaxed">
            Where each tool wins on the Fix & Flip workflow specifically.
          </p>
          <div className="overflow-x-auto rounded-2xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr className="text-left">
                  <th className="py-3 px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Feature</th>
                  <th className="py-3 px-3 text-[10px] font-bold uppercase tracking-widest text-primary">TrueCap</th>
                  <th className="py-3 px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">DealCheck</th>
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
          <p className="mt-4 text-sm leading-relaxed text-foreground">
            Most flips live or die on the rehab budget. Pin yours down with the standalone{" "}
            <Link href="/tools/rehab-cost-estimator" className="font-semibold text-primary hover:underline">rehab cost estimator</Link>
            {" "}before you make an offer. If the plan is to keep the property instead of selling, the{" "}
            <Link href="/tools/brrrr-calculator" className="font-semibold text-primary hover:underline">BRRRR calculator</Link>
            {" "}runs the refi math — and our{" "}
            <Link href="/blog/brrrr-method-explained" className="font-semibold text-primary hover:underline">BRRRR method explained</Link>
            {" "}guide covers when flip-vs-hold tips one way.
          </p>
        </section>

        <ComparisonFaq competitorName="DealCheck (Fix & Flip)" items={NICHE_FAQ} />

        <section className="mb-12 sm:mb-16 rounded-2xl bg-primary p-6 sm:p-8 text-primary-foreground">
          <h2 className="text-2xl sm:text-3xl font-extrabold mb-2">
            Underwrite your next Fix & Flip deal — free.
          </h2>
          <p className="text-sm sm:text-base opacity-90 mb-5 max-w-2xl">
            Free covers the standard cap rate, CoC, DSCR, and cash flow. Pro unlocks
            projections, sensitivity, tax strategy, exit scenarios, MAO,
            and PDF exports.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 bg-primary-foreground text-primary px-4 py-2.5 rounded-xl font-bold hover:opacity-90 transition-opacity"
            >
              Start a 3-day free trial
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
          <Link href="/vs/dealcheck-for-brrrr" className="font-bold text-foreground hover:underline">TrueCap vs DealCheck for BRRRR</Link>
          {" · "}
          <Link href="/vs/biggerpockets-calculator" className="font-bold text-foreground hover:underline">TrueCap vs BiggerPockets</Link>
        </footer>
      </main>
      <SiteFooter />
      <ScrollDepthTracker />
    </div>
  );
}
