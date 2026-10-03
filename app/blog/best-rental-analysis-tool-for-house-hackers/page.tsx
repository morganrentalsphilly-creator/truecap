/**
 * Listicle blog post: best-rental-analysis-tool-for-house-hackers.
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

const SLUG = "best-rental-analysis-tool-for-house-hackers";
const TITLE = "Best rental analysis tool for house hackers (2026)";
const DESCRIPTION =
  "Best calculators for house hackers in 2026: TrueCap, DealCheck, BiggerPockets, and what owner-occupant underwriting needs that standard tools miss.";
const PUBLISHED_AT = "2026-06-07";
const MODIFIED_AT = lastmodFor("/blog/best-rental-analysis-tool-for-house-hackers") ?? PUBLISHED_AT;
const READING_TIME_MIN = 8;

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "best house hacking calculator",
    "house hack analysis tool",
    "owner occupant rental calculator",
    "best calculator for house hackers",
    "fha rental property calculator",
  ],
  alternates: { canonical: `/blog/${SLUG}` },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: `/blog/${SLUG}`,
    type: "article",
    publishedTime: PUBLISHED_AT,
    modifiedTime: MODIFIED_AT,
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

const TOOLS = [
  {
    rank: 1,
    name: "TrueCap",
    bestFor: "Best owner-occupant property type",
    url: "/vs/biggerpockets-for-house-hacking",
    pricing: "Free core; paid Pro — see live pricing",
    freeCovers: [
      "Explicit 'owner-occupant' property type with per-unit setup",
      "Mark which unit you live in — TrueCap excludes it from rent income",
      "Down-payment field you can set to FHA's 3.5%",
      "Owner-occupant results that count your unit at $0 rent, so the cash-flow line shows what the property costs you each month",
    ],
    freeGates: [
      "10-year cash-flow and equity projection (Pro); model the post-move-out case as a separate full-rental scenario",
    ],
    pickIf:
      "You want a calculator built for house-hacking, not a multifamily calculator you adjust manually.",
  },
  {
    rank: 2,
    name: "DealCheck",
    bestFor: "Mobile + property-data import (multifamily calculator)",
    url: "/vs/dealcheck",
    pricing:
      "Free Starter; Plus $10/mo and Pro $20/mo billed annually ($14 / $29 billed monthly), as of October 2026",
    freeCovers: [
      "Standard multifamily underwriting",
      "Address search that imports public-record and listing data",
      "Native iOS + Android apps",
    ],
    freeGates: [
      "No explicit owner-occupant unit logic — you manually exclude your unit's 'rent' from income",
      "DealCheck's house-hack guidance does not describe a dedicated housing-cost metric",
    ],
    pickIf:
      "You underwrite on mobile and are comfortable manually adjusting multifamily math for house-hacking.",
  },
  {
    rank: 3,
    name: "BiggerPockets Rental Property Calculator",
    bestFor: "BiggerPockets community + house-hack content",
    url: "/vs/biggerpockets-calculator",
    pricing: "BP Pro ~$390/yr",
    freeCovers: [
      "BiggerPockets' Pro rental property calculator, which you adapt for a house hack",
      "House-hacking articles and forum discussion in the BP community",
      "A free Rent vs. Buy vs. House Hack calculator download from its house-hacking guide (BiggerPockets sign-up required)",
    ],
    freeGates: [
      "Its calculator form says results unlock with Pro or a 7-day free trial; a sign-up prompt on its house hacking guide mentions 5 free calculator reports",
    ],
    pickIf:
      "You're already paying for BiggerPockets and want to adapt its bundled rental calculator for a house hack.",
  },
  {
    rank: 4,
    name: "Excel / Google Sheets",
    bestFor: "Custom house-hack scenarios",
    url: "/vs/excel",
    pricing: "Free (with your existing Office / Workspace)",
    freeCovers: [
      "Total flexibility — model house-hack-into-rental transitions, unusual FHA scenarios",
    ],
    freeGates: [
      "You do all the math + scenario modeling manually",
      "Large spreadsheets can be cumbersome on mobile",
    ],
    pickIf:
      "You have a battle-tested house-hack model with custom FHA / VA scenarios.",
  },
];

const FAQ_ITEMS = [
  {
    q: "What makes a house-hack calculator different from a standard rental calculator?",
    a: "The owner-occupant unit. In a standard 2-4 unit multifamily underwrite, every unit produces rent. In a house hack, the unit you live in doesn't (you're paying 'rent' to yourself), so the income side needs to exclude that unit. TrueCap's owner-occupant property type handles this automatically. In DealCheck, for example, you set the rent of the unit you live in to $0 yourself.",
  },
  {
    q: "What's 'effective rent saved' and why does it matter for house hacking?",
    a: "Your monthly housing cost as a house hacker = PITI minus rent from your rental units. Compare that cost with the rent on a comparable apartment to see how much you save; that saving is your 'effective rent saved'. If your PITI is $2,800/month and your rental units bring in $1,900/month, your housing cost is $900/month before maintenance, vacancy and capital reserves on the rented units, which is $900/month less than the $1,800/month apartment you'd otherwise rent. TrueCap counts your own unit at $0 rent, so the monthly cash-flow result shows what the property costs you.",
  },
  {
    q: "Can I model FHA 3.5%-down financing for a house hack?",
    a: "Yes — TrueCap's down payment field is configurable from 0% to 100%. Set it to 3.5% for FHA (the minimum for borrowers with a credit score of 580 or higher; 500–579 scores need 10% down), enter the lender's annual premium in the dedicated PMI / MIP field, and select the loan-life option when it applies. Include any unfinanced upfront premium in closing costs. PITI, cash flow, and the long-term projection recalculate automatically.",
  },
  {
    q: "How do I model the post-move-out scenario?",
    a: "Save the live-in underwrite, then create a separate full-rental scenario with your former unit rented and compare the two. TrueCap does not currently include an automatic 'year you move out' switch, so the explicit scenarios keep the assumptions honest and independently reviewable.",
  },
  {
    q: "Is house hacking still a good strategy in 2026?",
    a: "Math still works for the right property in the right market. Higher mortgage rates than in 2018-2022 (see the Freddie Mac 30-year average on FRED) make it tougher, but with FHA 3.5% down and a 2-4 unit property where rental units cover most of PITI, the math can still come out ahead of renting an equivalent apartment; run your own numbers to check. Underwrite carefully — TrueCap's sensitivity grid (free on your first decision, then Pro) stress-tests rent + vacancy + rate so you don't bet on optimistic numbers.",
  },
];

const DECISION_LINES: Array<{ q: string; a: string }> = [
  { q: "You want owner-occupant logic baked in.", a: "TrueCap" },
  { q: "You underwrite mobile at every showing.", a: "DealCheck" },
  { q: "You're already paying for BiggerPockets.", a: "BiggerPockets bundled" },
  { q: "You have unusual FHA / VA / partner-equity structures.", a: "Excel" },
];

/**
 * Sourced phrases in the card and FAQ strings above, each linked (same tab)
 * to the page that states it. The strings stay plain text, so the FAQ
 * answers feed the FAQPage JSON-LD unchanged; <Cited> links a phrase where
 * the string renders. Each phrase appears once on the page.
 */
