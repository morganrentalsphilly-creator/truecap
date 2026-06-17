/**
 * Public SEO landing page for the DSCR (Debt Service Coverage Ratio)
 * calculator. Follows the same recipe as the other /tools/* pages:
 * working calculator above the fold, long-form content + FAQ below for
 * SEO depth, ToolsConversionCta + SiteFooter at the bottom.
 *
 * Ranks for: "dscr calculator", "debt service coverage ratio calculator",
 * "rental dscr", "dscr loan calculator", "how to calculate dscr".
 */

import type { Metadata } from "next";
import Link from "next/link";
import { getSiteUrl } from "@/lib/site-url";
import { DscrCalculatorWidget } from "@/components/tools/dscr-calculator-widget";
import { ToolsConversionCta } from "@/components/marketing/tools-conversion-cta";
import { SiteFooter } from "@/components/marketing/site-footer";
import { ToolBreadcrumbSchema } from "@/components/marketing/tool-breadcrumb-schema";

export const metadata: Metadata = {
  title: "DSCR Calculator — Debt Service Coverage Ratio",
  description:
    "Free DSCR calculator for rental property and DSCR loans. Compute Debt Service Coverage Ratio in seconds, plus a good-DSCR benchmark for lenders.",
  keywords: [
    "dscr calculator",
    "debt service coverage ratio calculator",
    "rental dscr calculator",
    "dscr loan calculator",
    "how to calculate dscr",
    "what is a good dscr",
    "dscr formula",
  ],
  alternates: { canonical: "/tools/dscr-calculator" },
  openGraph: {
    title: "DSCR Calculator — Free",
    description:
      "Compute DSCR in seconds. Plus what counts as bankable, what lenders require, and how DSCR loans work.",
    url: "/tools/dscr-calculator",
    type: "website",
    images: [{ url: "/home.jpg", width: 1200, height: 630, alt: "TrueCap DSCR calculator" }],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/home.jpg"],
  },
};

const FAQS: { q: string; a: string }[] = [
  {
    q: "What is DSCR?",
    a: "Debt Service Coverage Ratio measures how well a property's income covers its mortgage payment. DSCR = Net Operating Income ÷ Annual Debt Service. A DSCR of 1.0 means the property's NOI exactly covers debt; 1.25 means there's 25% cushion above debt service.",
  },
  {
    q: "What's a good DSCR?",
    a: "Most conventional and DSCR-loan lenders want at least 1.25. Below 1.0 the property loses money each month (you're subsidizing it). Between 1.0 and 1.25 is acceptable for some products but tight. Above 1.5 is comfortable; above 2.0 is very strong but rare in markets with normal cap rates.",
  },
  {
    q: "How is DSCR different from cash-on-cash return?",
    a: "DSCR measures whether the property can cover its mortgage. Cash-on-cash measures the return you personally get on your invested capital. A property can have a great DSCR (income comfortably covers debt) but bad CoC (because you put in too much cash), or vice versa.",
  },
  {
    q: "What's a DSCR loan?",
    a: "A DSCR loan is an investment property loan that qualifies you based on the property's DSCR, not your personal income or W-2. You don't need to provide tax returns or employment verification. Rates are typically 0.5-1.5% higher than conventional, with LTV caps of 75-80% and a DSCR requirement of 1.0-1.25 minimum (sometimes lower for higher-rate / lower-LTV terms).",
  },
  {
    q: "What's NOT included in NOI?",
    a: "Mortgage principal and interest are NOT operating expenses — they go below the NOI line as debt service. Also excluded: depreciation, capital expenditures (treated separately), and your personal income tax. NOI is the property's operating performance as if it were owned free and clear.",
  },
  {
    q: "What's an annualized DSCR vs a monthly DSCR?",
    a: "Same ratio either way — you just need to use matching periods. Monthly NOI ÷ monthly P&I = the same number as annual NOI ÷ annual P&I. Lenders typically state DSCR using annual numbers, but the math works either way.",
  },
];

