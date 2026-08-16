/**
 * /tools/rental-property-tax-calculator — standalone SEO landing page.
 *
 * Targets: "rental property tax calculator", "schedule E calculator",
 * "rental income tax", "depreciation calculator rental property".
 */

import type { Metadata } from "next";
import Link from "next/link";
import { getSiteUrl } from "@/lib/site-url";
import { RentalPropertyTaxCalculatorWidget } from "@/components/tools/rental-property-tax-calculator-widget";
import { ToolsConversionCta } from "@/components/marketing/tools-conversion-cta";
import { ToolEmbedInvite } from "@/components/marketing/tool-embed-invite";
import { SiteFooter } from "@/components/marketing/site-footer";
import { ToolBreadcrumbSchema } from "@/components/marketing/tool-breadcrumb-schema";

export const metadata: Metadata = {
  title: "Free Rental Property Tax Calculator — Schedule E",
  description:
    "Free rental property tax calculator. Models Schedule E taxable income, 27.5-year depreciation, mortgage interest, and after-tax cash flow.",
  keywords: [
    "rental property tax calculator",
    "schedule E calculator",
    "rental income tax calculator",
    "depreciation calculator rental property",
    "27.5 year depreciation",
    "after-tax cash flow rental",
    "rental property tax deduction",
  ],
  alternates: { canonical: "/tools/rental-property-tax-calculator" },
  openGraph: {
    title: "Free Rental Property Tax Calculator — Schedule E",
    description:
      "Model Schedule E taxable income, depreciation, and after-tax cash flow on a rental property.",
    url: "/tools/rental-property-tax-calculator",
    type: "website",
    images: [
      {
        url: "/home.jpg",
        width: 1200,
        height: 630,
        alt: "TrueCap rental property tax calculator",
      },
    ],
  },
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
};

const FAQS: { q: string; a: string }[] = [
  {
    q: "How is rental property income taxed?",
    a: "Many directly owned rentals are reported on Schedule E, but entity, services, mixed-use, ownership, and activity facts can change the form and treatment. TrueCap's gross rent minus modeled expenses, interest, and depreciation is a simplified illustration—not taxable income or tax due. Principal is generally not an expense; interest deductibility and allocation remain fact-specific.",
  },
  {
    q: "What is rental property depreciation?",
    a: "Eligible residential rental buildings generally use a 27.5-year GDS recovery period, but land is excluded and basis allocation, placed-in-service date, conventions, personal use, prior depreciation, elections, and other rules affect the deduction. An 80% building allocation and full-year straight-line amount are editable examples, not a filing position or promise of a tax loss.",
  },
  {
    q: "Can I deduct mortgage payments on rental property?",
    a: "Principal is generally not a rental expense. Interest allocable to a rental activity may be deductible subject to use, allocation, tracing, limitation, timing, and other rules. Use the lender's tax statement and a qualified preparer rather than a generic amortization percentage.",
  },
  {
    q: "How much of purchase price is land vs building?",
    a: "Land is generally not depreciable, but there is no universal land percentage. Support the allocation from the property's facts and appropriate valuation evidence, then have a qualified tax professional review it before filing; TrueCap's default is only a scenario input.",
  },
  {
    q: "What's the depreciation recapture issue?",
    a: "A sale can create unrecaptured section 1250 gain and other gain whose character, rate, and amount depend on basis, depreciation allowed or allowable, use, transaction costs, entity, and taxpayer facts. A qualifying 1031 exchange may postpone recognition, and basis-at-death rules depend on then-current law and facts; neither path automatically or indefinitely removes tax.",
  },
  {
    q: "Are passive losses always deductible?",
    a: "No. Passive-activity, active-participation special-allowance, material-participation, real-estate-professional, basis, at-risk, excess-business-loss, and disposition rules can all matter. Real-estate-professional status alone does not make every loss currently deductible. TrueCap does not determine eligibility; consult a qualified tax professional.",
  },
];

