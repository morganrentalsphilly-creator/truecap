/**
 * /vs/avail — competitor comparison landing page.
 *
 * Target queries: "Avail alternative", "Avail vs ...", "Avail review",
 * "Avail unlimited plus", "Realtor.com Avail" (after the Realtor.com
 * acquisition). Avail is landlord ops: listing, screening, leases,
 * rent collection. Post-purchase, like RentRedi.
 *
 * Same complementary positioning as the RentRedi page — TrueCap is
 * pre-purchase underwrite, Avail is post-purchase operations.
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
  title: "TrueCap vs Avail — honest comparison",
  description:
    "Avail manages your rentals after closing. TrueCap underwrites them before. Honest side-by-side of when each fits, plus how DIY landlords use both together.",
  keywords: [
    "avail alternative",
    "avail vs truecap",
    "avail review",
    "avail unlimited plus",
    "realtor.com avail",
    "rental property analyzer",
  ],
  alternates: { canonical: "/vs/avail" },
  openGraph: {
    title: "TrueCap vs Avail — honest comparison",
    description:
      "Avail is post-purchase landlord ops. TrueCap is pre-purchase underwriting. Different halves of the DIY-landlord lifecycle.",
    url: "/vs/avail",
    type: "website",
    images: [{ url: "/home.jpg", width: 1200, height: 630, alt: "TrueCap vs Avail" }],
  },
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
};

type Verdict = "truecap" | "avail" | "tie";
type Row = { feature: string; truecap: string; avail: string; winner: Verdict };

const MATRIX: Row[] = [
  { feature: "Lifecycle stage",                    truecap: "Pre-purchase — underwrite the deal",                                   avail: "Post-purchase — operate the property",                                   winner: "tie" },
  { feature: "Cap rate / CoC / DSCR analysis",      truecap: "Yes — full engine, free tier",                                          avail: "Not modeled",                                                            winner: "truecap" },
  { feature: "Cash flow projection",                truecap: "Pro — 10-year with rent + expense + appreciation",                       avail: "Not modeled",                                                            winner: "truecap" },
  { feature: "Sensitivity grid",                    truecap: "Pro — rent ±10%, vacancy ±5pp, rate ±1pp",                                avail: "Not modeled",                                                            winner: "truecap" },
  { feature: "Tax strategy modeling",               truecap: "Pro — depreciation + interest + after-tax CF",                            avail: "Not modeled",                                                            winner: "truecap" },
  { feature: "Deal score + plain-English verdict",  truecap: "Pro — 0-100 score + Strong / Solid / Mixed / Marginal / Negative",         avail: "Not applicable",                                                          winner: "truecap" },
  { feature: "Rental listing distribution",         truecap: "No",                                                                      avail: "Yes — syndicated to Realtor.com, Apartments.com, Zillow, etc.",           winner: "avail" },
  { feature: "Online rental application",           truecap: "No",                                                                      avail: "Yes — customizable forms",                                               winner: "avail" },
  { feature: "Tenant screening (credit/criminal)",  truecap: "No",                                                                      avail: "Yes — TransUnion-powered",                                                winner: "avail" },
  { feature: "Online lease signing",                 truecap: "No",                                                                      avail: "Yes — state-specific lease templates",                                    winner: "avail" },
  { feature: "Online rent collection",               truecap: "No",                                                                      avail: "Yes — ACH (free) and card",                                              winner: "avail" },
  { feature: "Maintenance request workflow",         truecap: "No",                                                                      avail: "Yes — tenant portal",                                                    winner: "avail" },
  { feature: "Pricing (entry tier)",                 truecap: "Free for underwriting",                                                  avail: "Free Unlimited tier + Unlimited Plus ~$7/unit/mo (as of 2026)",          winner: "tie" },
  { feature: "Free tier covers core job",            truecap: "Yes — full underwriting math",                                            avail: "Yes — listing, basic lease, ACH rent collection",                         winner: "tie" },
  { feature: "Address auto-fill (rent, rate, tax)",   truecap: "Yes — HUD + FRED + state property tax",                                  avail: "Not applicable",                                                          winner: "truecap" },
  { feature: "Multi-property dashboard",              truecap: "Yes — portfolio rollup of saved deals",                                  avail: "Yes — multi-unit ops dashboard",                                          winner: "tie" },
  { feature: "Owned by Realtor.com",                  truecap: "No (independent)",                                                       avail: "Yes (since 2020)",                                                       winner: "tie" },
];

export default function VsAvailPage() {
  const siteUrl = getSiteUrl();
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "TrueCap vs Avail — honest comparison",
    url: `${siteUrl}/vs/avail`,
    description:
      "Side-by-side comparison of TrueCap (rental underwriting calculator) and Avail (DIY landlord operations).",
    dateModified: "2026-06-07",
    publisher: { "@id": `${siteUrl}/#organization` },
  };

  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <VsBreadcrumbSchema vsPath="/vs/avail" pageName="TrueCap vs Avail" />
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
            TrueCap vs Avail:{" "}
            <span className="text-primary">underwrite the deal, then run the rental</span>
          </h1>
          <p className="mt-4 max-w-2xl text-base sm:text-lg leading-relaxed text-muted-foreground">
            Avail is the DIY-landlord stack: list the unit, screen
            tenants, sign a state-compliant lease, collect rent online,
            handle maintenance. TrueCap is the calculator that decides
            whether the property you&apos;re considering will cash flow
            in the first place. Most independent landlords end up using
            both — TrueCap during due diligence, Avail after closing.
          </p>
          <div className="mt-7 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            <ScrollToFormButton
              className="group inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground shadow-[0_12px_28px_rgba(82,72,212,0.28)] transition-transform hover:-translate-y-0.5"
            >
              <Calculator className="size-4" />
              Underwrite a deal free
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
                <li>Underwriting before you make an offer.</li>
                <li>Comparing 2–3 deals you&apos;re seriously considering.</li>
                <li>10-year cash flow + appreciation projection.</li>
                <li>Stress-testing rent, vacancy, and rate assumptions.</li>
                <li>Generating a shareable read-only deal analysis for partners or lenders.</li>
              </ul>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                Use Avail for
              </p>
              <ul className="space-y-1.5 text-sm leading-relaxed text-foreground">
                <li>Listing a vacant unit across major rental sites.</li>
                <li>Online rental applications + TransUnion-powered screening.</li>
                <li>State-specific lease templates with online signing.</li>
                <li>Online rent collection (ACH is free).</li>
                <li>Tenant maintenance requests + ongoing ops.</li>
              </ul>
            </div>
          </div>
          <p className="mt-5 text-sm leading-relaxed text-foreground">
            One way to think about it: <strong>TrueCap is the diligence
            tool you use during the LOI / inspection period.</strong>{" "}
            Avail is the operations stack you set up the week after you
            close.
          </p>
        </section>

        {/* Matrix */}
        <section className="mb-12 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground mb-2">
            Feature-by-feature
          </h2>
          <p className="text-base text-muted-foreground mb-6 leading-relaxed">
            Most rows show clear specialization — TrueCap for underwrite,
            Avail for ops. Where both have something, the difference is
            usually scope.
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
                    Avail
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
                        <WinnerBadge winner={row.winner} side="avail" />
                        <span>{row.avail}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            Avail details based on publicly available product info as of
            2026. See{" "}
            <a href="https://www.avail.co" target="_blank" rel="noopener" className="underline">
              avail.co
            </a>{" "}
            for their current state.
          </p>
        </section>

        {/* Complementary workflow */}
        <section className="mb-12 sm:mb-16 rounded-2xl border border-[var(--brand-green)]/25 bg-[var(--brand-green-light)] p-6 sm:p-8">
          <h2 className="text-xl sm:text-2xl font-extrabold text-[var(--brand-green)] mb-3">
            The DIY landlord workflow: TrueCap + Avail
          </h2>
          <ol className="space-y-2.5 text-sm sm:text-base leading-relaxed text-foreground list-decimal pl-5">
            <li>
              <strong>Source the deal</strong> (Zillow, MLS, wholesaler,
              off-market).
            </li>
            <li>
              <strong>Underwrite in TrueCap.</strong> Paste the address;
              HUD rent, FRED rate, and state property tax pre-fill.
              Check cap rate, CoC, DSCR, monthly cash flow against
              benchmarks. Sensitize the inputs. Save the deal.
            </li>
            <li>
              <strong>Make the offer</strong> and close.
            </li>
            <li>
              <strong>Set up the property in Avail.</strong> List vacant
              units, accept online applications, screen tenants with
              TransUnion, sign a state-specific lease online.
            </li>
            <li>
              <strong>Collect rent + handle ops in Avail.</strong> ACH
              rent collection is free; tenants submit maintenance
              requests through the portal.
            </li>
            <li>
              <strong>Annual review back in TrueCap.</strong> Re-run the
              underwrite with actuals from Avail to see how the property
              is performing vs the original projection — and feed that
              learning into the next acquisition.
            </li>
          </ol>
          <p className="mt-4 text-sm leading-relaxed text-foreground">
            Want to start with just the underwrite? Try the{" "}
            <Link href="/tools/cap-rate-calculator" className="font-semibold text-primary hover:underline">
              cap rate calculator
            </Link>
            ,{" "}
            <Link href="/tools/cash-on-cash-calculator" className="font-semibold text-primary hover:underline">
              cash-on-cash calculator
            </Link>
            , or the full{" "}
            <Link href="/" className="font-semibold text-primary hover:underline">
              TrueCap analyzer
            </Link>
            . Our guide on{" "}
            <Link href="/blog/how-to-underwrite-a-rental-property-in-60-seconds" className="font-semibold text-primary hover:underline">
              60-second underwriting
            </Link>{" "}
            walks through exactly what to do.
          </p>
        </section>

        <ComparisonFaq competitorName="Avail" items={AVAIL_FAQ} />

        {/* Pricing CTA */}
        <section className="mb-12 sm:mb-16 rounded-2xl bg-primary p-6 sm:p-8 text-primary-foreground">
          <h2 className="text-2xl sm:text-3xl font-extrabold mb-2">
            Underwrite the next deal — free.
          </h2>
          <p className="text-sm sm:text-base opacity-90 mb-5 max-w-2xl">
            TrueCap free covers cap rate, CoC, DSCR, NCF, and monthly
            cash flow. Pro unlocks projections, sensitivity, tax
            strategy, exit scenarios, deal score, MAO, PDF exports, and
            shareable read-only deal links. No card to start.
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
          <Link href="/vs/rentredi" className="font-bold text-foreground hover:underline">
            TrueCap vs RentRedi
          </Link>{" "}
          ·{" "}
          <Link href="/vs/stessa" className="font-bold text-foreground hover:underline">
            TrueCap vs Stessa
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

