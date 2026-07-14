/**
 * /vs/biggerpockets-calculator — competitor comparison landing page.
 *
 * Target queries: "BiggerPockets calculator alternative", "BiggerPockets
 * vs ...", "free BiggerPockets calculator", "BiggerPockets calculator
 * pro", "BP rental calculator". MASSIVE commercial-intent search volume —
 * BiggerPockets is the brand-name destination for real estate calculators.
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
import { VsBreadcrumbSchema } from "@/components/marketing/vs-breadcrumb-schema";

export const metadata: Metadata = {
  title: "Free BiggerPockets Calculator Alternative (2026)",
  description:
    "Honest TrueCap vs BiggerPockets calculator: free tier depth, modern UX, address auto-fill, sharing — what each does best and when to pick which.",
  keywords: [
    "biggerpockets calculator alternative",
    "biggerpockets calculator vs truecap",
    "truecap vs biggerpockets",
    "biggerpockets rental calculator",
    "biggerpockets pro alternative",
    "free biggerpockets calculator",
    "rental analysis tool comparison",
  ],
  alternates: { canonical: "/vs/biggerpockets-calculator" },
  openGraph: {
    title: "Free BiggerPockets Calculator Alternative (2026)",
    description:
      "Free-tier depth, modern UX, address auto-fill, mobile, sharing — what each tool is built for.",
    url: "/vs/biggerpockets-calculator",
    type: "website",
    images: [{ url: "/home.jpg", width: 1200, height: 630, alt: "TrueCap vs BiggerPockets Calculator" }],
  },
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
};

type Verdict = "truecap" | "biggerpockets" | "tie";
type Row = { feature: string; truecap: string; bp: string; winner: Verdict };

const MATRIX: Row[] = [
  { feature: "Free tier — full analysis depth",      truecap: "Unlimited cap rate, CoC, DSCR, NCF, monthly cash flow — no signup",                        bp: "5 free uses, then Pro required ($39/mo)",                            winner: "truecap" },
  { feature: "Pricing — entry point",                 truecap: "$25/mo annual Pro · 100% free underwriting tier",                                       bp: "$390/yr Pro ($39/mo) · limited free",                                winner: "truecap" },
  { feature: "Address auto-fill",                     truecap: "Paste address → HUD rent + FRED rate + county tax populate live",                          bp: "Manual entry; no live data integrations",                            winner: "truecap" },
  { feature: "Modern UI / mobile UX",                 truecap: "Built 2024-2026, designed mobile-first — works at the showing",                            bp: "Long-established interface; functional but dated",                   winner: "truecap" },
  { feature: "BRRRR analyzer",                        truecap: "Yes — ARV-driven refi math + capital-recovery focus",                                      bp: "Yes — long-standing BRRRR support",                                  winner: "tie" },
  { feature: "Fix-and-flip analyzer",                 truecap: "Yes — ARV, holding cost, profit modeling",                                                bp: "Yes — separate Flip Calculator product",                             winner: "tie" },
  { feature: "Rental Property Calculator",            truecap: "Core product — used by every TrueCap session",                                            bp: "Their flagship calculator",                                          winner: "tie" },
  { feature: "10-year projection",                    truecap: "Pro — rent + expense + appreciation compounding, one view",                                bp: "Pro — long-range projections built in",                              winner: "tie" },
  { feature: "Tax strategy / depreciation",           truecap: "Pro — bracket-aware depreciation + interest deduction + after-tax CF",                     bp: "Basic tax info; no bracket-aware modeling",                          winner: "truecap" },
  { feature: "Sensitivity grid (stress test)",        truecap: "Pro — rent ±10%, vacancy ±5pp, rates ±1pp in a single view",                                bp: "Not a primary feature",                                              winner: "truecap" },
  { feature: "Max Allowable Offer (MAO) solver",      truecap: "Pro — works backward from target return automatically",                                    bp: "Available in Pro tier",                                              winner: "tie" },
  { feature: "Shareable read-only deal links",        truecap: "Pro — clean public URL with metrics + branding",                                            bp: "PDF export only; no shareable link",                                 winner: "truecap" },
  { feature: "PDF report export",                     truecap: "Pro — multi-page lender-ready report with verdict",                                        bp: "PDF export available in Pro",                                        winner: "tie" },
  { feature: "Deal score + verdict explanation",      truecap: "Free — 0–100 score with subscore breakdown + plain-English why",                            bp: "Color indicators; no composite score",                               winner: "truecap" },
  { feature: "Portfolio rollup across saved deals",   truecap: "Yes — total CF + weighted cap rate + blended CoC across portfolio",                         bp: "List view; no portfolio aggregate metrics",                          winner: "truecap" },
  { feature: "Cash flow waterfall visualization",     truecap: "Yes — see exactly where every rent dollar goes",                                            bp: "Standard line-item breakdown only",                                  winner: "truecap" },
  { feature: "Bundled with content / forums",         truecap: "Has standalone blog + glossary; not a forum",                                              bp: "Forums + podcast + books + community — massive ecosystem",           winner: "biggerpockets" },
  { feature: "Brand recognition / track record",      truecap: "New entrant (2025-2026), modern, growing",                                                  bp: "Industry standard since 2004",                                       winner: "biggerpockets" },
  { feature: "Education + courses",                   truecap: "Free educational content (blog + glossary + methodology)",                                  bp: "Paid courses + bootcamps + books",                                   winner: "biggerpockets" },
  { feature: "Open data sources cited",               truecap: "HUD FMR + FRED + state tax — every assumption traceable",                                   bp: "Manual entry; no published data sources",                            winner: "truecap" },
];

export default function VsBiggerPocketsCalculatorPage() {
  const siteUrl = getSiteUrl();
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Free BiggerPockets Calculator Alternative (2026)",
    url: `${siteUrl}/vs/biggerpockets-calculator`,
    description:
      "Side-by-side comparison of TrueCap and the BiggerPockets Rental Property Calculator for rental underwriting.",
    dateModified: "2026-06-01",
    publisher: { "@id": `${siteUrl}/#organization` },
  };

  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <VsBreadcrumbSchema vsPath="/vs/biggerpockets-calculator" pageName="TrueCap vs BiggerPockets Calculator" />
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
            Honest comparison
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-foreground leading-[1.05] tracking-tight text-balance">
            TrueCap vs BiggerPockets Calculator:{" "}
            <span className="text-primary">which one fits how you actually work?</span>
          </h1>
          <p className="mt-4 max-w-2xl text-base sm:text-lg leading-relaxed text-muted-foreground">
            BiggerPockets has been the default real estate analysis tool for two
            decades. Their calculator is solid. We built TrueCap because we
            wanted something cheaper, faster to use, and honest about what the
            free tier actually does — without you joining yet another community.
            Here&apos;s the honest comparison.
          </p>
          <div className="mt-7 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            <ScrollToFormButton
              className="group inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground shadow-[0_12px_28px_rgba(0,112,196,0.28)] transition-transform hover:-translate-y-0.5"
            >
              <Calculator className="size-4" />
              Try the TrueCap free analyzer
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </ScrollToFormButton>
            <Link
              href="/pricing"
              className="inline-flex h-12 items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-5 text-sm font-semibold text-foreground hover:bg-muted"
            >
              See TrueCap pricing
            </Link>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            No card · No signup needed to use the analyzer · Cancel anytime
          </p>
        </section>

        {/* TL;DR */}
        <section className="mb-12 sm:mb-16 rounded-2xl border border-border bg-card p-6 sm:p-8">
          <h2 className="text-xl sm:text-2xl font-extrabold text-foreground mb-3">
            TL;DR — which to pick
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-primary mb-2">
                Pick TrueCap if
              </p>
              <ul className="space-y-1.5 text-sm leading-relaxed text-foreground">
                <li>You want a fully usable free tier with no per-analysis limits.</li>
                <li>You want the calculator to feel modern — mobile-first, instant, designed in this decade.</li>
                <li>You want address auto-fill (HUD rent, FRED rates, county tax) instead of manual entry.</li>
                <li>You want a deal score with plain-English breakdown.</li>
                <li>You want a portfolio rollup across saved deals.</li>
                <li>You don&apos;t need to be part of yet another real estate community.</li>
                <li>You want to spend $300/yr instead of $390/yr.</li>
              </ul>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                Pick BiggerPockets if
              </p>
              <ul className="space-y-1.5 text-sm leading-relaxed text-foreground">
                <li>You&apos;re already deep in the BiggerPockets ecosystem (forums, podcast, books, courses).</li>
                <li>You want the community + calculator + content all bundled in one membership.</li>
                <li>You want the longest track record / brand recognition in the space.</li>
                <li>You already have a paid Pro subscription you&apos;re using.</li>
                <li>You need the BP forums for partner / lender / contractor connections.</li>
              </ul>
            </div>
          </div>
          <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
            Only need a free calculator? Full list:{" "}
            <Link href="/blog/free-biggerpockets-calculator-alternatives" className="font-bold text-primary hover:underline">
              free BiggerPockets calculator alternatives →
            </Link>
          </p>
        </section>

        {/* Matrix */}
        <section className="mb-12 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground mb-2">
            Feature-by-feature
          </h2>
          <p className="text-base text-muted-foreground mb-6 leading-relaxed">
            Where each tool wins, where it&apos;s a wash.
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
                    BiggerPockets Calculator
                  </th>
                </tr>
              </thead>
              <tbody>
                {MATRIX.map((row) => (
                  <tr key={row.feature} className="border-t border-border align-top">
                    <td className="py-3 px-3 text-sm font-semibold text-foreground">
                      {row.feature}
                    </td>
                    <td className="py-3 px-3 text-xs leading-relaxed text-foreground/85">
                      <div className="flex items-start gap-2">
                        <WinnerBadge winner={row.winner} side="truecap" />
                        <span>{row.truecap}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-xs leading-relaxed text-foreground/85">
                      <div className="flex items-start gap-2">
                        <WinnerBadge winner={row.winner} side="biggerpockets" />
                        <span>{row.bp}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            Pricing and feature availability change. BiggerPockets Calculator
            details based on publicly available product info as of 2026. See{" "}
            <a href="https://www.biggerpockets.com/calculators" target="_blank" rel="noopener" className="underline">
              biggerpockets.com/calculators
            </a>{" "}
            for their current state.
          </p>
        </section>

        {/* When investors switch */}
        <section className="mb-12 sm:mb-16 rounded-2xl border border-[var(--brand-green)]/25 bg-[var(--brand-green-light)] p-6 sm:p-8">
          <h2 className="text-xl sm:text-2xl font-extrabold text-[var(--brand-green)] mb-3">
            When BiggerPockets users actually switch
          </h2>
          <ul className="space-y-2 text-sm sm:text-base leading-relaxed text-foreground">
            <li><strong>&quot;The 5-free-uses-then-paywall thing is annoying.&quot;</strong> TrueCap&apos;s free tier is unlimited. Run as many analyses as you want. Pro unlocks projections, sensitivity, share links, PDFs — but the core underwriting (cap rate, CoC, DSCR, NCF) is always free.</li>
            <li><strong>&quot;The manual entry is slow.&quot;</strong> Paste an address. TrueCap pulls property tax from the county, rent from HUD, mortgage rate from FRED. You start with 60-70% of the underwrite done. BP has you typing everything.</li>
            <li><strong>&quot;I just want a calculator, not another community to manage.&quot;</strong> BP&apos;s value is the ecosystem (forums + podcast + courses). TrueCap is just the tool. Some investors want the bundle; others want focus.</li>
            <li><strong>&quot;I&apos;m paying $390/yr for the BP membership and use 10% of what comes with it.&quot;</strong> If you&apos;re a BP member primarily for the calculator, TrueCap Pro at $25/mo annual ($300/yr) costs less — and it is built around the deal analysis you actually use.</li>
            <li><strong>&quot;The deal score on TrueCap actually helps me decide.&quot;</strong> 0-100 composite with a subscore breakdown — you see WHY a deal scored 67 (e.g., cap rate strong, DSCR weak, rents above market), not just a color.</li>
          </ul>
        </section>

        {/* When NOT to switch */}
        <section className="mb-12 sm:mb-16 rounded-2xl border border-border bg-muted/40 p-6 sm:p-8">
          <h2 className="text-xl sm:text-2xl font-extrabold text-foreground mb-3">
            When BiggerPockets is the right choice
          </h2>
          <p className="text-sm sm:text-base leading-relaxed text-foreground mb-3">
            Be honest: not every investor should switch. Stay with BiggerPockets
            if any of these apply:
          </p>
          <ul className="space-y-2 text-sm sm:text-base leading-relaxed text-foreground">
            <li>You actively use the forums for partner / lender / contractor introductions in your market.</li>
            <li>You&apos;re working through a BP course or bootcamp.</li>
            <li>You need an established brand-name for credibility (if you&apos;re using output in client presentations to investors).</li>
            <li>You already have all your historical deals in BP and don&apos;t want to migrate.</li>
          </ul>
          <p className="mt-4 text-sm leading-relaxed text-foreground">
            If you only need a specific metric — not a full calculator suite
            — TrueCap also ships standalone tools: the{" "}
            <Link href="/tools/cap-rate-calculator" className="font-semibold text-primary hover:underline">
              cap rate calculator
            </Link>
            , the{" "}
            <Link href="/tools/dscr-calculator" className="font-semibold text-primary hover:underline">
              DSCR calculator
            </Link>
            , the{" "}
            <Link href="/tools/brrrr-calculator" className="font-semibold text-primary hover:underline">
              BRRRR calculator
            </Link>
            , and the{" "}
            <Link href="/tools/1-percent-rule-calculator" className="font-semibold text-primary hover:underline">
              1% rule calculator
            </Link>
            . All free, all unlimited.
          </p>
        </section>

        <ComparisonFaq competitorName="BiggerPockets Calculator" items={BP_FAQ} />

        {/* Pricing CTA */}
        <section className="mb-12 sm:mb-16 rounded-2xl bg-primary p-6 sm:p-8 text-primary-foreground">
          <h2 className="text-2xl sm:text-3xl font-extrabold mb-2">
            Try TrueCap free — see if the modern version fits your workflow.
          </h2>
          <p className="text-sm sm:text-base opacity-90 mb-5 max-w-2xl">
            Free includes full cap rate, CoC, DSCR, and monthly cash flow
            analysis with address auto-fill — enough to underwrite. Pro at
            $25/mo annual unlocks share links, PDF exports, 10-year
            projections, tax strategy, sensitivity, MAO, and the
            strategy analyzers. No card to start.
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
          <Link href="/vs/dealcheck" className="font-bold text-foreground hover:underline">
            TrueCap vs DealCheck
          </Link>{" "}
          ·{" "}
          <Link href="/vs/stessa" className="font-bold text-foreground hover:underline">
            TrueCap vs Stessa
          </Link>{" "}
          ·{" "}
          <Link href="/vs/mashvisor" className="font-bold text-foreground hover:underline">
            TrueCap vs Mashvisor
          </Link>
        </footer>
      </main>
      <SiteFooter />
      <ScrollDepthTracker />
    </div>
  );
}

const BP_FAQ: FaqItem[] = [
  {
    question: "Is the BiggerPockets calculator free?",
    answer: (
      <>
        The BiggerPockets rental property calculator gives you a few
        free reports, then gates the full version behind a BiggerPockets
        Pro subscription (~$390/year). TrueCap&apos;s calculator is free
        with no monthly limit — cap rate, cash-on-cash, DSCR, and
        monthly cash flow on every analysis, no signup required.
      </>
    ),
    plainTextAnswer:
      "The BiggerPockets calculator gives a few free reports then gates the rest behind BiggerPockets Pro (~$390/year). TrueCap is free with no monthly limit — cap rate, cash-on-cash, DSCR, and monthly cash flow on every analysis, no signup.",
  },
  {
    question: "What's the best alternative to the BiggerPockets rental calculator?",
    answer: (
      <>
        TrueCap is the modern alternative — it&apos;s designed
        mobile-first, pre-fills HUD rent + FRED mortgage rate + state
        property tax from the property address, and outputs a
        plain-English verdict (Strong / Solid / Mixed / Marginal /
        Negative) on top of the standard metrics. BiggerPockets&apos;
        calculator is the most well-known but the UX hasn&apos;t evolved
        much in years and there&apos;s no portfolio view across saved
        deals.
      </>
    ),
    plainTextAnswer:
      "TrueCap is the modern alternative — mobile-first, pre-fills HUD rent, FRED mortgage rate, and state property tax from the address, and outputs a plain-English verdict (Strong/Solid/Mixed/Marginal/Negative) alongside standard metrics.",
  },
  {
    question: "How much is TrueCap vs BiggerPockets Pro?",
    answer: (
      <>
        TrueCap Pro is $29.99/month (or ~$25/month billed annually).
        BiggerPockets Pro is ~$390/year (~$32.50/month). For the
        calculator alone, TrueCap has a deeper free tier and bundles everything in one Pro tier. BiggerPockets
        Pro of course bundles forums, courses, and other community
        access — if that&apos;s what you&apos;re buying, the calculator
        is a bonus. If you want the calculator itself, TrueCap is the
        cheaper and more capable choice.
      </>
    ),
    plainTextAnswer:
      "TrueCap Pro is $29.99/month or ~$25/month annual. BiggerPockets Pro is ~$390/year (~$32.50/month). For the calculator alone, TrueCap has a deeper free tier and bundles everything in one Pro tier.",
  },
  {
    question: "Does TrueCap have a 10-year projection like BiggerPockets?",
    answer: (
      <>
        Yes — TrueCap Pro&apos;s 10-year projection includes rent
        growth, expense growth, appreciation, and amortization
        compounding into per-year cash flow + equity. The output is
        cached as a snapshot so it&apos;s fast to revisit, and it
        renders cleanly to PDF.
      </>
    ),
    plainTextAnswer:
      "Yes — TrueCap Pro's 10-year projection includes rent growth, expense growth, appreciation, and amortization compounding into per-year cash flow + equity. Snapshot-cached and PDF-exportable.",
  },
  {
    question: "Can I share a TrueCap analysis without making the viewer sign up?",
    answer: (
      <>
        Yes — TrueCap Pro generates a public read-only share link for
        any saved deal. The full analysis is encoded into the URL, no
        login required for the recipient, and it includes your custom
        branding (logo, color, company name) if you&apos;ve configured
        it. BiggerPockets PDF reports are downloadable but the
        free-form share-link workflow is a TrueCap-specific feature.
      </>
    ),
    plainTextAnswer:
      "Yes — TrueCap Pro generates a public read-only share link for any saved deal. No login required for the recipient, branded with your logo/color/company name if configured.",
  },
  {
    question: "When should I stick with BiggerPockets?",
    answer: (
      <>
        Stick with BiggerPockets if you&apos;re already paying for Pro
        for the community access (forums, courses, books, podcasts),
        you trust the brand, and the calculator&apos;s output format is
        the one your private-money lender or partners already accept.
        Switch to TrueCap if you want a calculator-first experience,
        sharper UX, address auto-fill, a verdict engine, a portfolio
        rollup, and a Pro tier that costs about half as much.
      </>
    ),
    plainTextAnswer:
      "Stick with BiggerPockets if you're already paying Pro for community access. Switch to TrueCap if you want a calculator-first experience, sharper UX, address auto-fill, a verdict engine, a portfolio rollup, and a Pro tier that costs about half as much.",
  },
];

function WinnerBadge({
  winner,
  side,
}: {
  winner: Verdict;
  side: "truecap" | "biggerpockets";
}) {
  if (winner === "tie") {
    return <Minus className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/60" />;
  }
  if (winner === side) {
    return <Check className="mt-0.5 size-3.5 shrink-0 text-[var(--brand-green)]" />;
  }
  return <X className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/50" />;
}