export default function RentalPropertyTaxCalculatorPage() {
  const siteUrl = getSiteUrl();
  const ld = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Rental Property Tax Calculator — TrueCap",
    description: "Free Schedule E + depreciation calculator for rental property investors.",
    url: `${siteUrl}/tools/rental-property-tax-calculator`,
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
    name: "Rental Property Tax Calculator",
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "Real Estate Calculator",
    operatingSystem: "Web",
    description:
      "Free rental property tax calculator. Models Schedule E taxable income, 27.5-year depreciation, mortgage interest, and after-tax cash flow.",
    url: `${siteUrl}/tools/rental-property-tax-calculator`,
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
      "Schedule E taxable income modeling",
      "Illustrative 27.5-year depreciation scenario",
      "Mortgage interest deduction included",
      "After-tax cash flow",
    ],
  };

  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareAppLd) }}
      />
      <ToolBreadcrumbSchema
        toolName="Rental Property Tax Calculator"
        toolPath="/tools/rental-property-tax-calculator"
      />

      <main className="mx-auto max-w-3xl px-4 sm:px-6 py-8 sm:py-12">
        <nav aria-label="Breadcrumb" className="mb-6 text-xs">
          <ol className="flex flex-wrap items-center gap-2 text-muted-foreground">
            <li>
              <Link href="/" className="hover:text-foreground">
                Home
              </Link>
            </li>
            <li aria-hidden="true">›</li>
            <li>
              <Link href="/tools" className="hover:text-foreground">
                Tools
              </Link>
            </li>
            <li aria-hidden="true">›</li>
            <li className="font-semibold text-foreground">
              Rental Property Tax Calculator
            </li>
          </ol>
        </nav>

        <p className="text-[11px] uppercase tracking-widest text-primary font-bold">
          Free calculator
        </p>
        <h1 className="mt-2 text-3xl sm:text-4xl font-extrabold text-foreground leading-tight tracking-tight">
          Rental Property Tax Calculator
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
          Most rental properties show positive cash flow but a Schedule E
          tax loss — thanks to depreciation. This calculator models gross
          rent, operating expenses, mortgage interest, and 27.5-year
          depreciation to show your true after-tax cash flow.
        </p>

        <div className="mt-8">
          <RentalPropertyTaxCalculatorWidget />
        </div>

        <section className="mt-12">
          <h2 className="text-xl sm:text-2xl font-extrabold text-foreground mb-3">
            The four big rental tax deductions
          </h2>
          <ul className="mt-3 space-y-2 text-base leading-relaxed text-foreground">
            <li>
              <strong>Operating expenses.</strong> Property tax, insurance,
              repairs, property management, utilities you pay, HOA, legal,
              advertising, and supplies may be deductible when they are ordinary,
              necessary, properly allocated, and otherwise allowed. Timing and
              treatment vary; improvements generally must be capitalized rather
              than deducted as repairs.
            </li>
            <li>
              <strong>Mortgage interest.</strong> The interest portion of
              your mortgage payment — not the principal. Big in year 1,
              tapers each year.
            </li>
            <li>
              <strong>Depreciation.</strong> 1/27.5th of the building basis
              per year in a simplified full-year residential-rental example.
              Basis allocation, placed-in-service timing, personal use, and
              passive-activity rules can materially change the result.
            </li>
            <li>
              <strong>Travel + home office (limited).</strong> Real estate
              education, mileage to check properties, portion of home office
              if you self-manage. Strict documentation required.
            </li>
          </ul>
          <p className="mt-3 text-base leading-relaxed text-foreground">
            For a deeper breakdown of every deductible expense category, see
            the full guide:{" "}
            <Link
              href="/blog/rental-property-tax-deductions"
              className="text-primary font-semibold hover:underline"
            >
              14 rental property tax deductions every landlord should know
            </Link>
            .
          </p>
        </section>

        <section className="mt-12">
          <h2 className="text-xl sm:text-2xl font-extrabold text-foreground mb-3">
            Why your cash flow and your taxable income disagree
          </h2>
          <p className="text-base leading-relaxed text-foreground">
            Cash flow and tax math measure two different things. Cash flow
            asks: how much money hit your account this year? Tax math asks:
            what does the IRS think your income was? Two big differences:
          </p>
          <ul className="mt-3 space-y-2 text-base leading-relaxed text-foreground">
            <li>
              <strong>Principal paydown is cash out but not deductible.</strong>{" "}
              You wrote a check for $1,200 of principal — it&apos;s gone from
              your bank — but the IRS treats it as equity, not an expense.
            </li>
            <li>
              <strong>Depreciation is deductible but not cash out.</strong>{" "}
              You didn&apos;t spend $8,727 this year — the IRS pretends you
              did. That phantom deduction often shifts a $5,000-positive
              cash flow year into a Schedule E paper loss.
            </li>
          </ul>
          <p className="mt-3 text-base leading-relaxed text-foreground">
            Use this when planning:{" "}
            <Link
              href="/glossary/cash-on-cash-return"
              className="text-primary font-semibold hover:underline"
            >
              cash-on-cash
            </Link>{" "}
            measures pre-tax dollars in your pocket;{" "}
            <Link
              href="/glossary/cap-rate"
              className="text-primary font-semibold hover:underline"
            >
              cap rate
            </Link>{" "}
            ignores financing + tax;{" "}
            <Link
              href="/glossary/cash-on-cash-return"
              className="text-primary font-semibold hover:underline"
            >
              ROI
            </Link>{" "}
            measures total return including the equity build. All three are
            useful — none of them tells you what you&apos;ll actually pay in
            tax. This calculator does.
          </p>
        </section>

        <section className="mt-12">
          <h2 className="text-xl sm:text-2xl font-extrabold text-foreground mb-4">
            Frequently asked questions
          </h2>
          <div className="divide-y divide-border rounded-2xl border border-border bg-card">
            {FAQS.map((f) => (
              <details key={f.q} className="group p-5">
                <summary className="cursor-pointer text-base font-bold text-foreground group-open:text-primary">
                  {f.q}
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {f.a}
                </p>
              </details>
            ))}
          </div>
        </section>

        <section className="mt-12 border-t border-border pt-8">
          <h2 className="text-xl sm:text-2xl font-extrabold text-foreground mb-3">
            Related calculators
          </h2>
          <div className="flex flex-wrap gap-2 text-sm">
            <Link
              href="/tools/cash-on-cash-calculator"
              className="rounded-full border border-border bg-card px-3 py-1.5 font-semibold text-foreground/80 hover:border-primary/40 hover:text-primary"
            >
              Cash-on-cash
            </Link>
            <Link
              href="/tools/roi-calculator"
              className="rounded-full border border-border bg-card px-3 py-1.5 font-semibold text-foreground/80 hover:border-primary/40 hover:text-primary"
            >
              ROI
            </Link>
            <Link
              href="/tools/mortgage-payment-calculator"
              className="rounded-full border border-border bg-card px-3 py-1.5 font-semibold text-foreground/80 hover:border-primary/40 hover:text-primary"
            >
              Mortgage payment
            </Link>
            <Link
              href="/blog/rental-property-tax-deductions"
              className="rounded-full border border-border bg-card px-3 py-1.5 font-semibold text-foreground/80 hover:border-primary/40 hover:text-primary"
            >
              Tax deductions guide
            </Link>
          </div>
        </section>

        {/* Backlink engine — quiet, collapsed, renders nothing if this

            tool has no embeddable widget. See the component header. */}

        <ToolEmbedInvite slug="rental-property-tax-calculator" />


        <ToolsConversionCta calculatorName="Rental property tax calculator" />
      </main>
      <SiteFooter />
    </div>
  );
}
