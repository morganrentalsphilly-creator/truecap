/**
 * /vs/rentometer — TrueCap vs Rentometer comparison.
 *
 * Target queries: "rentometer alternative", "rentometer vs", "free
 * rentometer", "rent estimator tool". Rentometer is specifically a
 * rent-estimation tool — TrueCap is a full underwriter that also
 * estimates rent. Different scope; reposition accordingly.
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
  VS_FOOTNOTE,
  VS_H1,
  VS_LEDE,
  VS_LINK_ROW,
  VS_NOTE,
  VS_PROSE,
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
  title: "Rentometer vs TrueCap (2026): Rent vs Full Deal",
  description:
    "Rentometer estimates rent. TrueCap underwrites the full deal — including the rent. Honest comparison: when each tool fits, and what TrueCap adds.",
  keywords: [
    "rentometer alternative",
    "rentometer vs truecap",
    "truecap vs rentometer",
    "rent estimator tool",
    "rent comparison tool",
    "free rentometer",
    "rental property rent estimator",
  ],
  alternates: { canonical: "/vs/rentometer" },
  openGraph: {
    title: "Rentometer vs TrueCap (2026): Rent vs Full Deal",
    description: "Rentometer estimates rent. TrueCap estimates rent + everything else needed to underwrite a deal.",
    url: "/vs/rentometer",
    type: "website",
    images: [{ url: "/home.jpg", width: 1200, height: 630, alt: "TrueCap vs Rentometer" }],
  },
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
};

type Verdict = "truecap" | "rentometer" | "tie";
type Row = { feature: string; truecap: string; rentometer: string; winner: Verdict };

const MATRIX: Row[] = [
  { feature: "Rent estimate from address",      truecap: "Editable HUD area benchmark; optional rent-comp lookup",                 rentometer: "Comp-driven rent estimate (their core product)",                  winner: "rentometer" },
  { feature: "Comp data access",                 truecap: "One free sale/rent comp lookup; Pro includes 50 per month",               rentometer: "Rental-comp product with plan-specific limits",                    winner: "rentometer" },
  { feature: "Full deal underwrite",             truecap: "Free core metrics; Pro adds 10-year projections",                         rentometer: "No — rent estimation only",                                       winner: "truecap" },
  { feature: "Operating expense modeling",       truecap: "Editable tax, insurance, maintenance, management, and reserve inputs",    rentometer: "Not in scope",                                                    winner: "truecap" },
  { feature: "Mortgage / financing analysis",    truecap: "Full mortgage model with an editable FRED rate benchmark",               rentometer: "Not in scope",                                                    winner: "truecap" },
  { feature: "Cap rate / CoC / DSCR",            truecap: "All three computed live",                                                rentometer: "Not in scope",                                                    winner: "truecap" },
  { feature: "10-year projection",               truecap: "Pro — rent + expense + appreciation compounding",                        rentometer: "Not in scope",                                                    winner: "truecap" },
  { feature: "Free use limit",                   truecap: "Unlimited core analyses; comp-lookup limits apply",                       rentometer: "Limited free; Pro $29-49/mo",                                     winner: "truecap" },
  { feature: "Underwriting context",             truecap: "Free — core economics + Buy Box fit",                                 rentometer: "Rent comp only",                                                   winner: "truecap" },
  { feature: "PDF report",                       truecap: "Included with Pro",                                                     rentometer: "PDF of rent comp data",                                           winner: "tie" },
  { feature: "Use case",                          truecap: "Full investor underwriting workflow",                                    rentometer: "Quick rent comp lookup",                                          winner: "tie" },
  { feature: "Pricing — paid tier",               truecap: "See TrueCap's live pricing page",                                        rentometer: "$29-49/mo depending on plan",                                     winner: "truecap" },
];

export default function VsRentometerPage() {
  const siteUrl = getSiteUrl();
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Rentometer vs TrueCap (2026): Rent vs Full Deal",
    url: `${siteUrl}/vs/rentometer`,
    description: "Side-by-side comparison of TrueCap and Rentometer.",
    dateModified: lastmodFor("/vs/rentometer"),
    publisher: { "@id": `${siteUrl}/#organization` },
  };

  return (
    // relative + overflow-x-clip, as on the homepage and the /vs hub: no
    // descendant can make the phone page scroll sideways.
    <div className="relative overflow-x-clip">
      <Header initialUser={null} initialEntitlements={null} />
      <JsonLd data={structuredData} />
      <VsBreadcrumbSchema vsPath="/vs/rentometer" pageName="TrueCap vs Rentometer" />
      <main id="main" tabIndex={-1} className="min-w-0 outline-none">
        <VsHero>
          <h1 className={VS_H1}>
            TrueCap vs Rentometer: different tools, different jobs
          </h1>
          <BlogByline />
          <p className={VS_LEDE}>
            Rentometer is a rent estimator — it tells you what a property should rent for based on local comps. TrueCap models the broader first-year rental economics from editable assumptions. They&apos;re not the same product; here&apos;s where each one fits.
          </p>
          <ActionRow className={VS_ACTIONS}>
            <AnalyzeCtaLink analyticsSource="vs_hero" className={buttonVariants({ size: "cta" })}>
              Try TrueCap free
            </AnalyzeCtaLink>
            <Link href="/pricing" className={buttonVariants({ variant: "outline", size: "cta" })}>
              See pricing
            </Link>
          </ActionRow>
          <p className={VS_NOTE}>Free analyzer: no card or signup</p>
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
          <SectionHeading id="vs-tldr-heading">TL;DR</SectionHeading>
          <div className={VS_TLDR_GRID}>
            <div className="min-w-0">
              <h3 className={VS_TLDR_LABEL}>Pick TrueCap if</h3>
              <ul className={VS_TLDR_LIST}>
                <li>You want a FULL deal underwrite — cap rate, CoC, DSCR, NCF, 10-yr projection.</li>
                <li>You want to decide whether to buy, not just what rent to charge.</li>
                <li>You want operating expenses, mortgage debt service, and an editable property-tax input included.</li>
                <li>You want cash flow, returns, and Buy Box fit for each property.</li>
                <li>You want unlimited free analyses.</li>
              </ul>
            </div>
            <div className="min-w-0">
              <h3 className={VS_TLDR_LABEL}>Use Rentometer if</h3>
              <ul className={VS_TLDR_LIST}>
                <li>You ONLY need a quick rent comp — and already have a deal model elsewhere.</li>
                <li>You&apos;re a property manager checking comp prices for a rent renewal.</li>
                <li>You need deeper comp data beyond HUD&apos;s Fair Market Rent.</li>
                <li>You want a quick second-opinion rent estimate alongside your other tools.</li>
              </ul>
            </div>
          </div>
          <p className={VS_FOOTNOTE}>
            Honest take: they&apos;re complementary. Many investors use Rentometer for rent comp and TrueCap for the full deal underwrite. That&apos;s fine.
          </p>
        </Section>

        <Section aria-labelledby="vs-matrix-heading">
          <SectionHeading id="vs-matrix-heading">Feature-by-feature</SectionHeading>
          <ScrollX label="Comparison table" className="mt-8 max-w-5xl">
            <VsMatrixTable
              head={["Feature", "TrueCap", "Rentometer"]}
              rows={MATRIX.map((row) => ({
                label: row.feature,
                truecap: row.truecap,
                competitor: row.rentometer,
                winner: row.winner === "rentometer" ? "competitor" : row.winner,
              }))}
            />
          </ScrollX>
          <div className={VS_PROSE}>
            <p>
              A rent number only matters once it flows into returns. Drop your Rentometer comp into our{" "}
              <Link href="/analyze" prefetch={false} className="tc-link">free deal analyzer</Link>
              {" "}to see what that rent actually earns as cap rate and cash-on-cash return. For the full income statement behind those metrics, our{" "}
              <IntentPrefetchLink href="/blog/rental-property-pro-forma-explained" className="tc-link">rental property pro forma guide</IntentPrefetchLink>
              {" "}lays out every line.
            </p>
          </div>
        </Section>

        <ComparisonFaq competitorName="Rentometer" items={RENTOMETER_FAQ} />

        <CloseSection
          headingId="vs-close-heading"
          heading={<>Get the core underwrite free.</>}
          lede={
            <>
              If you&apos;ve been using Rentometer for rent and a spreadsheet for everything else, TrueCap collapses both into one workflow. Try a deal in 60 seconds.
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
            <RelatedContent kind="vs" slug="rentometer" />
            <AuthorBio />

            <footer className="mt-10 border-t border-border pt-6">
              <p className="text-lg font-semibold">Other comparisons:</p>
              <ul className="mt-2 grid gap-x-8 sm:grid-cols-2">
                <li>
                  <IntentPrefetchLink
                    href="/vs/dealcheck"
                    className={VS_LINK_ROW}
                  >
                    vs DealCheck
                  </IntentPrefetchLink>
                </li>
                <li>
                  <IntentPrefetchLink
                    href="/vs/biggerpockets-calculator"
                    className={VS_LINK_ROW}
                  >
                    vs BiggerPockets
                  </IntentPrefetchLink>
                </li>
                <li>
                  <IntentPrefetchLink
                    href="/vs/excel"
                    className={VS_LINK_ROW}
                  >
                    vs Excel
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

const RENTOMETER_FAQ: FaqItem[] = [
  {
    question: "Is TrueCap an alternative to Rentometer?",
    answer: (
      <>
        Not exactly — they solve different problems. Rentometer
        specializes in rent estimates pulled from rental-listing comps.
        TrueCap is a full underwriting calculator that starts from an
        editable HUD Fair Market Rent area benchmark and runs the downstream
        math (cap rate, CoC, DSCR, cash flow). If you want a tight
        rent estimate from active listings, Rentometer can complement
        the underwrite. Verify either source with property-specific evidence.
      </>
    ),
  },
  {
    question: "Does TrueCap give me a rent estimate like Rentometer?",
    answer: (
      <>
        Yes — TrueCap pre-fills rent using an editable HUD Fair Market
        Rent area benchmark for the relevant bedroom count. It is a
        housing-program benchmark, not a property-specific rent opinion
        or lender approval input. Rentometer&apos;s listing-based comps can
        provide a separate source to evaluate.
      </>
    ),
  },
  {
    question: "What's the difference between HUD FMR and Rentometer?",
    answer: (
      <>
        HUD Fair Market Rent is a government-published estimate of
        40th-percentile gross rent for standard-quality units within
        HUD-defined areas. Rentometer uses rental-listing comps and
        shows a comp range. They answer different questions, and
        neither replaces subject-property lease evidence or local diligence.
      </>
    ),
  },
  {
    question: "Can I use Rentometer's rent in TrueCap?",
    answer: (
      <>
        Yes — every input in TrueCap is editable. If you trust
        Rentometer&apos;s comp for a specific neighborhood, type that
        number into the rent field and the rest of the analysis
        updates instantly. TrueCap pre-fills the HUD figure as a
        starting point, not a hard requirement.
      </>
    ),
  },
  {
    question: "Do I need both Rentometer and TrueCap?",
    answer: (
      <>
        It depends on the evidence available for the property. TrueCap
        provides the underwriting model and an editable HUD area
        benchmark; Rentometer can add listing-based comp context. Use
        the sources that fit the property, verify them independently,
        and sensitivity-test a reasonable rent range.
      </>
    ),
  },
];

