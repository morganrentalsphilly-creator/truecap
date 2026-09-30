/**
 * /vs/rentspree — competitor comparison landing page.
 *
 * Target queries: "rentspree alternative", "rentspree vs", "rentspree pricing", "rentspree review", "tenant screening service".
 * RentSpree is tenant screening + rental applications, popular with realtors who run rentals for clients. TransUnion-backed screening reports. Different audience than TrueCap but agents look at both.
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
  title: "RentSpree vs TrueCap (2026): Screening vs Analysis",
  description:
    "RentSpree screens your tenants. TrueCap underwrites your deals. Different jobs in the rental workflow — and how realtors use both.",
  keywords: [
    "rentspree alternative",
    "rentspree vs",
    "rentspree pricing",
    "rentspree review",
    "tenant screening service",
  ],
  alternates: { canonical: "/vs/rentspree" },
  openGraph: {
    title: "RentSpree vs TrueCap (2026): Screening vs Analysis",
    description:
      "RentSpree screens tenants. TrueCap underwrites deals. Different jobs in the rental workflow.",
    url: "/vs/rentspree",
    type: "website",
    images: [
      {
        url: "/home.jpg",
        width: 1200,
        height: 630,
        alt: "TrueCap vs RentSpree",
      },
    ],
  },
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
};

type Verdict = "truecap" | "rentspree" | "tie";
type Row = {
  feature: string;
  truecap: string;
  rentspree: string;
  winner: Verdict;
};

const MATRIX: Row[] = [
  {
    feature: "Primary use",
    truecap: "Pre-purchase underwriting (cap rate, DSCR, cash flow)",
    rentspree: "Tenant screening + rental applications",
    winner: "tie",
  },
  {
    feature: "Cap rate / CoC / DSCR analysis",
    truecap: "Yes — full engine, free tier",
    rentspree: "Not modeled",
    winner: "truecap",
  },
  {
    feature: "10-year projection",
    truecap: "Pro — rent + expense + appreciation",
    rentspree: "Not modeled",
    winner: "truecap",
  },
  {
    feature: "Deal score (0–100)",
    truecap: "Free — 0–100 score with factor breakdown",
    rentspree: "Not applicable",
    winner: "truecap",
  },
  {
    feature: "Starting values (rent/rate/tax)",
    truecap: "HUD rent + FRED rate + manual local property tax",
    rentspree: "Not applicable",
    winner: "truecap",
  },
  {
    feature: "Tenant credit / criminal reports",
    truecap: "No",
    rentspree: "Yes — TransUnion-backed",
    winner: "rentspree",
  },
  {
    feature: "Online rental applications",
    truecap: "No",
    rentspree: "Yes — customizable",
    winner: "rentspree",
  },
  {
    feature: "Eviction records check",
    truecap: "No",
    rentspree: "Yes — court records",
    winner: "rentspree",
  },
  {
    feature: "Agent / brokerage workflow",
    truecap: "Yes — agent persona page exists",
    rentspree: "Yes — built for realtor-managed rentals",
    winner: "tie",
  },
  {
    feature: "Free tier",
    truecap: "Yes — core cap rate, CoC, DSCR, and cash flow",
    rentspree: "Yes — tenant pays for screening (typical)",
    winner: "tie",
  },
  {
    feature: "Pricing model",
    truecap: "Free core; paid Pro — see live pricing",
    rentspree: "Tenant typically pays $30-40 per application",
    winner: "tie",
  },
  {
    feature: "Shareable read-only analysis",
    truecap: "Free — read-only public link; Pro adds co-branding",
    rentspree: "N/A",
    winner: "truecap",
  },
];

export default function VsRentspreePage() {
  const siteUrl = getSiteUrl();
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "RentSpree vs TrueCap (2026): Screening vs Analysis",
    url: `${siteUrl}/vs/rentspree`,
    description:
      "RentSpree screens your tenants. TrueCap underwrites your deals. Different jobs in the rental workflow — and how realtors use both.",
    dateModified: lastmodFor("/vs/rentspree"),
    publisher: { "@id": `${siteUrl}/#organization` },
  };

  return (
    // relative + overflow-x-clip, as on the homepage and the /vs hub: no
    // descendant can make the phone page scroll sideways.
    <div className="relative overflow-x-clip">
      <Header initialUser={null} initialEntitlements={null} />
      <JsonLd data={structuredData} />
      <VsBreadcrumbSchema
        vsPath="/vs/rentspree"
        pageName="TrueCap vs RentSpree"
      />
      <main id="main" tabIndex={-1} className="min-w-0 outline-none">
        <VsHero>
          <h1 className={VS_H1}>
            TrueCap vs RentSpree:{" "}
            underwrite the deal vs screen the tenant
          </h1>
          <BlogByline />
          <p className={VS_LEDE}>
            RentSpree is the go-to tenant screening service for real-estate
            agents and small landlords — TransUnion credit + criminal + eviction
            reports, online rental applications, agent-friendly workflow.
            TrueCap models the property&apos;s pre-purchase economics from
            user-reviewed assumptions. Different jobs. Many agents and investors
            use both.
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
                  You&apos;re underwriting a property before making an offer.
                </li>
                <li>
                  You&apos;re an agent sending a deal analysis to a buyer
                  client.
                </li>
                <li>You want cap rate, DSCR, projection, Deal score.</li>
                <li>You&apos;re not the one screening the tenant.</li>
              </ul>
            </div>
            <div className="min-w-0">
              <h3 className={VS_TLDR_LABEL}>
                Use RentSpree when
              </h3>
              <ul className={VS_TLDR_LIST}>
                <li>
                  You own the property (or manage it for an owner) and need to
                  screen applicants.
                </li>
                <li>
                  You want TransUnion-backed credit + criminal + eviction
                  reports.
                </li>
                <li>
                  You want tenants to pay for their own application + screening.
                </li>
                <li>
                  You&apos;re a realtor managing rentals on behalf of clients.
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
              head={["Feature", "TrueCap", "RentSpree"]}
              rows={MATRIX.map((row) => ({
                label: row.feature,
                truecap: row.truecap,
                competitor: row.rentspree,
                winner: row.winner === "rentspree" ? "competitor" : row.winner,
              }))}
            />
          </ScrollX>
          <p className={VS_SOURCES}>
            RentSpree details based on publicly available product info as of
            2026. See{" "}
            <a
              href="https://rentspree.com"
              target="_blank"
              rel="noopener"
              className="tc-link"
            >
              rentspree.com
            </a>{" "}
            for their current state.
          </p>
        </Section>

        {/* Complementary workflow */}
        <Section aria-labelledby="vs-fit-heading">
          <SectionHeading id="vs-fit-heading">
            How agents + landlords use both
          </SectionHeading>
          <div className={VS_PROSE}>
            <ol>
              <li>
                <strong>Underwrite the deal in TrueCap.</strong> Either you (the
                agent) or your buyer client runs the address. Generates a
                defensible analysis to share.
              </li>
              <li>
                <strong>Buyer makes the offer + closes.</strong> TrueCap&apos;s
                job is done.
              </li>
              <li>
                <strong>List the unit + accept applications in RentSpree.</strong>{" "}
                Agent or owner posts the listing; applicants submit + pay for
                their own screening.
              </li>
              <li>
                <strong>Review screening reports + select a tenant.</strong>{" "}
                TransUnion-backed credit, criminal, eviction records arrive in
                your inbox.
              </li>
              <li>
                <strong>Sign the lease.</strong> RentSpree integrates with several
                lease providers; pair with TurboTenant or Avail for state-specific
                templates.
              </li>
            </ol>
            <p>
              Need only the underwriting half to send a client?{" "}
              <IntentPrefetchLink
                href="/blog/cap-rate-vs-cash-on-cash-vs-dscr"
                className="tc-link"
              >
                Cap rate vs cash-on-cash vs DSCR
              </IntentPrefetchLink>{" "}
              explains in plain language which number answers which question —
              handy when a buyer asks why the deal works. The full{" "}
              <Link
                href="/analyze" prefetch={false}
                className="tc-link"
              >
                TrueCap analyzer
              </Link>{" "}
              produces all three from an address, in an analysis you can share.
            </p>
          </div>
        </Section>

        <ComparisonFaq competitorName="RentSpree" items={RENTSPREE_FAQ} />

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
            <RelatedContent kind="vs" slug="rentspree" />
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

