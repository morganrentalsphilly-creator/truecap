/**
 * /vs/appfolio — competitor comparison landing page.
 *
 * Target queries: "appfolio alternative", "appfolio vs", "appfolio pricing", "appfolio review", "enterprise property management".
 * AppFolio is post-purchase property-management software with quote-based
 * plans; its current Core pricing page states a 50-unit minimum.
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
  title: "AppFolio vs TrueCap (2026): PM vs Underwriting",
  description:
    "AppFolio is post-purchase property management software with quote-based plans. TrueCap is pre-purchase rental underwriting.",
  keywords: [
    "appfolio alternative",
    "appfolio vs",
    "appfolio pricing",
    "appfolio review",
    "enterprise property management",
  ],
  alternates: { canonical: "/vs/appfolio" },
  openGraph: {
    title: "AppFolio vs TrueCap (2026): PM vs Underwriting",
    description:
      "AppFolio is post-purchase property management software. TrueCap is pre-purchase rental underwriting.",
    url: "/vs/appfolio",
    type: "website",
    images: [{ url: "/home.jpg", width: 1200, height: 630, alt: "TrueCap vs AppFolio" }],
  },
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
};

type Verdict = "truecap" | "appfolio" | "tie";
type Row = { feature: string; truecap: string; appfolio: string; winner: Verdict };

const MATRIX: Row[] = [
  { feature: "Primary audience", truecap: "Solo / small-portfolio investors (1-30 doors)", appfolio: "Property managers and investment managers; Core states a 50-unit minimum", winner: "tie" },
  { feature: "Lifecycle stage", truecap: "Pre-purchase — underwrite the deal", appfolio: "Post-purchase — manage properties and residents", winner: "tie" },
  { feature: "Cap rate / CoC / DSCR analysis", truecap: "Yes — full engine, free tier", appfolio: "Not modeled", winner: "truecap" },
  { feature: "10-year projection", truecap: "Pro — rent + expense + appreciation", appfolio: "Not modeled", winner: "truecap" },
  { feature: "Illustrative tax impact", truecap: "Pro — depreciation + interest + modeled after-tax CF", appfolio: "Not modeled", winner: "truecap" },
  { feature: "Screening Index + verdict", truecap: "Free — 0-100 score + plain-English verdict", appfolio: "Not applicable", winner: "truecap" },
  { feature: "Address auto-fill (rent/rate/tax)", truecap: "Yes — HUD + FRED + state property tax", appfolio: "Not applicable", winner: "truecap" },
  { feature: "Property-management workflow", truecap: "No", appfolio: "Yes — multi-property operations", winner: "appfolio" },
  { feature: "Accounting + reporting at scale", truecap: "No", appfolio: "Yes — full GL, P&L, owner statements", winner: "appfolio" },
  { feature: "Resident services + utilities", truecap: "No", appfolio: "Yes — bundled smart-home, utility billing", winner: "appfolio" },
  { feature: "AI assistant for renters", truecap: "No", appfolio: "Yes — AI leasing assistant", winner: "appfolio" },
  { feature: "Free tier", truecap: "Yes — core cap rate, CoC, DSCR, and cash flow", appfolio: "No — paid only", winner: "truecap" },
  { feature: "Pricing (entry tier)", truecap: "Free core; paid Pro — see live pricing", appfolio: "Quote-based; Core states a minimum spend and 50-unit minimum", winner: "truecap" },
  { feature: "Smallest published portfolio", truecap: "Designed for 1-30 doors", appfolio: "Core states a 50-unit minimum", winner: "truecap" },
  { feature: "Shareable read-only deal link", truecap: "Free — read-only public link; Pro adds co-branding", appfolio: "Internal portal only", winner: "truecap" },
];

export default function VsAppfolioPage() {
  const siteUrl = getSiteUrl();
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "AppFolio vs TrueCap (2026): PM vs Underwriting",
    url: `${siteUrl}/vs/appfolio`,
    description:
      "AppFolio is post-purchase property management software with quote-based plans. TrueCap is pre-purchase rental underwriting.",
    dateModified: "2026-08-16",
    publisher: { "@id": `${siteUrl}/#organization` },
  };

  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <VsBreadcrumbSchema vsPath="/vs/appfolio" pageName="TrueCap vs AppFolio" />
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
            TrueCap vs AppFolio:{" "}
            <span className="text-primary">pre-purchase underwriting vs property management</span>
          </h1>
          <p className="mt-4 max-w-2xl text-base sm:text-lg leading-relaxed text-muted-foreground">
            AppFolio is post-purchase property management software for property managers and investment managers. Its current Core pricing page states a 50-unit minimum and minimum spend. TrueCap is a pre-purchase underwriting calculator for evaluating acquisitions. The products address different stages.
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
            Free analyzer: no card or signup
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
                <li>You own 1-30 doors and underwrite deals yourself.</li>
                <li>You want cap rate, DSCR, cash flow, projection before buying.</li>
                <li>You want a free tier — no enterprise contract.</li>
                <li>You&apos;re not running a property management company.</li>
              </ul>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                Use AppFolio when
              </p>
              <ul className="space-y-1.5 text-sm leading-relaxed text-foreground">
                <li>You manage at least 50 units and need AppFolio&apos;s operational workflow.</li>
                <li>You need PM-grade accounting, owner portals, vendor workflows at scale.</li>
                <li>You have multiple staff who need login access.</li>
                <li>You&apos;re managing for other owners as a fee-for-service business.</li>
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
                    AppFolio
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
                        <WinnerBadge winner={row.winner} side="appfolio" />
                        <span>{row.appfolio}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            AppFolio details based on publicly available product info as of 2026.
            See{" "}
            <a href="https://www.appfolio.com/pricing" target="_blank" rel="noopener" className="underline">
              AppFolio&apos;s official pricing page
            </a>{" "}
            for their current state.
          </p>
        </section>

        {/* Complementary workflow */}
        <section className="mb-12 sm:mb-16 rounded-2xl border border-[var(--brand-green)]/25 bg-[var(--brand-green-light)] p-6 sm:p-8">
          <h2 className="text-xl sm:text-2xl font-extrabold text-[var(--brand-green)] mb-3">
            When solo investors graduate to AppFolio
          </h2>
          <ol className="space-y-2.5 text-sm sm:text-base leading-relaxed text-foreground list-decimal pl-5">
            <li>
              <strong>Underwrite + buy 1-10 properties with TrueCap.</strong> Free or Pro tier — solo investor workflow.
            </li>
            <li>
              <strong>Scale to 30+ doors and use TurboTenant / Buildium / Stessa for ops.</strong> Mid-market tools that fit 30-200 units.
            </li>
            <li>
              <strong>Evaluate AppFolio once its published minimums fit.</strong> Core currently states a 50-unit minimum and minimum spend; request a current quote.
            </li>
            <li>
              <strong>Keep TrueCap for new acquisitions.</strong> AppFolio doesn&apos;t underwrite. Still need TrueCap or a similar calculator for new deals.
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

        <ComparisonFaq competitorName="AppFolio" items={APPFOLIO_FAQ} />

        {/* Pricing CTA */}
        <section className="mb-12 sm:mb-16 rounded-2xl bg-primary p-6 sm:p-8 text-primary-foreground">
          <h2 className="text-2xl sm:text-3xl font-extrabold mb-2">
            Underwrite the next deal — free.
          </h2>
          <p className="text-sm sm:text-base opacity-90 mb-5 max-w-2xl">
            TrueCap free covers cap rate, CoC, DSCR, NCF, and monthly cash flow.
            Pro unlocks projections, sensitivity, illustrative tax impact, modeled exit comparisons,
            Offer Ceiling, co-branded share links, and PDF reports with Pro; see live pricing for current terms.
            No card to start.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 bg-primary-foreground text-primary px-4 py-2.5 rounded-xl font-bold hover:opacity-90 transition-opacity"
            >
              See Pro pricing
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
          <Link href="/vs/buildium" className="font-bold text-foreground hover:underline">TrueCap vs Buildium</Link>
          {" · "}
          <Link href="/vs/rentec-direct" className="font-bold text-foreground hover:underline">TrueCap vs Rentec Direct</Link>
          {" · "}
          <Link href="/vs/turbotenant" className="font-bold text-foreground hover:underline">TrueCap vs TurboTenant</Link>
        </footer>
      </main>
      <SiteFooter />
      <ScrollDepthTracker />
    </div>
  );
}

