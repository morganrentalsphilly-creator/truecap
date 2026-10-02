/**
 * /vs/zillow-rent-estimate — TrueCap vs Zillow's Rent Zestimate.
 *
 * Zillow answers automated clients with a bot check, so nothing about Zillow
 * on this page could be re-read from zillow.com in October 2026. The Zillow
 * column therefore says only what Zillow's linked explanation of the Rent
 * Zestimate says (a starting-point rent estimate from public data and similar
 * local listings) and what follows from that definition. The page passes no
 * review date to ComparisonFaq.
 *
 * Target queries: "zillow rent estimate accuracy", "zillow rent vs",
 * "zestimate alternative", "how accurate is zillow rent", "better than
 * zillow rent estimate". Significant search volume from investors who
 * suspect Zillow's rent is off but don't have a better source.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { IntentPrefetchLink } from "@/components/marketing/intent-prefetch-link";
import { AuthorBio } from "@/components/marketing/author-bio";
import { BlogByline } from "@/components/marketing/blog-byline";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { ProductShot } from "@/components/marketing/product-shot";
import { SiteFooter } from "@/components/marketing/site-footer";
import { RelatedContent } from "@/components/marketing/related-content";
import { AnalyzeCtaLink } from "@/components/marketing/analyze-cta-link";
import {
  ComparisonFaq,
  type FaqItem,
} from "@/components/marketing/comparison-faq";
import { ActionRow, CloseSection } from "@/components/marketing/page-parts";
import { Section, SectionHeading } from "@/components/marketing/section";
import {
  VS_ACTIONS,
  VS_H1,
  VS_LEDE,
  VS_LINK_ROW,
  VS_NOTE,
  VS_PROSE,
  VS_SOURCES,
  VS_TLDR_GRID,
  VS_TLDR_LABEL,
  VS_TLDR_LIST,
  VsHero,
  VsMatrixTable,
} from "@/components/marketing/vs-page";
import { getSiteUrl } from "@/lib/site-url";
import { VsBreadcrumbSchema } from "@/components/marketing/vs-breadcrumb-schema";
import { buttonVariants } from "@/components/ui/button";
import { ScrollX } from "@/components/ui/scroll-x";
import { Header } from "@/components/investcalc/header";
import { lastmodFor } from "@/lib/seo/lastmod";
import { JsonLd } from "@/components/seo/json-ld";

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
      "Free core metrics; Pro adds 10-year projections, sensitivity and the Offer Ceiling",
    zillow: "The Rent Zestimate is a rent estimate: one input to an underwrite",
    winner: "truecap",
  },
  {
    feature: "Property tax input",
    truecap:
      "Manual local bill or reviewed rate; blank inputs use a disclosed generic fallback",
    zillow:
      "Not part of the Rent Zestimate; verify the post-sale tax basis with the county",
    winner: "tie",
  },
  {
    feature: "Cap rate / CoC / DSCR computation",
    truecap: "Computed live with editable assumptions",
    zillow: "Not part of the Rent Zestimate",
    winner: "truecap",
  },
  {
    feature: "Listings, photos and tours",
    truecap: "Not in scope: TrueCap analyzes an address you bring",
    zillow: "See Zillow for listings, photos and tours",
    winner: "zillow",
  },
  {
    feature: "Save deals + portfolio rollup",
    truecap:
      "Free saves up to 5 deals; Pro adds unlimited saves, portfolio rollup + comparison",
    zillow: "Not part of the Rent Zestimate",
    winner: "truecap",
  },
  {
    feature: "Shareable analysis URL",
    truecap: "Free — read-only public URL for the available analysis",
    zillow: "Not part of the Rent Zestimate",
    winner: "truecap",
  },
  {
    feature: "Underwriting context",
    truecap:
      "Core economics and the Deal score free; Buy Box fit on your first decision, then with Pro",
    zillow: "A rent estimate; the underwrite happens elsewhere",
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
    dateModified: lastmodFor("/vs/zillow-rent-estimate"),
    publisher: { "@id": `${siteUrl}/#organization` },
  };

  return (
    // relative + overflow-x-clip, as on the homepage and the /vs hub: no
    // descendant can make the phone page scroll sideways.
    <div className="relative overflow-x-clip">
      <Header initialUser={null} initialEntitlements={null} />
      <JsonLd data={structuredData} />
      <VsBreadcrumbSchema
        vsPath="/vs/zillow-rent-estimate"
        pageName="TrueCap vs Zillow Rent Estimate"
      />
      <main id="main" tabIndex={-1} className="min-w-0 outline-none">
        <VsHero>
          <h1 className={VS_H1}>
            TrueCap vs Zillow Rent Estimate:{" "}
            why the Rent Zestimate isn&apos;t enough for investors
          </h1>
          <BlogByline />
          <p className={VS_LEDE}>
            Zillow&apos;s Rent Zestimate is a fast, property-specific starting
            estimate. It is still only one input: acquisition underwriting also
            needs verified expenses, financing terms, vacancy, reserves, and
            sensitivity testing. Here&apos;s how the two tools differ.
          </p>
          <ActionRow className={VS_ACTIONS}>
            <AnalyzeCtaLink analyticsSource="vs_hero" className={buttonVariants({ size: "cta" })}>
              Try TrueCap free
            </AnalyzeCtaLink>
            <Link
              href="/pricing"
              className={buttonVariants({ variant: "outline", size: "cta" })}
            >
              See pricing
            </Link>
          </ActionRow>
          <p className={VS_NOTE}>
            Free analyzer: no card or signup
          </p>
        </VsHero>

        {/* Real product screenshot from the free sample deal, set as a
            document (no fake browser frame). */}
        <Section rule="none" rhythm="tight" aria-label="What the decision looks like">
          <ProductShot
            shot="verdict"
            frame="document"
            sizes="(min-width: 768px) 768px, 100vw"
            className="max-w-3xl"
            alt="TrueCap's decision view for the sample deal: the Offer Ceiling beside the asking price, cash flow after reserves, and DSCR"
            caption={<>Real output from the free sample deal. <Link href="/analyze?sample=1" prefetch={false} className="tc-link">Run it yourself</Link></>}
          />
        </Section>

        <Section aria-labelledby="vs-limits-heading">
          <SectionHeading id="vs-limits-heading">
            Where a Rent Zestimate stops short of an underwrite
          </SectionHeading>
          <div className={VS_PROSE}>
            <p>
              Zillow says its Rent Zestimate uses public data and similar local
              rental listings. That can be useful for orientation, but an
              acquisition decision still needs additional evidence:
            </p>
            <ul>
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
            <p>
              <strong>HUD Fair Market Rent</strong>, which TrueCap uses as an
              editable area benchmark, estimates gross rent for standard-quality
              units at the 40th percentile within HUD-defined areas. It is not a
              property-specific rent opinion, appraisal, or lender approval input;
              replace it when you have stronger local evidence.
            </p>
          </div>
        </Section>

        <Section rhythm="tight" aria-labelledby="vs-tldr-heading">
          <SectionHeading id="vs-tldr-heading">
            TL;DR
          </SectionHeading>
          <div className={VS_TLDR_GRID}>
            <div className="min-w-0">
              <h3 className={VS_TLDR_LABEL}>
                Use TrueCap if
              </h3>
              <ul className={VS_TLDR_LIST}>
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
            <div className="min-w-0">
              <h3 className={VS_TLDR_LABEL}>
                Use Zillow if
              </h3>
              <ul className={VS_TLDR_LIST}>
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
        </Section>

        <Section aria-labelledby="vs-matrix-heading">
          <SectionHeading id="vs-matrix-heading">
            Feature-by-feature
          </SectionHeading>
          <ScrollX label="Comparison table" className="mt-8 max-w-5xl">
            <VsMatrixTable
              head={["Feature", "TrueCap", "Zillow Rent Estimate"]}
              rows={MATRIX.map((row) => ({
                label: row.feature,
                truecap: row.truecap,
                competitor: row.zillow,
                winner: row.winner === "zillow" ? "competitor" : row.winner,
              }))}
            />
          </ScrollX>
          <p className={VS_SOURCES}>
            Source definitions: Zillow describes Rent Zestimate as a starting
            point based on public data and similar local listings; HUD defines
            FMR as an area-level gross-rent benchmark. Review{" "}
            <a
              href="https://www.zillow.com/rent/what-is-a-rent-zestimate/"
              target="_blank"
              rel="noopener"
              className="tc-link"
            >
              Zillow&apos;s official explanation
            </a>{" "}
            and{" "}
            <a
              href="https://www.huduser.gov/portal/datasets/fmr.html"
              target="_blank"
              rel="noopener"
              className="tc-link"
            >
              HUD&apos;s official FMR documentation
            </a>
            .
          </p>
          <div className={VS_PROSE}>
            <p>
              A rent estimate is just the first input — the decision lives
              downstream. Push your number through our{" "}
              <Link
                href="/analyze" prefetch={false}
                className="tc-link"
              >
                free deal analyzer
              </Link>{" "}
              to turn it into a cap rate and a cash-on-cash return. Our guide on{" "}
              <IntentPrefetchLink
                href="/blog/how-to-underwrite-a-rental-property-in-60-seconds"
                className="tc-link"
              >
                underwriting a rental in 60 seconds
              </IntentPrefetchLink>{" "}
              shows the whole path from address to a reviewed underwrite.
            </p>
          </div>
        </Section>

        <ComparisonFaq
          competitorName="Zillow Rent Estimate"
          items={ZILLOW_FAQ}
        />

        <CloseSection
          headingId="vs-close-heading"
          heading={<>Start with a rent benchmark, then underwrite the deal.</>}
          lede={
            <>
              Paste an address. TrueCap starts with an editable HUD area rent
              benchmark and a mortgage-rate benchmark; enter a local property-tax
              bill or reviewed rate manually. Replace those starting assumptions
              with property-specific evidence before relying on the result.
            </>
          }
          actions={
            <ActionRow>
              <Link
                href="/analyze" prefetch={false}
                className={buttonVariants({ size: "cta" })}
              >
                Run a deal now
              </Link>
              <IntentPrefetchLink
                href="/pricing"
                className={buttonVariants({ variant: "outline", size: "cta" })}
              >
                See Pro pricing
              </IntentPrefetchLink>
            </ActionRow>
          }
        />

        <Section rule="none" rhythm="tight">
          <div className="max-w-5xl">
            <RelatedContent kind="vs" slug="zillow-rent-estimate" />
            <AuthorBio />

            <footer className="mt-10 border-t border-border pt-6">
              <p className="text-lg font-semibold">Other comparisons:</p>
              <ul className="mt-2 grid gap-x-8 sm:grid-cols-2">
                <li>
                  <IntentPrefetchLink
                    href="/vs/rentometer"
                    className={VS_LINK_ROW}
                  >
                    vs Rentometer
                  </IntentPrefetchLink>
                </li>
                <li>
                  <IntentPrefetchLink
                    href="/vs/dealcheck"
                    className={VS_LINK_ROW}
                  >
                    vs DealCheck
                  </IntentPrefetchLink>
                </li>
                <li>
                  <IntentPrefetchLink
                    href="/vs/biggerpockets-calculator"
                    className={VS_LINK_ROW}
                  >
                    vs BiggerPockets
                  </IntentPrefetchLink>
                </li>
              </ul>
            </footer>
          </div>
        </Section>
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
  },
  {
    question: "Can I check rent on a specific Zillow listing in TrueCap?",
    answer: (
      <>
        Yes — paste the property address into TrueCap and you get the editable
        HUD area benchmark for that location and bedroom count. The rent field
        is editable, so if you see a Rent Zestimate you trust more for that
        specific listing, type it in and the full underwrite updates in real
        time.
      </>
    ),
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
  },
  {
    question: "How does TrueCap turn a rent estimate into an underwrite?",
    answer: (
      <>
        TrueCap takes rent, expenses, financing, and tax assumptions and runs
        cap rate, cash-on-cash, DSCR, and monthly cash flow. The free analyzer
        also includes a Deal score (0–100) with factor breakdown. Buy Box fit
        against your targets is free on your first decision, then with Pro.
        The Rent Zestimate is a rent number; the rest of the underwrite
        happens downstream of it.
      </>
    ),
  },
];

