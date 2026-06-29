/**
 * /tools/closing-cost-calculator — standalone SEO landing page.
 *
 * Targets: "closing cost calculator", "rental property closing costs",
 * "investment property closing costs", "how much closing costs rental".
 */

import type { Metadata } from "next";
import Link from "next/link";
import { getSiteUrl } from "@/lib/site-url";
import { ClosingCostCalculatorWidget } from "@/components/tools/closing-cost-calculator-widget";
import { ToolsConversionCta } from "@/components/marketing/tools-conversion-cta";
import { SiteFooter } from "@/components/marketing/site-footer";
import { ToolBreadcrumbSchema } from "@/components/marketing/tool-breadcrumb-schema";

export const metadata: Metadata = {
  title: "Rental Property Closing Cost Calculator",
  description:
    "Free closing cost calculator for rental purchases. Origination, title, transfer tax, escrow, prepaids — every line item, plus a typical total.",
  keywords: [
    "closing cost calculator",
    "rental property closing costs",
    "investment property closing costs",
    "how much closing costs",
    "real estate closing costs",
    "investment property closing fees",
  ],
  alternates: { canonical: "/tools/closing-cost-calculator" },
  openGraph: {
    title: "Closing Cost Calculator — Free",
    description: "Compute closing costs on a rental property purchase. Every line item broken out.",
    url: "/tools/closing-cost-calculator",
    type: "website",
    images: [{ url: "/home.jpg", width: 1200, height: 630, alt: "TrueCap closing cost calculator" }],
  },
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
};

const FAQS: { q: string; a: string }[] = [
  {
    q: "What are typical closing costs on a rental property?",
    a: "2-5% of purchase price is the typical range. On a $300k property, expect $6,000-15,000 of closing costs. Investment-property closing tends to run higher than primary-residence closing because of lender fees, slightly higher title premium, and the absence of some primary-residence exemptions.",
  },
  {
    q: "What's included in closing costs?",
    a: "Major categories: loan origination (1-2% of loan), title insurance (~0.5% of price), recording fees (~$250), transfer tax (varies by state, 0-2%), insurance prepay (12 months upfront), tax escrow (2-6 months), appraisal ($400-700), inspection ($350-500), and miscellaneous lender + title fees.",
  },
  {
    q: "Are closing costs higher for investment properties vs primary?",
    a: "Modestly higher. Lenders typically charge slightly more origination on investment loans. Title insurance can be slightly higher. Some loan programs (FHA, VA) aren't available for non-owner-occupants. The total spread is usually 0.3-0.7% of purchase price — not huge but real.",
  },
  {
    q: "Can closing costs be negotiated?",
    a: "Yes — partially. The origination fee, lender title insurance, and lender fees are negotiable. Government-set items (recording fees, transfer tax) are not. Smart investors shop 3+ lenders and use the lowest quote to negotiate down a competitor's offer. Spread between best and worst lender on the same deal: 0.5-1% of purchase price typical.",
  },
  {
    q: "Can closing costs be rolled into the loan?",
    a: "On purchases, generally no — closing costs come out of pocket at closing. On refinances, yes — many lenders let you roll closing costs into the new loan balance (your monthly payment goes up slightly but you bring zero cash). For BRRRR strategy planning, this matters: the refi step often funds the closing costs of the refi itself.",
  },
];

