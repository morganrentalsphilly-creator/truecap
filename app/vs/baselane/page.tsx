/**
 * /vs/baselane — competitor comparison landing page.
 *
 * Target queries: "baselane alternative", "baselane vs stessa", "baselane review", "baselane pricing", "rental property banking".
 * Baselane is rental banking + bookkeeping + rent collection — all-in-one financial stack for landlords. Direct competitor to Stessa on the accounting side, Avail/TurboTenant on rent collection. Strong free tier on banking.
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
  title: "TrueCap vs Baselane — honest comparison",
  description:
    "Baselane is rental banking + bookkeeping for properties you own. TrueCap underwrites the ones you're considering. Honest comparison + how they fit together.",
  keywords: [
    "baselane alternative",
    "baselane vs stessa",
    "baselane review",
    "baselane pricing",
    "rental property banking",
  ],
  alternates: { canonical: "/vs/baselane" },
  openGraph: {
    title: "TrueCap vs Baselane — honest comparison",
    description:
      "Baselane is rental banking + bookkeeping after closing. TrueCap underwrites the deal before. Different stages.",
    url: "/vs/baselane",
    type: "website",
    images: [{ url: "/home.jpg", width: 1200, height: 630, alt: "TrueCap vs Baselane" }],
  },
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
};

type Verdict = "truecap" | "baselane" | "tie";
type Row = { feature: string; truecap: string; baselane: string; winner: Verdict };

const MATRIX: Row[] = [
  { feature: "Lifecycle stage", truecap: "Pre-purchase — underwrite the deal", baselane: "Post-purchase — banking + bookkeeping + ops", winner: "tie" },
  { feature: "Cap rate / CoC / DSCR analysis", truecap: "Yes — full engine, free tier", baselane: "Not modeled", winner: "truecap" },
  { feature: "10-year projection", truecap: "Pro — rent + expense + appreciation", baselane: "Not modeled", winner: "truecap" },
  { feature: "Tax strategy modeling", truecap: "Pro — depreciation + interest + after-tax CF (forward-looking)", baselane: "Yes — actuals tracking for Schedule E", winner: "tie" },
  { feature: "Deal score + verdict", truecap: "Free — 0-100 score + plain-English verdict", baselane: "Not applicable", winner: "truecap" },
  { feature: "Sensitivity grid", truecap: "Pro — rent ±10%, vacancy ±5pp, rate ±1pp", baselane: "Not modeled", winner: "truecap" },
  { feature: "Rental business banking", truecap: "No", baselane: "Yes — FDIC-insured business checking", winner: "baselane" },
  { feature: "Auto-categorized expenses", truecap: "No", baselane: "Yes — synced with bank feed", winner: "baselane" },
  { feature: "Schedule E P&L reports", truecap: "Forward projection only", baselane: "Yes — actuals from bank feed", winner: "baselane" },
  { feature: "Rent collection (ACH)", truecap: "No", baselane: "Yes — ACH free", winner: "baselane" },
  { feature: "Address auto-fill (rent/rate/tax)", truecap: "Yes — HUD + FRED + state property tax", baselane: "Not applicable", winner: "truecap" },
  { feature: "Pricing (entry tier)", truecap: "Free for underwriting; Pro $29.99/mo", baselane: "Banking + bookkeeping free; advanced ~$22/mo (as of 2026)", winner: "tie" },
  { feature: "Free tier", truecap: "Yes — full underwriting math", baselane: "Yes — banking + basic bookkeeping", winner: "tie" },
  { feature: "Shareable read-only deal link", truecap: "Pro — public URL + branding", baselane: "Not the use case", winner: "truecap" },
  { feature: "Lender-ready PDF", truecap: "Pro — multi-page projection", baselane: "Schedule E reports for tax filing", winner: "tie" },
];

export default function VsBaselanePage() {
  const siteUrl = getSiteUrl();
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "TrueCap vs Baselane — honest comparison",
    url: `${siteUrl}/vs/baselane`,
    description:
      "Baselane is rental banking + bookkeeping for properties you own. TrueCap underwrites the ones you're considering. Honest comparison + how they fit together.",
    dateModified: "2026-06-07",
    publisher: { "@id": `${siteUrl}/#organization` },
  };

  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <VsBreadcrumbSchema vsPath="/vs/baselane" pageName="TrueCap vs Baselane" />
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
            TrueCap vs Baselane:{" "}
            <span className="text-primary">underwrite before, bank + book after</span>
          </h1>
          <p className="mt-4 max-w-2xl text-base sm:text-lg leading-relaxed text-muted-foreground">
            Baselane is a rental-property banking + bookkeeping + rent collection platform — FDIC-insured business banking, auto-categorized expenses, Schedule E reports, ACH rent collection. TrueCap is the pre-purchase underwriting calculator that decides whether to buy the property in the first place. We don&apos;t compete; we cover different halves of the rental lifecycle.
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
                <li>You&apos;re evaluating a property before making an offer.</li>
                <li>You want forward-looking projections (10-yr cash flow, exit scenarios).</li>
                <li>You want a deal score + verdict to compare 2-3 deals side-by-side.</li>
                <li>You want defensible numbers for a lender or partner.</li>
              </ul>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                Use Baselane when
              </p>
              <ul className="space-y-1.5 text-sm leading-relaxed text-foreground">
                <li>You own rentals and want one bank account per property.</li>
                <li>You want auto-categorized expense tracking + Schedule E reports.</li>
                <li>You want online rent collection (ACH free, no separate platform).</li>
                <li>You&apos;re consolidating QuickBooks + Stessa + a checking account into one tool.</li>
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
                    Baselane
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
                        <WinnerBadge winner={row.winner} side="baselane" />
                        <span>{row.baselane}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            Baselane details based on publicly available product info as of 2026.
            See{" "}
            <a href="https://baselane.com" target="_blank" rel="noopener" className="underline">
              baselane.com
            </a>{" "}
            for their current state.
          </p>
        </section>

        {/* Complementary workflow */}
        <section className="mb-12 sm:mb-16 rounded-2xl border border-[var(--brand-green)]/25 bg-[var(--brand-green-light)] p-6 sm:p-8">
          <h2 className="text-xl sm:text-2xl font-extrabold text-[var(--brand-green)] mb-3">
            How TrueCap + Baselane fit together
          </h2>
          <ol className="space-y-2.5 text-sm sm:text-base leading-relaxed text-foreground list-decimal pl-5">
            <li>
              <strong>Source the deal.</strong> Zillow, MLS, off-market.
            </li>
            <li>
              <strong>Underwrite in TrueCap.</strong> Address auto-fills HUD rent, FRED rate, state tax. Check cap rate, DSCR, cash flow. Save the deal.
            </li>
            <li>
              <strong>Close the property.</strong> Open a Baselane account for the new property — banking + a dedicated checking account.
            </li>
            <li>
              <strong>Operate in Baselane.</strong> Collect rent via ACH; the bank feed auto-categorizes mortgage, taxes, insurance, repairs. Schedule E builds itself.
            </li>
            <li>
              <strong>Annual tax time.</strong> Pull the Schedule E report from Baselane; pass to your CPA. Re-run the original TrueCap analysis with actual numbers to see how it&apos;s tracking vs projection.
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

        <ComparisonFaq competitorName="Baselane" items={BASELANE_FAQ} />

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
          <Link href="/vs/stessa" className="font-bold text-foreground hover:underline">TrueCap vs Stessa</Link>
          {" · "}
          <Link href="/vs/avail" className="font-bold text-foreground hover:underline">TrueCap vs Avail</Link>
          {" · "}
          <Link href="/vs/rentredi" className="font-bold text-foreground hover:underline">TrueCap vs RentRedi</Link>
        </footer>
      </main>
      <SiteFooter />
      <ScrollDepthTracker />
    </div>
  );
}

