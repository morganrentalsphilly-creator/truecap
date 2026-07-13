/**
 * /vs/guesty — competitor comparison landing page.
 *
 * Target queries: "guesty alternative", "guesty vs hostaway", "guesty pricing", "guesty review", "enterprise str software".
 * Guesty is enterprise short-term rental property management software — built for STR managers running 50-5000+ properties. Two product lines: Guesty Lite (smaller) and Guesty for Pros (large operators).
 */

import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Calculator,
  Check,
  Minus,
  Sparkles,
  X,
} from "lucide-react";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SiteFooter } from "@/components/marketing/site-footer";
import { ScrollToFormButton } from "@/components/marketing/scroll-to-form-button";
import { ComparisonFaq, type FaqItem } from "@/components/marketing/comparison-faq";
import { getSiteUrl } from "@/lib/site-url";
import { VsBreadcrumbSchema } from "@/components/marketing/vs-breadcrumb-schema";

export const metadata: Metadata = {
  title: "TrueCap vs Guesty — honest comparison",
  description:
    "Guesty is enterprise STR management for 50+ property operators. TrueCap is the pre-purchase underwrite for solo and small-portfolio STR investors. Different worlds.",
  keywords: [
    "guesty alternative",
    "guesty vs hostaway",
    "guesty pricing",
    "guesty review",
    "enterprise str software",
  ],
  alternates: { canonical: "/vs/guesty" },
  openGraph: {
    title: "TrueCap vs Guesty — honest comparison",
    description:
      "Guesty is enterprise STR PM for 50+ properties. TrueCap is solo STR underwriting. Different worlds.",
    url: "/vs/guesty",
    type: "website",
    images: [{ url: "/home.jpg", width: 1200, height: 630, alt: "TrueCap vs Guesty" }],
  },
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
};

type Verdict = "truecap" | "guesty" | "tie";
type Row = { feature: string; truecap: string; guesty: string; winner: Verdict };

const MATRIX: Row[] = [
  { feature: "Primary audience", truecap: "Solo / small-portfolio STR investors (1-30 doors)", guesty: "Enterprise STR managers (50-5000+ properties)", winner: "tie" },
  { feature: "Lifecycle stage", truecap: "Pre-purchase — underwrite the STR deal", guesty: "Post-purchase — operate at enterprise scale", winner: "tie" },
  { feature: "Cap rate / CoC / DSCR analysis", truecap: "Yes — full engine, free tier", guesty: "Not modeled", winner: "truecap" },
  { feature: "10-year projection", truecap: "Pro — rent + expense + appreciation", guesty: "Not modeled", winner: "truecap" },
  { feature: "Address auto-fill (rent/rate/tax)", truecap: "Yes — HUD + FRED + state property tax", guesty: "Not applicable", winner: "truecap" },
  { feature: "Channel manager (Airbnb/Vrbo/Booking)", truecap: "No", guesty: "Yes — enterprise-grade", winner: "guesty" },
  { feature: "Multi-owner portal + accounting", truecap: "No", guesty: "Yes — owner statements + revenue splits", winner: "guesty" },
  { feature: "Open API for custom integrations", truecap: "No", guesty: "Yes — full REST API", winner: "guesty" },
  { feature: "AI assistant + automation", truecap: "No", guesty: "Yes — Guesty AI for guest messaging", winner: "guesty" },
  { feature: "Dynamic pricing integrations", truecap: "No", guesty: "Yes — full ecosystem", winner: "guesty" },
  { feature: "Free tier", truecap: "Yes — full underwriting math", guesty: "No — custom pricing only", winner: "truecap" },
  { feature: "Pricing (entry tier)", truecap: "Free; Pro $29.99/mo", guesty: "Custom pricing (typically $50-200+/mo per listing)", winner: "truecap" },
  { feature: "Built for solo investors", truecap: "Yes — 1-30 doors", guesty: "No — minimum spend assumes 30+ properties", winner: "truecap" },
];

