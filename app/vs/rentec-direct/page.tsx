/**
 * /vs/rentec-direct — competitor comparison landing page.
 *
 * Target queries: "rentec direct alternative", "rentec vs buildium", "rentec direct pricing", "rentec direct review".
 * Rentec Direct is property management software in three editions (Starter, Pro, PM).
 * Competitor cells were checked in October 2026 against rentecdirect.com/pricing, which
 * carries the edition comparison; Rentec publishes no unit range, so the page states none.
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
  title: "Rentec Direct vs TrueCap (2026): PM vs Analysis",
  description:
    "Rentec Direct runs the rentals you own. TrueCap underwrites the ones you're considering. A side-by-side comparison.",
  keywords: [
    "rentec direct alternative",
    "rentec vs buildium",
    "rentec direct pricing",
    "rentec direct review",
  ],
  alternates: { canonical: "/vs/rentec-direct" },
  openGraph: {
    title: "Rentec Direct vs TrueCap (2026): PM vs Analysis",
    description:
      "Rentec Direct is property management software for landlords and property managers. TrueCap underwrites the deal before you buy. Different stages.",
    url: "/vs/rentec-direct",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

type Verdict = "truecap" | "rentecdirect" | "tie";
type Row = {
  feature: string;
  truecap: string;
  rentecdirect: string;
  winner: Verdict;
};

const MATRIX: Row[] = [
  {
    feature: "Lifecycle stage",
    truecap: "Pre-purchase — underwrite the deal",
    rentecdirect: "Post-purchase — operate the portfolio",
    winner: "tie",
  },
  {
    feature: "Cap rate / CoC / DSCR analysis",
    truecap: "Yes — full engine, free tier",
    rentecdirect: "Not on Rentec Direct's edition comparison",
    winner: "truecap",
  },
  {
    feature: "10-year projection",
    truecap: "Pro — rent + expense + appreciation",
    rentecdirect: "Not on Rentec Direct's edition comparison",
    winner: "truecap",
  },
  {
    feature: "Deal score (0–100)",
    truecap: "Free — 0–100 score with factor breakdown",
    rentecdirect: "Not applicable",
    winner: "truecap",
  },
  {
    feature: "Starting values (rent/rate/tax)",
    truecap: "HUD rent + FRED rate + manual local property tax",
    rentecdirect: "Not applicable",
    winner: "truecap",
  },
  {
    feature: "Tenant + lease management",
    truecap: "No",
    rentecdirect:
      "Yes, on every edition: tenant accounting, online applications and a tenant portal",
    winner: "rentecdirect",
  },
  {
    feature: "Online rent collection",
    truecap: "No",
    rentecdirect:
      "Yes, ACH and card; tenant ACH payments cost $2 on Starter and are free on Pro and PM within Rentec's fair-use limit (one per active property a month, then $0.50 each)",
    winner: "rentecdirect",
  },
  {
    feature: "Maintenance request workflow",
    truecap: "No",
    rentecdirect: "Yes — work order tracking",
    winner: "rentecdirect",
  },
  {
    feature: "Accounting + Schedule E",
    truecap: "Forward projection only",
    rentecdirect:
      "Property and tenant accounting and Schedule E reports on every edition; 1099 e-file on Pro and PM",
    winner: "rentecdirect",
  },
  {
    feature: "Owner portals (for partnerships)",
    truecap: "No",
    rentecdirect: "Owner portal on Rentec PM only",
    winner: "rentecdirect",
  },
  {
    feature: "Free tier",
    truecap: "Yes — core cap rate, CoC, DSCR, and cash flow",
    rentecdirect: "No free plan; two-week free trial on every edition",
    winner: "truecap",
  },
  {
    feature: "Pricing (entry tier)",
    truecap: "Free core; paid Pro — see live pricing",
    rentecdirect:
      "Starter $25 a month (up to 10 properties); Pro and PM from $50 a month (as of October 2026)",
    winner: "tie",
  },
  {
    feature: "Who it is for",
    truecap: "Agents with investor clients, and buy-and-hold investors",
    rentecdirect:
      "Starter for 10 or fewer properties; Pro for landlords and investors; PM for property managers",
    winner: "tie",
  },
];

export default function VsRentecDirectPage() {
  const siteUrl = getSiteUrl();
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Rentec Direct vs TrueCap (2026): PM vs Analysis",
    url: `${siteUrl}/vs/rentec-direct`,
    description:
      "Rentec Direct runs the rentals you own. TrueCap underwrites the ones you're considering. A side-by-side comparison.",
    dateModified: lastmodFor("/vs/rentec-direct"),
    publisher: { "@id": `${siteUrl}/#organization` },
  };

  return (
    // relative + overflow-x-clip, as on the homepage and the /vs hub: no
    // descendant can make the phone page scroll sideways.
    <div className="relative overflow-x-clip">
      <Header initialUser={null} initialEntitlements={null} />
      <JsonLd data={structuredData} />
      <VsBreadcrumbSchema
        vsPath="/vs/rentec-direct"
        pageName="TrueCap vs Rentec Direct"
      />
      <main id="main" tabIndex={-1} className="min-w-0 outline-none">
        <VsHero>
          <h1 className={VS_H1}>
            TrueCap vs Rentec Direct:{" "}
            pre-purchase calculator vs landlord ops platform
          </h1>
          <BlogByline />
          <p className={VS_LEDE}>
            Rentec Direct is property management software sold in three
            editions: Starter for 10 or fewer properties, Pro for landlords and
            investors, and PM for property managers. It covers tenant
            management, rent collection and accounting, with an owner portal on
            PM. TrueCap models the pre-purchase economics of properties you are
            considering. We don&apos;t compete; different halves of the rental
            lifecycle.
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
            priority
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
                <li>You&apos;re evaluating a property before buying.</li>
                <li>You want cap rate, DSCR, cash flow, projection.</li>
                <li>You want a free tier — no monthly commitment.</li>
                <li>You&apos;re deciding what to pay, not yet managing tenants.</li>
              </ul>
            </div>
            <div className="min-w-0">
              <h3 className={VS_TLDR_LABEL}>
                Use Rentec Direct when
              </h3>
              <ul className={VS_TLDR_LIST}>
                <li>
                  You own rentals and want accounting, rent collection and
                  tenant management in one tool.
                </li>
                <li>
                  You want tenant screening, work orders and Schedule E reports
                  in the same place.
                </li>
                <li>
                  You want 1099 e-file, bank sync or an open API (Rentec Pro
                  and PM).
                </li>
                <li>
                  You manage for other owners and need trust accounting and an
                  owner portal (Rentec PM).
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
              head={["Feature", "TrueCap", "Rentec Direct"]}
              rows={MATRIX.map((row) => ({
                label: row.feature,
                truecap: row.truecap,
                competitor: row.rentecdirect,
                winner: row.winner === "rentecdirect" ? "competitor" : row.winner,
              }))}
            />
          </ScrollX>
          <p className={VS_SOURCES}>
            Rentec Direct details checked in October 2026 against{" "}
            <a
              href="https://www.rentecdirect.com/pricing"
              target="_blank"
              rel="noopener"
              className="tc-link"
            >
              Rentec Direct&apos;s pricing page
            </a>
            , which carries its edition comparison. See Rentec Direct for
            current plans.
          </p>
        </Section>

        {/* Complementary workflow */}
        <Section aria-labelledby="vs-fit-heading">
          <SectionHeading id="vs-fit-heading">
            How TrueCap + Rentec Direct fit together
          </SectionHeading>
          <div className={VS_PROSE}>
            <ol>
              <li>
                <strong>Underwrite the next property in TrueCap.</strong> Cap
                rate, DSCR, cash flow, projection.
              </li>
              <li>
                <strong>Close + onboard the property in Rentec Direct.</strong>{" "}
                Set up the unit, accept applications, sign lease, start rent
                collection.
              </li>
              <li>
                <strong>Operate in Rentec Direct.</strong> Rent comes in, expenses
                get logged, and the Schedule E report is there at tax time.
              </li>
              <li>
                <strong>Annual review.</strong> Pull Rentec Direct&apos;s actuals;
                re-run TrueCap&apos;s projection with real numbers.
              </li>
            </ol>
            <p>
              Only here for the acquisition math? Our walkthroughs on{" "}
              <IntentPrefetchLink
                href="/blog/how-to-calculate-cap-rate"
                className="tc-link"
              >
                how to calculate cap rate
              </IntentPrefetchLink>
              ,{" "}
              <IntentPrefetchLink
                href="/blog/how-to-calculate-dscr"
                className="tc-link"
              >
                how to calculate DSCR
              </IntentPrefetchLink>
              , and{" "}
              <IntentPrefetchLink
                href="/blog/how-to-calculate-noi-rental-property"
                className="tc-link"
              >
                how to calculate NOI
              </IntentPrefetchLink>{" "}
              each work an example end to end, so the actuals Rentec Direct
              reports later have something to be measured against. To skip the
              arithmetic, run the address through the full{" "}
              <Link
                href="/analyze" prefetch={false}
                className="tc-link"
              >
                TrueCap analyzer
              </Link>
              .
            </p>
          </div>
        </Section>

        <ComparisonFaq
          competitorName="Rentec Direct"
          items={RENTEC_DIRECT_FAQ}
          reviewedDate="October 2026"
        />

        {/* Pricing CTA */}
        <CloseSection
          headingId="vs-close-heading"
          heading={<>Underwrite the next deal — free.</>}
          lede={
            <>
              TrueCap free covers cap rate, CoC, DSCR, and monthly cash flow.
              Pro adds 10-year cash-flow and equity projections, sensitivity,
              the Offer Ceiling, co-branded share links and PDF reports; see
              live pricing for current terms. No card to start.
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
            <RelatedContent kind="vs" slug="rentec-direct" />
            <AuthorBio />

            <footer className="mt-10 border-t border-border pt-6">
              <p className="text-lg font-semibold">Other comparisons:</p>
              <ul className="mt-2 grid gap-x-8 sm:grid-cols-2">
                <li>
                  <IntentPrefetchLink
                    href="/vs/buildium"
                    className={VS_LINK_ROW}
                  >
                    TrueCap vs Buildium
                  </IntentPrefetchLink>
                </li>
                <li>
                  <IntentPrefetchLink
                    href="/vs/turbotenant"
                    className={VS_LINK_ROW}
                  >
                    TrueCap vs TurboTenant
                  </IntentPrefetchLink>
                </li>
                <li>
                  <IntentPrefetchLink
                    href="/vs/avail"
                    className={VS_LINK_ROW}
                  >
                    TrueCap vs Avail
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

const RENTEC_DIRECT_FAQ: FaqItem[] = [
  {
    question: "Is TrueCap a Rentec Direct alternative?",
    answer: (
      <>
        No — different stages. Rentec Direct operates rentals you own. TrueCap
        underwrites rentals you&apos;re considering buying. The two fit one
        after the other: TrueCap before you buy, Rentec Direct once you own.
      </>
    ),
  },
  {
    question: "Rentec Direct vs Buildium — which one?",
    answer: (
      <>
        We don&apos;t rank property management software. Rentec Direct
        publishes its prices: Starter at a flat $25 a month for up to 10
        properties, Pro and PM from $50 a month (as of October 2026). Compare
        that with Buildium&apos;s pricing page for your unit count. TrueCap is
        the step before either one.
      </>
    ),
  },
  {
    question: "Does Rentec Direct have a free tier?",
    answer: (
      <>
        No. Rentec Direct says it is not free and offers a two-week free trial
        on every edition. Starter is a flat $25 a month for up to 10
        properties; Pro and PM start at $50 a month and rise with unit count
        (as of October 2026). TrueCap&apos;s core analysis is free; see live
        pricing for Pro.
      </>
    ),
  },
  {
    question: "Can I use Rentec Direct for underwriting new deals?",
    answer: (
      <>
        Rentec Direct&apos;s edition comparison covers managing rentals you
        own: accounting, rent collection, tenant screening and maintenance. It
        lists no pre-purchase deal analysis. For that (cap rate, DSCR, cash
        flow, projection), use TrueCap, DealCheck, or your spreadsheet.
      </>
    ),
  },
  {
    question: "Should I use TurboTenant or Rentec Direct?",
    answer: (
      <>
        Compare what each plan includes. TurboTenant has a free plan, and its
        paid plans start at $149 a year for up to 10 units. Rentec Direct has
        no free plan and starts at $25 a month for up to 10 properties (both as
        of October 2026). Rentec lists Schedule E reports on every edition and
        an owner portal on PM; TurboTenant lists Schedule E on Pro. Either one
        comes after the purchase decision TrueCap helps with.
      </>
    ),
  },
];

