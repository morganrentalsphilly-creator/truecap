/**
 * /tools/roi-calculator — standalone SEO landing page.
 *
 * Targets: "rental property roi calculator", "investment property roi",
 * "real estate roi", "total return rental property".
 */

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSiteUrl } from "@/lib/site-url";
import { RoiCalculatorWidget } from "@/components/tools/roi-calculator-widget";
import { ToolsConversionCta } from "@/components/marketing/tools-conversion-cta";
import { ToolEmbedInvite } from "@/components/marketing/tool-embed-invite";
import { SiteFooter } from "@/components/marketing/site-footer";
import { ToolBreadcrumbSchema } from "@/components/marketing/tool-breadcrumb-schema";
import { isCalculatorReleased } from "@/lib/calculator-registry";

export const metadata: Metadata = {
  title: "Free Rental Property ROI Calculator — Total Return",
  description:
    "Free modeled ROI calculator. Combine entered cash flow, principal paydown, and appreciation assumptions into a simple annual estimate.",
  keywords: [
    "rental property roi calculator",
    "real estate roi calculator",
    "investment property roi",
    "total return rental property",
    "roi rental property formula",
    "real estate return on investment",
  ],
  alternates: { canonical: "/tools/roi-calculator" },
  openGraph: {
    title: "Free Rental Property ROI Calculator — Total Return",
    description: "Model cash flow, principal paydown, and appreciation assumptions in one simple annual ROI estimate.",
    url: "/tools/roi-calculator",
    type: "website",
    images: [{ url: "/home.jpg", width: 1200, height: 630, alt: "TrueCap rental property ROI calculator" }],
  },
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
};

const FAQS: { q: string; a: string }[] = [
  {
    q: "What's the formula for rental property ROI?",
    a: "Modeled simple annual ROI = (annual cash flow + annual principal paydown + assumed annual appreciation) ÷ total cash invested. Appreciation is an entered estimate, not cash received or a realized return.",
  },
  {
    q: "What's a good ROI on a rental property?",
    a: "There is no universal good ROI threshold. Compare the modeled result with your own Buy Box, financing, risk tolerance, workload, evidence quality, and alternative uses of capital.",
  },
  {
    q: "How is total ROI different from cash-on-cash return?",
    a: "Cash-on-cash uses annual cash flow divided by cash invested. This simple ROI estimate also adds entered principal paydown and appreciation assumptions, so it answers a different question and may be higher or lower depending on those inputs.",
  },
  {
    q: "How is total ROI different from IRR?",
    a: "This ROI is a simple one-year estimate. IRR uses the timing of multiple cash flows across a holding period and an assumed exit. The two metrics are not interchangeable.",
  },
  {
    q: "Should I include tax savings in ROI?",
    a: "This calculator excludes tax effects. Whether a deduction is available or currently usable depends on the property, ownership, activity rules, basis, and taxpayer. Build a taxpayer-specific scenario with a qualified tax adviser; TrueCap does not currently expose a tax-specific analysis module.",
  },
];