export default function VsGuestyPage() {
  const siteUrl = getSiteUrl();
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "TrueCap vs Guesty — honest comparison",
    url: `${siteUrl}/vs/guesty`,
    description:
      "Guesty is enterprise STR management for 50+ property operators. TrueCap is the pre-purchase underwrite for solo and small-portfolio STR investors. Different worlds.",
    dateModified: "2026-06-07",
    publisher: { "@id": `${siteUrl}/#organization` },
  };

  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <VsBreadcrumbSchema vsPath="/vs/guesty" pageName="TrueCap vs Guesty" />
      <main id="main" className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="mb-2">
          <Link
            href="/"
            className="text-xs uppercase tracking-widest text-muted-foreground font-bold hover:text-foreground"
          >
            ← TrueCap
          </Link>
        </div>

        {/* Hero */}
        <section className="mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-card px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-primary mb-4">
            <Sparkles className="size-3" />
            Honest comparison
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-foreground leading-[1.05] tracking-tight text-balance">
            TrueCap vs Guesty:{" "}
            <span className="text-primary">underwrite the STR vs enterprise STR management</span>
          </h1>
          <p className="mt-4 max-w-2xl text-base sm:text-lg leading-relaxed text-muted-foreground">
            Guesty is enterprise short-term rental property management software — built for professional STR managers running 50-5000+ properties, including multi-owner portfolios. Two product lines: Guesty Lite (smaller operators) and Guesty for Pros (large managers). TrueCap is the pre-purchase underwriting calculator for solo and small-portfolio STR investors. Functionally different products for functionally different audiences.
          </p>
          <div className="mt-7 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            <ScrollToFormButton
              className="group inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground shadow-[0_12px_28px_rgba(0,112,196,0.28)] transition-transform hover:-translate-y-0.5"
            >
              <Calculator className="size-4" />
              Run a deal — 60 seconds
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </ScrollToFormButton>
            <Link
              href="/pricing"
              className="inline-flex h-12 items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-5 text-sm font-semibold text-foreground hover:bg-muted"
            >
              See TrueCap pricing
            </Link>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            No card · No signup · Cancel anytime
          </p>
        </section>

        {/* TL;DR */}
        <section className="mb-12 sm:mb-16 rounded-2xl border border-border bg-card p-6 sm:p-8">
          <h2 className="text-xl sm:text-2xl font-extrabold text-foreground mb-3">
            TL;DR
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-primary mb-2">
                Use TrueCap when
              </p>
              <ul className="space-y-1.5 text-sm leading-relaxed text-foreground">
                <li>You own 1-30 STR properties and want to underwrite the next one.</li>
                <li>You want cap rate, DSCR, cash flow before buying.</li>
                <li>You want a free tier — no enterprise contract.</li>
                <li>You&apos;re not running an STR property management business.</li>
              </ul>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                Use Guesty when
              </p>
              <ul className="space-y-1.5 text-sm leading-relaxed text-foreground">
                <li>You&apos;re an STR property management company running 50+ properties.</li>
                <li>You manage STRs for other owners and need multi-owner accounting.</li>
                <li>You need enterprise-grade channel management + API access.</li>
                <li>You have a team that needs role-based access control.</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Matrix */}
        <section className="mb-12 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground mb-2">
            Feature-by-feature
          </h2>
          <p className="text-base text-muted-foreground mb-6 leading-relaxed">
            Side-by-side on every dimension that matters for a comparison-shopping investor.
          </p>
          <div className="overflow-x-auto rounded-2xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr className="text-left">
                  <th className="py-3 px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Feature
                  </th>
                  <th className="py-3 px-3 text-[10px] font-bold uppercase tracking-widest text-primary">
                    TrueCap
                  </th>
                  <th className="py-3 px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Guesty
                  </th>
                </tr>
              </thead>
              <tbody>
                {MATRIX.map((row) => (
                  <tr key={row.feature} className="border-t border-border align-top">
                    <td className="py-3 px-3 text-sm font-semibold text-foreground">
                      <div className="flex items-center gap-2">
                        <WinnerBadge winner={row.winner} side="row" />
                        {row.feature}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-xs leading-relaxed text-foreground/85">
                      <div className="flex items-start gap-2">
                        <WinnerBadge winner={row.winner} side="truecap" />
                        <span>{row.truecap}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-xs leading-relaxed text-foreground/85">
                      <div className="flex items-start gap-2">
                        <WinnerBadge winner={row.winner} side="guesty" />
                        <span>{row.guesty}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            Guesty details based on publicly available product info as of 2026.
            See{" "}
            <a href="https://guesty.com" target="_blank" rel="noopener" className="underline">
              guesty.com
            </a>{" "}
            for their current state.
          </p>
        </section>

        {/* Complementary workflow */}
        <section className="mb-12 sm:mb-16 rounded-2xl border border-[var(--brand-green)]/25 bg-[var(--brand-green-light)] p-6 sm:p-8">
          <h2 className="text-xl sm:text-2xl font-extrabold text-[var(--brand-green)] mb-3">
            When STR investors graduate to Guesty
          </h2>
          <ol className="space-y-2.5 text-sm sm:text-base leading-relaxed text-foreground list-decimal pl-5">
            <li>
              <strong>Underwrite + buy 1-5 STRs with TrueCap.</strong> Solo investor workflow.
            </li>
            <li>
              <strong>Use Lodgify / Hostfully / Hostaway for ops as you scale.</strong> Mid-market tools that fit 1-50 STRs.
            </li>
            <li>
              <strong>Reach 50+ STRs as a manager.</strong> Now Guesty&apos;s enterprise features (multi-owner accounting, AI assistant, API) justify the cost.
            </li>
            <li>
              <strong>Keep TrueCap for new acquisitions.</strong> Guesty doesn&apos;t underwrite. Still need TrueCap or similar for the next property.
            </li>
          </ol>
          <p className="mt-4 text-sm leading-relaxed text-foreground">
            Want to see just the underwriting half? Try the{" "}
            <Link href="/tools/cap-rate-calculator" className="font-semibold text-primary hover:underline">
              cap rate calculator
            </Link>{" "}
            or the full{" "}
            <Link href="/" className="font-semibold text-primary hover:underline">
              TrueCap analyzer
            </Link>
            . Our guide on{" "}
            <Link href="/blog/how-to-underwrite-a-rental-property-in-60-seconds" className="font-semibold text-primary hover:underline">
              60-second underwriting
            </Link>{" "}
            walks through the workflow end-to-end.
          </p>
        </section>

        <ComparisonFaq competitorName="Guesty" items={GUESTY_FAQ} />

        {/* Pricing CTA */}
        <section className="mb-12 sm:mb-16 rounded-2xl bg-primary p-6 sm:p-8 text-primary-foreground">
          <h2 className="text-2xl sm:text-3xl font-extrabold mb-2">
            Underwrite the next deal — free.
          </h2>
          <p className="text-sm sm:text-base opacity-90 mb-5 max-w-2xl">
            TrueCap free covers cap rate, CoC, DSCR, NCF, and monthly cash flow.
            Pro unlocks projections, sensitivity, tax strategy, exit scenarios,
            MAO, PDF exports, and shareable read-only deal links.
            No card to start.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 bg-primary-foreground text-primary px-4 py-2.5 rounded-xl font-bold hover:opacity-90 transition-opacity"
            >
              Start a 3-day free trial
              <ArrowUpRight className="w-4 h-4" />
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-2 border border-primary-foreground/40 bg-primary-foreground/10 text-primary-foreground px-4 py-2.5 rounded-xl font-bold hover:bg-primary-foreground/20 transition-colors"
            >
              <Calculator className="w-4 h-4" />
              Run a deal now
            </Link>
          </div>
        </section>

        <footer className="border-t border-border pt-6 text-sm text-muted-foreground leading-relaxed">
          Other comparisons:{" "}
          <Link href="/vs/hostaway" className="font-bold text-foreground hover:underline">TrueCap vs Hostaway</Link>
          {" · "}
          <Link href="/vs/hostfully" className="font-bold text-foreground hover:underline">TrueCap vs Hostfully</Link>
          {" · "}
          <Link href="/vs/lodgify" className="font-bold text-foreground hover:underline">TrueCap vs Lodgify</Link>
        </footer>
      </main>
      <SiteFooter />
      <ScrollDepthTracker />
    </div>
  );
}

const GUESTY_FAQ: FaqItem[] = [
  {
    question: "Is TrueCap a Guesty alternative?",
    answer: (
      <>
        No — completely different audiences. Guesty is enterprise STR property management for managers running 50+ properties (often for multiple owners). TrueCap is pre-purchase underwriting for solo STR investors. Most TrueCap users are too small for Guesty.
      </>
    ),
    plainTextAnswer:
      "No — different audiences. Guesty is enterprise STR PM for 50+ properties. TrueCap is solo STR underwriting. Most TrueCap users are too small for Guesty.",
  },
  {
    question: "Is Guesty worth it for a small STR operator?",
    answer: (
      <>
        No. Guesty&apos;s pricing model is per-listing custom-quoted, typically $50-200+ per listing per month depending on features. For 1-5 STRs, you&apos;d be massively overpaying for unused features. Lodgify, Hostfully, or Hostaway are all more practical entry points.
      </>
    ),
    plainTextAnswer:
      "No. Guesty is $50-200+/listing/mo custom-quoted. For 1-5 STRs you&apos;d overpay for unused features. Lodgify, Hostfully, or Hostaway are more practical entry points.",
  },
  {
    question: "Guesty vs Hostaway — which one for a 50+ STR portfolio?",
    answer: (
      <>
        Close call. Hostaway scales well into the 100-200 range and is generally cheaper per listing. Guesty&apos;s edge is at the enterprise end (200+ properties, multi-owner accounting, AI features, API). For a manager scaling from 50→100 properties, Hostaway is usually the more practical choice; for a manager scaling 200+ or managing for many owners, Guesty&apos;s features start to earn their price.
      </>
    ),
    plainTextAnswer:
      "Close. Hostaway scales well to 100-200 and is cheaper per listing. Guesty&apos;s edge: 200+ properties, multi-owner accounting, AI, API. Scaling 50→100: Hostaway. 200+ or many owners: Guesty.",
  },
  {
    question: "Does Guesty underwrite deals?",
    answer: (
      <>
        No — it&apos;s purely operational. You&apos;d use TrueCap or a spreadsheet for pre-purchase underwriting, then ingest the property into Guesty post-closing.
      </>
    ),
    plainTextAnswer:
      "No — purely operational. Use TrueCap or a spreadsheet for pre-purchase underwriting, then ingest into Guesty post-closing.",
  },
  {
    question: "Guesty Lite vs Guesty for Pros?",
    answer: (
      <>
        Guesty Lite is the simplified product for smaller operators with simpler needs (channel management + basic automation). Guesty for Pros is the full enterprise platform (multi-owner accounting, AI, API, role-based access). The price difference is significant. If you&apos;re not running an STR business as a company, Lite is closer to your needs.
      </>
    ),
    plainTextAnswer:
      "Lite: simplified for smaller operators (channel mgmt + basic automation). Pros: full enterprise (multi-owner accounting, AI, API, RBAC). Significant price diff. Not running as a company: Lite.",
  },
];

function WinnerBadge({
  winner,
  side,
}: {
  winner: Verdict;
  side: "row" | "truecap" | "guesty";
}) {
  if (side === "row") return null;
  if (winner === "tie") {
    return <Minus className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/60" />;
  }
  if (winner === side) {
    return <Check className="mt-0.5 size-3.5 shrink-0 text-[var(--brand-green)]" />;
  }
  return <X className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/50" />;
}
