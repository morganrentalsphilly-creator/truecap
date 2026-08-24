/**
 * /vs/rentec-direct — competitor comparison landing page.
 *
 * Target queries: "rentec direct alternative", "rentec vs buildium", "rentec direct pricing", "rentec direct review".
 * Rentec Direct is small-landlord PM software — sweet spot is 5-100 units. Cheaper than Buildium, more feature-rich than TurboTenant. Investors compare it as the next step up from a basic ops tool.
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
  title: "Rentec Direct vs TrueCap (2026): PM vs Analysis",
  description:
    "Rentec Direct runs the rentals you own (5-100 units). TrueCap underwrites the ones you're considering. Honest side-by-side.",
  keywords: [
    "rentec direct alternative",
    "rentec vs buildium",
    "rentec direct pricing",
    "rentec direct review",
  ],
  alternates: { canonical: "/vs/rentec-direct" },
  openGraph: {
    title: "Rentec Direct vs TrueCap (2026): PM vs Analysis",
    description:
      "Rentec Direct manages 5-100 unit landlord ops. TrueCap underwrites the deal before. Different stages.",
    url: "/vs/rentec-direct",
    type: "website",
    images: [{ url: "/home.jpg", width: 1200, height: 630, alt: "TrueCap vs Rentec Direct" }],
  },
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
};

type Verdict = "truecap" | "rentecdirect" | "tie";
type Row = { feature: string; truecap: string; rentecdirect: string; winner: Verdict };

const MATRIX: Row[] = [
  { feature: "Lifecycle stage", truecap: "Pre-purchase — underwrite the deal", rentecdirect: "Post-purchase — operate the portfolio", winner: "tie" },
  { feature: "Cap rate / CoC / DSCR analysis", truecap: "Yes — full engine, free tier", rentecdirect: "Not modeled", winner: "truecap" },
  { feature: "10-year projection", truecap: "Pro — rent + expense + appreciation", rentecdirect: "Not modeled", winner: "truecap" },
  { feature: "Illustrative tax impact", truecap: "Pro — depreciation + interest + modeled after-tax CF", rentecdirect: "Yes — actuals tracking for Schedule E", winner: "tie" },
  { feature: "Secondary Screening Index", truecap: "Free — 0-100 triage score + factor breakdown", rentecdirect: "Not applicable", winner: "truecap" },
  { feature: "Address auto-fill (rent/rate/tax)", truecap: "Yes — HUD + FRED + state property tax", rentecdirect: "Not applicable", winner: "truecap" },
  { feature: "Tenant + lease management", truecap: "No", rentecdirect: "Yes — designed for 5-100 units", winner: "rentecdirect" },
  { feature: "Online rent collection", truecap: "No", rentecdirect: "Yes — ACH + card", winner: "rentecdirect" },
  { feature: "Maintenance request workflow", truecap: "No", rentecdirect: "Yes — work order tracking", winner: "rentecdirect" },
  { feature: "Accounting + Schedule E", truecap: "Forward projection only", rentecdirect: "Yes — full GL + 1099 + Schedule E", winner: "rentecdirect" },
  { feature: "Owner portals (for partnerships)", truecap: "No", rentecdirect: "Yes — multi-owner statements", winner: "rentecdirect" },
  { feature: "Free tier", truecap: "Yes — core cap rate, CoC, DSCR, and cash flow", rentecdirect: "No — paid only (trial available)", winner: "truecap" },
  { feature: "Pricing (entry tier)", truecap: "Free core; paid Pro — see live pricing", rentecdirect: "~$45/mo for landlords, ~$60+/mo for PMs (as of 2026)", winner: "truecap" },
  { feature: "Sweet spot", truecap: "1-30 doors, solo investor", rentecdirect: "5-100 units, small PM or scaling landlord", winner: "tie" },
];

export default function VsRentecDirectPage() {
  const siteUrl = getSiteUrl();
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Rentec Direct vs TrueCap (2026): PM vs Analysis",
    url: `${siteUrl}/vs/rentec-direct`,
    description:
      "Rentec Direct runs the rentals you own (5-100 units). TrueCap underwrites the ones you're considering. Honest side-by-side.",
    dateModified: "2026-06-07",
    publisher: { "@id": `${siteUrl}/#organization` },
  };

  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <VsBreadcrumbSchema vsPath="/vs/rentec-direct" pageName="TrueCap vs Rentec Direct" />
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
            TrueCap vs Rentec Direct:{" "}
            <span className="text-primary">pre-purchase calculator vs landlord ops platform</span>
          </h1>
          <p className="mt-4 max-w-2xl text-base sm:text-lg leading-relaxed text-muted-foreground">
            Rentec Direct is property management software targeted at small landlords running 5-100 units — tenant management, rent collection, accounting, owner portals. TrueCap models the pre-purchase economics of properties you are considering. We don&apos;t compete; different halves of the rental lifecycle.
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
                <li>You&apos;re evaluating a property before buying.</li>
                <li>You want cap rate, DSCR, cash flow, projection.</li>
                <li>You want a free tier — no monthly commitment.</li>
                <li>You&apos;re not managing 5+ rentals yet.</li>
              </ul>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                Use Rentec Direct when
              </p>
              <ul className="space-y-1.5 text-sm leading-relaxed text-foreground">
                <li>You own 5-100 units and need PM-grade ops + accounting.</li>
                <li>You want rent collection, lease management, work orders, owner reports in one tool.</li>
                <li>You&apos;re scaling past what TurboTenant or Avail can handle.</li>
                <li>You may want to manage for other owners (semi-pro PM workflow).</li>
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
                    Rentec Direct
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
                        <WinnerBadge winner={row.winner} side="rentecdirect" />
                        <span>{row.rentecdirect}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            Rentec Direct details based on publicly available product info as of 2026.
            See{" "}
            <a href="https://rentecdirect.com" target="_blank" rel="noopener" className="underline">
              rentecdirect.com
            </a>{" "}
            for their current state.
          </p>
        </section>

        {/* Complementary workflow */}
        <section className="mb-12 sm:mb-16 rounded-2xl border border-[var(--brand-green)]/25 bg-[var(--brand-green-light)] p-6 sm:p-8">
          <h2 className="text-xl sm:text-2xl font-extrabold text-[var(--brand-green)] mb-3">
            How TrueCap + Rentec Direct fit together
          </h2>
          <ol className="space-y-2.5 text-sm sm:text-base leading-relaxed text-foreground list-decimal pl-5">
            <li>
              <strong>Underwrite the next property in TrueCap.</strong> Cap rate, DSCR, cash flow, projection.
            </li>
            <li>
              <strong>Close + onboard the property in Rentec Direct.</strong> Set up the unit, accept applications, sign lease, start rent collection.
            </li>
            <li>
              <strong>Operate in Rentec Direct.</strong> Rent comes in, expenses get logged, Schedule E builds itself.
            </li>
            <li>
              <strong>Annual review.</strong> Pull Rentec Direct&apos;s actuals; re-run TrueCap&apos;s projection with real numbers.
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

        <ComparisonFaq competitorName="Rentec Direct" items={RENTEC_DIRECT_FAQ} />

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
          <Link href="/vs/turbotenant" className="font-bold text-foreground hover:underline">TrueCap vs TurboTenant</Link>
          {" · "}
          <Link href="/vs/avail" className="font-bold text-foreground hover:underline">TrueCap vs Avail</Link>
        </footer>
      </main>
      <SiteFooter />
      <ScrollDepthTracker />
    </div>
  );
}

