/**
 * /vs/cozy — competitor comparison landing page.
 *
 * Target queries: "cozy alternative", "cozy.co alternative", "cozy shut down replacement", "what replaced cozy", "free landlord platform like cozy".
 * Cozy.co was a popular landlord ops platform (rent collection, listings, applications). Acquired by Apartments.com in 2018, shut down + migrated users to Apartments.com in 2022. Still searched ~5k/mo by ex-users looking for alternatives.
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
  title: "Cozy.co Alternatives (2026): What Replaced It",
  description:
    "Cozy.co shut down in 2022. Here's what TrueCap does (and doesn't), plus which modern tools replace each part of the Cozy workflow.",
  keywords: [
    "cozy alternative",
    "cozy.co alternative",
    "cozy shut down replacement",
    "what replaced cozy",
    "free landlord platform like cozy",
  ],
  alternates: { canonical: "/vs/cozy" },
  openGraph: {
    title: "Cozy.co Alternatives (2026): What Replaced It",
    description:
      "Cozy.co shut down in 2022. TrueCap underwrites deals; here's what replaces Cozy's other features.",
    url: "/vs/cozy",
    type: "website",
    images: [
      { url: "/home.jpg", width: 1200, height: 630, alt: "TrueCap vs Cozy" },
    ],
  },
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
};

type Verdict = "truecap" | "cozy" | "tie";
type Row = { feature: string; truecap: string; cozy: string; winner: Verdict };

const MATRIX: Row[] = [
  {
    feature: "Status",
    truecap: "Active",
    cozy: "Shut down June 2022",
    winner: "truecap",
  },
  {
    feature: "Lifecycle stage",
    truecap: "Pre-purchase — underwrite the deal",
    cozy: "Was post-purchase landlord ops",
    winner: "tie",
  },
  {
    feature: "Cap rate / CoC / DSCR analysis",
    truecap: "Yes — full engine, free tier",
    cozy: "Not modeled (was ops only)",
    winner: "truecap",
  },
  {
    feature: "10-year projection",
    truecap: "Pro — rent + expense + appreciation",
    cozy: "Not modeled",
    winner: "truecap",
  },
  {
    feature: "Starting values (rent/rate/tax)",
    truecap: "HUD rent + FRED rate + manual local property tax",
    cozy: "Not applicable",
    winner: "truecap",
  },
  {
    feature: "Rental listing distribution",
    truecap: "No",
    cozy: "Was syndicated to Apartments.com etc.",
    winner: "cozy",
  },
  {
    feature: "Online rental application",
    truecap: "No",
    cozy: "Was customizable",
    winner: "cozy",
  },
  {
    feature: "Online rent collection",
    truecap: "No",
    cozy: "Was ACH free",
    winner: "cozy",
  },
  {
    feature: "Tenant screening",
    truecap: "No",
    cozy: "Was TransUnion-backed",
    winner: "cozy",
  },
  {
    feature: "Free tier",
    truecap: "Yes — core cap rate, CoC, DSCR, and cash flow",
    cozy: "Was free",
    winner: "tie",
  },
  {
    feature: "Pricing",
    truecap: "Free core; paid Pro — see live pricing",
    cozy: "Was free (shut down)",
    winner: "truecap",
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
      "Cozy.co shut down in 2022. Here's what TrueCap does (and doesn't), plus which modern tools replace each part of the Cozy workflow.",
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
            Cozy shut down. Here&apos;s what replaces it.
          </h1>
          <BlogByline />
          <p className={VS_LEDE}>
            Cozy.co was a free landlord ops platform — listings, online
            applications, rent collection — until Apartments.com acquired and
            shut it down in 2022. If you landed here looking for an alternative,
            the honest answer is: no single tool replaced it. TrueCap covers
            pre-purchase underwriting (a Cozy didn&apos;t do that), and
            you&apos;d pair it with TurboTenant, Avail, or RentRedi for the
            operations Cozy used to handle. Here&apos;s the breakdown.
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
                  You&apos;re evaluating a property before making an offer (Cozy
                  didn&apos;t do this).
                </li>
                <li>You want cap rate, DSCR, cash flow, projection.</li>
                <li>You want a free tier that doesn&apos;t cap analyses.</li>
              </ul>
            </div>
            <div className="min-w-0">
              <h3 className={VS_TLDR_LABEL}>
                Use Cozy when
              </h3>
              <ul className={VS_TLDR_LIST}>
                <li>
                  For listings + applications + rent collection (Cozy&apos;s old
                  core): TurboTenant, Avail, or RentRedi.
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
            Side-by-side on every dimension that matters for a
            comparison-shopping investor.
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
            Cozy details based on publicly available product info as of 2026.
            See{" "}
            <a
              href="https://cozy.co"
              target="_blank"
              rel="noopener"
              className="tc-link"
            >
              cozy.co
            </a>{" "}
            for their current state.
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
                released projections appear only when your evaluation or plan
                access includes them.
              </li>
              <li>
                <strong>
                  Listings + applications + rent collection (Cozy&apos;s old
                  core).
                </strong>{" "}
                TurboTenant (most Cozy-like free tier), Avail (Realtor.com-owned),
                or RentRedi.
              </li>
              <li>
                <strong>Accounting + tax-time Schedule E.</strong> Stessa,
                Baselane, or Landlord Studio. All have free or low-cost tiers.
              </li>
              <li>
                <strong>Tenant screening only.</strong> RentSpree (tenant pays,
                free for landlord) or any of the above bundled solutions.
              </li>
            </ol>
            <p>
              Only need the underwriting piece? The free{" "}
              <Link
                href="/tools/break-even-calculator"
                className="tc-link"
              >
                break-even calculator
              </Link>{" "}
              tells you how long a property takes to return your cash, and the
              full{" "}
              <Link
                href="/analyze" prefetch={false}
                className="tc-link"
              >
                TrueCap analyzer
              </Link>{" "}
              turns an address into cap rate,{" "}
              <Link
                href="/glossary/cash-on-cash-return"
                className="tc-link"
              >
                cash-on-cash return
              </Link>
              , and DSCR — all free, the way Cozy used to be. Our guide on{" "}
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

        <ComparisonFaq competitorName="Cozy" items={COZY_FAQ} />

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
            <RelatedContent kind="vs" slug="cozy" />
            <AuthorBio />

            <footer className="mt-10 border-t border-border pt-6">
              <p className="text-lg font-semibold">Other comparisons:</p>
              <ul className="mt-2 grid gap-x-8 sm:grid-cols-2">
                <li>
                  <Link
                    href="/vs/turbotenant"
                    className={VS_LINK_ROW}
                  >
                    TrueCap vs TurboTenant
                  </Link>
                </li>
                <li>
                  <Link
                    href="/vs/avail"
                    className={VS_LINK_ROW}
                  >
                    TrueCap vs Avail
                  </Link>
                </li>
                <li>
                  <Link
                    href="/vs/rentredi"
                    className={VS_LINK_ROW}
                  >
                    TrueCap vs RentRedi
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

const COZY_FAQ: FaqItem[] = [
  {
    question: "What happened to Cozy.co?",
    answer: (
      <>
        Cozy.co was acquired by Apartments.com (a CoStar Group property) in 2018
        and shut down in June 2022. Users were migrated to Apartments.com Rental
        Manager, which kept some of Cozy&apos;s core features (listings,
        applications, rent collection) under the Apartments.com brand. Many
        ex-Cozy users found the migration painful and went elsewhere.
      </>
    ),
  },
  {
    question: "Is TrueCap a Cozy alternative?",
    answer: (
      <>
        Only for the underwriting part — TrueCap calculates cap rate, DSCR, cash
        flow on a property you&apos;re considering buying. Cozy never did that.
        For Cozy&apos;s actual core (listings, applications, rent collection),
        you&apos;ll want TurboTenant, Avail, or RentRedi.
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
        Technically yes — Apartments.com Rental Manager kept the listings +
        applications + rent collection workflow. Many ex-Cozy users felt the
        rebrand was awkward and the UX worse. The free tier is more limited than
        Cozy&apos;s was. If you tried it and it didn&apos;t work, TurboTenant or
        Avail are typically the next stops.
      </>
    ),
  },
  {
    question: "Can I use TrueCap + a Cozy replacement together?",
    answer: (
      <>
        Yes — that&apos;s one possible stack. TrueCap (free) covers pre-purchase
        underwriting, while TurboTenant or Avail (free) covers post-purchase
        operations. Together they span much of Cozy&apos;s old free-tier
        coverage and add an underwriting layer.
      </>
    ),
  },
];

