/**
 * /vs/batchleads — competitor comparison landing page.
 *
 * Target queries: "batchleads alternative", "batchleads vs propstream", "batchleads pricing", "batchleads review".
 * BatchLeads is real-estate lead generation + list-pulling + skip-tracing — direct competitor to PropStream, often cheaper. Popular with wholesalers and direct-mail-heavy buy-and-hold investors.
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
  title: "TrueCap vs BatchLeads — honest comparison",
  description:
    "BatchLeads finds motivated-seller leads. TrueCap underwrites the deals. Honest comparison plus how active investors use both.",
  keywords: [
    "batchleads alternative",
    "batchleads vs propstream",
    "batchleads pricing",
    "batchleads review",
  ],
  alternates: { canonical: "/vs/batchleads" },
  openGraph: {
    title: "TrueCap vs BatchLeads — honest comparison",
    description:
      "BatchLeads is lead generation + skip-tracing. TrueCap underwrites the deals. Different jobs.",
    url: "/vs/batchleads",
    type: "website",
    images: [{ url: "/home.jpg", width: 1200, height: 630, alt: "TrueCap vs BatchLeads" }],
  },
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
};

type Verdict = "truecap" | "batchleads" | "tie";
type Row = { feature: string; truecap: string; batchleads: string; winner: Verdict };

const MATRIX: Row[] = [
  { feature: "Primary purpose", truecap: "Per-deal underwriting calculator", batchleads: "Lead gen + skip-tracing + list-pulling", winner: "tie" },
  { feature: "Cap rate / CoC / DSCR analysis", truecap: "Yes — full engine, free tier", batchleads: "Not modeled", winner: "truecap" },
  { feature: "10-year projection", truecap: "Pro — rent + expense + appreciation", batchleads: "Not modeled", winner: "truecap" },
  { feature: "Tax strategy modeling", truecap: "Pro — depreciation + interest + after-tax CF", batchleads: "Not modeled", winner: "truecap" },
  { feature: "Deal score + verdict", truecap: "Pro — 0-100 score + plain-English verdict", batchleads: "Not applicable", winner: "truecap" },
  { feature: "Address auto-fill (rent/rate/tax)", truecap: "Yes — HUD + FRED + state property tax", batchleads: "Property data only", winner: "truecap" },
  { feature: "Motivated-seller lists", truecap: "No", batchleads: "Yes — pre-foreclosure, probate, vacant, etc.", winner: "batchleads" },
  { feature: "Skip tracing", truecap: "No", batchleads: "Yes — owner phone + email", winner: "batchleads" },
  { feature: "Direct mail + SMS campaigns", truecap: "No", batchleads: "Yes — built-in outreach", winner: "batchleads" },
  { feature: "Stacked / multi-criteria lists", truecap: "No", batchleads: "Yes — overlay multiple filters", winner: "batchleads" },
  { feature: "Free tier", truecap: "Yes — full underwriting math", batchleads: "Trial; paid from ~$99/mo (as of 2026)", winner: "truecap" },
  { feature: "Pricing (entry tier)", truecap: "Free; Pro $20/mo", batchleads: "Standard ~$99/mo + per-skiptrace fees", winner: "truecap" },
  { feature: "Shareable read-only deal link", truecap: "Pro — public URL + branding", batchleads: "Internal-only", winner: "truecap" },
];

export default function VsBatchleadsPage() {
  const siteUrl = getSiteUrl();
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "TrueCap vs BatchLeads — honest comparison",
    url: `${siteUrl}/vs/batchleads`,
    description:
      "BatchLeads finds motivated-seller leads. TrueCap underwrites the deals. Honest comparison plus how active investors use both.",
    dateModified: "2026-06-07",
    publisher: { "@id": `${siteUrl}/#organization` },
  };

  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <VsBreadcrumbSchema vsPath="/vs/batchleads" pageName="TrueCap vs BatchLeads" />
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
            TrueCap vs BatchLeads:{" "}
            <span className="text-primary">find motivated sellers vs underwrite the deals</span>
          </h1>
          <p className="mt-4 max-w-2xl text-base sm:text-lg leading-relaxed text-muted-foreground">
            BatchLeads is a lead-generation + skip-tracing + list-pulling platform — pull motivated-seller lists, get owner contact info, run direct mail and SMS campaigns. Direct competitor to PropStream, often a cheaper alternative. TrueCap is the underwriting calculator you&apos;d use after BatchLeads surfaces a property.
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
                <li>You have an address and want to underwrite it.</li>
                <li>You want cap rate, DSCR, cash flow, projection.</li>
                <li>You&apos;re not running off-market direct mail campaigns.</li>
                <li>You want a free tier with no monthly cap.</li>
              </ul>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                Use BatchLeads when
              </p>
              <ul className="space-y-1.5 text-sm leading-relaxed text-foreground">
                <li>You source off-market deals via direct mail or SMS.</li>
                <li>You need motivated-seller lists (pre-foreclosure, probate, vacant, tax-delinquent).</li>
                <li>You need stacked filters (overlay multiple list types).</li>
                <li>You want a PropStream alternative that&apos;s sometimes cheaper.</li>
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
                    BatchLeads
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
                        <WinnerBadge winner={row.winner} side="batchleads" />
                        <span>{row.batchleads}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            BatchLeads details based on publicly available product info as of 2026.
            See{" "}
            <a href="https://batchleads.io" target="_blank" rel="noopener" className="underline">
              batchleads.io
            </a>{" "}
            for their current state.
          </p>
        </section>

        {/* Complementary workflow */}
        <section className="mb-12 sm:mb-16 rounded-2xl border border-[var(--brand-green)]/25 bg-[var(--brand-green-light)] p-6 sm:p-8">
          <h2 className="text-xl sm:text-2xl font-extrabold text-[var(--brand-green)] mb-3">
            How wholesalers + active investors use both
          </h2>
          <ol className="space-y-2.5 text-sm sm:text-base leading-relaxed text-foreground list-decimal pl-5">
            <li>
              <strong>Pull motivated-seller lists in BatchLeads.</strong> Probate, pre-foreclosure, vacant, tax-delinquent, absentee owner. Stack filters as needed.
            </li>
            <li>
              <strong>Skip-trace + outreach (mail / SMS / cold call).</strong> BatchLeads handles the outreach automation.
            </li>
            <li>
              <strong>Seller responds with an address.</strong> Now you have a real deal.
            </li>
            <li>
              <strong>Underwrite in TrueCap.</strong> Paste address; HUD rent, FRED rate, state tax pre-fill; run cap rate / DSCR / cash flow.
            </li>
            <li>
              <strong>Make the offer.</strong> Use TrueCap&apos;s MAO solver (Pro) to back into your max-bid.
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

        <ComparisonFaq competitorName="BatchLeads" items={BATCHLEADS_FAQ} />

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
          <Link href="/vs/propstream" className="font-bold text-foreground hover:underline">TrueCap vs PropStream</Link>
          {" · "}
          <Link href="/vs/dealmachine" className="font-bold text-foreground hover:underline">TrueCap vs DealMachine</Link>
          {" · "}
          <Link href="/vs/dealcheck" className="font-bold text-foreground hover:underline">TrueCap vs DealCheck</Link>
        </footer>
      </main>
      <SiteFooter />
      <ScrollDepthTracker />
    </div>
  );
}

