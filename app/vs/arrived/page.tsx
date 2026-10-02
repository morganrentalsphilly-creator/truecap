/**
 * /vs/arrived — competitor comparison landing page.
 *
 * Target queries: "arrived alternative", "arrived homes review", "arrived vs fundrise", "fractional rental investing", "passive real estate investing".
 * Arrived (formerly Arrived Homes) sells shares of individual rental homes and
 * of its funds. A different model from TrueCap entirely.
 *
 * Every Arrived statement on this page was checked against Arrived's own pages
 * as rendered on 2026-10-02 (arrived.com, its how-it-works article and its
 * help-center articles on the minimum, dividends, fees and the secondary
 * market). The TL;DR sentence about depreciation and a 1031 exchange is the
 * approved wording: the page makes no other tax statement about Arrived.
 * Change an Arrived fact only with the vendor page open, and change the
 * social card with it.
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
  title: "Arrived vs TrueCap (2026): Shares vs Ownership",
  description:
    "Arrived sells shares in rental properties. TrueCap underwrites whole properties you'd buy yourself. Two different investing models.",
  keywords: [
    "arrived alternative",
    "arrived homes review",
    "arrived vs fundrise",
    "fractional rental investing",
    "passive real estate investing",
  ],
  alternates: { canonical: "/vs/arrived" },
  openGraph: {
    title: "Arrived vs TrueCap (2026): Shares vs Ownership",
    description:
      "Arrived sells shares of rental homes and of its funds. TrueCap underwrites whole rental properties you buy and own directly, from assumptions you can edit.",
    url: "/vs/arrived",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

type Verdict = "truecap" | "arrived" | "tie";
type Row = { feature: string; truecap: string; arrived: string; winner: Verdict };

const MATRIX: Row[] = [
  { feature: "Ownership model", truecap: "Direct ownership of whole property", arrived: "Shares of an individual rental property or of an Arrived fund", winner: "tie" },
  { feature: "Cap rate / CoC / DSCR analysis", truecap: "Yes — full engine, free tier", arrived: "Not applicable: you buy shares, and Arrived selects and manages the property", winner: "truecap" },
  { feature: "10-year projection", truecap: "Pro — rent + expense + appreciation", arrived: "Each offering has its own financials and offering documents", winner: "tie" },
  { feature: "Deal score (0–100)", truecap: "Free — 0–100 score with factor breakdown", arrived: "Not applicable", winner: "truecap" },
  { feature: "Minimum to start", truecap: "A down payment on a whole property", arrived: "$100 minimum investment", winner: "arrived" },
  { feature: "Time commitment", truecap: "Active — you find, underwrite, close, manage (or hire PM)", arrived: "Passive: Arrived manages the properties", winner: "arrived" },
  { feature: "Liquidity", truecap: "Low — property sale takes months", arrived: "Hold until Arrived sells the property, or sell shares to other Arrived investors", winner: "tie" },
  { feature: "Control over property choice", truecap: "Total — you pick everything", arrived: "Curated by Arrived; you pick from their listings", winner: "truecap" },
  { feature: "Cash flow vs growth", truecap: "You design — fixed-rate mortgage, cash-flow focused", arrived: "Monthly dividends, plus potential appreciation when a property is sold", winner: "tie" },
  { feature: "Tax reporting", truecap: "Not modeled in TrueCap; direct owners arrange taxpayer-specific reporting", arrived: "Arrived prepares tax forms for its investors", winner: "tie" },
  { feature: "Pricing / fees", truecap: "Free core; paid Pro — see live pricing", arrived: "A one-time sourcing fee in the offering price, plus a quarterly AUM fee that varies by product", winner: "tie" },
];

export default function VsArrivedPage() {
  const siteUrl = getSiteUrl();
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Arrived vs TrueCap (2026): Shares vs Ownership",
    url: `${siteUrl}/vs/arrived`,
    description:
      "Arrived sells shares in rental properties. TrueCap underwrites whole properties you'd buy yourself. Two different investing models.",
    dateModified: lastmodFor("/vs/arrived"),
    publisher: { "@id": `${siteUrl}/#organization` },
  };

  return (
    // relative + overflow-x-clip, as on the homepage and the /vs hub: no
    // descendant can make the phone page scroll sideways.
    <div className="relative overflow-x-clip">
      <Header initialUser={null} initialEntitlements={null} />
      <JsonLd data={structuredData} />
      <VsBreadcrumbSchema vsPath="/vs/arrived" pageName="TrueCap vs Arrived" />
      <main id="main" tabIndex={-1} className="min-w-0 outline-none">
        <VsHero>
          <h1 className={VS_H1}>
            TrueCap vs Arrived:{" "}
            direct ownership vs fractional shares
          </h1>
          <BlogByline />
          <p className={VS_LEDE}>
            Arrived is a real estate investing platform: you buy shares of individual rental homes or of its funds, with a $100 minimum investment, and Arrived selects, manages and eventually sells the properties. TrueCap is the underwriting calculator for investors buying rental properties directly with their own financing. The ownership models are different, and if you are deciding between active and passive real estate you may be weighing both.
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
                <li>You want direct ownership and control of the property.</li>
                <li>You want direct-property control and will verify depreciation, interest, and any 1031 eligibility with tax professionals.</li>
                <li>You&apos;re willing to do the underwriting + sourcing work yourself.</li>
                <li>You have $20k+ in capital and want to deploy in one property at a time.</li>
              </ul>
            </div>
            <div className="min-w-0">
              <h3 className={VS_TLDR_LABEL}>
                Use Arrived when
              </h3>
              <ul className={VS_TLDR_LIST}>
                <li>You want passive exposure to rental income without doing the work.</li>
                <li>You want to start with $100 rather than a down payment.</li>
                <li>You&apos;re fine without direct control of depreciation or a 1031 exchange.</li>
                <li>You want diversification across multiple properties without buying them.</li>
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
              head={["Feature", "TrueCap", "Arrived"]}
              rows={MATRIX.map((row) => ({
                label: row.feature,
                truecap: row.truecap,
                competitor: row.arrived,
                winner: row.winner === "arrived" ? "competitor" : row.winner,
              }))}
            />
          </ScrollX>
          <p className={VS_SOURCES}>
            Arrived details were checked against its own pages in October 2026:
            the{" "}
            <a href="https://help.arrived.com/en/articles/4496443-what-is-the-minimum-initial-investment" target="_blank" rel="noopener" className="tc-link">
              minimum investment
            </a>
            , the{" "}
            <a href="https://help.arrived.com/en/articles/6634449-when-can-i-expect-a-dividend" target="_blank" rel="noopener" className="tc-link">
              dividend schedule
            </a>{" "}
            and the{" "}
            <a href="https://help.arrived.com/en/articles/10263157-breaking-down-arrived-fees-what-you-need-to-know" target="_blank" rel="noopener" className="tc-link">
              fees
            </a>
            . See{" "}
            <a href="https://arrived.com" target="_blank" rel="noopener" className="tc-link">
              arrived.com
            </a>{" "}
            for current offerings and risks.
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
                <strong>If you want full control → direct ownership.</strong> TrueCap helps you underwrite the property; you arrange financing + take ownership.
              </li>
              <li>
                <strong>If you want passive exposure with minimal effort → Arrived.</strong> Pick properties or funds on Arrived, collect monthly dividends once a property is earning income, and let Arrived manage it.
              </li>
              <li>
                <strong>If you want both → split the portfolio.</strong> You can hold direct properties and Arrived shares side by side. TrueCap helps with the direct side; Arrived handles the passive side.
              </li>
            </ul>
            <p>
              Prefer to underwrite a whole property yourself? The free{" "}
              <IntentPrefetchLink href="/tools/1-percent-rule-calculator" className="tc-link">
                1% rule calculator
              </IntentPrefetchLink>{" "}
              gives you a pass/fail read on a single listing; when you want the{" "}
              <IntentPrefetchLink href="/glossary/cap-rate" className="tc-link">
                cap rate
              </IntentPrefetchLink>{" "}
              and monthly cash flow behind that screen, the full{" "}
              <Link href="/analyze" prefetch={false} className="tc-link">
                TrueCap analyzer
              </Link>{" "}
              derives them from an address. Our guide on{" "}
              <IntentPrefetchLink href="/blog/how-to-underwrite-a-rental-property-in-60-seconds" className="tc-link">
                60-second underwriting
              </IntentPrefetchLink>{" "}
              walks through the workflow end-to-end.
            </p>
          </div>
        </Section>

        <ComparisonFaq competitorName="Arrived" items={ARRIVED_FAQ} reviewedDate="October 2026" />

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
            <RelatedContent kind="vs" slug="arrived" />
            <AuthorBio />

            <footer className="mt-10 border-t border-border pt-6">
              <p className="text-lg font-semibold">Other comparisons:</p>
              <ul className="mt-2 grid gap-x-8 sm:grid-cols-2">
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
                    href="/vs/dealcheck"
                    className={VS_LINK_ROW}
                  >
                    TrueCap vs DealCheck
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

const ARRIVED_FAQ: FaqItem[] = [
  {
    question: "Is TrueCap an Arrived alternative?",
    answer: (
      <>
        Not really — they&apos;re entirely different ownership models. Arrived sells shares of individual rental homes and of its funds (passive). TrueCap is the underwriting calculator for investors buying whole rental properties directly (active). The decision isn&apos;t which to use — it&apos;s which investing model fits you.
      </>
    ),
  },
  {
    question: "Arrived vs Fundrise — which one?",
    answer: (
      <>
        They work at different levels. On Arrived you buy shares of individual rental homes or of its funds, with a $100 minimum investment. Fundrise offers funds it manages across real estate, private credit and venture capital, and says you can start with as little as $10. TrueCap does not rank them: see{" "}
        <a href="https://arrived.com" target="_blank" rel="noopener" className="tc-link">
          arrived.com
        </a>{" "}
        and{" "}
        <a href="https://fundrise.com/how-it-works" target="_blank" rel="noopener" className="tc-link">
          Fundrise&apos;s how-it-works page
        </a>{" "}
        for current offerings, fees and risks.
      </>
    ),
  },
  {
    question: "Why would I buy a rental directly when I could use Arrived?",
    answer: (
      <>
        Three reasons: control (you pick the property + market), potentially different direct-ownership tax treatment, and cash-flow control. Direct ownership does not guarantee that every deduction or a 1031 exchange applies; eligibility depends on the property, transaction, and taxpayer, so verify it with licensed tax and legal professionals. Tradeoff: you do the underwriting + management work (or pay a PM).
      </>
    ),
  },
  {
    question: "Why would I use Arrived instead of buying a rental directly?",
    answer: (
      <>
        Three reasons: a low minimum ($100, against a down payment for a direct purchase), no sourcing or management work (Arrived manages the properties), and diversification (you can spread your capital across several properties without buying each one). Tradeoff: you give up direct control of the property.
      </>
    ),
  },
  {
    question: "Can I use TrueCap to evaluate an Arrived property?",
    answer: (
      <>
        Not directly — Arrived shares aren&apos;t an underwriting problem in TrueCap&apos;s sense (you&apos;re not modeling cap rate, DSCR, or your own financing). TrueCap is for direct ownership where you control the inputs. For Arrived offerings, read the financials and offering documents Arrived publishes for each one, and weigh them against your own goals.
      </>
    ),
  },
];