const RENTEC_DIRECT_FAQ: FaqItem[] = [
  {
    question: "Is TrueCap a Rentec Direct alternative?",
    answer: (
      <>
        No — different stages. Rentec Direct operates rentals you own. TrueCap underwrites rentals you&apos;re considering buying. Landlords running 5-100 units typically use both.
      </>
    ),
    plainTextAnswer:
      "No — different stages. Rentec Direct operates rentals you own. TrueCap underwrites rentals you&apos;re considering. Landlords running 5-100 units use both.",
  },
  {
    question: "Rentec Direct vs Buildium — which one?",
    answer: (
      <>
        Rentec Direct is generally cheaper and a better fit for landlords managing their own units (5-100). Buildium leans toward property management companies and scales further. For solo investors growing past TurboTenant or Avail, Rentec Direct is often the next step up before Buildium.
      </>
    ),
    plainTextAnswer:
      "Rentec Direct is cheaper and better for self-managing landlords (5-100 units). Buildium leans to PM companies and scales further. Rentec is the step up from TurboTenant/Avail before Buildium.",
  },
  {
    question: "Does Rentec Direct have a free tier?",
    answer: (
      <>
        No — paid only, with a free trial. Pricing starts around $45/month for landlords as of 2026, with per-unit fees scaling up. TrueCap is free for the underwriting layer; if you&apos;re not yet at 5+ units, Rentec Direct may be premature.
      </>
    ),
    plainTextAnswer:
      "No — paid only with a free trial. Starts ~$45/mo for landlords (2026) with per-unit fees. TrueCap is free for underwriting; if you&apos;re below 5 units, Rentec Direct may be premature.",
  },
  {
    question: "Can I use Rentec Direct for underwriting new deals?",
    answer: (
      <>
        No — Rentec Direct is operational only. For pre-purchase underwriting (cap rate, DSCR, cash flow, projection), use TrueCap, DealCheck, or your spreadsheet.
      </>
    ),
    plainTextAnswer:
      "No — Rentec Direct is operational only. For pre-purchase underwriting use TrueCap, DealCheck, or a spreadsheet.",
  },
  {
    question: "Should I use TurboTenant or Rentec Direct?",
    answer: (
      <>
        TurboTenant is better for 1-5 units with a strong free tier. Rentec Direct is better once you&apos;re at 5-100 units and need richer accounting + owner reporting. Both pair with TrueCap upstream.
      </>
    ),
    plainTextAnswer:
      "TurboTenant: better for 1-5 units, strong free tier. Rentec Direct: better at 5-100 units with richer accounting + owner reporting. Both pair with TrueCap upstream.",
  },
];

function WinnerBadge({
  winner,
  side,
}: {
  winner: Verdict;
  side: "row" | "truecap" | "rentecdirect";
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
