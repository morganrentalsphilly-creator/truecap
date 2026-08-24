/**
 * /vs/rentcast — competitor comparison landing page.
 *
 * Target queries: "rentcast alternative", "rentcast vs rentometer", "rentcast review", "rentcast pricing", "rent estimate tool".
 * RentCast (formerly Realtyna RentCast / often confused with rentcast.com.au) is a property data + rent estimation API + dashboard. Newer entrant competing with Rentometer for rent comps, plus adds property value estimation. Investors evaluate it as a Rentometer alternative or for API access.
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
  title: "RentCast vs TrueCap (2026): Rent Data vs Deal Math",
  description:
    "RentCast estimates rent and property value. TrueCap underwrites the full deal — including the rent. Honest side-by-side and how they complement each other.",
  keywords: [
    "rentcast alternative",
    "rentcast vs rentometer",
    "rentcast review",
    "rentcast pricing",
    "rent estimate tool",
  ],
  alternates: { canonical: "/vs/rentcast" },
  openGraph: {
    title: "RentCast vs TrueCap (2026): Rent Data vs Deal Math",
    description:
      "RentCast estimates rent + property value. TrueCap underwrites the full deal. Honest comparison.",
    url: "/vs/rentcast",
    type: "website",
    images: [{ url: "/home.jpg", width: 1200, height: 630, alt: "TrueCap vs RentCast" }],
  },
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
};

type Verdict = "truecap" | "rentcast" | "tie";
type Row = { feature: string; truecap: string; rentcast: string; winner: Verdict };

const MATRIX: Row[] = [
  { feature: "Primary purpose", truecap: "Per-deal underwriting calculator", rentcast: "Rent + property value estimation", winner: "tie" },
  { feature: "Cap rate / CoC / DSCR analysis", truecap: "Yes — full engine, free tier", rentcast: "Not modeled", winner: "truecap" },
  { feature: "10-year projection", truecap: "Pro — rent + expense + appreciation", rentcast: "Not modeled", winner: "truecap" },
  { feature: "Illustrative tax impact", truecap: "Pro — depreciation + interest + modeled after-tax CF", rentcast: "Not modeled", winner: "truecap" },
  { feature: "Screening Index + verdict", truecap: "Free — 0-100 score with subscore breakdown", rentcast: "Not applicable", winner: "truecap" },
  { feature: "Rent comp data", truecap: "HUD Fair Market Rent (county-level, gov-published)", rentcast: "Yes — listings-based comps with addresses", winner: "rentcast" },
  { feature: "Property value estimate", truecap: "Purchase price as user input", rentcast: "Yes — automated valuation model", winner: "rentcast" },
  { feature: "API access for developers", truecap: "No", rentcast: "Yes — REST API for rent + value", winner: "rentcast" },
  { feature: "Address auto-fill (multi-source)", truecap: "Yes — HUD + FRED + state property tax", rentcast: "Property data only", winner: "truecap" },
  { feature: "Mortgage + financing math", truecap: "Yes — full PITI + DSCR + amortization", rentcast: "Not included", winner: "truecap" },
  { feature: "Pricing (entry tier)", truecap: "Free core; paid Pro — see live pricing", rentcast: "Free + paid tiers ~$15-$74/mo (as of 2026)", winner: "tie" },
  { feature: "Free tier", truecap: "Yes — core cap rate, CoC, DSCR, and cash flow", rentcast: "Limited free lookups", winner: "truecap" },
  { feature: "Shareable read-only deal link", truecap: "Free — read-only public link; Pro adds co-branding", rentcast: "Not the use case", winner: "truecap" },
  { feature: "PDF deal report", truecap: "Included with Pro", rentcast: "PDF reports available on paid", winner: "tie" },
  { feature: "Investor dashboard (saved deals)", truecap: "Free — dashboard + save up to 5 deals; Pro adds unlimited saves + portfolio rollup", rentcast: "Property-list dashboard", winner: "tie" },
];

export default function VsRentcastPage() {
  const siteUrl = getSiteUrl();
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "RentCast vs TrueCap (2026): Rent Data vs Deal Math",
    url: `${siteUrl}/vs/rentcast`,
    description:
      "RentCast estimates rent and property value. TrueCap underwrites the full deal — including the rent. Honest side-by-side and how they complement each other.",
    dateModified: "2026-06-07",
    publisher: { "@id": `${siteUrl}/#organization` },
  };

  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <VsBreadcrumbSchema vsPath="/vs/rentcast" pageName="TrueCap vs RentCast" />
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
            TrueCap vs RentCast:{" "}
            <span className="text-primary">rent estimates vs full underwriting</span>
          </h1>
          <p className="mt-4 max-w-2xl text-base sm:text-lg leading-relaxed text-muted-foreground">
            RentCast is a property-data + rent-estimation platform — get rent comps, property value estimates, and API access. TrueCap is the underwriting calculator that turns those numbers (and more) into a cash-flow decision. RentCast feeds inputs; TrueCap runs the analysis.
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
                <li>You want a full underwriting analysis with cap rate, DSCR, and cash flow.</li>
                <li>You want financing math baked in (PITI, amortization, DSCR ratios).</li>
                <li>You want a portfolio rollup across saved deals.</li>
                <li>You want a free tier that doesn&apos;t cap analyses.</li>
              </ul>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                Use RentCast when
              </p>
              <ul className="space-y-1.5 text-sm leading-relaxed text-foreground">
                <li>You want listings-based rent comps with comparable property addresses.</li>
                <li>You need API access to integrate rent data into your own software.</li>
                <li>You want automated property value estimates (AVM).</li>
                <li>You&apos;re building a tool and need a data feed, not a UI.</li>
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
                    RentCast
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
                        <WinnerBadge winner={row.winner} side="rentcast" />
                        <span>{row.rentcast}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            RentCast details based on publicly available product info as of 2026.
            See{" "}
            <a href="https://rentcast.io" target="_blank" rel="noopener" className="underline">
              rentcast.io
            </a>{" "}
            for their current state.
          </p>
        </section>

        {/* Complementary workflow */}
        <section className="mb-12 sm:mb-16 rounded-2xl border border-[var(--brand-green)]/25 bg-[var(--brand-green-light)] p-6 sm:p-8">
          <h2 className="text-xl sm:text-2xl font-extrabold text-[var(--brand-green)] mb-3">
            How TrueCap + RentCast fit together
          </h2>
          <ol className="space-y-2.5 text-sm sm:text-base leading-relaxed text-foreground list-decimal pl-5">
            <li>
              <strong>Get a tighter rent estimate in RentCast.</strong> Their listings-based comps give you a more specific number than the HUD county-level baseline.
            </li>
            <li>
              <strong>Plug that rent into TrueCap.</strong> Override the auto-filled HUD rent with RentCast&apos;s number. Everything downstream recalculates.
            </li>
            <li>
              <strong>Run the full underwrite in TrueCap.</strong> Cap rate, DSCR, cash flow, 10-year projection, illustrative tax impact.
            </li>
            <li>
              <strong>Save the deal + revisit later.</strong> TrueCap&apos;s saved-deal feature lets you re-run with updated assumptions when market data shifts.
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

        <ComparisonFaq competitorName="RentCast" items={RENTCAST_FAQ} />

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
          <Link href="/vs/rentometer" className="font-bold text-foreground hover:underline">TrueCap vs Rentometer</Link>
          {" · "}
          <Link href="/vs/zillow-rent-estimate" className="font-bold text-foreground hover:underline">TrueCap vs Zillow Rent Estimate</Link>
          {" · "}
          <Link href="/vs/dealcheck" className="font-bold text-foreground hover:underline">TrueCap vs DealCheck</Link>
        </footer>
      </main>
      <SiteFooter />
      <ScrollDepthTracker />
    </div>
  );
}

