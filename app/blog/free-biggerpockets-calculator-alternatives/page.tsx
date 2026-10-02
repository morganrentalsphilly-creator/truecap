/**
 * Listicle blog post: free-biggerpockets-calculator-alternatives.
 *
 * Target queries: "free biggerpockets calculator alternative",
 * "biggerpockets calculator alternative", "biggerpockets rental
 * calculator free", "free rental property calculator like
 * biggerpockets". The /vs/biggerpockets-calculator page targets
 * "TrueCap vs BiggerPockets" phrasing; this post targets the
 * "free alternatives" listicle pattern the SERP actually rewards.
 *
 * The premise is what BiggerPockets itself says about access, and it says
 * two things: its rental calculator form unlocks results with Pro or a
 * 7-day free trial, and a sign-up prompt on its house hacking guide
 * mentions 5 free calculator reports (both rendered 2 October 2026; Pro is
 * $39/mo or $390/yr on its membership page). The post states both and does
 * not say which one a free account gets.
 * Rules baked in:
 * TrueCap listed first but disclosed as ours; the other five are real
 * free options, and BP gets a "when Pro is worth it" section.
 *
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
import { ScrollX } from "@/components/ui/scroll-x";
import { Header } from "@/components/investcalc/header";
import { lastmodFor } from "@/lib/seo/lastmod";
import { JsonLd } from "@/components/seo/json-ld";
import { PostSources } from "@/components/blog/post-sources";

const SLUG = "free-biggerpockets-calculator-alternatives";
const TITLE_PLAIN = "Free BiggerPockets Calculator Alternatives (2026)";
const DESCRIPTION =
  "BiggerPockets' calculator form unlocks results with Pro or a 7-day trial; a sign-up prompt mentions 5 free reports. Six free alternatives and what each covers.";
const PUBLISHED_AT = "2026-07-14";
const MODIFIED_AT = lastmodFor("/blog/free-biggerpockets-calculator-alternatives") ?? PUBLISHED_AT;
const READING_TIME_MIN = 10;

export const metadata: Metadata = {
  title: TITLE_PLAIN,
  description: DESCRIPTION,
  keywords: [
    "free biggerpockets calculator alternative",
    "biggerpockets calculator alternative",
    "biggerpockets rental calculator free",
    "free rental property calculator",
    "biggerpockets calculator limit",
    "rental analysis without biggerpockets pro",
  ],
  alternates: { canonical: `/blog/${SLUG}` },
  openGraph: {
    title: TITLE_PLAIN,
    description: DESCRIPTION,
    url: `/blog/${SLUG}`,
    type: "article",
    publishedTime: PUBLISHED_AT,
    modifiedTime: MODIFIED_AT,
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE_PLAIN,
    description: DESCRIPTION,
  },
};

/** Inline source link inside the not-prose table and tool cards. */
const SOURCE_LINK = "font-semibold text-primary hover:underline";

type Tool = {
  rank: number;
  name: string;
  bestFor: string;
  url: string;
  pricing: ReactNode;
  freeCovers: ReactNode[];
  freeGates: ReactNode[];
  pickIf: string;
  disclosure?: string;
};

