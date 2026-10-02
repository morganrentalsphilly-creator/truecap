/**
 * Listicle blog post: best-rental-property-calculator-for-brrrr.
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

const SLUG = "best-rental-property-calculator-for-brrrr";
const TITLE = "Best rental property calculator for BRRRR investors (2026)";
// SERP-facing title (metadata/og only): kept ≤50 chars so the root
// layout's "%s | TrueCap" template stays inside the ~60-char SERP
// window. The on-page <h1> keeps the longer editorial TITLE.
const SERP_TITLE = "Best rental property calculator for BRRRR (2026)";
const DESCRIPTION =
  "A 2026 ranking of the best BRRRR calculators — TrueCap, DealCheck, BiggerPockets — and how a BRRRR calculator differs from a standard rental analyzer.";
const PUBLISHED_AT = "2026-06-07";
const MODIFIED_AT = lastmodFor("/blog/best-rental-property-calculator-for-brrrr") ?? PUBLISHED_AT;
const READING_TIME_MIN = 9;

export const metadata: Metadata = {
  title: SERP_TITLE,
  description: DESCRIPTION,
  keywords: [
    "best brrrr calculator",
    "brrrr deal analysis tool",
    "brrrr property analyzer",
    "best calculator for brrrr investors",
    "brrrr cash out refi calculator",
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
    name: "TrueCap (free tools)",
    bestFor: "Separate input worksheets + a stabilized rental screen",
    url: "/blog/brrrr-method-explained",
    pricing:
      "Free tools; no integrated BRRRR lifecycle model currently",
    freeCovers: [
      "Cap rate, CoC, DSCR and cash flow on a stabilized BRRRR candidate — from the main analyzer, no account needed",
      "Standalone worksheets for rehab cost, ARV, and the 70% rule price screen",
      "Mortgage payment and closing cost tools for the purchase and the refinanced loan",
      "Step-by-step guides to the DSCR and cap rate math a refinance lender will run",
    ],
    freeGates: [
      "No integrated ledger for acquisition, renovation, refinance proceeds, later contributions, and post-refinance returns",
    ],
    pickIf:
      "You want transparent worksheets for the rehab and ARV inputs, an analyzer for the stabilized rental, and will maintain a separate, complete project cash-flow ledger.",
  },
  {
    rank: 2,
    name: "DealCheck",
    bestFor: "Dedicated BRRRR calculator + native mobile apps",
    url: "/vs/dealcheck",
    pricing:
      "Free Starter; Plus $10/mo and Pro $20/mo billed annually ($14 / $29 billed monthly), as of October 2026",
    freeCovers: [
      "Solid BRRRR-friendly underwriting",
      "Address search that imports public-record and listing data",
      "Native iOS + Android apps",
    ],
    freeGates: [
      "Free Starter caps saved properties (15) and photos, comps and templates (5 each); Plus and Pro raise those limits",
    ],
    pickIf:
      "You underwrite on mobile at showings all day and want native apps with address-based data import.",
  },
  {
    rank: 3,
    name: "BiggerPockets BRRRR Calculator",
    bestFor: "Bundled with the BRRRR community",
    url: "/vs/biggerpockets-calculator",
    pricing: "BP Pro ~$390/yr",
    freeCovers: [
      "Standard BRRRR-friendly underwriting",
      "Printable PDF reports for lenders or partners",
      "Community forums and content on BRRRR strategy",
    ],
    freeGates: [
      "Unlimited calculator reports require BiggerPockets Pro",
    ],
    pickIf:
      "You're already paying for BiggerPockets for the BRRRR community access.",
  },
  {
    rank: 4,
    name: "Custom Excel / Google Sheets",
    bestFor: "Total control over BRRRR-specific math",
    url: "/vs/excel",
    pricing: "Free (with your existing Office / Workspace)",
    freeCovers: [
      "Total flexibility — model unusual debt structures, custom LTV, multi-tranche financing",
    ],
    freeGates: [
      "Formula errors compound silently across deals",
      "ARV stress-testing requires manual scenarios",
      "Large spreadsheets can be cumbersome on mobile",
    ],
    pickIf:
      "You have a battle-tested BRRRR spreadsheet that handles unusual financing structures.",
  },
];

const FAQ_ITEMS = [
  {
    q: "What makes a BRRRR calculator different from a standard rental calculator?",
    a: "A BRRRR calculator models the cash-out refinance step — when you refinance after the rehab, what's your new mortgage balance (a conforming cash-out refinance on a one-unit investment property is capped at 75% of appraised value, 70% for 2–4 units, and your lender may set a lower limit), how much capital comes back to you, and what's the cash flow on the refinanced loan. Standard rental calculators stop at the initial purchase + financing; BRRRR calculators continue through the refi event.",
  },
  {
    q: "What's 'capital recovered' and why does it matter?",
    a: "A capital-recovery ratio compares refinance distributions with every contribution made through that date, including acquisition, renovation, carrying, and financing costs. A distribution equal to contributions does not make the investment's return infinite: later contributions, operating cash flows, remaining equity, and time still matter.",
  },
  {
    q: "What ARV (After Repair Value) should I use in a BRRRR analysis?",
    a: "Build a range from relevant comparable sales and obtain qualified local valuation support. Stress-test the range, but do not treat a worksheet value as the future appraisal a lender will accept.",
  },
  {
    q: "What refi LTV should I model for a BRRRR?",
    a: "Use the eligible value, leverage limit, seasoning rule, debt-coverage requirement, fees, and cash-out limit from an actual lender quote. There is no single LTV that applies to every property, loan, or borrower.",
  },
  {
    q: "Can I underwrite BRRRR deals in TrueCap today?",
    a: "In pieces, yes. The standalone tools cover rehab cost, ARV, and the 70% rule price screen, and the main analyzer returns DSCR, cap rate, and cash flow for the stabilized rental once you enter the post-refinance rent and loan terms. There is no separate DSCR calculator page — for the coverage test a lender will run, the how-to-calculate-DSCR walkthrough shows the arithmetic. TrueCap doesn't offer an integrated BRRRR lifecycle model right now, so use a complete project ledger or another product for the joined cash-flow analysis.",
  },
];

const DECISION_LINES: Array<{ q: string; a: string }> = [
  {
    q: "You want separate rehab, ARV, and 70%-rule worksheets plus a stabilized-rental screen.",
    a: "TrueCap's free tools",
  },
  { q: "You underwrite mobile at every showing.", a: "DealCheck" },
  {
    q: "You're already in the BiggerPockets community.",
    a: "BiggerPockets bundled",
  },
  {
    q: "You have a custom BRRRR model that handles unusual debt structures.",
    a: "Excel",
  },
];

/**
 * Sourced phrases in the card and FAQ strings above, each linked (same tab)
 * to the page that states it. The strings stay plain text, so the FAQ
 * answers feed the FAQPage JSON-LD unchanged; <Cited> links a phrase where
 * the string renders. Each phrase appears once on the page.
 */
