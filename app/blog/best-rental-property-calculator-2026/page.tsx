/**
 * Listicle blog post: "Best rental property calculator 2026: 7 tools
 * compared". High-commercial-intent comparison-shopper search demand
 * — captures "best rental property calculator" / "best rental
 * analysis tool" queries that aren't direct competitor lookups.
 *
 * Schema: Article + Breadcrumb + FAQPage + ItemList (the 7 calculators
 * as a ranked list).
 */

import type { Metadata } from "next";
import { Fragment, type ReactNode } from "react";
import Link from "next/link";
import {
  ARTICLE_HEADER,
  ARTICLE_LEDE,
  ARTICLE_META,
  ARTICLE_META_LINK,
  ARTICLE_META_NEXT,
  ARTICLE_TITLE,
  ArticleBody,
  ArticleEnd,
  ArticleMain,
  ArticlePage,
  UnderTitleAnalyzeLink,
} from "@/components/marketing/article";
import { BlogByline } from "@/components/marketing/blog-byline";
import { BlogStickyCta } from "@/components/marketing/blog-sticky-cta";
import { FaqSection } from "@/components/marketing/faq-section";
import { Note, RuledList } from "@/components/marketing/page-parts";
import { RelatedBlogPosts } from "@/components/marketing/related-blog-posts";
import { RelatedContent } from "@/components/marketing/related-content";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SiteFooter } from "@/components/marketing/site-footer";
import { getSiteUrl } from "@/lib/site-url";
import { Header } from "@/components/investcalc/header";
import { lastmodFor } from "@/lib/seo/lastmod";
import { JsonLd } from "@/components/seo/json-ld";
import { PostSources } from "@/components/blog/post-sources";

const SLUG = "best-rental-property-calculator-2026";
const TITLE = "Best rental property calculator 2026: 7 tools compared";
// SERP-facing title (metadata/og only): kept ≤50 chars so the root
// layout's "%s | TrueCap" template stays inside the ~60-char SERP
// window. The on-page <h1> keeps the longer editorial TITLE.
const SERP_TITLE = "Best rental property calculator 2026: 7 compared";
const DESCRIPTION =
  "A 2026 comparison of 7 rental property calculators and tools (TrueCap, DealCheck, BiggerPockets and more) on free tier depth, pricing, mobile, and fit.";
const PUBLISHED_AT = "2026-06-07";
const MODIFIED_AT = lastmodFor("/blog/best-rental-property-calculator-2026") ?? PUBLISHED_AT;
const READING_TIME_MIN = 12;

export const metadata: Metadata = {
  title: SERP_TITLE,
  description: DESCRIPTION,
  keywords: [
    "best rental property calculator",
    "best rental analysis tool",
    "rental property calculator comparison",
    "best real estate investment calculator",
    "rental property analyzer ranking",
    "free rental property calculator",
  ],
  alternates: { canonical: `/blog/${SLUG}` },
  openGraph: {
    title: SERP_TITLE,
    description: DESCRIPTION,
    url: `/blog/${SLUG}`,
    type: "article",
    publishedTime: PUBLISHED_AT,
    modifiedTime: MODIFIED_AT,
  },
  twitter: {
    card: "summary_large_image",
    title: SERP_TITLE,
    description: DESCRIPTION,
  },
};