const TOOLS: Tool[] = [
  {
    rank: 1,
    name: "TrueCap",
    bestFor: "No-account preliminary rental screening",
    url: "/vs/biggerpockets-calculator",
    pricing: "Free core; paid Pro — see live pricing",
    disclosure:
      "Full disclosure: TrueCap is our tool. We put it first because the free tier runs unlimited preliminary rental screens with no account. The side-by-side comparison shows where BiggerPockets still wins.",
    freeCovers: [
      "Cap rate, cash-on-cash, DSCR, NCF, monthly cash flow — unlimited, no signup",
      "Editable HUD rent + FRED mortgage-rate benchmarks; manual local property tax",
      "Buy Box fit, with a Deal score",
      <>
        Every operating expense category{" "}
        <a
          href="https://www.biggerpockets.com/rental-property-calculator"
          className={SOURCE_LINK}
        >
          the BP form collects
        </a>
      </>,
      "Save up to 5 deals + dashboard access",
    ],
    freeGates: [
      "Editing + unlimited saves + comparing deals (Pro)",
      "10-year cash-flow and equity projections (Pro); sensitivity is included in your first decision, then Pro",
      "PDF export + co-branded share links (Pro)",
    ],
    pickIf:
      "You want the BP rental-calculator workflow without a Pro subscription — and prefer rent and rate starting points filled in for you.",
  },
  {
    rank: 2,
    name: "DealCheck (free Starter plan)",
    bestFor: "Best free plan with saving built in",
    url: "/vs/dealcheck",
    pricing: (
      <>
        Free Starter;{" "}
        <a href="https://dealcheck.io/pricing/" className={SOURCE_LINK}>
          Plus $10/mo, Pro $20/mo (billed annually)
        </a>
      </>
    ),
    freeCovers: [
      "Full deal analysis on the free plan — signup required",
      "Save up to 15 properties at a time",
      "Native iOS + Android apps on every tier",
    ],
    freeGates: [
      "15-saved-property cap (paid tiers raise it)",
      "Photos, comps, and templates are limited until Plus/Pro",
    ],
    pickIf:
      "You want to save and revisit a rotating shortlist of deals for free and like working from a native mobile app.",
  },
  {
    rank: 3,
    name: "Calculator.net rental property calculator",
    bestFor: "Best no-frills, no-signup one-pager",
    url: "https://www.calculator.net/rental-property-calculator.html",
    pricing: (
      <a
        href="https://www.calculator.net/rental-property-calculator.html"
        className={SOURCE_LINK}
      >
        Free (ad-supported)
      </a>
    ),
    freeCovers: [
      "IRR, cap rate, and cash flow from one long form",
      "No account, no report limit",
    ],
    freeGates: [
      "No DSCR, no verdict, no benchmarks — you interpret the raw output",
      "Nothing is saved, and the form starts from generic sample values rather than data for your address",
      "Generic layout with ads, not built for repeat underwriting",
    ],
    pickIf:
      "You want a quick second opinion on one deal and don't care about saving anything.",
  },
  {
    rank: 4,
    name: "Stessa (Essentials plan)",
    bestFor: "Public acquisition calculator plus free accounting entry point",
    url: "/vs/stessa",
    pricing: (
      <>
        <a href="https://www.stessa.com/pricing/" className={SOURCE_LINK}>
          Essentials free; paid Manage and Pro
        </a>{" "}
        — verify live pricing
      </>
    ),
    freeCovers: [
      <a
        key="tax-calculator"
        href="https://www.stessa.com/rental-returns-and-income-tax-calculator/"
        className={SOURCE_LINK}
      >
        Public rental returns and income-tax calculator
      </a>,
      "Accounting and basic financial reports under current Essentials terms",
    ],
    freeGates: [
      "Marketplace access and terms should be verified on Stessa's live pages",
      "Schedule E is listed on current Manage and Pro plans",
      "No target-derived Offer Ceiling described in official sources reviewed",
    ],
    pickIf:
      "You want a public acquisition calculator plus a free entry plan for ongoing accounting.",
  },
  {
    rank: 5,
    name: "RentCast (free plan)",
    bestFor: "Best free rent number to feed any calculator",
    url: "/vs/rentcast",
    pricing: (
      <a href="https://www.rentcast.io/pricing" className={SOURCE_LINK}>
        Free plan; Pro from $12/mo
      </a>
    ),
    freeCovers: [
      "Nationwide rent estimates with nearby comps, free",
      "Track a handful of properties with market alerts",
    ],
    freeGates: [
      "Rent data only — no cash flow, financing, or return math",
      "Free plan caps comps and tracked properties",
    ],
    pickIf:
      "Your sticking point is the rent estimate BP makes you type in — get it free here, then underwrite elsewhere.",
  },
  {
    rank: 6,
    name: "Excel / Google Sheets templates",
    bestFor: "Best if you want to own the model",
    url: "/vs/excel",
    pricing: "Free (or your existing Office / Google subscription)",
    freeCovers: [
      "Total flexibility — BiggerPockets' FilePlace hosts free, member-shared spreadsheet templates",
      "No report limits, ever; your assumptions visible in every cell",
    ],
    freeGates: [
      "All rent, rate, and tax lookups are manual",
      "Formula errors compound silently",
      "Rough experience on a phone at a showing",
    ],
    pickIf:
      "You analyze at a desk, want full control, and will actually maintain the spreadsheet.",
  },
];

