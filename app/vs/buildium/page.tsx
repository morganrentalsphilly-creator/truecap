/**
 * /vs/buildium — competitor comparison landing page.
 *
 * Target queries: "buildium alternative", "buildium vs", "buildium pricing", "buildium review", "property management software".
 * Buildium is post-purchase property-management software for landlords and
 * property managers. TrueCap covers pre-purchase underwriting.
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
  title: "Buildium vs TrueCap (2026): PM vs Deal Analysis",
  description:
    "Buildium manages rentals after purchase. TrueCap underwrites potential acquisitions before purchase. Compare the distinct workflows.",
  keywords: [
    "buildium alternative",
    "buildium vs",
    "buildium pricing",
    "buildium review",
    "property management software",
  ],
  alternates: { canonical: "/vs/buildium" },
  openGraph: {
    title: "Buildium vs TrueCap (2026): PM vs Deal Analysis",
    description:
      "Buildium manages rentals after purchase. TrueCap underwrites potential acquisitions before purchase.",
    url: "/vs/buildium",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

type Verdict = "truecap" | "buildium" | "tie";
type Row = {
  feature: string;
  truecap: string;
  buildium: string;
  winner: Verdict;
};

const MATRIX: Row[] = [
  {
    feature: "Primary audience",
    truecap: "Agents with investor clients, and buy-and-hold investors",
    buildium: "Landlords and professional property managers",
    winner: "tie",
  },
  {
    feature: "Lifecycle stage",
    truecap: "Pre-purchase — underwrite the deal",
    buildium: "Post-purchase — operate at scale",
    winner: "tie",
  },
  {
    feature: "Cap rate / CoC / DSCR analysis",
    truecap: "Yes — full engine, free tier",
    buildium: "No acquisition calculator listed in its plans",
    winner: "truecap",
  },
  {
    feature: "10-year projection",
    truecap: "Pro — rent + expense + appreciation",
    buildium: "No pre-purchase projection listed in its plans",
    winner: "truecap",
  },
  {
    feature: "Deal score (0–100)",
    truecap: "Free — 0–100 score with factor breakdown",
    buildium: "Not applicable",
    winner: "truecap",
  },
  {
    feature: "Starting values (rent/rate/tax)",
    truecap: "HUD rent + FRED rate + manual local property tax",
    buildium: "Not applicable",
    winner: "truecap",
  },
  {
    feature: "Tenant + lease management",
    truecap: "No",
    buildium: "Yes — portfolio operations",
    winner: "buildium",
  },
  {
    feature: "Property accounting + financial reports",
    truecap: "No",
    buildium:
      "Yes: property accounting, bank reconciliation and financial reports",
    winner: "buildium",
  },
  {
    feature: "Owner reports + portals",
    truecap: "No",
    buildium: "Yes: Owners Portal and standard reports on every plan",
    winner: "buildium",
  },
  {
    feature: "Maintenance vendor management",
    truecap: "No",
    buildium: "Yes: task and work order management on every plan",
    winner: "buildium",
  },
  {
    feature: "Free tier",
    truecap: "Yes — core cap rate, CoC, DSCR, and cash flow",
    buildium: "No permanent free tier; 14-day trial",
    winner: "truecap",
  },
  {
    feature: "Pricing (entry tier)",
    truecap: "Free core; paid Pro — see live pricing",
    buildium: "Paid Essential, Growth, and Premium tiers — see live pricing",
    winner: "truecap",
  },
  {
    feature: "Post-purchase portfolio operations",
    truecap: "No",
    buildium: "Yes — landlord and property-manager workflows",
    winner: "buildium",
  },
  {
    feature: "Shareable read-only deal link",
    truecap: "Free — read-only public link; Pro adds co-branding",
    buildium: "Owner and resident portals; no public deal link listed",
    winner: "truecap",
  },
];

export default function VsBuildiumPage() {
  const siteUrl = getSiteUrl();
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Buildium vs TrueCap (2026): PM vs Deal Analysis",
    url: `${siteUrl}/vs/buildium`,
    description:
      "Buildium manages rentals after purchase. TrueCap underwrites potential acquisitions before purchase.",
    dateModified: lastmodFor("/vs/buildium"),
    publisher: { "@id": `${siteUrl}/#organization` },
  };

  return (
    // relative + overflow-x-clip, as on the homepage and the /vs hub: no
    // descendant can make the phone page scroll sideways.
    <div className="relative overflow-x-clip">
      <Header initialUser={null} initialEntitlements={null} />
      <JsonLd data={structuredData} />
      <VsBreadcrumbSchema
        vsPath="/vs/buildium"
        pageName="TrueCap vs Buildium"
      />
      <main id="main" tabIndex={-1} className="min-w-0 outline-none">
        <VsHero>
          <h1 className={VS_H1}>
            TrueCap vs Buildium:{" "}
            pre-purchase underwriting vs property management
          </h1>
          <BlogByline />
          <p className={VS_LEDE}>
            Buildium is property management software for landlords and
            professional managers operating rentals after purchase. TrueCap is a
            pre-purchase underwriting calculator for evaluating acquisitions.
            Different stages, different jobs.
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
                <li>
                  You want a free tier that covers the core underwriting work.
                </li>
                <li>You&apos;re not managing other people&apos;s property.</li>
              </ul>
            </div>
            <div className="min-w-0">
              <h3 className={VS_TLDR_LABEL}>
                Use Buildium when
              </h3>
              <ul className={VS_TLDR_LIST}>
                <li>
                  You need tenant, lease, accounting, and maintenance
                  operations.
                </li>
                <li>
                  You run a property management company and need owner portals.
                </li>
                <li>
                  You need property accounting, bank reconciliation, and
                  financial reports.
                </li>
                <li>
                  You&apos;re scaling from a few rentals into a PM business.
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
              head={["Feature", "TrueCap", "Buildium"]}
              rows={MATRIX.map((row) => ({
                label: row.feature,
                truecap: row.truecap,
                competitor: row.buildium,
                winner: row.winner === "buildium" ? "competitor" : row.winner,
              }))}
            />
          </ScrollX>
          <p className={VS_SOURCES}>
            Buildium details checked against its pricing page in October 2026.
            See{" "}
            <a
              href="https://www.buildium.com/pricing/"
              target="_blank"
              rel="noopener"
              className="tc-link"
            >
              Buildium&apos;s official pricing page
            </a>{" "}
            for current plans.
          </p>
        </Section>

        {/* Complementary workflow */}
        <Section aria-labelledby="vs-fit-heading">
          <SectionHeading id="vs-fit-heading">
            When TrueCap users graduate to Buildium
          </SectionHeading>
          <div className={VS_PROSE}>
            <ol>
              <li>
                <strong>Underwrite + buy 1-10 properties with TrueCap.</strong>{" "}
                Free or Pro tier — solo investor workflow.
              </li>
              <li>
                <strong>Identify the operational bottleneck.</strong> Tenant,
                lease, accounting, maintenance, or owner-reporting needs may
                justify a dedicated platform.
              </li>
              <li>
                <strong>Compare current operations platforms.</strong> Review
                pricing, implementation, accounting, payments, support, and
                portfolio fit before choosing Buildium or an alternative.
              </li>
              <li>
                <strong>Keep TrueCap for new acquisitions.</strong>{" "}
                Buildium&apos;s plans list no acquisition calculator, so
                you&apos;ll still want TrueCap (or DealCheck) for the next
                property.
              </li>
            </ol>
            <p>
              Underwriting a purchase rather than managing one? The free{" "}
              <IntentPrefetchLink
                href="/tools/vacancy-rate-calculator"
                className="tc-link"
              >
                vacancy rate calculator
              </IntentPrefetchLink>{" "}
              puts a number on the downtime you would be administering here; the
              full{" "}
              <Link
                href="/analyze" prefetch={false}
                className="tc-link"
              >
                TrueCap analyzer
              </Link>{" "}
              goes further and computes cap rate, cash-on-cash, and DSCR from an
              address. Our guide on{" "}
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
          competitorName="Buildium"
          items={BUILDIUM_FAQ}
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
            <RelatedContent kind="vs" slug="buildium" />
            <AuthorBio />

            <footer className="mt-10 border-t border-border pt-6">
              <p className="text-lg font-semibold">Other comparisons:</p>
              <ul className="mt-2 grid gap-x-8 sm:grid-cols-2">
                <li>
                  <IntentPrefetchLink
                    href="/vs/appfolio"
                    className={VS_LINK_ROW}
                  >
                    TrueCap vs AppFolio
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

