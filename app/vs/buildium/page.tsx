/**
 * /vs/buildium — competitor comparison landing page.
 *
 * Target queries: "buildium alternative", "buildium vs", "buildium pricing", "buildium review", "property management software".
 * Buildium is post-purchase property-management software for landlords and
 * property managers. TrueCap covers pre-purchase underwriting.
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
  title: "Buildium vs TrueCap (2026): PM vs Deal Analysis",
  description:
    "Buildium manages rentals after purchase. TrueCap underwrites potential acquisitions before purchase. Compare the distinct workflows.",
  keywords: [
    "buildium alternative",
    "buildium vs",
    "buildium pricing",
    "buildium review",
    "property management software",
  ],
  alternates: { canonical: "/vs/buildium" },
  openGraph: {
    title: "Buildium vs TrueCap (2026): PM vs Deal Analysis",
    description:
      "Buildium manages rentals after purchase. TrueCap underwrites potential acquisitions before purchase.",
    url: "/vs/buildium",
    type: "website",
    images: [{ url: "/home.jpg", width: 1200, height: 630, alt: "TrueCap vs Buildium" }],
  },
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
};

type Verdict = "truecap" | "buildium" | "tie";
type Row = { feature: string; truecap: string; buildium: string; winner: Verdict };

const MATRIX: Row[] = [
  { feature: "Primary audience", truecap: "Solo / small-portfolio investors (1-30 doors)", buildium: "Landlords and professional property managers", winner: "tie" },
  { feature: "Lifecycle stage", truecap: "Pre-purchase — underwrite the deal", buildium: "Post-purchase — operate at scale", winner: "tie" },
  { feature: "Cap rate / CoC / DSCR analysis", truecap: "Yes — full engine, free tier", buildium: "Not modeled", winner: "truecap" },
  { feature: "10-year projection", truecap: "Pro — rent + expense + appreciation", buildium: "Not modeled", winner: "truecap" },
  { feature: "Secondary Screening Index", truecap: "Free — 0-100 triage score + factor breakdown", buildium: "Not applicable", winner: "truecap" },
  { feature: "Address auto-fill (rent/rate/tax)", truecap: "Yes — HUD + FRED + state property tax", buildium: "Not applicable", winner: "truecap" },
  { feature: "Tenant + lease management", truecap: "No", buildium: "Yes — portfolio operations", winner: "buildium" },
  { feature: "Accounting (GL, P&L, balance sheet)", truecap: "No", buildium: "Yes — full PM-grade accounting", winner: "buildium" },
  { feature: "Owner reports + portals", truecap: "No", buildium: "Yes — multi-owner statement generation", winner: "buildium" },
  { feature: "Maintenance vendor management", truecap: "No", buildium: "Yes — full work-order workflow", winner: "buildium" },
  { feature: "Free tier", truecap: "Yes — core cap rate, CoC, DSCR, and cash flow", buildium: "No permanent free tier; 14-day trial", winner: "truecap" },
  { feature: "Pricing (entry tier)", truecap: "Free core; paid Pro — see live pricing", buildium: "Paid Essential, Growth, and Premium tiers — see live pricing", winner: "truecap" },
  { feature: "Post-purchase portfolio operations", truecap: "No", buildium: "Yes — landlord and property-manager workflows", winner: "buildium" },
  { feature: "Shareable read-only deal link", truecap: "Free — read-only public link; Pro adds co-branding", buildium: "Internal portal only", winner: "truecap" },
];

export default function VsBuildiumPage() {
  const siteUrl = getSiteUrl();
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Buildium vs TrueCap (2026): PM vs Deal Analysis",
    url: `${siteUrl}/vs/buildium`,
    description:
      "Buildium manages rentals after purchase. TrueCap underwrites potential acquisitions before purchase.",
    dateModified: "2026-08-16",
    publisher: { "@id": `${siteUrl}/#organization` },
  };

  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <VsBreadcrumbSchema vsPath="/vs/buildium" pageName="TrueCap vs Buildium" />
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
            TrueCap vs Buildium:{" "}
            <span className="text-primary">pre-purchase underwriting vs property management</span>
          </h1>
          <p className="mt-4 max-w-2xl text-base sm:text-lg leading-relaxed text-muted-foreground">
            Buildium is property management software for landlords and professional managers operating rentals after purchase. TrueCap is a pre-purchase underwriting calculator for evaluating acquisitions. Different stages, different jobs.
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
                <li>You own 1-30 rental units and underwrite deals yourself.</li>
                <li>You want cap rate, DSCR, cash flow, projection before buying.</li>
                <li>You want a free tier that covers the core underwriting work.</li>
                <li>You&apos;re not managing other people&apos;s property.</li>
              </ul>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                Use Buildium when
              </p>
              <ul className="space-y-1.5 text-sm leading-relaxed text-foreground">
                <li>You need tenant, lease, accounting, and maintenance operations.</li>
                <li>You run a property management company and need owner portals.</li>
                <li>You need PM-grade accounting (GL, balance sheet, owner statements).</li>
                <li>You&apos;re scaling from a few rentals into a PM business.</li>
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
                    Buildium
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
                        <WinnerBadge winner={row.winner} side="buildium" />
                        <span>{row.buildium}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            Buildium details based on publicly available product info as of 2026.
            See{" "}
            <a href="https://www.buildium.com/pricing/" target="_blank" rel="noopener" className="underline">
              Buildium&apos;s official pricing page
            </a>{" "}
            for their current state.
          </p>
        </section>

        {/* Complementary workflow */}
        <section className="mb-12 sm:mb-16 rounded-2xl border border-[var(--brand-green)]/25 bg-[var(--brand-green-light)] p-6 sm:p-8">
          <h2 className="text-xl sm:text-2xl font-extrabold text-[var(--brand-green)] mb-3">
            When TrueCap users graduate to Buildium
          </h2>
          <ol className="space-y-2.5 text-sm sm:text-base leading-relaxed text-foreground list-decimal pl-5">
            <li>
              <strong>Underwrite + buy 1-10 properties with TrueCap.</strong> Free or Pro tier — solo investor workflow.
            </li>
            <li>
              <strong>Identify the operational bottleneck.</strong> Tenant, lease, accounting, maintenance, or owner-reporting needs may justify a dedicated platform.
            </li>
            <li>
              <strong>Compare current operations platforms.</strong> Review pricing, implementation, accounting, payments, support, and portfolio fit before choosing Buildium or an alternative.
            </li>
            <li>
              <strong>Keep TrueCap for new acquisitions.</strong> Buildium doesn&apos;t underwrite. You&apos;ll still want TrueCap (or DealCheck) for the next property — they&apos;re complementary.
            </li>
          </ol>
          <p className="mt-4 text-sm leading-relaxed text-foreground">
            Want to see just the underwriting half? Try the{" "}
            <Link href="/#main" className="font-semibold text-primary hover:underline">
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

        <ComparisonFaq competitorName="Buildium" items={BUILDIUM_FAQ} />

        {/* Pricing CTA */}
        <section className="mb-12 sm:mb-16 rounded-2xl bg-primary p-6 sm:p-8 text-primary-foreground">
          <h2 className="text-2xl sm:text-3xl font-extrabold mb-2">
            Underwrite the next deal — free.
          </h2>
          <p className="text-sm sm:text-base opacity-90 mb-5 max-w-2xl">
            TrueCap free covers cap rate, CoC, DSCR, NCF, and monthly cash flow.
            Pro adds 10-year cash-flow and equity projections, sensitivity,
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
          <Link href="/vs/appfolio" className="font-bold text-foreground hover:underline">TrueCap vs AppFolio</Link>
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

