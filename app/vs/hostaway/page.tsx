/**
 * /vs/hostaway — competitor comparison landing page.
 *
 * Target queries: "hostaway alternative", "hostaway vs hostfully", "hostaway vs guesty", "hostaway pricing", "short term rental software".
 * Hostaway is short-term rental property management software — channel manager, automation, dynamic pricing. Direct competitor to Hostfully, Guesty. Sweet spot is 3-100 STR properties.
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
  title: "Hostaway vs TrueCap (2026): STR PM vs Deal Math",
  description:
    "Hostaway runs your STR portfolio after closing. TrueCap underwrites the STR deal before. Honest comparison for short-term rental investors.",
  keywords: [
    "hostaway alternative",
    "hostaway vs hostfully",
    "hostaway vs guesty",
    "hostaway pricing",
    "short term rental software",
  ],
  alternates: { canonical: "/vs/hostaway" },
  openGraph: {
    title: "Hostaway vs TrueCap (2026): STR PM vs Deal Math",
    description:
      "Hostaway manages STRs after closing. TrueCap underwrites the STR deal before. Different stages.",
    url: "/vs/hostaway",
    type: "website",
    images: [{ url: "/home.jpg", width: 1200, height: 630, alt: "TrueCap vs Hostaway" }],
  },
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
};

type Verdict = "truecap" | "hostaway" | "tie";
type Row = { feature: string; truecap: string; hostaway: string; winner: Verdict };

const MATRIX: Row[] = [
  { feature: "Lifecycle stage", truecap: "Pre-purchase — underwrite the STR deal", hostaway: "Post-purchase — host + manage STRs", winner: "tie" },
  { feature: "Cap rate / CoC / DSCR analysis", truecap: "Yes — full engine, editable rent input for STR scenarios", hostaway: "Not modeled", winner: "truecap" },
  { feature: "10-year projection", truecap: "Pro — rent + expense + appreciation", hostaway: "Not modeled", winner: "truecap" },
  { feature: "Secondary Screening Index", truecap: "Free — 0-100 triage score + factor breakdown", hostaway: "Not applicable", winner: "truecap" },
  { feature: "Address auto-fill (rent/rate/tax)", truecap: "Yes — HUD + FRED + state property tax", hostaway: "Not applicable", winner: "truecap" },
  { feature: "Channel manager (Airbnb, Vrbo, Booking)", truecap: "No", hostaway: "Yes — unified inbox + calendar", winner: "hostaway" },
  { feature: "Guest messaging automation", truecap: "No", hostaway: "Yes — full automation suite", winner: "hostaway" },
  { feature: "Dynamic pricing integrations", truecap: "No", hostaway: "Yes — PriceLabs, Wheelhouse, Beyond Pricing", winner: "hostaway" },
  { feature: "Cleaning + vendor scheduling", truecap: "No", hostaway: "Yes — turnover automation", winner: "hostaway" },
  { feature: "Mobile app", truecap: "PWA", hostaway: "Native iOS + Android", winner: "tie" },
  { feature: "Free tier", truecap: "Yes — core cap rate, CoC, DSCR, and cash flow", hostaway: "No — paid only (~$10-15 per listing/mo as of 2026)", winner: "truecap" },
  { feature: "Pricing model", truecap: "Free core; paid Pro — see live pricing", hostaway: "Per-listing pricing, custom enterprise tiers", winner: "tie" },
];

export default function VsHostawayPage() {
  const siteUrl = getSiteUrl();
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Hostaway vs TrueCap (2026): STR PM vs Deal Math",
    url: `${siteUrl}/vs/hostaway`,
    description:
      "Hostaway runs your STR portfolio after closing. TrueCap underwrites the STR deal before. Honest comparison for short-term rental investors.",
    dateModified: "2026-06-07",
    publisher: { "@id": `${siteUrl}/#organization` },
  };

  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <VsBreadcrumbSchema vsPath="/vs/hostaway" pageName="TrueCap vs Hostaway" />
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
            TrueCap vs Hostaway:{" "}
            <span className="text-primary">underwrite the STR, then run the portfolio</span>
          </h1>
          <p className="mt-4 max-w-2xl text-base sm:text-lg leading-relaxed text-muted-foreground">
            Hostaway is a leading short-term rental management platform — channel manager across Airbnb / Vrbo / Booking.com, guest messaging automation, dynamic pricing integrations, cleaning workflows. TrueCap models the property&apos;s pre-purchase economics from user-reviewed assumptions. Different stages, complementary tools.
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
                <li>You&apos;re evaluating a property as a potential STR.</li>
                <li>You want cap rate, DSCR, cash flow before buying.</li>
                <li>You want to compare LTR and STR scenarios on the same property.</li>
                <li>You&apos;re not yet hosting guests.</li>
              </ul>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                Use Hostaway when
              </p>
              <ul className="space-y-1.5 text-sm leading-relaxed text-foreground">
                <li>You own or are about to own a short-term rental.</li>
                <li>You manage 3+ STRs and need automation at scale.</li>
                <li>You want a unified inbox across Airbnb / Vrbo / Booking.com.</li>
                <li>You want dynamic pricing + cleaning automation built in.</li>
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
                    Hostaway
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
                        <WinnerBadge winner={row.winner} side="hostaway" />
                        <span>{row.hostaway}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            Hostaway details based on publicly available product info as of 2026.
            See{" "}
            <a href="https://hostaway.com" target="_blank" rel="noopener" className="underline">
              hostaway.com
            </a>{" "}
            for their current state.
          </p>
        </section>

        {/* Complementary workflow */}
        <section className="mb-12 sm:mb-16 rounded-2xl border border-[var(--brand-green)]/25 bg-[var(--brand-green-light)] p-6 sm:p-8">
          <h2 className="text-xl sm:text-2xl font-extrabold text-[var(--brand-green)] mb-3">
            How STR investors use both
          </h2>
          <ol className="space-y-2.5 text-sm sm:text-base leading-relaxed text-foreground list-decimal pl-5">
            <li>
              <strong>Source the property.</strong> MLS, off-market, or existing STR being sold.
            </li>
            <li>
              <strong>Model the STR underwrite in TrueCap.</strong> Use a conservative monthly-equivalent gross income (e.g. 75% of expected gross STR revenue / 12 to account for vacancy + cleaning). Run cap rate, DSCR, cash flow.
            </li>
            <li>
              <strong>If the deal pencils, close.</strong> Take ownership.
            </li>
            <li>
              <strong>Set up the STR in Hostaway.</strong> Import to Airbnb / Vrbo / Booking; configure dynamic pricing; automate guest messages and cleaning turnover.
            </li>
            <li>
              <strong>Operate.</strong> Hostaway runs day-to-day. Pair with PriceLabs (pricing), Turno (cleaning), and Stessa or Baselane (accounting).
            </li>
          </ol>
          <p className="mt-4 text-sm leading-relaxed text-foreground">
            Only need the underwriting half? Our walkthroughs on{" "}
            <Link href="/blog/how-to-calculate-cap-rate" className="font-semibold text-primary hover:underline">how to calculate cap rate</Link>{" "}
            and <Link href="/blog/how-to-calculate-dscr" className="font-semibold text-primary hover:underline">how to calculate DSCR</Link> show where each
            number comes from, and the{" "}
            <Link href="/blog/short-term-rental-underwriting-playbook" className="font-semibold text-primary hover:underline">short-term rental underwriting playbook</Link>{" "}
            covers the STR-specific adjustments — seasonality, cleaning, and turnover. When
            you want all three computed from an address instead of by hand, run the full{" "}
            <Link href="/" className="font-semibold text-primary hover:underline">TrueCap analyzer</Link>.
          </p>
        </section>

        <ComparisonFaq competitorName="Hostaway" items={HOSTAWAY_FAQ} />

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
          <Link href="/vs/hostfully" className="font-bold text-foreground hover:underline">TrueCap vs Hostfully</Link>
          {" · "}
          <Link href="/vs/mashvisor" className="font-bold text-foreground hover:underline">TrueCap vs Mashvisor</Link>
          {" · "}
          <Link href="/vs/roofstock" className="font-bold text-foreground hover:underline">TrueCap vs Roofstock</Link>
        </footer>
      </main>
      <SiteFooter />
      <ScrollDepthTracker />
    </div>
  );
}

