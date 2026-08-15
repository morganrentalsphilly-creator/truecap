/**
 * /vs/biggerpockets-calculator — competitor comparison landing page.
 *
 * Target queries: "BiggerPockets calculator alternative", "BiggerPockets
 * vs ...", "free BiggerPockets calculator", "BiggerPockets calculator
 * pro", "BP rental calculator". MASSIVE commercial-intent search volume —
 * BiggerPockets is the brand-name destination for real estate calculators.
 */

import { TRIAL_LABEL } from "@/lib/trial";
import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Calculator,
  Sparkles,
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
    "A fair TrueCap vs BiggerPockets calculator workflow comparison: address-first screening, detailed analysis, decision packaging, and ecosystem tradeoffs.",
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
      "Address-first decision workflow vs a detailed calculator inside a broader investor ecosystem.",
    url: "/vs/biggerpockets-calculator",
    type: "website",
    images: [{ url: "/home.jpg", width: 1200, height: 630, alt: "TrueCap vs BiggerPockets Calculator" }],
  },
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
};

type Row = { workflow: string; truecap: string; bp: string };

const MATRIX: Row[] = [
  { workflow: "First screen", truecap: "Address-first screen with editable starting assumptions and a verdict.", bp: "Detailed rental-property input workflow with report-style results." },
  { workflow: "Decision sequence", truecap: "Connects verdict, Buy Box, Max Offer, downside, and presentation.", bp: "Centers on a detailed calculator and the investor's interpretation of its report." },
  { workflow: "Scenario depth", truecap: "Includes long-term projection, exit, tax, and downside modules in paid decisions.", bp: "Its rental calculator captures purchase, loan, income, expense, and projection inputs." },
  { workflow: "Offer price", truecap: "Max Offer works backward from the selected target and shows threshold alternatives.", bp: "The calculator supports an offer-price input inside a broader rental analysis." },
  { workflow: "Ecosystem", truecap: "Focused product, methodology, blog, and glossary.", bp: "Calculator inside a large community, education, media, and marketplace ecosystem." },
  { workflow: "Best fit", truecap: "Investors who want a guided address-to-decision sequence.", bp: "Investors who value a detailed calculator inside the BiggerPockets ecosystem." },
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
    dateModified: "2026-08-15",
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
            wanted an address-first workflow that connects the initial screen to
            a verdict, Max Offer, downside, and presentation. BiggerPockets may
            be the better choice when its community and education ecosystem are
            part of what you value. Here is the workflow comparison.
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
                <li>You want an address-first screen with labeled starting assumptions.</li>
                <li>You want a deal score with plain-English breakdown.</li>
                <li>You want a portfolio rollup across saved deals.</li>
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
            Workflow-by-workflow
          </h2>
          <p className="text-base text-muted-foreground mb-6 leading-relaxed">
            Both tools analyze rentals. The difference is how the analysis becomes a decision.
          </p>
          <div className="overflow-x-auto rounded-2xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr className="text-left">
                  <th className="py-3 px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Workflow
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
                  <tr key={row.workflow} className="border-t border-border align-top">
                    <td className="py-3 px-3 text-sm font-semibold text-foreground">
                      {row.workflow}
                    </td>
                    <td className="py-3 px-3 text-xs leading-relaxed text-foreground/85">
                      {row.truecap}
                    </td>
                    <td className="py-3 px-3 text-xs leading-relaxed text-foreground/85">
                      {row.bp}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            Pricing and feature availability change. BiggerPockets Calculator
            details were reviewed against its official product pages on August
            15, 2026. See{" "}
            <a href="https://www.biggerpockets.com/rental-property-calculator" target="_blank" rel="noopener noreferrer" className="underline">
              BiggerPockets Rental Property Calculator
            </a>{" "}
            for its current state.
          </p>
        </section>

        {/* Workflow fit */}
        <section className="mb-12 sm:mb-16 rounded-2xl border border-[var(--brand-green)]/25 bg-[var(--brand-green-light)] p-6 sm:p-8">
          <h2 className="text-xl sm:text-2xl font-extrabold text-[var(--brand-green)] mb-3">
            Choose TrueCap when you want a focused decision workflow
          </h2>
          <ul className="space-y-2 text-sm sm:text-base leading-relaxed text-foreground">
            <li><strong>Screen before creating an account.</strong> TrueCap&apos;s core analyzer is available before signup.</li>
            <li><strong>Start from labeled assumptions.</strong> TrueCap can pre-fill HUD rent, the FRED mortgage rate, and a state property-tax benchmark, then lets you replace each value.</li>
            <li><strong>Keep the product focused.</strong> TrueCap centers on screening, offer price, downside, and presenting the decision; BiggerPockets pairs its calculator with a much broader investor ecosystem.</li>
            <li><strong>Connect the outputs.</strong> TrueCap&apos;s verdict leads into Buy Box, Max Offer, downside, and reporting instead of treating each as a separate destination.</li>
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

        <ComparisonFaq competitorName="BiggerPockets Calculator" items={BP_FAQ} reviewedDate="August 15, 2026" />

        {/* Pricing CTA */}
        <section className="mb-12 sm:mb-16 rounded-2xl bg-primary p-6 sm:p-8 text-primary-foreground">
          <h2 className="text-2xl sm:text-3xl font-extrabold mb-2">
            Try TrueCap free — see if the address-to-decision workflow fits.
          </h2>
          <p className="text-sm sm:text-base opacity-90 mb-5 max-w-2xl">
            Screen a property without a card, inspect the assumptions and verdict,
            then decide whether TrueCap&apos;s connected Buy Box, Max Offer, downside,
            and reporting workflow fits how you acquire rentals.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 bg-primary-foreground text-primary px-4 py-2.5 rounded-xl font-bold hover:opacity-90 transition-opacity"
            >
              Start a {TRIAL_LABEL}
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
        BiggerPockets can change calculator access and membership terms, so
        check its official <a href="https://www.biggerpockets.com/rental-property-calculator" target="_blank" rel="noopener noreferrer" className="underline">calculator page</a> for the current offer.
        TrueCap&apos;s core screen is available without signup or a monthly analysis limit.
      </>
    ),
    plainTextAnswer:
      "Check BiggerPockets' official calculator page for current access and membership terms. TrueCap's core screen is available without signup or a monthly analysis limit.",
  },
  {
    question: "What's the best alternative to the BiggerPockets rental calculator?",
    answer: (
      <>
        TrueCap is an address-first alternative: it pre-fills HUD rent + FRED mortgage rate + state
        property tax from the property address, and outputs a
        plain-English verdict (Strong / Solid / Mixed / Marginal /
        Negative) on top of the standard metrics. BiggerPockets&apos;
        calculator is a detailed analysis workflow inside a much larger
        community and education ecosystem.
      </>
    ),
    plainTextAnswer:
      "TrueCap is an address-first alternative that labels HUD rent, the FRED mortgage rate, and a state property-tax benchmark, then adds a plain-English verdict alongside standard metrics.",
  },
  {
    question: "How much is TrueCap vs BiggerPockets Pro?",
    answer: (
      <>
        See TrueCap&apos;s <Link href="/pricing" className="underline">live pricing page</Link>{" "}
        and BiggerPockets&apos; official membership and calculator pages for
        current prices. BiggerPockets bundles a broader community and education
        ecosystem, so price alone is not an apples-to-apples comparison.
      </>
    ),
    plainTextAnswer:
      "See TrueCap's live pricing page and BiggerPockets' official membership and calculator pages for current prices and access.",
  },
  {
    question: "Does TrueCap have a 10-year projection like BiggerPockets?",
    answer: (
      <>
        Yes. TrueCap Pro&apos;s 10-year projection models user-editable rent
        growth, expense growth, appreciation, and amortization into annual
        cash flow and equity scenarios. These are estimates, not forecasts or
        guarantees, and they can be included in a report.
      </>
    ),
    plainTextAnswer:
      "Yes. TrueCap Pro models editable rent growth, expense growth, appreciation, and amortization into annual cash-flow and equity scenarios that can be included in a report.",
  },
  {
    question: "Can I share a TrueCap analysis without making the viewer sign up?",
    answer: (
      <>
        Yes — and you don&apos;t need Pro for it. TrueCap generates a
        public read-only share link for a deal on the free tier, with no
        login required for the recipient. Pro adds custom co-branding such as
        logo, color, and company name.
      </>
    ),
    plainTextAnswer:
      "Yes — read-only share links are free for everyone (no Pro needed): a public link for any deal, no login required for the recipient. Pro adds co-branding with your logo/color/company name.",
  },
  {
    question: "When should I stick with BiggerPockets?",
    answer: (
      <>
        Stick with BiggerPockets if its community, education, and existing
        calculator workflow are central to how you invest. Choose TrueCap if
        you want a focused address-to-decision experience with labeled
        starting assumptions, a verdict, Max Offer, downside, and presentation
        in one sequence.
      </>
    ),
    plainTextAnswer:
      "Stick with BiggerPockets if its community and education ecosystem are central to your workflow. Choose TrueCap for a focused address-to-decision sequence with labeled assumptions, verdict, Max Offer, downside, and presentation.",
  },
];
