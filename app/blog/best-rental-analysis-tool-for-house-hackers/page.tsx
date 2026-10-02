/**
 * Listicle blog post: best-rental-analysis-tool-for-house-hackers.
 * Schema: Article + Breadcrumb + ItemList + FAQPage.
 */

import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { BlogByline } from "@/components/marketing/blog-byline";
import { BlogStickyCta } from "@/components/marketing/blog-sticky-cta";
import { RelatedBlogPosts } from "@/components/marketing/related-blog-posts";
import { RelatedContent } from "@/components/marketing/related-content";
import { NewsletterSignup } from "@/components/marketing/newsletter-signup";
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
      className="font-semibold text-primary hover:underline"
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
    <div className="min-h-screen bg-background">
      <Header initialUser={null} initialEntitlements={null} />
      <JsonLd data={articleSchema} />
      <JsonLd data={breadcrumbSchema} />
      <JsonLd data={itemListSchema} />
      <JsonLd data={faqSchema} />

      <main id="main" className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="mb-2">
          <Link
            href="/blog"
            className="inline-flex min-h-11 items-center text-sm text-muted-foreground hover:text-foreground"
          >
            ← Blog
          </Link>
        </div>

        <article>
          <header className="mb-8 sm:mb-10">
            <div className="text-2xs uppercase tracking-widest text-primary font-bold mb-3">
              Ranking · {READING_TIME_MIN} min read
            </div>
            <h1 className="text-3xl sm:text-5xl font-extrabold text-foreground leading-[1.05] tracking-tight text-balance">
              {TITLE}
            </h1>
            <p className="mt-4 text-base sm:text-lg leading-relaxed text-muted-foreground">
              {DESCRIPTION}
            </p>
            <p className="mt-4 text-xs text-muted-foreground">
              Published {PUBLISHED_AT}
            </p>
            <BlogByline />
          </header>

          <section className="mb-10 rounded-2xl border border-border bg-card p-5 sm:p-6">
            <h2 className="text-sm font-bold uppercase tracking-widest text-primary mb-3">
              Quick answer
            </h2>
            <p
              className="text-sm sm:text-base leading-relaxed text-foreground"
            >
              For house hackers specifically: <strong>TrueCap</strong> stands out for the explicit owner-occupant property type (auto-excludes your unit from rent income) and a down-payment field you can set to{" "}
              <a
                href="https://www.hud.gov/helping-americans/loans"
                className="font-semibold text-primary hover:underline"
              >
                FHA&apos;s 3.5%
              </a>
              . <strong>DealCheck</strong>&apos;s help center tells house hackers to{" "}
              <a
                href="https://help.dealcheck.io/en/articles/3996176-can-i-analyze-a-property-i-plan-to-house-hack-with-dealcheck"
                className="font-semibold text-primary hover:underline"
              >
                set the rent of the unit they live in to $0
              </a>
              ; <strong>BiggerPockets</strong>&apos;{" "}
              <a
                href="https://www.biggerpockets.com/rental-property-calculator"
                className="font-semibold text-primary hover:underline"
              >
                official calculator pages
              </a>{" "}
              list no dedicated house-hack calculator; its{" "}
              <a
                href="https://www.biggerpockets.com/real-estate-investing/house-hacking-strategy"
                className="font-semibold text-primary hover:underline"
              >
                house-hacking guide
              </a>{" "}
              offers a free download of its Rent vs. Buy vs. House Hack
              calculator (BiggerPockets sign-up required).
            </p>
          </section>

          <div className="prose prose-neutral max-w-none [&>p]:max-w-[68ch] [&>ul]:max-w-[68ch] [&>ol]:max-w-[68ch] [&>blockquote]:max-w-[68ch] [&>h2]:max-w-[68ch] [&>h3]:max-w-[68ch] prose-headings:font-extrabold prose-headings:text-foreground prose-p:text-foreground prose-p:leading-relaxed prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-strong:text-foreground prose-li:text-foreground prose-li:leading-relaxed">
            <h2>The tools, ranked for house hackers</h2>
            <p>Full disclosure: TrueCap is our tool, and we list it first.</p>

            {TOOLS.map((t) => (
              <div
                key={t.name}
                className="not-prose mb-8 rounded-2xl border border-border bg-card p-5 sm:p-6"
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <div className="text-2xs font-bold uppercase tracking-widest text-primary mb-1.5">
                      #{t.rank} · {t.bestFor}
                    </div>
                    <h3 className="text-xl sm:text-2xl font-extrabold text-foreground leading-tight">
                      {t.name}
                    </h3>
                  </div>
                  <Link
                    href={t.url}
                    className="shrink-0 inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
                  >
                    Deep dive
                    <ArrowUpRight className="size-3" />
                  </Link>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  <strong className="text-foreground">Pricing:</strong>{" "}
                  <Cited text={t.pricing} />
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-3xs font-bold uppercase tracking-widest text-[var(--brand-green)] mb-2">
                      What it covers
                    </p>
                    <ul className="space-y-1.5 text-sm text-foreground">
                      {t.freeCovers.map((p) => (
                        <li key={p} className="flex gap-2">
                          <span className="text-[var(--brand-green)] shrink-0">
                            +
                          </span>
                          <span>
                            <Cited text={p} />
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-3xs font-bold uppercase tracking-widest text-muted-foreground mb-2">
                      Where the gates kick in
                    </p>
                    <ul className="space-y-1.5 text-sm text-foreground">
                      {t.freeGates.map((p) => (
                        <li key={p} className="flex gap-2">
                          <span className="text-muted-foreground/60 shrink-0">
                            −
                          </span>
                          <span>
                            <Cited text={p} />
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div className="rounded-lg bg-primary/5 border border-primary/15 px-3 py-2.5 text-sm">
                  <strong className="text-primary">Pick if:</strong>{" "}
                  <span className="text-foreground">{t.pickIf}</span>
                </div>
              </div>
            ))}

            <h2>Quick decision matrix</h2>
            <ul>
              {DECISION_LINES.map((d) => (
                <li key={d.q}>
                  <strong>&ldquo;{d.q}&rdquo;</strong> {d.a}.
                </li>
              ))}
            </ul>

            <h2>FAQ</h2>
            <div className="not-prose space-y-3">
              {FAQ_ITEMS.map((item) => (
                <details
                  key={item.q}
                  className="group rounded-xl border border-border bg-card p-4 sm:p-5"
                >
                  <summary className="cursor-pointer list-none flex items-start justify-between gap-3 font-bold text-sm sm:text-base text-foreground">
                    <span>{item.q}</span>
                    <span
                      aria-hidden
                      className="mt-1 size-5 shrink-0 rounded-full border border-border text-muted-foreground text-xs leading-none flex items-center justify-center transition-transform group-open:rotate-45"
                    >
                      +
                    </span>
                  </summary>
                  <div className="mt-3 text-sm text-muted-foreground leading-relaxed">
                    <Cited text={item.a} />
                  </div>
                </details>
              ))}
            </div>

            <h2>Try TrueCap free</h2>
            <p>
              The fastest way to know which tool fits your workflow is to run
              one of your real deals through it. TrueCap is free for the core
              underwriting and needs no signup. For a house
              hack, check whether the rented units cover the debt and what the
              deal returns on your down payment — the free{" "}
              <Link
                href="/analyze" prefetch={false}
                className="font-semibold text-primary hover:underline"
              >
                TrueCap analyzer
              </Link>{" "}
              gives you DSCR, cash-on-cash and monthly cash flow from one
              address — then follow the owner-occupied math step by step in our{" "}
              <Link
                href="/blog/house-hack-underwriting-guide"
                className="font-semibold text-primary hover:underline"
              >
                house hack underwriting guide
              </Link>
              .
            </p>
            <p className="not-prose"></p>
          </div>

          <PostSources sources={SOURCES} />

          <div className="mt-10">
            <NewsletterSignup />
          </div>
          <RelatedContent kind="blog" slug={SLUG} title={TITLE} className="mt-10" />

          <div className="mt-10">
            <RelatedBlogPosts currentSlug={SLUG} limit={3} />
          </div>
        </article>
      </main>

      <BlogStickyCta />
      <SiteFooter />
      <ScrollDepthTracker />
    </div>
  );
}
