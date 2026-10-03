/**
 * /vs/lodgify — competitor comparison landing page.
 *
 * Target queries: "lodgify alternative", "lodgify vs hostaway", "lodgify pricing", "lodgify review", "small str software".
 * Lodgify is short-term rental software for hosts and property managers: direct-booking website builder, channel manager, reservation system (lodgify.com/pricing).
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
  title: "Lodgify vs TrueCap (2026): STR PM vs Deal Math",
  description:
    "Lodgify is STR software for hosts and property managers. TrueCap underwrites the deal before you buy. How the two fit together.",
  keywords: [
    "lodgify alternative",
    "lodgify vs hostaway",
    "lodgify pricing",
    "lodgify review",
    "small str software",
  ],
  alternates: { canonical: "/vs/lodgify" },
  openGraph: {
    title: "Lodgify vs TrueCap (2026): STR PM vs Deal Math",
    description:
      "Lodgify is STR software for hosts and property managers. TrueCap underwrites the deal before you buy. Different stages.",
    url: "/vs/lodgify",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

type Verdict = "truecap" | "lodgify" | "tie";
type Row = {
  feature: string;
  truecap: string;
  lodgify: string;
  winner?: Verdict;
};

const MATRIX: Row[] = [
  {
    feature: "Lifecycle stage",
    truecap: "Pre-purchase — underwrite the STR deal",
    lodgify: "Post-purchase — host + manage STRs",
    winner: "tie",
  },
  {
    feature: "Cap rate / CoC / DSCR analysis",
    truecap: "Yes — full engine, editable rent input",
    lodgify:
      "Not among Lodgify's plan features; its site links a vacation rental calculator and an Airbnb calculator",
  },
  {
    feature: "10-year projection",
    truecap: "Pro — rent + expense + appreciation",
    lodgify: "Not among Lodgify's listed plan features",
    winner: "truecap",
  },
  {
    feature: "Starting values (rent/rate/tax)",
    truecap:
      "Editable HUD rent and FRED rate benchmarks; manual local property tax",
    lodgify: "Not among Lodgify's listed plan features",
    winner: "truecap",
  },
  {
    feature: "Direct-booking website builder",
    truecap: "No",
    lodgify:
      "Yes, from the Starter plan: no-code website builder and booking widget",
    winner: "lodgify",
  },
  {
    feature: "Channel manager (Airbnb, Vrbo, Booking)",
    truecap: "No",
    lodgify:
      "Yes: unified calendar and inbox for Airbnb, Vrbo and Booking.com on every plan",
    winner: "lodgify",
  },
  {
    feature: "Guest messaging",
    truecap: "No",
    lodgify:
      "Unified inbox on every plan; automated messages on Professional and Ultimate",
    winner: "lodgify",
  },
  {
    feature: "Reservation system",
    truecap: "No",
    lodgify:
      "Yes: unified calendar on every plan; custom rates and payments from Starter",
    winner: "lodgify",
  },
  {
    feature: "Sweet spot",
    truecap:
      "Real estate agents with investor clients, and rental investors weighing an offer on a specific listing",
    lodgify: "Hosts and property managers",
    winner: "tie",
  },
  {
    feature: "Free tier",
    truecap: "Yes — core cap rate, CoC, DSCR, and cash flow",
    lodgify:
      "No permanent free tier; time-limited trial — confirm current terms",
    winner: "truecap",
  },
  {
    feature: "Pricing (entry tier)",
    truecap: "Free core; paid Pro — see live pricing",
    lodgify:
      "Paid Basic, Starter, Professional, and Ultimate plans — see live pricing",
  },
];

export default function VsLodgifyPage() {
  const siteUrl = getSiteUrl();
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Lodgify vs TrueCap (2026): STR PM vs Deal Math",
    url: `${siteUrl}/vs/lodgify`,
    description:
      "Lodgify is STR software for hosts and property managers. TrueCap underwrites the deal before you buy. How the two fit together.",
    dateModified: lastmodFor("/vs/lodgify"),
    publisher: { "@id": `${siteUrl}/#organization` },
  };

  return (
    // relative + overflow-x-clip, as on the homepage and the /vs hub: no
    // descendant can make the phone page scroll sideways.
    <div className="relative overflow-x-clip">
      <Header initialUser={null} initialEntitlements={null} />
      <JsonLd data={structuredData} />
      <VsBreadcrumbSchema vsPath="/vs/lodgify" pageName="TrueCap vs Lodgify" />
      <main id="main" tabIndex={-1} className="min-w-0 outline-none">
        <VsHero>
          <h1 className={VS_H1}>
            TrueCap vs Lodgify:{" "}
            underwrite the STR, then run it
          </h1>
          <BlogByline />
          <p className={VS_LEDE}>
            Lodgify is short-term rental software for hosts and property
            managers — direct-booking website, channel manager across Airbnb /
            Vrbo / Booking, and reservation tools. TrueCap is a pre-purchase
            underwriting calculator that helps investors screen an STR
            acquisition. TrueCap&apos;s Short-term Rental mode is a beta revenue
            screen: it models revenue as nightly rate × occupancy and does not
            fully model platform fees, turnover, lodging tax, seasonality, or
            local STR eligibility. Different stages, potentially complementary
            tools.
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
                <li>You&apos;re evaluating a property as a potential STR.</li>
                <li>You want cap rate, DSCR, cash flow before buying.</li>
                <li>
                  You want to compare LTR vs STR scenarios on the same property.
                </li>
                <li>You&apos;re not yet hosting guests.</li>
              </ul>
            </div>
            <div className="min-w-0">
              <h3 className={VS_TLDR_LABEL}>
                Use Lodgify when
              </h3>
              <ul className={VS_TLDR_LIST}>
                <li>You operate STRs and need a website + channel manager.</li>
                <li>You want to add a direct-booking channel.</li>
                <li>
                  You have compared its current plan, payment, and channel
                  costs.
                </li>
                <li>Its hosting workflow fits your team and listing count.</li>
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
              head={["Feature", "TrueCap", "Lodgify"]}
              rows={MATRIX.map((row) => ({
                label: row.feature,
                truecap: row.truecap,
                competitor: row.lodgify,
                winner: row.winner === "lodgify" ? "competitor" : row.winner,
              }))}
            />
          </ScrollX>
          <p className={VS_SOURCES}>
            Lodgify plans and features were checked against its pricing page in
            October 2026. Plan and trial details can change. See{" "}
            <a
              href="https://www.lodgify.com/pricing/"
              target="_blank"
              rel="noopener"
              className="tc-link"
            >
              Lodgify&apos;s official pricing page
            </a>{" "}
            for current terms.
          </p>
        </Section>

        {/* Complementary workflow */}
        <Section aria-labelledby="vs-fit-heading">
          <SectionHeading id="vs-fit-heading">
            How TrueCap and Lodgify fit together
          </SectionHeading>
          <div className={VS_PROSE}>
            <ol>
              <li>
                <strong>Find an STR-friendly property.</strong> MLS, off-market,
                or existing STR for sale.
              </li>
              <li>
                <strong>Build an STR revenue range.</strong> Use current market
                evidence or a third-party STR data source, then verify the
                assumptions.
              </li>
              <li>
                <strong>Underwrite in TrueCap.</strong> Plug AirDNA&apos;s monthly
                revenue into the rent field. Run cap rate, DSCR, cash flow.
              </li>
              <li>
                <strong>Continue due diligence.</strong> Verify local STR rules,
                insurance, financing, taxes, expenses, and revenue evidence before
                deciding.
              </li>
              <li>
                <strong>Set up Lodgify.</strong> Build your direct-booking site,
                connect Airbnb / Vrbo / Booking, configure your calendar.
              </li>
            </ol>
            <p>
              Want the underwriting half on its own? The free{" "}
              <IntentPrefetchLink
                href="/tools/vacancy-rate-calculator"
                className="tc-link"
              >
                vacancy rate calculator
              </IntentPrefetchLink>{" "}
              turns vacant nights and turnover cost into the occupancy haircut an
              STR pro forma actually needs, and our{" "}
              <IntentPrefetchLink
                href="/blog/short-term-rental-underwriting-playbook"
                className="tc-link"
              >
                short-term rental underwriting playbook
              </IntentPrefetchLink>{" "}
              walks through the rest of the assumptions. Then hand the address to
              the full{" "}
              <Link
                href="/analyze" prefetch={false}
                className="tc-link"
              >
                TrueCap analyzer
              </Link>{" "}
              for cap rate, DSCR and cash flow in one pass.
            </p>
          </div>
        </Section>

        <ComparisonFaq
          competitorName="Lodgify"
          items={LODGIFY_FAQ}
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
              Pro adds 10-year cash-flow and equity projections, sensitivity, the
              Offer Ceiling, co-branded share links, and PDF reports; see live
              pricing for current terms. No card to start.
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
            <RelatedContent kind="vs" slug="lodgify" />
            <AuthorBio />

            <footer className="mt-10 border-t border-border pt-6">
              <p className="text-lg font-semibold">Other comparisons:</p>
              <ul className="mt-2 grid gap-x-8 sm:grid-cols-2">
                <li>
                  <IntentPrefetchLink
                    href="/vs/hostfully"
                    className={VS_LINK_ROW}
                  >
                    TrueCap vs Hostfully
                  </IntentPrefetchLink>
                </li>
                <li>
                  <IntentPrefetchLink
                    href="/vs/hostaway"
                    className={VS_LINK_ROW}
                  >
                    TrueCap vs Hostaway
                  </IntentPrefetchLink>
                </li>
                <li>
                  <IntentPrefetchLink
                    href="/vs/airdna"
                    className={VS_LINK_ROW}
                  >
                    TrueCap vs AirDNA
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

