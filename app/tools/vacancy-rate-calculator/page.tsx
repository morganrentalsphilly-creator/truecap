/**
 * /tools/vacancy-rate-calculator — standalone SEO landing page.
 *
 * Targets: "vacancy rate calculator", "rental vacancy rate",
 * "how to calculate vacancy rate", "what is a good vacancy rate".
 */

import type { Metadata } from "next";
import Link from "next/link";
import { getSiteUrl } from "@/lib/site-url";
import { VacancyRateCalculatorWidget } from "@/components/tools/vacancy-rate-calculator-widget";
import { ToolsConversionCta } from "@/components/marketing/tools-conversion-cta";
import { SiteFooter } from "@/components/marketing/site-footer";
import { ToolBreadcrumbSchema } from "@/components/marketing/tool-breadcrumb-schema";

export const metadata: Metadata = {
  title: "Vacancy Rate Calculator | Free Rental Property Tool | TrueCap",
  description:
    "Free vacancy rate calculator for rental properties. Convert vacant days + turnover cost into a true effective vacancy rate. Plus what a realistic vacancy assumption looks like — most sellers under-quote it.",
  keywords: [
    "vacancy rate calculator",
    "rental vacancy rate",
    "how to calculate vacancy rate",
    "what is a good vacancy rate",
    "rental property vacancy",
    "vacancy loss calculator",
  ],
  alternates: { canonical: "/tools/vacancy-rate-calculator" },
  openGraph: {
    title: "Vacancy Rate Calculator — Free",
    description:
      "Compute effective vacancy rate on a rental property — including turnover cost. Honest vacancy modeling for accurate cash flow.",
    url: "/tools/vacancy-rate-calculator",
    type: "website",
    images: [
      {
        url: "/home.jpg",
        width: 1200,
        height: 630,
        alt: "TrueCap vacancy rate calculator",
      },
    ],
  },
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
};

const FAQS: { q: string; a: string }[] = [
  {
    q: "What is a good vacancy rate for rental property?",
    a: "National average on long-term residential rentals runs 7-9%. Anything under 5% is aggressive — that assumes 18 days or less of vacancy per year, which is unusual outside of high-demand urban cores. For underwriting, use 8% as a default unless you have hard local data showing lower.",
  },
  {
    q: "How do you calculate vacancy rate?",
    a: "Vacancy rate = (annual vacancy loss ÷ annual gross potential rent) × 100. Annual vacancy loss = (vacant days × daily rent) + turnover costs (cleaning, repairs, listing fees). The calculator above does this math automatically. Most listing brochures quote 5%, which is optimistic — model 7-9% to be safe.",
  },
  {
    q: "What's included in vacancy loss?",
    a: "Two components: (1) lost rent during the actual vacant days between tenants, and (2) turnover cost — cleaning, paint touch-up, minor repairs, listing fees, and the property manager's lease-up fee (typically half a month's rent or 50% of one month's rent). Skipping turnover costs makes your vacancy rate look 1-2 percentage points lower than reality.",
  },
  {
    q: "Why do sellers under-quote vacancy?",
    a: "Because lower vacancy = higher pro forma cap rate = higher asking price. A 5% vacancy quoted instead of 8% can lift a property's apparent NOI by $400-700/yr on a $20k-rent rental — which inflates the asking price by $5-10k at a 7% cap. Always re-underwrite with your own vacancy assumption.",
  },
  {
    q: "Does vacancy rate vary by market?",
    a: "Yes. Tertiary markets and single-employer towns run 9-12%. Stable mid-tier cities run 6-9%. High-demand urban cores (Brooklyn, Boston, SF) can run 3-5%. Class C properties consistently run higher vacancy than Class A, even in the same city. Always use realistic numbers for your specific submarket — your local property manager can give you 12-month historical vacancy on comparable units.",
  },
];