const RENTSPREE_FAQ: FaqItem[] = [
  {
    question: "Is TrueCap a RentSpree alternative?",
    answer: (
      <>
        No — different jobs. RentSpree is tenant screening + rental applications
        for properties you own or manage. TrueCap is pre-purchase underwriting
        for properties you&apos;re considering buying. Agents who help clients
        with both ends of the workflow often use both.
      </>
    ),
  },
  {
    question: "Does TrueCap screen tenants?",
    answer: (
      <>
        No — we don&apos;t pull credit, criminal, or eviction reports.
        That&apos;s FCRA-regulated and outside our scope. For tenant screening,
        RentSpree, TurboTenant, Avail, RentRedi, or TransUnion direct are the
        right tools.
      </>
    ),
  },
  {
    question: "Is RentSpree really free?",
    answer: (
      <>
        It&apos;s free for the landlord/agent — the tenant typically pays $30-40
        per screening package. RentSpree also offers premium tiers for agents
        that bundle additional tools (e-signature, listing syndication, etc.)
        starting around $20/month.
      </>
    ),
  },
  {
    question: "RentSpree vs TurboTenant — which one?",
    answer: (
      <>
        TurboTenant bundles screening into a broader landlord stack (listings,
        applications, leases, rent collection). RentSpree is more focused on
        screening + applications and is popular with realtors managing rentals
        on behalf of clients. Both are reasonable for small landlords; agents
        lean RentSpree.
      </>
    ),
  },
  {
    question: "Can a realtor use both TrueCap + RentSpree?",
    answer: (
      <>
        Yes — that&apos;s a common combination. Use TrueCap to underwrite + send
        a deal analysis to your buyer client at the showing; use RentSpree to
        screen tenants once they own the property and it&apos;s time to fill the
        unit. Both are agent-friendly.
      </>
    ),
  },
];

