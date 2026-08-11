/**
 * /vs/reonomy — competitor comparison landing page.
 *
 * Target queries: "reonomy alternative", "reonomy vs propstream", "reonomy pricing", "reonomy review", "commercial real estate data".
 * Reonomy is commercial real estate property + owner intelligence — pull CRE data (owner, debt, transactions, tenants) at the property level. Subsidiary of Altus Group. Different audience than TrueCap (commercial-focused) but appears in investor searches.
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
  title: "Reonomy vs TrueCap (2026): CRE Data vs Rentals",
  description:
    "Reonomy is commercial real estate intelligence (owner, debt, tenants). TrueCap is residential underwriting. Different asset classes — honest comparison.",
  keywords: [
    "reonomy alternative",
    "reonomy vs propstream",
    "reonomy pricing",
    "reonomy review",
    "commercial real estate data",
  ],
  alternates: { canonical: "/vs/reonomy" },
  openGraph: {
    title: "Reonomy vs TrueCap (2026): CRE Data vs Rentals",
    description:
      "Reonomy is commercial RE intelligence + owner data. TrueCap is residential underwriting. Different asset classes.",
    url: "/vs/reonomy",
    type: "website",
    images: [{ url: "/home.jpg", width: 1200, height: 630, alt: "TrueCap vs Reonomy" }],
  },
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
};

type Verdict = "truecap" | "reonomy" | "tie";
type Row = { feature: string; truecap: string; reonomy: string; winner: Verdict };

const MATRIX: Row[] = [
  { feature: "Primary asset class", truecap: "Residential (SFR, small multifamily, owner-occupant)", reonomy: "Commercial (office, retail, industrial, multifamily 5+)", winner: "tie" },
  { feature: "Primary use", truecap: "Per-deal underwriting (decide if it cash-flows)", reonomy: "CRE property + owner intelligence (find + research)", winner: "tie" },
  { feature: "Cap rate / CoC / DSCR analysis", truecap: "Yes — full engine for residential", reonomy: "Not modeled (intelligence only)", winner: "truecap" },
  { feature: "10-year projection", truecap: "Pro — rent + expense + appreciation", reonomy: "Not modeled", winner: "truecap" },
  { feature: "Address auto-fill (rent/rate/tax)", truecap: "Yes — HUD + FRED + state property tax", reonomy: "CRE property data only", winner: "truecap" },
  { feature: "Commercial property data (50M+ properties)", truecap: "No — residential focus", reonomy: "Yes — best-in-class CRE coverage", winner: "reonomy" },
  { feature: "Owner contact info", truecap: "No", reonomy: "Yes — phone + email for CRE owners", winner: "reonomy" },
  { feature: "Debt + transaction history", truecap: "No", reonomy: "Yes — mortgage + sale history", winner: "reonomy" },
  { feature: "Tenant rosters (CRE)", truecap: "No", reonomy: "Yes — tenant lookup", winner: "reonomy" },
  { feature: "Free tier", truecap: "Yes — full residential underwriting", reonomy: "Paid only (enterprise pricing)", winner: "truecap" },
  { feature: "Pricing", truecap: "Free; Pro $29.99/mo", reonomy: "Custom (typically $300+/mo enterprise)", winner: "truecap" },
];

export default function VsReonomyPage() {
  const siteUrl = getSiteUrl();
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Reonomy vs TrueCap (2026): CRE Data vs Rentals",
    url: `${siteUrl}/vs/reonomy`,
    description:
      "Reonomy is commercial real estate intelligence (owner, debt, tenants). TrueCap is residential underwriting. Different asset classes — honest comparison.",
    dateModified: "2026-06-07",
    publisher: { "@id": `${siteUrl}/#organization` },
  };

  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <VsBreadcrumbSchema vsPath="/vs/reonomy" pageName="TrueCap vs Reonomy" />
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
            TrueCap vs Reonomy:{" "}
            <span className="text-primary">residential underwriting vs commercial intelligence</span>
          </h1>
          <p className="mt-4 max-w-2xl text-base sm:text-lg leading-relaxed text-muted-foreground">
            Reonomy is commercial real estate intelligence — property data, owner contact info, debt + transaction history, tenant rosters across 50M+ CRE properties. Used by CRE brokers, lenders, and institutional investors for prospecting + due diligence. TrueCap is a residential rental underwriting calculator — single-family, small multifamily, owner-occupant. Different asset classes, different jobs.
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
                <li>You underwrite residential rentals (SFR, small multifamily, owner-occupant).</li>
                <li>You want cap rate, CoC, DSCR, cash flow on specific addresses.</li>
                <li>You&apos;re not pursuing commercial deals.</li>
                <li>You want a free tier — no enterprise contract.</li>
              </ul>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                Use Reonomy when
              </p>
              <ul className="space-y-1.5 text-sm leading-relaxed text-foreground">
                <li>You source commercial real estate deals.</li>
                <li>You need CRE owner contact info for outreach.</li>
                <li>You research CRE debt + transaction history for due diligence.</li>
                <li>You&apos;re an institutional investor, broker, or lender working in CRE.</li>
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
                    Reonomy
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
                        <WinnerBadge winner={row.winner} side="reonomy" />
                        <span>{row.reonomy}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            Reonomy details based on publicly available product info as of 2026.
            See{" "}
            <a href="https://reonomy.com" target="_blank" rel="noopener" className="underline">
              reonomy.com
            </a>{" "}
            for their current state.
          </p>
        </section>

        {/* Complementary workflow */}
        <section className="mb-12 sm:mb-16 rounded-2xl border border-[var(--brand-green)]/25 bg-[var(--brand-green-light)] p-6 sm:p-8">
          <h2 className="text-xl sm:text-2xl font-extrabold text-[var(--brand-green)] mb-3">
            Where investors use both
          </h2>
          <ol className="space-y-2.5 text-sm sm:text-base leading-relaxed text-foreground list-decimal pl-5">
            <li>
              <strong>If you do residential and commercial.</strong> TrueCap for residential underwriting; Reonomy for CRE prospecting + due diligence.
            </li>
            <li>
              <strong>Purely residential investors.</strong> Reonomy is overkill — residential MLS, PropStream, or DealMachine fit better. TrueCap handles the underwriting.
            </li>
            <li>
              <strong>Purely commercial investors.</strong> Reonomy + a CRE-specific underwriting tool (Argus, RealNex). TrueCap isn&apos;t built for CRE.
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

        <ComparisonFaq competitorName="Reonomy" items={REONOMY_FAQ} />

        {/* Pricing CTA */}
        <section className="mb-12 sm:mb-16 rounded-2xl bg-primary p-6 sm:p-8 text-primary-foreground">
          <h2 className="text-2xl sm:text-3xl font-extrabold mb-2">
            Underwrite the next deal — free.
          </h2>
          <p className="text-sm sm:text-base opacity-90 mb-5 max-w-2xl">
            TrueCap free covers cap rate, CoC, DSCR, NCF, and monthly cash flow.
            Pro unlocks projections, sensitivity, tax strategy, exit scenarios,
            MAO, PDF exports, and co-branded share links.
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
          <Link href="/vs/crexi" className="font-bold text-foreground hover:underline">TrueCap vs Crexi</Link>
          {" · "}
          <Link href="/vs/propstream" className="font-bold text-foreground hover:underline">TrueCap vs PropStream</Link>
          {" · "}
          <Link href="/vs/dealcheck" className="font-bold text-foreground hover:underline">TrueCap vs DealCheck</Link>
        </footer>
      </main>
      <SiteFooter />
      <ScrollDepthTracker />
    </div>
  );
}

