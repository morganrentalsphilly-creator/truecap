/**
 * /vs/propstream — competitor comparison landing page.
 *
 * Target queries: "propstream alternative", "propstream vs", "propstream pricing", "propstream review", "cheaper than propstream".
 * PropStream is a real-estate lead-generation + property data platform — skip-tracing, list-pulling, motivated-seller filters. Investors searching 'propstream alternative' are usually looking for a cheaper way to find off-market leads OR realize they need underwriting too.
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
  title: "TrueCap vs PropStream — honest comparison",
  description:
    "PropStream finds the deals. TrueCap decides if they actually cash flow. Honest side-by-side of when each fits, plus the workflow most investors run.",
  keywords: [
    "propstream alternative",
    "propstream vs",
    "propstream pricing",
    "propstream review",
    "cheaper than propstream",
  ],
  alternates: { canonical: "/vs/propstream" },
  openGraph: {
    title: "TrueCap vs PropStream — honest comparison",
    description:
      "PropStream finds leads. TrueCap underwrites them. Different jobs in the same workflow — most investors use both.",
    url: "/vs/propstream",
    type: "website",
    images: [{ url: "/home.jpg", width: 1200, height: 630, alt: "TrueCap vs PropStream" }],
  },
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
};

type Verdict = "truecap" | "propstream" | "tie";
type Row = { feature: string; truecap: string; propstream: string; winner: Verdict };

const MATRIX: Row[] = [
  { feature: "Lifecycle stage", truecap: "Underwriting — does this deal pencil?", propstream: "Lead generation — find motivated sellers", winner: "tie" },
  { feature: "Cap rate / CoC / DSCR analysis", truecap: "Yes — full engine, free tier", propstream: "Not modeled", winner: "truecap" },
  { feature: "10-year projection", truecap: "Pro — rent + expense + appreciation", propstream: "Not modeled", winner: "truecap" },
  { feature: "Tax strategy modeling", truecap: "Pro — depreciation + interest + after-tax CF", propstream: "Not modeled", winner: "truecap" },
  { feature: "Deal score + verdict", truecap: "Free — 0-100 score + Strong / Solid / Mixed / Negative", propstream: "Not applicable", winner: "truecap" },
  { feature: "Address auto-fill (rent/rate/tax)", truecap: "Yes — HUD + FRED + state property tax", propstream: "Property data only — no underwriting", winner: "truecap" },
  { feature: "Skip tracing", truecap: "No", propstream: "Yes — owner phone + email lookup", winner: "propstream" },
  { feature: "Motivated-seller lists", truecap: "No", propstream: "Yes — pre-foreclosure, probate, vacant, tax delinquent", winner: "propstream" },
  { feature: "Public records data", truecap: "Limited (HUD FMR + FRED)", propstream: "Yes — 150M+ properties", winner: "propstream" },
  { feature: "List builder / direct mail integration", truecap: "No", propstream: "Yes — full marketing stack", winner: "propstream" },
  { feature: "Mobile-first UX", truecap: "Yes — PWA installable", propstream: "Mobile app exists", winner: "tie" },
  { feature: "Pricing (entry tier)", truecap: "Free for underwriting; Pro $29.99/mo", propstream: "~$99/mo (as of 2026), no real free tier", winner: "truecap" },
  { feature: "Free tier", truecap: "Yes — full underwriting math", propstream: "No — paid only", winner: "truecap" },
  { feature: "Shareable read-only deal link", truecap: "Pro — public URL + branding", propstream: "Internal-only data", winner: "truecap" },
  { feature: "Lender-ready PDF", truecap: "Pro — multi-page report", propstream: "Not the use case", winner: "truecap" },
];

export default function VsPropstreamPage() {
  const siteUrl = getSiteUrl();
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "TrueCap vs PropStream — honest comparison",
    url: `${siteUrl}/vs/propstream`,
    description:
      "PropStream finds the deals. TrueCap decides if they actually cash flow. Honest side-by-side of when each fits, plus the workflow most investors run.",
    dateModified: "2026-06-07",
    publisher: { "@id": `${siteUrl}/#organization` },
  };

  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <VsBreadcrumbSchema vsPath="/vs/propstream" pageName="TrueCap vs PropStream" />
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
            TrueCap vs PropStream:{" "}
            <span className="text-primary">find the leads vs underwrite the deals</span>
          </h1>
          <p className="mt-4 max-w-2xl text-base sm:text-lg leading-relaxed text-muted-foreground">
            PropStream is the heavyweight in real-estate lead generation — skip tracing, list-pulling, motivated-seller filters across 150M+ properties. TrueCap is the calculator that decides which of those leads actually pencil out. Different jobs. Most serious investors run both: PropStream to source, TrueCap to underwrite.
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
                <li>You&apos;ve found a property and need to know if it cash flows.</li>
                <li>You want a defensible analysis to send to a lender or partner.</li>
                <li>You don&apos;t need to source leads — you have a deal in hand.</li>
                <li>You want a free tier that covers real underwriting.</li>
              </ul>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                Use PropStream when
              </p>
              <ul className="space-y-1.5 text-sm leading-relaxed text-foreground">
                <li>You source off-market deals as part of your strategy.</li>
                <li>You need motivated-seller lists (pre-foreclosure, probate, vacant).</li>
                <li>You want owner phone / email for direct outreach.</li>
                <li>You&apos;re spending real money on direct mail or cold call campaigns.</li>
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
                    PropStream
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
                        <WinnerBadge winner={row.winner} side="propstream" />
                        <span>{row.propstream}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            PropStream details based on publicly available product info as of 2026.
            See{" "}
            <a href="https://propstream.com" target="_blank" rel="noopener" className="underline">
              propstream.com
            </a>{" "}
            for their current state.
          </p>
        </section>

        {/* Complementary workflow */}
        <section className="mb-12 sm:mb-16 rounded-2xl border border-[var(--brand-green)]/25 bg-[var(--brand-green-light)] p-6 sm:p-8">
          <h2 className="text-xl sm:text-2xl font-extrabold text-[var(--brand-green)] mb-3">
            How most investors use both
          </h2>
          <ol className="space-y-2.5 text-sm sm:text-base leading-relaxed text-foreground list-decimal pl-5">
            <li>
              <strong>Source the deal in PropStream.</strong> Build motivated-seller lists; skip-trace; pull contact info; send mail or text.
            </li>
            <li>
              <strong>Get a callback / motivated seller responds.</strong> Now you have an address.
            </li>
            <li>
              <strong>Underwrite in TrueCap.</strong> Paste the address. HUD rent, FRED rate, state property tax pre-fill. Run the analysis. Decide your max offer.
            </li>
            <li>
              <strong>Negotiate / make the offer.</strong> TrueCap&apos;s MAO solver (Pro) backs into your max-bid from a target return — useful when the seller counters.
            </li>
            <li>
              <strong>Close, save the deal, track actuals in your accounting tool.</strong> TrueCap doesn&apos;t do operations — pair with Stessa or your bookkeeping system.
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

        <ComparisonFaq competitorName="PropStream" items={PROPSTREAM_FAQ} />

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
          <Link href="/vs/dealcheck" className="font-bold text-foreground hover:underline">TrueCap vs DealCheck</Link>
          {" · "}
          <Link href="/vs/stessa" className="font-bold text-foreground hover:underline">TrueCap vs Stessa</Link>
          {" · "}
          <Link href="/vs/mashvisor" className="font-bold text-foreground hover:underline">TrueCap vs Mashvisor</Link>
        </footer>
      </main>
      <SiteFooter />
      <ScrollDepthTracker />
    </div>
  );
}

