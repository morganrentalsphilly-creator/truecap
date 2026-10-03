/**
 * Listicle blog post: best-short-term-rental-analysis-tool-2026.
 * Schema: Article + Breadcrumb + ItemList + FAQPage.
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

const SLUG = "best-short-term-rental-analysis-tool-2026";
const TITLE =
  "Best short-term rental analysis tool 2026: 6 tools STR investors compare";
// SERP-facing title (metadata/og only): kept ≤50 chars so the root
// layout's "%s | TrueCap" template stays inside the ~60-char SERP
// window. The on-page <h1> keeps the longer editorial TITLE.
const SERP_TITLE = "Best short-term rental analysis tool 2026";
const DESCRIPTION =
  "2026 ranking of the best STR analysis tools: AirDNA for revenue data, TrueCap for underwriting, Mashvisor for market discovery, plus the PMS platforms.";
const PUBLISHED_AT = "2026-06-07";
const MODIFIED_AT = lastmodFor("/blog/best-short-term-rental-analysis-tool-2026") ?? PUBLISHED_AT;
const READING_TIME_MIN = 10;

export const metadata: Metadata = {
  title: SERP_TITLE,
  description: DESCRIPTION,
  keywords: [
    "best str analysis tool",
    "best airbnb investment calculator",
    "best short term rental analyzer",
    "airbnb deal analysis 2026",
    "str investment tool",
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

/** Inline source link inside the tool entries. */
const SOURCE_LINK = "tc-link";

type Tool = {
  rank: number;
  name: string;
  bestFor: string;
  url: string;
  pricing: ReactNode;
  /** Left-column heading; defaults to "Free tier covers". */
  coversLabel?: string;
  freeCovers: ReactNode[];
  freeGates: ReactNode[];
  pickIf: ReactNode;
};

const TOOLS: Tool[] = [
  {
    rank: 1,
    name: "AirDNA (revenue data)",
    bestFor: "Best STR revenue projection per property",
    url: "/vs/airdna",
    pricing: (
      <>
        Free plan; Market Research{" "}
        <a href="https://www.airdna.co/pricing" className={SOURCE_LINK}>
          $34/mo billed annually ($400/yr) or $125 month-to-month
        </a>
        ; Property Manager by quote (as of September 2026)
      </>
    ),
    freeCovers: [
      "Free plan with a limited Rentalizer and limited market insights",
      <>
        Key metrics by market:{" "}
        <a
          href="https://help.airdna.co/en/articles/11954306-navigating-the-new-airdna-market-explorer-platform"
          className={SOURCE_LINK}
        >
          ADR, occupancy and RevPAR
        </a>
      </>,
    ],
    freeGates: [
      "The customizable Rentalizer is on paid plans (Market Research includes 5 Rentalizer Agent Reports)",
      "Historical market data, comparable sets and future-demand data start on the paid Market Research plan",
    ],
    pickIf: (
      <>
        You need address-level STR revenue projections derived from real{" "}
        <a href="https://www.airdna.co/" className={SOURCE_LINK}>
          Airbnb + Vrbo data
        </a>
        .
      </>
    ),
  },
  {
    rank: 2,
    name: "TrueCap (underwriting)",
    bestFor: "Best STR underwriting (LTR/STR side-by-side in Pro)",
    url: "/vs/dealcheck-for-short-term-rentals",
    pricing: "Free core; paid Pro — see live pricing",
    freeCovers: [
      "Enter AirDNA's nightly rate and occupancy in TrueCap's Short-term Rental (beta) mode, then run the full cap rate / DSCR / cash flow",
      "Run the same property as a long-term and a short-term scenario (side-by-side comparison is Pro)",
    ],
    freeGates: [
      "Sensitivity grid stress-tests STR revenue ±10% (first decision free, then Pro)",
      "Seasonal months require separate saved scenarios",
      "No tax-specific module; use a qualified professional for STR eligibility and taxpayer-specific treatment",
    ],
    pickIf:
      "You have AirDNA's revenue projection and need to turn it into a buy/no-buy decision.",
  },
  {
    rank: 3,
    name: "Mashvisor (market discovery)",
    bestFor: "Best STR market scouting (heatmaps + neighborhood analytics)",
    url: "/vs/mashvisor-for-short-term-rentals",
    pricing: (
      <>
        <a href="https://www.mashvisor.com/pricing" className={SOURCE_LINK}>
          $39.99–$99.99/mo billed annually ($49.99–$119.99/mo billed
          quarterly)
        </a>
        ; Enterprise custom (as of October 2026)
      </>
    ),
    coversLabel: "Paid plans cover",
    freeCovers: [
      "Neighborhood analytics for traditional and Airbnb income and cash-on-cash (paid Standard plan)",
      "Heatmaps of rental income, cash-on-cash return and Airbnb occupancy (paid Standard plan)",
    ],
    freeGates: [
      "No free tier on Mashvisor's pricing page; plans are billed quarterly or annually",
    ],
    pickIf:
      "You're scouting which city or neighborhood to invest in next (not underwriting a specific address).",
  },
  {
    rank: 4,
    name: "DealCheck (alternative underwriting)",
    bestFor: "Mobile + listing import for STR-curious buyers",
    url: "/vs/dealcheck-for-short-term-rentals",
    pricing: (
      <>
        Free Starter;{" "}
        <a href="https://dealcheck.io/pricing/" className={SOURCE_LINK}>
          Plus $10/mo and Pro $20/mo billed annually ($14 / $29 billed
          monthly)
        </a>
        , as of September 2026
      </>
    ),
    freeCovers: [
      "Standard rental underwriting, override rent with STR projection",
      <a key="import" href="https://dealcheck.io/features/" className={SOURCE_LINK}>
        Property data import from public records and online listings
      </a>,
      "Native iOS + Android apps",
    ],
    freeGates: [
      "No dedicated LTR-vs-STR toggle; you compare two versions of the property side by side",
      "No STR-specific tax loophole modeling",
    ],
    pickIf:
      "You're mobile-first at showings and willing to manually toggle between LTR and STR scenarios.",
  },
  {
    rank: 5,
    name: "Hostaway / Hostfully (PMS — post-purchase)",
    bestFor: "Best STR management AFTER closing",
    url: "/vs/hostaway",
    pricing: (
      <>
        Hostaway: quote-based (no published price); Hostfully:{" "}
        <a
          href="https://www.hostfully.com/pricing/property-management-software/"
          className={SOURCE_LINK}
        >
          from $15 per property per month plus a platform fee
        </a>{" "}
        (as of September 2026)
      </>
    ),
    coversLabel: "What they cover",
    freeCovers: [
      <a key="channels" href="https://www.hostaway.com/" className={SOURCE_LINK}>
        Channel manager across Airbnb / Vrbo / Booking
      </a>,
      "Guest messaging automation",
      "Dynamic pricing integrations",
    ],
    freeGates: ["NOT underwriting tools — these manage STRs you already own"],
    pickIf:
      "You've already closed and need to operate the property. Use TrueCap to underwrite, then pick a PMS.",
  },
  {
    rank: 6,
    name: "Excel / Google Sheets",
    bestFor: "Custom seasonal STR cash-flow modeling",
    url: "/vs/excel",
    pricing: "Free",
    freeCovers: [
      "Total flexibility — model seasonal ADR curves, weekend premiums, off-season vacancy",
    ],
    freeGates: [
      "You build the seasonality model yourself",
      "Mobile is broken at showings",
    ],
    pickIf:
      "You have a battle-tested STR template with custom seasonal modeling.",
  },
];

