/**
 * /vs/roofstock — competitor comparison landing page.
 *
 * Target queries: "Roofstock alternative", "Roofstock vs ...",
 * "Roofstock fees", "Roofstock analyzer", "is Roofstock worth it".
 * Roofstock's individual-investor offering and transaction terms can change.
 * TrueCap is a separate underwriting model investors can use to review a
 * property with their own assumptions.
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
  title: "Roofstock vs TrueCap (2026): Verify the Numbers",
  description:
    "Compare Roofstock's current individual-investor services with TrueCap's separate, assumption-driven rental underwriting workflow.",
  keywords: [
    "roofstock alternative",
    "roofstock vs truecap",
    "roofstock analyzer",
    "roofstock fees",
    "is roofstock worth it",
    "turnkey rental analyzer",
  ],
  alternates: { canonical: "/vs/roofstock" },
  openGraph: {
    title: "Roofstock vs TrueCap (2026): Verify the Numbers",
    description:
      "Roofstock offers services for individual real-estate investors. TrueCap provides a separate, assumption-driven underwrite.",
    url: "/vs/roofstock",
    type: "website",
    images: [
      {
        url: "/home.jpg",
        width: 1200,
        height: 630,
        alt: "TrueCap vs Roofstock",
      },
    ],
  },
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
};

type Verdict = "truecap" | "roofstock" | "tie";
type Row = {
  feature: string;
  truecap: string;
  roofstock: string;
  winner: Verdict;
};

const MATRIX: Row[] = [
  {
    feature: "Primary purpose",
    truecap: "Per-deal underwriting calculator",
    roofstock:
      "Individual-investor real-estate services; confirm current offering",
    winner: "tie",
  },
  {
    feature: "Cost to use",
    truecap: "Free core and paid Pro — see live pricing",
    roofstock: "Service and transaction dependent — confirm current terms",
    winner: "tie",
  },
  {
    feature: "Underwriting perspective",
    truecap: "Separate model using editable assumptions",
    roofstock: "Materials and analysis vary by current service",
    winner: "tie",
  },
  {
    feature: "Cap rate / CoC / DSCR",
    truecap: "Calculated from the assumptions entered",
    roofstock: "Confirm the metrics included in the current offering",
    winner: "truecap",
  },
  {
    feature: "Editable assumptions",
    truecap: "Rent, vacancy, management, reserves, taxes, financing, and more",
    roofstock: "Depends on the current product or transaction workflow",
    winner: "truecap",
  },
  {
    feature: "10-year projection",
    truecap: "Pro — rent, expense, appreciation, and equity scenarios",
    roofstock: "Confirm the analysis included in the current offering",
    winner: "truecap",
  },
  {
    feature: "Sensitivity grid (stress test)",
    truecap: "Pro — rent ±10%, vacancy ±5pp, rate ±1pp",
    roofstock: "Not modeled",
    winner: "truecap",
  },
  {
    feature: "Deal score with breakdown",
    truecap: "Free — 0–100 score with subscore drill-down",
    roofstock: "Confirm any rating methodology in the current offering",
    winner: "truecap",
  },
  {
    feature: "Starting data sources",
    truecap:
      "Editable HUD rent and FRED rate benchmarks; manual local property tax",
    roofstock: "Review the sources and dates in the relevant materials",
    winner: "tie",
  },
  {
    feature: "Transaction services",
    truecap: "No — analysis only",
    roofstock: "Depends on the current individual-investor service",
    winner: "roofstock",
  },
  {
    feature: "Property discovery",
    truecap:
      "No inventory; analyze a supported address or enter inputs manually",
    roofstock: "Depends on the current individual-investor service",
    winner: "roofstock",
  },
  {
    feature: "Property management connection",
    truecap: "Not included",
    roofstock: "Confirm availability and terms for the property",
    winner: "roofstock",
  },
  {
    feature: "Property coverage",
    truecap: "Supported U.S. addresses with manual input fallback",
    roofstock: "Service and property dependent",
    winner: "truecap",
  },
  {
    feature: "Shareable read-only deal link",
    truecap: "Free read-only public link; Pro adds co-branding",
    roofstock: "Confirm what can be shared from the current service",
    winner: "truecap",
  },
  {
    feature: "PDF report export",
    truecap: "Included with Pro",
    roofstock: "Confirm available documents for the current service",
    winner: "truecap",
  },
  {
    feature: "Mobile-first UX",
    truecap: "PWA — install to home screen",
    roofstock: "Mobile-friendly web app",
    winner: "tie",
  },
];

export default function VsRoofstockPage() {
  const siteUrl = getSiteUrl();
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Roofstock vs TrueCap (2026): Verify the Numbers",
    url: `${siteUrl}/vs/roofstock`,
    description:
      "Side-by-side comparison of TrueCap (underwriting calculator) and Roofstock (turnkey rental marketplace).",
    dateModified: "2026-08-16",
    publisher: { "@id": `${siteUrl}/#organization` },
  };

  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <VsBreadcrumbSchema
        vsPath="/vs/roofstock"
        pageName="TrueCap vs Roofstock"
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
            TrueCap vs Roofstock:{" "}
            <span className="text-primary">
              marketplace vs independent underwrite
            </span>
          </h1>
          <p className="mt-4 max-w-2xl text-base sm:text-lg leading-relaxed text-muted-foreground">
            Roofstock&apos;s current site offers services for individual
            real-estate investors. TrueCap is a separate calculator: it does not
            sell or certify a property, but it lets you model a potential
            acquisition using assumptions you can inspect and replace. Confirm
            Roofstock&apos;s current service and transaction terms directly.
          </p>
          <div className="mt-7 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            <ScrollToFormButton className="group inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground shadow-[0_12px_28px_rgba(0,112,196,0.28)] transition-transform hover:-translate-y-0.5">
              <Calculator className="size-4" />
              Underwrite a Roofstock listing
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
                  You want an independent underwrite of a Roofstock listing.
                </li>
                <li>
                  You want to compare a Roofstock deal to a non-Roofstock deal
                  head-to-head.
                </li>
                <li>
                  You want to replace third-party assumptions with
                  property-specific evidence and test a range.
                </li>
                <li>
                  You want a 10-year cash-flow and equity projection, not a
                  year-one snapshot.
                </li>
                <li>
                  You want a Deal score with a transparent breakdown.
                </li>
              </ul>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                Use Roofstock when
              </p>
              <ul className="space-y-1.5 text-sm leading-relaxed text-foreground">
                <li>
                  Its current individual-investor service matches the
                  transaction or ownership support you need.
                </li>
                <li>
                  You have reviewed the current fees, agreements, diligence
                  materials, and service providers.
                </li>
                <li>
                  You understand which work Roofstock performs and which remains
                  your responsibility.
                </li>
                <li>
                  You have independently verified the property-specific
                  financial assumptions.
                </li>
              </ul>
            </div>
          </div>
          <p className="mt-5 text-sm leading-relaxed text-foreground">
            Treat any seller, marketplace, manager, or calculator pro forma as a
            model rather than a promise. Verify the evidence behind rent, taxes,
            insurance, financing, vacancy, management, maintenance, and capital
            reserves, then sensitivity-test the assumptions before deciding.
          </p>
        </section>

        {/* Matrix */}
        <section className="mb-12 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground mb-2">
            Feature-by-feature
          </h2>
          <p className="text-base text-muted-foreground mb-6 leading-relaxed">
            TrueCap provides an underwriting model; Roofstock&apos;s current
            individual-investor services should be confirmed on its official
            site.
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
                    Roofstock
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
                        <WinnerBadge winner={row.winner} side="roofstock" />
                        <span>{row.roofstock}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            Roofstock details based on publicly available product info as of
            2026. See{" "}
            <a
              href="https://www.roofstock.com/investment-solutions/individual-investors"
              target="_blank"
              rel="noopener"
              className="underline"
            >
              Roofstock&apos;s official individual-investor page
            </a>{" "}
            for their current state.
          </p>
        </section>

        {/* The pressure-test angle */}
        <section className="mb-12 sm:mb-16 rounded-2xl border border-[var(--brand-green)]/25 bg-[var(--brand-green-light)] p-6 sm:p-8">
          <h2 className="text-xl sm:text-2xl font-extrabold text-[var(--brand-green)] mb-3">
            How to review a property with your own assumptions
          </h2>
          <ol className="space-y-2.5 text-sm sm:text-base leading-relaxed text-foreground list-decimal pl-5">
            <li>
              <strong>
                Copy the listing address into the TrueCap analyzer.
              </strong>{" "}
              TrueCap starts with editable HUD rent and FRED rate benchmarks;
              property tax stays manual. They are starting assumptions, not
              property-specific quotes or guarantees.
            </li>
            <li>
              <strong>Replace rent with property-specific evidence.</strong>{" "}
              Compare current local comps, executed leases where available,
              concessions, condition, and seasonality. Test a range rather than
              using a universal percentage threshold.
            </li>
            <li>
              <strong>
                Use property- and market-specific expense evidence.
              </strong>{" "}
              Obtain current tax, insurance, management, maintenance, leasing,
              utility, and capital-reserve estimates, then model a reasonable
              range.
            </li>
            <li>
              <strong>Run the sensitivity grid (Pro).</strong> If the deal
              changes across lower rent, higher vacancy, and higher-rate
              scenarios. The grid is decision support, not a forecast.
            </li>
            <li>
              <strong>Review the Deal score and its inputs.</strong> It is a
              heuristic summary of the modeled numbers, 0–100. Apply your own
              criteria and complete diligence.
            </li>
          </ol>
          <p className="mt-4 text-sm leading-relaxed text-foreground">
            Want a faster read on a Roofstock listing? The free{" "}
            <Link
              href="/tools/gross-rent-multiplier-calculator"
              className="font-semibold text-primary hover:underline"
            >
              gross rent multiplier calculator
            </Link>{" "}
            triages one in seconds, and when the listing survives that screen
            the full{" "}
            <Link
              href="/"
              className="font-semibold text-primary hover:underline"
            >
              TrueCap analyzer
            </Link>{" "}
            computes{" "}
            <Link
              href="/glossary/cap-rate"
              className="font-semibold text-primary hover:underline"
            >
              cap rate
            </Link>{" "}
            and{" "}
            <Link
              href="/glossary/cash-on-cash-return"
              className="font-semibold text-primary hover:underline"
            >
              cash-on-cash return
            </Link>{" "}
            from the address. For the full workflow, our guide on{" "}
            <Link
              href="/blog/how-to-underwrite-a-rental-property-in-60-seconds"
              className="font-semibold text-primary hover:underline"
            >
              60-second underwriting
            </Link>{" "}
            walks through exactly the steps above.
          </p>
        </section>

        <ComparisonFaq competitorName="Roofstock" items={ROOFSTOCK_FAQ} />

        {/* Pricing CTA */}
        <section className="mb-12 sm:mb-16 rounded-2xl bg-primary p-6 sm:p-8 text-primary-foreground">
          <h2 className="text-2xl sm:text-3xl font-extrabold mb-2">
            Pressure-test your next Roofstock deal — free.
          </h2>
          <p className="text-sm sm:text-base opacity-90 mb-5 max-w-2xl">
            Free covers the core underwrite and plain read-only share links. Pro
            adds 10-year cash-flow and equity projections, sensitivity, Offer
            Ceiling, co-branding, and included PDFs. New one-time PDF purchases
            are temporarily unavailable. No card to start.
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
            href="/vs/dealcheck"
            className="font-bold text-foreground hover:underline"
          >
            TrueCap vs DealCheck
          </Link>{" "}
          ·{" "}
          <Link
            href="/vs/stessa"
            className="font-bold text-foreground hover:underline"
          >
            TrueCap vs Stessa
          </Link>{" "}
          ·{" "}
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

