/**
 * /vs/fundrise — competitor comparison landing page.
 *
 * Target queries: "fundrise alternative", "fundrise vs arrived", "fundrise review", "fundrise pricing", "passive real estate investing".
 * Fundrise is an investment platform whose funds hold private real estate,
 * private credit and venture capital. Its own site calls its registered real
 * estate funds interval funds, not non-traded REITs, so this page does not
 * use "REIT" for Fundrise anywhere: title, meta, H1, lede, matrix and FAQ
 * describe it the same way, in Fundrise's words.
 *
 * Every Fundrise statement on this page was checked against fundrise.com as
 * rendered on 2026-10-02 (home, how it works, offerings, client returns). The
 * page states no return figure, no tax treatment and no account tiers for
 * Fundrise: it links Fundrise's own pages instead. Do not add one. Change a
 * Fundrise fact only with the vendor page open, and change the social card
 * with it.
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
  title: "Fundrise vs TrueCap (2026): Funds vs Ownership",
  description:
    "Fundrise offers funds that hold private real estate, private credit and venture capital. TrueCap underwrites whole properties you'd buy yourself.",
  keywords: [
    "fundrise alternative",
    "fundrise vs arrived",
    "fundrise review",
    "fundrise pricing",
    "passive real estate investing",
  ],
  alternates: { canonical: "/vs/fundrise" },
  openGraph: {
    title: "Fundrise vs TrueCap (2026): Funds vs Ownership",
    description:
      "Fundrise offers funds that hold private real estate, private credit and venture capital. TrueCap underwrites whole rental properties you buy and own directly.",
    url: "/vs/fundrise",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

type Verdict = "truecap" | "fundrise" | "tie";
type Row = { feature: string; truecap: string; fundrise: string; winner: Verdict };

const MATRIX: Row[] = [
  { feature: "Ownership model", truecap: "Direct ownership of whole property", fundrise: "Shares of funds that Fundrise manages", winner: "tie" },
  { feature: "Cap rate / CoC / DSCR analysis", truecap: "Yes — full engine, free tier", fundrise: "Not applicable: you buy fund shares, not a single property", winner: "truecap" },
  { feature: "10-year projection", truecap: "Pro — per-property rent + expense + appreciation", fundrise: "Fundrise publishes its clients' past returns on its own site", winner: "tie" },
  { feature: "Deal score (0–100)", truecap: "Free — 0–100 score with factor breakdown", fundrise: "Not applicable", winner: "truecap" },
  { feature: "Minimum to start", truecap: "A down payment on a whole property", fundrise: "$10", winner: "fundrise" },
  { feature: "Time commitment", truecap: "Active — you source, underwrite, close, manage (or hire)", fundrise: "Passive: you choose a portfolio strategy and Fundrise manages the funds", winner: "fundrise" },
  { feature: "Liquidity", truecap: "Low — sale takes months", fundrise: "Quarterly redemptions, subject to limitations", winner: "tie" },
  { feature: "Diversification", truecap: "One property at a time", fundrise: "Across the assets its funds hold: real estate, private credit and venture capital", winner: "fundrise" },
  { feature: "Control over property choice", truecap: "Total", fundrise: "You choose a plan or a fund; Fundrise selects the assets", winner: "truecap" },
  { feature: "Ownership tax treatment", truecap: "Direct-property rules may allow depreciation, interest, or 1031; TrueCap does not determine eligibility", fundrise: "See Fundrise's own tax documents", winner: "tie" },
  { feature: "Cash flow model", truecap: "You design — fixed-rate mortgage, your CF goes to you", fundrise: "See Fundrise's site for how its funds pay distributions", winner: "tie" },
  { feature: "Pricing / fees", truecap: "Free core; paid Pro — see live pricing", fundrise: "0.15% annual advisory fee, plus a 0.85% annual asset management fee paid by the funds in its standard portfolios", winner: "tie" },
  { feature: "Free tier (for analysis)", truecap: "Yes — core cap rate, CoC, DSCR, and cash flow", fundrise: "Not applicable", winner: "truecap" },
];

export default function VsFundrisePage() {
  const siteUrl = getSiteUrl();
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Fundrise vs TrueCap (2026): Funds vs Ownership",
    url: `${siteUrl}/vs/fundrise`,
    description:
      "Fundrise offers funds that hold private real estate, private credit and venture capital. TrueCap underwrites whole properties you'd buy yourself.",
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
            direct ownership vs fund shares
          </h1>
          <BlogByline />
          <p className={VS_LEDE}>
            Fundrise is an investment platform: you buy shares of funds it manages, which hold private real estate, private credit and venture capital. TrueCap is the underwriting calculator for investors buying rental properties directly with their own financing. The investing models are different, and if you are deciding between active and passive real estate you may be weighing both.
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
                <li>You want direct control of the property and the financing.</li>
                <li>You want direct-property control and will verify depreciation, interest, and any 1031 eligibility with tax professionals.</li>
                <li>You have the capital for a down payment and want to deploy it in one property at a time.</li>
                <li>You&apos;re willing to do the underwriting + management work yourself.</li>
              </ul>
            </div>
            <div className="min-w-0">
              <h3 className={VS_TLDR_LABEL}>
                Use Fundrise when
              </h3>
              <ul className={VS_TLDR_LIST}>
                <li>You want passive real estate exposure with zero work.</li>
                <li>You want diversification across asset classes (real estate, private credit and venture capital).</li>
                <li>You want to start with as little as $10 rather than a down payment.</li>
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
            Fundrise&apos;s minimum, fees and redemption terms were checked
            against its{" "}
            <a href="https://fundrise.com/how-it-works" target="_blank" rel="noopener" className="tc-link">
              how-it-works page
            </a>{" "}
            in October 2026. This page repeats no return figure: for past
            returns see{" "}
            <a href="https://fundrise.com/client-returns" target="_blank" rel="noopener" className="tc-link">
              Fundrise&apos;s client returns page
            </a>
            , and for tax documents and current offerings see{" "}
            <a href="https://fundrise.com" target="_blank" rel="noopener" className="tc-link">
              fundrise.com
            </a>
            .
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
                <strong>If you want full control → direct ownership.</strong> TrueCap helps you underwrite; you arrange financing + take title.
              </li>
              <li>
                <strong>If you want passive exposure with low minimums → Fundrise.</strong> Choose a portfolio strategy, set up recurring investments if you want them, and Fundrise manages the funds.
              </li>
              <li>
                <strong>If you want both → split the portfolio.</strong> TrueCap helps with the direct side.
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

        <ComparisonFaq competitorName="Fundrise" items={FUNDRISE_FAQ} reviewedDate="October 2026" />

        {/* Pricing CTA */}
        <CloseSection
          headingId="vs-close-heading"
          heading={<>Underwrite the next deal — free.</>}
          lede={
            <>
              TrueCap free covers cap rate, CoC, DSCR, and monthly cash flow.
              Your first complete decision also includes the Offer Ceiling.
              Pro adds 10-year cash-flow and equity projections, sensitivity,
              the Offer Ceiling, co-branded share links and PDF reports; see live pricing for current terms.
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
        Not really — completely different investing models. Fundrise offers shares of funds it manages, which hold private real estate, private credit and venture capital (passive). TrueCap is the underwriting calculator for investors buying rentals directly (active). The decision isn&apos;t which to use — it&apos;s which investing model fits you.
      </>
    ),
  },
  {
    question: "Fundrise vs Arrived — which one?",
    answer: (
      <>
        They work at different levels. Fundrise offers funds it manages across real estate, private credit and venture capital, and says you can start with as little as $10. On Arrived you buy shares of individual rental homes or of its funds, with a $100 minimum investment. TrueCap does not rank them: see{" "}
        <a href="https://fundrise.com/how-it-works" target="_blank" rel="noopener" className="tc-link">
          Fundrise&apos;s how-it-works page
        </a>{" "}
        and{" "}
        <a href="https://arrived.com" target="_blank" rel="noopener" className="tc-link">
          arrived.com
        </a>{" "}
        for current offerings, fees and risks.
      </>
    ),
  },
  {
    question: "Is Fundrise really passive?",
    answer: (
      <>
        Yes, in the sense that Fundrise manages the funds and the assets in them. You choose a portfolio strategy or a fund and contribute capital. The tradeoff is that you do not choose individual properties, and fees apply: Fundrise lists a 0.15% annual advisory fee, says the funds in its standard portfolios pay a 0.85% annual asset management fee, and says its offering circulars describe all fees. See{" "}
        <a href="https://fundrise.com/how-it-works" target="_blank" rel="noopener" className="tc-link">
          Fundrise&apos;s how-it-works page
        </a>{" "}
        for the current terms.
      </>
    ),
  },
  {
    question: "Why would I buy a rental directly when I could just put money in Fundrise?",
    answer: (
      <>
        Two reasons: control (you pick the property + financing) and cash-flow control. Tradeoff: real work or paying a PM.
      </>
    ),
  },
  {
    question: "Can I compare Fundrise's returns with a TrueCap analysis?",
    answer: (
      <>
        Not directly. TrueCap models per-property metrics (cap rate, DSCR, cash flow), not fund returns. A fund&apos;s return and a direct rental&apos;s cash-on-cash return are different measures and are not directly comparable. Fundrise publishes its clients&apos; past returns on{" "}
        <a href="https://fundrise.com/client-returns" target="_blank" rel="noopener" className="tc-link">
          its client returns page
        </a>
        ; TrueCap repeats no figure from it. Evaluate each on its own terms.
      </>
    ),
  },
];