const HOSTAWAY_FAQ: FaqItem[] = [
  {
    question: "Is TrueCap a Hostaway alternative?",
    answer: (
      <>
        No — different stages of the STR lifecycle. Hostaway manages STRs you already own. TrueCap underwrites the entered assumptions before purchase; the investor makes the decision. STR investors may use both.
      </>
    ),
    plainTextAnswer:
      "No — different stages. Hostaway manages STRs you own. TrueCap underwrites whether to buy. STR investors use both.",
  },
  {
    question: "Hostaway vs Hostfully vs Guesty — which one?",
    answer: (
      <>
        Compare Hostaway, Hostfully, and Guesty on current channel coverage, automation, accounting, API, support, implementation, and pricing. Guesty currently publishes Lite for 1-3 listings, Pro for 4-199, and Enterprise for 200+. TrueCap remains the pre-purchase underwriting layer.
      </>
    ),
    plainTextAnswer:
      "Compare Hostaway, Hostfully, and Guesty on current operations features and pricing. Guesty publishes Lite for 1-3 listings, Pro for 4-199, and Enterprise for 200+. TrueCap is the pre-purchase underwriting layer.",
  },
  {
    question: "Does TrueCap have STR-specific data?",
    answer: (
      <>
        Not natively — TrueCap pre-fills HUD long-term rent and lets you override it. For STR-specific data (ADR, occupancy rate, RevPAR by market), you&apos;d use AirDNA or Mashvisor. Plug their projected monthly revenue into TrueCap&apos;s rent field and run the underwrite from there.
      </>
    ),
    plainTextAnswer:
      "Not natively — pre-fills HUD long-term rent. For STR-specific data (ADR, occupancy, RevPAR), use AirDNA or Mashvisor. Plug their projected monthly revenue into TrueCap&apos;s rent field and run the underwrite.",
  },
  {
    question: "Does Hostaway have a free tier?",
    answer: (
      <>
        No — paid only, with a demo. Pricing is per-listing and varies by features; entry-level pricing has historically been around $10-15 per listing per month with feature add-ons. For 1-2 STRs, Hostaway is often overkill — consider Lodgify or Smoobu first.
      </>
    ),
    plainTextAnswer:
      "No — paid only with demo. ~$10-15 per listing/mo + feature add-ons. For 1-2 STRs, often overkill — consider Lodgify or Smoobu first.",
  },
  {
    question: "Can TrueCap model both LTR and STR for the same property?",
    answer: (
      <>
        Yes — run two separate analyses with different rent inputs. One with HUD FMR (LTR scenario), one with your STR projected monthly revenue (gross income ÷ 12 conservatively discounted). Compare the cap rate / cash flow / DSCR side-by-side and pick the strategy that fits.
      </>
    ),
    plainTextAnswer:
      "Yes — two separate analyses, different rent inputs. One with HUD FMR (LTR), one with STR projected revenue. Compare cap rate / cash flow / DSCR and pick the strategy.",
  },
];

function WinnerBadge({
  winner,
  side,
}: {
  winner: Verdict;
  side: "row" | "truecap" | "hostaway";
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
