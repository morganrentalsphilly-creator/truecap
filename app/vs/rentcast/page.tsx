/**
 * /vs/rentcast — competitor comparison landing page.
 *
 * Target queries: "rentcast alternative", "rentcast vs rentometer", "rentcast review", "rentcast pricing", "rent estimate tool".
 * RentCast (formerly Realtyna RentCast / often confused with rentcast.com.au) is a property data + rent estimation API + dashboard. Newer entrant competing with Rentometer for rent comps, plus adds property value estimation. Investors evaluate it as a Rentometer alternative or for API access.
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
  VS_INTRO,
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
  title: "RentCast vs TrueCap (2026): Rent Data vs Deal Math",
  description:
    "RentCast estimates rent and property value. TrueCap underwrites the full deal from a rent benchmark you replace. Honest side-by-side and how they fit.",
  keywords: [
    "rentcast alternative",
    "rentcast vs rentometer",
    "rentcast review",
    "rentcast pricing",
    "rent estimate tool",
  ],
  alternates: { canonical: "/vs/rentcast" },
  openGraph: {
    title: "RentCast vs TrueCap (2026): Rent Data vs Deal Math",
    description:
      "RentCast estimates rent and property value. TrueCap underwrites the full deal from a rent benchmark you replace.",
    url: "/vs/rentcast",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

type Verdict = "truecap" | "rentcast" | "tie";
type Row = {
  feature: string;
  truecap: string;
  rentcast: string;
  winner: Verdict;
};

const MATRIX: Row[] = [
  {
    feature: "Primary purpose",
    truecap: "Per-deal underwriting calculator",
    rentcast: "Rent + property value estimation",
    winner: "tie",
  },
  {
    feature: "Cap rate / CoC / DSCR analysis",
    truecap: "Yes — full engine, free tier",
    rentcast: "Not among RentCast's listed features",
    winner: "truecap",
  },
  {
    feature: "10-year projection",
    truecap: "Pro — rent + expense + appreciation",
    rentcast: "Not among RentCast's listed features",
    winner: "truecap",
  },
  {
    feature: "Deal score (0–100)",
    truecap: "Free — 0–100 score with factor breakdown",
    rentcast: "Not among RentCast's listed features",
    winner: "truecap",
  },
  {
    feature: "Rent comp data",
    truecap: "HUD Fair Market Rent (county-level, gov-published)",
    rentcast:
      "Yes: up to 20 nearby rental listings as comps (5 on the Free plan)",
    winner: "rentcast",
  },
  {
    feature: "Property value estimate",
    truecap: "Purchase price as user input",
    rentcast: "Yes: property value estimates (AVM) through its API",
    winner: "rentcast",
  },
  {
    feature: "API access for developers",
    truecap: "No",
    rentcast:
      "Yes: an API for property records, value estimates and rent estimates",
    winner: "rentcast",
  },
  {
    feature: "Starting values (rent/rate/tax)",
    truecap: "HUD rent + FRED rate + manual local property tax",
    rentcast: "Rent estimates and property data",
    winner: "tie",
  },
  {
    feature: "Mortgage + financing math",
    truecap: "Yes — full PITI + DSCR + amortization",
    rentcast: "Not among RentCast's listed features",
    winner: "truecap",
  },
  {
    feature: "Pricing (entry tier)",
    truecap: "Free core; paid Pro — see live pricing",
    rentcast: "Free + paid tiers ~$15-$74/mo (as of 2026)",
    winner: "tie",
  },
  {
    feature: "Free tier",
    truecap: "Yes — core cap rate, CoC, DSCR, and cash flow",
    rentcast:
      "Free plan: rent estimates, 5 comps per report, 5 saved properties",
    winner: "tie",
  },
  {
    feature: "Shareable read-only deal link",
    truecap: "Free — read-only public link; Pro adds co-branding",
    rentcast:
      "Shares online rent reports; they carry rent data, not a deal analysis",
    winner: "tie",
  },
  {
    feature: "PDF deal report",
    truecap: "Included with Pro",
    rentcast:
      "Property rent report PDF; custom branding and market reports on Pro",
    winner: "tie",
  },
  {
    feature: "Investor dashboard (saved deals)",
    truecap:
      "Free — dashboard + save up to 5 deals; Pro adds unlimited saves + portfolio rollup",
    rentcast: "Rental portfolio dashboard: 5 properties on Free, 50+ on Pro",
    winner: "tie",
  },
];

export default function VsRentcastPage() {
  const siteUrl = getSiteUrl();
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "RentCast vs TrueCap (2026): Rent Data vs Deal Math",
    url: `${siteUrl}/vs/rentcast`,
    description:
      "RentCast estimates rent and property value. TrueCap underwrites the full deal from a rent benchmark you replace. Honest side-by-side and how they fit.",
    dateModified: lastmodFor("/vs/rentcast"),
    publisher: { "@id": `${siteUrl}/#organization` },
  };

  return (
    // relative + overflow-x-clip, as on the homepage and the /vs hub: no
    // descendant can make the phone page scroll sideways.
    <div className="relative overflow-x-clip">
      <Header initialUser={null} initialEntitlements={null} />
      <JsonLd data={structuredData} />
      <VsBreadcrumbSchema
        vsPath="/vs/rentcast"
        pageName="TrueCap vs RentCast"
      />
      <main id="main" tabIndex={-1} className="min-w-0 outline-none">
        <VsHero>
          <h1 className={VS_H1}>
            TrueCap vs RentCast:{" "}
            rent estimates vs full underwriting
          </h1>
          <BlogByline />
          <p className={VS_LEDE}>
            RentCast is a property-data + rent-estimation platform — get rent
            comps, property value estimates, and API access. TrueCap uses
            reviewed inputs to model cash flow and returns. RentCast can supply
            inputs; TrueCap runs the analysis.
          </p>
          <ActionRow className={VS_ACTIONS}>
            <AnalyzeCtaLink analyticsSource="vs_hero" className={buttonVariants({ size: "cta" })}>
              Run a deal — 60 seconds
            </AnalyzeCtaLink>
            <Link
              href="/pricing"
              className={buttonVariants({ variant: "outline", size: "cta" })}
            >
              See TrueCap pricing
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

        {/* TL;DR */}
        <Section rhythm="tight" aria-labelledby="vs-tldr-heading">
          <SectionHeading id="vs-tldr-heading">
            TL;DR
          </SectionHeading>
          <div className={VS_TLDR_GRID}>
            <div className="min-w-0">
              <h3 className={VS_TLDR_LABEL}>
                Use TrueCap when
              </h3>
              <ul className={VS_TLDR_LIST}>
                <li>
                  You want a full underwriting analysis with cap rate, DSCR, and
                  cash flow.
                </li>
                <li>
                  You want financing math baked in (PITI, amortization, DSCR
                  ratios).
                </li>
                <li>You want a portfolio rollup across saved deals.</li>
                <li>
                  You want cap rate, DSCR, and cash flow free on every analysis.
                </li>
              </ul>
            </div>
            <div className="min-w-0">
              <h3 className={VS_TLDR_LABEL}>
                Use RentCast when
              </h3>
              <ul className={VS_TLDR_LIST}>
                <li>You want rent comps drawn from nearby rental listings.</li>
                <li>
                  You need API access to integrate rent data into your own
                  software.
                </li>
                <li>You want automated property value estimates (AVM).</li>
                <li>
                  You&apos;re building a tool and need a data feed, not a UI.
                </li>
              </ul>
            </div>
          </div>
        </Section>

        {/* Matrix */}
        <Section aria-labelledby="vs-matrix-heading">
          <SectionHeading id="vs-matrix-heading">
            Feature-by-feature
          </SectionHeading>
          <p className={VS_INTRO}>
            Side-by-side on every dimension that matters for a
            comparison-shopping investor.
          </p>
          <ScrollX label="Comparison table" className="mt-8 max-w-5xl">
            <VsMatrixTable
              head={["Feature", "TrueCap", "RentCast"]}
              rows={MATRIX.map((row) => ({
                label: row.feature,
                truecap: row.truecap,
                competitor: row.rentcast,
                winner: row.winner === "rentcast" ? "competitor" : row.winner,
              }))}
            />
          </ScrollX>
          <p className={VS_SOURCES}>
            RentCast details based on publicly available product info as of
            2026. See{" "}
            <a
              href="https://rentcast.io"
              target="_blank"
              rel="noopener"
              className="tc-link"
            >
              rentcast.io
            </a>{" "}
            for their current state.
          </p>
        </Section>

        {/* Complementary workflow */}
        <Section aria-labelledby="vs-fit-heading">
          <SectionHeading id="vs-fit-heading">
            How TrueCap + RentCast fit together
          </SectionHeading>
          <div className={VS_PROSE}>
            <ol>
              <li>
                <strong>Get a tighter rent estimate in RentCast.</strong> Their
                listings-based comps give you a more specific number than the HUD
                county-level baseline.
              </li>
              <li>
                <strong>Plug that rent into TrueCap.</strong> Override the
                auto-filled HUD rent with RentCast&apos;s number. Everything
                downstream recalculates.
              </li>
              <li>
                <strong>Run the stabilized-rental underwrite in TrueCap.</strong>{" "}
                Cap rate, DSCR, cash flow, sensitivity, and a 10-year cash-flow
                and equity projection.
              </li>
              <li>
                <strong>Save the deal + revisit later.</strong> A saved deal can
                be re-run with updated assumptions when market data shifts;
                updating a saved deal needs a paid plan.
              </li>
            </ol>
            <p>
              Want to turn those two estimates into a verdict? RentCast&apos;s
              rent and value figures are the only inputs the free{" "}
              <IntentPrefetchLink
                href="/tools/1-percent-rule-calculator"
                className="tc-link"
              >
                1% rule calculator
              </IntentPrefetchLink>{" "}
              needs; the full{" "}
              <Link
                href="/analyze" prefetch={false}
                className="tc-link"
              >
                TrueCap analyzer
              </Link>{" "}
              takes it from there — cap rate, DSCR, and cash flow. Our guide on{" "}
              <IntentPrefetchLink
                href="/blog/how-to-underwrite-a-rental-property-in-60-seconds"
                className="tc-link"
              >
                60-second underwriting
              </IntentPrefetchLink>{" "}
              walks through the workflow end-to-end.
            </p>
          </div>
        </Section>

        <ComparisonFaq competitorName="RentCast" items={RENTCAST_FAQ} />

        {/* Pricing CTA */}
        <CloseSection
          headingId="vs-close-heading"
          heading={<>Underwrite the next deal — free.</>}
          lede={
            <>
              TrueCap free covers cap rate, CoC, DSCR, and monthly cash flow.
              Pro adds 10-year cash-flow and equity projections, sensitivity, the
              Offer Ceiling, co-branded share links, and PDF reports; see live
              pricing for current terms. No card to start.
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
            <RelatedContent kind="vs" slug="rentcast" />
            <AuthorBio />

            <footer className="mt-10 border-t border-border pt-6">
              <p className="text-lg font-semibold">Other comparisons:</p>
              <ul className="mt-2 grid gap-x-8 sm:grid-cols-2">
                <li>
                  <IntentPrefetchLink
                    href="/vs/rentometer"
                    className={VS_LINK_ROW}
                  >
                    TrueCap vs Rentometer
                  </IntentPrefetchLink>
                </li>
                <li>
                  <IntentPrefetchLink
                    href="/vs/zillow-rent-estimate"
                    className={VS_LINK_ROW}
                  >
                    TrueCap vs Zillow Rent Estimate
                  </IntentPrefetchLink>
                </li>
                <li>
                  <IntentPrefetchLink
                    href="/vs/dealcheck"
                    className={VS_LINK_ROW}
                  >
                    TrueCap vs DealCheck
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

const RENTCAST_FAQ: FaqItem[] = [
  {
    question: "Is TrueCap a RentCast alternative?",
    answer: (
      <>
        Not directly — they overlap on rent estimates but TrueCap is full
        underwriting. RentCast provides listings-based rent comps and AVM-style
        property value estimates. TrueCap pre-fills an editable HUD area
        benchmark and then runs the full underwrite. You can use RentCast as one
        evidence source and TrueCap for the downstream model.
      </>
    ),
  },
  {
    question:
      "How accurate is RentCast vs TrueCap's HUD-based rent estimate?",
    answer: (
      <>
        There is no universal accuracy winner. RentCast uses listings-based
        data, while HUD FMR is an area-level housing-program benchmark. Coverage
        and fit vary by property and market. Compare both with current
        subject-property comps or lease evidence and test a reasonable range.
      </>
    ),
  },
  {
    question: "Does RentCast do cap rate or DSCR calculations?",
    answer: (
      <>
        RentCast lists rent estimates, rental comps, market data, and an API;
        cap rate and DSCR calculators are not among its listed features.
        You&apos;d use the rent number and AVM property value from RentCast as
        inputs into a separate calculator (TrueCap, DealCheck, or your
        spreadsheet) to compute cap rate, DSCR, cash flow, etc.
      </>
    ),
  },
  {
    question: "Which has a better free tier?",
    answer: (
      <>
        TrueCap provides no-account preliminary screens with cap rate, CoC,
        DSCR, NOI, and monthly cash flow. RentCast&apos;s Free plan is free
        forever and includes rent estimates, 5 comps per report, and 5 saved
        properties; its API is a separate product with its own free plan of 50
        calls a month. They solve different jobs: use rent evidence for the
        assumption, then use an underwriting workflow to test the deal.
      </>
    ),
  },
  {
    question: "Can I use RentCast's data in TrueCap?",
    answer: (
      <>
        Yes — every input in TrueCap is editable. Pull rent from RentCast, type
        it into TrueCap&apos;s rent field, and the entire downstream analysis
        (cap rate, CoC, DSCR, cash flow) updates instantly.
      </>
    ),
  },
];