export default function VacancyRateCalculatorPage() {
  const siteUrl = getSiteUrl();
  const ld = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Vacancy Rate Calculator — TrueCap",
    description: "Free rental property vacancy rate calculator.",
    url: `${siteUrl}/tools/vacancy-rate-calculator`,
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
      <ToolBreadcrumbSchema
        toolName="Vacancy Rate Calculator"
        toolPath="/tools/vacancy-rate-calculator"
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
              Vacancy Rate Calculator
            </li>
          </ol>
        </nav>

        <p className="text-[11px] uppercase tracking-widest text-primary font-bold">
          Free calculator
        </p>
        <h1 className="mt-2 text-3xl sm:text-4xl font-extrabold text-foreground leading-tight tracking-tight">
          Rental Property Vacancy Rate Calculator
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
          National average vacancy on residential rentals runs 7-9%. Most
          listing brochures quote 5%. The gap is where deals quietly fail.
          This calculator converts vacant days + turnover cost into the true
          effective vacancy rate to use in your underwrite.
        </p>

        <div className="mt-8">
          <VacancyRateCalculatorWidget />
        </div>

        <section className="mt-12">
          <h2 className="text-xl sm:text-2xl font-extrabold text-foreground mb-3">
            How to model vacancy honestly
          </h2>
          <p className="text-base leading-relaxed text-foreground">
            Three rules that separate honest underwriters from sellers&apos; pro
            formas:
          </p>
          <ul className="mt-3 space-y-2 text-base leading-relaxed text-foreground">
            <li>
              <strong>Include turnover cost.</strong> Even a 14-day vacancy
              with $400 of cleaning + paint costs 18-21 days of equivalent
              lost rent. Most brochures count only the vacant days.
            </li>
            <li>
              <strong>Match to property class.</strong> Class A urban-core
              properties: 4-6%. Class B mid-tier: 7-9%. Class C and tertiary
              markets: 10-12%. Single-employer towns: even higher.
            </li>
            <li>
              <strong>Verify with a local PM.</strong> Property managers will
              quote 12-month historical vacancy on comparable units in your
              submarket. That number always beats Zillow rent estimates and
              the seller&apos;s pro forma.
            </li>
          </ul>
          <p className="mt-3 text-base leading-relaxed text-foreground">
            Vacancy is part of your{" "}
            <Link
              href="/glossary/operating-expenses"
              className="text-primary font-semibold hover:underline"
            >
              effective gross income calculation
            </Link>
            , which feeds into{" "}
            <Link
              href="/glossary/noi"
              className="text-primary font-semibold hover:underline"
            >
              NOI
            </Link>{" "}
            and{" "}
            <Link
              href="/glossary/cap-rate"
              className="text-primary font-semibold hover:underline"
            >
              cap rate
            </Link>
            . Under-modeling vacancy by 3 points inflates cap rate by 0.3-0.5
            points — enough to make a marginal deal look like a winner.
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
              href="/tools/cap-rate-calculator"
              className="rounded-full border border-border bg-card px-3 py-1.5 font-semibold text-foreground/80 hover:border-primary/40 hover:text-primary"
            >
              Cap rate
            </Link>
            <Link
              href="/tools/noi-calculator"
              className="rounded-full border border-border bg-card px-3 py-1.5 font-semibold text-foreground/80 hover:border-primary/40 hover:text-primary"
            >
              NOI
            </Link>
            <Link
              href="/tools/cash-on-cash-calculator"
              className="rounded-full border border-border bg-card px-3 py-1.5 font-semibold text-foreground/80 hover:border-primary/40 hover:text-primary"
            >
              Cash-on-cash
            </Link>
            <Link
              href="/glossary/vacancy-rate"
              className="rounded-full border border-border bg-card px-3 py-1.5 font-semibold text-foreground/80 hover:border-primary/40 hover:text-primary"
            >
              Vacancy rate
            </Link>
          </div>
        </section>

        <ToolsConversionCta calculatorName="Vacancy rate calculator" />
      </main>
      <SiteFooter />
    </div>
  );
}