const BASELANE_FAQ: FaqItem[] = [
  {
    question: "Is TrueCap a Baselane alternative?",
    answer: (
      <>
        No — different stages. Baselane is post-purchase banking + bookkeeping for properties you own. TrueCap is pre-purchase underwriting for properties you&apos;re considering buying. Most landlords end up using both.
      </>
    ),
    plainTextAnswer:
      "No — different stages. Baselane is post-purchase banking + bookkeeping. TrueCap is pre-purchase underwriting. Most landlords use both.",
  },
  {
    question: "Is Baselane FDIC-insured?",
    answer: (
      <>
        Yes. Baselane partners with FDIC-insured banks (Thread Bank and Blue Ridge Bank as of 2026) for deposit insurance up to standard FDIC limits ($250k per depositor per bank). They&apos;re not a chartered bank themselves — they&apos;re a fintech with bank partners.
      </>
    ),
    plainTextAnswer:
      "Yes. Baselane partners with FDIC-insured banks (Thread Bank, Blue Ridge Bank as of 2026) for deposit insurance up to standard FDIC limits ($250k/depositor/bank).",
  },
  {
    question: "Should I use Baselane or Stessa?",
    answer: (
      <>
        Baselane bundles banking + bookkeeping + rent collection. Stessa is more focused on bookkeeping + financial reporting (you connect your existing bank). If you want a dedicated business checking account per property AND simplified bookkeeping, Baselane is the more integrated choice. If you already have business banking set up and just want bookkeeping, Stessa works. Both have free tiers — try both.
      </>
    ),
    plainTextAnswer:
      "Baselane bundles banking + bookkeeping + rent collection. Stessa is bookkeeping + reporting (connect your own bank). Want dedicated business checking per property? Baselane. Already have banking? Stessa. Both have free tiers.",
  },
  {
    question: "Does TrueCap track actual expenses like Baselane?",
    answer: (
      <>
        No. TrueCap models projected expenses for underwriting (taxes, insurance, vacancy, mgmt %, maintenance, capex). It doesn&apos;t connect to your bank to track actuals. That&apos;s Baselane (or Stessa) territory. Building accounting into TrueCap would dilute the underwriting focus.
      </>
    ),
    plainTextAnswer:
      "No. TrueCap models projected expenses for underwriting (taxes, insurance, vacancy, mgmt, maintenance, capex). It doesn&apos;t connect to your bank for actuals. That&apos;s Baselane or Stessa territory.",
  },
  {
    question: "Can I share a TrueCap analysis with my CPA via Baselane?",
    answer: (
      <>
        Not directly — they&apos;re separate tools. But TrueCap Pro generates a multi-page PDF and shareable read-only link that you can email your CPA alongside Baselane&apos;s Schedule E report at tax time. CPAs typically want both: forward projection (TrueCap) and actuals (Baselane).
      </>
    ),
    plainTextAnswer:
      "Not directly — separate tools. TrueCap Pro generates a PDF + shareable link you can email your CPA alongside Baselane&apos;s Schedule E report. CPAs want both: forward projection (TrueCap) + actuals (Baselane).",
  },
];

function WinnerBadge({
  winner,
  side,
}: {
  winner: Verdict;
  side: "row" | "truecap" | "baselane";
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
