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
  title: "RentRedi vs TrueCap (2026): Manage vs Underwrite",
  description:
    "RentRedi collects rent. TrueCap models pre-purchase cash flow from reviewed assumptions. A comparison of where each tool fits.",
  keywords: [
    "rentredi alternative",
    "rentredi vs truecap",
    "rentredi review",
    "rentredi pricing",
    "rental property analyzer vs rent collection",
  ],
  alternates: { canonical: "/vs/rentredi" },
  openGraph: {
    title: "RentRedi vs TrueCap (2026): Manage vs Underwrite",
    description:
      "RentRedi is post-purchase landlord ops. TrueCap is pre-purchase underwriting. Different stages of the rental lifecycle.",
    url: "/vs/rentredi",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

type Verdict = "truecap" | "rentredi" | "tie";
type Row = {
  feature: string;
  truecap: string;
  rentredi: string;
  winner: Verdict;
};

const MATRIX: Row[] = [
  {
    feature: "When in the lifecycle?",
    truecap: "Before you buy — underwrite the deal",
    rentredi: "After you buy — operate the property",
    winner: "tie",
  },
  {
    feature: "Pre-purchase cap rate / CoC / DSCR analysis",
    truecap: "Yes — full engine, free tier",
    rentredi:
      "No pre-purchase underwriting listed; its dashboard tracks NOI, cash flow and cash-on-cash on units you own",
    winner: "truecap",
  },
  {
    feature: "10-year projection",
    truecap: "Pro — rent growth + expense growth + appreciation",
    rentredi: "Not on RentRedi's published feature list",
    winner: "truecap",
  },
  {
    feature: "Sensitivity grid",
    truecap: "Pro — rent ±10%, vacancy ±5pp, rate ±1pp",
    rentredi: "Not on RentRedi's published feature list",
    winner: "truecap",
  },
  {
    feature: "Deal score (0–100)",
    truecap: "Free — with subscore breakdown",
    rentredi: "Not on RentRedi's published feature list",
    winner: "truecap",
  },
  {
    feature: "Buy Box fit",
    truecap:
      "Free on your first decision, then with Pro: named targets with supporting economics",
    rentredi: "Not applicable",
    winner: "truecap",
  },
  {
    feature: "Online rent collection",
    truecap: "No",
    rentredi: "Yes — ACH + card, late fees, auto-pay",
    winner: "rentredi",
  },
  {
    feature: "Tenant screening",
    truecap: "No",
    rentredi: "Yes — credit, criminal, eviction reports",
    winner: "rentredi",
  },
  {
    feature: "Online rental application",
    truecap: "No",
    rentredi: "Yes — customizable forms",
    winner: "rentredi",
  },
  {
    feature: "Maintenance request workflow",
    truecap: "No",
    rentredi: "Yes — tenant portal + tracker",
    winner: "rentredi",
  },
  {
    feature: "Listing distribution",
    truecap: "No",
    rentredi: "Yes, listing syndication on every plan, Zillow included",
    winner: "rentredi",
  },
  {
    feature: "Pricing (entry tier)",
    truecap: "Free core; paid Pro — see live pricing",
    rentredi: "Flat-rate paid plans — see live pricing",
    winner: "truecap",
  },
  {
    feature: "Per-property cost",
    truecap: "Unlimited core analyses; feature limits may apply",
    rentredi: "Unlimited properties and units on published plans",
    winner: "tie",
  },
  {
    feature: "Free tier or trial",
    truecap: "Free core underwriting tier",
    rentredi: "No free trial; 30-day money-back guarantee",
    winner: "truecap",
  },
  {
    feature: "Starting values (rent, rate, tax)",
    truecap: "HUD rent + FRED rate + manual local property tax",
    rentredi: "Not applicable",
    winner: "truecap",
  },
  {
    feature: "Multi-property dashboard",
    truecap: "Yes — portfolio rollup of saved deals",
    rentredi: "Yes — operations dashboard across all units",
    winner: "tie",
  },
];

export default function VsRentRediPage() {
  const siteUrl = getSiteUrl();
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "RentRedi vs TrueCap (2026): Manage vs Underwrite",
    url: `${siteUrl}/vs/rentredi`,
    description:
      "Side-by-side comparison of TrueCap (rental underwriting calculator) and RentRedi (tenant + rent management).",
    dateModified: lastmodFor("/vs/rentredi"),
    publisher: { "@id": `${siteUrl}/#organization` },
  };

  return (
    // relative + overflow-x-clip, as on the homepage and the /vs hub: no
    // descendant can make the phone page scroll sideways.
    <div className="relative overflow-x-clip">
      <Header initialUser={null} initialEntitlements={null} />
      <JsonLd data={structuredData} />
      <VsBreadcrumbSchema
        vsPath="/vs/rentredi"
        pageName="TrueCap vs RentRedi"
      />
      <main id="main" tabIndex={-1} className="min-w-0 outline-none">
        <VsHero>
          <h1 className={VS_H1}>
            TrueCap vs RentRedi:{" "}
            underwrite vs operate
          </h1>
          <BlogByline />
          <p className={VS_LEDE}>
            RentRedi is what you use after closing — rent collection, tenant
            screening, maintenance requests, listing distribution. TrueCap is
            what you use before closing — underwriting the deal, modeling cash
            flow, deciding if the numbers work. They don&apos;t replace each
            other; they cover different halves of the lifecycle. A landlord may
            use both.
          </p>
          <ActionRow className={VS_ACTIONS}>
            <AnalyzeCtaLink analyticsSource="vs_hero" className={buttonVariants({ size: "cta" })}>
              Try the TrueCap free analyzer
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
                Use TrueCap for
              </h3>
              <ul className={VS_TLDR_LIST}>
                <li>Underwriting a property before you buy.</li>
                <li>Comparing two or three potential deals side-by-side.</li>
                <li>
                  Modeling 10-year cash flow and equity under editable
                  assumptions.
                </li>
                <li>Stress-testing assumptions (rent, vacancy, rate).</li>
                <li>
                  Sharing a polished read-only deal analysis with partners or
                  lenders.
                </li>
              </ul>
            </div>
            <div className="min-w-0">
              <h3 className={VS_TLDR_LABEL}>
                Use RentRedi for
              </h3>
              <ul className={VS_TLDR_LIST}>
                <li>Collecting rent online (ACH + card).</li>
                <li>Listing vacant units across rental sites.</li>
                <li>Running tenant screening (credit, criminal, eviction).</li>
                <li>Handling maintenance requests through a tenant portal.</li>
                <li>
                  Managing the ongoing landlord ops once you own the place.
                </li>
              </ul>
            </div>
          </div>
          <div className={VS_PROSE}>
            <p>
              One framing that helps:{" "}
              <strong>
                TrueCap is the calculator you use during the LOI / inspection
                period.
              </strong>{" "}
              RentRedi is what you set up the week after closing.
            </p>
          </div>
        </Section>

        {/* Matrix */}
        <Section aria-labelledby="vs-matrix-heading">
          <SectionHeading id="vs-matrix-heading">
            Feature-by-feature
          </SectionHeading>
          <p className={VS_INTRO}>
            The rows split by stage: TrueCap before the purchase, RentRedi
            after it.
          </p>
          <ScrollX label="Comparison table" className="mt-8 max-w-5xl">
            <VsMatrixTable
              head={["Feature", "TrueCap", "RentRedi"]}
              rows={MATRIX.map((row) => ({
                label: row.feature,
                truecap: row.truecap,
                competitor: row.rentredi,
                winner: row.winner === "rentredi" ? "competitor" : row.winner,
              }))}
            />
          </ScrollX>
          <p className={VS_SOURCES}>
            RentRedi details checked in October 2026. See{" "}
            <a
              href="https://rentredi.com/pricing"
              target="_blank"
              rel="noopener"
              className="tc-link"
            >
              RentRedi&apos;s official pricing page
            </a>{" "}
            for current plans.
          </p>
        </Section>

        {/* Complementary */}
        <Section aria-labelledby="vs-fit-heading">
          <SectionHeading id="vs-fit-heading">
            How the two fit together
          </SectionHeading>
          <div className={VS_PROSE}>
            <ol>
              <li>
                <strong>Sourcing:</strong> find a property (Zillow, MLS,
                wholesaler).
              </li>
              <li>
                <strong>Underwriting (TrueCap):</strong> paste the address, run
                the analysis, check cap rate / CoC / DSCR / cash flow against
                benchmarks, sensitize, decide.
              </li>
              <li>
                <strong>Negotiate / close.</strong>
              </li>
              <li>
                <strong>Setup (RentRedi):</strong> list the unit if vacant, screen
                tenants, sign lease.
              </li>
              <li>
                <strong>Operations (RentRedi):</strong> collect rent, handle
                maintenance requests, track payments.
              </li>
              <li>
                <strong>Annual review (TrueCap):</strong> revisit the saved
                analysis to compare actuals vs underwrite — and apply that lesson
                to the next deal.
              </li>
            </ol>
            <p>
              Want to see the underwriting step in action? The walkthroughs on{" "}
              <IntentPrefetchLink
                href="/blog/how-to-calculate-cap-rate"
                className="tc-link"
              >
                how to calculate cap rate
              </IntentPrefetchLink>{" "}
              and{" "}
              <IntentPrefetchLink
                href="/blog/how-to-calculate-dscr"
                className="tc-link"
              >
                how to calculate DSCR
              </IntentPrefetchLink>{" "}
              show the math a lender checks long before RentRedi ever collects a
              dollar of rent, and the guide on{" "}
              <IntentPrefetchLink
                href="/blog/how-to-underwrite-a-rental-property-in-60-seconds"
                className="tc-link"
              >
                60-second underwriting
              </IntentPrefetchLink>{" "}
              runs the whole sequence on a real address.
            </p>
          </div>
        </Section>

        <ComparisonFaq
          competitorName="RentRedi"
          items={RENTREDI_FAQ}
          reviewedDate="October 2026"
        />

        {/* Pricing CTA */}
        <CloseSection
          headingId="vs-close-heading"
          heading={<>Underwrite the next deal — free.</>}
          lede={
            <>
              TrueCap free covers cap rate, CoC, DSCR, monthly cash flow
              and plain read-only share links. Your first complete decision also
              includes the Offer Ceiling. Pro adds co-branding, 10-year cash-flow
              and equity projections, sensitivity, Offer Ceiling, saved-deal
              comparison, and included PDFs. New one-time PDF checkout is
              temporarily unavailable. No card to start.
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
            <RelatedContent kind="vs" slug="rentredi" />
            <AuthorBio />

            <footer className="mt-10 border-t border-border pt-6">
              <p className="text-lg font-semibold">Other comparisons:</p>
              <ul className="mt-2 grid gap-x-8 sm:grid-cols-2">
                <li>
                  <IntentPrefetchLink
                    href="/vs/stessa"
                    className={VS_LINK_ROW}
                  >
                    TrueCap vs Stessa
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

const RENTREDI_FAQ: FaqItem[] = [
  {
    question: "Is TrueCap a RentRedi alternative?",
    answer: (
      <>
        No — different tools for different stages. RentRedi is for managing a
        property you already own (rent collection, tenant screening,
        maintenance). TrueCap is for modeling pre-purchase economics (cap rate,
        cash flow, and projections). A landlord can use both at different
        points.
      </>
    ),
  },
  {
    question: "Does TrueCap collect rent like RentRedi?",
    answer: (
      <>
        No, and we&apos;re not planning to. Rent collection is a serious
        compliance + payments product (ACH, NACHA rules, late-fee automation,
        tenant disputes), and RentRedi is one of the companies focused on it.
        TrueCap is intentionally scope-limited to the underwriting layer.
      </>
    ),
  },
  {
    question: "Is RentRedi cheaper than TrueCap?",
    answer: (
      <>
        TrueCap and RentRedi do different jobs. TrueCap has a free core
        underwriting tier and paid Pro options. RentRedi publishes flat-rate
        paid plans for unlimited properties and units, with a money-back
        guarantee rather than a free trial. Check both live pricing pages for
        current rates and terms.
      </>
    ),
  },
  {
    question: "What do I need before I use RentRedi?",
    answer: (
      <>
        You need to actually own (or be about to close on) the property.
        RentRedi&apos;s value kicks in once you have a unit to fill or a tenant
        to bill. That&apos;s exactly the moment TrueCap&apos;s job ends — after
        the investor has reviewed the underwriting and recorded their own
        decision.
      </>
    ),
  },
  {
    question: "Does TrueCap have a tenant screening or application feature?",
    answer: (
      <>
        No. TrueCap doesn&apos;t pull credit reports or store rental
        applications. That&apos;s a different compliance regime (FCRA-regulated)
        and we don&apos;t build there. If you need tenant screening, RentRedi,
        RentSpree and TurboTenant all offer it.
      </>
    ),
  },
];

