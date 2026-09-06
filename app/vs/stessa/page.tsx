/**
 * /vs/stessa — competitor comparison landing page.
 *
 * Stessa now spans acquisition and owned-property operations. Its investment
 * property marketplace includes discovery, buy boxes, listing-level metrics,
 * comps, and editable underwriting. This page compares that current product
 * with TrueCap's narrower acquisition-decision workflow.
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
import { ProductShot } from "@/components/marketing/product-shot";
import { SiteFooter } from "@/components/marketing/site-footer";
import { ScrollToFormButton } from "@/components/marketing/scroll-to-form-button";
import {
  ComparisonFaq,
  type FaqItem,
} from "@/components/marketing/comparison-faq";
import { getSiteUrl } from "@/lib/site-url";
import { VsBreadcrumbSchema } from "@/components/marketing/vs-breadcrumb-schema";

export const metadata: Metadata = {
  title: "TrueCap vs Stessa (2026): Acquisition Workflows",
  description:
    "A dated TrueCap vs Stessa comparison. Both support acquisition analysis; Stessa also offers listing discovery and owned-property operations.",
  keywords: [
    "stessa alternative",
    "stessa vs truecap",
    "rental property acquisition software",
    "rental underwriting comparison",
  ],
  alternates: { canonical: "/vs/stessa" },
  openGraph: {
    title: "TrueCap vs Stessa (2026): Acquisition Workflows",
    description:
      "Both support acquisition analysis; Stessa also offers listing discovery and owned-property operations.",
    url: "/vs/stessa",
    type: "website",
    images: [
      { url: "/home.jpg", width: 1200, height: 630, alt: "TrueCap vs Stessa" },
    ],
  },
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
};

type Verdict = "truecap" | "stessa" | "tie";
type Row = {
  feature: string;
  truecap: string;
  stessa: string;
  winner: Verdict;
};

const MATRIX: Row[] = [
  {
    feature: "Product scope",
    truecap:
      "Focused acquisition screening, target review, and decision records",
    stessa:
      "Acquisition marketplace and underwriting plus accounting and landlord operations",
    winner: "tie",
  },
  {
    feature: "Listing discovery",
    truecap: "No marketplace; analyze an address or listing you bring",
    stessa:
      "Marketplace with investor filters, map layers, watchlists, and buy-box alerts",
    winner: "stessa",
  },
  {
    feature: "Pre-purchase analysis",
    truecap:
      "Cash flow, cap rate, CoC, DSCR, editable assumptions, and paid advanced views",
    stessa:
      "Listing-level rent and sale comps plus editable offer, financing, rent, and operating-cost assumptions",
    winner: "tie",
  },
  {
    feature: "Public returns calculator",
    truecap: "No-account core rental analyzer",
    stessa:
      "Purchase, debt, rent, expense, DSCR, depreciation, and after-tax outputs",
    winner: "tie",
  },
  {
    feature: "Offer Ceiling",
    truecap:
      "Pro — the highest price that still meets your targets",
    stessa:
      "The reviewed official sources describe custom offer-price scenarios, not an Offer Ceiling",
    winner: "truecap",
  },
  {
    feature: "Downside sensitivity",
    truecap: "Pro acquisition grid for rent, vacancy, and rate changes",
    stessa:
      "Owned-portfolio Stress Test varies rent collection and expenses against cash reserves; marketplace assumptions are also editable",
    winner: "tie",
  },
  {
    feature: "Acquisition data context",
    truecap:
      "Editable HUD area-rent and FRED rate benchmarks; manual local property tax",
    stessa:
      "Projected rent, public-record tax, insurance estimate, sale/rent comps, and neighborhood metrics",
    winner: "tie",
  },
  {
    feature: "Longer-range pro forma",
    truecap: "Pro includes a modeled 10-year view",
    stessa:
      "Current Pro pricing publishes budgeting and pro-forma; the reviewed page does not specify a horizon",
    winner: "tie",
  },
  {
    feature: "Owned-property accounting",
    truecap: "No bank-feed accounting",
    stessa: "Automatic bank feeds, transaction tracking, and financial reports",
    winner: "stessa",
  },
  {
    feature: "Tax-time reporting",
    truecap: "No tax-specific module offered right now",
    stessa: "Schedule E report is listed on current Manage and Pro plans",
    winner: "stessa",
  },
  {
    feature: "Rent collection and leasing",
    truecap: "No",
    stessa:
      "Rent collection, tenant screening, maintenance, forms, and plan-dependent eSignatures",
    winner: "stessa",
  },
  {
    feature: "Document storage",
    truecap: "Pro acquisition due-diligence vault",
    stessa: "Unlimited document storage is listed across current plans",
    winner: "tie",
  },
];

export default function VsStessaPage() {
  const siteUrl = getSiteUrl();
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "TrueCap vs Stessa (2026): Acquisition Workflows",
    url: `${siteUrl}/vs/stessa`,
    description:
      "Side-by-side comparison of TrueCap and Stessa for rental investors.",
    dateModified: "2026-08-27",
    publisher: { "@id": `${siteUrl}/#organization` },
  };

  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <VsBreadcrumbSchema vsPath="/vs/stessa" pageName="TrueCap vs Stessa" />
      <main id="main" className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="mb-2">
          <Link
            href="/"
            className="text-xs uppercase tracking-widest text-muted-foreground font-bold hover:text-foreground"
          >
            ← TrueCap
          </Link>
        </div>

        <section className="mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-card px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-primary mb-4">
            <Sparkles className="size-3" />
            Honest comparison
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-foreground leading-[1.05] tracking-tight text-balance">
            TrueCap vs Stessa:{" "}
            <span className="text-primary">
              two acquisition workflows, different depth.
            </span>
          </h1>
          <p className="mt-4 max-w-2xl text-base sm:text-lg leading-relaxed text-muted-foreground">
            Stessa now spans acquisition through owned-property operations: its
            marketplace includes discovery, buy boxes, comps, and editable
            underwriting. TrueCap stays focused on a source-labeled acquisition
            decision and the Offer Ceiling: the highest price that still meets your targets.
          </p>
          <p className="mt-3 text-xs font-semibold text-foreground/75">
            Reviewed August 27, 2026 against the official sources linked below.
          </p>
          <div className="mt-7 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            <ScrollToFormButton className="group inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground shadow-[0_12px_28px_rgba(0,112,196,0.28)] transition-transform hover:-translate-y-0.5">
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
            Free analyzer: no card or signup
          </p>
        </section>

        {/* Real product screenshot from the free sample deal. */}
        <section className="mb-12 sm:mb-16" aria-label="What the decision looks like">
          <ProductShot
            shot="verdict"
            alt="TrueCap's decision view for the sample deal: the Offer Ceiling beside the asking price, cash flow after reserves, and DSCR"
            caption={<>Real output from the free sample deal. <Link href="/analyze?sample=1" prefetch={false} className="font-semibold text-primary underline underline-offset-4">Run it yourself →</Link></>}
          />
        </section>

        <section className="mb-12 sm:mb-16 rounded-2xl border border-border bg-card p-6 sm:p-8">
          <h2 className="text-xl sm:text-2xl font-extrabold text-foreground mb-3">
            TL;DR
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-primary mb-2">
                Pick TrueCap if
              </p>
              <ul className="space-y-1.5 text-sm leading-relaxed text-foreground">
                <li>
                  You already find listings elsewhere and want a focused
                  acquisition review.
                </li>
                <li>You want each starting benchmark labeled and editable.</li>
                <li>
                  You want Buy Box fit and an Offer Ceiling.
                </li>
                <li>
                  You want downside testing and a shareable decision record.
                </li>
              </ul>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                Pick Stessa if
              </p>
              <ul className="space-y-1.5 text-sm leading-relaxed text-foreground">
                <li>
                  You want to discover listings with investor filters and
                  buy-box alerts.
                </li>
                <li>
                  You want projected rent, comps, and underwriting in that
                  marketplace.
                </li>
                <li>You want bank-connected automatic transaction tracking.</li>
                <li>
                  You want rent collection, leasing tools, and tax-time reports
                  in the same broader product.
                </li>
              </ul>
            </div>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            <strong className="text-foreground">Honest take:</strong> the
            products overlap during acquisition. Stessa is no longer accurately
            described as post-purchase only. The meaningful comparison is
            focused decision workflow versus a broader search-to-operations
            platform; using both is optional, not the default answer.
          </p>
        </section>

        <section className="mb-12 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground mb-2">
            Feature-by-feature
          </h2>
          <p className="text-base text-muted-foreground mb-6 leading-relaxed">
            Note: green check ≠ &quot;better&quot; — it means &quot;this is what
            the tool is built for.&quot;
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
                    Stessa
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
                      {row.feature}
                    </td>
                    <td className="py-3 px-3 text-xs leading-relaxed text-foreground/85">
                      <div className="flex items-start gap-2">
                        <WinnerBadge winner={row.winner} side="truecap" />
                        <span>{row.truecap}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-xs leading-relaxed text-foreground/85">
                      <div className="flex items-start gap-2">
                        <WinnerBadge winner={row.winner} side="stessa" />
                        <span>{row.stessa}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 text-xs leading-relaxed text-muted-foreground">
            <p className="font-semibold text-foreground">
              Sources reviewed August 27, 2026:
            </p>
            <ul className="mt-1 list-disc space-y-1 pl-5">
              <li>
                <a
                  href="https://www.stessa.com/investment-property-marketplace/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-foreground"
                >
                  Stessa Investment Property Marketplace
                </a>
              </li>
              <li>
                <a
                  href="https://support.stessa.com/en/articles/10779191-stessa-investment-properties-marketplace"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-foreground"
                >
                  Marketplace help article (September 3, 2025)
                </a>
              </li>
              <li>
                <a
                  href="https://support.stessa.com/en/articles/11146447-investment-property-metrics-faq"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-foreground"
                >
                  Investment Property Metrics FAQ (September 2, 2025)
                </a>
              </li>
              <li>
                <a
                  href="https://support.stessa.com/en/articles/3904791-stress-test-sensitivity-analysis-report"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-foreground"
                >
                  Stress Test / Sensitivity Analysis Report (April 15, 2025)
                </a>
              </li>
              <li>
                <a
                  href="https://www.stessa.com/rental-returns-and-income-tax-calculator/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-foreground"
                >
                  Rental Property Returns and Income Tax Calculator
                </a>
              </li>
              <li>
                <a
                  href="https://www.stessa.com/pricing/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-foreground"
                >
                  Stessa pricing
                </a>
              </li>
            </ul>
            <p className="mt-2">
              Features and plan placement can change; verify the current product
              before buying.
            </p>
          </div>
        </section>

        <section className="mb-12 sm:mb-16 rounded-2xl border border-[var(--brand-green)]/25 bg-[var(--brand-green-light)] p-6 sm:p-8">
          <h2 className="text-xl sm:text-2xl font-extrabold text-[var(--brand-green)] mb-3">
            The actual recommendation
          </h2>
          <p className="text-sm sm:text-base leading-relaxed text-foreground">
            Choose TrueCap when you bring your own listings and want a focused,
            source-labeled acquisition review with an Offer Ceiling.
          </p>
          <p className="mt-3 text-sm sm:text-base leading-relaxed text-foreground">
            Evaluate Stessa when you want listing discovery, buy-box alerts,
            comps, and underwriting connected to ongoing accounting and landlord
            operations.
          </p>
          <p className="mt-3 text-sm sm:text-base leading-relaxed text-foreground">
            If you already use Stessa, test its current acquisition workflow
            against your needs before adding another analyzer. If you prefer
            TrueCap for acquisition, Stessa can still receive the property after
            closing for actuals.
          </p>
          <p className="mt-4 text-sm leading-relaxed text-foreground">
            For acquisition specifically, the highest-leverage TrueCap pages are
            the walkthroughs on{" "}
            <Link
              href="/blog/how-to-calculate-cap-rate"
              className="font-semibold text-primary hover:underline"
            >
              how to calculate cap rate
            </Link>{" "}
            and{" "}
            <Link
              href="/blog/how-to-calculate-dscr"
              className="font-semibold text-primary hover:underline"
            >
              how to calculate DSCR
            </Link>
            , which take the math end to end before you commit to a full
            underwrite, plus the longer-form guides on{" "}
            <Link
              href="/blog/how-to-underwrite-a-rental-property-in-60-seconds"
              className="font-semibold text-primary hover:underline"
            >
              60-second underwriting
            </Link>{" "}
            and{" "}
            <Link
              href="/blog/rental-property-tax-deductions"
              className="font-semibold text-primary hover:underline"
            >
              rental property tax deductions
            </Link>{" "}
            (the operations side that overlaps with what Stessa tracks).
          </p>
        </section>

        <ComparisonFaq
          competitorName="Stessa"
          items={STESSA_FAQ}
          reviewedDate="August 27, 2026"
        />

        <section className="mb-12 sm:mb-16 rounded-2xl bg-primary p-6 sm:p-8 text-primary-foreground">
          <h2 className="text-2xl sm:text-3xl font-extrabold mb-2">
            Underwriting the next deal? Start free.
          </h2>
          <p className="text-sm sm:text-base opacity-90 mb-5 max-w-2xl">
            TrueCap free covers cap rate, CoC, model DSCR, NCF, monthly cash
            flow, up to five saves, read-only share links, and the due-diligence
            checklist/document vault. Pro adds sensitivity, the Offer Ceiling,
            10-year projections, focused comparison, Buy Box screening,
            co-branding, and PDF reports. See live pricing for current terms.
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

