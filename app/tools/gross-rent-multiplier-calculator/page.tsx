/**
 * Public SEO landing page for the GRM (Gross Rent Multiplier)
 * calculator. GRM is the fastest screening metric in commercial /
 * residential real estate — single ratio, no opex needed.
 *
 * Ranks for: "grm calculator", "gross rent multiplier", "gross rent
 * multiplier calculator", "what is a good grm", "grm vs cap rate".
 */

import type { Metadata } from "next";
import Link from "next/link";
import { getSiteUrl } from "@/lib/site-url";
import { GrmCalculatorWidget } from "@/components/tools/grm-calculator-widget";
import { ToolsConversionCta } from "@/components/marketing/tools-conversion-cta";
import { ToolEmbedInvite } from "@/components/marketing/tool-embed-invite";
import { SiteFooter } from "@/components/marketing/site-footer";
import { ToolBreadcrumbSchema } from "@/components/marketing/tool-breadcrumb-schema";

export const metadata: Metadata = {
  title: "Free GRM Calculator — Gross Rent Multiplier Screen",
  description:
    "Free Gross Rent Multiplier (GRM) calculator. The fastest real-estate screen — compare deals in seconds, no operating expenses needed. Plus a good GRM range.",
  keywords: [
    "grm calculator",
    "gross rent multiplier",
    "gross rent multiplier calculator",
    "what is a good grm",
    "grm formula",
    "grm vs cap rate",
    "rental property screening",
  ],
  alternates: { canonical: "/tools/gross-rent-multiplier-calculator" },
  openGraph: {
    title: "Free GRM Calculator — Gross Rent Multiplier Screen",
    description:
      "Compare rental deals in seconds with Gross Rent Multiplier — the fastest screening ratio in real estate.",
    url: "/tools/gross-rent-multiplier-calculator",
    type: "website",
    images: [{ url: "/home.jpg", width: 1200, height: 630, alt: "TrueCap GRM calculator" }],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/home.jpg"],
  },
};

const FAQS: { q: string; a: string }[] = [
  {
    q: "What is GRM (Gross Rent Multiplier)?",
    a: "GRM is the simplest valuation ratio in real estate: Property Price ÷ Annual Gross Rent. It tells you how many years of gross rent it would take to pay for the property at the asking price. Lower GRM means the property is cheaper relative to its rental income. It's a fast back-of-the-envelope screen — it skips operating expenses on purpose so you can compare 20 listings in 5 minutes.",
  },
  {
    q: "What's a good GRM?",
    a: "There's no universal answer — it's market-dependent. As a rough guide: under 6 is very strong (deeply discounted or distressed). 6-10 is healthy and typical of cash-flow markets like the Midwest, Sun Belt, and older multifamily. 10-14 is balanced. 14-20 means you're in an appreciation market where the return assumption is price growth, not cash flow (coastal cities, Tier-1 metros). Above 20 is luxury / ultra-coastal territory where yield is minimal.",
  },
  {
    q: "What's the difference between GRM and cap rate?",
    a: "Cap rate uses NOI (rent minus operating expenses), GRM uses gross rent only. Cap rate is more accurate because it accounts for property tax, insurance, maintenance, and management. GRM is faster because you don't need an opex breakdown — useful when screening MLS listings where opex isn't disclosed. The two correlate: a 50% expense ratio means a 10 GRM ≈ a 5% cap rate. Use GRM to shortlist, cap rate to underwrite.",
  },
  {
    q: "Why use GRM if cap rate is more accurate?",
    a: "Because expenses are missing from most listings. When you're scrolling through 200 properties on Zillow or LoopNet, you have price and asking rent — that's it. GRM lets you sort and screen instantly. The bottom 20% by GRM are worth pulling expense data for; the rest you discard. It's a triage tool, not a decision tool. Always confirm with a full underwrite (cap rate, cash-on-cash, DSCR) before making an offer.",
  },
  {
    q: "Does GRM use gross or net rent?",
    a: "Gross rent — that's literally the 'G' in GRM. Don't subtract vacancy, opex, or anything else. If you want to account for vacancy, use Effective Gross Rent Multiplier (EGRM), which uses rent × (1 − vacancy). But standard GRM is gross-gross, which is why it's so quick to compute.",
  },
  {
    q: "Can I use GRM for commercial properties?",
    a: "Yes, GRM works for any income-producing real estate. Commercial brokers often use it for multifamily, mixed-use, and retail. For single-tenant net-lease deals (NNN) where the tenant pays all expenses, GRM ≈ cap rate inverse, so it becomes more meaningful. For complex commercial deals with percentage rent, CAM reimbursements, or stepped escalations, switch to cap rate or DCF — GRM is too simple to capture the nuance.",
  },
];