const BUILDIUM_FAQ: FaqItem[] = [
  {
    question: "Is TrueCap a Buildium alternative?",
    answer: (
      <>
        Not directly. Buildium manages rentals after purchase; TrueCap underwrites potential acquisitions before purchase. A landlord or manager may use both at different stages.
      </>
    ),
    plainTextAnswer:
      "Not directly. Buildium manages rentals after purchase; TrueCap underwrites potential acquisitions before purchase. A landlord or manager may use both.",
  },
  {
    question: "Is Buildium worth it for a small landlord?",
    answer: (
      <>
        It depends on the operational workflow. Buildium publishes Essential, Growth, and Premium paid tiers plus a 14-day trial. Compare the current rate and included accounting, tenant, maintenance, and owner features with the alternatives that fit your portfolio.
      </>
    ),
    plainTextAnswer:
      "It depends on the operational workflow. Buildium publishes Essential, Growth, and Premium paid tiers plus a 14-day trial. Compare current pricing and included features with alternatives that fit your portfolio.",
  },
  {
    question: "Does Buildium underwrite deals?",
    answer: (
      <>
        No. Buildium is purely operational — it manages units, tenants, leases, accounting, vendors. It doesn&apos;t model cap rate, DSCR, or cash flow on a potential acquisition. For that you&apos;d use TrueCap, DealCheck, or a spreadsheet.
      </>
    ),
    plainTextAnswer:
      "No. Buildium is purely operational — units, tenants, leases, accounting, vendors. No cap rate, DSCR, or cash flow modeling on acquisitions. Use TrueCap, DealCheck, or a spreadsheet for that.",
  },
  {
    question: "When should I upgrade from solo tools to Buildium?",
    answer: (
      <>
        Consider a dedicated platform when tenant, lease, accounting, maintenance, payment, or owner-reporting work justifies its cost and implementation effort. There is no universal unit-count threshold; compare current plans against your actual workflow.
      </>
    ),
    plainTextAnswer:
      "Consider a dedicated platform when tenant, lease, accounting, maintenance, payment, or owner-reporting work justifies its cost and implementation effort. There is no universal unit-count threshold.",
  },
  {
    question: "Buildium vs AppFolio — which one?",
    answer: (
      <>
        Compare the vendors&apos; current pricing, minimums, accounting, resident, owner, maintenance, support, and implementation features. AppFolio&apos;s Core plan currently states a 50-unit minimum; Buildium publishes tiered entry pricing without that comparison-page assumption.
      </>
    ),
    plainTextAnswer:
      "Compare current pricing, minimums, accounting, resident, owner, maintenance, support, and implementation features. AppFolio Core currently states a 50-unit minimum; Buildium publishes tiered entry pricing.",
  },
];

function WinnerBadge({
  winner,
  side,
}: {
  winner: Verdict;
  side: "row" | "truecap" | "buildium";
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
