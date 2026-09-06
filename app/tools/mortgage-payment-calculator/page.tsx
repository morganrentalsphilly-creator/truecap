/**
 * Public SEO landing page for the mortgage payment calculator. The
 * highest-volume real-estate finance keyword on our /tools list.
 * Funnels into the full TrueCap analyzer via the standard CTA.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { getSiteUrl } from "@/lib/site-url";
import { MortgagePaymentWidget } from "@/components/tools/mortgage-payment-widget";
import { ToolsConversionCta } from "@/components/marketing/tools-conversion-cta";
import { ToolEmbedInvite } from "@/components/marketing/tool-embed-invite";
import { SiteFooter } from "@/components/marketing/site-footer";
import { ToolBreadcrumbSchema } from "@/components/marketing/tool-breadcrumb-schema";
import { RelatedContent } from "@/components/marketing/related-content";

export const metadata: Metadata = {
  title: "Free Mortgage Payment Calculator — Full PITI",
  description:
    "Free mortgage payment calculator with P&I, tax, homeowner insurance, and estimated PMI below 20% down. No signup.",
  keywords: [
    "mortgage payment calculator",
    "mortgage calculator",
    "piti calculator",
    "rental property mortgage calculator",
    "home loan calculator",
    "monthly mortgage payment",
    "mortgage payment with tax and insurance",
  ],
  alternates: { canonical: "/tools/mortgage-payment-calculator" },
  openGraph: {
    title: "Free Mortgage Payment Calculator — Full PITI",
    description:
      "Compute principal, interest, tax, homeowner insurance, estimated PMI, and total interest paid over the loan.",
    url: "/tools/mortgage-payment-calculator",
    type: "website",
    images: [
      {
        url: "/home.jpg",
        width: 1200,
        height: 630,
        alt: "TrueCap mortgage payment calculator",
      },
    ],
  },
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
};

const FAQS: { q: string; a: string }[] = [
  {
    q: "What is PITI?",
    a: "Principal + Interest + Tax + Insurance — the four components of a typical monthly mortgage payment. P&I is what the lender quotes you; tax and insurance are usually held in escrow and paid on your behalf, making PITI the actual cash that leaves your account each month.",
  },
  {
    q: "How is the monthly P&I calculated?",
    a: "Using the standard amortization formula: P&I = L × (r / (1 − (1 + r)^−n)), where L = loan amount, r = monthly rate (annual rate ÷ 12), n = total months. Modern mortgages are fully amortizing — early payments are mostly interest, later payments mostly principal.",
  },
  {
    q: "How do investment property rates compare to primary residence rates?",
    a: "Pricing varies by lender, market, occupancy, loan type, points, credit, leverage, property, and lock date. Use a current investment-property quote for the proposed file and stress a higher-rate case; a generic spread or today's range is not a quote.",
  },
  {
    q: "What's a typical down payment for investment property?",
    a: "Required equity varies by occupancy, borrower, units, property, lender, and program. Obtain written terms for the proposed file, including reserves, mortgage insurance, points, and closing costs. An all-cash purchase removes loan debt service but not property, liquidity, or market risk.",
  },
  {
    q: "Should I pay off my mortgage early?",
    a: "It depends on the note and prepayment terms, taxes, liquidity, reserves, risk tolerance, and the uncertain after-cost return of alternatives. Compare scenarios rather than using a current-rate threshold or assuming capital deployed elsewhere earns more.",
  },
  {
    q: "How does this differ from a standard mortgage calculator?",
    a: "Most consumer mortgage calculators don't include taxes and insurance — they show P&I only, which understates your actual monthly cost by 15-25%. PITI is what you actually pay. TrueCap shows both so you can see the breakdown.",
  },
];

export default function MortgagePaymentPage() {
  const siteUrl = getSiteUrl();
  const webAppLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "TrueCap Mortgage Payment Calculator",
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web",
    dateModified: "2026-06-01",
    url: `${siteUrl}/tools/mortgage-payment-calculator`,
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
    name: "Mortgage Payment Calculator",
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "Real Estate Calculator",
    operatingSystem: "Web",
    description:
      "Free mortgage payment calculator with P&I, tax, homeowner insurance, and estimated PMI below 20% down. No signup.",
    url: `${siteUrl}/tools/mortgage-payment-calculator`,
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
      "Monthly P&I from price, down payment, rate, term",
      "Include PMI + taxes + insurance",
      "Total interest + amortization breakdown",
    ],
  };

  return (
    <>
      <ToolBreadcrumbSchema
        toolPath="/tools/mortgage-payment-calculator"
        toolName="Mortgage payment calculator"
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
              Mortgage Payment Calculator
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground mt-2 leading-relaxed">
              Principal, interest, tax, insurance — and the total interest
              you&apos;ll pay over the life of the loan. Below 20% down, the
              estimate also includes mortgage insurance using the same screening
              assumption as TrueCap&apos;s analyzer. Built for rental property
              investors who need to know the real monthly cost before they
              offer.
            </p>
          </header>

          <MortgagePaymentWidget />

          <article className="prose prose-slate max-w-none mt-10 sm:mt-12 [&_p]:leading-relaxed [&_p]:text-foreground [&_h2]:font-extrabold [&_h2]:text-foreground [&_h2]:mt-10 [&_h2]:mb-3 [&_h3]:font-bold [&_h3]:text-foreground [&_h3]:mt-6 [&_h3]:mb-2 [&_li]:text-foreground">
            <h2 className="text-2xl sm:text-3xl">
              Why PITI matters more than P&amp;I
            </h2>
            <p>
              Most mortgage calculators show P&amp;I — principal and interest
              only. That&apos;s the number lenders quote in ads because
              it&apos;s the lowest. But it&apos;s not what you actually pay each
              month. Add property tax and insurance and you get PITI — the real
              cash that leaves your account. PITI typically runs 15-25% higher
              than P&amp;I depending on your state&apos;s tax rate. Underwriting
              a deal on P&amp;I-only math is the fastest way to make a deal look
              more profitable than it is. (For a full breakdown of each piece,
              read{" "}
              <Link
                href="/blog/piti-explained-rental-property"
                className="font-semibold text-primary hover:underline"
              >
                PITI explained for rental property
              </Link>
              .)
            </p>

            <h2 className="text-2xl sm:text-3xl">The amortization formula</h2>
            <div className="bg-card border border-border rounded-xl p-5 sm:p-6 my-4 text-center font-mono text-sm sm:text-base">
              P&amp;I = L × r / (1 − (1 + r)^−n)
            </div>
            <p>
              Where <strong>L</strong> = loan amount, <strong>r</strong> =
              monthly interest rate (annual rate ÷ 12), <strong>n</strong> =
              total months. Mortgages are fully amortizing — early payments are
              mostly interest, late payments mostly principal. On a 30-year
              mortgage at 7%, you don&apos;t cross the 50/50
              principal-to-interest line until roughly year 19.
            </p>

            <h2 className="text-2xl sm:text-3xl">
              Investment property vs primary residence rates
            </h2>
            <p>
              Investment-property pricing can differ from owner-occupant pricing
              based on occupancy, property type, leverage, credit, reserves,
              points, term, lender, and market conditions. The FRED series shown
              by TrueCap is a national owner-occupied benchmark, not an
              investment-property quote. Enter a current written quote for the
              scenario you are evaluating.
            </p>

            <h2 className="text-2xl sm:text-3xl">Down payment scenarios</h2>
            <p>
              Minimum equity and pricing adjustments vary by loan program,
              occupancy, unit count, borrower, and property. Model the actual
              down payment from a current lender proposal; a cash scenario can
              be modeled separately by removing debt service.
            </p>

            <h2 className="text-2xl sm:text-3xl">
              Don&apos;t forget escrow + PMI
            </h2>
            <p>
              Mortgage-insurance and escrow requirements depend on the loan
              program and documents. Do not infer a premium or cancellation date
              from an equity percentage alone. Review the written loan estimate
              and program terms, then enter the actual premium, taxes,
              insurance, and escrowed items in the model.
            </p>

            <h2 className="text-2xl sm:text-3xl">The full picture</h2>
            <p>
              A mortgage payment is just one input in a real underwrite. You
              also need to know your DSCR (does the property cover the payment?
              —{" "}
              <Link
                href="/blog/how-to-calculate-dscr"
                className="font-semibold text-primary hover:underline"
              >
                how to calculate DSCR
              </Link>{" "}
              explains TrueCap&apos;s preliminary ratio; lenders may use a
              different NOI and debt-service convention), cash-on-cash return
              (what does your money actually earn?), the upfront cash to close
              (estimate it with the{" "}
              <Link
                href="/tools/closing-cost-calculator"
                className="font-semibold text-primary hover:underline"
              >
                closing cost calculator
              </Link>
              ), and, when your access includes it, a released 10-year cash-flow
              and equity projection (how might the stabilized hold evolve?).
              TrueCap&apos;s free core analyzer combines the preliminary
              first-year rental metrics; evaluation and paid access gates apply
              to projection features.
            </p>
          </article>

          {/* Backlink engine — quiet, collapsed, renders nothing if this

              tool has no embeddable widget. See the component header. */}

          <ToolEmbedInvite slug="mortgage-payment-calculator" />

          <ToolsConversionCta
            calculatorName="Mortgage payment calculator"
            hook="The free core analyzer plugs your mortgage assumptions into editable DSCR and cash-flow modeling. Released projections, sensitivity, and Offer Ceiling appear only when your evaluation or plan access includes them."
          />

          <RelatedContent kind="tool" slug="mortgage-payment-calculator" title="Mortgage Payment Calculator" className="mt-10" />

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
