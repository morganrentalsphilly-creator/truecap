/**
 * /vs/cozy — competitor comparison landing page.
 *
 * Target queries: "cozy alternative", "cozy.co alternative", "cozy replacement", "what replaced cozy", "free landlord platform like cozy".
 * Cozy.co was property management software for landlords (listings, screening,
 * rent collection). CoStar Group, the owner of Apartments.com, bought it in
 * November 2018 and Cozy moved to Apartments.com in mid-2021. The page is kept
 * as an explainer of what replaced Cozy: every Cozy cell is what Cozy's own
 * archived site said, and no row picks a side, because Cozy is no longer
 * offered. Sources (rendered 2026-10-02) are linked under the table.
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
  title: "Cozy.co Alternatives (2026): What Replaced It",
  description:
    "Cozy.co moved to Apartments.com in mid-2021. Here's what TrueCap does (and doesn't), plus which tools cover each part of the Cozy workflow today.",
  keywords: [
    "cozy alternative",
    "cozy.co alternative",
    "cozy replacement",
    "what replaced cozy",
    "free landlord platform like cozy",
  ],
  alternates: { canonical: "/vs/cozy" },
  openGraph: {
    title: "Cozy.co Alternatives (2026): What Replaced It",
    description:
      "Cozy.co moved to Apartments.com in mid-2021. TrueCap underwrites deals; here's what covers Cozy's other features today.",
    url: "/vs/cozy",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

type Verdict = "truecap" | "cozy" | "tie";
type Row = { feature: string; truecap: string; cozy: string; winner: Verdict };

// Every Cozy cell restates Cozy's own site as the Internet Archive saved it
// (the features page, May 2020; the tenant screening page, September 2020; the
// homepage, June and August 2021). Every winner is a tie: Cozy is no longer
// offered, so no row picks a side.
const MATRIX: Row[] = [
  {
    feature: "Status",
    truecap: "Active",
    cozy: "Moved to Apartments.com in mid-2021",
    winner: "tie",
  },
  {
    feature: "Lifecycle stage",
    truecap: "Pre-purchase — underwrite the deal",
    cozy: "Was property management software for rentals you own",
    winner: "tie",
  },
  {
    feature: "Cap rate / CoC / DSCR analysis",
    truecap: "Yes — full engine, free tier",
    cozy: "Not on the feature list Cozy published",
    winner: "tie",
  },
  {
    feature: "10-year projection",
    truecap: "Pro — rent + expense + appreciation",
    cozy: "Not on the feature list Cozy published",
    winner: "tie",
  },
  {
    feature: "Starting values (rent/rate/tax)",
    truecap: "HUD rent + FRED rate + manual local property tax",
    cozy: "Offered rent estimates for pricing a listing",
    winner: "tie",
  },
  {
    feature: "Rental listing distribution",
    truecap: "No",
    cozy: "Listings were syndicated to Doorsteps.com and Realtor.com",
    winner: "tie",
  },
  {
    feature: "Online rental application",
    truecap: "No",
    cozy: "Each listing had a built-in rental application",
    winner: "tie",
  },
  {
    feature: "Online rent collection",
    truecap: "No",
    cozy: "Was free for landlords; tenants paid free from a checking account",
    winner: "tie",
  },
  {
    feature: "Tenant screening",
    truecap: "No",
    cozy: "Credit reports from Experian; background checks via Checkr",
    winner: "tie",
  },
  {
    feature: "Free tier",
    truecap: "Yes — core cap rate, CoC, DSCR, and cash flow",
    cozy: "Core features were free for landlords",
    winner: "tie",
  },
  {
    feature: "Pricing",
    truecap: "Free core; paid Pro — see live pricing",
    cozy: "No subscription; applicants paid for their screening reports",
    winner: "tie",
  },
];

export default function VsCozyPage() {
  const siteUrl = getSiteUrl();
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Cozy.co Alternatives (2026): What Replaced It",
    url: `${siteUrl}/vs/cozy`,
    description:
      "Cozy.co moved to Apartments.com in mid-2021. Here's what TrueCap does (and doesn't), plus which tools cover each part of the Cozy workflow today.",
    dateModified: lastmodFor("/vs/cozy"),
    publisher: { "@id": `${siteUrl}/#organization` },
  };

  return (
    // relative + overflow-x-clip, as on the homepage and the /vs hub: no
    // descendant can make the phone page scroll sideways.
    <div className="relative overflow-x-clip">
      <Header initialUser={null} initialEntitlements={null} />
      <JsonLd data={structuredData} />
      <VsBreadcrumbSchema vsPath="/vs/cozy" pageName="TrueCap vs Cozy" />
      <main id="main" tabIndex={-1} className="min-w-0 outline-none">
        <VsHero>
          <h1 className={VS_H1}>
            TrueCap vs Cozy:{" "}
            Cozy moved to Apartments.com. Here&apos;s what replaced it.
          </h1>
          <BlogByline />
          <p className={VS_LEDE}>
            Cozy.co was property management software whose core features were
            free for landlords: listings, tenant screening and online rent
            collection. CoStar Group, the owner of Apartments.com, bought Cozy
            in 2018, and Cozy moved to Apartments.com in mid-2021. Cozy&apos;s
            own answer to what replaced it was Apartments.com&apos;s rental
            tools. TrueCap does a different job: it underwrites a property
            before you buy it. For listings, screening and rent collection,
            compare Apartments.com with TurboTenant, Avail or RentRedi.
            Here&apos;s the breakdown.
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
                <li>
                  You&apos;re evaluating a property before making an offer.
                </li>
                <li>You want cap rate, DSCR, cash flow, projection.</li>
                <li>You want a free tier that doesn&apos;t cap analyses.</li>
              </ul>
            </div>
            <div className="min-w-0">
              <h3 className={VS_TLDR_LABEL}>
                To replace what Cozy did
              </h3>
              <ul className={VS_TLDR_LIST}>
                <li>
                  For listings, applications and rent collection (Cozy&apos;s
                  old core): Apartments.com, where Cozy moved, or TurboTenant,
                  Avail or RentRedi.
                </li>
                <li>
                  For accounting + Schedule E: Stessa, Baselane, or Landlord
                  Studio.
                </li>
                <li>For tenant screening only: RentSpree.</li>
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
            What Cozy offered, from its own site before it moved, beside what
            TrueCap does. No row picks a side: Cozy is no longer offered.
          </p>
          <ScrollX label="Comparison table" className="mt-8 max-w-5xl">
            <VsMatrixTable
              head={["Feature", "TrueCap", "Cozy"]}
              rows={MATRIX.map((row) => ({
                label: row.feature,
                truecap: row.truecap,
                competitor: row.cozy,
                winner: row.winner === "cozy" ? "competitor" : row.winner,
              }))}
            />
          </ScrollX>
          <p className={VS_SOURCES}>
            Cozy details are from Cozy&apos;s own site as the Internet Archive
            saved it: the{" "}
            <a
              href="https://web.archive.org/web/20200512055824/https://cozy.co/features-benefits/"
              target="_blank"
              rel="noopener"
              className="tc-link"
            >
              features page (May 2020)
            </a>
            , the{" "}
            <a
              href="https://web.archive.org/web/20200902061933/https://cozy.co/for-landlords/tenant-screening/"
              target="_blank"
              rel="noopener"
              className="tc-link"
            >
              tenant screening page (September 2020)
            </a>{" "}
            and the{" "}
            <a
              href="https://web.archive.org/web/20210811194249/https://cozy.co/"
              target="_blank"
              rel="noopener"
              className="tc-link"
            >
              homepage after the move (August 2021)
            </a>
            . The 2018 purchase is from{" "}
            <a
              href="https://www.prnewswire.com/news-releases/costar-group-acquires-cozy-services-ltd-with-plans-to-integrate-its-innovative-renter-screening-and-rent-payments-solutions-into-apartmentscom-300747156.html"
              target="_blank"
              rel="noopener"
              className="tc-link"
            >
              CoStar Group&apos;s announcement
            </a>
            .
          </p>
        </Section>

        {/* Complementary workflow */}
        <Section aria-labelledby="vs-fit-heading">
          <SectionHeading id="vs-fit-heading">
            Replacing Cozy in 2026
          </SectionHeading>
          <div className={VS_PROSE}>
            <ol>
              <li>
                <strong>Pre-purchase underwriting.</strong> TrueCap&apos;s free
                core screen covers editable cap rate, DSCR, and cash flow;
                10-year projections are a Pro feature.
              </li>
              <li>
                <strong>
                  Listings + applications + rent collection (Cozy&apos;s old
                  core).
                </strong>{" "}
                Apartments.com&apos;s Rental Manager is where Cozy moved.
                TurboTenant and Avail each publish a free plan with listings,
                screening and online rent collection; RentRedi publishes paid
                plans with unlimited units.
              </li>
              <li>
                <strong>Accounting + tax-time Schedule E.</strong> Stessa,
                Baselane, or Landlord Studio. Each publishes a free plan; check
                each pricing page for the plan that includes the Schedule E
                report.
              </li>
              <li>
                <strong>Tenant screening only.</strong> RentSpree (a $0 Basic
                plan; screening is priced per report, and you choose whether
                the applicant pays) or the screening built into TurboTenant or
                Avail.
              </li>
            </ol>
            <p>
              Only need the underwriting piece? The free{" "}
              <IntentPrefetchLink
                href="/tools/break-even-calculator"
                className="tc-link"
              >
                break-even calculator
              </IntentPrefetchLink>{" "}
              tells you how long a property takes to return your cash, and the
              full{" "}
              <Link
                href="/analyze" prefetch={false}
                className="tc-link"
              >
                TrueCap analyzer
              </Link>{" "}
              turns an address into cap rate,{" "}
              <IntentPrefetchLink
                href="/glossary/cash-on-cash-return"
                className="tc-link"
              >
                cash-on-cash return
              </IntentPrefetchLink>
              , and DSCR. All of that is free, as Cozy&apos;s core features
              were. Our guide on{" "}
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

        <ComparisonFaq competitorName="Cozy" items={COZY_FAQ} retired />

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
            <RelatedContent kind="vs" slug="cozy" />
            <AuthorBio />

            <footer className="mt-10 border-t border-border pt-6">
              <p className="text-lg font-semibold">Other comparisons:</p>
              <ul className="mt-2 grid gap-x-8 sm:grid-cols-2">
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
                <li>
                  <IntentPrefetchLink
                    href="/vs/rentredi"
                    className={VS_LINK_ROW}
                  >
                    TrueCap vs RentRedi
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

