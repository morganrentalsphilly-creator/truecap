/**
 * /vs/dealcheck — competitor comparison landing page.
 *
 * Target query: "DealCheck alternative", "DealCheck vs ...", "free
 * DealCheck", "DealCheck pricing". Extreme commercial-intent organic
 * search — the visitor has already evaluated one tool and is
 * comparison-shopping. Honest matrix wins more than puffery.
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
  title: "DealCheck Alternative for Rental Analysis (2026)",
  description:
    "A fair TrueCap vs DealCheck workflow comparison: first screen, assumptions, purchase criteria, offer calculation, downside, and mobile access.",
  keywords: [
    "dealcheck alternative",
    "dealcheck vs truecap",
    "truecap vs dealcheck",
    "rental analysis tool comparison",
    "best rental property calculator",
  ],
  alternates: { canonical: "/vs/dealcheck" },
  openGraph: {
    title: "DealCheck Alternative for Rental Analysis (2026)",
    description:
      "Address-to-decision workflow vs a mature rental-analysis and native mobile ecosystem.",
    url: "/vs/dealcheck",
    type: "website",
    images: [{ url: "/home.jpg", width: 1200, height: 630, alt: "TrueCap vs DealCheck" }],
  },
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
};

type Row = { workflow: string; truecap: string; dealcheck: string };

const MATRIX: Row[] = [
  { workflow: "First screen", truecap: "Address-first, no-signup screen with an opinionated verdict.", dealcheck: "Account-based analysis with listing and property-data import workflows." },
  { workflow: "Starting assumptions", truecap: "Labels HUD rent, FRED rate, state tax benchmark, smart defaults, and user edits.", dealcheck: "Imports available property data and supports user-entered assumptions." },
  { workflow: "Purchase criteria", truecap: "Buy Box checks the analysis inside the decision flow.", dealcheck: "Custom purchase criteria screen properties against saved thresholds." },
  { workflow: "Offer price", truecap: "Max Offer is connected to Buy Box targets and Deal Doctor thresholds.", dealcheck: "Its Offer Calculator calculates offers from configurable buying criteria." },
  { workflow: "Downside", truecap: "Sensitivity and downside scenarios sit directly after the verdict and Max Offer.", dealcheck: "Long-range analysis and editable assumptions support scenario evaluation." },
  { workflow: "Mobile", truecap: "Responsive web app that can be installed as a PWA.", dealcheck: "Native iOS and Android apps plus web access." },
  { workflow: "Best fit", truecap: "Investors who want a guided address-to-decision sequence.", dealcheck: "Investors who want a mature analysis ecosystem and native mobile workflow." },
];

export default function VsDealCheckPage() {
  const siteUrl = getSiteUrl();
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "DealCheck Alternative for Rental Analysis (2026)",
    url: `${siteUrl}/vs/dealcheck`,
    description:
      "Side-by-side comparison of TrueCap and DealCheck for rental property underwriting.",
    dateModified: "2026-08-15",
    publisher: { "@id": `${siteUrl}/#organization` },
  };

  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <VsBreadcrumbSchema vsPath="/vs/dealcheck" pageName="TrueCap vs DealCheck" />
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
            TrueCap vs DealCheck:{" "}
            <span className="text-primary">which rental analyzer fits you?</span>
          </h1>
          <p className="mt-4 max-w-2xl text-base sm:text-lg leading-relaxed text-muted-foreground">
            DealCheck has served investors for years. TrueCap uses a different
            sequence: start with an address, inspect the assumptions, see a
            verdict, then connect Buy Box, Max Offer, downside, and presentation.
            Here is the comparison so you can pick the workflow that fits.
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
            TL;DR
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-primary mb-2">
                Pick TrueCap if
              </p>
              <ul className="space-y-1.5 text-sm leading-relaxed text-foreground">
                <li>You want a fast address-to-decision sequence.</li>
                <li>You want labeled HUD, FRED, and state-tax starting assumptions.</li>
                <li>You want an opinionated verdict with the supporting math visible.</li>
                <li>You want Buy Box evaluation inside the analysis flow.</li>
                <li>You want Max Offer, downside, and decision packaging connected.</li>
              </ul>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                Pick DealCheck if
              </p>
              <ul className="space-y-1.5 text-sm leading-relaxed text-foreground">
                <li>You want native iOS + Android apps (TrueCap is PWA-only today).</li>
                <li>You&apos;re heavily invested in listing-import workflows.</li>
                <li>You already have a paid DealCheck plan and the muscle memory.</li>
                <li>You want a tool with a longer track record in the BRRRR community.</li>
              </ul>
            </div>
          </div>
          <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
            Weighing more than these two? Full list:{" "}
            <Link href="/blog/best-dealcheck-alternatives" className="font-bold text-primary hover:underline">
              7 best DealCheck alternatives →
            </Link>
          </p>
        </section>

        {/* Matrix */}
        <section className="mb-12 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground mb-2">
            Workflow-by-workflow
          </h2>
          <p className="text-base text-muted-foreground mb-6 leading-relaxed">
            Both products analyze rentals. The difference is how each gets you from inputs to action.
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
                    DealCheck
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
                      {row.dealcheck}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            Pricing, plan limits, and exact feature availability change.
            DealCheck details were reviewed against its official{" "}
            <a href="https://dealcheck.io/pricing/" target="_blank" rel="noopener noreferrer" className="underline">pricing</a>,{" "}
            <a href="https://help.dealcheck.io/en/articles/2047630-using-the-offer-calculator-to-calculate-offers-to-sellers" target="_blank" rel="noopener noreferrer" className="underline">Offer Calculator</a>, and{" "}
            <a href="https://help.dealcheck.io/en/articles/2259844-screening-properties-with-custom-investment-criteria" target="_blank" rel="noopener noreferrer" className="underline">custom criteria</a>{" "}
            documentation on August 15, 2026. Features and prices can change.
          </p>
        </section>

        {/* Workflow fit */}
        <section className="mb-12 sm:mb-16 rounded-2xl border border-[var(--brand-green)]/25 bg-[var(--brand-green-light)] p-6 sm:p-8">
          <h2 className="text-xl sm:text-2xl font-extrabold text-[var(--brand-green)] mb-3">
            Choose TrueCap when the decision sequence matters most
          </h2>
          <ul className="space-y-2 text-sm sm:text-base leading-relaxed text-foreground">
            <li><strong>Start with less setup.</strong> Enter an address for a first-pass screen, then refine the assumptions that matter.</li>
            <li><strong>See where the inputs came from.</strong> TrueCap labels sourced starting points and keeps them editable.</li>
            <li><strong>Move from result to action.</strong> The verdict leads to Max Offer, downside, and next-step tools instead of stopping at a metric summary.</li>
            <li><strong>Reuse your own criteria.</strong> Buy Box targets stay connected to the verdict and offer calculation.</li>
          </ul>
          <p className="mt-4 text-sm leading-relaxed text-foreground">
            Prefer to kick the tires on a single metric first? Try the
            standalone{" "}
            <Link href="/tools/cap-rate-calculator" className="font-semibold text-primary hover:underline">
              cap rate calculator
            </Link>
            ,{" "}
            <Link href="/tools/dscr-calculator" className="font-semibold text-primary hover:underline">
              DSCR calculator
            </Link>
            , or{" "}
            <Link href="/tools/brrrr-calculator" className="font-semibold text-primary hover:underline">
              BRRRR calculator
            </Link>{" "}
            — same engine as the full analyzer, narrower scope. For the
            workflow itself, our guide on{" "}
            <Link href="/blog/how-to-underwrite-a-rental-property-in-60-seconds" className="font-semibold text-primary hover:underline">
              60-second underwriting
            </Link>{" "}
            shows exactly how a TrueCap user moves from listing to verdict.
          </p>
        </section>

        <ComparisonFaq competitorName="DealCheck" items={DEALCHECK_FAQ} reviewedDate="August 15, 2026" />

        {/* Pricing CTA */}
        <section className="mb-12 sm:mb-16 rounded-2xl bg-primary p-6 sm:p-8 text-primary-foreground">
          <h2 className="text-2xl sm:text-3xl font-extrabold mb-2">
            Try TrueCap free — see if it fits your workflow.
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