const BUILDIUM_FAQ: FaqItem[] = [
  {
    question: "Is TrueCap a Buildium alternative?",
    answer: (
      <>
        Not directly. Buildium manages rentals after purchase; TrueCap
        underwrites potential acquisitions before purchase. A landlord or
        manager may use both at different stages.
      </>
    ),
  },
  {
    question: "Is Buildium worth it for a small landlord?",
    answer: (
      <>
        It depends on the operational workflow. Buildium publishes Essential,
        Growth, and Premium paid tiers plus a 14-day trial. Compare the current
        rate and included accounting, tenant, maintenance, and owner features
        with the alternatives that fit your portfolio.
      </>
    ),
  },
  {
    question: "Does Buildium underwrite deals?",
    answer: (
      <>
        Buildium&apos;s plans cover operations: units, tenants, leases,
        accounting, vendors. They list no calculator for cap rate, DSCR, or
        cash flow on a potential acquisition. For that you&apos;d use TrueCap,
        DealCheck, or a spreadsheet.
      </>
    ),
  },
  {
    question: "When should I upgrade from solo tools to Buildium?",
    answer: (
      <>
        Consider a dedicated platform when tenant, lease, accounting,
        maintenance, payment, or owner-reporting work justifies its cost and
        implementation effort. There is no universal unit-count threshold;
        compare current plans against your actual workflow.
      </>
    ),
  },
  {
    question: "Buildium vs AppFolio — which one?",
    answer: (
      <>
        Compare the vendors&apos; current pricing, minimums, accounting,
        resident, owner, maintenance, support, and implementation features.
        AppFolio&apos;s Core plan currently states a 50-unit minimum; Buildium
        publishes starting prices for its three plans, and its pricing page
        lists no unit minimum.
      </>
    ),
  },
];