const BATCHLEADS_FAQ: FaqItem[] = [
  {
    question: "Is TrueCap a BatchLeads alternative?",
    answer: (
      <>
        No — they solve different problems. BatchLeads finds motivated-seller leads and gives you owner contact info. TrueCap underwrites the property once you have the address. Most active off-market buyers use both.
      </>
    ),
    plainTextAnswer:
      "No. BatchLeads finds motivated-seller leads + owner contact info. TrueCap underwrites the property. Active off-market buyers use both.",
  },
  {
    question: "BatchLeads vs PropStream — which one?",
    answer: (
      <>
        BatchLeads is generally cheaper and stronger on stacked filters (overlay multiple list types). PropStream has deeper public-records data and a more mature ecosystem. Wholesalers running tight mail margins lean BatchLeads; data-heavy operators lean PropStream. Some run both.
      </>
    ),
    plainTextAnswer:
      "BatchLeads is cheaper with stronger stacked filters. PropStream has deeper public records + mature ecosystem. Wholesalers on tight margins lean BatchLeads; data-heavy operators lean PropStream.",
  },
  {
    question: "Does BatchLeads underwrite deals?",
    answer: (
      <>
        No — BatchLeads gives you leads and contact data. It doesn&apos;t calculate cap rate, DSCR, or cash flow. Use TrueCap, DealCheck, or a spreadsheet for the underwriting layer.
      </>
    ),
    plainTextAnswer:
      "No — leads + contact data only. Use TrueCap, DealCheck, or a spreadsheet for underwriting.",
  },
  {
    question: "How does TrueCap&apos;s address auto-fill compare to BatchLeads&apos; property data?",
    answer: (
      <>
        Different scope. BatchLeads has 150M+ properties with motivated-seller indicators (probate, foreclosure status, vacancy, tax delinquency, etc.). TrueCap pre-fills the underwriting-relevant data (HUD Fair Market Rent, FRED 30-year rate, state property tax) — three numbers, but the right three for cap rate and cash flow math. The two complement each other.
      </>
    ),
    plainTextAnswer:
      "Different scope. BatchLeads: 150M+ properties with motivated-seller indicators. TrueCap: HUD rent, FRED rate, state tax (the three numbers needed for cap rate + cash flow). Complementary.",
  },
  {
    question: "Can I use BatchLeads + TrueCap together?",
    answer: (
      <>
        Yes — the standard workflow for active off-market buyers. BatchLeads surfaces motivated-seller leads, you reach out and get a verbal price, paste the address into TrueCap and run the underwrite. Pro Deal Score + MAO solver helps you make a defensible offer.
      </>
    ),
    plainTextAnswer:
      "Yes — standard active-off-market workflow. BatchLeads surfaces leads; you reach out; paste address into TrueCap; underwrite. Pro Deal Score + MAO solver helps you offer defensibly.",
  },
];

function WinnerBadge({
  winner,
  side,
}: {
  winner: Verdict;
  side: "row" | "truecap" | "batchleads";
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
