/**
 * /tools/roi-calculator — standalone SEO landing page.
 *
 * Targets: "rental property roi calculator", "investment property roi",
 * "real estate roi", "total return rental property".
 */

import type { Metadata } from "next";
import Link from "next/link";
import { getSiteUrl } from "@/lib/site-url";
import { RoiCalculatorWidget } from "@/components/tools/roi-calculator-widget";
import { ToolsConversionCta } from "@/components/marketing/tools-conversion-cta";
import { SiteFooter } from "@/components/marketing/site-footer";
import { ToolBreadcrumbSchema } from "@/components/marketing/tool-breadcrumb-schema";

export const metadata: Metadata = {
  title: "Rental Property ROI Calculator | Free | TrueCap",
  description:
    "Free total ROI calculator for rental properties. Combines cash flow + principal paydown + appreciation into one number — the real return on your investment, not just one piece of it.",
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
    title: "Rental Property ROI Calculator — Free",
    description: "Total return on a rental — cash flow + principal paydown + appreciation in one number.",
    url: "/tools/roi-calculator",
    type: "website",
    images: [{ url: "/home.jpg", width: 1200, height: 630, alt: "TrueCap rental property ROI calculator" }],
  },
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
};

const FAQS: { q: string; a: string }[] = [
  {
    q: "What's the formula for rental property ROI?",
    a: "Total ROI = (Annual cash flow + Annual principal paydown + Annual appreciation) ÷ Total cash invested. This captures the full return story — not just cash flow (cash-on-cash) and not just price growth (appreciation). The composite number is what your money actually returned over the year.",
  },
  {
    q: "What's a good ROI on a rental property?",
    a: "12%+ is strong for leveraged buy-and-hold. 18%+ is excellent (top decile). 8-12% is decent — better than most index funds long-term. Below 8% is bond-like and probably not worth the operational complexity of being a landlord unless you have non-financial reasons (1031 exchange, tax planning, geographic diversification).",
  },
  {
    q: "How is total ROI different from cash-on-cash return?",
    a: "Cash-on-cash only counts the annual cash flow piece. Total ROI adds principal paydown (the portion of mortgage payment building equity) plus appreciation. On a typical leveraged rental, total ROI is usually 2-3x the cash-on-cash number because the appreciation + equity components add meaningfully even when cash flow is modest.",
  },
  {
    q: "How is total ROI different from IRR?",
    a: "Total ROI is a single-year snapshot. IRR is annualized over the full holding period, including the exit sale. IRR is more accurate for long-hold analysis (10+ years) because it captures compounding. ROI is faster for back-of-napkin comparisons and works well for year-by-year decisions.",
  },
  {
    q: "Should I include tax savings in ROI?",
    a: "Optional but common. Adding the depreciation tax shield (after-tax) bumps ROI by 1-3 percentage points for a typical investor in a 24-32% bracket. This calculator focuses on pre-tax ROI for comparability; for after-tax modeling, use the full TrueCap analyzer.",
  },
];

export default function RoiCalculatorPage() {
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
      "Free total ROI calculator for rental properties. Combines cash flow + principal paydown + appreciation into one number — the real return on your investment, not just one piece of it.",
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
      "Full annualized return across hold period",
      "Compare against alternative investments",
    ],
  };

  return (
    <div className="min-h-screen bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareAppLd) }} />
      <ToolBreadcrumbSchema toolName="ROI Calculator" toolPath="/tools/roi-calculator" />

      <main className="mx-auto max-w-3xl px-4 sm:px-6 py-8 sm:py-12">
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
          The real ROI on a rental property is the SUM of three returns — annual cash flow, annual principal paydown, and annual appreciation — divided by the cash you put in. This calculator combines all three. Most investors look at only one and undercount their actual return.
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
            <li><strong>Appreciation:</strong> the property's market value increase. The most-volatile component, market-dependent.</li>
          </ul>
          <p className="mt-3 text-base leading-relaxed text-foreground">
            Sum the three, divide by cash invested (down payment + closing + initial rehab), and you have the actual annual return on YOUR capital.
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
            <Link href="/glossary/cash-on-cash-return" className="rounded-full border border-border bg-card px-3 py-1.5 font-semibold text-foreground/80 hover:border-primary/40 hover:text-primary">Cash-on-cash return</Link>
            <Link href="/glossary/irr" className="rounded-full border border-border bg-card px-3 py-1.5 font-semibold text-foreground/80 hover:border-primary/40 hover:text-primary">IRR</Link>
            <Link href="/glossary/appreciation-rate" className="rounded-full border border-border bg-card px-3 py-1.5 font-semibold text-foreground/80 hover:border-primary/40 hover:text-primary">Appreciation rate</Link>
            <Link href="/tools/cash-on-cash-calculator" className="rounded-full border border-border bg-card px-3 py-1.5 font-semibold text-foreground/80 hover:border-primary/40 hover:text-primary">Cash-on-cash calculator</Link>
            <Link href="/tools/break-even-calculator" className="rounded-full border border-border bg-card px-3 py-1.5 font-semibold text-foreground/80 hover:border-primary/40 hover:text-primary">Break-even calculator</Link>
          </div>
        </section>

        <ToolsConversionCta calculatorName="ROI calculator" />
      </main>
      <SiteFooter />
    </div>
  );
}
