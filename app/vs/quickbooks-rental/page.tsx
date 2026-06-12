/**
 * /vs/quickbooks-rental — competitor comparison landing page.
 *
 * Target queries: "quickbooks for rentals", "quickbooks alternative landlord", "quickbooks vs stessa", "quickbooks rental property", "best accounting for rentals".
 * QuickBooks (Self-Employed and Online) is general-purpose small-business accounting. Many landlords default to it for rental bookkeeping. Stessa / Baselane / Landlord Studio are rental-specific competitors; TrueCap is upstream of all of them.
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
  title: "TrueCap vs QuickBooks for rentals — honest comparison",
  description:
    "QuickBooks is general-purpose accounting many landlords default to. TrueCap is pre-purchase rental underwriting. Honest comparison and what to use for accounting instead.",
  keywords: [
    "quickbooks for rentals",
    "quickbooks alternative landlord",
    "quickbooks vs stessa",
    "quickbooks rental property",
    "best accounting for rentals",
  ],
  alternates: { canonical: "/vs/quickbooks-rental" },
  openGraph: {
    title: "TrueCap vs QuickBooks for rentals — honest comparison",
    description:
      "QuickBooks is general accounting many landlords default to. TrueCap is pre-purchase underwriting. Different stages.",
    url: "/vs/quickbooks-rental",
    type: "website",
    images: [{ url: "/home.jpg", width: 1200, height: 630, alt: "TrueCap vs QuickBooks for rentals" }],
  },
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
};

type Verdict = "truecap" | "quickbooksrental" | "tie";
type Row = { feature: string; truecap: string; quickbooksrental: string; winner: Verdict };

const MATRIX: Row[] = [
  { feature: "Lifecycle stage", truecap: "Pre-purchase — underwrite the deal", quickbooksrental: "Post-purchase — general accounting", winner: "tie" },
  { feature: "Cap rate / CoC / DSCR analysis", truecap: "Yes — full engine, free tier", quickbooksrental: "Not modeled", winner: "truecap" },
  { feature: "10-year projection", truecap: "Pro — rent + expense + appreciation", quickbooksrental: "Not modeled", winner: "truecap" },
  { feature: "Tax strategy modeling", truecap: "Pro — depreciation + interest + after-tax CF (projection)", quickbooksrental: "Yes — but requires manual setup", winner: "tie" },
  { feature: "Address auto-fill (rent/rate/tax)", truecap: "Yes — HUD + FRED + state property tax", quickbooksrental: "Not applicable", winner: "truecap" },
  { feature: "Rental-specific categorization", truecap: "Forward-looking expense modeling", quickbooksrental: "Manual setup — generic categories", winner: "truecap" },
  { feature: "Bank-feed sync", truecap: "No", quickbooksrental: "Yes — connect any US bank", winner: "quickbooksrental" },
  { feature: "Per-property P&L", truecap: "Forward projection per deal", quickbooksrental: "Class / Location tracking (manual)", winner: "tie" },
  { feature: "Schedule E export", truecap: "Forward tax projection", quickbooksrental: "Yes — but requires Schedule E mapping", winner: "tie" },
  { feature: "Rental rent collection", truecap: "No", quickbooksrental: "Yes — invoicing + ACH (Online only)", winner: "quickbooksrental" },
  { feature: "Free tier", truecap: "Yes — full underwriting math", quickbooksrental: "Trial only; from ~$15-90/mo (as of 2026)", winner: "truecap" },
  { feature: "Built specifically for landlords", truecap: "Yes", quickbooksrental: "No — general business accounting", winner: "truecap" },
];

export default function VsQuickbooksRentalPage() {
  const siteUrl = getSiteUrl();
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "TrueCap vs QuickBooks for rentals — honest comparison",
    url: `${siteUrl}/vs/quickbooks-rental`,
    description:
      "QuickBooks is general-purpose accounting many landlords default to. TrueCap is pre-purchase rental underwriting. Honest comparison and what to use for accounting instead.",
    dateModified: "2026-06-07",
    publisher: { "@id": `${siteUrl}/#organization` },
  };

  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <VsBreadcrumbSchema vsPath="/vs/quickbooks-rental" pageName="TrueCap vs QuickBooks for rentals" />
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
            TrueCap vs QuickBooks for rentals:{" "}
            <span className="text-primary">underwrite the deal vs track the books</span>
          </h1>
          <p className="mt-4 max-w-2xl text-base sm:text-lg leading-relaxed text-muted-foreground">
            QuickBooks (Self-Employed and Online versions) is general-purpose small-business accounting that many landlords default to for rental bookkeeping — and then quietly outgrow because it isn&apos;t built for the rental-specific workflow. TrueCap is pre-purchase rental underwriting (cap rate, cash flow, DSCR, projection). Different stages. For rental-specific accounting, Stessa / Baselane / Landlord Studio are typically better than QuickBooks.
          </p>
          <div className="mt-7 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            <ScrollToFormButton
              className="group inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground shadow-[0_12px_28px_rgba(82,72,212,0.28)] transition-transform hover:-translate-y-0.5"
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
                <li>You&apos;re evaluating rental properties before buying.</li>
                <li>You want cap rate, DSCR, cash flow, projection.</li>
                <li>You&apos;re not yet tracking actual rental income / expenses.</li>
                <li>You want a free tier — no monthly QuickBooks subscription.</li>
              </ul>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                Use QuickBooks for rentals when
              </p>
              <ul className="space-y-1.5 text-sm leading-relaxed text-foreground">
                <li>You already use QuickBooks for other businesses (single-tool preference).</li>
                <li>You have a CPA who specifically wants QuickBooks files.</li>
                <li>You need general accounting beyond just rentals.</li>
                <li>You&apos;ve set up rental-specific classes / locations in QuickBooks and it works.</li>
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
                    QuickBooks for rentals
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
                        <WinnerBadge winner={row.winner} side="quickbooksrental" />
                        <span>{row.quickbooksrental}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            QuickBooks for rentals details based on publicly available product info as of 2026.
            See{" "}
            <a href="https://quickbooks.intuit.com" target="_blank" rel="noopener" className="underline">
              quickbooks.intuit.com
            </a>{" "}
            for their current state.
          </p>
        </section>

        {/* Complementary workflow */}
        <section className="mb-12 sm:mb-16 rounded-2xl border border-[var(--brand-green)]/25 bg-[var(--brand-green-light)] p-6 sm:p-8">
          <h2 className="text-xl sm:text-2xl font-extrabold text-[var(--brand-green)] mb-3">
            Honest take: most landlords should consider a rental-specific tool instead
          </h2>
          <ol className="space-y-2.5 text-sm sm:text-base leading-relaxed text-foreground list-decimal pl-5">
            <li>
              <strong>Underwrite the property in TrueCap.</strong> Cap rate, DSCR, cash flow, projection.
            </li>
            <li>
              <strong>Decide on accounting tool.</strong> QuickBooks works but requires manual setup (class tracking per property, custom Schedule E mapping). Stessa, Baselane, or Landlord Studio are built for rentals and typically less work to set up and maintain.
            </li>
            <li>
              <strong>Operate.</strong> Whichever accounting tool you pick, log income + expenses + receipts.
            </li>
            <li>
              <strong>Annual tax time.</strong> Pull the Schedule E equivalent from your accounting tool; pass to your CPA. Re-run TrueCap to compare actuals vs projection.
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

        <ComparisonFaq competitorName="QuickBooks for rentals" items={QUICKBOOKS_FAQ} />

        {/* Pricing CTA */}
        <section className="mb-12 sm:mb-16 rounded-2xl bg-primary p-6 sm:p-8 text-primary-foreground">
          <h2 className="text-2xl sm:text-3xl font-extrabold mb-2">
            Underwrite the next deal — free.
          </h2>
          <p className="text-sm sm:text-base opacity-90 mb-5 max-w-2xl">
            TrueCap free covers cap rate, CoC, DSCR, NCF, and monthly cash flow.
            Pro unlocks projections, sensitivity, tax strategy, exit scenarios,
            deal score, MAO, PDF exports, and shareable read-only deal links.
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
          <Link href="/vs/landlord-studio" className="font-bold text-foreground hover:underline">TrueCap vs Landlord Studio</Link>
        </footer>
      </main>
      <SiteFooter />
      <ScrollDepthTracker />
    </div>
  );
}