export default function DscrCalculatorPage() {
  const siteUrl = getSiteUrl();
  const webAppLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "TrueCap DSCR Calculator",
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web",
    dateModified: "2026-06-01",
    url: `${siteUrl}/tools/dscr-calculator`,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  };
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  const softwareAppLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "DSCR Calculator",
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "Real Estate Calculator",
    operatingSystem: "Web",
    description:
      "Free DSCR calculator for rental property and DSCR loans. Compute Debt Service Coverage Ratio in seconds, plus a good-DSCR benchmark for lenders.",
    url: `${siteUrl}/tools/dscr-calculator`,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
    },
    publisher: {
      "@type": "Organization",
      name: "TrueCap",
      url: "https://usetruecap.com",
    },
    featureList: [
      "Compute DSCR from NOI + debt service",
      "1.20/1.25 lender threshold check",
      "Single + multi-family support",
    ],
  };

  return (
    <>
      <ToolBreadcrumbSchema toolPath="/tools/dscr-calculator" toolName="DSCR calculator" />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareAppLd) }} />

      <div className="min-h-screen bg-background">
        <main id="main" className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
          <header className="mb-6 sm:mb-8">
            <Link href="/tools" className="text-xs uppercase tracking-widest text-muted-foreground font-bold hover:text-foreground">
              ← TrueCap free tools
            </Link>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground mt-2 leading-tight">
              DSCR Calculator
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground mt-2 leading-relaxed">
              Debt Service Coverage Ratio — the single metric every lender
              wants to see for an investment loan. Compute it in seconds and
              know whether your deal is bankable before you submit.
            </p>
          </header>

          <DscrCalculatorWidget />

          <article className="prose prose-slate max-w-none mt-10 sm:mt-12 [&_p]:leading-relaxed [&_p]:text-foreground [&_h2]:font-extrabold [&_h2]:text-foreground [&_h2]:mt-10 [&_h2]:mb-3 [&_h3]:font-bold [&_h3]:text-foreground [&_h3]:mt-6 [&_h3]:mb-2 [&_li]:text-foreground">
            <h2 className="text-2xl sm:text-3xl">What DSCR actually measures</h2>
            <p>
              DSCR answers one question lenders care about above all
              others: <em>if the property runs the way you say it will,
              can it cover the mortgage?</em> A DSCR of 1.0 means
              break-even. A DSCR of 1.25 means the property generates
              25% more in{" "}
              <Link href="/glossary/noi" className="text-primary font-semibold hover:underline">NOI</Link>{" "}
              than the mortgage needs — a comfortable cushion that covers
              a bad month, a brief vacancy, or a surprise expense.
            </p>

            <h3>The formula</h3>
            <div className="bg-card border border-border rounded-xl p-5 sm:p-6 my-4 text-center">
              <div className="text-base sm:text-lg font-mono">
                <span className="font-bold">DSCR</span> = Annual NOI ÷ Annual Debt Service
              </div>
              <div className="text-sm text-muted-foreground mt-2">
                e.g. $28,000 NOI ÷ $21,500 P&amp;I = 1.30 DSCR
              </div>
            </div>

            <h2 className="text-2xl sm:text-3xl">What lenders look for</h2>
            <ul>
              <li><strong>Conventional investment loan:</strong> ≥1.25, typically</li>
              <li><strong>DSCR loan (no income docs):</strong> 1.0 to 1.25 minimum, with rate / LTV penalties below 1.25</li>
              <li><strong>Commercial multifamily (5+ unit):</strong> ≥1.20 to ≥1.40 depending on lender</li>
              <li><strong>Hard money / bridge:</strong> DSCR not always required, but lenders glance at it</li>
            </ul>
            <p>
              Most conventional lenders also have a debt-to-income (DTI)
              calculation that mixes the property&apos;s DSCR with your
              personal income. DSCR-only loan products skip the personal
              side — your tax returns, W-2, and DTI don&apos;t matter as
              long as the property covers itself. For a full walkthrough
              of how these loans price, qualify, and close, see our{" "}
              <Link href="/blog/dscr-loans-explained" className="text-primary font-semibold hover:underline">DSCR loans explained</Link>{" "}
              guide.
            </p>

            <h2 className="text-2xl sm:text-3xl">Common mistakes</h2>
            <h3>1. Forgetting to subtract operating expenses from NOI</h3>
            <p>
              NOI = gross rent <em>after</em> property tax, insurance,
              vacancy reserve, maintenance, management, CapEx reserve, HOA,
              utilities — everything except mortgage P&amp;I. New investors
              often calculate &ldquo;NOI&rdquo; as just gross rent, which
              inflates DSCR by 40-60%. The dedicated{" "}
              <Link href="/tools/noi-calculator" className="text-primary font-semibold hover:underline">NOI calculator</Link>{" "}
              walks through every line so the DSCR you get back is the one
              a lender will compute, not an optimistic version of it.
            </p>
            <h3>2. Using nominal rent instead of effective rent</h3>
            <p>
              Subtract vacancy and credit loss before calling it rent.
              Asking $2,950 doesn&apos;t mean you collect $35,400/year —
              you collect $35,400 × (1 − vacancy rate). For a 5% vacancy
              that&apos;s $33,630 effective rent before any operating
              expenses.
            </p>
            <h3>3. Ignoring the seasonality of expenses</h3>
            <p>
              Annual NOI smooths out seasonal swings. A heating-zone
              rental might be cash-flow-negative in January (heat,
              vacancy from December move-outs) and cash-flow-positive in
              August. Lenders look at the annual number. So should you.
            </p>

            <h2 className="text-2xl sm:text-3xl">DSCR and the rest of your underwriting</h2>
            <p>
              DSCR is a debt-coverage measure. It tells you whether the
              bank gets paid. It doesn&apos;t tell you whether the deal
              is good for <em>you</em>. For that you also need{" "}
              <Link href="/tools/cap-rate-calculator" className="text-primary font-semibold hover:underline">cap rate</Link>{" "}
              (the unleveraged return),{" "}
              <Link href="/glossary/cash-on-cash-return" className="text-primary font-semibold hover:underline">cash-on-cash</Link>{" "}
              (the leveraged return on your money), cash flow (the dollars
              per month), and projection (the 10-year picture). TrueCap&apos;s
              full analyzer runs all of those at once on the same deal —
              free to start.
            </p>
          </article>

          <ToolsConversionCta
            calculatorName="DSCR calculator"
            hook="The full TrueCap analyzer connects DSCR to cap rate, CoC, cash flow, 10-year projection, tax savings, and exit scenarios — all on the same deal. Save your work, compare deals, share a link with your lender."
          />

          <footer className="mt-12 pt-8 border-t border-border text-center text-xs text-muted-foreground">
            Built with{" "}
            <Link href="/" className="font-bold text-foreground hover:underline">
              TrueCap
            </Link>{" "}
            — institutional-grade rental analysis, free to start.
          </footer>
        </main>
        <SiteFooter />
      </div>
    </>
  );
}
