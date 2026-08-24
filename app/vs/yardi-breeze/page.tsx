/**
 * /vs/yardi-breeze — competitor comparison landing page.
 *
 * Target queries: "yardi breeze alternative", "yardi breeze vs buildium", "yardi breeze pricing", "yardi breeze review".
 * Yardi Breeze is the small-business version of Yardi's enterprise property management suite — designed for 1-100 residential units. Direct competitor to Buildium and Rentec Direct.
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
  title: "Yardi Breeze vs TrueCap (2026): PM vs Analysis",
  description:
    "Yardi Breeze runs your portfolio after closing. TrueCap underwrites deals before. Honest comparison for small landlords.",
  keywords: [
    "yardi breeze alternative",
    "yardi breeze vs buildium",
    "yardi breeze pricing",
    "yardi breeze review",
  ],
  alternates: { canonical: "/vs/yardi-breeze" },
  openGraph: {
    title: "Yardi Breeze vs TrueCap (2026): PM vs Analysis",
    description:
      "Yardi Breeze is small-landlord PM software. TrueCap is the pre-purchase underwrite. Different stages.",
    url: "/vs/yardi-breeze",
    type: "website",
    images: [{ url: "/home.jpg", width: 1200, height: 630, alt: "TrueCap vs Yardi Breeze" }],
  },
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
};

type Verdict = "truecap" | "yardibreeze" | "tie";
type Row = { feature: string; truecap: string; yardibreeze: string; winner: Verdict };

const MATRIX: Row[] = [
  { feature: "Lifecycle stage", truecap: "Pre-purchase — underwrite the deal", yardibreeze: "Post-purchase — operate the portfolio", winner: "tie" },
  { feature: "Cap rate / CoC / DSCR analysis", truecap: "Yes — full engine, free tier", yardibreeze: "Not modeled", winner: "truecap" },
  { feature: "10-year projection", truecap: "Pro — rent + expense + appreciation", yardibreeze: "Not modeled", winner: "truecap" },
  { feature: "Illustrative tax impact", truecap: "Pro — depreciation + interest + modeled after-tax CF", yardibreeze: "Yes — actuals + Schedule E reports", winner: "tie" },
  { feature: "Screening Index + verdict", truecap: "Free — 0-100 score + plain-English verdict", yardibreeze: "Not applicable", winner: "truecap" },
  { feature: "Address auto-fill (rent/rate/tax)", truecap: "Yes — HUD + FRED + state property tax", yardibreeze: "Not applicable", winner: "truecap" },
  { feature: "Tenant + lease management", truecap: "No", yardibreeze: "Yes — designed for 1-100 units", winner: "yardibreeze" },
  { feature: "Online rent collection", truecap: "No", yardibreeze: "Yes — ACH + card", winner: "yardibreeze" },
  { feature: "Maintenance request workflow", truecap: "No", yardibreeze: "Yes — work-order tracking + vendor mgmt", winner: "yardibreeze" },
  { feature: "Owner / partner portals", truecap: "No", yardibreeze: "Yes — multi-owner statements", winner: "yardibreeze" },
  { feature: "Full GL accounting", truecap: "Forward projection only", yardibreeze: "Yes — chart of accounts, balance sheet, 1099s", winner: "yardibreeze" },
  { feature: "Free tier", truecap: "Yes — core cap rate, CoC, DSCR, and cash flow", yardibreeze: "No — paid only (demo available)", winner: "truecap" },
  { feature: "Pricing (entry tier)", truecap: "Free core; paid Pro — see live pricing", yardibreeze: "~$1-2/unit/month with $100 minimum (as of 2026)", winner: "tie" },
  { feature: "Built for solo investors (1-30 doors)", truecap: "Yes", yardibreeze: "Yes — 1-100 sweet spot", winner: "tie" },
];

export default function VsYardiBreezePage() {
  const siteUrl = getSiteUrl();
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Yardi Breeze vs TrueCap (2026): PM vs Analysis",
    url: `${siteUrl}/vs/yardi-breeze`,
    description:
      "Yardi Breeze runs your portfolio after closing. TrueCap underwrites deals before. Honest comparison for small landlords.",
    dateModified: "2026-06-07",
    publisher: { "@id": `${siteUrl}/#organization` },
  };

  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <VsBreadcrumbSchema vsPath="/vs/yardi-breeze" pageName="TrueCap vs Yardi Breeze" />
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
            TrueCap vs Yardi Breeze:{" "}
            <span className="text-primary">pre-purchase calculator vs full PM platform</span>
          </h1>
          <p className="mt-4 max-w-2xl text-base sm:text-lg leading-relaxed text-muted-foreground">
            Yardi Breeze is the small-business version of Yardi&apos;s enterprise PM platform — built for residential landlords managing 1-100 units. Tenant management, rent collection, accounting, owner reports. TrueCap is the pre-purchase underwriting calculator that decides which properties to add to that portfolio. Different stages, complementary tools.
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
                <li>You&apos;re evaluating a property before making an offer.</li>
                <li>You want cap rate, DSCR, cash flow, projection.</li>
                <li>You haven&apos;t yet reached 1-5 units (Yardi Breeze starts to make sense above that).</li>
                <li>You want a free tier — no commitment.</li>
              </ul>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                Use Yardi Breeze when
              </p>
              <ul className="space-y-1.5 text-sm leading-relaxed text-foreground">
                <li>You own 5-100 units and need PM-grade ops + accounting.</li>
                <li>You need rent collection, lease management, work orders, owner reports.</li>
                <li>You want Yardi-level data quality but priced for small portfolios.</li>
                <li>You may manage on behalf of other owners.</li>
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
                    Yardi Breeze
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
                        <WinnerBadge winner={row.winner} side="yardibreeze" />
                        <span>{row.yardibreeze}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            Yardi Breeze details based on publicly available product info as of 2026.
            See{" "}
            <a href="https://yardibreeze.com" target="_blank" rel="noopener" className="underline">
              yardibreeze.com
            </a>{" "}
            for their current state.
          </p>
        </section>

        {/* Complementary workflow */}
        <section className="mb-12 sm:mb-16 rounded-2xl border border-[var(--brand-green)]/25 bg-[var(--brand-green-light)] p-6 sm:p-8">
          <h2 className="text-xl sm:text-2xl font-extrabold text-[var(--brand-green)] mb-3">
            How small portfolios use both
          </h2>
          <ol className="space-y-2.5 text-sm sm:text-base leading-relaxed text-foreground list-decimal pl-5">
            <li>
              <strong>Underwrite the next acquisition in TrueCap.</strong> Cap rate, DSCR, cash flow, projection.
            </li>
            <li>
              <strong>Close + onboard the property in Yardi Breeze.</strong> Set up the unit, accept applications, start rent collection.
            </li>
            <li>
              <strong>Operate in Yardi Breeze.</strong> Rent comes in, expenses get logged, owner reports build themselves.
            </li>
            <li>
              <strong>Annual review in TrueCap.</strong> Pull Yardi Breeze actuals; re-run TrueCap with real numbers. Use the delta as input to the next acquisition.
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

        <ComparisonFaq competitorName="Yardi Breeze" items={YARDI_BREEZE_FAQ} />

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
          <Link href="/vs/appfolio" className="font-bold text-foreground hover:underline">TrueCap vs AppFolio</Link>
        </footer>
      </main>
      <SiteFooter />
      <ScrollDepthTracker />
    </div>
  );
}