const CITATIONS = [
  { phrase: "Plus $10/mo and Pro $20/mo billed annually", url: "https://dealcheck.io/pricing/" },
  { phrase: "Solid BRRRR-friendly underwriting", url: "https://dealcheck.io/features/brrrr-calculator/" },
  {
    phrase: "Address search that imports public-record and listing data",
    url: "https://help.dealcheck.io/en/articles/2046991-how-to-import-property-data-from-public-records-listings",
  },
  { phrase: "Native iOS + Android apps", url: "https://dealcheck.io/" },
  {
    phrase: "saved properties (15) and photos, comps and templates (5 each)",
    url: "https://dealcheck.io/pricing/",
  },
  { phrase: "BP Pro ~$390/yr", url: "https://www.biggerpockets.com/pro-membership" },
  { phrase: "Standard BRRRR-friendly underwriting", url: "https://www.biggerpockets.com/brrrr-calculator" },
  { phrase: "Printable PDF reports", url: "https://www.biggerpockets.com/brrrr-calculator" },
  { phrase: "Community forums and content", url: "https://www.biggerpockets.com/pro-membership" },
  { phrase: "Unlimited calculator reports", url: "https://www.biggerpockets.com/pro-membership" },
  {
    phrase: "Free (with your existing Office / Workspace)",
    url: "https://workspace.google.com/products/sheets/",
  },
  {
    phrase: "capped at 75% of appraised value, 70% for 2–4 units",
    url: "https://sf.freddiemac.com/general/maximum-ltv-tltv-htltv-ratio-requirements-for-conforming-and-super-conforming-mortgages",
  },
  {
    phrase: "seasoning rule",
    url: "https://selling-guide.fanniemae.com/sel/b2-1.3-03/cash-out-refinance-transactions",
  },
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
  { title: "DealCheck, BRRRR Calculator", url: "https://dealcheck.io/features/brrrr-calculator/" },
  { title: "DealCheck, Plans & Pricing", url: "https://dealcheck.io/pricing/" },
  {
    title: "DealCheck Help Center, How to import property data from public records & listings",
    url: "https://help.dealcheck.io/en/articles/2046991-how-to-import-property-data-from-public-records-listings",
  },
  { title: "DealCheck, home page (iOS and Android apps)", url: "https://dealcheck.io/" },
  { title: "BiggerPockets, Pro membership", url: "https://www.biggerpockets.com/pro-membership" },
  { title: "BiggerPockets, BRRRR Calculator", url: "https://www.biggerpockets.com/brrrr-calculator" },
  { title: "Google Workspace, Google Sheets", url: "https://workspace.google.com/products/sheets/" },
  {
    title: "Freddie Mac Single-Family, Maximum LTV/TLTV/HTLTV ratio requirements for conforming and super conforming mortgages",
    url: "https://sf.freddiemac.com/general/maximum-ltv-tltv-htltv-ratio-requirements-for-conforming-and-super-conforming-mortgages",
  },
  {
    title: "Fannie Mae Selling Guide B2-1.3-03, Cash-Out Refinance Transactions (Dec 10, 2025)",
    url: "https://selling-guide.fanniemae.com/sel/b2-1.3-03/cash-out-refinance-transactions",
  },
];

