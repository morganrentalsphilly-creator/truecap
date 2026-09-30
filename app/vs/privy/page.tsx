/**
 * /vs/privy — competitor comparison landing page.
 *
 * Target queries: "privy alternative", "privy real estate", "privy vs propstream", "privy pricing", "investor mls tool".
 * Privy is an investor-focused MLS data + property search tool — built specifically for real estate investors who want to filter MLS data with investor criteria (cash-on-cash, rehab potential, motivated seller signals). Sister product positioning to TrueCap on the sourcing side.
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
  title: "Privy vs TrueCap (2026): Find Deals vs Underwrite",
  description:
    "Privy is investor-focused MLS search. TrueCap underwrites the deals once you've found them. Honest comparison and how investors use both.",
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
      "Privy is investor MLS search. TrueCap underwrites the deals. Different jobs in the same workflow.",
    url: "/vs/privy",
    type: "website",
    images: [
      { url: "/home.jpg", width: 1200, height: 630, alt: "TrueCap vs Privy" },
    ],
  },
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
};

type Verdict = "truecap" | "privy" | "tie";
type Row = { feature: string; truecap: string; privy: string; winner: Verdict };

const MATRIX: Row[] = [
  {
    feature: "Primary purpose",
    truecap: "Per-deal underwriting calculator",
    privy: "Investor MLS search + filtering",
    winner: "tie",
  },
  {
    feature: "Cap rate / CoC / DSCR analysis",
    truecap: "Yes — full engine, free tier",
    privy: "Listing-level cap rate estimates",
    winner: "truecap",
  },
  {
    feature: "10-year projection",
    truecap: "Pro — rent + expense + appreciation",
    privy: "Not modeled",
    winner: "truecap",
  },
  {
    feature: "Starting values (rent/rate/tax)",
    truecap: "HUD rent + FRED rate + manual local property tax",
    privy: "MLS-pulled property data",
    winner: "truecap",
  },
  {
    feature: "Investor-filtered MLS search",
    truecap: "No",
    privy: "Yes — cash flow, rehab, motivated",
    winner: "privy",
  },
  {
    feature: "Sale + rent comps",
    truecap: "One free lookup; Pro includes 50 per month; no AVM",
    privy: "Yes — MLS-derived comp set",
    winner: "privy",
  },
  {
    feature: "Motivated-seller flagging on MLS",
    truecap: "No",
    privy: "Yes — DOM + price reduction signals",
    winner: "privy",
  },
  {
    feature: "Off-market lead generation",
    truecap: "No",
    privy: "Limited (MLS-focused)",
    winner: "privy",
  },
  {
    feature: "Mortgage + financing math",
    truecap: "Yes — PITI + DSCR + amortization",
    privy: "Not included",
    winner: "truecap",
  },
  {
    feature: "Free tier",
    truecap: "Yes — core cap rate, CoC, DSCR, and cash flow",
    privy: "Trial only; paid from ~$99/mo (as of 2026)",
    winner: "truecap",
  },
  {
    feature: "Pricing (entry tier)",
    truecap: "Free core; paid Pro — see live pricing",
    privy: "~$99/mo + setup fees",
    winner: "truecap",
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
      "Privy is investor-focused MLS search. TrueCap underwrites the deals once you've found them. Honest comparison and how investors use both.",
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
            Privy is an investor-focused MLS search tool — pull on-market
            listings filtered by investor criteria like cash flow potential,
            rehab condition, days on market, and motivated-seller signals.
            TrueCap is the underwriting calculator that runs the per-deal math
            on whatever Privy surfaces. Different jobs in the same workflow.
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
                  You want investor-specific filters (cash flow, rehab
                  condition, motivated signals).
                </li>
                <li>
                  You don&apos;t have direct MLS access through an agent
                  license.
                </li>
                <li>
                  You&apos;re doing fix-and-flip or BRRRR and need
                  rehab-condition flagging.
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
            Privy details based on publicly available product info as of 2026.
            See{" "}
            <a
              href="https://www.privy.pro/"
              target="_blank"
              rel="noopener"
              className="tc-link"
            >
              privy.pro
            </a>{" "}
            for their current state.
          </p>
        </Section>

        {/* Complementary workflow */}
        <Section aria-labelledby="vs-fit-heading">
          <SectionHeading id="vs-fit-heading">
            How active investors use both
          </SectionHeading>
          <div className={VS_PROSE}>
            <ol>
              <li>
                <strong>Search MLS in Privy with investor filters.</strong> Filter
                by cap rate threshold, rehab condition, DOM, price reductions,
                etc.
              </li>
              <li>
                <strong>Surface a property worth a closer look.</strong> Privy
                shows you a listing-level cap rate estimate based on its
                assumptions.
              </li>
              <li>
                <strong>Underwrite in TrueCap.</strong> Paste the address to start
                from editable HUD rent and FRED rate benchmarks, then enter local
                property tax manually. Replace the rent benchmark with your best
                local comp.
              </li>
              <li>
                <strong>
                  Compare TrueCap&apos;s cap rate to Privy&apos;s estimate.
                </strong>{" "}
                If they diverge, dig into the assumptions — usually the difference
                is rent (Privy uses optimistic rent) or expense ratios.
              </li>
              <li>
                <strong>Review the Offer Ceiling in TrueCap Pro.</strong> It works
                backward from your selected target return; verify the material
                assumptions before recording a decision.
              </li>
            </ol>
            <p>
              Curious how TrueCap lands on a different number than Privy?{" "}
              <Link
                href="/blog/how-to-calculate-cap-rate"
                className="tc-link"
              >
                How to calculate cap rate
              </Link>{" "}
              shows the formula line by line, and{" "}
              <Link
                href="/blog/what-is-a-good-cap-rate"
                className="tc-link"
              >
                what counts as a good cap rate
              </Link>{" "}
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

        <ComparisonFaq competitorName="Privy" items={PRIVY_FAQ} />

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
            <RelatedContent kind="vs" slug="privy" />
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

