/**
 * /vs/zillow-rent-estimate — TrueCap vs Zillow Zestimate Rent.
 *
 * Target queries: "zillow rent estimate accuracy", "zillow rent vs",
 * "zestimate alternative", "how accurate is zillow rent", "better than
 * zillow rent estimate". Significant search volume from investors who
 * suspect Zillow's rent is off but don't have a better source.
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
import { RelatedContent } from "@/components/marketing/related-content";
import { ScrollToFormButton } from "@/components/marketing/scroll-to-form-button";
import {
  ComparisonFaq,
  type FaqItem,
} from "@/components/marketing/comparison-faq";
import { getSiteUrl } from "@/lib/site-url";
import { VsBreadcrumbSchema } from "@/components/marketing/vs-breadcrumb-schema";

export const metadata: Metadata = {
  title: "Zillow Rent Estimate vs TrueCap (2026): Accuracy",
  description:
    "Compare Zillow's property-specific Rent Zestimate with TrueCap's editable HUD area benchmark and full rental underwriting workflow.",
  keywords: [
    "zillow rent estimate accuracy",
    "zillow rent vs market",
    "zestimate alternative",
    "how accurate is zillow rent estimate",
    "better than zillow rent estimate",
    "rent estimator vs zillow",
    "hud fair market rent vs zillow",
  ],
  alternates: { canonical: "/vs/zillow-rent-estimate" },
  openGraph: {
    title: "Zillow Rent Estimate vs TrueCap (2026): Accuracy",
    description:
      "How an editable HUD area benchmark and full underwriting differ from Zillow's property-specific Rent Zestimate.",
    url: "/vs/zillow-rent-estimate",
    type: "website",
    images: [
      {
        url: "/home.jpg",
        width: 1200,
        height: 630,
        alt: "TrueCap vs Zillow Rent Estimate",
      },
    ],
  },
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
};

type Verdict = "truecap" | "zillow" | "tie";
type Row = {
  feature: string;
  truecap: string;
  zillow: string;
  winner: Verdict;
};

const MATRIX: Row[] = [
  {
    feature: "Rent estimate source",
    truecap: "Editable HUD area benchmark; add property-specific rent evidence",
    zillow:
      "Property-specific estimate using public data and similar local listings",
    winner: "tie",
  },
  {
    feature: "Estimate accuracy",
    truecap:
      "Depends on the benchmark and property-specific evidence you enter",
    zillow: "Varies with the available data, property, and market",
    winner: "tie",
  },
  {
    feature: "Useful for investor underwriting",
    truecap:
      "Yes — rent remains editable inside the full expense and financing model",
    zillow: "Useful starting point; verify with current local evidence",
    winner: "truecap",
  },
  {
    feature: "Full deal underwrite",
    truecap:
      "Free core metrics; Pro adds 10-year projections and advanced scenarios",
    zillow: "No — rent and listing context, not a full acquisition underwrite",
    winner: "truecap",
  },
  {
    feature: "Property tax input",
    truecap:
      "Manual local bill or reviewed rate; blank inputs use a disclosed generic fallback",
    zillow: "Listing/public-record context; verify the post-sale tax basis",
    winner: "tie",
  },
  {
    feature: "Cap rate / CoC / DSCR computation",
    truecap: "Computed live with editable assumptions",
    zillow: "Not in scope",
    winner: "truecap",
  },
  {
    feature: "Free to use",
    truecap: "Yes — unlimited free analyses",
    zillow: "Yes — free",
    winner: "tie",
  },
  {
    feature: "Mobile usable",
    truecap: "Mobile-first responsive",
    zillow: "Strong mobile app",
    winner: "tie",
  },
  {
    feature: "Listing data integration",
    truecap:
      "Address lookup plus editable rent/rate benchmarks and a manual local tax input",
    zillow: "Full consumer listing database with property details",
    winner: "zillow",
  },
  {
    feature: "Photo / virtual tour",
    truecap: "Not in scope — TrueCap is analysis, not browsing",
    zillow: "Yes — extensive photos + tours",
    winner: "zillow",
  },
  {
    feature: "Save deals + portfolio rollup",
    truecap:
      "Free saves up to 5 deals; Pro adds unlimited saves, portfolio rollup + comparison",
    zillow: "Save listings but no portfolio analysis",
    winner: "truecap",
  },
  {
    feature: "Shareable analysis URL",
    truecap: "Free — read-only public URL for the available analysis",
    zillow: "Share listing URL only",
    winner: "truecap",
  },
  {
    feature: "Underwriting context",
    truecap: "Free — core economics + Buy Box fit",
    zillow: "Rent estimate only",
    winner: "truecap",
  },
];

export default function VsZillowRentPage() {
  const siteUrl = getSiteUrl();
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Zillow Rent Estimate vs TrueCap (2026): Accuracy",
    url: `${siteUrl}/vs/zillow-rent-estimate`,
    description:
      "Side-by-side comparison of TrueCap and Zillow's Rent Estimate.",
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
        vsPath="/vs/zillow-rent-estimate"
        pageName="TrueCap vs Zillow Rent Estimate"
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

        <section className="mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-card px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-primary mb-4">
            <Sparkles className="size-3" />
            Honest comparison
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-foreground leading-[1.05] tracking-tight text-balance">
            TrueCap vs Zillow Rent Estimate:{" "}
            <span className="text-primary">
              why the &quot;Zestimate Rent&quot; isn&apos;t enough for investors
            </span>
          </h1>
          <p className="mt-4 max-w-2xl text-base sm:text-lg leading-relaxed text-muted-foreground">
            Zillow&apos;s Rent Zestimate is a fast, property-specific starting
            estimate. It is still only one input: acquisition underwriting also
            needs verified expenses, financing terms, vacancy, reserves, and
            sensitivity testing. Here&apos;s how the two tools differ.
          </p>
          <div className="mt-7 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            <ScrollToFormButton className="group inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground shadow-[0_12px_28px_rgba(0,112,196,0.28)] transition-transform hover:-translate-y-0.5">
              <Calculator className="size-4" />
              Try TrueCap free
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </ScrollToFormButton>
            <Link
              href="/pricing"
              className="inline-flex h-12 items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-5 text-sm font-semibold text-foreground hover:bg-muted"
            >
              See pricing
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

        <section className="mb-12 sm:mb-16 rounded-2xl border border-amber-500/30 bg-amber-50/30 p-6 sm:p-8">
          <h2 className="text-xl sm:text-2xl font-extrabold text-foreground mb-3">
            Where a Rent Zestimate stops short of an underwrite
          </h2>
          <p className="text-base leading-relaxed text-foreground mb-3">
            Zillow says its Rent Zestimate uses public data and similar local
            rental listings. That can be useful for orientation, but an
            acquisition decision still needs additional evidence:
          </p>
          <ul className="space-y-2 text-sm sm:text-base leading-relaxed text-foreground">
            <li>
              <strong>An estimate is not an executed lease.</strong> Verify the
              subject property&apos;s achievable rent with current comps, lease
              records, or a local professional.
            </li>
            <li>
              <strong>Property and market coverage vary.</strong> Renovation
              quality, concessions, seasonality, and block-level differences may
              not be fully represented.
            </li>
            <li>
              <strong>Rent is only one assumption.</strong> Taxes, insurance,
              financing, vacancy, management, maintenance, and capital reserves
              can change the decision.
            </li>
          </ul>
          <p className="mt-3 text-sm leading-relaxed text-foreground">
            <strong>HUD Fair Market Rent</strong>, which TrueCap uses as an
            editable area benchmark, estimates gross rent for standard-quality
            units at the 40th percentile within HUD-defined areas. It is not a
            property-specific rent opinion, appraisal, or lender approval input;
            replace it when you have stronger local evidence.
          </p>
        </section>

        <section className="mb-12 sm:mb-16 rounded-2xl border border-border bg-card p-6 sm:p-8">
          <h2 className="text-xl sm:text-2xl font-extrabold text-foreground mb-3">
            TL;DR
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-primary mb-2">
                Use TrueCap if
              </p>
              <ul className="space-y-1.5 text-sm leading-relaxed text-foreground">
                <li>
                  You&apos;re an investor underwriting a deal — the rent
                  estimate is going into a real money decision.
                </li>
                <li>
                  You want an editable HUD area benchmark inside a full
                  underwriting workflow.
                </li>
                <li>
                  You need the rent number + everything else (cap rate, DSCR,
                  cash flow, projection).
                </li>
                <li>
                  You want complete modeled economics, not just
                  &quot;here&apos;s the rent.&quot;
                </li>
              </ul>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                Use Zillow if
              </p>
              <ul className="space-y-1.5 text-sm leading-relaxed text-foreground">
                <li>You&apos;re just casually browsing for inspiration.</li>
                <li>
                  You&apos;re a tenant trying to gauge what rent in an area
                  looks like.
                </li>
                <li>
                  You want a quick property-specific estimate to compare with
                  other rent evidence.
                </li>
              </ul>
            </div>
          </div>
        </section>

        <section className="mb-12 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground mb-2">
            Feature-by-feature
          </h2>
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
                    Zillow Rent Estimate
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
                        <WinnerBadge winner={row.winner} side="zillow" />
                        <span>{row.zillow}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            Source definitions: Zillow describes Rent Zestimate as a starting
            point based on public data and similar local listings; HUD defines
            FMR as an area-level gross-rent benchmark. Review{" "}
            <a
              href="https://www.zillow.com/rent/what-is-a-rent-zestimate/"
              target="_blank"
              rel="noopener"
              className="underline"
            >
              Zillow&apos;s official explanation
            </a>{" "}
            and{" "}
            <a
              href="https://www.huduser.gov/portal/datasets/fmr.html"
              target="_blank"
              rel="noopener"
              className="underline"
            >
              HUD&apos;s official FMR documentation
            </a>
            .
          </p>
          <p className="mt-4 text-sm leading-relaxed text-foreground">
            A rent estimate is just the first input — the decision lives
            downstream. Push your number through our{" "}
            <Link
              href="/analyze"
              className="font-semibold text-primary hover:underline"
            >
              free deal analyzer
            </Link>{" "}
            to turn it into a cap rate and a cash-on-cash return. Our guide on{" "}
            <Link
              href="/blog/how-to-underwrite-a-rental-property-in-60-seconds"
              className="font-semibold text-primary hover:underline"
            >
              underwriting a rental in 60 seconds
            </Link>{" "}
            shows the whole path from address to a reviewed underwrite.
          </p>
        </section>

        <ComparisonFaq
          competitorName="Zillow Rent Estimate"
          items={ZILLOW_FAQ}
        />

        <section className="mb-12 sm:mb-16 rounded-2xl bg-primary p-6 sm:p-8 text-primary-foreground">
          <h2 className="text-2xl sm:text-3xl font-extrabold mb-2">
            Start with a rent benchmark, then underwrite the deal.
          </h2>
          <p className="text-sm sm:text-base opacity-90 mb-5 max-w-2xl">
            Paste an address. TrueCap starts with an editable HUD area rent
            benchmark and a mortgage-rate benchmark; enter a local property-tax
            bill or reviewed rate manually. Replace those starting assumptions
            with property-specific evidence before relying on the result.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2 bg-primary-foreground text-primary px-4 py-2.5 rounded-xl font-bold hover:opacity-90 transition-opacity"
            >
              <Calculator className="w-4 h-4" />
              Run a deal now
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 border border-primary-foreground/40 bg-primary-foreground/10 text-primary-foreground px-4 py-2.5 rounded-xl font-bold hover:bg-primary-foreground/20 transition-colors"
            >
              See Pro pricing
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
        </section>

        <RelatedContent kind="vs" slug="zillow-rent-estimate" className="mt-10" />

        <footer className="border-t border-border pt-6 text-sm text-muted-foreground leading-relaxed">
          Other comparisons:{" "}
          <Link
            href="/vs/rentometer"
            className="font-bold text-foreground hover:underline"
          >
            vs Rentometer
          </Link>
          {" · "}
          <Link
            href="/vs/dealcheck"
            className="font-bold text-foreground hover:underline"
          >
            vs DealCheck
          </Link>
          {" · "}
          <Link
            href="/vs/biggerpockets-calculator"
            className="font-bold text-foreground hover:underline"
          >
            vs BiggerPockets
          </Link>
        </footer>
      </main>
      <SiteFooter />
      <ScrollDepthTracker />
    </div>
  );
}

const ZILLOW_FAQ: FaqItem[] = [
  {
    question: "Is the Zillow Rent Estimate accurate for investors?",
    answer: (
      <>
        Zillow describes its Rent Zestimate as a starting point based on public
        data and similar local listings. Accuracy depends on the available data,
        property, and market. For underwriting, compare it with current rent
        comps, lease evidence, and local professional input, then stress-test a
        reasonable range.
      </>
    ),
    plainTextAnswer:
      "Zillow describes its Rent Zestimate as a starting point based on public data and similar local listings. Accuracy depends on the available data, property, and market. Verify it with current comps or lease evidence and stress-test a reasonable range.",
  },
  {
    question: "What rent data does TrueCap use instead of Zillow?",
    answer: (
      <>
        TrueCap starts from an editable HUD Fair Market Rent area benchmark for
        the relevant bedroom count, using ZIP-level Small Area FMR where
        available and a broader-area fallback. HUD publishes FMRs for
        housing-program administration; they are not property-specific rent
        opinions or lender approvals. Replace the value when you have stronger
        local evidence.
      </>
    ),
    plainTextAnswer:
      "TrueCap starts from an editable HUD Fair Market Rent area benchmark for the relevant bedroom count, using ZIP-level Small Area FMR where available and a broader-area fallback. It is not a property-specific rent opinion or lender approval; replace it when you have stronger local evidence.",
  },
  {
    question: "Can I check rent on a specific Zillow listing in TrueCap?",
    answer: (
      <>
        Yes — paste the property address into TrueCap and you get the editable
        HUD area benchmark for that location and bedroom count. The rent field
        is editable, so if you see a Zillow Zestimate you trust more for that
        specific listing, type it in and the full underwrite updates in real
        time.
      </>
    ),
    plainTextAnswer:
      "Yes — paste the address into TrueCap and you get an editable HUD area benchmark for that location and bedroom count. Replace it with a Zillow estimate, current comps, or lease evidence when those better fit the property.",
  },
  {
    question: "Does TrueCap give a more accurate rent estimate than Zillow?",
    answer: (
      <>
        Neither source is guaranteed to be more accurate for every property.
        Zillow offers a property-specific starting estimate; TrueCap places an
        editable HUD area benchmark inside a full expense and financing model.
        Compare both with current local evidence and use a sensitivity range
        before deciding.
      </>
    ),
    plainTextAnswer:
      "Neither source is guaranteed to be more accurate for every property. Zillow offers a property-specific starting estimate; TrueCap places an editable HUD area benchmark inside a full underwrite. Compare both with current local evidence and test a range.",
  },
  {
    question: "How does TrueCap turn a rent estimate into an underwrite?",
    answer: (
      <>
        TrueCap takes rent, expenses, financing, and tax assumptions and runs
        cap rate, cash-on-cash, DSCR, and monthly cash flow, then shows
        Buy Box fit against your targets. The free analyzer also
        includes a Deal score (0–100) with factor breakdown.
        Zillow stops at the rent number — you have to do everything downstream
        by hand.
      </>
    ),
    plainTextAnswer:
      "TrueCap takes rent + expenses + financing + tax assumptions and runs cap rate, CoC, DSCR, and monthly cash flow, then shows Buy Box fit plus a free 0–100 Deal score. Zillow stops at the rent number.",
  },
];

function WinnerBadge({
  winner,
  side,
}: {
  winner: Verdict;
  side: "truecap" | "zillow";
}) {
  if (winner === "tie")
    return (
      <Minus className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/60" />
    );
  if (winner === side)
    return (
      <Check className="mt-0.5 size-3.5 shrink-0 text-[var(--brand-green)]" />
    );
  return <X className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/50" />;
}