const ROOFSTOCK_FAQ: FaqItem[] = [
  {
    question: "Is TrueCap a Roofstock alternative?",
    answer: (
      <>
        Not directly — they solve different problems. Roofstock is a current
        individual-investor services vary by offering. TrueCap is a separate
        calculator for supported properties and manually entered assumptions.
        The tools may complement each other, but neither replaces
        property-specific diligence.
      </>
    ),
    plainTextAnswer:
      "Not directly. Roofstock's current individual-investor services vary by offering. TrueCap is a separate calculator for supported properties and manually entered assumptions. Neither replaces property-specific diligence.",
  },
  {
    question: "Are Roofstock listings actually good deals?",
    answer: (
      <>
        That cannot be determined from the platform name. Review the property,
        agreement, current service terms, rent evidence, taxes, insurance,
        financing, vacancy, management, maintenance, reserves, title,
        inspection, and local rules. Sensitivity-test a range; TrueCap does not
        certify a property as a good or bad investment.
      </>
    ),
    plainTextAnswer:
      "That cannot be determined from the platform name. Verify property-specific rent, expenses, financing, title, inspection, and local rules, then sensitivity-test a range. TrueCap does not certify an investment.",
  },
  {
    question: "What is Roofstock's fee compared to using TrueCap?",
    answer: (
      <>
        Roofstock&apos;s offering and transaction terms can change, so use the
        relevant agreement and official site for the current fees. TrueCap has a
        free core analyzer plus paid Pro; new one-time PDF purchases are
        temporarily unavailable. Its live pricing page is the source of truth.
      </>
    ),
    plainTextAnswer:
      "Roofstock's offering and transaction terms can change; confirm current fees in the relevant agreement and official site. TrueCap has a free core and paid Pro plans; see live pricing.",
  },
  {
    question: "Can TrueCap analyze any Roofstock listing?",
    answer: (
      <>
        For supported U.S. addresses, paste the address into TrueCap. If lookup
        data is unavailable, enter the property inputs manually. HUD rent and
        FRED rate are editable screening benchmarks; property tax is a manual
        local input. Replace them with property-specific evidence.
      </>
    ),
    plainTextAnswer:
      "For supported U.S. addresses, paste the address into TrueCap; otherwise enter inputs manually. HUD rent and FRED rate are editable screening benchmarks, while property tax is a manual local input. Replace each with property-specific evidence.",
  },
  {
    question: "Should I trust the Roofstock pro-forma cap rate?",
    answer: (
      <>
        Recalculate it from the documented inputs. Confirm how income, vacancy,
        taxes, insurance, management, maintenance, utilities, and reserves are
        defined, then replace them with current evidence and test a range.
        TrueCap&apos;s result is also only as reliable as the assumptions
        entered.
      </>
    ),
    plainTextAnswer:
      "Recalculate the cap rate from documented inputs. Confirm how every income and expense line is defined, replace assumptions with current evidence, and test a range. TrueCap is also only as reliable as its inputs.",
  },
  {
    question: "When should I skip Roofstock and find deals elsewhere?",
    answer: (
      <>
        Compare Roofstock&apos;s current service, property availability,
        agreements, fees, diligence materials, providers, and support with
        direct sourcing and other alternatives. Choose based on the specific
        transaction and your ability to complete local, legal, financial, and
        physical diligence.
      </>
    ),
    plainTextAnswer:
      "Compare Roofstock's current service, availability, agreements, fees, diligence materials, providers, and support with direct sourcing and alternatives. Decide based on the specific transaction and your diligence capacity.",
  },
];

function WinnerBadge({
  winner,
  side,
}: {
  winner: Verdict;
  side: "row" | "truecap" | "roofstock";
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