const PRIVY_FAQ: FaqItem[] = [
  {
    question: "Is TrueCap a Privy alternative?",
    answer: (
      <>
        No — they solve different problems. Privy is investor-focused MLS search
        and filtering. TrueCap is per-deal underwriting once you have an
        address. Many active MLS-sourcing investors use both.
      </>
    ),
  },
  {
    question: "Privy vs PropStream — which one?",
    answer: (
      <>
        Different focuses. Privy is on-market MLS data with investor filters.
        PropStream is off-market lead generation (skip-tracing, motivated-seller
        lists, direct mail). If you source through the MLS, Privy. If you source
        off-market via mail / cold call, PropStream. Some investors run both.
      </>
    ),
  },
  {
    question: "Why use Privy if I already have MLS access through an agent?",
    answer: (
      <>
        If you already have MLS access, Privy&apos;s value is more limited — its
        strength is the investor-specific filtering on top of MLS data, not the
        MLS data itself. If you&apos;re comfortable using Realtor.com / Zillow /
        your agent&apos;s MLS portal and applying investor logic mentally, Privy
        may not add enough.
      </>
    ),
  },
  {
    question: "Does Privy underwrite deals?",
    answer: (
      <>
        Sort of — it shows listing-level cap rate estimates and rehab condition
        flags, while TrueCap adds editable financing, DSCR, sensitivity, and a
        cash-flow and equity projection for a shortlisted property. TrueCap does
        not currently expose a tax-specific module.
      </>
    ),
  },
  {
    question: "Is Privy worth $99/month?",
    answer: (
      <>
        Depends on volume. If you&apos;re actively sourcing MLS deals across
        multiple markets and don&apos;t have agent-grade MLS access, the
        investor filters pay off in time saved. If you have a great agent and
        look at 1-3 deals a month, Privy is overkill — TrueCap&apos;s free tier
        + your agent&apos;s MLS access cover the workflow.
      </>
    ),
  },
];

