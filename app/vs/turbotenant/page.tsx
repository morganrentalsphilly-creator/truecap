/**
 * /vs/turbotenant — competitor comparison landing page.
 *
 * Target queries: "turbotenant alternative", "turbotenant vs", "turbotenant review", "turbotenant pricing", "free landlord software".
 * TurboTenant is landlord ops — listing, screening, leases, rent collection. Direct competitor to Avail and RentRedi. Strong free tier, popular with small landlords.
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
  title: "TurboTenant vs TrueCap (2026): Manage vs Analyze",
  description:
    "TurboTenant runs rentals after closing. TrueCap shows Buy Box fit, an Offer Ceiling, and what to verify before you record your decision.",
  keywords: [
    "turbotenant alternative",
    "turbotenant vs",
    "turbotenant review",
    "turbotenant pricing",
    "free landlord software",
  ],
  alternates: { canonical: "/vs/turbotenant" },
  openGraph: {
    title: "TurboTenant vs TrueCap (2026): Manage vs Analyze",
    description:
      "TurboTenant runs your rentals after closing. TrueCap underwrites them before. Different lifecycle stages.",
    url: "/vs/turbotenant",
    type: "website",
    images: [
      {
        url: "/home.jpg",
        width: 1200,
        height: 630,
        alt: "TrueCap vs TurboTenant",
      },
    ],
  },
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
};

type Verdict = "truecap" | "turbotenant" | "tie";
type Row = {
  feature: string;
  truecap: string;
  turbotenant: string;
  winner: Verdict;
};

const MATRIX: Row[] = [
  {
    feature: "Lifecycle stage",
    truecap: "Pre-purchase — underwrite the deal",
    turbotenant: "Post-purchase — operate the property",
    winner: "tie",
  },
  {
    feature: "Cap rate / CoC / DSCR analysis",
    truecap: "Yes — full engine, free tier",
    turbotenant: "Not modeled",
    winner: "truecap",
  },
  {
    feature: "10-year projection",
    truecap: "Pro — rent + expense + appreciation",
    turbotenant: "Not modeled",
    winner: "truecap",
  },
  {
    feature: "Deal score (0–100)",
    truecap: "Free — 0–100 score with factor breakdown",
    turbotenant: "Not applicable",
    winner: "truecap",
  },
  {
    feature: "Sensitivity grid",
    truecap: "Pro — rent ±10%, vacancy ±5pp, rate ±1pp",
    turbotenant: "Not modeled",
    winner: "truecap",
  },
  {
    feature: "Rental listing distribution",
    truecap: "No",
    turbotenant: "Yes — syndicated to Zillow, Realtor, etc.",
    winner: "turbotenant",
  },
  {
    feature: "Online rental application",
    truecap: "No",
    turbotenant: "Yes — customizable forms",
    winner: "turbotenant",
  },
  {
    feature: "Tenant screening",
    truecap: "No",
    turbotenant: "Yes — TransUnion-backed",
    winner: "turbotenant",
  },
  {
    feature: "Online lease signing",
    truecap: "No",
    turbotenant: "Yes — state-specific templates",
    winner: "turbotenant",
  },
  {
    feature: "Online rent collection",
    truecap: "No",
    turbotenant: "Yes — ACH free, card fee",
    winner: "turbotenant",
  },
  {
    feature: "Maintenance request workflow",
    truecap: "No",
    turbotenant: "Yes — tenant portal",
    winner: "turbotenant",
  },
  {
    feature: "Free tier",
    truecap: "Yes — core cap rate, CoC, DSCR, and cash flow",
    turbotenant: "Yes — listings + lease + ACH rent collection",
    winner: "tie",
  },
  {
    feature: "Starting values (rent/rate/tax)",
    truecap: "HUD rent + FRED rate + manual local property tax",
    turbotenant: "Not applicable",
    winner: "truecap",
  },
  {
    feature: "Multi-property dashboard",
    truecap: "Yes — portfolio rollup of saved deals",
    turbotenant: "Yes — multi-unit ops dashboard",
    winner: "tie",
  },
  {
    feature: "Pricing (paid tier)",
    truecap: "Paid Pro; see live pricing for current rates and limits",
    turbotenant: "Premium ~$8-12/mo per unit (as of 2026)",
    winner: "tie",
  },
];

export default function VsTurbotenantPage() {
  const siteUrl = getSiteUrl();
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "TurboTenant vs TrueCap (2026): Manage vs Analyze",
    url: `${siteUrl}/vs/turbotenant`,
    description:
      "TurboTenant runs rentals after closing. TrueCap shows Buy Box fit, an Offer Ceiling, and what to verify before you record your decision.",
    dateModified: lastmodFor("/vs/turbotenant"),
    publisher: { "@id": `${siteUrl}/#organization` },
  };

  return (
    // relative + overflow-x-clip, as on the homepage and the /vs hub: no
    // descendant can make the phone page scroll sideways.
    <div className="relative overflow-x-clip">
      <Header initialUser={null} initialEntitlements={null} />
      <JsonLd data={structuredData} />
      <VsBreadcrumbSchema
        vsPath="/vs/turbotenant"
        pageName="TrueCap vs TurboTenant"
      />
      <main id="main" tabIndex={-1} className="min-w-0 outline-none">
        <VsHero>
          <h1 className={VS_H1}>
            TrueCap vs TurboTenant:{" "}
            underwrite the deal, then manage the tenant
          </h1>
          <BlogByline />
          <p className={VS_LEDE}>
            TurboTenant handles the landlord operations stack after you own the
            property — listing, screening, leases, rent collection, maintenance
            requests. TrueCap models a property&apos;s pre-purchase economics
            from the assumptions you review. They don&apos;t compete; they cover
            different halves of the rental lifecycle.
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
                  You&apos;re evaluating a property before making an offer.
                </li>
                <li>You want cap rate, DSCR, cash flow, 10-year projection.</li>
                <li>
                  You want modeled economics, Buy Box fit, and a Deal score.
                </li>
                <li>
                  You&apos;re comparing 2-3 deals side-by-side before deciding.
                </li>
              </ul>
            </div>
            <div className="min-w-0">
              <h3 className={VS_TLDR_LABEL}>
                Use TurboTenant when
              </h3>
              <ul className={VS_TLDR_LIST}>
                <li>
                  You already own a rental and need to list it for tenants.
                </li>
                <li>
                  You want online applications + tenant screening through
                  TransUnion.
                </li>
                <li>
                  You want online rent collection (ACH free) + maintenance
                  request tracking.
                </li>
                <li>
                  You need state-compliant lease templates with e-signature.
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
              head={["Feature", "TrueCap", "TurboTenant"]}
              rows={MATRIX.map((row) => ({
                label: row.feature,
                truecap: row.truecap,
                competitor: row.turbotenant,
                winner: row.winner === "turbotenant" ? "competitor" : row.winner,
              }))}
            />
          </ScrollX>
          <p className={VS_SOURCES}>
            TurboTenant details based on publicly available product info as of
            2026. See{" "}
            <a
              href="https://turbotenant.com"
              target="_blank"
              rel="noopener"
              className="tc-link"
            >
              turbotenant.com
            </a>{" "}
            for their current state.
          </p>
        </Section>

        {/* Complementary workflow */}
        <Section aria-labelledby="vs-fit-heading">
          <SectionHeading id="vs-fit-heading">
            How DIY landlords use both
          </SectionHeading>
          <div className={VS_PROSE}>
            <ol>
              <li>
                <strong>Source the deal.</strong> Zillow, MLS, wholesaler,
                off-market.
              </li>
              <li>
                <strong>Underwrite in TrueCap.</strong> Start with editable HUD
                rent and FRED rate benchmarks, then enter local property tax.
                Check cap rate, CoC, and DSCR. Sensitize the inputs. Save the
                deal.
              </li>
              <li>
                <strong>
                  Verify the material inputs and record your decision.
                </strong>{" "}
                If you proceed, the transaction and closing workflow happens
                outside TrueCap.
              </li>
              <li>
                <strong>Set up the property in TurboTenant.</strong> List the
                unit, accept applications, screen tenants with TransUnion, sign a
                state-specific lease online.
              </li>
              <li>
                <strong>Operate in TurboTenant.</strong> Collect rent via ACH
                (free), handle maintenance requests through the tenant portal,
                track payment history.
              </li>
              <li>
                <strong>Annual review in TrueCap.</strong> Revisit the saved
                analysis to compare actuals vs the original underwrite. Apply that
                learning to the next acquisition.
              </li>
            </ol>
            <p>
              Screening the deal before the tenant? The free{" "}
              <Link
                href="/tools/1-percent-rule-calculator"
                className="tc-link"
              >
                1% rule calculator
              </Link>{" "}
              gives you a pass/fail read in seconds, and the full{" "}
              <Link
                href="/analyze" prefetch={false}
                className="tc-link"
              >
                TrueCap analyzer
              </Link>{" "}
              runs the complete underwrite described in step two. Our guide on{" "}
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

        <ComparisonFaq competitorName="TurboTenant" items={TURBOTENANT_FAQ} />

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
            <RelatedContent kind="vs" slug="turbotenant" />
            <AuthorBio />

            <footer className="mt-10 border-t border-border pt-6">
              <p className="text-lg font-semibold">Other comparisons:</p>
              <ul className="mt-2 grid gap-x-8 sm:grid-cols-2">
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
                <li>
                  <Link
                    href="/vs/stessa"
                    className={VS_LINK_ROW}
                  >
                    TrueCap vs Stessa
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