export default function BestRentalPropertyCalculatorForBrrrrPost() {
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
            <p className="text-sm sm:text-base leading-relaxed text-foreground">
              For BRRRR investors specifically, TrueCap currently supplies
              separate rehab, ARV, and stabilized-rental tools plus a DSCR
              walkthrough—not an integrated lifecycle model. Evaluate DealCheck
              or another product if you need a{" "}
              <a
                href="https://dealcheck.io/features/brrrr-calculator/"
                className="font-semibold text-primary hover:underline"
              >
                joined acquisition-to-refinance ledger
              </a>
              , and use a spreadsheet for financing structures that require
              custom cash-flow timing.
            </p>
          </section>

          <div className="prose prose-neutral max-w-none [&>p]:max-w-[68ch] [&>ul]:max-w-[68ch] [&>ol]:max-w-[68ch] [&>blockquote]:max-w-[68ch] [&>h2]:max-w-[68ch] [&>h3]:max-w-[68ch] prose-headings:font-extrabold prose-headings:text-foreground prose-p:text-foreground prose-p:leading-relaxed prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-strong:text-foreground prose-li:text-foreground prose-li:leading-relaxed">
            <h2>The tools, ranked for BRRRR investors</h2>
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
              underwriting and needs no signup. Start with
              the{" "}
              <Link
                href="/tools/rehab-cost-estimator"
                className="font-semibold text-primary hover:underline"
              >
                rehab cost estimator
              </Link>
              , pressure-test lender-specific debt coverage by running the
              stabilized rent and refinance terms through the{" "}
              <Link
                href="/analyze" prefetch={false}
                className="font-semibold text-primary hover:underline"
              >
                TrueCap analyzer
              </Link>
              , and review the full workflow in{" "}
              <Link
                href="/blog/brrrr-method-explained"
                className="font-semibold text-primary hover:underline"
              >
                the BRRRR method explained
              </Link>{" "}
              before assembling a complete project ledger. TrueCap doesn&apos;t
              offer an integrated BRRRR model right now.
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
