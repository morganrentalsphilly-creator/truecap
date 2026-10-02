/**
 * /vs/appfolio — competitor comparison landing page.
 *
 * Target queries: "appfolio alternative", "appfolio vs", "appfolio pricing", "appfolio review", "enterprise property management".
 * AppFolio is post-purchase property-management software with quote-based
 * plans; its current Core pricing page states a 50-unit minimum.
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
  title: "AppFolio vs TrueCap (2026): PM vs Underwriting",
  description:
    "AppFolio is post-purchase property management software with quote-based plans. TrueCap is pre-purchase rental underwriting.",
  keywords: [
    "appfolio alternative",
    "appfolio vs",
    "appfolio pricing",
    "appfolio review",
    "enterprise property management",
  ],
  alternates: { canonical: "/vs/appfolio" },
  openGraph: {
    title: "AppFolio vs TrueCap (2026): PM vs Underwriting",
    description:
      "AppFolio is post-purchase property management software. TrueCap is pre-purchase rental underwriting.",
    url: "/vs/appfolio",
    type: "website",
    images: [
      {
        url: "/home.jpg",
        width: 1200,
        height: 630,
        alt: "TrueCap vs AppFolio",
      },
    ],
  },
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
};

type Verdict = "truecap" | "appfolio" | "tie";
type Row = {
  feature: string;
  truecap: string;
  appfolio: string;
  winner: Verdict;
};

const MATRIX: Row[] = [
  {
    feature: "Primary audience",
    truecap: "Agents with investor clients, and buy-and-hold investors",
    appfolio:
      "Property managers and investment managers; Core states a 50-unit minimum",
    winner: "tie",
  },
  {
    feature: "Lifecycle stage",
    truecap: "Pre-purchase — underwrite the deal",
    appfolio: "Post-purchase — manage properties and residents",
    winner: "tie",
  },
  {
    feature: "Cap rate / CoC / DSCR analysis",
    truecap: "Yes — full engine, free tier",
    appfolio: "No acquisition calculator listed in its plans",
    winner: "truecap",
  },
  {
    feature: "10-year projection",
    truecap: "Pro — rent + expense + appreciation",
    appfolio: "No pre-purchase projection listed in its plans",
    winner: "truecap",
  },
  {
    feature: "Deal score (0–100)",
    truecap: "Free — 0–100 score with factor breakdown",
    appfolio: "Not applicable",
    winner: "truecap",
  },
  {
    feature: "Starting values (rent/rate/tax)",
    truecap: "HUD rent + FRED rate + manual local property tax",
    appfolio: "Not applicable",
    winner: "truecap",
  },
  {
    feature: "Property-management workflow",
    truecap: "No",
    appfolio: "Yes — multi-property operations",
    winner: "appfolio",
  },
  {
    feature: "Accounting + reporting at scale",
    truecap: "No",
    appfolio: "Yes, property, portfolio and trust accounting with reports",
    winner: "appfolio",
  },
  {
    feature: "Resident services + utilities",
    truecap: "No",
    appfolio:
      "Yes, resident services, with smart-home and utility management through AppFolio Stack partners",
    winner: "appfolio",
  },
  {
    feature: "AI assistant for renters",
    truecap: "No",
    appfolio:
      "Yes, Realm-X Assistant is included; the AI Leasing Performer is a paid add-on",
    winner: "appfolio",
  },
  {
    feature: "Free tier",
    truecap: "Yes — core cap rate, CoC, DSCR, and cash flow",
    appfolio: "No — paid only",
    winner: "truecap",
  },
  {
    feature: "Pricing (entry tier)",
    truecap: "Free core; paid Pro — see live pricing",
    appfolio:
      "By quote; AppFolio's pricing page has shown Core from $1.49 per unit per month, with a minimum spend and a 50-unit minimum (as of October 2026)",
    winner: "tie",
  },
  {
    feature: "Smallest published portfolio",
    truecap: "No minimum; you can analyze a single property",
    appfolio: "Core states a 50-unit minimum",
    winner: "truecap",
  },
  {
    feature: "Shareable read-only deal link",
    truecap: "Free — read-only public link; Pro adds co-branding",
    appfolio: "Owner, vendor and resident portals; no public deal link listed",
    winner: "truecap",
  },
];

export default function VsAppfolioPage() {
  const siteUrl = getSiteUrl();
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "AppFolio vs TrueCap (2026): PM vs Underwriting",
    url: `${siteUrl}/vs/appfolio`,
    description:
      "AppFolio is post-purchase property management software with quote-based plans. TrueCap is pre-purchase rental underwriting.",
    dateModified: lastmodFor("/vs/appfolio"),
    publisher: { "@id": `${siteUrl}/#organization` },
  };

  return (
    // relative + overflow-x-clip, as on the homepage and the /vs hub: no
    // descendant can make the phone page scroll sideways.
    <div className="relative overflow-x-clip">
      <Header initialUser={null} initialEntitlements={null} />
      <JsonLd data={structuredData} />
      <VsBreadcrumbSchema
        vsPath="/vs/appfolio"
        pageName="TrueCap vs AppFolio"
      />
      <main id="main" tabIndex={-1} className="min-w-0 outline-none">
        <VsHero>
          <h1 className={VS_H1}>
            TrueCap vs AppFolio:{" "}
            pre-purchase underwriting vs property management
          </h1>
          <BlogByline />
          <p className={VS_LEDE}>
            AppFolio is post-purchase property management software for property
            managers and investment managers. Its current Core pricing page
            states a 50-unit minimum and minimum spend. TrueCap is a
            pre-purchase underwriting calculator for evaluating acquisitions.
            The products address different stages.
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
                  You underwrite deals yourself, or for investor clients.
                </li>
                <li>
                  You want cap rate, DSCR, cash flow, projection before buying.
                </li>
                <li>You want a free tier with no unit minimum.</li>
                <li>You&apos;re not running a property management company.</li>
              </ul>
            </div>
            <div className="min-w-0">
              <h3 className={VS_TLDR_LABEL}>
                Use AppFolio when
              </h3>
              <ul className={VS_TLDR_LIST}>
                <li>
                  You manage at least 50 units and need AppFolio&apos;s
                  operational workflow.
                </li>
                <li>
                  You need PM-grade accounting, owner portals, vendor workflows
                  at scale.
                </li>
                <li>You have multiple staff who need login access.</li>
                <li>
                  You&apos;re managing for other owners as a fee-for-service
                  business.
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
              head={["Feature", "TrueCap", "AppFolio"]}
              rows={MATRIX.map((row) => ({
                label: row.feature,
                truecap: row.truecap,
                competitor: row.appfolio,
                winner: row.winner === "appfolio" ? "competitor" : row.winner,
              }))}
            />
          </ScrollX>
          <p className={VS_SOURCES}>
            AppFolio details checked against its pricing page and AppFolio
            Stack marketplace in October 2026. See{" "}
            <a
              href="https://www.appfolio.com/pricing"
              target="_blank"
              rel="noopener"
              className="tc-link"
            >
              AppFolio&apos;s official pricing page
            </a>{" "}
            for current plans.
          </p>
        </Section>

        {/* Complementary workflow */}
        <Section aria-labelledby="vs-fit-heading">
          <SectionHeading id="vs-fit-heading">
            When solo investors graduate to AppFolio
          </SectionHeading>
          <div className={VS_PROSE}>
            <ol>
              <li>
                <strong>Underwrite + buy 1-10 properties with TrueCap.</strong>{" "}
                Free or Pro tier — solo investor workflow.
              </li>
              <li>
                <strong>
                  Add an operations tool as the portfolio grows, such as
                  TurboTenant, Buildium, or{" "}
                  <IntentPrefetchLink href="/vs/stessa" className="tc-link">
                    Stessa
                  </IntentPrefetchLink>
                  .
                </strong>{" "}
                Compare each vendor&apos;s current plans against your unit
                count.
              </li>
              <li>
                <strong>
                  Evaluate AppFolio once its published minimums fit.
                </strong>{" "}
                Core currently states a 50-unit minimum and minimum spend; request
                a current quote.
              </li>
              <li>
                <strong>Keep TrueCap for new acquisitions.</strong>{" "}
                AppFolio&apos;s plans list no acquisition calculator, so you
                still need TrueCap or a similar calculator for new deals.
              </li>
            </ol>
            <p>
              Buying a unit rather than managing one? The free{" "}
              <IntentPrefetchLink
                href="/tools/gross-rent-multiplier-calculator"
                className="tc-link"
              >
                gross rent multiplier calculator
              </IntentPrefetchLink>{" "}
              sorts a listing into yes or no on price alone; when you need the cap
              rate, cash-on-cash, and DSCR underneath it, the full{" "}
              <Link
                href="/analyze" prefetch={false}
                className="tc-link"
              >
                TrueCap analyzer
              </Link>{" "}
              computes them from an address. Our guide on{" "}
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

        <ComparisonFaq
          competitorName="AppFolio"
          items={APPFOLIO_FAQ}
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
            <RelatedContent kind="vs" slug="appfolio" />
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
                    href="/vs/rentec-direct"
                    className={VS_LINK_ROW}
                  >
                    TrueCap vs Rentec Direct
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

