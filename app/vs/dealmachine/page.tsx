/**
 * /vs/dealmachine — competitor comparison landing page.
 *
 * Target queries: "dealmachine alternative", "dealmachine vs propstream", "dealmachine pricing", "dealmachine review", "driving for dollars app".
 * DealMachine is a mobile-first 'driving for dollars' lead generation app — snap a photo of a distressed property, instantly get owner contact info, send direct mail or skip-trace. Strong with wholesalers and active off-market buyers.
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
import {
  ComparisonFaq,
  type FaqItem,
} from "@/components/marketing/comparison-faq";
import { getSiteUrl } from "@/lib/site-url";
import { VsBreadcrumbSchema } from "@/components/marketing/vs-breadcrumb-schema";

export const metadata: Metadata = {
  title: "DealMachine vs TrueCap (2026): Find vs Underwrite",
  description:
    "DealMachine finds the leads with mobile-first driving for dollars. TrueCap underwrites them. Honest comparison and how investors use both.",
  keywords: [
    "dealmachine alternative",
    "dealmachine vs propstream",
    "dealmachine pricing",
    "dealmachine review",
    "driving for dollars app",
  ],
  alternates: { canonical: "/vs/dealmachine" },
  openGraph: {
    title: "DealMachine vs TrueCap (2026): Find vs Underwrite",
    description:
      "DealMachine is mobile-first lead generation. TrueCap underwrites the deals it surfaces. Different jobs.",
    url: "/vs/dealmachine",
    type: "website",
    images: [
      {
        url: "/home.jpg",
        width: 1200,
        height: 630,
        alt: "TrueCap vs DealMachine",
      },
    ],
  },
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
};

type Verdict = "truecap" | "dealmachine" | "tie";
type Row = {
  feature: string;
  truecap: string;
  dealmachine: string;
  winner: Verdict;
};

const MATRIX: Row[] = [
  {
    feature: "Primary purpose",
    truecap: "Per-deal underwriting calculator",
    dealmachine: "Mobile lead generation + skip-tracing",
    winner: "tie",
  },
  {
    feature: "Cap rate / CoC / DSCR analysis",
    truecap: "Yes — full engine, free tier",
    dealmachine: "Not modeled",
    winner: "truecap",
  },
  {
    feature: "10-year projection",
    truecap: "Pro — rent + expense + appreciation",
    dealmachine: "Not modeled",
    winner: "truecap",
  },
  {
    feature: "Secondary Screening Index",
    truecap: "Free — 0-100 triage score + factor breakdown",
    dealmachine: "Not applicable",
    winner: "truecap",
  },
  {
    feature: "Starting values (rent/rate/tax)",
    truecap: "HUD rent + FRED rate + manual local property tax",
    dealmachine: "Property data only",
    winner: "truecap",
  },
  {
    feature: "Driving for dollars / mobile lead capture",
    truecap: "No",
    dealmachine: "Yes — photo + instant owner lookup",
    winner: "dealmachine",
  },
  {
    feature: "Skip tracing (owner phone/email)",
    truecap: "No",
    dealmachine: "Yes — built-in",
    winner: "dealmachine",
  },
  {
    feature: "Direct mail campaigns",
    truecap: "No",
    dealmachine: "Yes — automated postcards",
    winner: "dealmachine",
  },
  {
    feature: "Property data + lists",
    truecap: "Limited (HUD FMR + FRED)",
    dealmachine: "Yes — 150M+ properties, motivated lists",
    winner: "dealmachine",
  },
  {
    feature: "Mobile-first UX",
    truecap: "PWA installable",
    dealmachine: "Native app (built for mobile)",
    winner: "dealmachine",
  },
  {
    feature: "Free tier",
    truecap: "Yes — core cap rate, CoC, DSCR, and cash flow",
    dealmachine: "Trial only ($59-99/mo paid)",
    winner: "truecap",
  },
  {
    feature: "Pricing (entry tier)",
    truecap: "Free core; paid Pro — see live pricing",
    dealmachine: "Starter ~$59/mo, Pro ~$99/mo (as of 2026)",
    winner: "truecap",
  },
  {
    feature: "Shareable read-only deal link",
    truecap: "Free — read-only public link; Pro adds co-branding",
    dealmachine: "Internal-only data",
    winner: "truecap",
  },
  {
    feature: "PDF deal report",
    truecap: "Included with Pro",
    dealmachine: "Not the use case",
    winner: "truecap",
  },
];

export default function VsDealmachinePage() {
  const siteUrl = getSiteUrl();
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "DealMachine vs TrueCap (2026): Find vs Underwrite",
    url: `${siteUrl}/vs/dealmachine`,
    description:
      "DealMachine finds the leads with mobile-first driving for dollars. TrueCap underwrites them. Honest comparison and how investors use both.",
    dateModified: "2026-06-07",
    publisher: { "@id": `${siteUrl}/#organization` },
  };

  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <VsBreadcrumbSchema
        vsPath="/vs/dealmachine"
        pageName="TrueCap vs DealMachine"
      />
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
            TrueCap vs DealMachine:{" "}
            <span className="text-primary">
              find leads on the street vs underwrite them at the desk
            </span>
          </h1>
          <p className="mt-4 max-w-2xl text-base sm:text-lg leading-relaxed text-muted-foreground">
            DealMachine is the heavyweight in mobile-first driving for dollars —
            snap a photo of a distressed property, get owner contact info
            instantly, send a postcard or skip-trace from your phone. TrueCap
            models the economics of an address from user-reviewed assumptions.
            Different jobs; many active off-market buyers use both.
          </p>
          <div className="mt-7 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            <ScrollToFormButton className="group inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground shadow-[0_12px_28px_rgba(0,112,196,0.28)] transition-transform hover:-translate-y-0.5">
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
                <li>
                  You&apos;ve found an address and want to know if it cash
                  flows.
                </li>
                <li>You want a defensible analysis for a lender or partner.</li>
                <li>
                  You don&apos;t drive for dollars — you source on-market or via
                  wholesalers.
                </li>
                <li>You want a free tier that covers real underwriting.</li>
              </ul>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                Use DealMachine when
              </p>
              <ul className="space-y-1.5 text-sm leading-relaxed text-foreground">
                <li>
                  You actively drive for dollars and want to capture leads on
                  the spot.
                </li>
                <li>
                  You need owner phone/email for direct outreach (skip tracing).
                </li>
                <li>
                  You&apos;re sending postcards and want automation, not a mail
                  house.
                </li>
                <li>
                  You&apos;re a wholesaler or active off-market buy-and-hold
                  investor.
                </li>
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
            Side-by-side on every dimension that matters for a
            comparison-shopping investor.
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
                    DealMachine
                  </th>
                </tr>
              </thead>
              <tbody>
                {MATRIX.map((row) => (
                  <tr
                    key={row.feature}
                    className="border-t border-border align-top"
                  >
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
                        <WinnerBadge winner={row.winner} side="dealmachine" />
                        <span>{row.dealmachine}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            DealMachine details based on publicly available product info as of
            2026. See{" "}
            <a
              href="https://dealmachine.com"
              target="_blank"
              rel="noopener"
              className="underline"
            >
              dealmachine.com
            </a>{" "}
            for their current state.
          </p>
        </section>

        {/* Complementary workflow */}
        <section className="mb-12 sm:mb-16 rounded-2xl border border-[var(--brand-green)]/25 bg-[var(--brand-green-light)] p-6 sm:p-8">
          <h2 className="text-xl sm:text-2xl font-extrabold text-[var(--brand-green)] mb-3">
            How active investors use both
          </h2>
          <ol className="space-y-2.5 text-sm sm:text-base leading-relaxed text-foreground list-decimal pl-5">
            <li>
              <strong>Drive for dollars or pull a list in DealMachine.</strong>{" "}
              Snap the distressed property; pull owner contact info.
            </li>
            <li>
              <strong>Send direct mail / skip-trace / cold call.</strong>{" "}
              DealMachine automates the outreach campaign.
            </li>
            <li>
              <strong>Seller calls back.</strong> Now you have an address you
              might buy.
            </li>
            <li>
              <strong>Underwrite in TrueCap.</strong> Paste the address. HUD
              area rent and the FRED owner-occupied rate can pre-fill as
              editable benchmarks; property tax remains a manual local input.
              Review the Offer Ceiling under your selected targets.
            </li>
            <li>
              <strong>Verify, then record your decision.</strong> TrueCap&apos;s
              Offer Ceiling solver (Pro) works backward from your target return.
              It is not a recommended offer.
            </li>
          </ol>
          <p className="mt-4 text-sm leading-relaxed text-foreground">
            Pulled a lead off the street and want the math? Run a quick
            rent-to-price screen with the free{" "}
            <Link
              href="/tools/1-percent-rule-calculator"
              className="font-semibold text-primary hover:underline"
            >
              1% rule calculator
            </Link>
            , then paste the address into the full{" "}
            <Link
              href="/"
              className="font-semibold text-primary hover:underline"
            >
              TrueCap analyzer
            </Link>{" "}
            for cap rate, DSCR, and cash flow. Our guide on{" "}
            <Link
              href="/blog/how-to-underwrite-a-rental-property-in-60-seconds"
              className="font-semibold text-primary hover:underline"
            >
              60-second underwriting
            </Link>{" "}
            walks through the workflow end-to-end.
          </p>
        </section>

        <ComparisonFaq competitorName="DealMachine" items={DEALMACHINE_FAQ} />

        {/* Pricing CTA */}
        <section className="mb-12 sm:mb-16 rounded-2xl bg-primary p-6 sm:p-8 text-primary-foreground">
          <h2 className="text-2xl sm:text-3xl font-extrabold mb-2">
            Underwrite the next deal — free.
          </h2>
          <p className="text-sm sm:text-base opacity-90 mb-5 max-w-2xl">
            TrueCap free covers cap rate, CoC, DSCR, NCF, and monthly cash flow.
            Pro adds 10-year cash-flow and equity projections, sensitivity,
            Offer Ceiling, co-branded share links, and PDF reports with Pro; see
            live pricing for current terms. No card to start.
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
          <Link
            href="/vs/propstream"
            className="font-bold text-foreground hover:underline"
          >
            TrueCap vs PropStream
          </Link>
          {" · "}
          <Link
            href="/vs/dealcheck"
            className="font-bold text-foreground hover:underline"
          >
            TrueCap vs DealCheck
          </Link>
          {" · "}
          <Link
            href="/vs/mashvisor"
            className="font-bold text-foreground hover:underline"
          >
            TrueCap vs Mashvisor
          </Link>
        </footer>
      </main>
      <SiteFooter />
      <ScrollDepthTracker />
    </div>
  );
}