const DEALCHECK_FAQ: FaqItem[] = [
  {
    question: "Is TrueCap a free alternative to DealCheck?",
    answer: (
      <>
        TrueCap offers a no-signup first-pass screen with cap rate,
        cash-on-cash return, DSCR, monthly cash flow, and a verdict. DealCheck
        also publishes a free plan; check its official{" "}
        <a href="https://dealcheck.io/pricing/" target="_blank" rel="noopener noreferrer" className="underline">pricing page</a>{" "}
        for current limits. The better fit depends on whether you prefer
        TrueCap&apos;s address-to-decision sequence or DealCheck&apos;s established
        analysis and import workflow.
      </>
    ),
    plainTextAnswer:
      "TrueCap offers a no-signup first-pass screen. DealCheck also publishes a free plan; verify its current limits on the official pricing page and choose the workflow that fits.",
  },
  {
    question: "How much does TrueCap cost compared to DealCheck?",
    answer: (
      <>
        See TrueCap&apos;s <Link href="/pricing" className="underline">live pricing page</Link>{" "}
        and DealCheck&apos;s official{" "}
        <a href="https://dealcheck.io/pricing/" target="_blank" rel="noopener noreferrer" className="underline">pricing page</a>.
        Comparing the current pages is safer than relying on copied prices
        because either company can change plans.
      </>
    ),
    plainTextAnswer:
      "See TrueCap's live pricing page and DealCheck's official pricing page for current prices and plan limits.",
  },
  {
    question: "Which tool is better for new investors?",
    answer: (
      <>
        TrueCap can fit a newer investor who values an address-first screen,
        labeled starting assumptions, and a plain-English verdict. DealCheck
        can fit someone who wants its established property-import and native
        mobile workflow. Neither tool replaces verification or due diligence.
      </>
    ),
    plainTextAnswer:
      "TrueCap can fit newer investors who value an address-first screen, transparent starting assumptions, and a plain-English verdict; DealCheck can fit users who prefer its established guided tools and ecosystem.",
  },
  {
    question: "Does TrueCap have a mobile app like DealCheck?",
    answer: (
      <>
        TrueCap is a Progressive Web App (PWA) — you install it from the
        browser to your home screen. DealCheck has
        true native iOS and Android apps, which is the right call if
        you&apos;re heavy on mobile-first workflows like walking
        properties and analyzing on the spot. Both work on phones; the
        difference is delivery mechanism.
      </>
    ),
    plainTextAnswer:
      "TrueCap is a PWA — install from the browser to your home screen, works like a native app without the App Store. DealCheck has true native iOS and Android apps. Both work on phones; the difference is delivery mechanism.",
  },
  {
    question: "Can I import properties from Zillow or Redfin with TrueCap?",
    answer: (
      <>
        Partly. You can paste a Zillow, Redfin, Realtor.com, Homes.com or
        Trulia link and TrueCap pulls the <strong>address</strong> out of
        it, then pre-fills your form from authoritative sources (HUD Fair
        Market Rent, FRED 30-year mortgage rate, state-level property tax
        rates). What it does <em>not</em> do is scrape the listing page
        for price, taxes and photos — DealCheck&apos;s full
        property-detail import is deeper there. The trade-off is
        deliberate: TrueCap labels the source beside each starting value
        so you can review and replace it.
      </>
    ),
    plainTextAnswer:
      "Partly. Paste a Zillow/Redfin/Realtor link and TrueCap extracts the address, then pre-fills HUD Fair Market Rent, the FRED 30-year mortgage rate, and a state property-tax benchmark. It does not scrape listing price, taxes, or photos.",
  },
  {
    question: "When should I pick DealCheck over TrueCap?",
    answer: (
      <>
        Pick DealCheck if you&apos;re primarily mobile-first walking
        many properties a day, you want a native app, and listing-site
        property import is your top workflow. Pick TrueCap if you want an
        address-first screen connected to a verdict, Buy Box, Max Offer,
        downside analysis, and presentation tools.
      </>
    ),
    plainTextAnswer:
      "Pick DealCheck if you want a native mobile app and listing-import workflow. Pick TrueCap if you want an address-first screen connected to verdicts, Buy Box, Max Offer, downside, and presentation.",
  },
];