export default function RoiCalculatorPage() {
  if (!isCalculatorReleased("roi-calculator")) notFound();

  const siteUrl = getSiteUrl();
  const ld = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Rental Property ROI Calculator — TrueCap",
    description: "Free rental property ROI calculator.",
    url: `${siteUrl}/tools/roi-calculator`,
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
    name: "Rental Property ROI Calculator",
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "Real Estate Calculator",
    operatingSystem: "Web",
    description:
      "Free modeled ROI calculator combining entered cash flow, principal paydown, and appreciation assumptions.",
    url: `${siteUrl}/tools/roi-calculator`,
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
      "Combine cash flow, principal paydown, appreciation",
      "Simple one-year modeled ROI estimate",
      "Separate contribution from each entered component",
    ],
  };

  return (
    <div className="min-h-screen bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareAppLd) }} />
      <ToolBreadcrumbSchema toolName="ROI Calculator" toolPath="/tools/roi-calculator" />

      <main id="main" className="mx-auto max-w-3xl px-4 sm:px-6 py-8 sm:py-12">
        <nav aria-label="Breadcrumb" className="mb-6 text-xs">
          <ol className="flex flex-wrap items-center gap-2 text-muted-foreground">
            <li><Link href="/" className="hover:text-foreground">Home</Link></li>
            <li aria-hidden="true">›</li>
            <li><Link href="/tools" className="hover:text-foreground">Tools</Link></li>
            <li aria-hidden="true">›</li>
            <li className="font-semibold text-foreground">ROI Calculator</li>
          </ol>
        </nav>

        <p className="text-[11px] uppercase tracking-widest text-primary font-bold">Free calculator</p>
        <h1 className="mt-2 text-3xl sm:text-4xl font-extrabold text-foreground leading-tight tracking-tight">
          Rental Property ROI Calculator
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
          Combine entered annual cash flow, principal paydown, and appreciation assumptions, then divide by total cash invested. The result is a modeled simple annual ROI—not IRR, market performance, or a realized return.
        </p>

        <div className="mt-8">
          <RoiCalculatorWidget />
        </div>

        <section className="mt-12">
          <h2 className="text-xl sm:text-2xl font-extrabold text-foreground mb-3">The ROI formula explained</h2>
          <div className="rounded-xl border border-border bg-muted/30 p-5">
            <code className="text-sm sm:text-base text-foreground font-mono">
              Total ROI = (Cash flow + Principal paydown + Appreciation) ÷ Cash invested
            </code>
          </div>
          <p className="mt-4 text-base leading-relaxed text-foreground">
            Three components:
          </p>
          <ul className="mt-3 space-y-2 text-base leading-relaxed text-foreground">
            <li><strong>Cash flow:</strong> rent minus all operating expenses minus mortgage. This is the money in your pocket each month, annualized.</li>
            <li><strong>Principal paydown:</strong> the portion of each mortgage payment going to loan balance (not interest). This is equity build — invisible until you sell or refi.</li>
            <li><strong>Appreciation:</strong> the value change implied by the annual rate you enter. It is uncertain and is not realized unless a future transaction supports it.</li>
          </ul>
          <p className="mt-3 text-base leading-relaxed text-foreground">
            Sum the three and divide by cash invested (down payment + closing + initial rehab) to get a modeled simple annual return under the assumptions entered. It is not IRR or a realized return.
          </p>
          <p className="mt-3 text-base leading-relaxed text-foreground">
            Worked example: $300k property, $75k cash invested. $5,400 annual cash flow + $3,200 principal paydown + $10,500 appreciation (3.5%/yr) = $19,100 total annual return. ROI = $19,100 ÷ $75k = 25.5%.
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
          <h2 className="text-xl sm:text-2xl font-extrabold text-foreground mb-3">Related metrics</h2>
          <div className="flex flex-wrap gap-2 text-sm">
            <Link href="/glossary/cash-on-cash-return" className="inline-flex min-h-11 items-center rounded-full border border-border bg-card px-3 font-semibold text-foreground/80 hover:border-primary/40 hover:text-primary">Cash-on-cash return</Link>
            <Link href="/glossary/irr" className="inline-flex min-h-11 items-center rounded-full border border-border bg-card px-3 font-semibold text-foreground/80 hover:border-primary/40 hover:text-primary">IRR</Link>
            <Link href="/glossary/appreciation-rate" className="inline-flex min-h-11 items-center rounded-full border border-border bg-card px-3 font-semibold text-foreground/80 hover:border-primary/40 hover:text-primary">Appreciation rate</Link>
            <Link href="/tools/cash-on-cash-calculator" className="inline-flex min-h-11 items-center rounded-full border border-border bg-card px-3 font-semibold text-foreground/80 hover:border-primary/40 hover:text-primary">Cash-on-cash calculator</Link>
            <Link href="/tools/break-even-calculator" className="inline-flex min-h-11 items-center rounded-full border border-border bg-card px-3 font-semibold text-foreground/80 hover:border-primary/40 hover:text-primary">Break-even calculator</Link>
          </div>
        </section>

        {/* Backlink engine — quiet, collapsed, renders nothing if this

            tool has no embeddable widget. See the component header. */}

        <ToolEmbedInvite slug="roi-calculator" />


        <ToolsConversionCta calculatorName="ROI calculator" />
      </main>
      <SiteFooter />
    </div>
  );
}