export default function ClosingCostCalculatorPage() {
  const siteUrl = getSiteUrl();
  const ld = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Closing Cost Calculator — TrueCap",
    description: "Free rental property closing cost calculator.",
    url: `${siteUrl}/tools/closing-cost-calculator`,
    dateModified: "2026-06-01",
    publisher: { "@id": `${siteUrl}/#organization` },
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
    name: "Closing Cost Calculator",
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "Real Estate Calculator",
    operatingSystem: "Web",
    description:
      "Free closing cost calculator for rental purchases. Origination, title, transfer tax, escrow, prepaids — every line item, plus a typical total.",
    url: `${siteUrl}/tools/closing-cost-calculator`,
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
      "Line-item breakdown: origination, title, escrow",
      "Transfer tax + prepaid items included",
      "Total closing cost estimate as % of price",
    ],
  };

  return (
    <div className="min-h-screen bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareAppLd) }} />
      <ToolBreadcrumbSchema toolName="Closing Cost Calculator" toolPath="/tools/closing-cost-calculator" />

      <main className="mx-auto max-w-3xl px-4 sm:px-6 py-8 sm:py-12">
        <nav aria-label="Breadcrumb" className="mb-6 text-xs">
          <ol className="flex flex-wrap items-center gap-2 text-muted-foreground">
            <li><Link href="/" className="hover:text-foreground">Home</Link></li>
            <li aria-hidden="true">›</li>
            <li><Link href="/tools" className="hover:text-foreground">Tools</Link></li>
            <li aria-hidden="true">›</li>
            <li className="font-semibold text-foreground">Closing Cost Calculator</li>
          </ol>
        </nav>

        <p className="text-[11px] uppercase tracking-widest text-primary font-bold">Free calculator</p>
        <h1 className="mt-2 text-3xl sm:text-4xl font-extrabold text-foreground leading-tight tracking-tight">
          Rental Property Closing Cost Calculator
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
          Closing costs on a rental property typically run 2-5% of purchase price. This calculator breaks out the major line items so you can model your exact deal and shop lenders on apples-to-apples terms.
        </p>

        <div className="mt-8">
          <ClosingCostCalculatorWidget />
        </div>

        <section className="mt-12">
          <h2 className="text-xl sm:text-2xl font-extrabold text-foreground mb-3">What closing costs include</h2>
          <p className="text-base leading-relaxed text-foreground">
            Closing costs fall into four buckets:
          </p>
          <ul className="mt-3 space-y-2 text-base leading-relaxed text-foreground">
            <li><strong>Lender fees (negotiable):</strong> origination (0.5-2% of loan), discount points (optional), processing, underwriting, lender title insurance.</li>
            <li><strong>Title + escrow fees:</strong> owner&apos;s title insurance, escrow / settlement fee, title search.</li>
            <li><strong>Government fees (non-negotiable):</strong> recording fee, transfer tax, mortgage tax (in some states).</li>
            <li><strong>Prepaid items:</strong> first year of homeowner&apos;s/landlord insurance, 2-6 months of property tax escrow, mortgage interest from close to month-end.</li>
            <li><strong>Due diligence:</strong> appraisal, inspection, optional radon/sewer/pest inspections.</li>
          </ul>
          <p className="mt-3 text-base leading-relaxed text-foreground">
            Always include closing costs in your <Link href="/glossary/closing-costs" className="text-primary font-semibold hover:underline">total cash invested</Link> when computing <Link href="/glossary/cash-on-cash-return" className="text-primary font-semibold hover:underline">cash-on-cash return</Link>. Skipping them inflates your return by 2-5 percentage points.
          </p>
        </section>

        <section className="mt-12">
          <h2 className="text-xl sm:text-2xl font-extrabold text-foreground mb-4">Frequently asked questions</h2>
          <div className="divide-y divide-border rounded-2xl border border-border bg-card">
            {FAQS.map((f) => (
              <details key={f.q} className="group p-5">
                <summary className="cursor-pointer text-base font-bold text-foreground group-open:text-primary">{f.q}</summary>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="mt-12 border-t border-border pt-8">
          <h2 className="text-xl sm:text-2xl font-extrabold text-foreground mb-3">Related calculators</h2>
          <div className="flex flex-wrap gap-2 text-sm">
            <Link href="/tools/mortgage-payment-calculator" className="rounded-full border border-border bg-card px-3 py-1.5 font-semibold text-foreground/80 hover:border-primary/40 hover:text-primary">Mortgage payment</Link>
            <Link href="/tools/cash-on-cash-calculator" className="rounded-full border border-border bg-card px-3 py-1.5 font-semibold text-foreground/80 hover:border-primary/40 hover:text-primary">Cash-on-cash</Link>
            <Link href="/tools/break-even-calculator" className="rounded-full border border-border bg-card px-3 py-1.5 font-semibold text-foreground/80 hover:border-primary/40 hover:text-primary">Break-even</Link>
            <Link href="/glossary/down-payment" className="rounded-full border border-border bg-card px-3 py-1.5 font-semibold text-foreground/80 hover:border-primary/40 hover:text-primary">Down payment</Link>
          </div>
        </section>

        <ToolsConversionCta calculatorName="Closing cost calculator" />
      </main>
      <SiteFooter />
    </div>
  );
}
