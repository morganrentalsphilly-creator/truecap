/**
 * /vs/privy — competitor comparison landing page.
 *
 * Target queries: "privy alternative", "privy real estate", "privy vs propstream", "privy pricing", "investor mls tool".
 * Privy is an investor-focused MLS data + property search tool — built specifically for real estate investors who want to filter MLS data with investor criteria (cash-on-cash, rehab potential, motivated seller signals). Sister product positioning to TrueCap on the sourcing side.
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
  title: "Privy vs TrueCap (2026): Find Deals vs Underwrite",
  description:
    "Privy sources deals and analyzes properties on MLS data. TrueCap underwrites the deals once you've found them. See what each does and how the two fit.",
  keywords: [
    "privy alternative",
    "privy real estate",
    "privy vs propstream",
    "privy pricing",
    "investor mls tool",
  ],
  alternates: { canonical: "/vs/privy" },
  openGraph: {
    title: "Privy vs TrueCap (2026): Find Deals vs Underwrite",
    description:
      "Privy sources deals and analyzes properties on MLS data. TrueCap underwrites the deals once you've found them.",
    url: "/vs/privy",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

type Verdict = "truecap" | "privy" | "tie";
type Row = { feature: string; truecap: string; privy: string; winner?: Verdict };

const MATRIX: Row[] = [
  {
    feature: "Primary purpose",
    truecap: "Per-deal underwriting calculator",
    privy: "Deal sourcing and property analysis on direct MLS data feeds",
    winner: "tie",
  },
  {
    feature: "Cap rate / CoC / DSCR analysis",
    truecap: "Yes — full engine, free tier",
    privy: "Not advertised on privy.pro",
  },
  {
    feature: "10-year projection",
    truecap: "Pro — rent + expense + appreciation",
    privy: "Not advertised on privy.pro",
  },
  {
    feature: "Starting values (rent/rate/tax)",
    truecap: "HUD rent + FRED rate + manual local property tax",
    privy: "Direct MLS data feeds and nationwide public records",
    winner: "tie",
  },
  {
    feature: "Deal sourcing by strategy on MLS data",
    truecap: "No",
    privy: "Yes: by strategy (rental, fix-and-flip, teardown)",
    winner: "privy",
  },
  {
    feature: "Sale + rent comps",
    truecap:
      "One free lookup with an account; Pro and Agent Pro include 50 per month; each returns sale and rent comps with a value estimate and a rent estimate",
    privy: "Yes: comparable transactions and rental comp tables",
    winner: "privy",
  },
  {
    feature: "Motivated-seller flagging on MLS",
    truecap: "No",
    privy: "Not advertised on privy.pro",
  },
  {
    feature: "Off-market lead generation",
    truecap: "No",
    privy: "Not advertised on privy.pro",
  },
  {
    feature: "Mortgage + financing math",
    truecap: "Yes — PITI + DSCR + amortization",
    privy: "Not advertised on privy.pro",
  },
  {
    feature: "Free tier",
    truecap: "Yes — core cap rate, CoC, DSCR, and cash flow",
    privy:
      "No free tier; 30-day money-back guarantee; from $97/mo billed monthly or $78/mo billed annually (as of October 2026)",
  },
  {
    feature: "Pricing (entry tier)",
    truecap: "Free core; paid Pro — see live pricing",
    privy:
      "One Market $97/mo, Three States $149/mo, Nationwide $249/mo billed monthly; 20% less billed annually (as of October 2026)",
  },
];

export default function VsPrivyPage() {
  const siteUrl = getSiteUrl();
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Privy vs TrueCap (2026): Find Deals vs Underwrite",
    url: `${siteUrl}/vs/privy`,
    description:
      "Privy sources deals and analyzes properties on MLS data. TrueCap underwrites the deals once you've found them. See what each does and how the two fit.",
    dateModified: lastmodFor("/vs/privy"),
    publisher: { "@id": `${siteUrl}/#organization` },
  };

  return (
    // relative + overflow-x-clip, as on the homepage and the /vs hub: no
    // descendant can make the phone page scroll sideways.
    <div className="relative overflow-x-clip">
      <Header initialUser={null} initialEntitlements={null} />
      <JsonLd data={structuredData} />
      <VsBreadcrumbSchema vsPath="/vs/privy" pageName="TrueCap vs Privy" />
      <main id="main" tabIndex={-1} className="min-w-0 outline-none">
        <VsHero>
          <h1 className={VS_H1}>
            TrueCap vs Privy:{" "}
            filter the MLS vs underwrite the deals
          </h1>
          <BlogByline />
          <p className={VS_LEDE}>
            Privy is a real estate investment platform built on direct MLS data
            feeds and public records: it surfaces listings that match a strategy
            (rental, fix-and-flip, teardown) and shows comparable transactions
            and rental comp tables. TrueCap is the underwriting calculator that
            runs the per-deal math on whatever Privy surfaces. Different jobs in
            the same workflow.
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
                <li>You have an address and want to underwrite it.</li>
                <li>You want cap rate, DSCR, cash flow, projection.</li>
                <li>
                  You source deals through agents, MLS access, or referrals (not
                  Privy).
                </li>
                <li>You want a free tier with no monthly cap.</li>
              </ul>
            </div>
            <div className="min-w-0">
              <h3 className={VS_TLDR_LABEL}>
                Use Privy when
              </h3>
              <ul className={VS_TLDR_LIST}>
                <li>You actively search MLS for investor-friendly deals.</li>
                <li>
                  You want deals surfaced by strategy (rental, fix-and-flip,
                  teardown).
                </li>
                <li>
                  You don&apos;t have direct MLS access through an agent
                  license.
                </li>
                <li>
                  You&apos;re doing fix-and-flip and want before-and-after data
                  on completed flips.
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
              head={["Feature", "TrueCap", "Privy"]}
              rows={MATRIX.map((row) => ({
                label: row.feature,
                truecap: row.truecap,
                competitor: row.privy,
                winner: row.winner === "privy" ? "competitor" : row.winner,
              }))}
            />
          </ScrollX>
          <p className={VS_SOURCES}>
            Privy prices and features were checked against its public pages in
            October 2026. The product itself sits behind a login, so rows
            marked &ldquo;Not advertised on privy.pro&rdquo; are not scored.
            See{" "}
            <a
              href="https://www.privy.pro/"
              target="_blank"
              rel="noopener"
              className="tc-link"
            >
              privy.pro
            </a>{" "}
            for current terms.
          </p>
        </Section>

        {/* Complementary workflow */}
        <Section aria-labelledby="vs-fit-heading">
          <SectionHeading id="vs-fit-heading">
            How TrueCap and Privy fit together
          </SectionHeading>
          <div className={VS_PROSE}>
            <ol>
              <li>
                <strong>Find a listing in Privy.</strong> Set your market and
                strategy; Privy surfaces listings that match.
              </li>
              <li>
                <strong>Pick a property worth a closer look.</strong> Privy shows
                comparable transactions and rental comp tables for it.
              </li>
              <li>
                <strong>Underwrite in TrueCap.</strong> Paste the address to start
                from editable HUD rent and FRED rate benchmarks, then enter local
                property tax manually. Replace the rent benchmark with your best
                local comp.
              </li>
              <li>
                <strong>
                  Check your rent input against Privy&apos;s rental comps.
                </strong>{" "}
                If they disagree, settle the rent before you trust the cash flow,
                then review the expense assumptions.
              </li>
              <li>
                <strong>Review the Offer Ceiling in TrueCap Pro.</strong> It works
                backward from your selected target return; verify the material
                assumptions before recording a decision.
              </li>
            </ol>
            <p>
              Want to see where the cap rate comes from?{" "}
              <IntentPrefetchLink
                href="/blog/how-to-calculate-cap-rate"
                className="tc-link"
              >
                How to calculate cap rate
              </IntentPrefetchLink>{" "}
              shows the formula line by line, and{" "}
              <IntentPrefetchLink
                href="/blog/what-is-a-good-cap-rate"
                className="tc-link"
              >
                what counts as a good cap rate
              </IntentPrefetchLink>{" "}
              puts the result in context for your market. Once you want that math
              run against HUD rent and a live rate, paste the address into the{" "}
              <Link
                href="/analyze" prefetch={false}
                className="tc-link"
              >
                TrueCap analyzer
              </Link>
              .
            </p>
          </div>
        </Section>

        <ComparisonFaq
          competitorName="Privy"
          items={PRIVY_FAQ}
          reviewedDate="October 2026"
        />

        {/* Pricing CTA */}
        <CloseSection
          headingId="vs-close-heading"
          heading={<>Underwrite the next deal — free.</>}
          lede={
            <>
              TrueCap free covers cap rate, CoC, DSCR, and monthly cash flow.
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
            <RelatedContent kind="vs" slug="privy" />
            <AuthorBio />

            <footer className="mt-10 border-t border-border pt-6">
              <p className="text-lg font-semibold">Other comparisons:</p>
              <ul className="mt-2 grid gap-x-8 sm:grid-cols-2">
                <li>
                  <IntentPrefetchLink
                    href="/vs/propstream"
                    className={VS_LINK_ROW}
                  >
                    TrueCap vs PropStream
                  </IntentPrefetchLink>
                </li>
                <li>
                  <IntentPrefetchLink
                    href="/vs/dealmachine"
                    className={VS_LINK_ROW}
                  >
                    TrueCap vs DealMachine
                  </IntentPrefetchLink>
                </li>
                <li>
                  <IntentPrefetchLink
                    href="/vs/dealcheck"
                    className={VS_LINK_ROW}
                  >
                    TrueCap vs DealCheck
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

const PRIVY_FAQ: FaqItem[] = [
  {
    question: "Is TrueCap a Privy alternative?",
    answer: (
      <>
        No — they solve different problems. Privy is deal sourcing and property
        analysis on MLS data and public records. TrueCap is per-deal
        underwriting once you have an address. They sit at different steps, so
        an investor can use both.
      </>
    ),
  },
  {
    question: "Privy vs PropStream — which one?",
    answer: (
      <>
        Different focuses. Privy works from direct MLS data feeds and public
        records to surface deals by strategy. PropStream is built around lead
        lists, skip tracing, and direct mail. Pick by how you source: listed
        deals, or direct-to-owner outreach.
      </>
    ),
  },
  {
    question: "Why use Privy if I already have MLS access through an agent?",
    answer: (
      <>
        Privy&apos;s site describes what it adds on top of MLS data: its
        Comparative Search, before-and-after data on completed flips, and rental
        comp tables. Whether that is worth a subscription depends on how many
        deals you screen. If you&apos;re comfortable using your agent&apos;s
        MLS portal and applying investor logic yourself, compare the two before
        you subscribe.
      </>
    ),
  },
  {
    question: "Does Privy underwrite deals?",
    answer: (
      <>
        Privy&apos;s site describes property analysis with comparable
        transactions, before-and-after data, and rental comp tables. It does not
        advertise a cap rate, DSCR, or financing calculator. TrueCap models
        editable financing, DSCR, sensitivity, and a cash-flow and equity
        projection for a shortlisted property. TrueCap does not currently expose
        a tax-specific module.
      </>
    ),
  },
  {
    question: "Is Privy worth the subscription?",
    answer: (
      <>
        It depends on volume. Privy&apos;s One Market plan is $97 a month billed
        monthly or $78 a month billed annually, with a 30-day money-back
        guarantee (as of October 2026). If you&apos;re actively sourcing MLS
        deals across multiple markets and don&apos;t have agent-grade MLS
        access, deal sourcing by strategy can save search time. If you have an
        agent who sends you listings and you look at 1-3 deals a month,
        TrueCap&apos;s free tier plus your agent&apos;s MLS access may cover
        the workflow.
      </>
    ),
  },
];