const RANKED_CALCULATORS = [
  {
    rank: 1,
    name: "TrueCap",
    bestFor: "Address-first screening plus paid decision tools",
    url: "/",
    pricing: "Free core; paid Pro — see live pricing",
    pros: [
      "No-account preliminary screen with cap rate, CoC, DSCR, NOI, and monthly cash flow",
      "Editable HUD rent + FRED owner-occupied rate benchmarks, with manual local property tax",
      "Buy Box fit, with a Deal score",
      "Paid Pro plans add 10-year cash-flow and equity projections, sensitivity, Offer Ceiling, saved-deal comparison, and reports; see live pricing for current terms",
      "Lender-facing PDF + shareable read-only deal link with optional custom branding",
    ],
    cons: [
      "PWA, not native iOS/Android apps (DealCheck wins on pure mobile)",
      "Listing import is address-only — paste a Zillow/Redfin link and TrueCap pulls the address, not the listing's price, taxes or photos",
    ],
    pickIf:
      "You want a no-account preliminary screen connected to a paid target, comparison, and reporting workflow.",
  },
  {
    rank: 2,
    name: "DealCheck",
    bestFor: "Best mobile experience + best listing import",
    url: "/vs/dealcheck",
    pricing:
      "Free Starter; Plus $10/mo and Pro $20/mo billed annually ($14 / $29 billed monthly), as of October 2026",
    pros: [
      "Native iOS and Android apps",
      "Address search that imports property details, value and rent estimates, taxes and photos from public records and listings",
      "Established tool (site copyright 2015–2026) with dedicated rental and BRRRR calculators",
      "Long-term cash-flow projections and optional after-tax cash-flow calculations (projections are listed on every plan, including free Starter)",
    ],
    cons: [
      "Free tier caps saved properties (15 at a time) and requires signup",
      "Plus and Pro raise the saved-property, photo, comp and template limits and unlock the Purchase Offer Calculator, investment-potential insights and all purchase criteria; custom-branded reports need Pro",
      "Address import pulls property tax amounts and value/rent estimates, but not labeled HUD or FRED benchmarks; refreshed records and listings need Plus or Pro",
    ],
    pickIf:
      "You underwrite on mobile at showings all day and want native apps.",
  },
  {
    rank: 3,
    name: "BiggerPockets Calculator",
    bestFor: "Best if you already pay for BiggerPockets Pro",
    url: "/vs/biggerpockets-calculator",
    pricing: "Bundled with BiggerPockets Pro ~$390/year (~$32.50/mo)",
    pros: [
      "Bundled with the BiggerPockets community (forums, books, podcasts)",
      "Printable PDF reports built for sharing with lenders or partners",
      "Separate BRRRR and fix-and-flip calculators alongside the rental calculator",
    ],
    cons: [
      "Unlimited calculator access is one of several Pro benefits BiggerPockets lists, with a forum badge, discounted BPCON tickets and partner perks",
      "Its calculator form says results unlock with Pro or a 7-day free trial; a sign-up prompt on its house hacking guide mentions 5 free calculator reports",
    ],
    pickIf:
      "You're already paying for BiggerPockets for the community and the calculator is a bonus.",
  },
  {
    rank: 4,
    name: "Mashvisor",
    bestFor: "Best for market discovery (heatmaps + neighborhood scoring)",
    url: "/vs/mashvisor",
    pricing:
      "$39.99–$99.99/month billed annually ($49.99–$119.99 billed quarterly) for Lite, Standard and Professional; Enterprise is custom-priced (as of October 2026)",
    pros: [
      "Neighborhood heatmaps and investment opportunity scores (heatmaps start on the Standard plan)",
      "Strong Airbnb / short-term-rental occupancy + ADR data",
      "Rental comps built in",
      "The top published plan (Professional, $99.99/month billed annually) adds multifamily cities, more exports and CRM tools",
    ],
    cons: [
      "Built mainly for market discovery and rental-revenue projection",
      "Listing-level cap rate starts from Mashvisor's estimates; customizing expenses and ROI estimates requires the Standard plan or higher",
    ],
    pickIf:
      "You're picking which city or neighborhood to invest in next, not underwriting a specific property.",
  },
  {
    rank: 5,
    name: "Stessa",
    bestFor: "Best acquisition-to-operations breadth",
    url: "/vs/stessa",
    pricing:
      "Free Essentials plus paid Manage and Pro — see live pricing (reviewed 2026-08-27)",
    pros: [
      "Investment-property marketplace with filters, map layers, watchlists, and buy-box alerts",
      "Listing-level sale/rent comps and editable offer, financing, rent, and operating-cost assumptions",
      "Accounting, bank feeds, reporting, and landlord operations after acquisition",
    ],
    cons: [
      "Broader operations product rather than a narrowly focused acquisition decision workflow",
      "The official sources reviewed do not describe a target-derived Offer Ceiling",
      "Plan limits and marketplace terms should be checked on Stessa's live pages",
    ],
    pickIf:
      "You want listing discovery and editable acquisition analysis to continue into accounting and landlord operations.",
  },
  {
    rank: 6,
    name: "Excel / Google Sheets",
    bestFor: "Best if you've already invested time in a custom model",
    url: "/vs/excel",
    pricing: "Free (or your existing Office / Google Workspace subscription)",
    pros: [
      "Total control — model anything",
      "Free if you already have Office / Workspace",
      "Familiar to most investors with finance backgrounds",
    ],
    cons: [
      "Formula errors compound silently across every deal",
      "Large spreadsheets can be cumbersome on mobile",
      "No address auto-fill, no live data, no shareable read-only link",
      "Version drift kills collaboration with partners and lenders",
      "Maintenance cost over time is real — every market change requires manual updates",
    ],
    pickIf:
      "You have a battle-tested model that handles your specific deal type (syndication waterfalls, custom debt structures) and don't need mobile.",
  },
  {
    rank: 7,
    name: "Roofstock",
    bestFor: "Best for browsing listings with built-in projections",
    url: "/vs/roofstock",
    pricing:
      "Roofstock's retail property listings now route to Stessa's investment-property marketplace; check Stessa's live pages for current buyer terms",
    pros: [
      "Listings for individual investors now appear in Stessa's marketplace, powered by Roofstock",
      "Listings include built-in rent projections and comps, with projected cash flow, cap rate and ROI that recalculate from your own inputs",
    ],
    cons: [
      "Treat any listing projection as a starting point and verify vacancy and capital-expense assumptions yourself",
      "Limited to properties listed in the marketplace, not any address",
    ],
    pickIf:
      "You want to browse marketplace listings with projections built in. Pair with TrueCap to pressure-test the listing projection before offering.",
  },
];