const COZY_FAQ: FaqItem[] = [
  {
    question: "What happened to Cozy.co?",
    answer: (
      <>
        CoStar Group, the owner of Apartments.com, bought Cozy in 2018. Cozy
        moved to Apartments.com in mid-2021: by August 2021 its homepage said
        Cozy had moved to Apartments.com, that most Cozy accounts had moved
        with it, and that rentals on accounts that were not moved could no
        longer be managed on Cozy.
      </>
    ),
  },
  {
    question: "Is TrueCap a Cozy alternative?",
    answer: (
      <>
        Not for the work Cozy did. TrueCap calculates cap rate, DSCR and cash
        flow on a property you&apos;re considering buying. For Cozy&apos;s
        actual core (listings, applications, rent collection), look at
        Apartments.com, TurboTenant, Avail or RentRedi.
      </>
    ),
  },
  {
    question: "What's the best free Cozy alternative for rent collection?",
    answer: (
      <>
        TurboTenant and Avail publish free operational features, while RentRedi
        publishes flat-rate paid plans for unlimited properties and units.
        Compare current rent collection, lease, listing, screening, support, and
        payment terms on each official pricing page before choosing a Cozy
        replacement.
      </>
    ),
  },
  {
    question: "Did Apartments.com replace Cozy?",
    answer: (
      <>
        Yes, by Cozy&apos;s own account. In August 2021 Cozy&apos;s homepage
        said it had moved to Apartments.com and listed the tools there:
        listings, renter applications with screening reports, leases, rent
        payments, and expense and maintenance tracking. See{" "}
        <a
          href="https://www.apartments.com/rental-manager/"
          target="_blank"
          rel="noopener"
          className="tc-link"
        >
          Apartments.com&apos;s Rental Manager
        </a>{" "}
        for what it offers today.
      </>
    ),
  },
  {
    question: "Can I use TrueCap + a Cozy replacement together?",
    answer: (
      <>
        Yes. TrueCap&apos;s free analyzer covers the underwriting before you
        buy. TurboTenant and Avail each publish a free plan with listings,
        screening and online rent collection, the work Cozy&apos;s free
        features did after you bought.
      </>
    ),
  },
];