const FAQ_ITEMS = [
  {
    q: "How many free reports does the BiggerPockets calculator give you?",
    a: "BiggerPockets says two things. Its rental calculator form says results unlock with Pro or a 7-day free trial, and a sign-up prompt on its house hacking guide mentions 5 free calculator reports with a BiggerPockets account. Its membership page lists unlimited calculator access, discounted BPCON tickets and a forum badge under Pro at $39/month, and adds partner perks on the $390/year annual plan, among them software from RentRedi and lender and insurance discounts (as of October 2026). The calculator is one piece of a membership.",
  },
  {
    q: "Is there a truly free alternative to the BiggerPockets rental calculator?",
    a: "Yes, several. TrueCap's free tier runs unlimited preliminary rental screens (cap rate, cash-on-cash, DSCR, and cash flow) with no signup — disclosure: TrueCap is our tool. DealCheck's free Starter plan analyzes and saves up to 15 properties. Calculator.net's rental calculator is free and unlimited with no account. Each trades away something different — signup, saved-deal caps, or data auto-fill.",
  },
  {
    q: "Is BiggerPockets Pro worth $390 a year just for the calculators?",
    a: "It depends on which benefits you'd use. BiggerPockets lists unlimited calculator access as one Pro benefit among several: a forum badge, discounted BPCON tickets, partner software (RentRedi, Baselane) and lender, insurance and materials discounts. If the calculator is the only part you'd use, compare it with the free tools above before you renew.",
  },
  {
    q: "Can I keep using BiggerPockets for free without the calculators?",
    a: "Yes. BiggerPockets' membership page offers a free account to learn and connect, and its sign-up prompt says an account unlocks the community forums and newsletter, plus 5 free calculator reports. You can read the forums on a free account and run your numbers in a separate free calculator.",
  },
];

const TABLE_ROWS = TOOLS.map((t) => ({
  name: t.name,
  pricing: t.pricing,
  bestFor: t.bestFor,
}));

