/**
 * /vs/turbotenant — competitor comparison landing page.
 *
 * Target queries: "turbotenant alternative", "turbotenant vs", "turbotenant review", "turbotenant pricing", "free landlord software".
 * TurboTenant is landlord operations software: listing, screening, leases, rent collection.
 * Competitor cells were checked in October 2026 against turbotenant.com/pricing (plan grid,
 * renter fees and the yearly price table behind "Starting at"), its listing-sites help
 * article, its tenant-screening and rent-collection pages and its calculator pages.
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
  },
  twitter: { card: "summary_large_image" },
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
    turbotenant:
      "A free web calculator for cap rate, cash-on-cash, NOI and cash flow, outside the management plans",
    winner: "tie",
  },
  {
    feature: "10-year projection",
    truecap: "Pro — rent + expense + appreciation",
    turbotenant: "Not on TurboTenant's plan comparison",
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
    turbotenant: "Not on TurboTenant's plan comparison",
    winner: "truecap",
  },
  {
    feature: "Rental listing distribution",
    truecap: "No",
    turbotenant:
      "Yes, on every plan: Realtor.com, Redfin, Rent.com, Zumper and others",
    winner: "turbotenant",
  },
  {
    feature: "Online rental application",
    truecap: "No",
    turbotenant:
      "Yes, on every plan; custom screening questions on Pro",
    winner: "turbotenant",
  },
  {
    feature: "Tenant screening",
    truecap: "No",
    turbotenant:
      "Yes, on every plan: a TransUnion credit report with criminal and eviction checks",
    winner: "turbotenant",
  },
  {
    feature: "Online lease signing",
    truecap: "No",
    turbotenant:
      "State-specific leases and e-signatures on Essentials and Pro; not on the Free plan",
    winner: "turbotenant",
  },
  {
    feature: "Online rent collection",
    truecap: "No",
    turbotenant:
      "Yes, on every plan: a $2 renter-paid ACH fee, waived on Pro; cards 3.49%",
    winner: "turbotenant",
  },
  {
    feature: "Maintenance request workflow",
    truecap: "No",
    turbotenant: "Yes, maintenance requests on every plan",
    winner: "turbotenant",
  },
  {
    feature: "Free tier",
    truecap: "Yes — core cap rate, CoC, DSCR, and cash flow",
    turbotenant:
      "Yes: listings, applications, screening, online rent payments and maintenance requests",
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
    turbotenant:
      "A payments dashboard and lead tracking; the Insights dashboard is on Pro",
    winner: "tie",
  },
  {
    feature: "Pricing (paid tier)",
    truecap: "Paid Pro; see live pricing for current rates and limits",
    turbotenant:
      "Essentials from $149 a year and Pro from $199 a year for up to 10 units; higher bands for larger portfolios (as of October 2026)",
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
                <li>You want cap rate, DSCR, cash flow, 10-year projection.</li>
                <li>
                  You want modeled economics and a Deal score, with Buy Box
                  fit on your first decision and then with Pro.
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
                  You want online rent collection + maintenance request
                  tracking.
                </li>
                <li>
                  You need state-specific leases with e-signature (Essentials
                  and Pro).
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
            TurboTenant details checked in October 2026 against{" "}
            <a
              href="https://www.turbotenant.com/pricing/"
              target="_blank"
              rel="noopener"
              className="tc-link"
            >
              TurboTenant&apos;s pricing page
            </a>
            , including the yearly price table behind its &quot;Starting
            at&quot; link, and its{" "}
            <a
              href="https://support.turbotenant.com/en/articles/4004016"
              target="_blank"
              rel="noopener"
              className="tc-link"
            >
              list of listing sites
            </a>
            . See TurboTenant for current plans.
          </p>
        </Section>

        {/* Complementary workflow */}
        <Section aria-labelledby="vs-fit-heading">
          <SectionHeading id="vs-fit-heading">
            How TrueCap and TurboTenant fit together
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
                unit, accept applications, screen tenants with a TransUnion
                credit report, and sign a state-specific lease online
                (Essentials and Pro).
              </li>
              <li>
                <strong>Operate in TurboTenant.</strong> Collect rent online
                (renters pay a $2 ACH fee unless you are on Pro), handle
                maintenance requests, track payment history.
              </li>
              <li>
                <strong>Annual review in TrueCap.</strong> Revisit the saved
                analysis to compare actuals vs the original underwrite. Apply that
                learning to the next acquisition.
              </li>
            </ol>
            <p>
              Screening the deal before the tenant? The free{" "}
              <IntentPrefetchLink
                href="/tools/1-percent-rule-calculator"
                className="tc-link"
              >
                1% rule calculator
              </IntentPrefetchLink>{" "}
              gives you a pass/fail read in seconds, and the full{" "}
              <Link
                href="/analyze" prefetch={false}
                className="tc-link"
              >
                TrueCap analyzer
              </Link>{" "}
              runs the complete underwrite described in step two. Our guide on{" "}
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
          competitorName="TurboTenant"
          items={TURBOTENANT_FAQ}
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
            <RelatedContent kind="vs" slug="turbotenant" />
            <AuthorBio />

            <footer className="mt-10 border-t border-border pt-6">
              <p className="text-lg font-semibold">Other comparisons:</p>
              <ul className="mt-2 grid gap-x-8 sm:grid-cols-2">
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
                <li>
                  <IntentPrefetchLink
                    href="/vs/stessa"
                    className={VS_LINK_ROW}
                  >
                    TrueCap vs Stessa
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

const TURBOTENANT_FAQ: FaqItem[] = [
  {
    question: "Is TrueCap a TurboTenant alternative?",
    answer: (
      <>
        No — different stages. TurboTenant operates rentals you own (listing,
        screening, leases, rent collection). TrueCap underwrites rentals
        you&apos;re considering buying (cap rate, CoC, DSCR, cash flow,
        projection). The two fit one after the other: TrueCap before you buy,
        TurboTenant once you own.
      </>
    ),
  },
  {
    question: "Is TurboTenant really free?",
    answer: (
      <>
        Yes. TurboTenant&apos;s Free plan covers listings, applications,
        tenant screening, online rent payments and maintenance requests.
        The applicant pays the screening fee unless you choose to cover it,
        and on rent payments renters pay a $2 ACH fee or 3.49% by card. Lease
        agreements and e-signatures start on Essentials
        (from $149 a year for up to 10 units); waived ACH fees and accounting
        tools are on Pro (from $199 a year for up to 10 units). Prices as of
        October 2026.
      </>
    ),
  },
  {
    question: "Does TrueCap have rent collection or tenant screening?",
    answer: (
      <>
        No, and we&apos;re not planning to. Rent collection is a regulated
        payments product (NACHA rules, late-fee automation) and tenant screening
        is FCRA-regulated. We don&apos;t build there. TurboTenant and RentRedi
        both offer those workflows.
      </>
    ),
  },
  {
    question: "Is TurboTenant or Avail better?",
    answer: (
      <>
        We don&apos;t rank them. Compare the plan tables on each
        vendor&apos;s pricing page for the features you need, such as leases,
        rent collection fees and listing sites. TrueCap comes before either
        one: it models the purchase.
      </>
    ),
  },
  {
    question: "Can I afford TrueCap + TurboTenant?",
    answer: (
      <>
        The free tiers can cover portions of underwriting and operations. If you
        need TrueCap Pro or a paid TurboTenant plan (Essentials or Pro), compare
        both live pricing pages and add the current rates for the units and
        features you actually need.
      </>
    ),
  },
];

