/**
 * /vs/batchleads — competitor comparison landing page.
 *
 * Target queries: "batchleads alternative", "batchleads vs propstream", "batchleads pricing", "batchleads review".
 * BatchLeads is real-estate lead generation + list-pulling + skip-tracing — direct competitor to PropStream, often cheaper. Popular with wholesalers and direct-mail-heavy buy-and-hold investors.
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
  title: "BatchLeads vs TrueCap (2026): Leads vs Analysis",
  description:
    "BatchLeads finds motivated-seller leads. TrueCap underwrites the deals. Honest comparison plus how active investors use both.",
  keywords: [
    "batchleads alternative",
    "batchleads vs propstream",
    "batchleads pricing",
    "batchleads review",
  ],
  alternates: { canonical: "/vs/batchleads" },
  openGraph: {
    title: "BatchLeads vs TrueCap (2026): Leads vs Analysis",
    description:
      "BatchLeads is lead generation + skip-tracing. TrueCap underwrites the deals. Different jobs.",
    url: "/vs/batchleads",
    type: "website",
    images: [
      {
        url: "/home.jpg",
        width: 1200,
        height: 630,
        alt: "TrueCap vs BatchLeads",
      },
    ],
  },
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
};

type Verdict = "truecap" | "batchleads" | "tie";
type Row = {
  feature: string;
  truecap: string;
  batchleads: string;
  winner: Verdict;
};

const MATRIX: Row[] = [
  {
    feature: "Primary purpose",
    truecap: "Per-deal underwriting calculator",
    batchleads: "Lead gen + skip-tracing + list-pulling",
    winner: "tie",
  },
  {
    feature: "Cap rate / CoC / DSCR analysis",
    truecap: "Yes — full engine, free tier",
    batchleads: "Not modeled",
    winner: "truecap",
  },
  {
    feature: "10-year projection",
    truecap: "Pro — rent + expense + appreciation",
    batchleads: "Not modeled",
    winner: "truecap",
  },
  {
    feature: "Deal score (0–100)",
    truecap: "Free — 0–100 score with factor breakdown",
    batchleads: "Not applicable",
    winner: "truecap",
  },
  {
    feature: "Starting values (rent/rate/tax)",
    truecap: "HUD rent + FRED rate + manual local property tax",
    batchleads: "Property data only",
    winner: "truecap",
  },
  {
    feature: "Motivated-seller lists",
    truecap: "No",
    batchleads: "Yes — pre-foreclosure, probate, vacant, etc.",
    winner: "batchleads",
  },
  {
    feature: "Skip tracing",
    truecap: "No",
    batchleads: "Yes — owner phone + email",
    winner: "batchleads",
  },
  {
    feature: "Direct mail + SMS campaigns",
    truecap: "No",
    batchleads: "Yes — built-in outreach",
    winner: "batchleads",
  },
  {
    feature: "Stacked / multi-criteria lists",
    truecap: "No",
    batchleads: "Yes — overlay multiple filters",
    winner: "batchleads",
  },
  {
    feature: "Free tier",
    truecap: "Yes — core cap rate, CoC, DSCR, and cash flow",
    batchleads: "Trial; paid from ~$99/mo (as of 2026)",
    winner: "truecap",
  },
  {
    feature: "Pricing (entry tier)",
    truecap: "Free core; paid Pro — see live pricing",
    batchleads: "Standard ~$99/mo + per-skiptrace fees",
    winner: "truecap",
  },
  {
    feature: "Shareable read-only deal link",
    truecap: "Free — read-only public link; Pro adds co-branding",
    batchleads: "Internal-only",
    winner: "truecap",
  },
];

export default function VsBatchleadsPage() {
  const siteUrl = getSiteUrl();
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "BatchLeads vs TrueCap (2026): Leads vs Analysis",
    url: `${siteUrl}/vs/batchleads`,
    description:
      "BatchLeads finds motivated-seller leads. TrueCap underwrites the deals. Honest comparison plus how active investors use both.",
    dateModified: lastmodFor("/vs/batchleads"),
    publisher: { "@id": `${siteUrl}/#organization` },
  };

  return (
    // relative + overflow-x-clip, as on the homepage and the /vs hub: no
    // descendant can make the phone page scroll sideways.
    <div className="relative overflow-x-clip">
      <Header initialUser={null} initialEntitlements={null} />
      <JsonLd data={structuredData} />
      <VsBreadcrumbSchema
        vsPath="/vs/batchleads"
        pageName="TrueCap vs BatchLeads"
      />
      <main id="main" tabIndex={-1} className="min-w-0 outline-none">
        <VsHero>
          <h1 className={VS_H1}>
            TrueCap vs BatchLeads:{" "}
            find motivated sellers vs underwrite the deals
          </h1>
          <BlogByline />
          <p className={VS_LEDE}>
            BatchLeads is a lead-generation + skip-tracing + list-pulling
            platform — pull motivated-seller lists, get owner contact info, run
            direct mail and SMS campaigns. Direct competitor to PropStream,
            often a cheaper alternative. TrueCap is the underwriting calculator
            you&apos;d use after BatchLeads surfaces a property.
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
                <li>You have an address and want to underwrite it.</li>
                <li>You want cap rate, DSCR, cash flow, projection.</li>
                <li>
                  You&apos;re not running off-market direct mail campaigns.
                </li>
                <li>You want a free tier with no monthly cap.</li>
              </ul>
            </div>
            <div className="min-w-0">
              <h3 className={VS_TLDR_LABEL}>
                Use BatchLeads when
              </h3>
              <ul className={VS_TLDR_LIST}>
                <li>You source off-market deals via direct mail or SMS.</li>
                <li>
                  You need motivated-seller lists (pre-foreclosure, probate,
                  vacant, tax-delinquent).
                </li>
                <li>You need stacked filters (overlay multiple list types).</li>
                <li>
                  You want a PropStream alternative that&apos;s sometimes
                  cheaper.
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
              head={["Feature", "TrueCap", "BatchLeads"]}
              rows={MATRIX.map((row) => ({
                label: row.feature,
                truecap: row.truecap,
                competitor: row.batchleads,
                winner: row.winner === "batchleads" ? "competitor" : row.winner,
              }))}
            />
          </ScrollX>
          <p className={VS_SOURCES}>
            BatchLeads details based on publicly available product info as of
            2026. See{" "}
            <a
              href="https://batchleads.io"
              target="_blank"
              rel="noopener"
              className="tc-link"
            >
              batchleads.io
            </a>{" "}
            for their current state.
          </p>
        </Section>

        {/* Complementary workflow */}
        <Section aria-labelledby="vs-fit-heading">
          <SectionHeading id="vs-fit-heading">
            How wholesalers + active investors use both
          </SectionHeading>
          <div className={VS_PROSE}>
            <ol>
              <li>
                <strong>Pull motivated-seller lists in BatchLeads.</strong>{" "}
                Probate, pre-foreclosure, vacant, tax-delinquent, absentee owner.
                Stack filters as needed.
              </li>
              <li>
                <strong>Skip-trace + outreach (mail / SMS / cold call).</strong>{" "}
                BatchLeads handles the outreach automation.
              </li>
              <li>
                <strong>Seller responds with an address.</strong> Now you have a
                real deal.
              </li>
              <li>
                <strong>Underwrite in TrueCap.</strong> Paste the address; review
                the editable HUD rent and FRED rate benchmarks, enter local
                property tax, then run cap rate / DSCR / cash flow.
              </li>
              <li>
                <strong>Verify, then record your decision.</strong> Use
                TrueCap&apos;s Offer Ceiling (in your first free decision) to find the highest price that
                still meets your targets.
              </li>
            </ol>
            <p>
              Need to triage a list before you start dialling? Work out your
              maximum bid on a distressed lead with the free{" "}
              <Link
                href="/tools/70-percent-rule-calculator"
                className="tc-link"
              >
                70% rule calculator
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

        <ComparisonFaq competitorName="BatchLeads" items={BATCHLEADS_FAQ} />

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
            <RelatedContent kind="vs" slug="batchleads" />
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
                    href="/vs/dealmachine"
                    className={VS_LINK_ROW}
                  >
                    TrueCap vs DealMachine
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