const CITATIONS = [
  { phrase: "Plus $10/mo and Pro $20/mo billed annually", url: "https://dealcheck.io/pricing/" },
  { phrase: "Standard multifamily underwriting", url: "https://dealcheck.io/pricing/" },
  {
    phrase: "Address search that imports public-record and listing data",
    url: "https://help.dealcheck.io/en/articles/2046991-how-to-import-property-data-from-public-records-listings",
  },
  { phrase: "Native iOS + Android apps", url: "https://dealcheck.io/" },
  {
    phrase: "house-hack guidance",
    url: "https://help.dealcheck.io/en/articles/3996176-can-i-analyze-a-property-i-plan-to-house-hack-with-dealcheck",
  },
  { phrase: "BP Pro ~$390/yr", url: "https://www.biggerpockets.com/pro-membership" },
  { phrase: "Pro rental property calculator", url: "https://www.biggerpockets.com/rental-property-calculator" },
  { phrase: "House-hacking articles and forum discussion", url: "https://www.biggerpockets.com/blog/house-hacking" },
  { phrase: "results unlock with Pro or a 7-day free trial", url: "https://www.biggerpockets.com/analysis/rentals/new" },
  {
    phrase: "mentions 5 free calculator reports",
    url: "https://www.biggerpockets.com/real-estate-investing/house-hacking-strategy",
  },
  {
    phrase: "Rent vs. Buy vs. House Hack calculator download",
    url: "https://www.biggerpockets.com/real-estate-investing/house-hacking-strategy",
  },
  {
    phrase: "Free (with your existing Office / Workspace)",
    url: "https://workspace.google.com/products/sheets/",
  },
  {
    phrase: "the minimum for borrowers with a credit score of 580 or higher",
    url: "https://www.hud.gov/sites/documents/10-29ml.pdf",
  },
  {
    phrase: "the loan-life option when it applies",
    url: "https://www.hud.gov/sites/dfiles/OCHCO/documents/2023-05hsgml.pdf",
  },
  {
    phrase: "see the Freddie Mac 30-year average on FRED",
    url: "https://fred.stlouisfed.org/series/MORTGAGE30US",
  },
  { phrase: "FHA 3.5% down and a 2-4 unit property", url: "https://www.hud.gov/helping-americans/loans" },
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
  { title: "HUD, Let FHA Loans Help You", url: "https://www.hud.gov/helping-americans/loans" },
  {
    title: "DealCheck Help Center, Can I analyze a property I plan to house-hack with DealCheck?",
    url: "https://help.dealcheck.io/en/articles/3996176-can-i-analyze-a-property-i-plan-to-house-hack-with-dealcheck",
  },
  {
    title: "BiggerPockets, Rental Property Calculator",
    url: "https://www.biggerpockets.com/rental-property-calculator",
  },
  { title: "DealCheck, Plans & Pricing", url: "https://dealcheck.io/pricing/" },
  {
    title: "DealCheck Help Center, How to import property data from public records & listings",
    url: "https://help.dealcheck.io/en/articles/2046991-how-to-import-property-data-from-public-records-listings",
  },
  { title: "DealCheck, home page (iOS and Android apps)", url: "https://dealcheck.io/" },
  { title: "BiggerPockets, Pro membership", url: "https://www.biggerpockets.com/pro-membership" },
  { title: "BiggerPockets, House Hacking articles", url: "https://www.biggerpockets.com/blog/house-hacking" },
  {
    title: "BiggerPockets, Rental Property Report (calculator form)",
    url: "https://www.biggerpockets.com/analysis/rentals/new",
  },
  {
    title: "BiggerPockets, House Hacking: What Is It, How to Start, and Strategies for Success",
    url: "https://www.biggerpockets.com/real-estate-investing/house-hacking-strategy",
  },
  { title: "Google Workspace, Google Sheets", url: "https://workspace.google.com/products/sheets/" },
  {
    title: "HUD Mortgagee Letter 2010-29 (FHA minimum credit scores and loan-to-value limits)",
    url: "https://www.hud.gov/sites/documents/10-29ml.pdf",
  },
  {
    title: "HUD Mortgagee Letter 2023-05 (FHA annual and upfront mortgage insurance premiums)",
    url: "https://www.hud.gov/sites/dfiles/OCHCO/documents/2023-05hsgml.pdf",
  },
  {
    title: "FRED (Federal Reserve Bank of St. Louis), 30-Year Fixed Rate Mortgage Average in the United States (MORTGAGE30US)",
    url: "https://fred.stlouisfed.org/series/MORTGAGE30US",
  },
];