const PROPSTREAM_FAQ: FaqItem[] = [
  {
    question: "Is TrueCap a PropStream alternative?",
    answer: (
      <>
        Not really — they solve different problems. PropStream finds motivated-seller leads with skip-tracing and public-records data. TrueCap underwrites a specific property once you have an address. Most serious investors use both: PropStream to source, TrueCap to underwrite.
      </>
    ),
    plainTextAnswer:
      "Not really — different problems. PropStream finds motivated-seller leads with skip-tracing and public-records data. TrueCap underwrites a specific property. Investors use both: PropStream to source, TrueCap to underwrite.",
  },
  {
    question: "Can TrueCap do skip tracing or pull property lists?",
    answer: (
      <>
        No. TrueCap focuses on per-deal underwriting and uses authoritative public data (HUD Fair Market Rent, FRED 30-year rate, state property tax) to pre-fill assumptions. For lead generation, list pulls, and owner contact info, PropStream or DealMachine are the right tools.
      </>
    ),
    plainTextAnswer:
      "No. TrueCap focuses on per-deal underwriting using HUD FMR, FRED rate, and state property tax. For lead gen, lists, and owner contact info, use PropStream or DealMachine.",
  },
  {
    question: "Is PropStream worth $99/month?",
    answer: (
      <>
        It depends on volume. If you send direct mail to 1,000+ addresses a month or run a wholesaling operation, the lists and skip-tracing pay for themselves quickly. If you&apos;re a buy-and-hold investor who buys 1-3 properties a year through MLS or your network, PropStream is overkill — the data you need (rent, tax, property details) is already in TrueCap or your MLS access.
      </>
    ),
    plainTextAnswer:
      "Depends on volume. If you send 1,000+ direct mail pieces/month or wholesale, lists + skip-tracing pay for themselves. If you buy 1-3 properties/year via MLS or your network, PropStream is overkill.",
  },
  {
    question: "Does TrueCap have a free tier? PropStream doesn&apos;t.",
    answer: (
      <>
        Yes — TrueCap&apos;s free tier covers cap rate, cash-on-cash, DSCR, cash flow, and address auto-fill on unlimited deals. No card required. Pro ($29.99/mo) adds projections, tax strategy, sensitivity, and PDF export. PropStream is paid-only — no real free tier beyond a trial.
      </>
    ),
    plainTextAnswer:
      "Yes. TrueCap free covers cap rate, CoC, DSCR, cash flow, address auto-fill on unlimited deals. Pro is $29.99/mo. PropStream has no real free tier.",
  },
  {
    question: "What&apos;s the best PropStream alternative for finding deals?",
    answer: (
      <>
        If you specifically want lead generation, look at DealMachine (mobile-first driving for dollars), BatchLeads (similar volume to PropStream, sometimes cheaper), or Reonomy (commercial-leaning). TrueCap isn&apos;t in that category — we&apos;re the underwriting layer you&apos;d use after any of those finds you a property.
      </>
    ),
    plainTextAnswer:
      "For lead gen: DealMachine (mobile-first), BatchLeads (similar to PropStream), or Reonomy (commercial). TrueCap is the underwriting layer you&apos;d use after any of those finds a property.",
  },
];

function WinnerBadge({
  winner,
  side,
}: {
  winner: Verdict;
  side: "row" | "truecap" | "propstream";
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
