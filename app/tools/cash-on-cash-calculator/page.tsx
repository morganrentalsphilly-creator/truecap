import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Check } from "lucide-react";
import { getSiteUrl } from "@/lib/site-url";
import { CocCalculatorWidget } from "@/components/tools/coc-calculator-widget";
import { ToolsConversionCta } from "@/components/marketing/tools-conversion-cta";

import { SiteFooter } from "@/components/marketing/site-footer";
import { ToolBreadcrumbSchema } from "@/components/marketing/tool-breadcrumb-schema";
export const metadata: Metadata = {
  title: "Cash-on-Cash Return Calculator | Free Rental Property Tool | TrueCap",
  description:
    "Free cash-on-cash return calculator for rental property. Computes annual cash flow ÷ cash invested with built-in mortgage math. Plus what counts as a good CoC return.",
  keywords: [
    "cash on cash calculator",
    "cash on cash return calculator",
    "rental property cash on cash",
    "what is a good cash on cash return",
    "cash on cash vs cap rate",
    "CoC return real estate",
  ],
  alternates: { canonical: "/tools/cash-on-cash-calculator" },
  openGraph: {
    title: "Cash-on-Cash Return Calculator — Free",
    description:
      "Compute cash-on-cash return in seconds. Walks through purchase, financing, rent, and expenses — no spreadsheet needed.",
    url: "/tools/cash-on-cash-calculator",
    type: "website",
    images: [{ url: "/home.jpg", width: 1200, height: 630, alt: "TrueCap cash-on-cash calculator" }],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/home.jpg"],
  },
};

const FAQS: { q: string; a: string }[] = [
  {
    q: "What is cash-on-cash return?",
    a: "Cash-on-cash return (CoC) is the annual pre-tax cash flow a property generates divided by the total cash you put into the deal — down payment plus closing costs plus any rehab. It tells you how hard your invested money is working, factoring in leverage.",
  },
  {
    q: "What's a good cash-on-cash return?",
    a: "Most buy-and-hold investors target 8–12% as a healthy range. Below 4% you're probably under-leveraged or overpaying. 12%+ is strong cash flow — common in Midwest and Southern markets. Above 20% deserves a sanity-check: verify rents are realistic and expenses are fully reserved.",
  },
  {
    q: "What's the difference between cash-on-cash and cap rate?",
    a: "Cap rate ignores financing — it measures the property as an asset. Cash-on-cash includes financing — it measures your money's return. Two buyers can produce wildly different CoC returns on the same property by varying the down payment, but the cap rate stays the same.",
  },
  {
    q: "Does cash-on-cash include appreciation or principal paydown?",
    a: "No. CoC measures only the cash that hits your checking account each year. Appreciation and principal paydown are real returns but they show up in total ROI or IRR over the hold period, not in CoC.",
  },
  {
    q: "How do I include closing costs in cash-on-cash?",
    a: "Add them to your total cash invested. CoC = annual cash flow ÷ (down payment + closing costs + any rehab). Closing costs typically run 2–4% of purchase price; leaving them out inflates the CoC return on paper.",
  },
  {
    q: "What if I buy with cash — no mortgage?",
    a: "Then cash-on-cash equals cap rate (minus the small drag of closing costs in CoC's denominator). The benefit of cash purchases is simplicity and no DSCR worry; the cost is that all your equity is locked into one asset.",
  },
];

