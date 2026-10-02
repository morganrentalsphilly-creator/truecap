/**
 * /tools/closing-cost-calculator — standalone SEO landing page.
 *
 * Targets: "closing cost calculator", "rental property closing costs",
 * "investment property closing costs", "how much closing costs rental".
 */

import type { Metadata } from "next";
import { IntentPrefetchLink } from "@/components/marketing/intent-prefetch-link";
import { getSiteUrl } from "@/lib/site-url";
import { ClosingCostCalculatorWidget } from "@/components/tools/closing-cost-calculator-widget";
import { ToolsConversionCta } from "@/components/marketing/tools-conversion-cta";
import { ToolEmbedInvite } from "@/components/marketing/tool-embed-invite";
import { SiteFooter } from "@/components/marketing/site-footer";
import { ToolBreadcrumbSchema } from "@/components/marketing/tool-breadcrumb-schema";
import { RelatedContent } from "@/components/marketing/related-content";
import { Header } from "@/components/investcalc/header";
import { lastmodFor } from "@/lib/seo/lastmod";
import { JsonLd } from "@/components/seo/json-ld";
import { buildToolAppLd, toolAppId } from "@/lib/seo/tool-app-ld";
import { OPEN_GRAPH_BASE } from "@/lib/seo/open-graph-base";

