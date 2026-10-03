/**
 * Listicle blog post: best-free-rental-property-calculator-2026.
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

const SLUG = "best-free-rental-property-calculator-2026";
const TITLE =
  "Best free rental property calculator 2026: 5 tools that actually work for free";
// SERP-facing title (metadata/og only): kept ≤50 chars so the root
// layout's "%s | TrueCap" template stays inside the ~60-char SERP
// window. The on-page <h1> keeps the longer editorial TITLE.
const SERP_TITLE = "Best free rental property calculator 2026: 5 tools";
const DESCRIPTION =
  "Compare 5 free rental property calculators — TrueCap, DealCheck Starter, Stessa, Excel/Sheets templates, and Zillow's mortgage calculator — 2026.";
const PUBLISHED_AT = "2026-06-07";
const MODIFIED_AT = lastmodFor("/blog/best-free-rental-property-calculator-2026") ?? PUBLISHED_AT;
const READING_TIME_MIN = 9;

export const metadata: Metadata = {
  title: SERP_TITLE,
  description: DESCRIPTION,
  keywords: [
    "best free rental property calculator",
    "free rental analysis tool",
    "no signup rental calculator",
    "free real estate investment calculator",
    "rental property calculator no cost",
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

const TOOLS = [
  {
    rank: 1,
    name: "TrueCap",
    bestFor: "No-signup preliminary rental screening",
    url: "/",
    pricing: "Free core analyzer; paid Pro plans on the live pricing page",
    freeCovers: [
      "Cap rate, CoC, DSCR, NOI, monthly cash flow",
      "Editable HUD rent + FRED owner-occupied rate benchmarks; manual local property tax",
      "Buy Box fit, with a Deal score",
      "Unlimited preliminary core screens without signup",
      "Save up to 5 deals + dashboard access",
      "One sale and rent comps lookup",
      "Read-only share links (free sign-in to create; recipients do not sign in)",
    ],
    freeGates: [
      "10-year cash-flow and equity projection (Pro); sensitivity is included in your first decision, then Pro",
      "Offer Ceiling included in your first decision, then Pro; saved-deal comparison (Pro)",
      "Editing, unlimited saves, and comparison of up to 4 deals (Pro)",
      "Additional comps lookups: Pro includes 50 per month",
      "PDF export included in your first decision, then Pro",
    ],
    pickIf:
      "You want preliminary core rental metrics without paying or creating an account.",
  },
  {
    rank: 2,
    name: "DealCheck Starter",
    bestFor: "Free multi-strategy calculators and professional reports",
    url: "/vs/dealcheck",
    pricing: "Starter is free; paid Plus and Pro plans raise usage limits",
    freeCovers: [
      "Rental, BRRRR, Airbnb, and flip calculators",
      "Professional interactive and PDF reports",
      "Up to 15 saved properties",
    ],
    freeGates: [
      "Published limits on photos, comps, and templates",
      "Paid plans raise or remove usage limits",
      "Account required",
    ],
    pickIf:
      "You want several strategy calculators and professional reports on a free account.",
  },
  {
    rank: 3,
    name: "Stessa's Free Calculator",
    bestFor: "Public acquisition calculator plus a free accounting entry point",
    url: "/vs/stessa",
    pricing:
      "Essentials is free; Manage and Pro are paid — verify current terms",
    freeCovers: [
      "Free Essentials accounting and basic financial reports",
      "Public rental returns and income-tax calculator",
    ],
    freeGates: [
      "Schedule E is listed on current Manage and Pro plans, not Essentials",
      "Marketplace access and terms should be verified on Stessa's live pages",
      "Target-derived Offer Ceiling is not described in the official sources reviewed",
    ],
    pickIf:
      "You want a public acquisition calculator plus a free entry plan for ongoing accounting.",
  },
  {
    rank: 4,
    name: "Excel / Google Sheets templates",
    bestFor: "Best if you already have a custom model",
    url: "/vs/excel",
    pricing: "Free (or your existing Office / Google subscription)",
    freeCovers: [
      "Total flexibility — model anything",
      "BiggerPockets' free downloads include spreadsheets and worksheets you can adapt (for example, its Comparable Properties Spreadsheet and Deal Clarity Worksheet)",
    ],
    freeGates: [
      "Most templates require manual rent, rate, and tax lookups",
      "Formulas and inputs require independent review",
      "Large spreadsheets can be cumbersome on mobile",
    ],
    pickIf: "You have a battle-tested Excel template and use mobile rarely.",
  },
  {
    rank: 5,
    name: "Zillow's mortgage calculator",
    bestFor: "Best for PITI only (not actually rental underwriting)",
    url: "https://www.zillow.com/mortgage-calculator",
    pricing: "Free",
    freeCovers: ["Monthly mortgage payment (PITI)", "Affordability calculator"],
    freeGates: [
      "Doesn't calculate cap rate, CoC, DSCR, or cash flow",
      "Not a rental property tool — homebuyer-oriented",
    ],
    pickIf:
      "You only need the mortgage payment math, not the full rental underwrite.",
  },
];

const FAQ_ITEMS = [
  {
    q: "Is TrueCap really free for core rental analysis?",
    a: "Yes. TrueCap's no-account preliminary screen covers cap rate, cash-on-cash, DSCR, NOI, and monthly cash flow. A free account adds up to 5 saved deals, one comps lookup, and the ability to create read-only share links; recipients can view a link without an account. The first complete decision, the free trial, and paid terms are described on the live pricing page.",
  },
  {
    q: "Is BiggerPockets' rental property calculator free?",
    a: "BiggerPockets says two things. Its rental calculator form says results unlock with Pro or a 7-day free trial, and a sign-up prompt on its house hacking guide mentions 5 free calculator reports. Access, trial, and membership terms can change, so verify both the official calculator page and Pro page before choosing it as a free option.",
  },
  {
    q: "What's the catch with TrueCap's free tier?",
    a: "Preliminary core metrics are available without signup. Creating read-only share links, saving up to 5 deals, and using the included comps lookup require a free account; recipients can open a shared link without an account. The first complete decision and the 21-day free trial are usage-limited; Pro adds the repeatable paid workflow described on the live pricing page.",
  },
  {
    q: "Can I underwrite a BRRRR or flip on a free calculator?",
    a: "DealCheck Starter currently includes its BRRRR and flip calculators plus professional reports, subject to published usage limits. TrueCap splits the job: standalone tools cover rehab cost, ARV, and the 70% rule price screen, and the no-signup analyzer screens the stabilized rental — cap rate, cash-on-cash, DSCR, and cash flow — once you enter the post-rehab rent and loan terms. There is no separate DSCR page to run the refinance test in, and TrueCap doesn't offer integrated BRRRR or fix-and-flip lifecycle models right now, so keep a project ledger alongside.",
  },
  {
    q: "How should I compare free calculator plans?",
    a: "Check which metrics, strategy calculators, reports, saved-property limits, comps, and sharing tools are included before entering a deal. Product access and pricing change, so verify current terms on each provider's official page and confirm every starting assumption with property-specific evidence.",
  },
];

const DECISION_LINES: Array<{ q: string; a: string }> = [
  { q: "You want a preliminary core screen without signup.", a: "TrueCap" },
  {
    q: "You want free BRRRR and flip calculators with professional reports.",
    a: "DealCheck Starter",
  },
  { q: "You already use Excel and have a template that works.", a: "Excel" },
  {
    q: "You want free accounting for properties you already own.",
    a: "Stessa Essentials",
  },
  { q: "You only need PITI math.", a: "Zillow's mortgage calculator" },
];

/**
 * Sourced phrases in the card and FAQ strings above, each linked (same tab)
 * to the page that states it. The strings stay plain text, so the FAQ
 * answers feed the FAQPage JSON-LD unchanged; <Cited> links a phrase where
 * the string renders. Each phrase appears once on the page.
 */