const FAQ_ITEMS = [
  {
    q: "What's the best all-in-one STR investment tool?",
    a: "There isn't one. STR investing requires three different jobs: revenue projection (AirDNA), underwriting (TrueCap or DealCheck), and post-purchase ops (Hostaway / Hostfully / Lodgify). Tools that claim to do all three either do one well and the others poorly, or are enterprise-priced. Plan on pairing a revenue-data tool with an underwriting tool before you buy, then adding a PMS after closing.",
  },
  {
    q: "AirDNA vs Mashvisor for STR — which one?",
    a: "AirDNA is more STR-specific: it publishes ADR, occupancy and RevPAR by market. Mashvisor covers both STR and LTR plus broader market analysis. If you only buy short-term rentals, AirDNA's narrower focus fits. If you compare LTR and STR on the same property, Mashvisor's broader scope fits.",
  },
  {
    q: "Can TrueCap model short-term rental revenue?",
    a: "Yes, in beta. TrueCap's Short-term Rental mode models revenue as nightly rate × occupancy; it does not fully model platform fees, turnover, lodging tax, seasonality or local STR eligibility. TrueCap doesn't pull AirDNA data automatically; you copy the numbers across.",
  },
  {
    q: "What management rate should I use for STR underwriting?",
    a: "Management fees vary by market and service level, so get written quotes from local long-term and full-service STR managers. If you self-manage, still budget for software, cleaning coordination and your own time. TrueCap's management field is editable.",
  },
  {
    q: "Does TrueCap support the STR tax loophole?",
    a: "No. TrueCap does not currently expose a tax-specific analysis module, determine STR eligibility, or model cost-segregation components and bonus depreciation. Use a qualified tax professional for material-participation, REPS, cost-segregation, and taxpayer-specific modeling.",
  },
];

const DECISION_LINES: Array<{ q: string; a: string }> = [
  {
    q: "You need address-level STR revenue projections.",
    a: "AirDNA Rentalizer",
  },
  {
    q: "You have the revenue and need full underwriting.",
    a: "TrueCap (free for basic, Pro for sensitivity)",
  },
  { q: "You're scouting which city to invest in.", a: "Mashvisor" },
  {
    q: "You've already closed and need to operate the STR.",
    a: "Hostaway or Hostfully (PMS)",
  },
  {
    q: "You want a single all-in-one tool.",
    a: "No single tool covers the full workflow — pair a revenue-data tool with an underwriting tool, then add a PMS after closing",
  },
];

