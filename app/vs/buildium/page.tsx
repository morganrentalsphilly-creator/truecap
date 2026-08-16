/**
 * /vs/buildium — competitor comparison landing page.
 *
 * Target queries: "buildium alternative", "buildium vs", "buildium pricing", "buildium review", "property management software".
 * Buildium is enterprise property management software — professional property managers managing 50-5000 units. Different audience than TrueCap (we serve solo investors), but DIY landlords scaling up to 10-30 units consider it.
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
    "Buildium is enterprise property management for 50+ unit operators. TrueCap is the pre-purchase underwrite for solo investors. Honest comparison.",
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
      "Buildium is for professional property managers (50+ units). TrueCap is for solo investors underwriting deals. Different audiences.",
    url: "/vs/buildium",
    type: "website",
    images: [{ url: "/home.jpg", width: 1200, height: 630, alt: "TrueCap vs Buildium" }],
  },
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
};

type Verdict = "truecap" | "buildium" | "tie";
type Row = { feature: string; truecap: string; buildium: string; winner: Verdict };

const MATRIX: Row[] = [
  { feature: "Primary audience", truecap: "Solo / small-portfolio investors (1-30 doors)", buildium: "Professional property managers (50+ units)", winner: "tie" },
  { feature: "Lifecycle stage", truecap: "Pre-purchase — underwrite the deal", buildium: "Post-purchase — operate at scale", winner: "tie" },
  { feature: "Cap rate / CoC / DSCR analysis", truecap: "Yes — full engine, free tier", buildium: "Not modeled", winner: "truecap" },
  { feature: "10-year projection", truecap: "Pro — rent + expense + appreciation", buildium: "Not modeled", winner: "truecap" },
  { feature: "Illustrative tax impact", truecap: "Pro — depreciation + interest + modeled after-tax CF", buildium: "Not modeled", winner: "truecap" },
  { feature: "Deal score + verdict", truecap: "Free — 0-100 score + plain-English verdict", buildium: "Not applicable", winner: "truecap" },
  { feature: "Address auto-fill (rent/rate/tax)", truecap: "Yes — HUD + FRED + state property tax", buildium: "Not applicable", winner: "truecap" },
  { feature: "Tenant + lease management at scale", truecap: "No", buildium: "Yes — 50-5000 unit support", winner: "buildium" },
  { feature: "Accounting (GL, P&L, balance sheet)", truecap: "No", buildium: "Yes — full PM-grade accounting", winner: "buildium" },
  { feature: "Owner reports + portals", truecap: "No", buildium: "Yes — multi-owner statement generation", winner: "buildium" },
  { feature: "Maintenance vendor management", truecap: "No", buildium: "Yes — full work-order workflow", winner: "buildium" },
  { feature: "Free tier", truecap: "Yes — full underwriting math", buildium: "No — trial only", winner: "truecap" },
  { feature: "Pricing (entry tier)", truecap: "Free; Pro $29.99/mo", buildium: "Essential ~$55/mo + per-unit fees (as of 2026)", winner: "truecap" },
  { feature: "Built for landlords scaling beyond 30 units", truecap: "No — TrueCap targets 1-30 doors", buildium: "Yes — built for property management companies", winner: "buildium" },
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
      "Buildium is enterprise property management for 50+ unit operators. TrueCap is the pre-purchase underwrite for solo investors. Honest comparison.",
    dateModified: "2026-06-07",
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
            <span className="text-primary">solo investor underwriting vs enterprise property management</span>
          </h1>
          <p className="mt-4 max-w-2xl text-base sm:text-lg leading-relaxed text-muted-foreground">
            Buildium is enterprise property management software — built for professional property managers and large landlords running 50-5000 units. TrueCap is a pre-purchase underwriting calculator built for solo and small-portfolio investors. Different audiences, different jobs. Most TrueCap users are not the target Buildium customer.
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
                <li>You manage 50+ units (yours or other people&apos;s).</li>
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
            <a href="https://buildium.com" target="_blank" rel="noopener" className="underline">
              buildium.com
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
              <strong>Scale to 30+ doors and feel the ops strain.</strong> Spreadsheets break, manual rent collection slows down, you need owner reporting if you have partners.
            </li>
            <li>
              <strong>Add a PM-grade ops platform (Buildium / AppFolio).</strong> This is where Buildium starts to earn its keep. For most TrueCap users, this is years 3-5 of investing.
            </li>
            <li>
              <strong>Keep TrueCap for new acquisitions.</strong> Buildium doesn&apos;t underwrite. You&apos;ll still want TrueCap (or DealCheck) for the next property — they&apos;re complementary.
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

        <ComparisonFaq competitorName="Buildium" items={BUILDIUM_FAQ} />

        {/* Pricing CTA */}
        <section className="mb-12 sm:mb-16 rounded-2xl bg-primary p-6 sm:p-8 text-primary-foreground">
          <h2 className="text-2xl sm:text-3xl font-extrabold mb-2">
            Underwrite the next deal — free.
          </h2>
          <p className="text-sm sm:text-base opacity-90 mb-5 max-w-2xl">
            TrueCap free covers cap rate, CoC, DSCR, NCF, and monthly cash flow.
            Pro unlocks projections, sensitivity, illustrative tax impact, modeled exit comparisons,
            MAO, PDF exports, and co-branded share links.
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
        No — different audiences and different jobs. Buildium is enterprise property management for professional managers running 50-5000 units. TrueCap is pre-purchase underwriting for solo investors with 1-30 doors. Most TrueCap users are too small for Buildium.
      </>
    ),
    plainTextAnswer:
      "No — different audiences. Buildium is enterprise PM for 50-5000 units. TrueCap is pre-purchase underwriting for 1-30 doors. Most TrueCap users are too small for Buildium.",
  },
  {
    question: "Is Buildium worth it for a small landlord?",
    answer: (
      <>
        Usually no. Buildium starts around $55/month plus per-unit fees, and the feature set (owner portals, vendor management, multi-property accounting) assumes you&apos;re running a PM business or managing dozens of units. Small landlords (1-10 doors) are better served by TurboTenant, Avail, or Baselane — and TrueCap upstream.
      </>
    ),
    plainTextAnswer:
      "Usually no. Buildium starts ~$55/mo + per-unit fees and assumes PM-business workflows. Small landlords (1-10 doors) are better with TurboTenant, Avail, or Baselane — and TrueCap upstream.",
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
        Typical signal: you&apos;re at 30+ units, you have partners or LPs who need owner reporting, and your ops are taking 10+ hours/week. Below that threshold, the price + complexity of Buildium aren&apos;t worth it.
      </>
    ),
    plainTextAnswer:
      "Typical signal: 30+ units, partners/LPs need owner reporting, ops taking 10+ hours/week. Below that, Buildium&apos;s price + complexity aren&apos;t worth it.",
  },
  {
    question: "Buildium vs AppFolio — which one?",
    answer: (
      <>
        AppFolio is generally more enterprise (1000+ unit operators), Buildium spans mid-market (50-1000). For most landlords scaling past 30 units, Buildium is the more practical starting point. Both massively overshoot what TrueCap users need.
      </>
    ),
    plainTextAnswer:
      "AppFolio is more enterprise (1000+ units), Buildium spans mid-market (50-1000). For landlords scaling past 30 units, Buildium is the more practical start. Both overshoot TrueCap users.",
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
