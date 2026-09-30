/**
 * /vs/propstream — competitor comparison landing page.
 *
 * Target queries: "propstream alternative", "propstream vs", "propstream pricing", "propstream review", "cheaper than propstream".
 * PropStream is a real-estate lead-generation + property data platform — skip-tracing, list-pulling, motivated-seller filters. Investors searching 'propstream alternative' are usually looking for a cheaper way to find off-market leads OR realize they need underwriting too.
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
  title: "PropStream vs TrueCap (2026): Find vs Underwrite",
  description:
    "PropStream finds properties. TrueCap models their cash flow from the assumptions you review. An honest side-by-side of where each fits.",
  keywords: [
    "propstream alternative",
    "propstream vs",
    "propstream pricing",
    "propstream review",
    "cheaper than propstream",
  ],
  alternates: { canonical: "/vs/propstream" },
  openGraph: {
    title: "PropStream vs TrueCap (2026): Find vs Underwrite",
    description:
      "PropStream finds leads. TrueCap underwrites them. Different jobs in the same workflow — most investors use both.",
    url: "/vs/propstream",
    type: "website",
    images: [
      {
        url: "/home.jpg",
        width: 1200,
        height: 630,
        alt: "TrueCap vs PropStream",
      },
    ],
  },
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
};

type Verdict = "truecap" | "propstream" | "tie";
type Row = {
  feature: string;
  truecap: string;
  propstream: string;
  winner: Verdict;
};

const MATRIX: Row[] = [
  {
    feature: "Lifecycle stage",
    truecap: "Underwriting — does this deal pencil?",
    propstream: "Lead generation — find motivated sellers",
    winner: "tie",
  },
  {
    feature: "Cap rate / CoC / DSCR analysis",
    truecap: "Yes — full engine, free tier",
    propstream: "Not modeled",
    winner: "truecap",
  },
  {
    feature: "10-year projection",
    truecap: "Pro — rent + expense + appreciation",
    propstream: "Not modeled",
    winner: "truecap",
  },
  {
    feature: "Deal score (0–100)",
    truecap: "Free — 0–100 score with factor breakdown",
    propstream: "Not applicable",
    winner: "truecap",
  },
  {
    feature: "Starting values (rent/rate/tax)",
    truecap: "HUD rent + FRED rate + manual local property tax",
    propstream: "Property data only — no underwriting",
    winner: "truecap",
  },
  {
    feature: "Skip tracing",
    truecap: "No",
    propstream: "Yes — owner phone + email lookup",
    winner: "propstream",
  },
  {
    feature: "Motivated-seller lists",
    truecap: "No",
    propstream: "Yes — pre-foreclosure, probate, vacant, tax delinquent",
    winner: "propstream",
  },
  {
    feature: "Public records data",
    truecap: "Limited (HUD FMR + FRED)",
    propstream: "Yes — 150M+ properties",
    winner: "propstream",
  },
  {
    feature: "List builder / direct mail integration",
    truecap: "No",
    propstream: "Yes — full marketing stack",
    winner: "propstream",
  },
  {
    feature: "Mobile-first UX",
    truecap: "Yes — PWA installable",
    propstream: "Mobile app exists",
    winner: "tie",
  },
  {
    feature: "Pricing (entry tier)",
    truecap: "Free core; paid Pro — see live pricing",
    propstream: "~$99/mo (as of 2026), no real free tier",
    winner: "truecap",
  },
  {
    feature: "Free tier",
    truecap: "Yes — core cap rate, CoC, DSCR, and cash flow",
    propstream: "No — paid only",
    winner: "truecap",
  },
  {
    feature: "Shareable read-only deal link",
    truecap: "Free — read-only public link; Pro adds co-branding",
    propstream: "Internal-only data",
    winner: "truecap",
  },
  {
    feature: "PDF deal report",
    truecap: "Included with Pro",
    propstream: "Not the use case",
    winner: "truecap",
  },
];

export default function VsPropstreamPage() {
  const siteUrl = getSiteUrl();
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "PropStream vs TrueCap (2026): Find vs Underwrite",
    url: `${siteUrl}/vs/propstream`,
    description:
      "PropStream finds properties. TrueCap models their cash flow from the assumptions you review. An honest side-by-side of where each fits.",
    dateModified: lastmodFor("/vs/propstream"),
    publisher: { "@id": `${siteUrl}/#organization` },
  };

  return (
    // relative + overflow-x-clip, as on the homepage and the /vs hub: no
    // descendant can make the phone page scroll sideways.
    <div className="relative overflow-x-clip">
      <Header initialUser={null} initialEntitlements={null} />
      <JsonLd data={structuredData} />
      <VsBreadcrumbSchema
        vsPath="/vs/propstream"
        pageName="TrueCap vs PropStream"
      />
      <main id="main" tabIndex={-1} className="min-w-0 outline-none">
        <VsHero>
          <h1 className={VS_H1}>
            TrueCap vs PropStream:{" "}
            find the leads vs underwrite the deals
          </h1>
          <BlogByline />
          <p className={VS_LEDE}>
            PropStream is the heavyweight in real-estate lead generation — skip
            tracing, list-pulling, motivated-seller filters across 150M+
            properties. TrueCap underwrites the user-reviewed assumptions for an
            individual lead. Different jobs: PropStream sources; TrueCap models
            the economics.
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
                  You&apos;ve found a property and need to know if it cash
                  flows.
                </li>
                <li>
                  You want a defensible analysis to send to a lender or partner.
                </li>
                <li>
                  You don&apos;t need to source leads — you have a deal in hand.
                </li>
                <li>You want a free tier that covers real underwriting.</li>
              </ul>
            </div>
            <div className="min-w-0">
              <h3 className={VS_TLDR_LABEL}>
                Use PropStream when
              </h3>
              <ul className={VS_TLDR_LIST}>
                <li>You source off-market deals as part of your strategy.</li>
                <li>
                  You need motivated-seller lists (pre-foreclosure, probate,
                  vacant).
                </li>
                <li>You want owner phone / email for direct outreach.</li>
                <li>
                  You&apos;re spending real money on direct mail or cold call
                  campaigns.
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
              head={["Feature", "TrueCap", "PropStream"]}
              rows={MATRIX.map((row) => ({
                label: row.feature,
                truecap: row.truecap,
                competitor: row.propstream,
                winner: row.winner === "propstream" ? "competitor" : row.winner,
              }))}
            />
          </ScrollX>
          <p className={VS_SOURCES}>
            PropStream details based on publicly available product info as of
            2026. See{" "}
            <a
              href="https://propstream.com"
              target="_blank"
              rel="noopener"
              className="tc-link"
            >
              propstream.com
            </a>{" "}
            for their current state.
          </p>
        </Section>

        {/* Complementary workflow */}
        <Section aria-labelledby="vs-fit-heading">
          <SectionHeading id="vs-fit-heading">
            How most investors use both
          </SectionHeading>
          <div className={VS_PROSE}>
            <ol>
              <li>
                <strong>Source the deal in PropStream.</strong> Build
                motivated-seller lists; skip-trace; pull contact info; send mail
                or text.
              </li>
              <li>
                <strong>Get a callback / motivated seller responds.</strong> Now
                you have an address.
              </li>
              <li>
                <strong>Underwrite in TrueCap.</strong> Paste the address. HUD
                area rent and the FRED owner-occupied rate can pre-fill as
                editable benchmarks; enter property tax from a local bill or
                reviewed rate. Run the analysis and review the Offer Ceiling under
                your targets.
              </li>
              <li>
                <strong>Verify, then record your decision.</strong> TrueCap&apos;s
                Offer Ceiling (in your first free decision) works backward from your targets: the highest
                price that still meets them.
              </li>
              <li>
                <strong>
                  Close, save the deal, track actuals in your accounting tool.
                </strong>{" "}
                TrueCap doesn&apos;t do operations — pair with Stessa or your
                bookkeeping system.
              </li>
            </ol>
            <p>
              Just want the underwriting half? The free{" "}
              <IntentPrefetchLink
                href="/tools/1-percent-rule-calculator"
                className="tc-link"
              >
                1% rule calculator
              </IntentPrefetchLink>{" "}
              screens a list of skip-traced addresses down to the handful worth
              modeling, and our guide to{" "}
              <IntentPrefetchLink
                href="/blog/how-to-underwrite-a-rental-property-in-60-seconds"
                className="tc-link"
              >
                60-second underwriting
              </IntentPrefetchLink>{" "}
              shows what happens next. When one survives the screen, the full{" "}
              <Link
                href="/analyze" prefetch={false}
                className="tc-link"
              >
                TrueCap analyzer
              </Link>{" "}
              prices it — cap rate, DSCR, cash flow — from the address alone.
            </p>
          </div>
        </Section>

        <ComparisonFaq competitorName="PropStream" items={PROPSTREAM_FAQ} />

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
            <RelatedContent kind="vs" slug="propstream" />
            <AuthorBio />

            <footer className="mt-10 border-t border-border pt-6">
              <p className="text-lg font-semibold">Other comparisons:</p>
              <ul className="mt-2 grid gap-x-8 sm:grid-cols-2">
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
                    href="/vs/stessa"
                    className={VS_LINK_ROW}
                  >
                    TrueCap vs Stessa
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

