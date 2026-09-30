/**
 * /vs/landlord-studio — competitor comparison landing page.
 *
 * Target queries: "landlord studio alternative", "landlord studio vs stessa", "landlord studio pricing", "landlord studio review".
 * Landlord Studio is mobile-first accounting + receipt scanning for small landlords. Direct alternative to Stessa, simpler than Buildium/Rentec. Strong on UK + US markets.
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
  title: "Landlord Studio vs TrueCap (2026): Which to Use",
  description:
    "Landlord Studio is mobile-first accounting for properties you own. TrueCap underwrites the ones you're considering. Honest comparison and how they fit.",
  keywords: [
    "landlord studio alternative",
    "landlord studio vs stessa",
    "landlord studio pricing",
    "landlord studio review",
  ],
  alternates: { canonical: "/vs/landlord-studio" },
  openGraph: {
    title: "Landlord Studio vs TrueCap (2026): Which to Use",
    description:
      "Landlord Studio is mobile accounting for properties you own. TrueCap underwrites the deal before. Different stages.",
    url: "/vs/landlord-studio",
    type: "website",
    images: [
      {
        url: "/home.jpg",
        width: 1200,
        height: 630,
        alt: "TrueCap vs Landlord Studio",
      },
    ],
  },
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
};

type Verdict = "truecap" | "landlordstudio" | "tie";
type Row = {
  feature: string;
  truecap: string;
  landlordstudio: string;
  winner: Verdict;
};

const MATRIX: Row[] = [
  {
    feature: "Lifecycle stage",
    truecap: "Pre-purchase — underwrite the deal",
    landlordstudio: "Post-purchase — accounting + tracking",
    winner: "tie",
  },
  {
    feature: "Cap rate / CoC / DSCR analysis",
    truecap: "Yes — full engine, free tier",
    landlordstudio: "Not modeled",
    winner: "truecap",
  },
  {
    feature: "10-year projection",
    truecap: "Pro — rent + expense + appreciation",
    landlordstudio: "Not modeled",
    winner: "truecap",
  },
  {
    feature: "Deal score (0–100)",
    truecap: "Free — 0–100 score with factor breakdown",
    landlordstudio: "Not applicable",
    winner: "truecap",
  },
  {
    feature: "Starting values (rent/rate/tax)",
    truecap: "HUD rent + FRED rate + manual local property tax",
    landlordstudio: "Not applicable",
    winner: "truecap",
  },
  {
    feature: "Receipt scanning",
    truecap: "No",
    landlordstudio: "Yes — mobile camera + OCR",
    winner: "landlordstudio",
  },
  {
    feature: "Expense tracking + categorization",
    truecap: "No",
    landlordstudio: "Yes — per-property bookkeeping",
    winner: "landlordstudio",
  },
  {
    feature: "Schedule E P&L reports",
    truecap: "Forward projection only",
    landlordstudio: "Yes — actuals export",
    winner: "landlordstudio",
  },
  {
    feature: "Rent tracking",
    truecap: "No",
    landlordstudio: "Yes — payment logging (no ACH collection itself)",
    winner: "landlordstudio",
  },
  {
    feature: "Mobile app",
    truecap: "PWA",
    landlordstudio: "Native iOS + Android",
    winner: "tie",
  },
  {
    feature: "Free tier",
    truecap: "Yes — core cap rate, CoC, DSCR, and cash flow",
    landlordstudio: "Yes — limited properties",
    winner: "tie",
  },
  {
    feature: "Pricing (paid tier)",
    truecap: "Paid Pro; see live pricing for current rates",
    landlordstudio: "Starter ~$12/mo, Premium ~$30/mo (as of 2026)",
    winner: "tie",
  },
];

export default function VsLandlordStudioPage() {
  const siteUrl = getSiteUrl();
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Landlord Studio vs TrueCap (2026): Which to Use",
    url: `${siteUrl}/vs/landlord-studio`,
    description:
      "Landlord Studio is mobile-first accounting for properties you own. TrueCap underwrites the ones you're considering. Honest comparison and how they fit.",
    dateModified: lastmodFor("/vs/landlord-studio"),
    publisher: { "@id": `${siteUrl}/#organization` },
  };

  return (
    // relative + overflow-x-clip, as on the homepage and the /vs hub: no
    // descendant can make the phone page scroll sideways.
    <div className="relative overflow-x-clip">
      <Header initialUser={null} initialEntitlements={null} />
      <JsonLd data={structuredData} />
      <VsBreadcrumbSchema
        vsPath="/vs/landlord-studio"
        pageName="TrueCap vs Landlord Studio"
      />
      <main id="main" tabIndex={-1} className="min-w-0 outline-none">
        <VsHero>
          <h1 className={VS_H1}>
            TrueCap vs Landlord Studio:{" "}
            underwrite before, track receipts after
          </h1>
          <BlogByline />
          <p className={VS_LEDE}>
            Landlord Studio is mobile-first accounting + expense tracking for
            small landlords — snap a receipt, categorize it, generate a Schedule
            E. TrueCap is a pre-purchase underwriting calculator that helps
            screen an acquisition. Different stages, potentially complementary
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
                <li>
                  You&apos;re evaluating a property before making an offer.
                </li>
                <li>You want cap rate, DSCR, cash flow, projection.</li>
                <li>
                  You want standardized economics and Buy Box fit to
                  compare 2-3 deals.
                </li>
                <li>You&apos;re not yet generating receipts to track.</li>
              </ul>
            </div>
            <div className="min-w-0">
              <h3 className={VS_TLDR_LABEL}>
                Use Landlord Studio when
              </h3>
              <ul className={VS_TLDR_LIST}>
                <li>You own rentals and need to track expenses + receipts.</li>
                <li>
                  You want a mobile app for snapping receipts at the property.
                </li>
                <li>You need a simple Schedule E export at tax time.</li>
                <li>
                  You don&apos;t need bank-feed accounting (Stessa/Baselane do
                  that).
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
              head={["Feature", "TrueCap", "Landlord Studio"]}
              rows={MATRIX.map((row) => ({
                label: row.feature,
                truecap: row.truecap,
                competitor: row.landlordstudio,
                winner: row.winner === "landlordstudio" ? "competitor" : row.winner,
              }))}
            />
          </ScrollX>
          <p className={VS_SOURCES}>
            Landlord Studio details based on publicly available product info as
            of 2026. See{" "}
            <a
              href="https://landlordstudio.com"
              target="_blank"
              rel="noopener"
              className="tc-link"
            >
              landlordstudio.com
            </a>{" "}
            for their current state.
          </p>
        </Section>

        {/* Complementary workflow */}
        <Section aria-labelledby="vs-fit-heading">
          <SectionHeading id="vs-fit-heading">
            How TrueCap + Landlord Studio fit together
          </SectionHeading>
          <div className={VS_PROSE}>
            <ol>
              <li>
                <strong>Underwrite the property in TrueCap.</strong> Cap rate,
                DSCR, cash flow, projection. Save the deal.
              </li>
              <li>
                <strong>Close + onboard in Landlord Studio.</strong> Set up the
                property, start logging receipts as you incur expenses.
              </li>
              <li>
                <strong>Mobile receipt tracking on the go.</strong> Contractor
                invoice on your phone? Snap, categorize, file.
              </li>
              <li>
                <strong>Annual tax time.</strong> Pull Schedule E from Landlord
                Studio. Re-run TrueCap to compare actuals vs projection — the gap
                is your learning for the next acquisition.
              </li>
            </ol>
            <p>
              Deciding whether to buy, not how to book it? The free{" "}
              <IntentPrefetchLink
                href="/tools/break-even-calculator"
                className="tc-link"
              >
                break-even calculator
              </IntentPrefetchLink>{" "}
              shows how long before there is a profit to reconcile, and the full{" "}
              <Link
                href="/analyze" prefetch={false}
                className="tc-link"
              >
                TrueCap analyzer
              </Link>{" "}
              projects the cap rate, cash-on-cash, and cash flow before you own
              the expenses you&apos;d later be tracking here. Our guide on{" "}
              <IntentPrefetchLink
                href="/blog/how-to-underwrite-a-rental-property-in-60-seconds"
                className="tc-link"
              >
                60-second underwriting
              </IntentPrefetchLink>{" "}
              walks through the workflow end-to-end.
            </p>
          </div>
        </Section>

        <ComparisonFaq
          competitorName="Landlord Studio"
          items={LANDLORD_STUDIO_FAQ}
        />

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
            <RelatedContent kind="vs" slug="landlord-studio" />
            <AuthorBio />

            <footer className="mt-10 border-t border-border pt-6">
              <p className="text-lg font-semibold">Other comparisons:</p>
              <ul className="mt-2 grid gap-x-8 sm:grid-cols-2">
                <li>
                  <IntentPrefetchLink
                    href="/vs/stessa"
                    className={VS_LINK_ROW}
                  >
                    TrueCap vs Stessa
                  </IntentPrefetchLink>
                </li>
                <li>
                  <IntentPrefetchLink
                    href="/vs/baselane"
                    className={VS_LINK_ROW}
                  >
                    TrueCap vs Baselane
                  </IntentPrefetchLink>
                </li>
                <li>
                  <IntentPrefetchLink
                    href="/vs/avail"
                    className={VS_LINK_ROW}
                  >
                    TrueCap vs Avail
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