const REONOMY_FAQ: FaqItem[] = [
  {
    question: "Is TrueCap a Reonomy alternative?",
    answer: (
      <>
        No — different asset classes. Reonomy is commercial real estate intelligence. TrueCap is residential rental underwriting. The two don&apos;t overlap meaningfully.
      </>
    ),
    plainTextAnswer:
      "No — different asset classes. Reonomy is commercial RE intelligence. TrueCap is residential rental underwriting. They don&apos;t overlap meaningfully.",
  },
  {
    question: "Reonomy vs PropStream — which one?",
    answer: (
      <>
        Different asset classes. Reonomy is commercial real estate (office, retail, industrial, large multifamily). PropStream is residential (single-family, small multifamily, distressed sellers). If you&apos;re sourcing CRE deals, Reonomy. If you&apos;re sourcing residential off-market deals, PropStream.
      </>
    ),
    plainTextAnswer:
      "Different asset classes. Reonomy: commercial RE. PropStream: residential (SFR, small MF, distressed sellers). CRE deals: Reonomy. Residential off-market: PropStream.",
  },
  {
    question: "Is Reonomy enterprise-only?",
    answer: (
      <>
        Effectively yes. Reonomy uses custom enterprise pricing (typically $300+/month and up depending on data tier and team size). They primarily serve CRE brokers, lenders, and institutional investors. For solo residential investors, the data isn&apos;t relevant and the price isn&apos;t justified.
      </>
    ),
    plainTextAnswer:
      "Effectively yes. Custom enterprise pricing typically $300+/mo+ depending on tier + team. Serves CRE brokers, lenders, institutional investors. For solo residential investors, irrelevant + overpriced.",
  },
  {
    question: "Does Reonomy do underwriting?",
    answer: (
      <>
        No — it&apos;s a data intelligence platform. You pull property data, owner contact info, debt + transaction history, then use that data as input to your own underwriting model (an Argus model, an Excel CRE underwrite, or a custom institutional process).
      </>
    ),
    plainTextAnswer:
      "No — data intelligence only. Pull property data + owner contact + debt history, then use as input to your own underwriting (Argus, Excel CRE, or custom institutional process).",
  },
  {
    question: "Should solo investors care about Reonomy?",
    answer: (
      <>
        Only if you&apos;re moving into commercial real estate. For residential investing (the bulk of TrueCap&apos;s audience), Reonomy isn&apos;t relevant — the data doesn&apos;t cover SFR ownership in the way PropStream / BatchLeads do, and the price is built for enterprise budgets.
      </>
    ),
    plainTextAnswer:
      "Only if moving into CRE. For residential investing, Reonomy isn&apos;t relevant — data doesn&apos;t cover SFR ownership like PropStream / BatchLeads, and price is enterprise-built.",
  },
];

function WinnerBadge({
  winner,
  side,
}: {
  winner: Verdict;
  side: "row" | "truecap" | "reonomy";
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