export default function GrmCalculatorPage() {
  const siteUrl = getSiteUrl();
  const webAppLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "TrueCap GRM Calculator",
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web",
    dateModified: "2026-06-01",
    url: `${siteUrl}/tools/gross-rent-multiplier-calculator`,
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
    name: "Gross Rent Multiplier Calculator",
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "Real Estate Calculator",
    operatingSystem: "Web",
    description:
      "Free Gross Rent Multiplier (GRM) calculator. The fastest real-estate screen — compare deals in seconds, no operating expenses needed. Plus a good GRM range.",
    url: `${siteUrl}/tools/gross-rent-multiplier-calculator`,
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
      "GRM from price ÷ annual gross rent",
      "Compare to market averages",
      "Fast deal screening without operating expenses",
    ],
  };

  return (
    <>
      <ToolBreadcrumbSchema toolPath="/tools/gross-rent-multiplier-calculator" toolName="GRM calculator" />
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
              GRM Calculator
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground mt-2 leading-relaxed">
              Gross Rent Multiplier — the 10-second screening ratio every
              real estate investor uses to triage deals before bothering
              with operating expenses.
            </p>
          </header>

          <GrmCalculatorWidget />

          <article className="prose prose-slate max-w-none mt-10 sm:mt-12 [&_p]:leading-relaxed [&_p]:text-foreground [&_h2]:font-extrabold [&_h2]:text-foreground [&_h2]:mt-10 [&_h2]:mb-3 [&_h3]:font-bold [&_h3]:text-foreground [&_h3]:mt-6 [&_h3]:mb-2 [&_li]:text-foreground">
            <h2 className="text-2xl sm:text-3xl">Why every investor knows GRM</h2>
            <p>
              You&apos;re scrolling Zillow at 11 PM. You see 40 listings in
              your target zip code. You don&apos;t have property tax,
              insurance, or maintenance numbers for any of them. What you
              do have is price and asking rent. GRM is the ratio that lets
              you sort that list of 40 into the 8 worth actually
              underwriting, in about 90 seconds. That&apos;s why it&apos;s
              the first metric every experienced investor reaches for — read{" "}
              <Link href="/blog/gross-rent-multiplier-explained" className="font-semibold text-primary hover:underline">gross rent multiplier explained</Link>{" "}
              for the full primer, and pair it with the{" "}
              <Link href="/tools/1-percent-rule-calculator" className="font-semibold text-primary hover:underline">1% rule calculator</Link>{" "}
              as a second fast screen.
            </p>

            <h3>The formula</h3>
            <div className="bg-card border border-border rounded-xl p-5 sm:p-6 my-4 text-center">
              <div className="text-base sm:text-lg font-mono">
                <span className="font-bold">GRM</span> = Property Price ÷ Annual Gross Rent
              </div>
              <div className="text-sm text-muted-foreground mt-2">
                where Annual Gross Rent = Monthly Rent × 12
              </div>
            </div>
            <p>
              Example: a $295,000 duplex renting for $2,950/month gross
              has a GRM of 295,000 ÷ (2,950 × 12) = 295,000 ÷ 35,400 ≈
              <strong> 8.3</strong>. That&apos;s a healthy GRM — typical
              cash-flow market territory.
            </p>

            <h2 className="text-2xl sm:text-3xl">GRM benchmarks by market</h2>
            <ul>
              <li>
                <strong>Under 6</strong> — Very strong / distressed.
                Verify everything (deferred maintenance, vacancy, title
                issues, neighborhood trajectory).
              </li>
              <li>
                <strong>6–10</strong> — Healthy cash-flow markets.
                Midwest, Sun Belt secondary markets, older multifamily.
              </li>
              <li>
                <strong>10–14</strong> — Balanced. Mix of cash flow and
                appreciation. Most U.S. markets land here.
              </li>
              <li>
                <strong>14–20</strong> — Appreciation market. Returns
                come from price growth, not cash flow. Coastal and Tier-1
                metros.
              </li>
              <li>
                <strong>20+</strong> — Expensive / luxury. Minimal yield;
                the bet is almost entirely on appreciation and tax
                benefits.
              </li>
            </ul>

            <h2 className="text-2xl sm:text-3xl">GRM vs Cap Rate</h2>
            <p>
              Both metrics measure the same thing — how much income a
              property produces relative to its price — but they target
              different stages of the workflow. GRM uses gross rent and
              is purely a screening tool. Cap rate uses NOI (gross rent
              minus opex) and is closer to what an institutional buyer
              actually pays for. The two are mathematically linked:
            </p>
            <div className="bg-card border border-border rounded-xl p-5 sm:p-6 my-4 text-center">
              <div className="text-sm sm:text-base font-mono">
                Cap rate ≈ (1 − Opex ratio) ÷ GRM
              </div>
              <div className="text-xs text-muted-foreground mt-2">
                e.g. GRM 10 with 40% opex ratio ≈ 6% cap rate
              </div>
            </div>
            <p>
              Use GRM when you&apos;re shopping. Use cap rate when
              you&apos;re writing the offer. Use both together as a
              sanity check — a property with a great GRM but a terrible
              cap rate is hiding expensive operating problems
              (institutional water, unusually high tax, deferred capex).
            </p>

            <h2 className="text-2xl sm:text-3xl">Limitations of GRM</h2>
            <h3>1. It ignores operating expenses</h3>
            <p>
              Two properties with identical GRM can have wildly different
              real returns if one has $400/month in HOA fees and the
              other doesn&apos;t. GRM treats every property as if opex
              is identical — it isn&apos;t.
            </p>
            <h3>2. It ignores financing</h3>
            <p>
              GRM is an all-cash metric. It doesn&apos;t care about
              interest rates, down payment, or loan terms. Two investors
              looking at the same GRM-8 property will get totally
              different cash-on-cash returns depending on their leverage.
            </p>
            <h3>3. It ignores vacancy</h3>
            <p>
              GRM uses asking rent, not effective rent. A property with a
              great GRM in a transient neighborhood with 25% vacancy is
              not the deal it looks like. Always sanity-check market
              vacancy before trusting GRM.
            </p>
            <h3>4. It ignores condition</h3>
            <p>
              A turnkey property and a rehab project with the same price
              and same projected rent have the same GRM — but the rehab
              needs $40k of work before you collect a dollar. Pair GRM
              with a condition assessment.
            </p>
          </article>

          {/* Backlink engine — quiet, collapsed, renders nothing if this

              tool has no embeddable widget. See the component header. */}

          <ToolEmbedInvite slug="gross-rent-multiplier-calculator" />


          <ToolsConversionCta
            calculatorName="GRM calculator"
            hook="GRM is a screening tool. Once you find a deal worth a real underwrite, TrueCap's full analyzer gives you cap rate, cash-on-cash, DSCR, 10-year projection, tax savings, exit scenarios — all the metrics GRM can't tell you. Free to start."
          />

          <footer className="mt-12 pt-8 border-t border-border text-center text-xs text-muted-foreground">
            Built with{" "}
            <Link href="/" className="font-bold text-foreground hover:underline">
              TrueCap
            </Link>{" "}
            — transparent, editable rental analysis, free to start.
          </footer>
        </main>
        <SiteFooter />
      </div>
    </>
  );
}
