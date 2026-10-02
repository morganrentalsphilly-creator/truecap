/**
 * /vs/guesty — competitor comparison landing page.
 *
 * Target queries: "guesty alternative", "guesty vs hostaway", "guesty pricing", "guesty review", "enterprise str software".
 * Guesty is short-term rental property management software with published
 * plan ranges from 1 listing through enterprise portfolios.
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
  title: "Guesty vs TrueCap (2026): STR PM vs Underwriting",
  description:
    "Guesty manages short-term rentals after purchase across Lite, Pro, and Enterprise plans. TrueCap handles pre-purchase underwriting.",
  keywords: [
    "guesty alternative",
    "guesty vs hostaway",
    "guesty pricing",
    "guesty review",
    "enterprise str software",
  ],
  alternates: { canonical: "/vs/guesty" },
  openGraph: {
    title: "Guesty vs TrueCap (2026): STR PM vs Underwriting",
    description:
      "Guesty manages short-term rentals after purchase across multiple portfolio sizes. TrueCap handles pre-purchase underwriting.",
    url: "/vs/guesty",
    type: "website",
    images: [
      { url: "/home.jpg", width: 1200, height: 630, alt: "TrueCap vs Guesty" },
    ],
  },
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
};

type Verdict = "truecap" | "guesty" | "tie";
type Row = {
  feature: string;
  truecap: string;
  guesty: string;
  winner: Verdict;
};

const MATRIX: Row[] = [
  {
    feature: "Primary audience",
    truecap: "Solo / small-portfolio STR investors (1-30 doors)",
    guesty: "Lite: 1-3 listings; Pro: 4-199; Enterprise: 200+",
    winner: "tie",
  },
  {
    feature: "Lifecycle stage",
    truecap: "Pre-purchase — underwrite the STR deal",
    guesty: "Post-purchase — operate STR listings",
    winner: "tie",
  },
  {
    feature: "Cap rate / CoC / DSCR analysis",
    truecap: "Yes — full engine, free tier",
    guesty: "Not listed among its plan features",
    winner: "truecap",
  },
  {
    feature: "10-year projection",
    truecap: "Pro — rent + expense + appreciation",
    guesty: "Not listed among its plan features",
    winner: "truecap",
  },
  {
    feature: "Starting values (rent/rate/tax)",
    truecap: "HUD rent + FRED rate + manual local property tax",
    guesty: "Not listed among its plan features",
    winner: "truecap",
  },
  {
    feature: "Channel manager (Airbnb/Vrbo/Booking)",
    truecap: "No",
    guesty:
      "Yes, Lite syncs Airbnb, Booking.com and Vrbo; Pro syncs 60+ channels",
    winner: "guesty",
  },
  {
    feature: "Multi-owner portal + accounting",
    truecap: "No",
    guesty:
      "Owners portal and customizable owner statements on Pro and Enterprise, not on Lite; Trust Accounting is an add-on",
    winner: "guesty",
  },
  {
    feature: "Open API for custom integrations",
    truecap: "No",
    guesty: "Yes on Pro and Enterprise; not on Lite",
    winner: "guesty",
  },
  {
    feature: "AI assistant + automation",
    truecap: "No",
    guesty: "Yes, ReplyAI guest messaging, listed as freemium on every plan",
    winner: "guesty",
  },
  {
    feature: "Dynamic pricing",
    truecap: "No",
    guesty:
      "Yes, Guesty PriceOptimizer; see its pricing page for how each plan includes it",
    winner: "guesty",
  },
  {
    feature: "Free tier",
    truecap: "Yes — core cap rate, CoC, DSCR, and cash flow",
    guesty: "No permanent free tier; Lite trial available",
    winner: "truecap",
  },
  {
    feature: "Pricing (entry tier)",
    truecap: "Free core; paid Pro — see live pricing",
    guesty: "Plan and portfolio dependent — see Guesty's live pricing",
    winner: "tie",
  },
  {
    feature: "Built for small operators",
    truecap: "Yes — 1-30 doors",
    guesty: "Yes — Lite is published for 1-3 listings",
    winner: "tie",
  },
];

export default function VsGuestyPage() {
  const siteUrl = getSiteUrl();
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Guesty vs TrueCap (2026): STR PM vs Underwriting",
    url: `${siteUrl}/vs/guesty`,
    description:
      "Guesty manages short-term rentals after purchase across Lite, Pro, and Enterprise plans. TrueCap handles pre-purchase underwriting.",
    dateModified: lastmodFor("/vs/guesty"),
    publisher: { "@id": `${siteUrl}/#organization` },
  };

  return (
    // relative + overflow-x-clip, as on the homepage and the /vs hub: no
    // descendant can make the phone page scroll sideways.
    <div className="relative overflow-x-clip">
      <Header initialUser={null} initialEntitlements={null} />
      <JsonLd data={structuredData} />
      <VsBreadcrumbSchema vsPath="/vs/guesty" pageName="TrueCap vs Guesty" />
      <main id="main" tabIndex={-1} className="min-w-0 outline-none">
        <VsHero>
          <h1 className={VS_H1}>
            TrueCap vs Guesty:{" "}
            underwrite the STR vs manage it
          </h1>
          <BlogByline />
          <p className={VS_LEDE}>
            Guesty is short-term rental property management software for
            post-purchase operations. Its published plan ranges include Lite for
            1-3 listings, Pro for 4-199, and Enterprise for 200+. TrueCap is a
            pre-purchase underwriting calculator. The products address different
            stages of the lifecycle.
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
                  You own 1-30 STR properties and want to underwrite the next
                  one.
                </li>
                <li>You want cap rate, DSCR, cash flow before buying.</li>
                <li>You want a free core underwriting tier.</li>
                <li>
                  You&apos;re not running an STR property management business.
                </li>
              </ul>
            </div>
            <div className="min-w-0">
              <h3 className={VS_TLDR_LABEL}>
                Use Guesty when
              </h3>
              <ul className={VS_TLDR_LIST}>
                <li>
                  You need post-purchase STR operations for one or more
                  listings.
                </li>
                <li>
                  You manage STRs for other owners and need multi-owner
                  accounting.
                </li>
                <li>
                  You need channel management, automation, or plan-specific API
                  access.
                </li>
                <li>
                  You want phone support and a dedicated customer success
                  manager (Pro and Enterprise).
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
              head={["Feature", "TrueCap", "Guesty"]}
              rows={MATRIX.map((row) => ({
                label: row.feature,
                truecap: row.truecap,
                competitor: row.guesty,
                winner: row.winner === "guesty" ? "competitor" : row.winner,
              }))}
            />
          </ScrollX>
          <p className={VS_SOURCES}>
            Guesty details were checked against{" "}
            <a
              href="https://www.guesty.com/pricing/"
              target="_blank"
              rel="noopener"
              className="tc-link"
            >
              Guesty&apos;s official pricing page
            </a>{" "}
            and its plan comparison table in October 2026. Features and prices
            can change.
          </p>
        </Section>

        {/* Complementary workflow */}
        <Section aria-labelledby="vs-fit-heading">
          <SectionHeading id="vs-fit-heading">
            Where Guesty fits after you buy
          </SectionHeading>
          <div className={VS_PROSE}>
            <ol>
              <li>
                <strong>Underwrite + buy 1-5 STRs with TrueCap.</strong> Solo
                investor workflow.
              </li>
              <li>
                <strong>Pick an operations tool once you own listings.</strong>{" "}
                Compare Lodgify, Hostfully, Hostaway, and Guesty on the listing
                count each plan is built for.
              </li>
              <li>
                <strong>
                  Choose the Guesty plan that matches the portfolio.
                </strong>{" "}
                Lite, Pro, and Enterprise publish different listing ranges and
                capabilities.
              </li>
              <li>
                <strong>Keep TrueCap for new acquisitions.</strong>{" "}
                Guesty&apos;s plan features cover operations after purchase, so
                you still need TrueCap or similar to underwrite the next
                property.
              </li>
            </ol>
            <p>
              Need only the underwriting half? The free{" "}
              <IntentPrefetchLink
                href="/tools/vacancy-rate-calculator"
                className="tc-link"
              >
                vacancy rate calculator
              </IntentPrefetchLink>{" "}
              puts a real number on the downtime that decides a short-term rental,
              and the full{" "}
              <Link
                href="/analyze" prefetch={false}
                className="tc-link"
              >
                TrueCap analyzer
              </Link>{" "}
              carries that assumption into cap rate, DSCR, and{" "}
              <IntentPrefetchLink
                href="/glossary/monthly-cash-flow"
                className="tc-link"
              >
                monthly cash flow
              </IntentPrefetchLink>
              . Our guide on{" "}
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
          competitorName="Guesty"
          items={GUESTY_FAQ}
          reviewedDate="October 2026"
        />

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
            <RelatedContent kind="vs" slug="guesty" />
            <AuthorBio />

            <footer className="mt-10 border-t border-border pt-6">
              <p className="text-lg font-semibold">Other comparisons:</p>
              <ul className="mt-2 grid gap-x-8 sm:grid-cols-2">
                <li>
                  <IntentPrefetchLink
                    href="/vs/hostaway"
                    className={VS_LINK_ROW}
                  >
                    TrueCap vs Hostaway
                  </IntentPrefetchLink>
                </li>
                <li>
                  <IntentPrefetchLink
                    href="/vs/hostfully"
                    className={VS_LINK_ROW}
                  >
                    TrueCap vs Hostfully
                  </IntentPrefetchLink>
                </li>
                <li>
                  <IntentPrefetchLink
                    href="/vs/lodgify"
                    className={VS_LINK_ROW}
                  >
                    TrueCap vs Lodgify
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

