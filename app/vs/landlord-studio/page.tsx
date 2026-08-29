/**
 * /vs/landlord-studio — competitor comparison landing page.
 *
 * Target queries: "landlord studio alternative", "landlord studio vs stessa", "landlord studio pricing", "landlord studio review".
 * Landlord Studio is mobile-first accounting + receipt scanning for small landlords. Direct alternative to Stessa, simpler than Buildium/Rentec. Strong on UK + US markets.
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
  title: "Landlord Studio vs TrueCap (2026): Which to Use",
  description:
    "Landlord Studio is mobile-first accounting for properties you own. TrueCap underwrites the ones you're considering. Honest comparison and how they fit.",
  keywords: [
    "landlord studio alternative",
    "landlord studio vs stessa",
    "landlord studio pricing",
    "landlord studio review",
  ],
  alternates: { canonical: "/vs/landlord-studio" },
  openGraph: {
    title: "Landlord Studio vs TrueCap (2026): Which to Use",
    description:
      "Landlord Studio is mobile accounting for properties you own. TrueCap underwrites the deal before. Different stages.",
    url: "/vs/landlord-studio",
    type: "website",
    images: [{ url: "/home.jpg", width: 1200, height: 630, alt: "TrueCap vs Landlord Studio" }],
  },
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
};

type Verdict = "truecap" | "landlordstudio" | "tie";
type Row = { feature: string; truecap: string; landlordstudio: string; winner: Verdict };

const MATRIX: Row[] = [
  { feature: "Lifecycle stage", truecap: "Pre-purchase — underwrite the deal", landlordstudio: "Post-purchase — accounting + tracking", winner: "tie" },
  { feature: "Cap rate / CoC / DSCR analysis", truecap: "Yes — full engine, free tier", landlordstudio: "Not modeled", winner: "truecap" },
  { feature: "10-year projection", truecap: "Pro — rent + expense + appreciation", landlordstudio: "Not modeled", winner: "truecap" },
  { feature: "Secondary Screening Index", truecap: "Free — 0-100 triage score + factor breakdown", landlordstudio: "Not applicable", winner: "truecap" },
  { feature: "Address auto-fill (rent/rate/tax)", truecap: "Yes — HUD + FRED + state property tax", landlordstudio: "Not applicable", winner: "truecap" },
  { feature: "Receipt scanning", truecap: "No", landlordstudio: "Yes — mobile camera + OCR", winner: "landlordstudio" },
  { feature: "Expense tracking + categorization", truecap: "No", landlordstudio: "Yes — per-property bookkeeping", winner: "landlordstudio" },
  { feature: "Schedule E P&L reports", truecap: "Forward projection only", landlordstudio: "Yes — actuals export", winner: "landlordstudio" },
  { feature: "Rent tracking", truecap: "No", landlordstudio: "Yes — payment logging (no ACH collection itself)", winner: "landlordstudio" },
  { feature: "Mobile app", truecap: "PWA", landlordstudio: "Native iOS + Android", winner: "tie" },
  { feature: "Free tier", truecap: "Yes — core cap rate, CoC, DSCR, and cash flow", landlordstudio: "Yes — limited properties", winner: "tie" },
  { feature: "Pricing (paid tier)", truecap: "Paid Pro; see live pricing for current rates", landlordstudio: "Starter ~$12/mo, Premium ~$30/mo (as of 2026)", winner: "tie" },
];

export default function VsLandlordStudioPage() {
  const siteUrl = getSiteUrl();
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Landlord Studio vs TrueCap (2026): Which to Use",
    url: `${siteUrl}/vs/landlord-studio`,
    description:
      "Landlord Studio is mobile-first accounting for properties you own. TrueCap underwrites the ones you're considering. Honest comparison and how they fit.",
    dateModified: "2026-06-07",
    publisher: { "@id": `${siteUrl}/#organization` },
  };

  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <VsBreadcrumbSchema vsPath="/vs/landlord-studio" pageName="TrueCap vs Landlord Studio" />
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
            TrueCap vs Landlord Studio:{" "}
            <span className="text-primary">underwrite before, track receipts after</span>
          </h1>
          <p className="mt-4 max-w-2xl text-base sm:text-lg leading-relaxed text-muted-foreground">
            Landlord Studio is mobile-first accounting + expense tracking for small landlords — snap a receipt, categorize it, generate a Schedule E. TrueCap is a pre-purchase underwriting calculator that helps screen an acquisition. Different stages, potentially complementary tools.
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
                <li>You want standardized economics and rule-fit context to compare 2-3 deals.</li>
                <li>You&apos;re not yet generating receipts to track.</li>
              </ul>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                Use Landlord Studio when
              </p>
              <ul className="space-y-1.5 text-sm leading-relaxed text-foreground">
                <li>You own rentals and need to track expenses + receipts.</li>
                <li>You want a mobile app for snapping receipts at the property.</li>
                <li>You need a simple Schedule E export at tax time.</li>
                <li>You don&apos;t need bank-feed accounting (Stessa/Baselane do that).</li>
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
                    Landlord Studio
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
                        <WinnerBadge winner={row.winner} side="landlordstudio" />
                        <span>{row.landlordstudio}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            Landlord Studio details based on publicly available product info as of 2026.
            See{" "}
            <a href="https://landlordstudio.com" target="_blank" rel="noopener" className="underline">
              landlordstudio.com
            </a>{" "}
            for their current state.
          </p>
        </section>

        {/* Complementary workflow */}
        <section className="mb-12 sm:mb-16 rounded-2xl border border-[var(--brand-green)]/25 bg-[var(--brand-green-light)] p-6 sm:p-8">
          <h2 className="text-xl sm:text-2xl font-extrabold text-[var(--brand-green)] mb-3">
            How TrueCap + Landlord Studio fit together
          </h2>
          <ol className="space-y-2.5 text-sm sm:text-base leading-relaxed text-foreground list-decimal pl-5">
            <li>
              <strong>Underwrite the property in TrueCap.</strong> Cap rate, DSCR, cash flow, projection. Save the deal.
            </li>
            <li>
              <strong>Close + onboard in Landlord Studio.</strong> Set up the property, start logging receipts as you incur expenses.
            </li>
            <li>
              <strong>Mobile receipt tracking on the go.</strong> Contractor invoice on your phone? Snap, categorize, file.
            </li>
            <li>
              <strong>Annual tax time.</strong> Pull Schedule E from Landlord Studio. Re-run TrueCap to compare actuals vs projection — the gap is your learning for the next acquisition.
            </li>
          </ol>
          <p className="mt-4 text-sm leading-relaxed text-foreground">
            Deciding whether to buy, not how to book it? The free{" "}
            <Link href="/tools/rental-property-tax-calculator" className="font-semibold text-primary hover:underline">
              rental property tax calculator
            </Link>{" "}
            estimates the bill before there is anything to reconcile, and the full{" "}
            <Link href="/" className="font-semibold text-primary hover:underline">
              TrueCap analyzer
            </Link>{" "}
            projects the cap rate, cash-on-cash, and cash flow before you own
            the expenses you&apos;d later be tracking here. Our guide on{" "}
            <Link href="/blog/how-to-underwrite-a-rental-property-in-60-seconds" className="font-semibold text-primary hover:underline">
              60-second underwriting
            </Link>{" "}
            walks through the workflow end-to-end.
          </p>
        </section>

        <ComparisonFaq competitorName="Landlord Studio" items={LANDLORD_STUDIO_FAQ} />

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
          <Link href="/vs/stessa" className="font-bold text-foreground hover:underline">TrueCap vs Stessa</Link>
          {" · "}
          <Link href="/vs/baselane" className="font-bold text-foreground hover:underline">TrueCap vs Baselane</Link>
          {" · "}
          <Link href="/vs/avail" className="font-bold text-foreground hover:underline">TrueCap vs Avail</Link>
        </footer>
      </main>
      <SiteFooter />
      <ScrollDepthTracker />
    </div>
  );
}