const FAQ_ITEMS = [
  {
    q: "What's the best rental property calculator in 2026?",
    a: "TrueCap may fit investors who want a no-account preliminary screen, labeled HUD rent and FRED rate benchmarks, manual local property tax, Buy Box fit, and a Deal score. DealCheck may fit users who need native iOS/Android apps. BiggerPockets may fit investors already paying for its community. Verify current pricing and features on each provider's site.",
  },
  {
    q: "What's the best free rental property calculator?",
    a: "TrueCap offers unlimited preliminary core screens with cap rate, CoC, DSCR, NOI, and monthly cash flow without signup. DealCheck and BiggerPockets publish different account, report, and saved-property limits. Verify all three providers' current official pages before choosing; complete-decision and paid allowances differ from core screening access.",
  },
  {
    q: "DealCheck vs BiggerPockets vs TrueCap — which is best?",
    a: "It depends on the workflow. TrueCap offers a no-account preliminary screen plus target, comparison, and reporting tools. DealCheck publishes native mobile apps and listing-import features. BiggerPockets may make sense if you already value the community bundled with its paid membership. Compare current limits and prices on the official pages.",
  },
  {
    q: "Is Mashvisor a rental property calculator?",
    a: "Partly — Mashvisor shows listing-level cap rate and cash-on-cash estimates (with customizable expenses on Standard and above, and listing upload-and-analyze on Professional), but its focus is market discovery and rental-revenue projection. It's strong for picking which neighborhood to invest in; weaker for underwriting a specific address. Mashvisor can be paired with a per-deal underwriting tool such as TrueCap or DealCheck.",
  },
  {
    q: "Why are spreadsheets risky for rental analysis?",
    a: "Three reasons: formula errors compound silently across every deal you analyze with that sheet; version drift kills partner / lender collaboration; large spreadsheets can be cumbersome on mobile. Spreadsheets work for one-off custom modeling (syndication waterfalls, unusual debt structures) but they're fragile for standard buy-and-hold underwriting.",
  },
  {
    q: "What about Stessa, RentRedi, or Avail — are those calculators?",
    a: "Their scopes differ. Stessa now includes an investment-property marketplace, buy boxes, comps, and editable acquisition underwriting before continuing into accounting and operations. RentRedi is more operations-led (rent collection, tenant screening and maintenance); check Avail's current feature page directly. Compare each provider's current official feature and pricing pages rather than treating all three as one category.",
  },
];