const YARDI_BREEZE_FAQ: FaqItem[] = [
  {
    question: "Is TrueCap a Yardi Breeze alternative?",
    answer: (
      <>
        No — different stages. Yardi Breeze operates rentals you own. TrueCap underwrites rentals you&apos;re considering buying. Landlords with 5-100 units typically use both.
      </>
    ),
    plainTextAnswer:
      "No — different stages. Yardi Breeze operates rentals you own. TrueCap underwrites rentals you&apos;re considering. Landlords with 5-100 units use both.",
  },
  {
    question: "Yardi Breeze vs Buildium — which one?",
    answer: (
      <>
        Close call. Yardi Breeze inherits Yardi&apos;s enterprise data quality + reporting at small-business pricing. Buildium has a slightly cleaner UX and a larger ecosystem of integrations. Both serve 5-100 unit landlords. Pricing structures differ; demo both before committing.
      </>
    ),
    plainTextAnswer:
      "Close call. Yardi Breeze inherits Yardi&apos;s enterprise data quality at small-business pricing. Buildium has cleaner UX + larger ecosystem. Both serve 5-100 units. Demo both.",
  },
  {
    question: "Does Yardi Breeze have a free tier?",
    answer: (
      <>
        No — paid only with a demo. Pricing starts around $1-2/unit/month with a $100 minimum (as of 2026), which means even with 1 unit you&apos;d pay $100/month. For solo landlords below 50 units, TurboTenant or Avail (both free) are often more practical entry points.
      </>
    ),
    plainTextAnswer:
      "No — paid only with demo. ~$1-2/unit/month with $100 minimum (2026) means even 1 unit = $100/mo. For solo landlords &lt;50 units, TurboTenant or Avail (free) are more practical.",
  },
  {
    question: "Can Yardi Breeze underwrite new deals?",
    answer: (
      <>
        No — it&apos;s operational only. Pre-purchase underwriting (cap rate, DSCR, cash flow, projection) needs a separate calculator like TrueCap, DealCheck, or your spreadsheet.
      </>
    ),
    plainTextAnswer:
      "No — operational only. For pre-purchase underwriting use TrueCap, DealCheck, or a spreadsheet.",
  },
  {
    question: "When should I upgrade from TurboTenant to Yardi Breeze?",
    answer: (
      <>
        Typical signal: 10+ units, you want owner reports for partners or LPs, and you&apos;ve outgrown TurboTenant&apos;s accounting features. Below that threshold, the $100/mo minimum at Yardi Breeze isn&apos;t worth it.
      </>
    ),
    plainTextAnswer:
      "Typical signal: 10+ units, owner reports needed for partners/LPs, outgrown TurboTenant&apos;s accounting. Below that, Yardi Breeze&apos;s $100/mo minimum isn&apos;t worth it.",
  },
];

function WinnerBadge({
  winner,
  side,
}: {
  winner: Verdict;
  side: "row" | "truecap" | "yardibreeze";
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