const APPFOLIO_FAQ: FaqItem[] = [
  {
    question: "Is TrueCap an AppFolio alternative?",
    answer: (
      <>
        Not directly. AppFolio handles post-purchase property management, while
        TrueCap handles pre-purchase acquisition underwriting. A manager may use
        both at different stages.
      </>
    ),
  },
  {
    question: "Is AppFolio worth it for a small landlord?",
    answer: (
      <>
        AppFolio&apos;s current Core pricing page states a 50-unit minimum and
        minimum spend, and its plans are sold by quote; the page has shown Core
        from $1.49 per unit per month (as of October 2026). A smaller landlord
        should confirm eligibility, obtain the current quote, and compare the
        operational features with alternatives rather than rely on the starting
        rate.
      </>
    ),
  },
  {
    question: "Does AppFolio underwrite deals?",
    answer: (
      <>
        AppFolio&apos;s property management plans list operations features
        (accounting, leasing, maintenance) and no acquisition calculator.
        You&apos;d use a separate calculator (TrueCap, DealCheck) to underwrite
        acquisitions and then set the property up in AppFolio after closing.
      </>
    ),
  },
  {
    question:
      "AppFolio vs Buildium — which is the easier upgrade from spreadsheets?",
    answer: (
      <>
        Compare each vendor&apos;s current minimums, quote, accounting,
        resident, owner, maintenance, support, and implementation features.
        AppFolio&apos;s Core plan currently states a 50-unit minimum; Buildium
        publishes tiered entry pricing on its own pricing page.
      </>
    ),
  },
  {
    question: "What does TrueCap not do that AppFolio does?",
    answer: (
      <>
        Everything in the operational stack — tenant management, lease
        workflows, accounting, vendor management, owner portals, resident
        services, smart-home integrations through AppFolio Stack. TrueCap is
        intentionally scope-limited
        to pre-purchase underwriting.
      </>
    ),
  },
];