const QUICKBOOKS_FAQ: FaqItem[] = [
  {
    question: "Is TrueCap a QuickBooks alternative?",
    answer: (
      <>
        No — different stages and different jobs. QuickBooks is general accounting (your books, bills, transactions). TrueCap is pre-purchase underwriting (does this property cash flow?). They don&apos;t compete.
      </>
    ),
    plainTextAnswer:
      "No — different stages + jobs. QuickBooks is general accounting (books, bills, transactions). TrueCap is pre-purchase underwriting (does this property cash flow?). They don&apos;t compete.",
  },
  {
    question: "Should I use QuickBooks for my rentals?",
    answer: (
      <>
        Probably not, unless you already use QuickBooks for other businesses or your CPA insists. Rental-specific tools (Stessa, Baselane, Landlord Studio) are usually less work to set up, have rental-categorized expense buckets out of the box, and generate Schedule E reports automatically. QuickBooks works but needs significant manual setup (class tracking per property, custom Schedule E mapping).
      </>
    ),
    plainTextAnswer:
      "Probably not — unless already using QuickBooks for other businesses or CPA insists. Rental tools (Stessa, Baselane, Landlord Studio) are less work to set up, have rental-categorized expense buckets out of the box, and auto-generate Schedule E.",
  },
  {
    question: "QuickBooks Self-Employed vs Online for rentals?",
    answer: (
      <>
        Self-Employed is too thin — designed for freelancers, lacks the multi-property class tracking landlords need. Online is workable if you set up classes per property and customize the Schedule E mapping, but again, rental-specific tools usually require less ongoing maintenance.
      </>
    ),
    plainTextAnswer:
      "Self-Employed is too thin (designed for freelancers, no multi-property tracking). Online works with manual class setup per property + custom Schedule E mapping, but rental-specific tools usually require less maintenance.",
  },
  {
    question: "Does TrueCap connect to QuickBooks?",
    answer: (
      <>
        No — TrueCap is forward-looking (underwriting projections). It doesn&apos;t sync with accounting tools. If you want actuals tracking after closing, Stessa or Baselane connect to bank feeds and handle the bookkeeping side, then you re-run TrueCap with the actual numbers for the annual review.
      </>
    ),
    plainTextAnswer:
      "No — TrueCap is forward-looking (underwriting projections). No accounting sync. For actuals tracking after closing, use Stessa or Baselane (connect to bank feeds), then re-run TrueCap with actual numbers for the annual review.",
  },
  {
    question: "What&apos;s the cheapest rental accounting setup?",
    answer: (
      <>
        Stessa free covers unlimited properties + bank-feed sync + Schedule E. Baselane free adds banking + rent collection alongside. For most landlords, the free tiers of either are cheaper and simpler than QuickBooks ($15-90/month). QuickBooks makes sense if you have non-rental businesses too.
      </>
    ),
    plainTextAnswer:
      "Stessa free: unlimited properties + bank-feed sync + Schedule E. Baselane free: adds banking + rent collection. Both cheaper + simpler than QuickBooks ($15-90/mo). QB makes sense if you have non-rental businesses.",
  },
];

function WinnerBadge({
  winner,
  side,
}: {
  winner: Verdict;
  side: "row" | "truecap" | "quickbooksrental";
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
