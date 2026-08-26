/**
 * /tools/break-even-calculator — standalone SEO landing page.
 *
 * Targets: "rental property break-even calculator", "rental property
 * break even point", "how long until rental property pays for itself".
 */

import type { Metadata } from "next";
import Link from "next/link";
import { getSiteUrl } from "@/lib/site-url";
import { BreakEvenCalculatorWidget } from "@/components/tools/break-even-calculator-widget";
import { ToolsConversionCta } from "@/components/marketing/tools-conversion-cta";
import { ToolEmbedInvite } from "@/components/marketing/tool-embed-invite";
import { SiteFooter } from "@/components/marketing/site-footer";
import { ToolBreadcrumbSchema } from "@/components/marketing/tool-breadcrumb-schema";

export const metadata: Metadata = {
  title: "Free Break-Even Calculator — Months to Recoup Cash",
  description:
    "Free rental break-even calculator. Estimate how many months the entered cash flow would take to recover the entered initial cash.",
  keywords: [
    "rental property break-even calculator",
    "break-even calculator rental",
    "how long until rental pays for itself",
    "rental property payback period",
    "investment property break-even",
    "real estate break-even point",
  ],
  alternates: { canonical: "/tools/break-even-calculator" },
  openGraph: {
    title: "Free Break-Even Calculator — Months to Recoup Cash",
    description: "How many months until your rental property has returned your initial investment from cash flow alone.",
    url: "/tools/break-even-calculator",
    type: "website",
    images: [{ url: "/home.jpg", width: 1200, height: 630, alt: "TrueCap break-even calculator" }],
  },
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
};

const FAQS: { q: string; a: string }[] = [
  {
    q: "What is the break-even point on a rental property?",
    a: "Break-even on a rental property is the number of months it takes for the property's net cash flow to return your initial cash invested (down payment + closing costs + initial repairs). It measures pure cash-on-cash recovery — it excludes appreciation and equity build from mortgage paydown.",
  },
  {
    q: "What's a good break-even period for a rental property?",
    a: "There is no universal good period. Compare the modeled duration with your own liquidity needs, cash-flow targets, financing, evidence quality, and alternative uses of capital. The result assumes the entered monthly cash flow remains constant.",
  },
  {
    q: "Does break-even include appreciation or equity?",
    a: "No. Break-even isolates cash-on-cash recovery — how fast monthly cash flow alone returns your investment. Adding appreciation + principal paydown gives you total return (use IRR or 10-year projection for that). Break-even is a useful complement, not a replacement.",
  },
  {
    q: "How is break-even different from cash-on-cash return?",
    a: "Cash-on-cash is annualized (return ÷ cash invested, as a percentage). Break-even is duration (cash invested ÷ monthly cash flow, expressed in months). They measure the same dynamic from different angles. 12% cash-on-cash ≈ 100-month (8.3-year) break-even.",
  },
  {
    q: "If my cash flow is negative, what does break-even mean?",
    a: "With zero or negative monthly cash flow, there is no cash-flow recovery period under the entered assumptions. Appreciation, principal paydown, future rent changes, taxes, and sale proceeds are outside this calculation and should be modeled separately.",
  },
];

export default function BreakEvenCalculatorPage() {
  const siteUrl = getSiteUrl();
  const ld = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Rental Property Break-Even Calculator — TrueCap",
    description: "Free rental property break-even calculator.",
    url: `${siteUrl}/tools/break-even-calculator`,
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
    name: "Rental Property Break-Even Calculator",
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "Real Estate Calculator",
    operatingSystem: "Web",
    description:
      "Free rental break-even calculator estimating cash-flow recovery time from entered assumptions.",
    url: `${siteUrl}/tools/break-even-calculator`,
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
      "Months to recover initial cash investment",
      "Account for operating expenses + debt service",
      "Compare break-even periods across strategies",
    ],
  };

  return (
    <div className="min-h-screen bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareAppLd) }} />
      <ToolBreadcrumbSchema toolName="Break-Even Calculator" toolPath="/tools/break-even-calculator" />

      <main id="main" className="mx-auto max-w-3xl px-4 sm:px-6 py-8 sm:py-12">
        <nav aria-label="Breadcrumb" className="mb-6 text-xs">
          <ol className="flex flex-wrap items-center gap-2 text-muted-foreground">
            <li><Link href="/" className="hover:text-foreground">Home</Link></li>
            <li aria-hidden="true">›</li>
            <li><Link href="/tools" className="hover:text-foreground">Tools</Link></li>
            <li aria-hidden="true">›</li>
            <li className="font-semibold text-foreground">Break-Even Calculator</li>
          </ol>
        </nav>

        <p className="text-[11px] uppercase tracking-widest text-primary font-bold">Free calculator</p>
        <h1 className="mt-2 text-3xl sm:text-4xl font-extrabold text-foreground leading-tight tracking-tight">
          Rental Property Break-Even Calculator
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
          Estimate how many months the entered monthly net cash flow would take to recover the entered down payment, closing costs, and initial repairs. The result assumes cash flow stays constant and excludes appreciation, principal paydown, taxes, and sale proceeds.
        </p>

        <div className="mt-8">
          <BreakEvenCalculatorWidget />
        </div>

        <section className="mt-12">
          <h2 className="text-xl sm:text-2xl font-extrabold text-foreground mb-3">How break-even is calculated</h2>
          <div className="rounded-xl border border-border bg-muted/30 p-5">
            <code className="text-sm sm:text-base text-foreground font-mono">
              Break-even months = Total cash invested ÷ Monthly net cash flow
            </code>
          </div>
          <p className="mt-4 text-base leading-relaxed text-foreground">
            Total cash invested = down payment + closing costs + initial repairs/rehab. Monthly net cash flow = rent minus all operating expenses minus mortgage P&amp;I. Divide one by the other and you get the number of months until you&apos;ve gotten your initial investment back, purely from rental income.
          </p>
          <p className="mt-3 text-base leading-relaxed text-foreground">
            Worked example: you put $60,000 down on a $300,000 property + $8,000 closing + $5,000 initial repairs = $73,000 invested. Monthly cash flow $450. Break-even = $73,000 ÷ $450 = 162 months = 13.5 years.
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
            <Link href="/glossary/cap-rate" className="inline-flex min-h-11 items-center rounded-full border border-border bg-card px-3 font-semibold text-foreground/80 hover:border-primary/40 hover:text-primary">Cap rate</Link>
            <Link href="/glossary/irr" className="inline-flex min-h-11 items-center rounded-full border border-border bg-card px-3 font-semibold text-foreground/80 hover:border-primary/40 hover:text-primary">IRR</Link>
            <Link href="/tools/cash-on-cash-calculator" className="inline-flex min-h-11 items-center rounded-full border border-border bg-card px-3 font-semibold text-foreground/80 hover:border-primary/40 hover:text-primary">Cash-on-cash calculator</Link>
            <Link href="/tools/cap-rate-calculator" className="inline-flex min-h-11 items-center rounded-full border border-border bg-card px-3 font-semibold text-foreground/80 hover:border-primary/40 hover:text-primary">Cap rate calculator</Link>
          </div>
        </section>

        {/* Backlink engine — quiet, collapsed, renders nothing if this

            tool has no embeddable widget. See the component header. */}

        <ToolEmbedInvite slug="break-even-calculator" />


        <ToolsConversionCta calculatorName="Break-even calculator" />
      </main>
      <SiteFooter />
    </div>
  );
}