/**
 * Sourced phrases in the card and FAQ strings above, each linked (same tab)
 * to the page that states it. The strings stay plain text, so the FAQ
 * answers feed the FAQPage JSON-LD unchanged; <Cited> links a phrase where
 * the string renders. Each phrase appears once on the page.
 */
const CITATIONS = [
  { phrase: "FRED owner-occupied rate", url: "https://www.freddiemac.com/pmms/about-pmms" },
  { phrase: "Plus $10/mo and Pro $20/mo billed annually", url: "https://dealcheck.io/pricing/" },
  { phrase: "Native iOS and Android apps", url: "https://dealcheck.io/" },
  {
    phrase: "Address search that imports property details",
    url: "https://help.dealcheck.io/en/articles/2046991-how-to-import-property-data-from-public-records-listings",
  },
  { phrase: "site copyright 2015–2026", url: "https://dealcheck.io/features/" },
  { phrase: "projections are listed on every plan", url: "https://dealcheck.io/pricing/" },
  { phrase: "15 at a time", url: "https://dealcheck.io/pricing/" },
  { phrase: "unlock the Purchase Offer Calculator", url: "https://dealcheck.io/pricing/" },
  {
    phrase: "refreshed records and listings need Plus or Pro",
    url: "https://help.dealcheck.io/en/articles/2046991-how-to-import-property-data-from-public-records-listings",
  },
  { phrase: "~$390/year (~$32.50/mo)", url: "https://www.biggerpockets.com/pro-membership" },
  { phrase: "forums, books, podcasts", url: "https://www.biggerpockets.com/" },
  { phrase: "Printable PDF reports", url: "https://www.biggerpockets.com/rental-property-calculator" },
  { phrase: "BRRRR and fix-and-flip calculators", url: "https://www.biggerpockets.com/rental-property-calculator" },
  { phrase: "one of several Pro benefits", url: "https://www.biggerpockets.com/pro-membership" },
  { phrase: "results unlock with Pro or a 7-day free trial", url: "https://www.biggerpockets.com/analysis/rentals/new" },
  {
    phrase: "mentions 5 free calculator reports",
    url: "https://www.biggerpockets.com/real-estate-investing/house-hacking-strategy",
  },
  { phrase: "$39.99–$99.99/month billed annually", url: "https://www.mashvisor.com/pricing" },
  { phrase: "heatmaps start on the Standard plan", url: "https://www.mashvisor.com/pricing" },
  { phrase: "occupancy + ADR data", url: "https://www.mashvisor.com/airbnb-data" },
  { phrase: "Rental comps built in", url: "https://www.mashvisor.com/pricing" },
  {
    phrase: "customizing expenses and ROI estimates requires the Standard plan or higher",
    url: "https://www.mashvisor.com/pricing",
  },
  { phrase: "Professional, $99.99/month billed annually", url: "https://www.mashvisor.com/pricing" },
  { phrase: "Free Essentials plus paid Manage and Pro", url: "https://www.stessa.com/pricing/" },
  {
    phrase: "map layers, watchlists, and buy-box alerts",
    url: "https://www.stessa.com/investment-property-marketplace/",
  },
  {
    phrase: "sale/rent comps",
    url: "https://support.stessa.com/en/articles/10779191-stessa-investment-properties-marketplace",
  },
  { phrase: "bank feeds", url: "https://www.stessa.com/pricing/" },
  { phrase: "official sources reviewed", url: "https://www.stessa.com/investment-property-marketplace/" },
  {
    phrase: "Free (or your existing Office / Google Workspace subscription)",
    url: "https://workspace.google.com/products/sheets/",
  },
  {
    phrase: "now route to Stessa's investment-property marketplace",
    url: "https://www.roofstock.com/how-it-works",
  },
  {
    phrase: "recalculate from your own inputs",
    url: "https://support.stessa.com/en/articles/10779191-stessa-investment-properties-marketplace",
  },
  {
    phrase: "properties listed in the marketplace",
    url: "https://support.stessa.com/en/articles/10779191-stessa-investment-properties-marketplace",
  },
  { phrase: "native mobile apps and listing-import features", url: "https://dealcheck.io/" },
  { phrase: "listing upload-and-analyze on Professional", url: "https://www.mashvisor.com/pricing" },
  { phrase: "rent collection, tenant screening and maintenance", url: "https://www.rentredi.com/" },
];