const LANDLORD_STUDIO_FAQ: FaqItem[] = [
  {
    question: "Is TrueCap a Landlord Studio alternative?",
    answer: (
      <>
        No — different stages. Landlord Studio is mobile-first accounting for properties you own. TrueCap underwrites properties you&apos;re considering buying. Most small landlords use both.
      </>
    ),
    plainTextAnswer:
      "No — different stages. Landlord Studio is mobile-first accounting. TrueCap is pre-purchase underwriting. Most small landlords use both.",
  },
  {
    question: "Landlord Studio vs Stessa — which one?",
    answer: (
      <>
        Landlord Studio is more mobile-first with stronger receipt scanning. Stessa is more bank-feed-driven with automated transaction categorization. If you take a lot of receipts on the go, Landlord Studio&apos;s mobile UX wins. If you want everything pulled automatically from your bank, Stessa is more hands-off. Both have free tiers — try both.
      </>
    ),
    plainTextAnswer:
      "Landlord Studio is mobile-first with stronger receipt scanning. Stessa is bank-feed driven with automatic transaction categorization. On-the-go receipts: Landlord Studio. Hands-off bank pull: Stessa. Both have free tiers.",
  },
  {
    question: "Does Landlord Studio collect rent?",
    answer: (
      <>
        Not directly — they log rent payments but don&apos;t process them. For online rent collection (ACH/card), you&apos;d pair Landlord Studio with TurboTenant, RentRedi, Avail, or Baselane.
      </>
    ),
    plainTextAnswer:
      "Not directly — they log rent payments but don&apos;t process them. For online rent collection, pair with TurboTenant, RentRedi, Avail, or Baselane.",
  },
  {
    question: "Does TrueCap track actual expenses?",
    answer: (
      <>
        No. TrueCap models projected expenses for underwriting (taxes, insurance, vacancy, mgmt, maintenance, capex). It doesn&apos;t connect to your bank or accept receipt photos. Landlord Studio, Stessa, or Baselane handle that.
      </>
    ),
    plainTextAnswer:
      "No. TrueCap models projected expenses for underwriting. It doesn&apos;t connect to your bank or accept receipts. Landlord Studio, Stessa, or Baselane handle that.",
  },
  {
    question: "Is Landlord Studio free?",
    answer: (
      <>
        Yes — there&apos;s a free tier for a limited number of properties. Paid tiers (Starter ~$12/month, Premium ~$30/month as of 2026) lift the property cap and add features like custom reports and bank reconciliation.
      </>
    ),
    plainTextAnswer:
      "Yes — free tier for limited properties. Paid tiers (Starter ~$12/mo, Premium ~$30/mo, 2026) lift the cap and add custom reports + bank reconciliation.",
  },
];

function WinnerBadge({
  winner,
  side,
}: {
  winner: Verdict;
  side: "row" | "truecap" | "landlordstudio";
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