const GUESTY_FAQ: FaqItem[] = [
  {
    question: "Is TrueCap a Guesty alternative?",
    answer: (
      <>
        Not directly. Guesty handles post-purchase STR operations across
        portfolio sizes, including a Lite plan published for 1-3 listings.
        TrueCap handles pre-purchase underwriting. Some operators may use both
        at different stages.
      </>
    ),
  },
  {
    question: "Is Guesty worth it for a small STR operator?",
    answer: (
      <>
        It depends on the workflow. Guesty publishes Lite for 1-3 listings and
        offers a Lite trial. Compare its current features, rates, and terms with
        other STR operations tools before choosing; TrueCap does not replace
        those operational features.
      </>
    ),
  },
  {
    question: "Guesty vs Hostaway — which one for a 50+ STR portfolio?",
    answer: (
      <>
        Compare each vendor&apos;s current quote, channel coverage, accounting,
        owner-management, automation, API, support, and implementation terms.
        Guesty publishes Pro for 4-199 listings and Enterprise for 200+; confirm
        Hostaway&apos;s current fit directly with that vendor.
      </>
    ),
  },
  {
    question: "Does Guesty underwrite deals?",
    answer: (
      <>
        Guesty&apos;s plan features cover operations after purchase: channels,
        guest messaging, owner tools, and pricing. Purchase underwriting is not
        among the features it lists. You&apos;d use TrueCap or a spreadsheet
        before buying, then add the property to Guesty after closing.
      </>
    ),
  },
  {
    question: "How do Guesty's published plans scale?",
    answer: (
      <>
        Guesty currently publishes Lite for 1-3 listings, Pro for 4-199, and
        Enterprise for 200+. Features and commercial terms vary by plan, so use
        Guesty&apos;s live pricing page as the source of truth.
      </>
    ),
  },
];

