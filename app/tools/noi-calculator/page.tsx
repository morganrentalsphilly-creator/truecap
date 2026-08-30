/**
 * Public SEO landing page for the NOI calculator. NOI is the most
 * searched commercial-real-estate metric, and a critical mid-funnel
 * concept ("NOI" → "cap rate" → "DSCR" → "full underwrite").
 *
 * Ranks for: "noi calculator", "net operating income calculator",
 * "rental property noi", "how to calculate noi", "noi vs cash flow".
 */

import type { Metadata } from "next";
import Link from "next/link";
import { permanentRedirect } from "next/navigation";
import { getSiteUrl } from "@/lib/site-url";
import { NoiCalculatorWidget } from "@/components/tools/noi-calculator-widget";
import { ToolsConversionCta } from "@/components/marketing/tools-conversion-cta";
import { ToolEmbedInvite } from "@/components/marketing/tool-embed-invite";
import { SiteFooter } from "@/components/marketing/site-footer";
import { ToolBreadcrumbSchema } from "@/components/marketing/tool-breadcrumb-schema";
import { isCalculatorReleased } from "@/lib/calculator-registry";
import { HISTORICAL_TOOL_REDIRECTS } from "@/lib/historical-tool-redirects";

export const metadata: Metadata = {
  title: "Free NOI Calculator — Net Operating Income + OpEx",
  description:
    "Free NOI (Net Operating Income) calculator. Includes vacancy, common operating expenses, and the operating-expense ratio. Plus a good NOI margin benchmark.",
  keywords: [
    "noi calculator",
    "net operating income calculator",
    "rental property noi",
    "how to calculate noi",
    "noi formula",
    "noi vs cash flow",
    "operating expense ratio",
  ],
  alternates: { canonical: "/tools/noi-calculator" },
  openGraph: {
    title: "Free NOI Calculator — Net Operating Income + OpEx",
    description:
      "Compute Net Operating Income in seconds. Vacancy, every operating expense, plus the operating-expense ratio.",
    url: "/tools/noi-calculator",
    type: "website",
    images: [
      {
        url: "/home.jpg",
        width: 1200,
        height: 630,
        alt: "TrueCap NOI calculator",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/home.jpg"],
  },
};

const FAQS: { q: string; a: string }[] = [
  {
    q: "What is NOI?",
    a: "Net Operating Income is gross rental income minus vacancy and all operating expenses, before debt service and income tax. NOI is the property's operating performance as if you owned it free and clear — it isolates the asset from how you financed it.",
  },
  {
    q: "What's a good NOI margin?",
    a: "Operating-expense ratio (the inverse) is the more standard way to look at it. Residential rentals typically run 35-50% operating-expense ratio, leaving 50-65% as NOI. Older properties, smaller buildings, and self-managed deals trend toward the higher OER (lower NOI). Newer / professionally-managed / multifamily trends toward lower OER (higher NOI).",
  },
  {
    q: "Does NOI include mortgage payments?",
    a: "No. NOI is calculated before mortgage P&I, by design. The whole point is to measure the property's standalone earning power. Mortgage P&I is debt service, which you subtract from NOI to get cash flow.",
  },
  {
    q: "Does NOI include CapEx?",
    a: "Under the lender/appraiser-style convention used by TrueCap, no. CapEx is a below-NOI reserve because replacements are capital items rather than recurring operating expenses. TrueCap still subtracts the reserve from cash flow and cash-on-cash return, so the economic cost is never ignored.",
  },
  {
    q: "What's the difference between NOI and EBITDA?",
    a: "NOI is the real estate version of EBITDA (Earnings Before Interest, Taxes, Depreciation, Amortization). Same concept — the asset's standalone earning power, before financing structure and tax position. You'll sometimes see commercial brokers use 'NOI' and underwriters use 'EBITDA' for the same number on a deal.",
  },
  {
    q: "How is NOI used to value a property?",
    a: "Cap rate equation: Value = NOI ÷ Cap rate. A property with $28,000 NOI in a 7% cap rate market is worth ≈$400,000. This is why NOI matters so much — it directly determines what an institutional buyer will pay. Improving NOI by $1,000/yr in a 7% cap market increases the property's value by roughly $14,000.",
  },
];

export default function NoiCalculatorPage() {
  if (!isCalculatorReleased("noi-calculator")) {
    permanentRedirect(HISTORICAL_TOOL_REDIRECTS["noi-calculator"]);
  }

  const siteUrl = getSiteUrl();
  const webAppLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "TrueCap NOI Calculator",
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web",
    dateModified: "2026-06-01",
    url: `${siteUrl}/tools/noi-calculator`,
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
    name: "NOI Calculator",
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "Real Estate Calculator",
    operatingSystem: "Web",
    description:
      "Free NOI (Net Operating Income) calculator. Includes vacancy, common operating expenses, and the operating-expense ratio. Plus a good NOI margin benchmark.",
    url: `${siteUrl}/tools/noi-calculator`,
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
      "Net Operating Income from gross income - expenses",
      "Standard 4-category expense model",
      "Vacancy + management included",
    ],
  };

  return (
    <>
      <ToolBreadcrumbSchema
        toolPath="/tools/noi-calculator"
        toolName="NOI calculator"
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareAppLd) }}
      />

      <div className="min-h-screen bg-background">
        <main
          id="main"
          className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12"
        >
          <header className="mb-6 sm:mb-8">
            <Link
              href="/tools"
              className="text-xs uppercase tracking-widest text-muted-foreground font-bold hover:text-foreground"
            >
              ← TrueCap free tools
            </Link>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground mt-2 leading-tight">
              NOI Calculator
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground mt-2 leading-relaxed">
              Net Operating Income — the property&apos;s standalone earning
              power before debt and taxes. The number every cap rate and DSCR
              calculation starts from.
            </p>
          </header>

          <NoiCalculatorWidget />

          <article className="prose prose-slate max-w-none mt-10 sm:mt-12 [&_p]:leading-relaxed [&_p]:text-foreground [&_h2]:font-extrabold [&_h2]:text-foreground [&_h2]:mt-10 [&_h2]:mb-3 [&_h3]:font-bold [&_h3]:text-foreground [&_h3]:mt-6 [&_h3]:mb-2 [&_li]:text-foreground">
            <h2 className="text-2xl sm:text-3xl">
              Why NOI is the most important real-estate number
            </h2>
            <p>
              <Link
                href="/blog/how-to-calculate-cap-rate"
                className="text-primary font-semibold hover:underline"
              >
                Cap rate
              </Link>{" "}
              uses NOI.{" "}
              <Link
                href="/blog/how-to-calculate-dscr"
                className="text-primary font-semibold hover:underline"
              >
                DSCR
              </Link>{" "}
              uses NOI. The income approach to valuation uses NOI. Improving
              operations by $1,000/yr in a 7% cap-rate market adds about $14,000
              to the property&apos;s market value. Get NOI right, and every
              other underwriting number falls into place. Get it wrong, and your
              cap rate, DSCR, and valuation are all built on sand.
            </p>

            <h3>The formula</h3>
            <div className="bg-card border border-border rounded-xl p-5 sm:p-6 my-4 text-center">
              <div className="text-base sm:text-lg font-mono">
                <span className="font-bold">NOI</span> = Effective Gross Rent −
                Operating Expenses
              </div>
              <div className="text-sm text-muted-foreground mt-2">
                where Effective Gross Rent = Gross Rent × (1 − Vacancy)
              </div>
            </div>

            <h2 className="text-2xl sm:text-3xl">
              What counts as an operating expense
            </h2>
            <ul>
              <li>Property tax</li>
              <li>Insurance</li>
              <li>Maintenance &amp; repairs (the recurring stuff)</li>
              <li>Property management fees</li>
              <li>HOA dues</li>
              <li>Owner-paid utilities (water, sewer, trash, sometimes gas)</li>
              <li>
                Vacancy &amp; credit loss (subtracted from gross rent, not added
                as opex)
              </li>
              <li>
                CapEx reserves (shown below NOI under the TrueCap standard)
              </li>
              <li>Make-ready / leasing fees (annualized)</li>
            </ul>
            <p>
              What does <em>not</em> belong in operating expenses: mortgage
              P&amp;I, depreciation, owner income tax, your personal time, or
              one-time capital improvements that increase asset value (those go
              on the balance sheet, not the operating P&amp;L). For the full
              plain-English definition (and edge cases like CapEx vs. operating
              repairs), see the{" "}
              <Link
                href="/glossary/noi"
                className="text-primary font-semibold hover:underline"
              >
                NOI glossary entry
              </Link>
              .
            </p>

            <h2 className="text-2xl sm:text-3xl">Operating expense ratio</h2>
            <p>
              The flip side of NOI margin. OER = operating expenses ÷ effective
              gross rent. A 40% OER means 40 cents of every dollar of rent goes
              to running the property; the remaining 60 cents is NOI.
              Residential rentals typically land between 35% (newer,
              professionally managed) and 50% (older, self-managed, deferred
              maintenance).
            </p>

            <h2 className="text-2xl sm:text-3xl">Common NOI mistakes</h2>
            <h3>1. Using gross rent instead of effective rent</h3>
            <p>
              Asking rent is fiction until a tenant pays it. Always subtract
              vacancy + credit loss to get effective gross rent before computing
              NOI. Most investors should use 5-8% vacancy as the floor;
              turnover-heavy markets need more.
            </p>
            <h3>2. Forgetting CapEx reserves</h3>
            <p>
              The roof, HVAC, water heater, and flooring all wear out. Setting
              aside 5-10% of rent monthly as a CapEx reserve keeps cash-flow
              expectations honest. TrueCap shows that reserve below lender-style
              NOI, then subtracts it before cash-on-cash return — otherwise a
              strong NOI can still hide a $15k replacement in year 7.
            </p>
            <h3>3. Excluding management fees on self-managed properties</h3>
            <p>
              If you self-manage, your time is still a real cost. Most
              underwriters include 8-10% of rent as management fee even if
              you&apos;re doing the work yourself — because the day you hand it
              off to a PM, the NOI shouldn&apos;t suddenly drop. Be honest about
              the true cost of operating the property. The{" "}
              <Link
                href="/blog/50-percent-rule-rentals"
                className="text-primary font-semibold hover:underline"
              >
                50% rule for rentals
              </Link>{" "}
              is a useful sanity check — if your assumed operating expenses are
              far below 50% of rent on a small residential property, verify each
              expense line against current property evidence rather than
              assuming the shortcut proves an omission.
            </p>
          </article>

          {/* Backlink engine — quiet, collapsed, renders nothing if this

              tool has no embeddable widget. See the component header. */}

          <ToolEmbedInvite slug="noi-calculator" />

          <ToolsConversionCta
            calculatorName="NOI calculator"
            hook="TrueCap's free core analyzer takes NOI into editable cap rate, cash-on-cash, model DSCR, and cash flow. Released projections, sensitivity, and Offer Ceiling appear only when your evaluation or plan access includes them."
          />

          <footer className="mt-12 pt-8 border-t border-border text-center text-xs text-muted-foreground">
            Built with{" "}
            <Link
              href="/"
              className="font-bold text-foreground hover:underline"
            >
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