const LODGIFY_FAQ: FaqItem[] = [
  {
    question: "Is TrueCap a Lodgify alternative?",
    answer: (
      <>
        No — different stages. Lodgify manages STRs you already own. TrueCap
        underwrites whether to buy the property as an STR in the first place.
        They cover different stages, so a host can use both.
      </>
    ),
  },
  {
    question: "Lodgify vs Hostaway — which one?",
    answer: (
      <>
        Compare each vendor&apos;s current quote, listing requirements, channel
        coverage, direct-booking tools, automation, integrations, support, and
        implementation terms. The better fit depends on the portfolio and
        workflow; neither has a universal size cutoff.
      </>
    ),
  },
  {
    question: "Does Lodgify have a free tier?",
    answer: (
      <>
        Lodgify does not currently publish a permanent free tier. It publishes a
        time-limited trial and paid Basic, Starter, Professional, and Ultimate
        plans. Check its official pricing page for the current rate, trial,
        property-count rules, and included features.
      </>
    ),
  },
  {
    question: "Can TrueCap model STR revenue?",
    answer: (
      <>
        Yes, in two ways. Enter your expected monthly STR revenue in the rent
        field and put vacancy and operating costs in the expense fields. Or use
        the Short-term Rental mode, a beta revenue screen that takes a nightly
        rate and occupancy. TrueCap doesn&apos;t
        pull AirDNA or Mashvisor data automatically; you&apos;d use those
        alongside.
      </>
    ),
  },
  {
    question: "Should I get a Lodgify direct-booking site?",
    answer: (
      <>
        It can be useful when you can generate direct demand and the net
        economics work for your portfolio. Compare Lodgify&apos;s current
        subscription, payment, marketing, support, and operating costs with the
        channel mix you actually use.{" "}
        <a
          href="https://www.airbnb.com/help/article/1857"
          target="_blank"
          rel="noopener"
          className="tc-link"
        >
          Airbnb publishes multiple service-fee structures
        </a>
        , so use your account&apos;s current terms instead of assuming one
        percentage or guaranteed payback.
      </>
    ),
  },
];