const AVAIL_FAQ: FaqItem[] = [
  {
    question: "Is TrueCap an Avail alternative?",
    answer: (
      <>
        No — they cover different stages. Avail is post-purchase
        landlord operations: listing, screening, leases, rent
        collection, maintenance. TrueCap is pre-purchase underwriting:
        cap rate, CoC, DSCR, projection, deal score. Most independent
        landlords end up using both.
      </>
    ),
    plainTextAnswer:
      "No — different stages. Avail is post-purchase landlord ops (listing, screening, leases, rent collection, maintenance). TrueCap is pre-purchase underwriting (cap rate, CoC, DSCR, projection, deal score). Most independent landlords use both.",
  },
  {
    question: "Can TrueCap do what Avail's listing or screening does?",
    answer: (
      <>
        No. TrueCap doesn&apos;t distribute listings, run credit
        reports, or store rental applications. Those are
        FCRA-regulated workflows we don&apos;t build. Avail (and
        similar tools) are the right place for that. TrueCap is
        explicitly the &quot;decide if the deal works&quot; layer.
      </>
    ),
    plainTextAnswer:
      "No. TrueCap doesn't distribute listings, pull credit reports, or store applications. Those are FCRA-regulated workflows. Avail is the right tool for that. TrueCap is the 'decide if the deal works' layer.",
  },
  {
    question: "Is Avail free? Is TrueCap?",
    answer: (
      <>
        Avail&apos;s &quot;Unlimited&quot; tier is free for landlords
        and includes listings, lease signing, and ACH rent collection.
        &quot;Unlimited Plus&quot; is ~$7/unit/month (as of 2026) for
        advanced features. TrueCap is free for the underwriting math;
        Pro is $20/month for projections, sensitivity, tax strategy,
        deal score, and share/PDF features. Both have legitimately
        useful free tiers.
      </>
    ),
    plainTextAnswer:
      "Avail Unlimited is free (listings, lease signing, ACH rent collection). Avail Unlimited Plus is ~$7/unit/month (2026). TrueCap free covers underwriting; TrueCap Pro is $20/month. Both have useful free tiers.",
  },
  {
    question: "Does Avail's calculator replace TrueCap?",
    answer: (
      <>
        Avail has some basic financial views in their landlord
        dashboard (rent collected, payment history) but they don&apos;t
        do underwriting — no cap rate, no DSCR, no 10-year projection,
        no sensitivity, no deal score. Their financial views are for
        what&apos;s happening on properties you own. TrueCap models
        what will happen on properties you&apos;re considering.
      </>
    ),
    plainTextAnswer:
      "Avail has basic financial views (rent collected, payment history) but doesn't do underwriting — no cap rate, DSCR, projection, sensitivity, or deal score. Their views are for properties you own; TrueCap models what will happen on properties you're considering.",
  },
  {
    question: "Avail is owned by Realtor.com — does that matter?",
    answer: (
      <>
        Functionally not much for most landlords — Realtor.com
        acquired Avail in 2020 and the product has continued. It does
        mean listings distribute well through Realtor.com&apos;s reach.
        TrueCap is independent, which some investors prefer for
        underwriting because we have no listing-side incentive (we
        don&apos;t benefit from any deal happening — only from giving
        you a good number on it).
      </>
    ),
    plainTextAnswer:
      "Realtor.com acquired Avail in 2020 — product has continued. Listings distribute well through Realtor.com's reach. TrueCap is independent — no listing-side incentive, we don't benefit from any deal happening, only from giving you a good number on it.",
  },
];

function WinnerBadge({
  winner,
  side,
}: {
  winner: Verdict;
  side: "row" | "truecap" | "avail";
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
