/**
 * /vs/rentredi — competitor comparison landing page.
 *
 * Target queries: "RentRedi alternative", "RentRedi vs ...",
 * "RentRedi review", "RentRedi pricing", "best rent collection app".
 * RentRedi is a tenant + rent management platform — collection,
 * applications, maintenance requests. They live AFTER closing.
 *
 * Positioning: TrueCap is the pre-purchase underwrite, RentRedi is the
 * post-purchase operations. Don't fight them — frame as complementary,
 * which is honest and converts better than a phony head-to-head.
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
  title: "TrueCap vs RentRedi — honest comparison",
  description:
    "RentRedi collects rent. TrueCap decides if the deal cash-flows. Honest comparison of when each tool fits — and why most landlords end up using both.",
  keywords: [
    "rentredi alternative",
    "rentredi vs truecap",
    "rentredi review",
    "rentredi pricing",
    "rental property analyzer vs rent collection",
  ],
  alternates: { canonical: "/vs/rentredi" },
  openGraph: {
    title: "TrueCap vs RentRedi — honest comparison",
    description:
      "RentRedi is post-purchase landlord ops. TrueCap is pre-purchase underwriting. Different stages of the rental lifecycle.",
    url: "/vs/rentredi",
    type: "website",
    images: [{ url: "/home.jpg", width: 1200, height: 630, alt: "TrueCap vs RentRedi" }],
  },
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
};

type Verdict = "truecap" | "rentredi" | "tie";
type Row = { feature: string; truecap: string; rentredi: string; winner: Verdict };

const MATRIX: Row[] = [
  { feature: "When in the lifecycle?",            truecap: "Before you buy — underwrite the deal",                                  rentredi: "After you buy — operate the property",                              winner: "tie" },
  { feature: "Cap rate / CoC / DSCR analysis",     truecap: "Yes — full engine, free tier",                                          rentredi: "Not modeled",                                                       winner: "truecap" },
  { feature: "10-year projection",                 truecap: "Pro — rent growth + expense growth + appreciation",                     rentredi: "Not modeled",                                                       winner: "truecap" },
  { feature: "Sensitivity grid",                   truecap: "Pro — rent ±10%, vacancy ±5pp, rate ±1pp",                                rentredi: "Not modeled",                                                       winner: "truecap" },
  { feature: "Tax strategy",                       truecap: "Pro — depreciation + interest + bracket-aware after-tax CF",             rentredi: "Not modeled",                                                       winner: "truecap" },
  { feature: "Deal score (0-100)",                 truecap: "Free — with subscore breakdown",                                          rentredi: "Not modeled",                                                       winner: "truecap" },
  { feature: "Plain-English verdict",              truecap: "Yes — Strong / Solid / Mixed / Marginal / Negative",                     rentredi: "Not applicable",                                                    winner: "truecap" },
  { feature: "Online rent collection",             truecap: "No",                                                                     rentredi: "Yes — ACH + card, late fees, auto-pay",                              winner: "rentredi" },
  { feature: "Tenant screening",                   truecap: "No",                                                                     rentredi: "Yes — credit, criminal, eviction reports",                           winner: "rentredi" },
  { feature: "Online rental application",          truecap: "No",                                                                     rentredi: "Yes — customizable forms",                                          winner: "rentredi" },
  { feature: "Maintenance request workflow",       truecap: "No",                                                                     rentredi: "Yes — tenant portal + tracker",                                     winner: "rentredi" },
  { feature: "Listing distribution",               truecap: "No",                                                                     rentredi: "Yes — syndicated to Realtor.com, Zillow, etc.",                     winner: "rentredi" },
  { feature: "Pricing (entry tier)",               truecap: "Free for underwriting",                                                  rentredi: "~$29.99/month or ~$120/year (as of 2026)",                              winner: "truecap" },
  { feature: "Per-property cost",                  truecap: "Unlimited deals analyzed",                                               rentredi: "Per-unit pricing typically applies above a base",                    winner: "truecap" },
  { feature: "Free tier exists",                   truecap: "Yes — full underwriting",                                                rentredi: "Trial only",                                                        winner: "truecap" },
  { feature: "Address auto-fill (rent, rate, tax)", truecap: "Yes — HUD + FRED + state property tax",                                  rentredi: "Not applicable",                                                    winner: "truecap" },
  { feature: "Multi-property dashboard",           truecap: "Yes — portfolio rollup of saved deals",                                  rentredi: "Yes — operations dashboard across all units",                       winner: "tie" },
];

export default function VsRentRediPage() {
  const siteUrl = getSiteUrl();
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "TrueCap vs RentRedi — honest comparison",
    url: `${siteUrl}/vs/rentredi`,
    description:
      "Side-by-side comparison of TrueCap (rental underwriting calculator) and RentRedi (tenant + rent management).",
    dateModified: "2026-06-07",
    publisher: { "@id": `${siteUrl}/#organization` },
  };

  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <VsBreadcrumbSchema vsPath="/vs/rentredi" pageName="TrueCap vs RentRedi" />
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
            TrueCap vs RentRedi:{" "}
            <span className="text-primary">underwrite vs operate</span>
          </h1>
          <p className="mt-4 max-w-2xl text-base sm:text-lg leading-relaxed text-muted-foreground">
            RentRedi is what you use after closing — rent collection,
            tenant screening, maintenance requests, listing distribution.
            TrueCap is what you use before closing — underwriting the
            deal, modeling cash flow, deciding if the numbers work. They
            don&apos;t replace each other; they cover different halves
            of the lifecycle. Most landlords end up using both.
          </p>
          <div className="mt-7 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            <ScrollToFormButton
              className="group inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground shadow-[0_12px_28px_rgba(82,72,212,0.28)] transition-transform hover:-translate-y-0.5"
            >
              <Calculator className="size-4" />
              Try the TrueCap free analyzer
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
            No card · No signup needed · Cancel anytime
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
                Use TrueCap for
              </p>
              <ul className="space-y-1.5 text-sm leading-relaxed text-foreground">
                <li>Underwriting a property before you buy.</li>
                <li>Comparing two or three potential deals side-by-side.</li>
                <li>Modeling 10-year cash flow, tax strategy, exit scenarios.</li>
                <li>Stress-testing assumptions (rent, vacancy, rate).</li>
                <li>Sharing a polished read-only deal analysis with partners or lenders.</li>
              </ul>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                Use RentRedi for
              </p>
              <ul className="space-y-1.5 text-sm leading-relaxed text-foreground">
                <li>Collecting rent online (ACH + card).</li>
                <li>Listing vacant units across rental sites.</li>
                <li>Running tenant screening (credit, criminal, eviction).</li>
                <li>Handling maintenance requests through a tenant portal.</li>
                <li>Managing the ongoing landlord ops once you own the place.</li>
              </ul>
            </div>
          </div>
          <p className="mt-5 text-sm leading-relaxed text-foreground">
            One framing that helps: <strong>TrueCap is the calculator
            you use during the LOI / inspection period.</strong> RentRedi
            is what you set up the week after closing.
          </p>
        </section>

        {/* Matrix */}
        <section className="mb-12 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground mb-2">
            Feature-by-feature
          </h2>
          <p className="text-base text-muted-foreground mb-6 leading-relaxed">
            Most rows show clear specialization — that&apos;s the point.
            Each tool is the best in class at its stage.
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
                    RentRedi
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
                        <WinnerBadge winner={row.winner} side="rentredi" />
                        <span>{row.rentredi}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            RentRedi details based on publicly available product info as
            of 2026. See{" "}
            <a href="https://www.rentredi.com" target="_blank" rel="noopener" className="underline">
              rentredi.com
            </a>{" "}
            for their current state.
          </p>
        </section>

        {/* Complementary */}
        <section className="mb-12 sm:mb-16 rounded-2xl border border-[var(--brand-green)]/25 bg-[var(--brand-green-light)] p-6 sm:p-8">
          <h2 className="text-xl sm:text-2xl font-extrabold text-[var(--brand-green)] mb-3">
            How most investors use both
          </h2>
          <ol className="space-y-2.5 text-sm sm:text-base leading-relaxed text-foreground list-decimal pl-5">
            <li>
              <strong>Sourcing:</strong> find a property (Zillow, MLS,
              wholesaler, Roofstock).
            </li>
            <li>
              <strong>Underwriting (TrueCap):</strong> paste the address,
              run the analysis, check cap rate / CoC / DSCR / cash flow
              against benchmarks, sensitize, decide.
            </li>
            <li>
              <strong>Negotiate / close.</strong>
            </li>
            <li>
              <strong>Setup (RentRedi):</strong> list the unit if vacant,
              screen tenants, sign lease.
            </li>
            <li>
              <strong>Operations (RentRedi):</strong> collect rent,
              handle maintenance requests, track payments.
            </li>
            <li>
              <strong>Annual review (TrueCap):</strong> revisit the saved
              analysis to compare actuals vs underwrite — and apply that
              lesson to the next deal.
            </li>
          </ol>
          <p className="mt-4 text-sm leading-relaxed text-foreground">
            Want to see the underwriting step in action? Try the{" "}
            <Link href="/tools/cap-rate-calculator" className="font-semibold text-primary hover:underline">
              cap rate calculator
            </Link>{" "}
            or the{" "}
            <Link href="/tools/dscr-calculator" className="font-semibold text-primary hover:underline">
              DSCR calculator
            </Link>
            , or read the guide on{" "}
            <Link href="/blog/how-to-underwrite-a-rental-property-in-60-seconds" className="font-semibold text-primary hover:underline">
              60-second underwriting
            </Link>
            .
          </p>
        </section>

        <ComparisonFaq competitorName="RentRedi" items={RENTREDI_FAQ} />

        {/* Pricing CTA */}
        <section className="mb-12 sm:mb-16 rounded-2xl bg-primary p-6 sm:p-8 text-primary-foreground">
          <h2 className="text-2xl sm:text-3xl font-extrabold mb-2">
            Underwrite the next deal — free.
          </h2>
          <p className="text-sm sm:text-base opacity-90 mb-5 max-w-2xl">
            TrueCap free covers cap rate, CoC, DSCR, NCF, and monthly
            cash flow — enough to underwrite. Pro unlocks share links,
            PDF exports, 10-year projections, tax strategy, sensitivity,
            MAO, and strategy analyzers. No card to start.
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
          <Link href="/vs/stessa" className="font-bold text-foreground hover:underline">
            TrueCap vs Stessa
          </Link>{" "}
          ·{" "}
          <Link href="/vs/avail" className="font-bold text-foreground hover:underline">
            TrueCap vs Avail
          </Link>{" "}
          ·{" "}
          <Link href="/vs/dealcheck" className="font-bold text-foreground hover:underline">
            TrueCap vs DealCheck
          </Link>
        </footer>
      </main>
      <SiteFooter />
      <ScrollDepthTracker />
    </div>
  );
}