const LANDLORD_STUDIO_FAQ: FaqItem[] = [
  {
    question: "Is TrueCap a Landlord Studio alternative?",
    answer: (
      <>
        No — different stages. Landlord Studio is mobile-first accounting for
        properties you own. TrueCap underwrites properties you&apos;re
        considering buying. Most small landlords use both.
      </>
    ),
  },
  {
    question: "Landlord Studio vs Stessa — which one?",
    answer: (
      <>
        Landlord Studio is more mobile-first with stronger receipt scanning.
        Stessa is more bank-feed-driven with automated transaction
        categorization. If you take a lot of receipts on the go, Landlord
        Studio&apos;s mobile UX wins. If you want everything pulled
        automatically from your bank, Stessa is more hands-off. Both have free
        tiers — try both.
      </>
    ),
  },
  {
    question: "Does Landlord Studio collect rent?",
    answer: (
      <>
        Not directly — they log rent payments but don&apos;t process them. For
        online rent collection (ACH/card), you&apos;d pair Landlord Studio with
        TurboTenant, RentRedi, Avail, or Baselane.
      </>
    ),
  },
  {
    question: "Does TrueCap track actual expenses?",
    answer: (
      <>
        No. TrueCap models projected expenses for underwriting (taxes,
        insurance, vacancy, mgmt, maintenance, capex). It doesn&apos;t connect
        to your bank or accept receipt photos. Landlord Studio, Stessa, or
        Baselane handle that.
      </>
    ),
  },
  {
    question: "Is Landlord Studio free?",
    answer: (
      <>
        Yes — there&apos;s a free tier for a limited number of properties. Paid
        tiers (Starter ~$12/month, Premium ~$30/month as of 2026) lift the
        property cap and add features like custom reports and bank
        reconciliation.
      </>
    ),
  },
];

