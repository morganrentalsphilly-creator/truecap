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
import { SiteFooter } from "@/components/marketing/site-footer";
import { ToolBreadcrumbSchema } from "@/components/marketing/tool-breadcrumb-schema";

export const metadata: Metadata = {
  title: "Rental Property Tax Calculator | Schedule E + Depreciation | TrueCap",
  description:
    "Free rental property tax calculator. Models Schedule E taxable income, depreciation (27.5-year), mortgage interest deduction, and after-tax cash flow. Plus the depreciation tax shield value.",
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
    title: "Rental Property Tax Calculator — Free",
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
    a: "Rental income flows through Schedule E of your personal tax return. The math: gross rent minus operating expenses minus mortgage interest minus depreciation = Schedule E taxable income. That number is then taxed at your marginal income tax rate. Importantly, principal paydown is NOT a deduction — only interest is.",
  },
  {
    q: "What is rental property depreciation?",
    a: "The IRS lets you deduct 1/27.5th of the building's value every year for residential rental property — pretending the building wears out over 27.5 years even when it doesn't. On a $300,000 property with 80% building basis, that's $8,727/year of paper deduction. Most rental properties show a Schedule E tax loss even when they generate positive cash flow — because of depreciation.",
  },
  {
    q: "Can I deduct mortgage payments on rental property?",
    a: "Only the interest portion, not the principal. Principal paydown is treated as equity build, not an expense. This is why year-1 of a financed rental shows much bigger tax deductions than year-30 — early-year payments are 80%+ interest, late-year payments are 80%+ principal.",
  },
  {
    q: "How much of purchase price is land vs building?",
    a: "Land is non-depreciable. Most CPAs use 15-25% land allocation as a default — actual ratio depends on the local property tax assessor's split, comparable land sales in the area, or a formal appraisal. Higher land % = lower depreciation deduction. Get your CPA's view before filing; the IRS scrutinizes outlier ratios.",
  },
  {
    q: "What's the depreciation recapture issue?",
    a: "When you sell, the IRS 'recaptures' the depreciation you took — taxed at up to 25%. So depreciation isn't free money; it's a tax deferral. Two ways to defer the recapture: (1) hold forever and step up basis at death, or (2) 1031 exchange into another rental. Both push the tax liability indefinitely.",
  },
  {
    q: "Are passive losses always deductible?",
    a: "Not always. The IRS limits rental losses against ordinary income. If your AGI is under $100k, you can deduct up to $25k/yr of rental losses against ordinary income (phases out at $150k AGI). Above $150k, losses become 'suspended' — carried forward until you have rental income OR sell the property. Real estate professional status (REPS) bypasses this limit.",
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
      "Free rental property tax calculator. Models Schedule E taxable income, depreciation (27.5-year), mortgage interest deduction, and after-tax cash flow. Plus the depreciation tax shield value.",
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
      "27.5-year depreciation tax shield",
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
              advertising, supplies. All deductible in the year paid.
            </li>
            <li>
              <strong>Mortgage interest.</strong> The interest portion of
              your mortgage payment — not the principal. Big in year 1,
              tapers each year.
            </li>
            <li>
              <strong>Depreciation.</strong> 1/27.5th of the building basis
              per year. The single most powerful tax deduction in residential
              real estate — turns most cash-flow-positive rentals into
              tax-loss reporters.
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
              href="/glossary/roi"
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

        <ToolsConversionCta calculatorName="Rental property tax calculator" />
      </main>
      <SiteFooter />
    </div>
  );
}
