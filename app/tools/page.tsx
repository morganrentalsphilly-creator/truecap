/**
 * /tools — landing page listing TrueCap's free public calculators.
 *
 * Each calculator is its own dedicated page (SEO ranking surface) and
 * funnels into the full TrueCap analyzer via CTA.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Calculator } from "lucide-react";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SiteFooter } from "@/components/marketing/site-footer";
import { getSiteUrl } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "Free Real Estate Calculators | TrueCap",
  description:
    "Free, no-signup rental property calculators. Cap rate, cash-on-cash, BRRRR, 1% rule, and more — backed by the same math that powers the TrueCap full analyzer.",
  alternates: { canonical: "/tools" },
  openGraph: {
    title: "Free Real Estate Calculators | TrueCap",
    description:
      "Nine free rental property calculators — cap rate, cash-on-cash, BRRRR, DSCR, NOI, mortgage, GRM, rehab, 1% rule. No signup.",
    url: "/tools",
    type: "website",
    images: [{ url: "/home.jpg", width: 1200, height: 630, alt: "TrueCap free real estate calculators" }],
  },
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
};

const TOOLS: { href: string; title: string; description: string; available: boolean }[] = [
  {
    href: "/tools/cap-rate-calculator",
    title: "Cap rate calculator",
    description:
      "Capitalization rate from price, rent, and operating expenses. Plus what counts as a good cap rate.",
    available: true,
  },
  {
    href: "/tools/cash-on-cash-calculator",
    title: "Cash-on-cash return calculator",
    description:
      "Return on the cash you actually invested. Includes mortgage and operating expense math.",
    available: true,
  },
  {
    href: "/tools/brrrr-calculator",
    title: "BRRRR calculator",
    description:
      "Buy, rehab, rent, refinance. Models the cash-out and post-refi cash flow.",
    available: true,
  },
  {
    href: "/tools/1-percent-rule-calculator",
    title: "1% rule calculator",
    description:
      "Quick screening filter for rental deals. Pass / fail in 5 seconds.",
    available: true,
  },
  {
    href: "/tools/rehab-cost-estimator",
    title: "Rehab cost estimator",
    description:
      "Sq-ft-based defaults for cosmetic, kitchen, bath, and systems work. Mid-market 2024-25 contractor pricing.",
    available: true,
  },
  {
    href: "/tools/dscr-calculator",
    title: "DSCR calculator",
    description:
      "Debt Service Coverage Ratio — the metric every lender wants. Plus what counts as bankable.",
    available: true,
  },
  {
    href: "/tools/noi-calculator",
    title: "NOI calculator",
    description:
      "Net Operating Income with every common operating expense + vacancy + operating-expense ratio.",
    available: true,
  },
  {
    href: "/tools/mortgage-payment-calculator",
    title: "Mortgage payment calculator",
    description:
      "PITI breakdown — principal, interest, taxes, insurance. Investment-property rates and amortization.",
    available: true,
  },
  {
    href: "/tools/gross-rent-multiplier-calculator",
    title: "GRM calculator",
    description:
      "Gross Rent Multiplier — the 10-second screening ratio for triaging deals before underwriting.",
    available: true,
  },
];

export default function ToolsLandingPage() {
  const siteUrl = getSiteUrl();
  // CollectionPage + ItemList schema. Tells Google "this page is a
  // curated list of related tools" so it can render richer SERP
  // results (occasional carousel of items, clearer page-intent
  // signals). Each tool gets a position so the list isn't an
  // unordered bag of links. Only available tools land in the schema
  // — coming-soon entries are excluded so we don't surface dead links.
  const collectionLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${siteUrl}/tools#collection`,
    name: "Free Real Estate Calculators",
    description:
      "Nine free, no-signup rental property calculators — cap rate, cash-on-cash, BRRRR, DSCR, NOI, mortgage payment, GRM, rehab cost, 1% rule.",
    url: `${siteUrl}/tools`,
    isPartOf: { "@id": `${siteUrl}/#website` },
    mainEntity: {
      "@type": "ItemList",
      name: "TrueCap free calculators",
      itemListOrder: "https://schema.org/ItemListOrderAscending",
      numberOfItems: TOOLS.filter((t) => t.available).length,
      itemListElement: TOOLS.filter((t) => t.available).map((tool, idx) => ({
        "@type": "ListItem",
        position: idx + 1,
        url: `${siteUrl}${tool.href}`,
        name: tool.title,
        description: tool.description,
      })),
    },
  };

  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionLd) }}
      />
      <main id="main" className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <header className="mb-8">
          <Link
            href="/"
            className="text-xs uppercase tracking-widest text-muted-foreground font-bold hover:text-foreground"
          >
            ← TrueCap
          </Link>
          <h1 className="text-3xl sm:text-4xl font-black text-foreground mt-2 leading-tight">
            Free real estate calculators
          </h1>
          <p className="text-base text-muted-foreground mt-2 leading-relaxed">
            No signup. Same math that powers the full TrueCap analyzer —
            packaged as single-purpose tools so you can answer one question
            in seconds.
          </p>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {TOOLS.map((tool) =>
            tool.available ? (
              <Link
                key={tool.title}
                href={tool.href}
                className="group bg-card border border-border rounded-2xl p-5 hover:border-primary transition-colors flex flex-col gap-2"
              >
                <div className="flex items-center justify-between">
                  <Calculator className="w-5 h-5 text-primary" />
                  <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <h2 className="font-bold text-foreground">{tool.title}</h2>
                <p className="text-sm text-muted-foreground">{tool.description}</p>
              </Link>
            ) : (
              <div
                key={tool.title}
                className="bg-card border border-border rounded-2xl p-5 opacity-60 flex flex-col gap-2"
              >
                <div className="flex items-center justify-between">
                  <Calculator className="w-5 h-5 text-muted-foreground" />
                  <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
                    Coming soon
                  </span>
                </div>
                <h2 className="font-bold text-foreground">{tool.title}</h2>
                <p className="text-sm text-muted-foreground">{tool.description}</p>
              </div>
            )
          )}
        </div>

        <section className="mt-10 rounded-2xl bg-primary text-primary-foreground p-6 sm:p-8">
          <h2 className="text-xl sm:text-2xl font-black mb-2">
            Want the full picture?
          </h2>
          <p className="text-sm sm:text-base opacity-90 mb-4">
            Single-purpose calculators are great for triaging deals. When
            you&apos;re ready to underwrite — cash flow, projections, tax
            savings, Deal Score, exit scenarios, BRRRR, fix-and-flip — open
            the full TrueCap analyzer. Free to start.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-primary-foreground text-primary px-4 py-2.5 rounded-xl font-bold hover:opacity-90 transition-opacity"
          >
            Open TrueCap
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </section>
      </main>
      <SiteFooter />
      <ScrollDepthTracker />
    </div>
  );
}