export default function BestShortTermRentalAnalysisTool2026Post() {
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
    itemListElement: TOOLS.map((t) => ({
      "@type": "ListItem",
      position: t.rank,
      name: t.name,
      description: t.bestFor,
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

          <Note title="Quick answer" className="mb-16">
            <p className="text-foreground">
              STR investors need two tools: one for revenue projection (<strong>AirDNA</strong> or <strong>Mashvisor</strong>) and one for underwriting (<strong>TrueCap</strong>, <strong>DealCheck</strong>, or a spreadsheet). PMS platforms (<strong>Hostfully</strong>, <strong>Hostaway</strong>, <strong>Guesty</strong>) come after the deal closes — they don&apos;t underwrite. The combined stack is the workflow.
            </p>
          </Note>

          <ArticleBody>
            <h2>The tools, ranked for short-term rental investors</h2>

            {TOOLS.map((t) => (
              <Fragment key={t.name}>
                <h3>{t.name}</h3>
                <p className="text-base text-muted-foreground">
                  #{t.rank} · {t.bestFor}
                </p>
                <p>
                  <Link href={t.url} className="tc-link inline-flex min-h-11 items-center">
                    Deep dive
                  </Link>
                </p>
                <p>
                  <strong>Pricing:</strong> {t.pricing}
                </p>
                <RuledList
                  className="not-prose my-6"
                  items={[
                    {
                      term: t.coversLabel ?? "Free tier covers",
                      detail: (
                        <ul className="space-y-1.5 text-foreground">
                          {t.freeCovers.map((p, i) => (
                            <li key={i} className="flex gap-2">
                              <span className="shrink-0 text-muted-foreground">+</span>
                              <span>{p}</span>
                            </li>
                          ))}
                        </ul>
                      ),
                    },
                    {
                      term: "Where the gates kick in",
                      detail: (
                        <ul className="space-y-1.5 text-foreground">
                          {t.freeGates.map((p, i) => (
                            <li key={i} className="flex gap-2">
                              <span className="shrink-0 text-muted-foreground">−</span>
                              <span>{p}</span>
                            </li>
                          ))}
                        </ul>
                      ),
                    },
                  ]}
                />
                <p>
                  <strong>Pick if:</strong> {t.pickIf}
                </p>
              </Fragment>
            ))}

            <h2>Quick decision matrix</h2>
            <ul>
              {DECISION_LINES.map((d) => (
                <li key={d.q}>
                  <strong>&ldquo;{d.q}&rdquo;</strong> {d.a}.
                </li>
              ))}
            </ul>
          </ArticleBody>

          {/* faqSchema above is the one FAQPage node for these rows. */}
          <FaqSection
            id="faq"
            variant="inline"
            heading="FAQ"
            items={FAQ_ITEMS}
            structuredData={false}
            contact={null}
          />

          <ArticleBody className="mt-16">
            <h2>Try TrueCap free</h2>
            <p>
              The fastest way to know which tool fits your workflow is to run
              one of your real deals through it. TrueCap is free for the core
              underwriting, with no signup required. Pressure-test
              the financing on a short-term rental and check the return on your
              cash — the free{" "}
              <Link
                href="/analyze" prefetch={false}
                className="tc-link"
              >
                TrueCap analyzer
              </Link>{" "}
              returns DSCR, cash-on-cash and monthly cash flow from an address,
              the asking price and a bedroom count — then walk through the full nightly-rate math in our{" "}
              <Link
                href="/blog/short-term-rental-underwriting-playbook"
                className="tc-link"
              >
                short-term rental underwriting playbook
              </Link>
              .
            </p>
          </ArticleBody>
        </article>

        <PostSources
          sources={[
            {
              title: "AirDNA, Pricing (plans and what each includes)",
              url: "https://www.airdna.co/pricing",
            },
            {
              title: "AirDNA Help Center, Navigating the new AirDNA Market Explorer platform",
              url: "https://help.airdna.co/en/articles/11954306-navigating-the-new-airdna-market-explorer-platform",
            },
            {
              title: "AirDNA, Short-term rental data analytics (home page)",
              url: "https://www.airdna.co/",
            },
            {
              title: "Mashvisor, Pricing",
              url: "https://www.mashvisor.com/pricing",
            },
            {
              title: "DealCheck, Plans & Pricing",
              url: "https://dealcheck.io/pricing/",
            },
            {
              title: "DealCheck, Property analysis software features",
              url: "https://dealcheck.io/features/",
            },
            {
              title: "Hostfully, Property management software pricing",
              url: "https://www.hostfully.com/pricing/property-management-software/",
            },
            {
              title: "Hostaway, Vacation rental software (home page)",
              url: "https://www.hostaway.com/",
            },
          ]}
        />

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