const CITATIONS = [
  { phrase: "FRED owner-occupied rate", url: "https://www.freddiemac.com/pmms/about-pmms" },
  { phrase: "paid Plus and Pro plans raise usage limits", url: "https://dealcheck.io/pricing/" },
  { phrase: "Professional interactive and PDF reports", url: "https://dealcheck.io/features/" },
  { phrase: "Up to 15 saved properties", url: "https://dealcheck.io/pricing/" },
  { phrase: "Published limits on photos, comps, and templates", url: "https://dealcheck.io/pricing/" },
  {
    phrase: "Account required",
    url: "https://help.dealcheck.io/en/articles/4471054-how-much-does-dealcheck-cost-can-i-try-it-for-free",
  },
  { phrase: "Essentials is free; Manage and Pro are paid", url: "https://www.stessa.com/pricing/" },
  { phrase: "basic financial reports", url: "https://www.stessa.com/pricing/" },
  {
    phrase: "Public rental returns and income-tax calculator",
    url: "https://www.stessa.com/rental-returns-and-income-tax-calculator/",
  },
  { phrase: "Schedule E is listed on current Manage and Pro plans", url: "https://www.stessa.com/pricing/" },
  { phrase: "official sources reviewed", url: "https://www.stessa.com/investment-property-marketplace/" },
  {
    phrase: "Free (or your existing Office / Google subscription)",
    url: "https://workspace.google.com/products/sheets/",
  },
  { phrase: "BiggerPockets' free downloads", url: "https://www.biggerpockets.com/resources" },
  { phrase: "Monthly mortgage payment (PITI)", url: "https://www.zillow.com/mortgage-calculator/" },
  { phrase: "Affordability calculator", url: "https://www.zillow.com/mortgage-calculator/" },
  {
    phrase: "Doesn't calculate cap rate, CoC, DSCR, or cash flow",
    url: "https://www.zillow.com/mortgage-calculator/",
  },
  {
    phrase: "results unlock with Pro or a 7-day free trial",
    url: "https://www.biggerpockets.com/analysis/rentals/new",
  },
  {
    phrase: "mentions 5 free calculator reports",
    url: "https://www.biggerpockets.com/real-estate-investing/house-hacking-strategy",
  },
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
  { title: "DealCheck, Plans & Pricing", url: "https://dealcheck.io/pricing/" },
  {
    title: "Stessa Help Center, Stessa Investment Properties Marketplace",
    url: "https://support.stessa.com/en/articles/10779191-stessa-investment-properties-marketplace",
  },
  { title: "Stessa, Pricing", url: "https://www.stessa.com/pricing/" },
  {
    title: "Stessa, Investment Property Marketplace",
    url: "https://www.stessa.com/investment-property-marketplace/",
  },
  {
    title: "Stessa, Rental Returns and Income Tax Calculator",
    url: "https://www.stessa.com/rental-returns-and-income-tax-calculator/",
  },
  {
    title: "BiggerPockets, Rental Property Calculator",
    url: "https://www.biggerpockets.com/rental-property-calculator",
  },
  { title: "BiggerPockets, Pro membership", url: "https://www.biggerpockets.com/pro-membership" },
  {
    title: "Freddie Mac, About the Primary Mortgage Market Survey (PMMS)",
    url: "https://www.freddiemac.com/pmms/about-pmms",
  },
  { title: "DealCheck, Property Analysis Software (features)", url: "https://dealcheck.io/features/" },
  {
    title: "DealCheck Help Center, How much does DealCheck cost? Can I try it for free?",
    url: "https://help.dealcheck.io/en/articles/4471054-how-much-does-dealcheck-cost-can-i-try-it-for-free",
  },
  { title: "Google Workspace, Google Sheets", url: "https://workspace.google.com/products/sheets/" },
  { title: "BiggerPockets, Resources (free downloads)", url: "https://www.biggerpockets.com/resources" },
  { title: "Zillow, Mortgage Calculator", url: "https://www.zillow.com/mortgage-calculator/" },
  {
    title: "BiggerPockets, Rental Property Report (calculator form)",
    url: "https://www.biggerpockets.com/analysis/rentals/new",
  },
  {
    title: "BiggerPockets, House Hacking: What Is It, How to Start, and Strategies for Success",
    url: "https://www.biggerpockets.com/real-estate-investing/house-hacking-strategy",
  },
];