const DEALMACHINE_FAQ: FaqItem[] = [
  {
    question: "Is TrueCap a DealMachine alternative?",
    answer: (
      <>
        Not really — they solve different problems. DealMachine finds
        motivated-seller leads via mobile driving for dollars + skip-tracing.
        TrueCap underwrites a specific property once you have an address. Most
        active off-market buyers use both.
      </>
    ),
    plainTextAnswer:
      "Not really. DealMachine finds leads via mobile driving for dollars + skip-tracing. TrueCap underwrites a specific property. Active off-market buyers use both.",
  },
  {
    question: "DealMachine vs PropStream — which one?",
    answer: (
      <>
        DealMachine is more mobile-first and best for driving-for-dollars
        workflows. PropStream is more data-heavy with deeper public records
        access and richer list-pull filters. Solo investors who hunt on the road
        lean DealMachine; teams running large mail campaigns from a desk lean
        PropStream. Some wholesalers run both.
      </>
    ),
    plainTextAnswer:
      "DealMachine is mobile-first and best for driving for dollars. PropStream is data-heavy with deeper public records and richer list filters. Road-warriors lean DealMachine; large mail campaigns lean PropStream.",
  },
  {
    question: "Is DealMachine worth $59-99/month?",
    answer: (
      <>
        It depends on volume. DealMachine&apos;s all-in acquisition workflow may
        fit frequent driving-for-dollars and direct-mail campaigns. If you buy
        only a few properties through listed channels, evaluate whether you need
        that workflow. TrueCap&apos;s free and paid underwriting options are
        listed on its live pricing page.
      </>
    ),
    plainTextAnswer:
      "It depends on volume. DealMachine may fit frequent driving-for-dollars and direct-mail campaigns. For occasional listed acquisitions, compare the workflow against your actual needs. TrueCap's current underwriting options are on its live pricing page.",
  },
  {
    question: "Does DealMachine do underwriting?",
    answer: (
      <>
        No — it surfaces motivated-seller leads and contact info but
        doesn&apos;t model cap rate, DSCR, or cash flow on those leads.
        You&apos;d use TrueCap, DealCheck, or a spreadsheet to run the numbers
        after DealMachine finds you a deal.
      </>
    ),
    plainTextAnswer:
      "No — leads + contact only, no cap rate / DSCR / cash flow modeling. Use TrueCap, DealCheck, or a spreadsheet after DealMachine finds a deal.",
  },
  {
    question: "Can I use DealMachine + TrueCap on the same property?",
    answer: (
      <>
        One possible workflow is to source a property in DealMachine, then
        underwrite the entered assumptions in TrueCap. Pro calculates an Offer
        Ceiling under the selected targets. Verify the material inputs and
        record your own decision before any transaction step.
      </>
    ),
    plainTextAnswer:
      "One possible workflow is to source a property in DealMachine, then underwrite it in TrueCap. Pro calculates an Offer Ceiling under selected targets; verify the material inputs and record your own decision.",
  },
];

function WinnerBadge({
  winner,
  side,
}: {
  winner: Verdict;
  side: "row" | "truecap" | "dealmachine";
}) {
  if (side === "row") return null;
  if (winner === "tie") {
    return (
      <Minus className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/60" />
    );
  }
  if (winner === side) {
    return (
      <Check className="mt-0.5 size-3.5 shrink-0 text-[var(--brand-green)]" />
    );
  }
  return <X className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/50" />;
}