const STESSA_FAQ: FaqItem[] = [
  {
    question: "Is Stessa the same kind of tool as TrueCap?",
    answer: (
      <>
        They overlap, but their scope differs. Stessa&apos;s investment-property
        marketplace supports listing discovery, buy boxes, comps, and editable
        acquisition underwriting, then Stessa continues into accounting and
        landlord operations. TrueCap is narrower: a source-labeled acquisition
        decision workflow built around your targets.
      </>
    ),
    plainTextAnswer:
      "They overlap during acquisition. Stessa supports listing discovery, buy boxes, comps, and editable underwriting, then continues into accounting and landlord operations. TrueCap is a narrower, source-labeled acquisition decision workflow built around your targets.",
  },
  {
    question: "Should I use Stessa or TrueCap?",
    answer: (
      <>
        Choose based on workflow. TrueCap fits investors who source listings
        elsewhere and want a focused target, sensitivity, and decision-record
        workflow. Stessa fits investors who want marketplace discovery and
        acquisition analysis connected to accounting and operations. Some
        investors may use both, but neither pairing nor a strict before/after
        split should be assumed.
      </>
    ),
    plainTextAnswer:
      "Choose based on workflow. TrueCap is focused on the acquisition decision against your targets. Stessa connects marketplace discovery and acquisition analysis to accounting and operations. Some investors may use both, but a strict before/after split is inaccurate.",
  },
  {
    question: "Is Stessa free?",
    answer: (
      <>
        Stessa currently publishes a free Essentials tier plus paid Manage and
        Pro tiers with different feature sets. Its current pricing places the
        Schedule E report on Manage and Pro, while Essentials includes basic
        financial reports. Check both live pricing pages for current rates,
        marketplace access, and plan terms.
      </>
    ),
    plainTextAnswer:
      "Stessa publishes a free Essentials tier plus paid Manage and Pro tiers. Current pricing places the Schedule E report on Manage and Pro, while Essentials includes basic financial reports. Check the live pricing page for current rates, marketplace access, and terms.",
  },
  {
    question: "Does TrueCap track expenses like Stessa?",
    answer: (
      <>
        No. TrueCap models projected expenses for underwriting (taxes,
        insurance, vacancy, management, maintenance, and reserves), but it does
        not connect to a bank or treat projected values as actuals. Stessa
        provides those accounting and operations workflows.
      </>
    ),
    plainTextAnswer:
      "No. TrueCap models projected expenses for underwriting but does not connect to a bank or treat projections as actuals. Stessa provides accounting and operations workflows.",
  },
  {
    question: "Can I share a TrueCap analysis with my accountant?",
    answer: (
      <>
        Yes — every TrueCap user can generate a public read-only share link for
        free; Pro adds co-branding and includes the multi-page PDF. Reports
        reflect the analysis fields available for that deal and can support an
        accountant&apos;s independent review; they are not tax advice.
      </>
    ),
    plainTextAnswer:
      "Yes — read-only share links are free. Pro adds co-branding and includes the multi-page PDF. Reports can support independent review but are not tax advice.",
  },
];

function WinnerBadge({
  winner,
  side,
}: {
  winner: Verdict;
  side: "truecap" | "stessa";
}) {
  if (winner === "tie") {
    return (
      <Minus className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/60" />
    );
  }
  const isWinner = winner === side;
  return isWinner ? (
    <Check className="mt-0.5 size-3.5 shrink-0 text-[var(--brand-green)]" />
  ) : (
    <X className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/50" />
  );
}
