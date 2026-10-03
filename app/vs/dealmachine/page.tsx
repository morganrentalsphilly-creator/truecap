/**
 * /vs/dealmachine — competitor comparison landing page.
 *
 * Target queries: "dealmachine alternative", "dealmachine vs propstream", "dealmachine pricing", "dealmachine review", "driving for dollars app".
 * DealMachine is a mobile-first 'driving for dollars' lead generation app — snap a photo of a distressed property, instantly get owner contact info, send direct mail or skip-trace. Strong with wholesalers and active off-market buyers.
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
  title: "DealMachine vs TrueCap (2026): Find vs Underwrite",
  description:
    "DealMachine finds leads with property data and a driving-for-dollars app. TrueCap underwrites them. A comparison and how the two fit together.",
  keywords: [
    "dealmachine alternative",
    "dealmachine vs propstream",
    "dealmachine pricing",
    "dealmachine review",
    "driving for dollars app",
  ],
  alternates: { canonical: "/vs/dealmachine" },
  openGraph: {
    title: "DealMachine vs TrueCap (2026): Find vs Underwrite",
    description:
      "DealMachine is property and owner data, lead lists and driving for dollars. TrueCap underwrites the leads you choose.",
    url: "/vs/dealmachine",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

type Verdict = "truecap" | "dealmachine" | "tie";
type Row = {
  feature: string;
  truecap: string;
  dealmachine: string;
  winner: Verdict;
};

const MATRIX: Row[] = [
  {
    feature: "Primary purpose",
    truecap: "Per-deal underwriting calculator",
    dealmachine:
      "Property and owner data, lead lists, driving for dollars, skip tracing, direct mail",
    winner: "tie",
  },
  {
    feature: "Cap rate / CoC / DSCR analysis",
    truecap: "Yes — full engine, free tier",
    dealmachine:
      "Public calculators for rental cash flow, cap rate and cash-on-cash, plus BRRRR and wholesale offer price; DSCR not listed",
    winner: "tie",
  },
  {
    feature: "10-year projection",
    truecap: "Pro — rent + expense + appreciation",
    dealmachine: "Not listed in its public calculators",
    winner: "truecap",
  },
  {
    feature: "Deal score (0–100)",
    truecap: "Free — 0–100 score with factor breakdown",
    dealmachine: "Not listed on its tools or pricing pages",
    winner: "truecap",
  },
  {
    feature: "Starting values (rent/rate/tax)",
    truecap: "HUD rent + FRED rate + manual local property tax",
    dealmachine:
      "Rent estimate and nearby rentals in Comps & Analysis; its public rental calculator takes manual inputs",
    winner: "tie",
  },
  {
    feature: "Driving for dollars / mobile lead capture",
    truecap: "No",
    dealmachine: "Yes, with routes, photos and instant owner lookups",
    winner: "dealmachine",
  },
  {
    feature: "Skip tracing (owner phone/email)",
    truecap: "No",
    dealmachine: "Yes, owner phone numbers and emails on paid plans",
    winner: "dealmachine",
  },
  {
    feature: "Direct mail campaigns",
    truecap: "No",
    dealmachine: "Yes, pay-as-you-go postcards with automated drip campaigns",
    winner: "dealmachine",
  },
  {
    feature: "Property data + lists",
    truecap: "Limited (HUD rent benchmark + FRED)",
    dealmachine: "Yes, 150M+ searchable properties with saved searches and lists",
    winner: "dealmachine",
  },
  {
    feature: "Mobile-first UX",
    truecap: "PWA installable",
    dealmachine: "Driving for Dollars phone app included with every plan",
    winner: "dealmachine",
  },
  {
    feature: "Free tier",
    truecap: "Yes — core cap rate, CoC, DSCR, and cash flow",
    dealmachine:
      "Free account to explore; owner and contact data, lists, driving for dollars and mail need a paid plan",
    winner: "tie",
  },
  {
    feature: "Pricing (entry tier)",
    truecap: "Free core; paid Pro — see live pricing",
    dealmachine:
      "Basic $99 and Pro $149 per seat a month; Scale $599 per package a month (as of October 2026)",
    winner: "tie",
  },
  {
    feature: "Shareable read-only deal link",
    truecap: "Free — read-only public link; Pro adds co-branding",
    dealmachine: "Not listed on its pricing page",
    winner: "truecap",
  },
  {
    feature: "PDF deal report",
    truecap: "Included with Pro",
    dealmachine: "Not listed on its pricing page",
    winner: "truecap",
  },
];

export default function VsDealmachinePage() {
  const siteUrl = getSiteUrl();
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "DealMachine vs TrueCap (2026): Find vs Underwrite",
    url: `${siteUrl}/vs/dealmachine`,
    description:
      "DealMachine finds leads with property data and a driving-for-dollars app. TrueCap underwrites them. A comparison and how the two fit together.",
    dateModified: lastmodFor("/vs/dealmachine"),
    publisher: { "@id": `${siteUrl}/#organization` },
  };

  return (
    // relative + overflow-x-clip, as on the homepage and the /vs hub: no
    // descendant can make the phone page scroll sideways.
    <div className="relative overflow-x-clip">
      <Header initialUser={null} initialEntitlements={null} />
      <JsonLd data={structuredData} />
      <VsBreadcrumbSchema
        vsPath="/vs/dealmachine"
        pageName="TrueCap vs DealMachine"
      />
      <main id="main" tabIndex={-1} className="min-w-0 outline-none">
        <VsHero>
          <h1 className={VS_H1}>
            TrueCap vs DealMachine:{" "}
            find leads on the street vs underwrite them at the desk
          </h1>
          <BlogByline />
          <p className={VS_LEDE}>
            DealMachine is a property and owner data platform with a
            driving-for-dollars app, skip tracing and direct mail built in.
            TrueCap models the economics of an address from user-reviewed
            assumptions. Different jobs: one finds the lead, the other
            underwrites it.
          </p>
          <ActionRow className={VS_ACTIONS}>
            <AnalyzeCtaLink analyticsSource="vs_hero" className={buttonVariants({ size: "cta" })}>
              Run a deal
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
                <li>
                  You&apos;ve found an address and want to know if it cash
                  flows.
                </li>
                <li>
                  You want the numbers in a form you can send to a partner: a
                  read-only link, or a PDF report with Pro.
                </li>
                <li>
                  You don&apos;t drive for dollars — you source on-market or via
                  wholesalers.
                </li>
                <li>You want a free tier that covers real underwriting.</li>
              </ul>
            </div>
            <div className="min-w-0">
              <h3 className={VS_TLDR_LABEL}>
                Use DealMachine when
              </h3>
              <ul className={VS_TLDR_LIST}>
                <li>
                  You actively drive for dollars and want to capture leads on
                  the spot.
                </li>
                <li>
                  You need owner phone/email for direct outreach (skip tracing).
                </li>
                <li>
                  You&apos;re sending postcards and want automation, not a mail
                  house.
                </li>
                <li>
                  You&apos;re a wholesaler or active off-market buy-and-hold
                  investor.
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
              head={["Feature", "TrueCap", "DealMachine"]}
              rows={MATRIX.map((row) => ({
                label: row.feature,
                truecap: row.truecap,
                competitor: row.dealmachine,
                winner: row.winner === "dealmachine" ? "competitor" : row.winner,
              }))}
            />
          </ScrollX>
          <p className={VS_SOURCES}>
            DealMachine details were checked against its{" "}
            <a
              href="https://www.dealmachine.com/pricing"
              target="_blank"
              rel="noopener"
              className="tc-link"
            >
              pricing
            </a>
            ,{" "}
            <a
              href="https://www.dealmachine.com/tools"
              target="_blank"
              rel="noopener"
              className="tc-link"
            >
              tools
            </a>
            ,{" "}
            <a
              href="https://www.dealmachine.com/features/comps-analysis"
              target="_blank"
              rel="noopener"
              className="tc-link"
            >
              Comps &amp; Analysis
            </a>{" "}
            and{" "}
            <a
              href="https://help.dealmachine.com/en/articles/13186423-is-dealmachine-free-to-use-or-is-there-cost"
              target="_blank"
              rel="noopener"
              className="tc-link"
            >
              free account
            </a>{" "}
            pages in October 2026. Prices are for monthly billing. Features and
            prices can change.
          </p>
        </Section>

        {/* Complementary workflow */}
        <Section aria-labelledby="vs-fit-heading">
          <SectionHeading id="vs-fit-heading">
            How the two fit together
          </SectionHeading>
          <div className={VS_PROSE}>
            <ol>
              <li>
                <strong>Drive for dollars or pull a list in DealMachine.</strong>{" "}
                Snap the distressed property; pull owner contact info.
              </li>
              <li>
                <strong>Skip-trace and send direct mail.</strong>{" "}
                DealMachine&apos;s mail app sends postcards and automated drip
                campaigns.
              </li>
              <li>
                <strong>Seller calls back.</strong> Now you have an address you
                might buy.
              </li>
              <li>
                <strong>Underwrite in TrueCap.</strong> Paste the address. A HUD
                rent benchmark and the FRED owner-occupied rate can pre-fill as
                editable benchmarks; property tax remains a manual local input.
                Review the Offer Ceiling under your targets.
              </li>
              <li>
                <strong>Verify, then record your decision.</strong> TrueCap&apos;s
                Offer Ceiling (in your first free decision) works backward from your target return.
              </li>
            </ol>
            <p>
              Pulled a lead off the street and want the math? Run a quick
              rent-to-price screen with the free{" "}
              <IntentPrefetchLink
                href="/tools/1-percent-rule-calculator"
                className="tc-link"
              >
                1% rule calculator
              </IntentPrefetchLink>
              , then paste the address into the full{" "}
              <Link
                href="/analyze" prefetch={false}
                className="tc-link"
              >
                TrueCap analyzer
              </Link>{" "}
              for cap rate, DSCR, and cash flow. Our guide on{" "}
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
          competitorName="DealMachine"
          items={DEALMACHINE_FAQ}
          reviewedDate="October 2026"
        />

        {/* Pricing CTA */}
        <CloseSection
          headingId="vs-close-heading"
          heading={<>Underwrite the next deal — free.</>}
          lede={
            <>
              TrueCap free covers cap rate, CoC, DSCR, and monthly cash flow.
              Your first complete decision also includes the Offer Ceiling.
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
            <RelatedContent kind="vs" slug="dealmachine" />
            <AuthorBio />

            <footer className="mt-10 border-t border-border pt-6">
              <p className="text-lg font-semibold">Other comparisons:</p>
              <ul className="mt-2 grid gap-x-8 sm:grid-cols-2">
                <li>
                  <IntentPrefetchLink
                    href="/vs/propstream"
                    className={VS_LINK_ROW}
                  >
                    TrueCap vs PropStream
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
                <li>
                  <IntentPrefetchLink
                    href="/vs/mashvisor"
                    className={VS_LINK_ROW}
                  >
                    TrueCap vs Mashvisor
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

const DEALMACHINE_FAQ: FaqItem[] = [
  {
    question: "Is TrueCap a DealMachine alternative?",
    answer: (
      <>
        Not really — they solve different problems. DealMachine finds
        motivated-seller leads via mobile driving for dollars + skip-tracing.
        TrueCap underwrites a specific property once you have an address. They
        do different jobs, so they can be used together.
      </>
    ),
  },
  {
    question: "DealMachine vs PropStream — which one?",
    answer: (
      <>
        DealMachine includes a driving-for-dollars app and a mail app with
        every plan, alongside its property and owner data. For PropStream, see
        its own site. Compare each vendor&apos;s current data coverage, filters
        and pricing before choosing.
      </>
    ),
  },
  {
    question: "Is DealMachine worth the price?",
    answer: (
      <>
        It depends on volume. DealMachine&apos;s paid plans start at $99 per
        seat a month (as of October 2026), and its acquisition workflow may fit
        frequent driving-for-dollars and direct-mail campaigns. If you buy only
        a few properties through listed channels, evaluate whether you need
        that workflow. TrueCap&apos;s free and paid underwriting options are
        listed on its live pricing page.
      </>
    ),
  },
  {
    question: "Does DealMachine do underwriting?",
    answer: (
      <>
        Partly. DealMachine publishes calculators for rental cash flow, cap
        rate and cash-on-cash, plus BRRRR and wholesale offer-price
        calculators, and says investment analysis is available on a lead inside
        its product.
        DSCR is not listed. TrueCap covers DSCR, a Deal score and an Offer
        Ceiling: the highest price that still meets your targets.
      </>
    ),
  },
  {
    question: "Can I use DealMachine + TrueCap on the same property?",
    answer: (
      <>
        One possible workflow is to source a property in DealMachine, then
        underwrite the entered assumptions in TrueCap. Pro calculates an Offer
        Ceiling under your targets. Verify the material inputs and
        record your own decision before any transaction step.
      </>
    ),
  },
];