export default function BestFreeRentalPropertyCalculator2026Post() {
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

          <Note title="Quick answer" className="mb-6">
            <p className="text-foreground">
              <strong>TrueCap</strong> offers unlimited core rental analyses without signup. A free account adds one comps lookup and creation of read-only share links; recipients can view without an account. <strong>DealCheck Starter</strong> includes{" "}
              <a
                href="https://dealcheck.io/pricing/"
                className="tc-link"
              >
                rental, BRRRR, Airbnb, and flip calculators
              </a>{" "}
              plus professional interactive and PDF reports, with published usage limits. <strong>Stessa</strong> combines an investment-property marketplace and{" "}
              <a
                href="https://support.stessa.com/en/articles/10779191-stessa-investment-properties-marketplace"
                className="tc-link"
              >
                editable acquisition analysis
              </a>{" "}
              with accounting and operations. <strong>Spreadsheet templates</strong> offer flexibility but require formula and input review. <strong>Zillow&apos;s mortgage calculator</strong> covers payment math rather than a full rental underwrite.
            </p>
          </Note>

          <p className="mb-16 text-sm text-muted-foreground">
            This ranking uses the published free access available when reviewed
            August 27, 2026. Verify current terms on the official{" "}
            <a
              href="https://dealcheck.io/pricing/"
              target="_blank"
              rel="noreferrer"
              className="tc-link"
            >
              DealCheck pricing
            </a>
            ,{" "}
            <a
              href="https://www.stessa.com/pricing/"
              target="_blank"
              rel="noreferrer"
              className="tc-link"
            >
              Stessa pricing
            </a>
            ,{" "}
            <a
              href="https://www.stessa.com/investment-property-marketplace/"
              target="_blank"
              rel="noreferrer"
              className="tc-link"
            >
              Stessa marketplace
            </a>
            ,{" "}
            <a
              href="https://www.stessa.com/rental-returns-and-income-tax-calculator/"
              target="_blank"
              rel="noreferrer"
              className="tc-link"
            >
              Stessa returns calculator
            </a>
            ,{" "}
            <a
              href="https://www.biggerpockets.com/rental-property-calculator"
              target="_blank"
              rel="noreferrer"
              className="tc-link"
            >
              BiggerPockets calculator
            </a>
            ,{" "}
            <a
              href="https://www.biggerpockets.com/pro-membership"
              target="_blank"
              rel="noreferrer"
              className="tc-link"
            >
              BiggerPockets Pro
            </a>
            , and{" "}
            <a
              href="https://usetruecap.com/pricing"
              target="_blank"
              rel="noreferrer"
              className="tc-link"
            >
              TrueCap pricing
            </a>{" "}
            pages.
          </p>

          <ArticleBody>
            <h2>The tools, ranked for free-only investors</h2>
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
                      term: "Free tier covers",
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
              underwriting and needs no signup. Browse the
              full set of{" "}
              <Link
                href="/tools"
                className="tc-link"
              >
                free rental property calculators
              </Link>
              , start with the{" "}
              <Link
                href="/tools/1-percent-rule-calculator"
                className="tc-link"
              >
                1% rule calculator
              </Link>
              , or see how the numbers play out in a specific market like our{" "}
              <Link
                href="/markets/atlanta"
                className="tc-link"
              >
                Atlanta rental market breakdown
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
