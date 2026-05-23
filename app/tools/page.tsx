/**
 * /tools — landing page listing TrueCap's free public calculators.
 *
 * Each calculator is its own dedicated page (SEO ranking surface) and
 * funnels into the full TrueCap analyzer via CTA.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Calculator } from "lucide-react";

export const metadata: Metadata = {
  title: "Free Real Estate Calculators | TrueCap",
  description:
    "Free, no-signup rental property calculators. Cap rate, cash-on-cash, BRRRR, 1% rule, and more — backed by the same math that powers the TrueCap full analyzer.",
  alternates: { canonical: "/tools" },
};

const TOOLS: { href: string; title: string; description: string; available: boolean }[] = [
  {
    href: "/tools/cap-rate-calculator",
    title: "Cap rate calculator",
    description:
      "Capitalization rate from price, rent, and operating expenses. Plus what counts as a good cap rate.",
    available: true,
  },
  // Forthcoming — listed as 'coming soon' so the page hints at depth without
  // broken links.
  { href: "#", title: "Cash-on-cash return calculator", description: "Return on the cash you actually invested.", available: false },
  { href: "#", title: "BRRRR calculator", description: "Buy, rehab, rent, refinance — cash-out math.", available: false },
  { href: "#", title: "1% rule calculator", description: "Quick screening filter for rental deals.", available: false },
  { href: "#", title: "Rehab cost estimator", description: "Sq-ft-based defaults for cosmetic, kitchen, bath, systems.", available: false },
];

export default function ToolsLandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
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
    </div>
  );
}