export const metadata: Metadata = {
  title: "Free Closing Cost Calculator — Every Line Item",
  description:
    "Free closing cost calculator for rental purchases. Enter origination, title, transfer tax, escrow, prepaids, and due-diligence estimates.",
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
    ...OPEN_GRAPH_BASE,
    title: "Free Closing Cost Calculator — Every Line Item",
    description: "Compute closing costs on a rental property purchase. Every line item broken out.",
    url: "/tools/closing-cost-calculator",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

const FAQS: { q: string; a: string }[] = [
  {
    q: "What are typical closing costs on a rental property?",
    a: "There is no universal percentage. The amount depends on the loan, points, jurisdiction, title and settlement charges, prepaid items, escrows, inspections, and negotiated credits. Use written lender and settlement estimates for the property before relying on the total.",
  },
  {
    q: "What's included in closing costs?",
    a: "Common categories include lender charges and points, title and settlement services, recording and transfer charges, prepaid interest and insurance, tax or insurance escrows, appraisal, inspection, and other property-specific due diligence. Not every transaction includes every item.",
  },
  {
    q: "Are closing costs higher for investment properties vs primary?",
    a: "They can differ because occupancy, loan program, leverage, points, reserves, insurance, and jurisdiction affect the quote. Compare written estimates using the same property, borrower, loan amount, rate-lock assumptions, and closing date.",
  },
  {
    q: "Can closing costs be negotiated?",
    a: "Some lender and service-provider charges may be negotiable or shoppable; statutory taxes and recording charges generally are not. Review the written Loan Estimate or equivalent itemization and ask which services you may choose before comparing offers.",
  },
  {
    q: "Can closing costs be rolled into the loan?",
    a: "It depends on the transaction and loan program. A lender may allow some costs to be covered through credits or added to a refinance balance, subject to underwriting and leverage limits. Financing costs increases the loan balance and total borrowing cost, so verify the exact treatment in the written quote.",
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
    dateModified: lastmodFor("/tools/closing-cost-calculator"),
    publisher: { "@id": `${siteUrl}/#organization` },
    mainEntity: { "@id": toolAppId(siteUrl, "closing-cost-calculator") },
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

  const appLd = buildToolAppLd(siteUrl, {
    slug: "closing-cost-calculator",
    name: "Closing Cost Calculator",
    description:
      "Free closing cost calculator for rental purchases with editable lender, title, tax, escrow, prepaid, and due-diligence inputs.",
    featureList: [
      "Line-item breakdown: origination, title, escrow",
      "Transfer tax + prepaid items included",
      "Total closing cost estimate as % of price",
    ],
  });

  return (
    <div className="min-h-screen bg-background">
      <Header initialUser={null} initialEntitlements={null} />
      <JsonLd data={ld} />
      <JsonLd data={faqLd} />
      <JsonLd data={appLd} />
      <ToolBreadcrumbSchema toolName="Closing Cost Calculator" toolPath="/tools/closing-cost-calculator" />

      <main id="main" className="mx-auto max-w-3xl px-4 sm:px-6 py-8 sm:py-12">
        <nav aria-label="Breadcrumb" className="mb-6 text-xs">
          <ol className="flex flex-wrap items-center gap-2 text-muted-foreground">
            <li><IntentPrefetchLink href="/" className="hover:text-foreground">Home</IntentPrefetchLink></li>
            <li aria-hidden="true">›</li>
            <li><IntentPrefetchLink href="/tools" className="hover:text-foreground">Tools</IntentPrefetchLink></li>
            <li aria-hidden="true">›</li>
            <li className="font-semibold text-foreground">Closing Cost Calculator</li>
          </ol>
        </nav>

        <h1 className="mt-2 text-3xl sm:text-4xl font-extrabold text-foreground leading-tight tracking-tight">
          Rental Property Closing Cost Calculator
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
          Enter the major line items from lender, title, settlement, insurance, tax, and inspection estimates. The result is only as complete as the inputs and should be replaced with written transaction-specific figures before closing.
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
            <li><strong>Lender charges:</strong> origination, discount points, processing, underwriting, and other charges shown on the written estimate.</li>
            <li><strong>Title + escrow fees:</strong> owner&apos;s title insurance, escrow / settlement fee, title search.</li>
            <li><strong>Government charges:</strong> recording fees, transfer tax, and mortgage tax where applicable.</li>
            <li><strong>Prepaid items:</strong> insurance, tax or insurance escrows, and mortgage interest from closing to the first payment period.</li>
            <li><strong>Due diligence:</strong> appraisal, inspection, optional radon/sewer/pest inspections.</li>
          </ul>
          <p className="mt-3 text-base leading-relaxed text-foreground">
            Include transaction costs in <IntentPrefetchLink href="/glossary/closing-costs" className="text-primary font-semibold hover:underline">total cash invested</IntentPrefetchLink> when computing <IntentPrefetchLink href="/glossary/cash-on-cash-return" className="text-primary font-semibold hover:underline">cash-on-cash return</IntentPrefetchLink>. Omitting them understates modeled cash invested and overstates the resulting return percentage.
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
          <h2 className="text-xl sm:text-2xl font-extrabold text-foreground mb-3">Related calculators and terms</h2>
          <div className="flex flex-wrap gap-2 text-sm">
            <IntentPrefetchLink href="/tools/mortgage-payment-calculator" className="inline-flex min-h-11 items-center rounded-full border border-border bg-card px-3 font-semibold text-foreground/80 hover:border-primary/40 hover:text-primary">Mortgage payment calculator</IntentPrefetchLink>
            <IntentPrefetchLink href="/tools/break-even-calculator" className="inline-flex min-h-11 items-center rounded-full border border-border bg-card px-3 font-semibold text-foreground/80 hover:border-primary/40 hover:text-primary">Break-even calculator</IntentPrefetchLink>
            <IntentPrefetchLink href="/glossary/cash-on-cash-return" className="inline-flex min-h-11 items-center rounded-full border border-border bg-card px-3 font-semibold text-foreground/80 hover:border-primary/40 hover:text-primary">Cash-on-cash return</IntentPrefetchLink>
            <IntentPrefetchLink href="/glossary/down-payment" className="inline-flex min-h-11 items-center rounded-full border border-border bg-card px-3 font-semibold text-foreground/80 hover:border-primary/40 hover:text-primary">Down payment</IntentPrefetchLink>
          </div>
        </section>

        {/* Backlink engine — quiet, collapsed, renders nothing if this

            tool has no embeddable widget. See the component header. */}

        <ToolEmbedInvite slug="closing-cost-calculator" />


        <ToolsConversionCta calculatorName="Closing cost calculator" />
        <RelatedContent kind="tool" slug="closing-cost-calculator" title="Closing Cost Calculator" className="mt-10" />
      </main>
      <SiteFooter />
    </div>
  );
}