const TURBOTENANT_FAQ: FaqItem[] = [
  {
    question: "Is TrueCap a TurboTenant alternative?",
    answer: (
      <>
        No — different stages. TurboTenant operates rentals you own (listing,
        screening, leases, rent collection). TrueCap underwrites rentals
        you&apos;re considering buying (cap rate, CoC, DSCR, cash flow,
        projection). Most DIY landlords end up using both.
      </>
    ),
  },
  {
    question: "Is TurboTenant really free?",
    answer: (
      <>
        TurboTenant&apos;s core landlord features (listings, applications, ACH
        rent collection, basic lease) are free. They monetize through premium
        add-ons (~$8-12/unit/month for advanced features like financial
        reporting, maintenance tracking, and faster ACH) and tenant-paid
        services (screening fees, card payment fees). For most small landlords,
        the free tier is usable.
      </>
    ),
  },
  {
    question: "Does TrueCap have rent collection or tenant screening?",
    answer: (
      <>
        No, and we&apos;re not planning to. Rent collection is a regulated
        payments product (NACHA rules, late-fee automation) and tenant screening
        is FCRA-regulated. We don&apos;t build there. TurboTenant, RentRedi, and
        Avail all specialize in those workflows.
      </>
    ),
  },
  {
    question: "Is TurboTenant or Avail better?",
    answer: (
      <>
        Close call. TurboTenant has a stronger free tier; Avail (acquired by
        Realtor.com) has slightly tighter listing distribution. Both are solid
        choices for small landlords. The decision usually comes down to feel of
        the UI — try the free tier of each. TrueCap is upstream of both
        regardless.
      </>
    ),
  },
  {
    question: "Can I afford TrueCap + TurboTenant?",
    answer: (
      <>
        The free tiers can cover portions of underwriting and operations. If you
        need TrueCap Pro or TurboTenant Premium, compare both live pricing pages
        and add the current rates for the units and features you actually need.
      </>
    ),
  },
];