type CitationLink = { phrase: string; link: ReactNode };

const CITATION_LINKS: CitationLink[] = CITATIONS.map((citation) => ({
  phrase: citation.phrase,
  link: (
    <a
      key={citation.phrase}
      href={citation.url}
      className="tc-link"
    >
      {citation.phrase}
    </a>
  ),
}));

/**
 * Renders `text` with each cited phrase linked to its source. Loops over the
 * links by value (no index access), so the SEO fence's computed-access rule
 * holds for the whole file.
 */
function Cited({ text }: { text: string }) {
  const parts: ReactNode[] = [];
  let rest = text;
  while (rest) {
    let next: CitationLink | null = null;
    let at = rest.length;
    for (const candidate of CITATION_LINKS) {
      const found = rest.indexOf(candidate.phrase);
      if (found !== -1 && found < at) {
        at = found;
        next = candidate;
      }
    }
    if (next === null) {
      parts.push(rest);
      break;
    }
    parts.push(rest.slice(0, at), next.link);
    rest = rest.slice(at + next.phrase.length);
  }
  return <>{parts}</>;
}

/** Every source linked on the page, in order of first use. */
const SOURCES = [
  {
    title: "Freddie Mac, About the Primary Mortgage Market Survey (PMMS)",
    url: "https://www.freddiemac.com/pmms/about-pmms",
  },
  { title: "DealCheck, Plans & Pricing", url: "https://dealcheck.io/pricing/" },
  { title: "DealCheck, home page (iOS and Android apps)", url: "https://dealcheck.io/" },
  {
    title: "DealCheck Help Center, How to import property data from public records & listings",
    url: "https://help.dealcheck.io/en/articles/2046991-how-to-import-property-data-from-public-records-listings",
  },
  { title: "DealCheck, Property Analysis Software (features)", url: "https://dealcheck.io/features/" },
  { title: "BiggerPockets, Pro membership", url: "https://www.biggerpockets.com/pro-membership" },
  { title: "BiggerPockets, home page", url: "https://www.biggerpockets.com/" },
  {
    title: "BiggerPockets, Rental Property Calculator",
    url: "https://www.biggerpockets.com/rental-property-calculator",
  },
  {
    title: "BiggerPockets, Rental Property Report (calculator form)",
    url: "https://www.biggerpockets.com/analysis/rentals/new",
  },
  {
    title: "BiggerPockets, House Hacking: What Is It, How to Start, and Strategies for Success",
    url: "https://www.biggerpockets.com/real-estate-investing/house-hacking-strategy",
  },
  { title: "Mashvisor, Plans & Pricing", url: "https://www.mashvisor.com/pricing" },
  { title: "Mashvisor, Airbnb Data & Analytics", url: "https://www.mashvisor.com/airbnb-data" },
  { title: "Stessa, Pricing", url: "https://www.stessa.com/pricing/" },
  {
    title: "Stessa, Investment Property Marketplace",
    url: "https://www.stessa.com/investment-property-marketplace/",
  },
  {
    title: "Stessa Help Center, Stessa Investment Properties Marketplace",
    url: "https://support.stessa.com/en/articles/10779191-stessa-investment-properties-marketplace",
  },
  { title: "Google Workspace, Google Sheets", url: "https://workspace.google.com/products/sheets/" },
  { title: "Roofstock, How it works", url: "https://www.roofstock.com/how-it-works" },
  { title: "RentRedi, home page", url: "https://www.rentredi.com/" },
];