export default function FreeBiggerPocketsCalculatorAlternativesPost() {
  const siteUrl = getSiteUrl();
  const url = `${siteUrl}/blog/${SLUG}`;

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: TITLE_PLAIN,
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
      { "@type": "ListItem", position: 3, name: TITLE_PLAIN, item: url },
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
              {TITLE_PLAIN}
            </h1>
            <p className="mt-4 text-base sm:text-lg leading-relaxed text-muted-foreground">
              BiggerPockets says two things about free access to its
              calculators. Its{" "}
              <a
                href="https://www.biggerpockets.com/analysis/rentals/new"
                className="font-semibold text-primary hover:underline"
              >
                rental calculator form
              </a>{" "}
              says results unlock with Pro or a{" "}
              <a
                href="https://www.biggerpockets.com/investment-calculators"
                className="font-semibold text-primary hover:underline"
              >
                7-day free trial
              </a>
              , and a sign-up prompt on its{" "}
              <a
                href="https://www.biggerpockets.com/real-estate-investing/house-hacking-strategy"
                className="font-semibold text-primary hover:underline"
              >
                house hacking guide
              </a>{" "}
              mentions 5 free calculator reports. Its membership page lists
              unlimited calculator access under BiggerPockets Pro at{" "}
              <a
                href="https://www.biggerpockets.com/membership-types"
                className="font-semibold text-primary hover:underline"
              >
                $39/month or $390/year
              </a>{" "}
              (as of October 2026). Here are six free alternatives, including
              one we make (clearly labeled), plus a note on when Pro is the
              right buy.
            </p>
            <p className="mt-4 text-xs text-muted-foreground">
              Published {PUBLISHED_AT} · Updated {MODIFIED_AT}
            </p>
            <BlogByline />
          </header>

          <section className="mb-10 rounded-2xl border border-border bg-card p-5 sm:p-6">
            <h2 className="text-sm font-bold uppercase tracking-widest text-primary mb-3">
              Quick answer
            </h2>
            <p className="text-sm sm:text-base leading-relaxed text-foreground">
              <strong>TrueCap</strong> (that&apos;s us) is the closest free
              replacement — unlimited preliminary rental screens, no signup,
              with labeled rent and rate starting points (you enter property
              tax yourself).{" "}
              <strong>DealCheck&apos;s free Starter plan</strong> adds saving (
              <a
                href="https://dealcheck.io/pricing/"
                className="font-semibold text-primary hover:underline"
              >
                up to 15 properties
              </a>
              ) and native apps. <strong>Calculator.net</strong> is the
              no-signup one-pager, <strong>Stessa</strong> publishes a{" "}
              <a
                href="https://www.stessa.com/investment-property-marketplace/"
                className="font-semibold text-primary hover:underline"
              >
                marketplace acquisition workflow
              </a>{" "}
              and a free accounting entry plan, <strong>RentCast</strong> gives
              you a free rent number, and a <strong>spreadsheet</strong> —
              including BiggerPockets&apos;{" "}
              <a
                href="https://www.biggerpockets.com/files"
                className="font-semibold text-primary hover:underline"
              >
                member-shared free templates
              </a>{" "}
              — remains the fully-manual fallback.
            </p>
          </section>

          <div className="prose prose-neutral max-w-none [&>p]:max-w-[68ch] [&>ul]:max-w-[68ch] [&>ol]:max-w-[68ch] [&>blockquote]:max-w-[68ch] [&>h2]:max-w-[68ch] [&>h3]:max-w-[68ch] prose-headings:font-extrabold prose-headings:text-foreground prose-p:text-foreground prose-p:leading-relaxed prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-strong:text-foreground prose-li:text-foreground prose-li:leading-relaxed">
            <h2>The free alternatives at a glance</h2>

            <ScrollX label="Data table" className="not-prose mb-8 overflow-x-auto rounded-2xl border border-border bg-card">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr className="text-left">
                    <th className="py-3 px-3 text-3xs font-bold uppercase tracking-widest text-muted-foreground">
                      Tool
                    </th>
                    <th className="py-3 px-3 text-3xs font-bold uppercase tracking-widest text-muted-foreground">
                      Pricing (September 2026)
                    </th>
                    <th className="py-3 px-3 text-3xs font-bold uppercase tracking-widest text-muted-foreground">
                      Best for
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {TABLE_ROWS.map((row) => (
                    <tr
                      key={row.name}
                      className="border-t border-border align-top"
                    >
                      <td className="py-3 px-3 text-sm font-semibold text-foreground">
                        {row.name}
                      </td>
                      <td className="py-3 px-3 text-xs leading-relaxed text-foreground/85">
                        {row.pricing}
                      </td>
                      <td className="py-3 px-3 text-xs leading-relaxed text-foreground/85">
                        {row.bestFor}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollX>

            <h2>The 6 alternatives, ranked</h2>

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
                  {t.url.startsWith("/") ? (
                    <Link
                      href={t.url}
                      className="shrink-0 inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
                    >
                      Side-by-side
                      <ArrowUpRight className="size-3" />
                    </Link>
                  ) : (
                    <a
                      href={t.url}
                      target="_blank"
                      rel="noopener"
                      className="shrink-0 inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
                    >
                      Visit
                      <ArrowUpRight className="size-3" />
                    </a>
                  )}
                </div>
                {t.disclosure ? (
                  <p className="mb-4 rounded-lg border border-primary/15 bg-primary/5 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
                    {t.disclosure}
                  </p>
                ) : null}
                <p className="text-sm text-muted-foreground mb-4">
                  <strong className="text-foreground">Pricing:</strong>{" "}
                  {t.pricing}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-3xs font-bold uppercase tracking-widest text-[var(--brand-green)] mb-2">
                      Free tier covers
                    </p>
                    <ul className="space-y-1.5 text-sm text-foreground">
                      {t.freeCovers.map((p, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="text-[var(--brand-green)] shrink-0">
                            +
                          </span>
                          <span>{p}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-3xs font-bold uppercase tracking-widest text-muted-foreground mb-2">
                      Where the gates kick in
                    </p>
                    <ul className="space-y-1.5 text-sm text-foreground">
                      {t.freeGates.map((p, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="text-muted-foreground/60 shrink-0">
                            −
                          </span>
                          <span>{p}</span>
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

            <h2>When BiggerPockets Pro is actually worth it</h2>
            <p>
              BiggerPockets Pro isn&apos;t a calculator subscription,
              it&apos;s a membership that includes calculators. If you use the
              forums for partner, lender, or contractor introductions, want the
              partner-lender and insurance discounts, or want the{" "}
              <a
                href="https://www.biggerpockets.com/pro-membership"
                className="font-semibold text-primary hover:underline"
              >
                bundled partner software
              </a>
              , the membership covers more than the calculators. If the
              calculator is the only part you&apos;d use, compare it with the
              free tools above. Our{" "}
              <Link
                href="/vs/biggerpockets-calculator"
                className="font-semibold text-primary hover:underline"
              >
                TrueCap vs BiggerPockets comparison
              </Link>{" "}
              lists the cases where staying put is the right answer.
            </p>

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
                    {item.a}
                  </div>
                </details>
              ))}
            </div>

            <h2>Run your next deal free</h2>
            <p>
              The fastest test is your own deal: run the same property through a
              free tool and compare it against your last BP report.
              TrueCap&apos;s core underwriting is free with no signup and no
              report count — or start with a single metric via the{" "}
              <Link
                href="/tools/1-percent-rule-calculator"
                className="font-semibold text-primary hover:underline"
              >
                1% rule calculator
              </Link>
              ,{" "}
              <Link
                href="/tools/rehab-cost-estimator"
                className="font-semibold text-primary hover:underline"
              >
                rehab cost estimator
              </Link>
              , or{" "}
              <Link
                href="/tools/70-percent-rule-calculator"
                className="font-semibold text-primary hover:underline"
              >
                70% rule calculator
              </Link>
              . If you&apos;re comparing paid tools too, the wider roundup is in
              our{" "}
              <Link
                href="/blog/best-rental-property-calculator-2026"
                className="font-semibold text-primary hover:underline"
              >
                best rental property calculators of 2026
              </Link>
              .
            </p>
            <p className="not-prose"></p>
          </div>

          <PostSources
            sources={[
              {
                title: "BiggerPockets, Rental Property Report (calculator form)",
                url: "https://www.biggerpockets.com/analysis/rentals/new",
              },
              {
                title: "BiggerPockets, Real Estate Investment Calculators",
                url: "https://www.biggerpockets.com/investment-calculators",
              },
              {
                title: "BiggerPockets, House Hacking: What Is It, How to Start, and Strategies for Success",
                url: "https://www.biggerpockets.com/real-estate-investing/house-hacking-strategy",
              },
              {
                title: "BiggerPockets, Membership types (Pro monthly and annual prices, 7-day free trial)",
                url: "https://www.biggerpockets.com/membership-types",
              },
              {
                title: "DealCheck, Plans & Pricing",
                url: "https://dealcheck.io/pricing/",
              },
              {
                title: "Stessa, Investment Property Marketplace",
                url: "https://www.stessa.com/investment-property-marketplace/",
              },
              {
                title: "BiggerPockets, FilePlace (member-shared real estate files)",
                url: "https://www.biggerpockets.com/files",
              },
              {
                title: "Calculator.net, Rental Property Calculator",
                url: "https://www.calculator.net/rental-property-calculator.html",
              },
              {
                title: "Stessa, Pricing",
                url: "https://www.stessa.com/pricing/",
              },
              {
                title: "RentCast, Plans & Pricing",
                url: "https://www.rentcast.io/pricing",
              },
              {
                title: "BiggerPockets, Rental Property Calculator",
                url: "https://www.biggerpockets.com/rental-property-calculator",
              },
              {
                title: "Stessa, Rental Property Returns and Income Tax Calculator",
                url: "https://www.stessa.com/rental-returns-and-income-tax-calculator/",
              },
              {
                title: "BiggerPockets, Pro membership",
                url: "https://www.biggerpockets.com/pro-membership",
              },
            ]}
          />

          <div className="mt-10">
            <NewsletterSignup />
          </div>
          <RelatedContent kind="blog" slug={SLUG} title={TITLE_PLAIN} className="mt-10" />

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
