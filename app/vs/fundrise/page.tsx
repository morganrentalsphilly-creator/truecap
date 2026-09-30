/**
 * /vs/fundrise — competitor comparison landing page.
 *
 * Target queries: "fundrise alternative", "fundrise vs arrived", "fundrise review", "fundrise pricing", "passive real estate investing".
 * Fundrise is a non-traded REIT / fractional real-estate investing platform — diversified across commercial, multifamily, residential. Direct competitor to Arrived. Investors evaluate it vs direct ownership.
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
import { ComparisonFaq, type FaqItem } from "@/components/marketing/comparison-faq";
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
  title: "Fundrise vs TrueCap (2026): REIT vs Ownership",
  description:
    "Fundrise is a non-traded REIT for passive real estate exposure. TrueCap underwrites whole properties you'd buy yourself. Two different investing models.",
  keywords: [
    "fundrise alternative",
    "fundrise vs arrived",
    "fundrise review",
    "fundrise pricing",
    "passive real estate investing",
  ],
  alternates: { canonical: "/vs/fundrise" },
  openGraph: {
    title: "Fundrise vs TrueCap (2026): REIT vs Ownership",
    description:
      "Fundrise = non-traded REIT shares (passive). TrueCap = underwriting whole properties you own directly. Different models.",
    url: "/vs/fundrise",
    type: "website",
    images: [{ url: "/home.jpg", width: 1200, height: 630, alt: "TrueCap vs Fundrise" }],
  },
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
};

type Verdict = "truecap" | "fundrise" | "tie";
type Row = { feature: string; truecap: string; fundrise: string; winner: Verdict };

const MATRIX: Row[] = [
  { feature: "Ownership model", truecap: "Direct ownership of whole property", fundrise: "Shares in diversified REIT funds", winner: "tie" },
  { feature: "Cap rate / CoC / DSCR analysis", truecap: "Yes — full engine, free tier", fundrise: "Not applicable (no individual property)", winner: "truecap" },
  { feature: "10-year projection", truecap: "Pro — per-property rent + expense + appreciation", fundrise: "Fund-level forward returns (historical 8-12%)", winner: "tie" },
  { feature: "Deal score (0–100)", truecap: "Free — 0–100 score with factor breakdown", fundrise: "Not applicable", winner: "truecap" },
  { feature: "Minimum to start", truecap: "Down payment on a whole property (~$20-50k)", fundrise: "$10 (Starter), $1k+ for higher tiers", winner: "fundrise" },
  { feature: "Time commitment", truecap: "Active — you source, underwrite, close, manage (or hire)", fundrise: "Passive — Fundrise allocates capital", winner: "fundrise" },
  { feature: "Liquidity", truecap: "Low — sale takes months", fundrise: "Limited — quarterly redemption windows with potential gates", winner: "fundrise" },
  { feature: "Diversification", truecap: "One property at a time", fundrise: "Across many properties + asset types", winner: "fundrise" },
  { feature: "Control over property choice", truecap: "Total", fundrise: "None — Fundrise picks deals", winner: "truecap" },
  { feature: "Ownership tax treatment", truecap: "Direct-property rules may allow depreciation, interest, or 1031; TrueCap does not determine eligibility", fundrise: "Some depreciation pass-through (K-1 funds); no 1031 from shares", winner: "tie" },
  { feature: "Cash flow model", truecap: "You design — fixed-rate mortgage, your CF goes to you", fundrise: "Quarterly distributions from fund returns", winner: "tie" },
  { feature: "Pricing / fees", truecap: "Free core; paid Pro — see live pricing", fundrise: "0.15% advisory + 0.85% fund management (1% all-in, plus expense ratios)", winner: "tie" },
  { feature: "Free tier (for analysis)", truecap: "Yes — core cap rate, CoC, DSCR, and cash flow", fundrise: "Not applicable", winner: "truecap" },
];

export default function VsFundrisePage() {
  const siteUrl = getSiteUrl();
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Fundrise vs TrueCap (2026): REIT vs Ownership",
    url: `${siteUrl}/vs/fundrise`,
    description:
      "Fundrise is a non-traded REIT for passive real estate exposure. TrueCap underwrites whole properties you'd buy yourself. Two very different investing models.",
    dateModified: lastmodFor("/vs/fundrise"),
    publisher: { "@id": `${siteUrl}/#organization` },
  };

  return (
    // relative + overflow-x-clip, as on the homepage and the /vs hub: no
    // descendant can make the phone page scroll sideways.
    <div className="relative overflow-x-clip">
      <Header initialUser={null} initialEntitlements={null} />
      <JsonLd data={structuredData} />
      <VsBreadcrumbSchema vsPath="/vs/fundrise" pageName="TrueCap vs Fundrise" />
      <main id="main" tabIndex={-1} className="min-w-0 outline-none">
        <VsHero>
          <h1 className={VS_H1}>
            TrueCap vs Fundrise:{" "}
            direct ownership vs REIT shares
          </h1>
          <BlogByline />
          <p className={VS_LEDE}>
            Fundrise is one of the most popular non-traded REITs — pool your money with thousands of other investors into diversified real estate funds (commercial + multifamily + residential). TrueCap is the underwriting calculator for investors buying rental properties directly with their own financing. Completely different investing models — but investors deciding between active and passive real estate evaluate both.
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
                <li>You want direct control of the property and the financing.</li>
                <li>You want direct-property control and will verify depreciation, interest, and any 1031 eligibility with tax professionals.</li>
                <li>You have $20k+ to deploy in one property at a time.</li>
                <li>You&apos;re willing to do the underwriting + management work yourself.</li>
              </ul>
            </div>
            <div className="min-w-0">
              <h3 className={VS_TLDR_LABEL}>
                Use Fundrise when
              </h3>
              <ul className={VS_TLDR_LIST}>
                <li>You want passive real estate exposure with zero work.</li>
                <li>You want diversification across asset classes (commercial + multifamily + residential).</li>
                <li>You only have $10-1k to start, not $20k+.</li>
                <li>You&apos;re fine giving up depreciation control and 1031 for simplicity.</li>
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
            Side-by-side on every dimension that matters for a comparison-shopping investor.
          </p>
          <ScrollX label="Comparison table" className="mt-8 max-w-5xl">
            <VsMatrixTable
              head={["Feature", "TrueCap", "Fundrise"]}
              rows={MATRIX.map((row) => ({
                label: row.feature,
                truecap: row.truecap,
                competitor: row.fundrise,
                winner: row.winner === "fundrise" ? "competitor" : row.winner,
              }))}
            />
          </ScrollX>
          <p className={VS_SOURCES}>
            Fundrise details based on publicly available product info as of 2026.
            See{" "}
            <a href="https://fundrise.com" target="_blank" rel="noopener" className="tc-link">
              fundrise.com
            </a>{" "}
            for their current state.
          </p>
        </Section>

        {/* Complementary workflow */}
        <Section aria-labelledby="vs-fit-heading">
          <SectionHeading id="vs-fit-heading">
            When to use which (or both)
          </SectionHeading>
          <div className={VS_PROSE}>
            <ul>
              <li>
                <strong>If you want full control + tax benefits → direct ownership.</strong> TrueCap helps you underwrite; you arrange financing + take title.
              </li>
              <li>
                <strong>If you want passive exposure with low minimums → Fundrise.</strong> Pick a Fundrise plan, set a recurring contribution, collect quarterly distributions.
              </li>
              <li>
                <strong>If you want both → split the portfolio.</strong> Most diversified investors keep 1-3 direct rentals (cash flow + tax) AND some money in Fundrise (diversification + passive). TrueCap helps with the direct side.
              </li>
            </ul>
            <p>
              Curious what underwriting a direct rental actually involves? Start
              with the{" "}
              <IntentPrefetchLink href="/tools" className="tc-link">
                free real estate calculators
              </IntentPrefetchLink>
              , or run a real address through the full{" "}
              <Link href="/analyze" prefetch={false} className="tc-link">
                TrueCap analyzer
              </Link>{" "}
              for cap rate, DSCR, and cash flow. Our guide on{" "}
              <IntentPrefetchLink href="/blog/how-to-underwrite-a-rental-property-in-60-seconds" className="tc-link">
                60-second underwriting
              </IntentPrefetchLink>{" "}
              walks through the workflow end-to-end.
            </p>
          </div>
        </Section>

        <ComparisonFaq competitorName="Fundrise" items={FUNDRISE_FAQ} />

        {/* Pricing CTA */}
        <CloseSection
          headingId="vs-close-heading"
          heading={<>Underwrite the next deal — free.</>}
          lede={
            <>
              TrueCap free covers cap rate, CoC, DSCR, NCF, and monthly cash flow.
              Pro adds 10-year cash-flow and equity projections, sensitivity,
              Offer Ceiling, co-branded share links, and PDF reports with Pro; see live pricing for current terms.
              No card to start.
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
            <RelatedContent kind="vs" slug="fundrise" />
            <AuthorBio />

            <footer className="mt-10 border-t border-border pt-6">
              <p className="text-lg font-semibold">Other comparisons:</p>
              <ul className="mt-2 grid gap-x-8 sm:grid-cols-2">
                <li>
                  <IntentPrefetchLink
                    href="/vs/arrived"
                    className={VS_LINK_ROW}
                  >
                    TrueCap vs Arrived
                  </IntentPrefetchLink>
                </li>
                <li>
                  <IntentPrefetchLink
                    href="/vs/roofstock"
                    className={VS_LINK_ROW}
                  >
                    TrueCap vs Roofstock
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

const FUNDRISE_FAQ: FaqItem[] = [
  {
    question: "Is TrueCap a Fundrise alternative?",
    answer: (
      <>
        Not really — completely different investing models. Fundrise sells shares in diversified non-traded REITs (passive). TrueCap is the underwriting calculator for investors buying rentals directly (active). The decision isn&apos;t which to use — it&apos;s which investing model fits you.
      </>
    ),
  },
  {
    question: "Fundrise vs Arrived — which one?",
    answer: (
      <>
        Both are passive real estate platforms but with different scopes. Arrived focuses on single-family rentals at the property level (you buy shares of specific houses, $100 minimum). Fundrise is more diversified across commercial + multifamily + residential at the fund level ($10 minimum). For SFR exposure: Arrived. For diversified RE exposure: Fundrise.
      </>
    ),
  },
  {
    question: "Is Fundrise really passive?",
    answer: (
      <>
        Yes — Fundrise handles everything (acquisition, financing, management, distributions). You contribute capital + collect quarterly distributions. The tradeoff is you give up control over individual property decisions and pay ~1% in fees plus underlying expense ratios.
      </>
    ),
  },
  {
    question: "Why would I buy a rental directly when I could just put money in Fundrise?",
    answer: (
      <>
        Three reasons: control (you pick the property + financing), potentially different direct-ownership tax treatment, and cash-flow control. Direct ownership does not guarantee that every deduction or a 1031 exchange applies; eligibility depends on the property, transaction, and taxpayer, so verify it with licensed tax and legal professionals. Tradeoff: real work or paying a PM.
      </>
    ),
  },
  {
    question: "Can I use Fundrise's projected returns in TrueCap?",
    answer: (
      <>
        Not directly — TrueCap models per-property metrics (cap rate, DSCR, cash flow), not REIT fund returns. Fundrise&apos;s historical 8-12% blended returns aren&apos;t comparable to a direct rental&apos;s cash-on-cash because the leverage, tax treatment, and cash-flow timing are different. Evaluate each on its own terms.
      </>
    ),
  },
];