const PROPSTREAM_FAQ: FaqItem[] = [
  {
    question: "Is TrueCap a PropStream alternative?",
    answer: (
      <>
        Not really — they solve different problems. PropStream finds
        motivated-seller leads with skip-tracing and public-records data.
        TrueCap underwrites a specific property once you have an address. Most
        serious investors use both: PropStream to source, TrueCap to underwrite.
      </>
    ),
  },
  {
    question: "Can TrueCap do skip tracing or pull property lists?",
    answer: (
      <>
        No. TrueCap focuses on per-deal underwriting and uses HUD area rent and
        the FRED owner-occupied 30-year rate as editable benchmarks; property
        tax is a manual local input. For lead generation, list pulls, and owner
        contact info, PropStream or DealMachine are the right tools.
      </>
    ),
  },
  {
    question: "Is PropStream worth $99/month?",
    answer: (
      <>
        It depends on volume. If you send direct mail to 1,000+ addresses a
        month or run a wholesaling operation, the lists and skip-tracing pay for
        themselves quickly. If you&apos;re a buy-and-hold investor who buys 1-3
        properties a year through MLS or your network, PropStream is overkill —
        the data you need (rent, tax, property details) is already in TrueCap or
        your MLS access.
      </>
    ),
  },
  {
    question: "Does TrueCap have a free tier? PropStream doesn't.",
    answer: (
      <>
        Yes — TrueCap&apos;s free, no-account screen covers cap rate,
        cash-on-cash, DSCR, cash flow, and labeled address starting assumptions.
        No card is required. Complete-decision allowances and Pro terms are
        shown on TrueCap&apos;s live pricing page. PropStream is paid-only
        beyond its current trial terms.
      </>
    ),
  },
  {
    question: "What's the best PropStream alternative for finding deals?",
    answer: (
      <>
        If you specifically want lead generation, look at DealMachine
        (mobile-first driving for dollars), BatchLeads (similar volume to
        PropStream, sometimes cheaper), or Reonomy (commercial-leaning). TrueCap
        isn&apos;t in that category — we&apos;re the underwriting layer
        you&apos;d use after any of those finds you a property.
      </>
    ),
  },
];