const APPFOLIO_FAQ: FaqItem[] = [
  {
    question: "Is TrueCap an AppFolio alternative?",
    answer: (
      <>
        Not directly. AppFolio handles post-purchase property management, while TrueCap handles pre-purchase acquisition underwriting. A manager may use both at different stages.
      </>
    ),
    plainTextAnswer:
      "Not directly. AppFolio handles post-purchase property management, while TrueCap handles pre-purchase acquisition underwriting. A manager may use both at different stages.",
  },
  {
    question: "Is AppFolio worth it for a small landlord?",
    answer: (
      <>
        AppFolio&apos;s current Core pricing page states a 50-unit minimum and minimum spend, with quote-based pricing. A smaller landlord should confirm eligibility, obtain the current quote, and compare the operational features with alternatives rather than assume a published per-unit rate.
      </>
    ),
    plainTextAnswer:
      "AppFolio's current Core pricing page states a 50-unit minimum and minimum spend, with quote-based pricing. Confirm eligibility, obtain a current quote, and compare the operational features with alternatives.",
  },
  {
    question: "Does AppFolio underwrite deals?",
    answer: (
      <>
        No. AppFolio is purely operational. You&apos;d use a separate calculator (TrueCap, DealCheck) to underwrite acquisitions and then ingest the property into AppFolio post-closing.
      </>
    ),
    plainTextAnswer:
      "No. AppFolio is purely operational. Use TrueCap or DealCheck to underwrite, then ingest the property into AppFolio post-closing.",
  },
  {
    question: "AppFolio vs Buildium — which is the easier upgrade from spreadsheets?",
    answer: (
      <>
        Compare each vendor&apos;s current minimums, quote, accounting, resident, owner, maintenance, support, and implementation features. AppFolio&apos;s Core plan currently states a 50-unit minimum; Buildium publishes tiered entry pricing on its own pricing page.
      </>
    ),
    plainTextAnswer:
      "Compare current minimums, quotes, accounting, resident, owner, maintenance, support, and implementation features. AppFolio Core currently states a 50-unit minimum; Buildium publishes tiered entry pricing.",
  },
  {
    question: "What does TrueCap not do that AppFolio does?",
    answer: (
      <>
        Everything in the operational stack — tenant management, lease workflows, accounting, vendor management, owner portals, resident services, smart-home integration. TrueCap is intentionally scope-limited to pre-purchase underwriting.
      </>
    ),
    plainTextAnswer:
      "Everything operational — tenant management, lease workflows, accounting, vendor management, owner portals, resident services, smart-home. TrueCap is scope-limited to pre-purchase underwriting.",
  },
];

function WinnerBadge({
  winner,
  side,
}: {
  winner: Verdict;
  side: "row" | "truecap" | "appfolio";
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
