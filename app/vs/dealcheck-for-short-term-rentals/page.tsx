/**
 * /vs/dealcheck-for-short-term-rentals — niche use-case comparison page (Short-term rentals cut).
 *
 * Target queries: "dealcheck short term rental", "dealcheck airbnb calculator", "best str calculator", "short term rental analysis tool", "airbnb deal analyzer". Long-tail audience-slicing comparison.
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
  title: "DealCheck vs TrueCap for STR Deals (2026)",
  description:
    "Compare TrueCap and DealCheck for STR screening: user-supplied revenue, occupancy assumptions, financing, and explicit tax-eligibility boundaries.",
  keywords: [
    "dealcheck short term rental",
    "dealcheck airbnb calculator",
    "best str calculator",
    "short term rental analysis tool",
    "airbnb deal analyzer",
  ],
  alternates: { canonical: "/vs/dealcheck-for-short-term-rentals" },
  openGraph: {
    title: "DealCheck vs TrueCap for STR Deals (2026)",
    description:
      "STR-specific TrueCap vs DealCheck: ADR + occupancy modeling, AirDNA-input workflow, and tax-model limitations.",
    url: "/vs/dealcheck-for-short-term-rentals",
    type: "website",
    images: [{ url: "/home.jpg", width: 1200, height: 630, alt: "TrueCap vs DealCheck for Short-Term Rentals — honest comparison" }],
  },
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
};

type Verdict = "truecap" | "dealcheck" | "tie";
type Row = { feature: string; truecap: string; dealcheck: string; winner: Verdict };

const MATRIX: Row[] = [
  { feature: "LTR + STR scenario comparison", truecap: "Save separate scenarios; side-by-side comparison is Pro", dealcheck: "Duplicate the deal and compare, subject to plan caps", winner: "tie" },
  { feature: "ADR + occupancy input model", truecap: "Editable rent field — plug AirDNA monthly projection", dealcheck: "Editable rent field — same approach", winner: "tie" },
  { feature: "Seasonal occupancy curve modeling", truecap: "Single blended ADR + occupancy; compare manual scenarios", dealcheck: "Annualized only", winner: "tie" },
  { feature: "AirDNA / Mashvisor data integration", truecap: "Manual — paste AirDNA's projected monthly revenue into rent field", dealcheck: "Same approach", winner: "tie" },
  { feature: "Bonus depreciation / STR tax eligibility", truecap: "No tax-specific module; review with a qualified professional", dealcheck: "Verify the current calculator scope and eligibility limits", winner: "tie" },
  { feature: "Cost-segregation component modeling", truecap: "Not modeled", dealcheck: "Manual", winner: "tie" },
  { feature: "Editable property-management rate", truecap: "Yes — adjustable management %", dealcheck: "Yes", winner: "tie" },
  { feature: "Higher utilities + cleaning fees", truecap: "Yes — utilities + maintenance fields handle the STR overhead", dealcheck: "Yes", winner: "tie" },
  { feature: "Mobile UX", truecap: "PWA installable", dealcheck: "Native iOS + Android", winner: "dealcheck" },
  { feature: "Free tier covers STR underwriting", truecap: "Yes — core cap rate / CoC / DSCR / cash flow", dealcheck: "Yes — Rental Cash Flow for Airbnbs is included on Starter", winner: "tie" },
];

const NICHE_FAQ: FaqItem[] = [
  {
    question: "Which is better for short-term rentals — TrueCap or DealCheck?",
    answer: (
      <>
        Both work. TrueCap models a blended ADR + occupancy input; model separate seasonal cases as saved scenarios, with side-by-side comparison on Pro. DealCheck Starter includes its Rental Cash Flow for Airbnbs calculator and professional reports, subject to published caps. Neither calculator determines STR-loophole eligibility; model cost segregation and bonus depreciation with a qualified tax professional.
      </>
    ),
  },
  {
    question: "Can TrueCap model AirDNA revenue projections?",
    answer: (
      <>
        Yes — every input in TrueCap is editable. Pull AirDNA&apos;s projected monthly revenue (annual ÷ 12, discounted for vacancy + cleaning + STR opex), plug it into the rent field, run the full cap rate / DSCR / cash flow analysis. Same approach works in DealCheck.
      </>
    ),
  },
  {
    question: "Does TrueCap support the STR tax loophole?",
    answer: (
      <>
        No. TrueCap does not currently expose a tax-specific analysis module and
        does not determine material participation or REPS, classify
        cost-segregation components, or calculate bonus depreciation. Use a
        qualified tax professional&apos;s taxpayer-specific model for those items.
      </>
    ),
  },
  {
    question: "What management rate should I use for STR analysis?",
    answer: (
      <>
        Use a current quote for the property and service scope. STR management fees vary by market, channel coverage, guest communication, cleaning coordination, and included services. If you self-manage, still model software, labor, and coordination costs. TrueCap&apos;s management field is editable.
      </>
    ),
  },
  {
    question: "Can I run LTR and STR scenarios on the same property?",
    answer: (
      <>
        Yes. Save one scenario with the editable HUD long-term-rent benchmark and another with your independently verified STR revenue assumption. Pro can compare saved deals side-by-side. Review cap rate, cash flow, DSCR, expenses, and sensitivity together rather than treating one metric as the answer.
      </>
    ),
  },
];

export default function VsDealcheckForShortTermRentalsPage() {
  const siteUrl = getSiteUrl();
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "DealCheck vs TrueCap for STR Deals (2026)",
    url: `${siteUrl}/vs/dealcheck-for-short-term-rentals`,
    description: "Compare TrueCap and DealCheck for STR screening: user-supplied revenue, occupancy assumptions, financing, and explicit tax-eligibility boundaries.",
    dateModified: lastmodFor("/vs/dealcheck-for-short-term-rentals"),
    publisher: { "@id": `${siteUrl}/#organization` },
  };

  return (
    // relative + overflow-x-clip, as on the homepage and the /vs hub: no
    // descendant can make the phone page scroll sideways.
    <div className="relative overflow-x-clip">
      <Header initialUser={null} initialEntitlements={null} />
      <JsonLd data={structuredData} />
      <VsBreadcrumbSchema vsPath="/vs/dealcheck-for-short-term-rentals" pageName="TrueCap vs DealCheck for Short-Term Rentals" />
      <main id="main" tabIndex={-1} className="min-w-0 outline-none">
        <VsHero>
          <h1 className={VS_H1}>
            TrueCap vs DealCheck for Short-term rentals:{" "}
            which supports the underwriting workflow better?
          </h1>
          <BlogByline />
          <p className={VS_LEDE}>
            Both calculators were built for long-term rentals first. Both let you model short-term rentals with projected revenue inputs. This comparison covers seasonal ADR + occupancy, AirDNA-input workflow, and where tax-specific work must move to a CPA model.
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

        <Section rhythm="tight" aria-labelledby="vs-tldr-heading">
          <SectionHeading id="vs-tldr-heading">
            TL;DR for Short-term rentals investors
          </SectionHeading>
          <div className={VS_TLDR_GRID}>
            <div className="min-w-0">
              <h3 className={VS_TLDR_LABEL}>
                Use TrueCap when
              </h3>
              <ul className={VS_TLDR_LIST}>
                <li>You&apos;re underwriting a property as a potential STR.</li>
                <li>You want to compare LTR vs STR scenarios side-by-side.</li>
                <li>You want rental cash flow, financing, DSCR, and editable operating assumptions.</li>
                <li>You want a free tier that covers basic STR underwriting.</li>
              </ul>
            </div>
            <div className="min-w-0">
              <h3 className={VS_TLDR_LABEL}>
                Use DealCheck when
              </h3>
              <ul className={VS_TLDR_LIST}>
                <li>You manage many STRs on mobile at properties.</li>
                <li>You&apos;re already a DealCheck Plus or Pro subscriber.</li>
                <li>You prefer DealCheck&apos;s listing-import workflow for STR sourcing.</li>
              </ul>
            </div>
          </div>
        </Section>

        <Section aria-labelledby="vs-matrix-heading">
          <SectionHeading id="vs-matrix-heading">
            Short-term rentals feature-by-feature
          </SectionHeading>
          <p className={VS_INTRO}>
            Where each tool wins on the Short-term rentals workflow specifically.
          </p>
          <ScrollX label="Comparison table" className="mt-8 max-w-5xl">
            <VsMatrixTable
              head={["Feature", "TrueCap", "DealCheck"]}
              rows={MATRIX.map((row) => ({
                label: row.feature,
                truecap: row.truecap,
                competitor: row.dealcheck,
                winner: row.winner === "dealcheck" ? "competitor" : row.winner,
              }))}
            />
          </ScrollX>
          <p className={VS_SOURCES}>
            DealCheck publishes Rental Cash Flow for Airbnbs and professional reports on
            Starter, subject to plan limits. See{" "}
            <a href="https://dealcheck.io/pricing/" target="_blank" rel="noopener" className="tc-link">
              DealCheck&apos;s official pricing page
            </a>{" "}
            for current terms.
          </p>
          <div className={VS_PROSE}>
            <p>
              Whichever calculator you land on, the STR underwrite is the same job. Our{" "}
              <Link href="/blog/short-term-rental-underwriting-playbook" className="tc-link">short-term rental underwriting playbook</Link>
              {" "}breaks down seasonal revenue into a defensible analysis, and our roundup of the{" "}
              <Link href="/blog/best-short-term-rental-analysis-tool-2026" className="tc-link">best short-term rental analysis tools for 2026</Link>
              {" "}covers where the ADR and occupancy data should come from. For a quick first-pass check, our{" "}
              <Link href="/analyze" prefetch={false} className="tc-link">free deal analyzer</Link>
              {" "}returns cap rate, cash flow, and DSCR from a single address.
            </p>
          </div>
        </Section>

        <ComparisonFaq competitorName="DealCheck (Short-term rentals)" items={NICHE_FAQ} />

        <CloseSection
          headingId="vs-close-heading"
          heading={<>Underwrite your next Short-term rentals deal — free.</>}
          lede={
            <>
              Free covers the standard cap rate, CoC, DSCR, and cash flow. Pro adds
              10-year cash-flow and equity projections, sensitivity, Offer Ceiling,
              and included PDFs. New one-time PDF checkout is temporarily unavailable; see live
              pricing for current terms.
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
            <RelatedContent kind="vs" slug="dealcheck-for-short-term-rentals" />
            <AuthorBio />

            <footer className="mt-10 border-t border-border pt-6">
              <p className="text-lg font-semibold">Other comparisons:</p>
              <ul className="mt-2 grid gap-x-8 sm:grid-cols-2">
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
                    href="/vs/hostaway"
                    className={VS_LINK_ROW}
                  >
                    TrueCap vs Hostaway
                  </Link>
                </li>
                <li>
                  <Link
                    href="/vs/airdna"
                    className={VS_LINK_ROW}
                  >
                    TrueCap vs AirDNA
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
