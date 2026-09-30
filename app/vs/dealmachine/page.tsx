/**
 * /vs/dealmachine — competitor comparison landing page.
 *
 * Target queries: "dealmachine alternative", "dealmachine vs propstream", "dealmachine pricing", "dealmachine review", "driving for dollars app".
 * DealMachine is a mobile-first 'driving for dollars' lead generation app — snap a photo of a distressed property, instantly get owner contact info, send direct mail or skip-trace. Strong with wholesalers and active off-market buyers.
 */

import type { Metadata } from "next";
import Link from "next/link";
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
    "DealMachine finds the leads with mobile-first driving for dollars. TrueCap underwrites them. Honest comparison and how investors use both.",
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
      "DealMachine is mobile-first lead generation. TrueCap underwrites the deals it surfaces. Different jobs.",
    url: "/vs/dealmachine",
    type: "website",
    images: [
      {
        url: "/home.jpg",
        width: 1200,
        height: 630,
        alt: "TrueCap vs DealMachine",
      },
    ],
  },
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
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
    dealmachine: "Mobile lead generation + skip-tracing",
    winner: "tie",
  },
  {
    feature: "Cap rate / CoC / DSCR analysis",
    truecap: "Yes — full engine, free tier",
    dealmachine: "Not modeled",
    winner: "truecap",
  },
  {
    feature: "10-year projection",
    truecap: "Pro — rent + expense + appreciation",
    dealmachine: "Not modeled",
    winner: "truecap",
  },
  {
    feature: "Deal score (0–100)",
    truecap: "Free — 0–100 score with factor breakdown",
    dealmachine: "Not applicable",
    winner: "truecap",
  },
  {
    feature: "Starting values (rent/rate/tax)",
    truecap: "HUD rent + FRED rate + manual local property tax",
    dealmachine: "Property data only",
    winner: "truecap",
  },
  {
    feature: "Driving for dollars / mobile lead capture",
    truecap: "No",
    dealmachine: "Yes — photo + instant owner lookup",
    winner: "dealmachine",
  },
  {
    feature: "Skip tracing (owner phone/email)",
    truecap: "No",
    dealmachine: "Yes — built-in",
    winner: "dealmachine",
  },
  {
    feature: "Direct mail campaigns",
    truecap: "No",
    dealmachine: "Yes — automated postcards",
    winner: "dealmachine",
  },
  {
    feature: "Property data + lists",
    truecap: "Limited (HUD FMR + FRED)",
    dealmachine: "Yes — 150M+ properties, motivated lists",
    winner: "dealmachine",
  },
  {
    feature: "Mobile-first UX",
    truecap: "PWA installable",
    dealmachine: "Native app (built for mobile)",
    winner: "dealmachine",
  },
  {
    feature: "Free tier",
    truecap: "Yes — core cap rate, CoC, DSCR, and cash flow",
    dealmachine: "Trial only ($59-99/mo paid)",
    winner: "truecap",
  },
  {
    feature: "Pricing (entry tier)",
    truecap: "Free core; paid Pro — see live pricing",
    dealmachine: "Starter ~$59/mo, Pro ~$99/mo (as of 2026)",
    winner: "truecap",
  },
  {
    feature: "Shareable read-only deal link",
    truecap: "Free — read-only public link; Pro adds co-branding",
    dealmachine: "Internal-only data",
    winner: "truecap",
  },
  {
    feature: "PDF deal report",
    truecap: "Included with Pro",
    dealmachine: "Not the use case",
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
      "DealMachine finds the leads with mobile-first driving for dollars. TrueCap underwrites them. Honest comparison and how investors use both.",
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
            DealMachine is the heavyweight in mobile-first driving for dollars —
            snap a photo of a distressed property, get owner contact info
            instantly, send a postcard or skip-trace from your phone. TrueCap
            models the economics of an address from user-reviewed assumptions.
            Different jobs; many active off-market buyers use both.
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
                  You&apos;ve found an address and want to know if it cash
                  flows.
                </li>
                <li>You want a defensible analysis for a lender or partner.</li>
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
            DealMachine details based on publicly available product info as of
            2026. See{" "}
            <a
              href="https://dealmachine.com"
              target="_blank"
              rel="noopener"
              className="tc-link"
            >
              dealmachine.com
            </a>{" "}
            for their current state.
          </p>
        </Section>

        {/* Complementary workflow */}
        <Section aria-labelledby="vs-fit-heading">
          <SectionHeading id="vs-fit-heading">
            How active investors use both
          </SectionHeading>
          <div className={VS_PROSE}>
            <ol>
              <li>
                <strong>Drive for dollars or pull a list in DealMachine.</strong>{" "}
                Snap the distressed property; pull owner contact info.
              </li>
              <li>
                <strong>Send direct mail / skip-trace / cold call.</strong>{" "}
                DealMachine automates the outreach campaign.
              </li>
              <li>
                <strong>Seller calls back.</strong> Now you have an address you
                might buy.
              </li>
              <li>
                <strong>Underwrite in TrueCap.</strong> Paste the address. HUD
                area rent and the FRED owner-occupied rate can pre-fill as
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
              <Link
                href="/tools/1-percent-rule-calculator"
                className="tc-link"
              >
                1% rule calculator
              </Link>
              , then paste the address into the full{" "}
              <Link
                href="/analyze" prefetch={false}
                className="tc-link"
              >
                TrueCap analyzer
              </Link>{" "}
              for cap rate, DSCR, and cash flow. Our guide on{" "}
              <Link
                href="/blog/how-to-underwrite-a-rental-property-in-60-seconds"
                className="tc-link"
              >
                60-second underwriting
              </Link>{" "}
              walks through the workflow end-to-end.
            </p>
          </div>
        </Section>

        <ComparisonFaq competitorName="DealMachine" items={DEALMACHINE_FAQ} />

        {/* Pricing CTA */}
        <CloseSection
          headingId="vs-close-heading"
          heading={<>Underwrite the next deal — free.</>}
          lede={
            <>
              TrueCap free covers cap rate, CoC, DSCR, NCF, and monthly cash flow.
              Pro adds 10-year cash-flow and equity projections, sensitivity,
              Offer Ceiling, co-branded share links, and PDF reports with Pro; see
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
              <Link
                href="/pricing"
                className={buttonVariants({ variant: "outline", size: "cta" })}
              >
                See Pro pricing
              </Link>
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
                  <Link
                    href="/vs/propstream"
                    className={VS_LINK_ROW}
                  >
                    TrueCap vs PropStream
                  </Link>
                </li>
                <li>
                  <Link
                    href="/vs/dealcheck"
                    className={VS_LINK_ROW}
                  >
                    TrueCap vs DealCheck
                  </Link>
                </li>
                <li>
                  <Link
                    href="/vs/mashvisor"
                    className={VS_LINK_ROW}
                  >
                    TrueCap vs Mashvisor
                  </Link>
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
        TrueCap underwrites a specific property once you have an address. Most
        active off-market buyers use both.
      </>
    ),
  },
  {
    question: "DealMachine vs PropStream — which one?",
    answer: (
      <>
        DealMachine is more mobile-first and best for driving-for-dollars
        workflows. PropStream is more data-heavy with deeper public records
        access and richer list-pull filters. Solo investors who hunt on the road
        lean DealMachine; teams running large mail campaigns from a desk lean
        PropStream. Some wholesalers run both.
      </>
    ),
  },
  {
    question: "Is DealMachine worth $59-99/month?",
    answer: (
      <>
        It depends on volume. DealMachine&apos;s all-in acquisition workflow may
        fit frequent driving-for-dollars and direct-mail campaigns. If you buy
        only a few properties through listed channels, evaluate whether you need
        that workflow. TrueCap&apos;s free and paid underwriting options are
        listed on its live pricing page.
      </>
    ),
  },
  {
    question: "Does DealMachine do underwriting?",
    answer: (
      <>
        No — it surfaces motivated-seller leads and contact info but
        doesn&apos;t model cap rate, DSCR, or cash flow on those leads.
        You&apos;d use TrueCap, DealCheck, or a spreadsheet to run the numbers
        after DealMachine finds you a deal.
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