const RENTCAST_FAQ: FaqItem[] = [
  {
    question: "Is TrueCap a RentCast alternative?",
    answer: (
      <>
        Not directly — they overlap on rent estimates but TrueCap is full underwriting. RentCast provides listings-based rent comps and AVM-style property value estimates. TrueCap pre-fills an editable HUD area benchmark and then runs the full underwrite. You can use RentCast as one evidence source and TrueCap for the downstream model.
      </>
    ),
    plainTextAnswer:
      "Not directly — they overlap on rent estimates but TrueCap is full underwriting. RentCast provides listings-based rent comps and AVM estimates. TrueCap starts with an editable HUD area benchmark and runs the downstream model.",
  },
  {
    question: "How accurate is RentCast vs TrueCap&apos;s HUD-based rent estimate?",
    answer: (
      <>
        There is no universal accuracy winner. RentCast uses listings-based data, while HUD FMR is an area-level housing-program benchmark. Coverage and fit vary by property and market. Compare both with current subject-property comps or lease evidence and test a reasonable range.
      </>
    ),
    plainTextAnswer:
      "There is no universal accuracy winner. RentCast uses listings-based data, while HUD FMR is an area-level housing-program benchmark. Compare both with subject-property comps or lease evidence and test a reasonable range.",
  },
  {
    question: "Does RentCast do cap rate or DSCR calculations?",
    answer: (
      <>
        No — RentCast is a data and estimation tool, not a financial calculator. You&apos;d use the rent number and AVM property value from RentCast as inputs into a separate calculator (TrueCap, DealCheck, or your spreadsheet) to compute cap rate, DSCR, cash flow, etc.
      </>
    ),
    plainTextAnswer:
      "No — RentCast is data + estimation, not a financial calculator. Use its rent + AVM values as inputs to TrueCap, DealCheck, or your spreadsheet for cap rate, DSCR, cash flow.",
  },
  {
    question: "Which has a better free tier?",
    answer: (
      <>
        TrueCap — unlimited analyses, cap rate, CoC, DSCR, NCF, monthly cash flow all on the free tier. RentCast&apos;s free tier limits the number of property lookups per month and doesn&apos;t include the API. If you only need rent estimates occasionally, both work; if you&apos;re underwriting multiple deals a week, TrueCap free is more useful.
      </>
    ),
    plainTextAnswer:
      "TrueCap — unlimited analyses on the free tier with full metrics. RentCast&apos;s free tier caps property lookups and excludes API. For weekly underwriting, TrueCap free is more useful.",
  },
  {
    question: "Can I use RentCast&apos;s data in TrueCap?",
    answer: (
      <>
        Yes — every input in TrueCap is editable. Pull rent from RentCast, type it into TrueCap&apos;s rent field, and the entire downstream analysis (cap rate, CoC, DSCR, cash flow) updates instantly. This is the most common combined workflow.
      </>
    ),
    plainTextAnswer:
      "Yes — every input in TrueCap is editable. Pull rent from RentCast, type it into TrueCap&apos;s rent field, and the entire downstream analysis updates instantly.",
  },
];

function WinnerBadge({
  winner,
  side,
}: {
  winner: Verdict;
  side: "row" | "truecap" | "rentcast";
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
