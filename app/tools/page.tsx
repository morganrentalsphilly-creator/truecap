/**
 * /tools — landing page listing TrueCap's free public calculators.
 *
 * Each calculator is its own dedicated page (SEO ranking surface) and
 * funnels into the full TrueCap analyzer via CTA.
 *
 * The list, counts, and schema are all driven by lib/calculator-registry.ts
 * (the single source of truth) so /tools, /embed, the footer, the sitemap,
 * and the OG image can never disagree on how many calculators exist.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Calculator } from "lucide-react";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SiteFooter } from "@/components/marketing/site-footer";
import { getSiteUrl } from "@/lib/site-url";
import {
  CALCULATOR_REGISTRY,
  CALCULATOR_COUNT,
  CALCULATOR_COUNT_WORD,
  CALCULATOR_NAMES_LIST,
  calculatorsByCategory,
} from "@/lib/calculator-registry";

export const metadata: Metadata = {
  title: "Free Real Estate Calculators",
  description:
    "Free, no-signup rental property calculators. Cap rate, cash-on-cash, BRRRR, 1% rule, and more — backed by the same math that powers the TrueCap full analyzer.",
  alternates: { canonical: "/tools" },
  openGraph: {
    title: "Free Real Estate Calculators",
    description: `${CALCULATOR_COUNT_WORD} free rental property calculators — ${CALCULATOR_NAMES_LIST}. No signup.`,
    url: "/tools",
    type: "website",
    images: [{ url: "/home.jpg", width: 1200, height: 630, alt: "TrueCap free real estate calculators" }],
  },
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
};

export default function ToolsLandingPage() {
  const siteUrl = getSiteUrl();
  // CollectionPage + ItemList schema. Tells Google "this page is a
  // curated list of related tools" so it can render richer SERP
  // results (occasional carousel of items, clearer page-intent
  // signals). Each tool gets a position so the list isn't an
  // unordered bag of links. Driven entirely by the calculator registry.
  const collectionLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${siteUrl}/tools#collection`,
    name: "Free Real Estate Calculators",
    description: `${CALCULATOR_COUNT_WORD} free, no-signup rental property calculators — ${CALCULATOR_NAMES_LIST}.`,
    url: `${siteUrl}/tools`,
    isPartOf: { "@id": `${siteUrl}/#website` },
    mainEntity: {
      "@type": "ItemList",
      name: "TrueCap free calculators",
      itemListOrder: "https://schema.org/ItemListOrderAscending",
      numberOfItems: CALCULATOR_COUNT,
      itemListElement: CALCULATOR_REGISTRY.map((tool, idx) => ({
        "@type": "ListItem",
        position: idx + 1,
        url: `${siteUrl}/tools/${tool.slug}`,
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
          <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground mt-2 leading-tight">
            Free real estate calculators
          </h1>
          <p className="text-base text-muted-foreground mt-2 leading-relaxed">
            No signup. Same math that powers the full TrueCap analyzer —
            packaged as single-purpose tools so you can answer one question
            in seconds.
          </p>
        </header>

        {/* Grouped by job (registry categories) so investors can find the
            calculator for the question they're answering: screen a deal →
            finance it → model income/expenses → check returns → set an offer. */}
        <div className="space-y-9">
          {calculatorsByCategory().map((group) => (
            <section key={group.category} aria-labelledby={`cat-${group.category}`}>
              <h2
                id={`cat-${group.category}`}
                className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3"
              >
                {group.label}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {group.items.map((tool) => (
                  <Link
                    key={tool.slug}
                    href={`/tools/${tool.slug}`}
                    className="group bg-card border border-border rounded-2xl p-5 hover:border-primary transition-colors flex flex-col gap-2"
                  >
                    <div className="flex items-center justify-between">
                      <Calculator className="w-5 h-5 text-primary" />
                      <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <h3 className="font-bold text-foreground">{tool.title}</h3>
                    <p className="text-sm text-muted-foreground">{tool.description}</p>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>

        <section className="mt-10 rounded-2xl bg-primary text-primary-foreground p-6 sm:p-8">
          <h2 className="text-xl sm:text-2xl font-extrabold mb-2">
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