export default function BestRentalPropertyCalculator2026Post() {
  const siteUrl = getSiteUrl();
  const url = `${siteUrl}/blog/${SLUG}`;

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: TITLE,
    description: DESCRIPTION,
    image: [`${siteUrl}/home.jpg`],
    datePublished: PUBLISHED_AT,
    dateModified: MODIFIED_AT,
    author: { "@type": "Organization", "@id": `${siteUrl}/#organization`, name: "TrueCap", url: siteUrl },
    publisher: { "@id": `${siteUrl}/#organization` },
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "TrueCap", item: siteUrl },
      {
        "@type": "ListItem",
        position: 2,
        name: "Blog",
        item: `${siteUrl}/blog`,
      },
      { "@type": "ListItem", position: 3, name: TITLE, item: url },
    ],
  };

  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: RANKED_CALCULATORS.map((c) => ({
      "@type": "ListItem",
      position: c.rank,
      name: c.name,
      description: c.bestFor,
    })),
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_ITEMS.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };

  return (
    <ArticlePage>
      <Header initialUser={null} initialEntitlements={null} />
      <JsonLd data={articleSchema} />
      <JsonLd data={breadcrumbSchema} />
      <JsonLd data={itemListSchema} />
      <JsonLd data={faqSchema} />

      <ArticleMain>
        <article>
          <header className={ARTICLE_HEADER}>
            <h1 className={ARTICLE_TITLE}>{TITLE}</h1>
            <p className={ARTICLE_META}>
              <Link href="/blog" className={ARTICLE_META_LINK}>
                Blog
              </Link>{" "}
              · Ranking · {READING_TIME_MIN} min read
            </p>
            <p className={ARTICLE_META_NEXT}>
              Published {PUBLISHED_AT} · Updated {MODIFIED_AT}
            </p>
            <BlogByline />
            <UnderTitleAnalyzeLink />
            <p className={ARTICLE_LEDE}>
              {DESCRIPTION}
            </p>
          </header>

          <Note title="Quick answer" titleAs="h2" className="mb-16">
            <p className="text-foreground">
              For investors who want address-first acquisition screening:{" "}
              <strong>TrueCap</strong> (a no-account preliminary screen, paid
              decision tools, editable HUD/FRED benchmarks, and manual local
              property tax). <strong>DealCheck</strong> if you live on mobile at
              showings. <strong>BiggerPockets</strong> if you already pay for
              the community. <strong>Mashvisor</strong> for market discovery
              rather than per-deal underwriting. <strong>Stessa</strong> for a
              marketplace and editable acquisition analysis that continue into
              accounting and landlord operations.
              <strong> Excel</strong> only if you have a battle-tested model
              already. <strong>Roofstock</strong> if you want to browse
              investment listings with built-in rent projections (now in
              Stessa&apos;s marketplace).
            </p>
          </Note>

          <ArticleBody>
            <h2>How we ranked these</h2>
            <p>
              The 7 tools below are ones we compared for searches like
              &quot;best rental property calculator&quot; or &quot;rental
              analysis tool&quot;. Full disclosure: TrueCap is our tool, and we
              rank it first. If you just
              want a single metric fast, our free{" "}
              <Link
                href="/tools/1-percent-rule-calculator"
                className="tc-link"
              >
                1% rule calculator
              </Link>
              ,{" "}
              <Link
                href="/tools/mortgage-payment-calculator"
                className="tc-link"
              >
                mortgage payment calculator
              </Link>
              , and{" "}
              <Link
                href="/tools/closing-cost-calculator"
                className="tc-link"
              >
                closing cost calculator
              </Link>{" "}
              each handle one piece of the underwrite with no signup. Ranking
              criteria, weighted roughly by impact on a typical solo investor:
            </p>
            <ol>
              <li>
                <strong>Free tier depth</strong> — can you actually underwrite a
                deal without paying? How many per month?
              </li>
              <li>
                <strong>Pricing</strong> — total cost for the calculator alone,
                not bundled with community or other services.
              </li>
              <li>
                <strong>Address auto-fill</strong> — does it pre-fill inputs
                like rent, rate, or tax from your address, or does it leave you
                to look everything up?
              </li>
              <li>
                <strong>Mobile UX</strong> — can you underwrite at a showing on
                your phone?
              </li>
              <li>
                <strong>Pro feature depth</strong> — cash-flow and equity
                projections, sensitivity, co-branded share links, PDF export.
              </li>
              <li>
                <strong>Audience fit</strong> — is the tool built for solo
                investors, scaling landlords, professional managers, or someone
                else?
              </li>
            </ol>

            <h2>The 7 calculators, ranked</h2>

            {RANKED_CALCULATORS.map((c) => (
              <Fragment key={c.name}>
                <h3>{c.name}</h3>
                <p className="text-base text-muted-foreground">
                  #{c.rank} · {c.bestFor}
                </p>
                <p>
                  <Link href={c.url} className="tc-link inline-flex min-h-11 items-center">
                    Deep dive
                  </Link>
                </p>
                <p>
                  <strong>Pricing:</strong> <Cited text={c.pricing} />
                </p>
                <RuledList
                  className="not-prose my-6"
                  items={[
                    {
                      term: "Pros",
                      detail: (
                        <ul className="space-y-1.5 text-foreground">
                          {c.pros.map((pro) => (
                            <li key={pro} className="flex gap-2">
                              <span className="shrink-0 text-muted-foreground">+</span>
                              <span><Cited text={pro} /></span>
                            </li>
                          ))}
                        </ul>
                      ),
                    },
                    {
                      term: "Cons",
                      detail: (
                        <ul className="space-y-1.5 text-foreground">
                          {c.cons.map((con) => (
                            <li key={con} className="flex gap-2">
                              <span className="shrink-0 text-muted-foreground">−</span>
                              <span><Cited text={con} /></span>
                            </li>
                          ))}
                        </ul>
                      ),
                    },
                  ]}
                />
                <p>
                  <strong>Pick if:</strong> {c.pickIf}
                </p>
              </Fragment>
            ))}

            <h2>Quick decision matrix</h2>
            <ul>
              <li>
                <strong>
                  &quot;I want address-first screening and an Offer
                  Ceiling.&quot;
                </strong>{" "}
                Evaluate TrueCap&apos;s current free and Pro terms on
                the live pricing page.
              </li>
              <li>
                <strong>
                  &quot;I want a no-account preliminary screen.&quot;
                </strong>{" "}
                TrueCap includes the core underwriting metrics before signup;
                complete-decision allowances and paid terms are shown on the
                live pricing page.
              </li>
              <li>
                <strong>
                  &quot;I underwrite on my phone at every showing.&quot;
                </strong>{" "}
                DealCheck — native iOS / Android apps built for deal analysis.
              </li>
              <li>
                <strong>&quot;I already pay for BiggerPockets.&quot;</strong>{" "}
                Use their calculator — you&apos;re already there.
              </li>
              <li>
                <strong>
                  &quot;I&apos;m scouting which city to invest in.&quot;
                </strong>{" "}
                Mashvisor — heatmaps and neighborhood scores.
              </li>
              <li>
                <strong>
                  &quot;I want listing discovery, acquisition analysis, and
                  accounting in one product.&quot;
                </strong>{" "}
                Evaluate Stessa&apos;s current marketplace, underwriting, and
                plan terms.
              </li>
              <li>
                <strong>
                  &quot;I want to browse listings with projections already
                  built in.&quot;
                </strong>{" "}
                Roofstock (its listings now appear in Stessa&apos;s
                marketplace) — but pressure-test the listing projection in
                TrueCap before offering.
              </li>
              <li>
                <strong>
                  &quot;I have a custom Excel model that works for my
                  deals.&quot;
                </strong>{" "}
                Keep it — but consider TrueCap free as a sanity check on the
                formulas.
              </li>
            </ul>
          </ArticleBody>

          {/* faqSchema above is the one FAQPage node for these rows. */}
          <FaqSection
            id="faq"
            variant="inline"
            heading="FAQ"
            items={FAQ_ITEMS}
            renderAnswer={(item) => <Cited text={item.a} />}
            structuredData={false}
            contact={null}
          />

          <ArticleBody className="mt-16">
            <h2>Try TrueCap free</h2>
            <p>
              The fastest way to know which calculator fits your workflow is to
              run one of your real deals through it. TrueCap is free and needs
              no signup. Paste an address, review the editable
              rent/rate benchmarks, enter local property tax, and type purchase
              price.
            </p>
          </ArticleBody>
        </article>

        <PostSources sources={SOURCES} />

        <RelatedContent kind="blog" slug={SLUG} title={TITLE} className="mt-10" />
        <RelatedBlogPosts currentSlug={SLUG} limit={3} />
      </ArticleMain>
      <ArticleEnd>
        <BlogStickyCta inArticleColumn />
      </ArticleEnd>
      <SiteFooter />
      <ScrollDepthTracker />
    </ArticlePage>
  );
}