export default function CoCCalculatorPage() {
  const siteUrl = getSiteUrl();

  const webAppLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "TrueCap Cash-on-Cash Return Calculator",
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web",
    dateModified: "2026-06-01",
    url: `${siteUrl}/tools/cash-on-cash-calculator`,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    description:
      "Free online calculator for cash-on-cash return on rental property, including mortgage math and operating expense estimation.",
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
    name: "Cash-on-Cash Return Calculator",
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "Real Estate Calculator",
    operatingSystem: "Web",
    description:
      "Free cash-on-cash return calculator for rental property. Computes annual cash flow ÷ cash invested with built-in mortgage math. Plus what counts as a good CoC return.",
    url: `${siteUrl}/tools/cash-on-cash-calculator`,
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
      "Compute cash-on-cash from cash invested + annual cash flow",
      "Include closing costs + reserves",
      "Compare to alternative investments",
    ],
  };

  return (
    <>
      <ToolBreadcrumbSchema toolPath="/tools/cash-on-cash-calculator" toolName="Cash-on-cash return calculator" />
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
              Cash-on-Cash Return Calculator
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground mt-2 leading-relaxed">
              How hard is the cash you actually invested working? CoC is the
              clearest answer — and the metric most buy-and-hold investors
              use to decide whether a deal beats their other options.
            </p>
          </header>

          <CocCalculatorWidget />

          <article className="prose prose-slate max-w-none mt-10 sm:mt-12 [&_p]:leading-relaxed [&_p]:text-foreground [&_h2]:font-extrabold [&_h2]:text-foreground [&_h2]:mt-10 [&_h2]:mb-3 [&_h3]:font-bold [&_h3]:text-foreground [&_h3]:mt-6 [&_h3]:mb-2 [&_li]:text-foreground">
            <h2 className="text-2xl sm:text-3xl">What is cash-on-cash return?</h2>
            <p>
              Cash-on-cash return measures the annual cash flow a property
              generates as a percentage of the actual cash you invested to
              acquire it. It&apos;s the &ldquo;return on the money you put
              in&rdquo; — and unlike cap rate, it accounts for financing.
            </p>

            <h3>The formula</h3>
            <div className="bg-card border border-border rounded-xl p-5 sm:p-6 my-4 text-center">
              <div className="text-base sm:text-lg font-mono">
                <span className="font-bold">CoC</span> = Annual cash flow ÷ Total cash invested
              </div>
              <div className="text-sm text-muted-foreground mt-2">
                e.g. $7,200/yr cash flow ÷ $60,000 down + closing = 12.0% CoC
              </div>
            </div>

            <h2 className="text-2xl sm:text-3xl">What goes into annual cash flow</h2>
            <p>Start with monthly rent. Subtract every monthly outflow:</p>
            <ul>
              <li>Mortgage principal + interest</li>
              <li>Property taxes</li>
              <li>Insurance</li>
              <li>HOA (if any)</li>
              <li>Owner-paid utilities</li>
              <li>Property management fees</li>
              <li>Maintenance, vacancy, and CapEx reserves</li>
            </ul>
            <p>
              Multiply the result by 12 for annual cash flow. The calculator
              above does this automatically using your inputs.
            </p>

            <h2 className="text-2xl sm:text-3xl">What goes into total cash invested</h2>
            <ul>
              <li>Down payment (price × down payment %)</li>
              <li>Closing costs (typically 2–4% of price)</li>
              <li>Any upfront rehab</li>
              <li>Loan points or origination fees, if paid out of pocket</li>
            </ul>
            <p>
              Don&apos;t include the mortgage balance — that&apos;s the bank&apos;s
              money, not yours.
            </p>

            <h2 className="text-2xl sm:text-3xl">What&apos;s a good cash-on-cash return?</h2>
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <table className="w-full text-sm border-collapse my-4">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-3 font-bold">Range</th>
                    <th className="text-left py-2 px-3 font-bold">Profile</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border">
                    <td className="py-2 px-3 font-mono">&lt; 4%</td>
                    <td className="py-2 px-3">Under-leveraged or overpaying. Money would work harder elsewhere.</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="py-2 px-3 font-mono">4–8%</td>
                    <td className="py-2 px-3">Common for appreciation-focused coastal markets.</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="py-2 px-3 font-mono">8–12%</td>
                    <td className="py-2 px-3">Healthy target for most buy-and-hold investors.</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="py-2 px-3 font-mono">12–20%</td>
                    <td className="py-2 px-3">Strong — typical of Midwest / Sun Belt cash-flow markets.</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-mono">20%+</td>
                    <td className="py-2 px-3">Verify rents and reserves — possible over-optimism.</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p>
              Compare your CoC to what the cash would do somewhere else: 5%
              in a high-yield savings account, ~10% historical S&amp;P 500
              return, or another deal. If your CoC is well below those, you
              need appreciation, tax savings, and principal paydown to
              justify the deal.
            </p>

            <h2 className="text-2xl sm:text-3xl">CoC isn&apos;t the whole story</h2>
            <p>
              Real estate offers four other return components CoC doesn&apos;t
              capture: appreciation, principal paydown (mortgage amortization
              builds your equity), tax savings from depreciation, and
              forced equity from value-add work. Total ROI / IRR over the
              hold period includes all of these.
            </p>
            <p>
              Use CoC for &ldquo;does this deal beat my other options for
              cash today?&rdquo; — and use the full TrueCap analyzer for the
              after-tax, multi-year, exit-aware view.
            </p>

            <h2 className="text-2xl sm:text-3xl">Common mistakes</h2>
            <h3>1. Ignoring closing costs</h3>
            <p>
              Leaving them out of the denominator inflates CoC. A 12% CoC
              becomes 10.5% when you add typical closing costs. The realistic
              number is the one to plan around.
            </p>
            <h3>2. Forgetting reserves</h3>
            <p>
              Maintenance, vacancy, and CapEx aren&apos;t monthly bills —
              they&apos;re infrequent but expensive. A property that
              cash-flows $400/mo before reserves often cash-flows $50/mo
              after honest ones.
            </p>
            <h3>3. Comparing across markets</h3>
            <p>
              A 12% CoC in Cleveland is normal. A 12% CoC in San Francisco
              is suspicious. Compare CoC within a market, not across markets.
            </p>

            <h2 className="text-2xl sm:text-3xl">Frequently asked questions</h2>
            <div className="space-y-4">
              {FAQS.map((f) => (
                <details key={f.q} className="bg-card border border-border rounded-lg p-4 group">
                  <summary className="font-semibold text-foreground cursor-pointer list-none flex items-start justify-between gap-3">
                    <span>{f.q}</span>
                    <span className="text-muted-foreground text-xl leading-none group-open:rotate-45 transition-transform">+</span>
                  </summary>
                  <p className="text-sm text-muted-foreground leading-relaxed mt-3">{f.a}</p>
                </details>
              ))}
            </div>
          </article>

          <section className="mt-10 sm:mt-12 rounded-2xl bg-primary text-primary-foreground p-6 sm:p-8">
            <h2 className="text-xl sm:text-2xl font-extrabold mb-2">Run the full analysis — free</h2>
            <p className="text-sm sm:text-base opacity-90 mb-4">
              Cap rate, DSCR, 10-year projections, tax savings, exit
              scenarios, and a Deal Score — all from the same property
              inputs you used here.
            </p>
            <ul className="text-sm space-y-1.5 mb-5 opacity-90">
              {[
                "Full cash-flow model with rent + expense growth",
                "Depreciation modeling and tax savings projection",
                "DSCR readout sized to lender thresholds",
                "Sell / refi / hold exit comparison",
                "BRRRR + fix-and-flip strategy calculators included",
                "Free to start — no credit card",
              ].map((line) => (
                <li key={line} className="flex items-start gap-2">
                  <Check className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
            <Link href="/" className="inline-flex items-center gap-2 bg-primary-foreground text-primary px-4 py-2.5 rounded-xl font-bold hover:opacity-90 transition-opacity">
              Open the full TrueCap analyzer
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </section>

          <ToolsConversionCta calculatorName="Cash-on-cash calculator" hook="The TrueCap analyzer adds 10-year cash flow projection, tax savings, and exit scenarios on top of cash-on-cash — so you can see whether the modest year-1 return becomes a great long-term play." />

          <footer className="mt-12 pt-8 border-t border-border text-center text-xs text-muted-foreground">
            Built with{" "}
            <Link href="/" className="font-bold text-foreground hover:underline">TrueCap</Link>{" "}
            — institutional-grade rental analysis, free to start.
          </footer>
        </main>
        <SiteFooter />
      </div>
    </>
  );
}
