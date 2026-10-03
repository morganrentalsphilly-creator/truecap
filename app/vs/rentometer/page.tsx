/**
 * /vs/rentometer — TrueCap vs Rentometer comparison.
 *
 * Target queries: "rentometer alternative", "rentometer vs", "free
 * rentometer", "rent estimator tool". Rentometer sells rent estimates and
 * comps, plus a Deal Worksheet on its Pro plan. TrueCap underwrites the
 * purchase and starts rent from a HUD rent benchmark the user replaces (a
 * rent estimate appears only through the optional comps lookup). Competitor
 * cells were checked against rentometer.com/pricing/individual and
 * /deal-worksheet-landing in October 2026.
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
  title: "Rentometer vs TrueCap (2026): Rent vs Full Deal",
  description:
    "Rentometer estimates rent and sells a deal worksheet on its Pro plan. TrueCap underwrites the full deal from a rent benchmark you replace. When each tool fits.",
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
    description: "Rentometer estimates rent. TrueCap starts from a rent benchmark you replace and underwrites the deal.",
    url: "/vs/rentometer",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

type Verdict = "truecap" | "rentometer" | "tie";
type Row = { feature: string; truecap: string; rentometer: string; winner: Verdict };

const MATRIX: Row[] = [
  { feature: "Rent estimate from address",      truecap: "Editable HUD rent benchmark; optional rent-comp lookup",                 rentometer: "Comp-driven rent estimate (their core product)",                  winner: "rentometer" },
  { feature: "Comp data access",                 truecap: "One free sale/rent comp lookup; Pro includes 50 per month",               rentometer: "Rental-comp product with plan-specific limits",                    winner: "rentometer" },
  { feature: "Full deal underwrite",             truecap: "Free core metrics; Pro adds 10-year projections",                         rentometer: "Deal Worksheet on Rentometer Pro: cash flow, cash-on-cash and gross yield", winner: "tie" },
  { feature: "Operating expense modeling",       truecap: "Editable tax, insurance, maintenance, management, and reserve inputs",    rentometer: "Editable operating expenses, taxes and insurance in the Pro Deal Worksheet", winner: "tie" },
  { feature: "Mortgage / financing analysis",    truecap: "Full mortgage model with an editable FRED rate benchmark",               rentometer: "Editable financing terms in the Pro Deal Worksheet",              winner: "tie" },
  { feature: "Cap rate / CoC / DSCR",            truecap: "All three computed live",                                                rentometer: "Cash-on-cash and gross yield in the Pro Deal Worksheet; its worksheet page does not name cap rate or DSCR", winner: "tie" },
  { feature: "10-year projection",               truecap: "Pro — rent + expense + appreciation compounding",                        rentometer: "Not described on Rentometer's Deal Worksheet page",               winner: "truecap" },
  { feature: "Free use limit",                   truecap: "Unlimited core analyses; comp-lookup limits apply",                       rentometer: "Free account; paid plans from $59 a year (as of October 2026)",   winner: "tie" },
  { feature: "Underwriting context",             truecap: "Core economics and the Deal score free; Buy Box fit on your first decision, then with Pro", rentometer: "Rent estimates and comps on every plan; the Deal Worksheet on Pro", winner: "tie" },
  { feature: "PDF report",                       truecap: "Included with Pro",                                                     rentometer: "PDF of rent comp data",                                           winner: "tie" },
  { feature: "Use case",                          truecap: "Full investor underwriting workflow",                                    rentometer: "Rent estimates and comps, with a deal worksheet on Pro",          winner: "tie" },
  { feature: "Pricing — paid tier",               truecap: "See TrueCap's live pricing page",                                        rentometer: "Basic $59 a year; Essential $16 a month or $96 a year; Pro $29 a month or $199 a year (as of October 2026)", winner: "tie" },
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
            Rentometer starts from rent: an estimate for an address built on nearby rental comps, plus a Deal Worksheet on its Pro plan that turns that rent into cash flow and cash-on-cash return. TrueCap starts from the purchase decision: first-year rental economics from editable assumptions, with rent as one input you replace. Here&apos;s where each one fits.
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
            priority
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
                <li>You want cap rate, cash-on-cash, DSCR and cash flow on every deal, with a 10-year projection on Pro.</li>
                <li>You want to decide whether to buy, not just what rent to charge.</li>
                <li>You want operating expenses, mortgage debt service, and an editable property-tax input included.</li>
                <li>You want cash flow and returns for each property, with Buy Box fit on your first decision and then with Pro.</li>
                <li>You want unlimited free analyses.</li>
              </ul>
            </div>
            <div className="min-w-0">
              <h3 className={VS_TLDR_LABEL}>Use Rentometer if</h3>
              <ul className={VS_TLDR_LIST}>
                <li>You need rent comps for an address: a listing or a client report.</li>
                <li>You&apos;re a property manager checking comp prices for a rent renewal.</li>
                <li>You need deeper comp data beyond HUD&apos;s Fair Market Rent.</li>
                <li>You want a quick second-opinion rent estimate alongside your other tools.</li>
                <li>You want rent comps and a deal worksheet in one subscription (Rentometer Pro).</li>
              </ul>
            </div>
          </div>
          <p className={VS_FOOTNOTE}>
            The two can work together: take a rent comp from Rentometer and type it into TrueCap&apos;s rent field for the full deal underwrite.
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
          <p className={VS_SOURCES}>
            Rentometer details checked in October 2026 against{" "}
            <a
              href="https://www.rentometer.com/pricing/individual"
              target="_blank"
              rel="noopener"
              className="tc-link"
            >
              Rentometer&apos;s pricing page
            </a>{" "}
            and its{" "}
            <a
              href="https://www.rentometer.com/deal-worksheet-landing"
              target="_blank"
              rel="noopener"
              className="tc-link"
            >
              Deal Worksheet page
            </a>
            . Prices are list prices before promo codes; see Rentometer for current plans.
          </p>
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

        <ComparisonFaq competitorName="Rentometer" items={RENTOMETER_FAQ} reviewedDate="October 2026" />

        <CloseSection
          headingId="vs-close-heading"
          heading={<>Get the core underwrite free.</>}
          lede={
            <>
              Bring a rent number from Rentometer, a lease or your own comps. TrueCap runs the rest of the underwrite: expenses, financing, cap rate, cash-on-cash and DSCR. Try a deal in 60 seconds.
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
        They overlap in part. Rentometer specializes in rent estimates
        built from recent nearby rental comps, and its Pro plan adds a
        Deal Worksheet for cash flow and cash-on-cash return.
        TrueCap is a full underwriting calculator that starts from an
        editable HUD rent benchmark and runs the downstream
        math (cap rate, CoC, DSCR, cash flow). If you want a rent
        estimate from nearby comps, Rentometer can complement
        the underwrite. Verify either source with property-specific evidence.
      </>
    ),
  },
  {
    question: "Does TrueCap give me a rent estimate like Rentometer?",
    answer: (
      <>
        Not by default. TrueCap pre-fills rent using an editable HUD rent
        benchmark for the relevant bedroom count: ZIP-level when available,
        otherwise the HUD Fair Market Rent area; when an address has no
        county match, a statewide HUD figure, labeled as such. It is a
        housing-program benchmark, not a property-specific rent opinion
        or lender approval input. The optional comps lookup (one free lookup;
        Pro includes 50 per month) adds a rent estimate from nearby
        properties. Rentometer&apos;s comp-based estimates can provide a
        separate source to evaluate.
      </>
    ),
  },
  {
    question: "What's the difference between HUD FMR and Rentometer?",
    answer: (
      <>
        HUD Fair Market Rent is a government-published estimate of
        40th-percentile gross rent for standard-quality units within
        HUD-defined areas. Rentometer builds its estimate from recent
        nearby rental comps and reports an average and a median. They
        answer different questions, and
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
        provides the underwriting model and an editable HUD rent
        benchmark; Rentometer can add comp-based rent context. Use
        the sources that fit the property, verify them independently,
        and sensitivity-test a reasonable rent range.
      </>
    ),
  },
];

