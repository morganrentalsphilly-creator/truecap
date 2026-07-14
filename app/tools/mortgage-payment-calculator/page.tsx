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
import { SiteFooter } from "@/components/marketing/site-footer";
import { ToolBreadcrumbSchema } from "@/components/marketing/tool-breadcrumb-schema";

export const metadata: Metadata = {
  title: "Free Mortgage Payment Calculator — Full PITI",
  description:
    "Free PITI mortgage payment calculator for rental investors. Total interest, monthly breakdown, full amortization schedule. No signup.",
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
      "Compute principal, interest, tax, insurance — and total interest paid over the loan. Built for investors.",
    url: "/tools/mortgage-payment-calculator",
    type: "website",
    images: [{ url: "/home.jpg", width: 1200, height: 630, alt: "TrueCap mortgage payment calculator" }],
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
    a: "Investment property loans typically run 0.5-1.5% higher than owner-occupant rates. Lenders price in the higher default risk (investors default more often than people losing their primary home). Plan for ~7-8% range when underwriting today.",
  },
  {
    q: "What's a typical down payment for investment property?",
    a: "20-25% for conventional financing on a 1-4 unit investment. 25-30% for 5+ unit multifamily. Some DSCR loan products allow as little as 15% down with rate / DSCR penalties. 100% down (all-cash) eliminates the financing component entirely — TrueCap's full analyzer handles that case too.",
  },
  {
    q: "Should I pay off my mortgage early?",
    a: "Depends on the spread between your mortgage rate and what you'd earn investing the same cash. At today's investment-property rates (7%+) paying off early often makes sense, especially as part of a debt-paydown wealth strategy. At low rates (3-4%), most investors keep the cheap debt and deploy capital elsewhere.",
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
      "Free PITI mortgage payment calculator for rental investors. Total interest, monthly breakdown, full amortization schedule. No signup.",
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
      <ToolBreadcrumbSchema toolPath="/tools/mortgage-payment-calculator" toolName="Mortgage payment calculator" />
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
              Mortgage Payment Calculator
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground mt-2 leading-relaxed">
              Principal, interest, tax, insurance — and the total interest
              you&apos;ll pay over the life of the loan. Built for rental
              property investors who need to know the real monthly cost
              before they offer.
            </p>
          </header>

          <MortgagePaymentWidget />

          <article className="prose prose-slate max-w-none mt-10 sm:mt-12 [&_p]:leading-relaxed [&_p]:text-foreground [&_h2]:font-extrabold [&_h2]:text-foreground [&_h2]:mt-10 [&_h2]:mb-3 [&_h3]:font-bold [&_h3]:text-foreground [&_h3]:mt-6 [&_h3]:mb-2 [&_li]:text-foreground">
            <h2 className="text-2xl sm:text-3xl">Why PITI matters more than P&amp;I</h2>
            <p>
              Most mortgage calculators show P&amp;I — principal and interest
              only. That&apos;s the number lenders quote in ads because it&apos;s
              the lowest. But it&apos;s not what you actually pay each month.
              Add property tax and insurance and you get PITI — the real
              cash that leaves your account. PITI typically runs 15-25%
              higher than P&amp;I depending on your state&apos;s tax rate.
              Underwriting a deal on P&amp;I-only math is the fastest way
              to make a deal look more profitable than it is. (For a full
              breakdown of each piece, read{" "}
              <Link href="/blog/piti-explained-rental-property" className="font-semibold text-primary hover:underline">PITI explained for rental property</Link>.)
            </p>

            <h2 className="text-2xl sm:text-3xl">The amortization formula</h2>
            <div className="bg-card border border-border rounded-xl p-5 sm:p-6 my-4 text-center font-mono text-sm sm:text-base">
              P&amp;I = L × r / (1 − (1 + r)^−n)
            </div>
            <p>
              Where <strong>L</strong> = loan amount, <strong>r</strong> =
              monthly interest rate (annual rate ÷ 12), <strong>n</strong> =
              total months. Mortgages are fully amortizing — early payments
              are mostly interest, late payments mostly principal. On a
              30-year mortgage at 7%, you don&apos;t cross the 50/50
              principal-to-interest line until roughly year 19.
            </p>

            <h2 className="text-2xl sm:text-3xl">Investment property vs primary residence rates</h2>
            <p>
              Investment loans price 0.5-1.5% higher than owner-occupant
              loans. The spread covers the higher default risk lenders see
              on investment property — when borrowers hit financial
              trouble they default on rentals before their own home. Today
              that puts conventional 30-year fixed investment loans in the
              7-8% range, vs. 6-7% for owner-occupant.
            </p>

            <h2 className="text-2xl sm:text-3xl">Down payment options</h2>
            <ul>
              <li><strong>20%</strong> — the conventional minimum for 1-4 unit investment</li>
              <li><strong>25-30%</strong> — required for 5+ unit multifamily (commercial)</li>
              <li><strong>15%</strong> — possible on some DSCR loan products with rate penalty</li>
              <li><strong>0% / all cash</strong> — eliminates the financing piece entirely (use TrueCap&apos;s full analyzer for the cash-purchase math)</li>
            </ul>

            <h2 className="text-2xl sm:text-3xl">Don&apos;t forget escrow + PMI</h2>
            <p>
              On owner-occupant loans below 20% down, you typically pay
              PMI (private mortgage insurance) until equity hits 20%.
              Investment loans don&apos;t have PMI in the same form, but
              the higher rate effectively prices in similar risk. Always
              read the loan estimate carefully — the &ldquo;monthly
              payment&rdquo; on the disclosure includes everything the
              lender holds in escrow.
            </p>

            <h2 className="text-2xl sm:text-3xl">The full picture</h2>
            <p>
              A mortgage payment is just one input in a real underwrite.
              You also need to know your DSCR (does the property cover
              the payment? — run the{" "}
              <Link href="/tools/dscr-calculator" className="font-semibold text-primary hover:underline">DSCR calculator</Link>),
              cash-on-cash return (what does your money
              actually earn?), the upfront cash to close (estimate it with the{" "}
              <Link href="/tools/closing-cost-calculator" className="font-semibold text-primary hover:underline">closing cost calculator</Link>),
              10-year projection (does this compound?),
              and tax position (how much do you actually keep?). TrueCap&apos;s
              full analyzer runs all of those at once — free to start, no
              card required.
            </p>
          </article>

          <ToolsConversionCta
            calculatorName="Mortgage payment calculator"
            hook="The full TrueCap analyzer plugs your mortgage payment into the bigger picture: DSCR, cash flow, 10-year projection, tax savings, exit scenarios. Free to use, save deals, share with your lender."
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