export default function BestRentalAnalysisToolForHouseHackersPost() {
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
              Published {PUBLISHED_AT}
            </p>
            <BlogByline />
            <UnderTitleAnalyzeLink />
            <p className={ARTICLE_LEDE}>
              {DESCRIPTION}
            </p>
          </header>

          <Note title="Quick answer" className="mb-16">
            <p className="text-foreground">
              For house hackers specifically: <strong>TrueCap</strong> stands out for the explicit owner-occupant property type (auto-excludes your unit from rent income) and a down-payment field you can set to{" "}
              <a
                href="https://www.hud.gov/helping-americans/loans"
                className="tc-link"
              >
                FHA&apos;s 3.5%
              </a>
              . <strong>DealCheck</strong>&apos;s help center tells house hackers to{" "}
              <a
                href="https://help.dealcheck.io/en/articles/3996176-can-i-analyze-a-property-i-plan-to-house-hack-with-dealcheck"
                className="tc-link"
              >
                set the rent of the unit they live in to $0
              </a>
              ; <strong>BiggerPockets</strong>&apos;{" "}
              <a
                href="https://www.biggerpockets.com/rental-property-calculator"
                className="tc-link"
              >
                official calculator pages
              </a>{" "}
              list no dedicated house-hack calculator; its{" "}
              <a
                href="https://www.biggerpockets.com/real-estate-investing/house-hacking-strategy"
                className="tc-link"
              >
                house-hacking guide
              </a>{" "}
              offers a free download of its Rent vs. Buy vs. House Hack
              calculator (BiggerPockets sign-up required).
            </p>
          </Note>

          <ArticleBody>
            <h2>The tools, ranked for house hackers</h2>
            <p>Full disclosure: TrueCap is our tool, and we list it first.</p>

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
                  <strong>Pricing:</strong> <Cited text={t.pricing} />
                </p>
                <RuledList
                  className="not-prose my-6"
                  items={[
                    {
                      term: "What it covers",
                      detail: (
                        <ul className="space-y-1.5 text-foreground">
                          {t.freeCovers.map((p) => (
                            <li key={p} className="flex gap-2">
                              <span className="shrink-0 text-muted-foreground">+</span>
                              <span><Cited text={p} /></span>
                            </li>
                          ))}
                        </ul>
                      ),
                    },
                    {
                      term: "Where the gates kick in",
                      detail: (
                        <ul className="space-y-1.5 text-foreground">
                          {t.freeGates.map((p) => (
                            <li key={p} className="flex gap-2">
                              <span className="shrink-0 text-muted-foreground">−</span>
                              <span><Cited text={p} /></span>
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
            renderAnswer={(item) => <Cited text={item.a} />}
            structuredData={false}
            contact={null}
          />

          <ArticleBody className="mt-16">
            <h2>Try TrueCap free</h2>
            <p>
              The fastest way to know which tool fits your workflow is to run
              one of your real deals through it. TrueCap is free for the core
              underwriting and needs no signup. For a house
              hack, check whether the rented units cover the debt and what the
              deal returns on your down payment — the free{" "}
              <Link
                href="/analyze" prefetch={false}
                className="tc-link"
              >
                TrueCap analyzer
              </Link>{" "}
              gives you DSCR, cash-on-cash and monthly cash flow from an
              address, the asking price and each unit&apos;s bedroom count — then
              follow the owner-occupied math step by step in our{" "}
              <Link
                href="/blog/house-hack-underwriting-guide"
                className="tc-link"
              >
                house hack underwriting guide
              </Link>
              .
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