const RENTREDI_FAQ: FaqItem[] = [
  {
    question: "Is TrueCap a RentRedi alternative?",
    answer: (
      <>
        No — different tools for different stages. RentRedi is for
        managing a property you already own (rent collection, tenant
        screening, maintenance). TrueCap is for deciding whether to buy
        the property in the first place (underwriting, cap rate, cash
        flow, projection). Most landlords end up using both at different
        points.
      </>
    ),
    plainTextAnswer:
      "No — different tools for different stages. RentRedi manages property you own (rent collection, screening, maintenance). TrueCap decides whether to buy (underwriting, cap rate, cash flow, projection). Most landlords use both.",
  },
  {
    question: "Does TrueCap collect rent like RentRedi?",
    answer: (
      <>
        No, and we&apos;re not planning to. Rent collection is a serious
        compliance + payments product (ACH, NACHA rules, late-fee
        automation, tenant disputes), and there are great companies
        focused on it — RentRedi is one. TrueCap is intentionally
        scope-limited to the underwriting layer.
      </>
    ),
    plainTextAnswer:
      "No, and not planned. Rent collection is a serious compliance + payments product (ACH, NACHA, late-fee automation, disputes). RentRedi specializes in it. TrueCap is intentionally scope-limited to underwriting.",
  },
  {
    question: "Is RentRedi cheaper than TrueCap?",
    answer: (
      <>
        TrueCap is cheaper. TrueCap free covers a full underwrite at no
        cost; TrueCap Pro is $29.99/month. RentRedi is ~$20/month or
        ~$120/year for landlords (as of 2026). The pricing isn&apos;t
        really comparable though — you&apos;d pay for both because they
        do different things.
      </>
    ),
    plainTextAnswer:
      "TrueCap is cheaper. TrueCap free covers underwriting; TrueCap Pro is $29.99/month. RentRedi is ~$20/month or ~$120/year (2026). Pricing isn't really comparable — they do different things.",
  },
  {
    question: "What do I need before I use RentRedi?",
    answer: (
      <>
        You need to actually own (or be about to close on) the
        property. RentRedi&apos;s value kicks in once you have a unit
        to fill or a tenant to bill. That&apos;s exactly the moment
        TrueCap&apos;s job ends — TrueCap helps you decide whether to
        get to that moment in the first place.
      </>
    ),
    plainTextAnswer:
      "You need to actually own (or be closing on) the property. RentRedi's value starts once you have a unit to fill or tenant to bill — exactly when TrueCap's job ends.",
  },
  {
    question: "Does TrueCap have a tenant screening or application feature?",
    answer: (
      <>
        No. TrueCap doesn&apos;t pull credit reports or store rental
        applications. That&apos;s a different compliance regime
        (FCRA-regulated) and we don&apos;t build there. If you need
        tenant screening, RentRedi, RentSpree, or TurboTenant are the
        right tools.
      </>
    ),
    plainTextAnswer:
      "No. TrueCap doesn't pull credit reports or store applications — that's FCRA-regulated and we don't build there. For screening, use RentRedi, RentSpree, or TurboTenant.",
  },
];

function WinnerBadge({
  winner,
  side,
}: {
  winner: Verdict;
  side: "row" | "truecap" | "rentredi";
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