const BATCHLEADS_FAQ: FaqItem[] = [
  {
    question: "Is TrueCap a BatchLeads alternative?",
    answer: (
      <>
        No — they solve different problems. BatchLeads finds motivated-seller
        leads and gives you owner contact info. TrueCap underwrites the property
        once you have the address. Most active off-market buyers use both.
      </>
    ),
  },
  {
    question: "BatchLeads vs PropStream — which one?",
    answer: (
      <>
        BatchLeads is generally cheaper and stronger on stacked filters (overlay
        multiple list types). PropStream has deeper public-records data and a
        more mature ecosystem. Wholesalers running tight mail margins lean
        BatchLeads; data-heavy operators lean PropStream. Some run both.
      </>
    ),
  },
  {
    question: "Does BatchLeads underwrite deals?",
    answer: (
      <>
        No — BatchLeads gives you leads and contact data. It doesn&apos;t
        calculate cap rate, DSCR, or cash flow. Use TrueCap, DealCheck, or a
        spreadsheet for the underwriting layer.
      </>
    ),
  },
  {
    question:
      "How does TrueCap's address auto-fill compare to BatchLeads' property data?",
    answer: (
      <>
        Different scope. BatchLeads has 150M+ properties with motivated-seller
        indicators (probate, foreclosure status, vacancy, tax delinquency,
        etc.). TrueCap provides editable HUD rent and FRED owner-occupied rate
        benchmarks while keeping property tax as a manual local input. The two
        products serve different, potentially complementary jobs.
      </>
    ),
  },
  {
    question: "Can I use BatchLeads + TrueCap together?",
    answer: (
      <>
        Yes — BatchLeads surfaces off-market leads, and TrueCap screens the
        assumptions you enter. The Deal score helps you triage the list, and
        the Offer Ceiling shows the highest price that still meets your
        targets.
      </>
    ),
  },
];

