/**
 * /vs/arrived — competitor comparison landing page.
 *
 * Target queries: "arrived alternative", "arrived homes review", "arrived vs fundrise", "fractional rental investing", "passive real estate investing".
 * Arrived (formerly Arrived Homes) is a fractional rental investing platform — buy shares of rental properties starting at $100. Different model than TrueCap entirely; investors evaluate both when deciding whether to own real estate directly.
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
    "Arrived sells shares in rental properties. TrueCap underwrites whole properties you'd buy yourself. Two different investing models — honest comparison.",
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
      "Arrived = fractional shares of rental properties. TrueCap = underwriting whole properties you own directly. Different models.",
    url: "/vs/arrived",
    type: "website",
    images: [{ url: "/home.jpg", width: 1200, height: 630, alt: "TrueCap vs Arrived" }],
  },
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
};

type Verdict = "truecap" | "arrived" | "tie";
type Row = { feature: string; truecap: string; arrived: string; winner: Verdict };

const MATRIX: Row[] = [
  { feature: "Ownership model", truecap: "Direct ownership of whole property", arrived: "Fractional shares of a property", winner: "tie" },
  { feature: "Cap rate / CoC / DSCR analysis", truecap: "Yes — full engine, free tier", arrived: "Not applicable (you don't own debt)", winner: "truecap" },
  { feature: "10-year projection", truecap: "Pro — rent + expense + appreciation", arrived: "Forward dividend + appreciation forecast", winner: "tie" },
  { feature: "Deal score (0–100)", truecap: "Free — 0–100 score with factor breakdown", arrived: "Not applicable", winner: "truecap" },
  { feature: "Minimum to start", truecap: "Down payment on a whole property (~$20-50k typical)", arrived: "$100 per share", winner: "arrived" },
  { feature: "Time commitment", truecap: "Active — you find, underwrite, close, manage (or hire PM)", arrived: "Passive — Arrived handles everything", winner: "arrived" },
  { feature: "Liquidity", truecap: "Low — property sale takes months", arrived: "Limited secondary market (Arrived's platform)", winner: "arrived" },
  { feature: "Control over property choice", truecap: "Total — you pick everything", arrived: "Curated by Arrived; you pick from their listings", winner: "truecap" },
  { feature: "Cash flow vs growth", truecap: "You design — fixed-rate mortgage, cash-flow focused", arrived: "Depends on Arrived's deals (mix of yield + appreciation)", winner: "tie" },
  { feature: "Tax reporting", truecap: "Not modeled in TrueCap; direct owners arrange taxpayer-specific reporting", arrived: "Investment-specific tax reporting", winner: "tie" },
  { feature: "Pricing / fees", truecap: "Free core; paid Pro — see live pricing", arrived: "1% AUM + property mgmt fees baked into yield", winner: "tie" },
];

export default function VsArrivedPage() {
  const siteUrl = getSiteUrl();
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Arrived vs TrueCap (2026): Shares vs Ownership",
    url: `${siteUrl}/vs/arrived`,
    description:
      "Arrived sells shares in rental properties. TrueCap underwrites whole properties you'd buy yourself. Two different investing models — honest comparison.",
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
            Arrived is a fractional rental investing platform — buy shares of single-family rentals starting at $100, with Arrived handling acquisition, financing, property management, and eventual sale. TrueCap is the underwriting calculator for investors buying rental properties directly with their own financing. Totally different ownership models — but investors deciding between active and passive real estate evaluate both.
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
                <li>You want to start with $100, not $20k+.</li>
                <li>You&apos;re fine giving up depreciation + 1031 for simplicity.</li>
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
            Arrived details based on publicly available product info as of 2026.
            See{" "}
            <a href="https://arrived.com" target="_blank" rel="noopener" className="tc-link">
              arrived.com
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
                <strong>If you want full control + tax benefits → direct ownership.</strong> TrueCap helps you underwrite the property; you arrange financing + take ownership.
              </li>
              <li>
                <strong>If you want passive exposure with minimal effort → Arrived.</strong> Pick properties from Arrived&apos;s marketplace; collect quarterly distributions; let them handle everything.
              </li>
              <li>
                <strong>If you want both → split the portfolio.</strong> Many investors run 1-3 direct properties (cash flow + tax benefits) AND keep some money in Arrived (diversification + passive). TrueCap helps with the direct side; Arrived handles the passive side.
              </li>
            </ul>
            <p>
              Prefer to underwrite a whole property yourself? The free{" "}
              <Link href="/tools/1-percent-rule-calculator" className="tc-link">
                1% rule calculator
              </Link>{" "}
              gives you a pass/fail read on a single listing; when you want the{" "}
              <Link href="/glossary/cap-rate" className="tc-link">
                cap rate
              </Link>{" "}
              and monthly cash flow behind that screen — the numbers Arrived
              abstracts away — the full{" "}
              <Link href="/analyze" prefetch={false} className="tc-link">
                TrueCap analyzer
              </Link>{" "}
              derives them from an address. Our guide on{" "}
              <Link href="/blog/how-to-underwrite-a-rental-property-in-60-seconds" className="tc-link">
                60-second underwriting
              </Link>{" "}
              walks through the workflow end-to-end.
            </p>
          </div>
        </Section>

        <ComparisonFaq competitorName="Arrived" items={ARRIVED_FAQ} />

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
            <RelatedContent kind="vs" slug="arrived" />
            <AuthorBio />

            <footer className="mt-10 border-t border-border pt-6">
              <p className="text-lg font-semibold">Other comparisons:</p>
              <ul className="mt-2 grid gap-x-8 sm:grid-cols-2">
                <li>
                  <Link
                    href="/vs/roofstock"
                    className={VS_LINK_ROW}
                  >
                    TrueCap vs Roofstock
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
                <li>
                  <Link
                    href="/vs/mashvisor"
                    className={VS_LINK_ROW}
                  >
                    TrueCap vs Mashvisor
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

const ARRIVED_FAQ: FaqItem[] = [
  {
    question: "Is TrueCap an Arrived alternative?",
    answer: (
      <>
        Not really — they&apos;re entirely different ownership models. Arrived sells fractional shares of single-family rentals (passive). TrueCap is the underwriting calculator for investors buying whole rental properties directly (active). The decision isn&apos;t which to use — it&apos;s which investing model fits you.
      </>
    ),
  },
  {
    question: "Arrived vs Fundrise — which one?",
    answer: (
      <>
        Fundrise is more diversified (commercial + multifamily + residential) and has been around longer. Arrived is single-family-rental-focused and has the lowest minimums ($100). For SFR exposure specifically, Arrived is the more direct play. For diversified real-estate exposure, Fundrise.
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
        Three reasons: low minimum ($100 vs ~$20k+ for a direct down payment), zero work (no sourcing, no underwriting, no management), and diversification (split your capital across multiple properties without buying multiples). Tradeoff: you give up direct property control and receive the investment&apos;s own tax reporting rather than automatically receiving every tax treatment that may apply to direct ownership.
      </>
    ),
  },
  {
    question: "Can I use TrueCap to evaluate an Arrived property?",
    answer: (
      <>
        Not directly — Arrived shares aren&apos;t an underwriting problem in TrueCap&apos;s sense (you&apos;re not modeling cap rate, DSCR, or your own financing). TrueCap is for direct ownership where you control the inputs. For Arrived properties, evaluate them on Arrived&apos;s published projections (yield + appreciation forecast) and your own diversification goals.
      </>
    ),
  },
];

