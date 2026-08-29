/**
 * Backlog post — "Cap rate vs gross yield (vs GRM)" (2026-07-21)
 *
 * Targets the comparison SERP:
 *   - "cap rate vs gross yield"
 *   - "gross rent multiplier vs cap rate"
 *   - "gross yield vs net yield rental property"
 *   - "what is a good gross yield"
 *
 * The three metrics are the same income quoted three ways; nobody on the
 * SERP owns the conversion math between them. Complements
 * /blog/gross-rent-multiplier-explained (GRM deep dive),
 * /blog/what-is-a-good-cap-rate (cap-rate benchmarks), and
 * /blog/cap-rate-vs-cash-on-cash-vs-dscr (the financed-metrics tier).
 */

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Calculator } from "lucide-react";
import { BlogByline } from "@/components/marketing/blog-byline";
import { BlogStickyCta } from "@/components/marketing/blog-sticky-cta";
import { RelatedBlogPosts } from "@/components/marketing/related-blog-posts";
import { NewsletterSignup } from "@/components/marketing/newsletter-signup";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SiteFooter } from "@/components/marketing/site-footer";
import { getSiteUrl } from "@/lib/site-url";

const SLUG = "cap-rate-vs-gross-yield";
const TITLE =
  "Cap rate vs gross yield vs GRM: three quotes for the same building — and when each one lies";
// SERP-facing title (metadata/og only): kept ≤50 chars so the root
// layout's "%s | TrueCap" template stays inside the ~60-char SERP window.
// The on-page <h1> keeps the longer editorial TITLE.
const SERP_TITLE = "Cap Rate vs Gross Yield vs GRM: When to Use Each";
const DESCRIPTION =
  "Gross yield, GRM, and cap rate measure the same rental income three ways. Formulas, a worked $250K duplex, a conversion table, and when each one misleads.";
const PUBLISHED_AT = "2026-07-21";
const MODIFIED_AT = "2026-07-21";
const READING_TIME_MIN = 10;

export const metadata: Metadata = {
  title: SERP_TITLE,
  description: DESCRIPTION,
  keywords: [
    "cap rate vs gross yield",
    "gross rent multiplier vs cap rate",
    "gross yield vs net yield",
    "what is a good gross yield rental property",
    "GRM vs cap rate",
    "rental yield vs cap rate",
    "convert gross yield to cap rate",
  ],
  alternates: { canonical: `/blog/${SLUG}` },
  openGraph: {
    title: SERP_TITLE,
    description: DESCRIPTION,
    url: `/blog/${SLUG}`,
    type: "article",
    publishedTime: PUBLISHED_AT,
    modifiedTime: MODIFIED_AT,
    images: [{ url: "/home.jpg", width: 1200, height: 630, alt: TITLE }],
  },
  twitter: {
    card: "summary_large_image",
    title: SERP_TITLE,
    description: DESCRIPTION,
    images: ["/home.jpg"],
  },
};

const FAQS: { q: string; a: string }[] = [
  {
    q: "Is gross yield the same as cap rate?",
    a: "No. Gross yield is annual rent divided by price and ignores every operating expense. Cap rate is net operating income divided by price — rent minus vacancy, taxes, insurance, maintenance, management, and reserves. On a typical rental running a 45-50% expense ratio, the cap rate is roughly half the gross yield: an 11.5% gross yield property might be a 6.4% cap rate deal.",
  },
  {
    q: "How do I convert gross yield to cap rate?",
    a: "Approximate it with: cap rate ≈ (1 − operating-expense ratio) × gross yield. At a 50% expense ratio, a 10% gross yield implies a 5% cap rate; at 40%, it implies 6%. This is a triage shortcut, not an underwrite — real expense ratios vary property to property, which is exactly why two identical gross yields can hide very different cap rates.",
  },
  {
    q: "What is the relationship between GRM and gross yield?",
    a: "They're reciprocals. GRM = price ÷ annual rent, and gross yield = annual rent ÷ price. A GRM of 10 is a 10% gross yield; a GRM of 8.3 is a 12% gross yield (the 1% rule); a GRM of 4.2 is a 24% gross yield (the 2% rule). Same measurement, flipped fraction.",
  },
  {
    q: "What is a good gross yield on a rental property?",
    a: "In 2026 US markets, roughly 8-12% gross is where leveraged deals start to pencil — that's a GRM of about 8-12, or 0.67-1% of price in monthly rent. Below 7% gross, a financed property almost never covers its mortgage and expenses. But 'good' depends entirely on the expense ratio underneath: a 10% gross yield with 6% property taxes can cash flow worse than an 8.5% gross yield in a low-tax county.",
  },
  {
    q: "Does cap rate include the mortgage?",
    a: "No. Cap rate is a property-level metric — NOI ÷ price — deliberately blind to financing so two buyers with different loans can compare the same building. Once debt enters the picture you need cash-on-cash return (levered cash flow ÷ cash invested) and DSCR (NOI ÷ annual debt service), which is a separate tier of metrics.",
  },
  {
    q: "What's the difference between gross yield and net yield?",
    a: "Net yield deducts operating expenses from rent before dividing by price — which makes it essentially the same number as cap rate. The gross/net yield vocabulary is more common in UK, Australian, and international listings; US investors usually say cap rate instead of net yield. When you see a yield quoted, always ask which one it is: the gap between gross and net is typically 40-50% of the number.",
  },
];

export default function BlogPost() {
  const siteUrl = getSiteUrl();
  const canonicalUrl = `${siteUrl}/blog/${SLUG}`;

  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": `${canonicalUrl}#article`,
    headline: TITLE,
    description: DESCRIPTION,
    datePublished: PUBLISHED_AT,
    dateModified: MODIFIED_AT,
    author: {
      "@type": "Person",
      "@id": `${siteUrl}/about#morgan`,
      name: "Morgan Page",
      url: `${siteUrl}/about`,
    },
    publisher: { "@id": `${siteUrl}/#organization` },
    mainEntityOfPage: canonicalUrl,
    image: [`${siteUrl}/home.jpg`],
    inLanguage: "en-US",
  };
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "TrueCap", item: `${siteUrl}/` },
      { "@type": "ListItem", position: 2, name: "Blog", item: `${siteUrl}/blog` },
      { "@type": "ListItem", position: 3, name: TITLE, item: canonicalUrl },
    ],
  };
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <div className="min-h-screen bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />

      <main id="main" className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <header className="mb-8 sm:mb-10">
          <Link href="/blog" className="text-xs uppercase tracking-widest text-muted-foreground font-bold hover:text-foreground">
            ← TrueCap Blog
          </Link>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground mt-2 leading-tight text-balance">
            {TITLE}
          </h1>
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-bold mt-3">
            {new Date(PUBLISHED_AT).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}{" "}
            · {READING_TIME_MIN} min read
          </p>
          <BlogByline />
          <p className="text-base sm:text-lg text-muted-foreground mt-4 leading-relaxed">
            {DESCRIPTION}
          </p>
        </header>

        <article className="prose prose-slate max-w-none [&_p]:leading-relaxed [&_p]:text-foreground [&_h2]:font-extrabold [&_h2]:text-foreground [&_h2]:mt-10 [&_h2]:mb-3 [&_h3]:font-bold [&_h3]:text-foreground [&_h3]:mt-6 [&_h3]:mb-2 [&_li]:text-foreground [&_li]:leading-relaxed [&_strong]:text-foreground">
          <p>
            Gross yield, gross rent multiplier, and cap rate are three ways of
            quoting the exact same thing: how much income a building produces
            relative to what it costs. Two of them are literally the same
            fraction flipped over. The third deducts expenses first — and that
            one difference is worth tens of thousands of dollars of hidden
            value on an ordinary deal. Sellers, agents, and listing sites
            switch between the three quotes freely, sometimes strategically,
            so knowing how to convert between them — and which one to trust at
            each stage of a deal — is a core underwriting skill. This post
            defines all three, works them on the same $250,000 duplex, gives
            you a conversion table, and shows the trap where two properties
            with identical gross yields sit 22% apart on cap rate.
          </p>

          <h2 className="text-2xl sm:text-3xl">The three metrics, defined</h2>
          <p>
            <strong>Gross yield</strong> is annual gross rent divided by
            purchase price. A property renting for $28,800 a year at a
            $250,000 price has an 11.5% gross yield. No expenses, no vacancy,
            no financing — just rent over price.
          </p>
          <p>
            <strong>Gross rent multiplier (GRM)</strong> is the same fraction
            upside down: price divided by annual rent. That $250,000 property
            at $28,800 of rent is a GRM of 8.7 — the building costs 8.7 years
            of gross rent. Because they&apos;re reciprocals, every GRM maps to
            exactly one gross yield and vice versa: GRM 10 is a 10% yield, GRM
            8.3 is 12%, GRM 20 is 5%. If you can divide, you can translate.
          </p>
          <p>
            <strong>Cap rate</strong> is the odd one out — and the useful one.
            It divides <em>net operating income</em> by price:{" "}
            <Link href="/blog/how-to-calculate-noi-rental-property" className="text-primary font-semibold hover:underline">
              NOI
            </Link>{" "}
            is rent minus vacancy, property taxes, insurance, maintenance,
            management, and capital reserves — everything except the mortgage.
            Cap rate answers a question the other two can&apos;t: what does
            this building actually earn?
          </p>
          <div className="bg-card border border-border rounded-xl p-5 sm:p-6 my-4 text-center">
            <div className="text-sm sm:text-base font-mono">
              <strong>Gross yield</strong> = annual rent ÷ price
            </div>
            <div className="text-sm sm:text-base font-mono mt-2">
              <strong>GRM</strong> = price ÷ annual rent&nbsp;&nbsp;(= 1 ÷ gross yield)
            </div>
            <div className="text-sm sm:text-base font-mono mt-2">
              <strong>Cap rate</strong> = NOI ÷ price
            </div>
          </div>
          <p>
            One more piece of vocabulary before the math: international
            listings (UK, Australia, much of Europe) quote{" "}
            <strong>net yield</strong>, which deducts operating expenses from
            rent before dividing by price. That makes net yield essentially
            the same number as cap rate under a different name. When anyone
            quotes you &ldquo;a yield,&rdquo; your first question is always{" "}
            <em>gross or net?</em> — because the gap between the two is
            typically 40-50% of the number.
          </p>

          <h2 className="text-2xl sm:text-3xl">All three on one duplex</h2>
          <p>
            Take a $250,000 duplex renting for $1,200 a side — $2,400/month,
            $28,800 a year. The screening metrics take five seconds:
          </p>
          <ul>
            <li>
              <strong>Gross yield:</strong> $28,800 ÷ $250,000 ={" "}
              <strong>11.5%</strong>
            </li>
            <li>
              <strong>GRM:</strong> $250,000 ÷ $28,800 = <strong>8.7</strong>
            </li>
          </ul>
          <p>
            The cap rate takes an expense budget. Underwrite it line by line:
            5% vacancy ($1,440), property taxes at 1.5% of value ($3,750),
            insurance ($1,600), 8% maintenance ($2,304), 8% management
            ($2,304), and 5% capital reserves ($1,440). Total operating
            expenses: <strong>$12,838</strong>, a 44.6% expense ratio. That
            leaves NOI of $28,800 − $12,838 = <strong>$15,962</strong>, and a
            cap rate of $15,962 ÷ $250,000 = <strong>6.4%</strong>. (Run your
            own line items through the free{" "}
            <Link href="/#main" className="text-primary font-semibold hover:underline">
              TrueCap analyzer
            </Link>{" "}
            and watch the NOI — and the cap rate that falls out of it — move
            with every expense you change.)
          </p>
          <p>
            Same building, same day: an 11.5% quote, an 8.7 quote, and a 6.4%
            quote. None of them is wrong. They&apos;re measuring different
            depths of the same income stream — and the spread between the
            11.5% and the 6.4% is the entire operating reality of the
            property.
          </p>

          <h2 className="text-2xl sm:text-3xl">The bridge formula</h2>
          <p>
            You can move between the gross quotes and the cap rate with one
            approximation:
          </p>
          <div className="bg-card border border-border rounded-xl p-5 sm:p-6 my-4 text-center">
            <div className="text-sm sm:text-base font-mono">
              cap rate ≈ (1 − operating-expense ratio) × gross yield
            </div>
          </div>
          <p>
            Check it against the duplex: (1 − 0.446) × 11.5% = 6.4%. Exact.
            The{" "}
            <Link href="/blog/50-percent-rule-rentals" className="text-primary font-semibold hover:underline">
              50% rule
            </Link>{" "}
            exists precisely because most long-term rentals land somewhere
            near a 50% expense ratio, which gives you the mental shortcut:{" "}
            <strong>cap rate ≈ half the gross yield</strong>. An 8% gross
            property is roughly a 4% cap. A 12% gross property (the 1% rule)
            is roughly a 6% cap. It&apos;s triage math, not underwriting — but
            it converts any listing quote into any other in your head.
          </p>
          <div className="not-prose overflow-x-auto rounded-xl border border-border bg-card my-6">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left p-3 font-bold text-foreground">Monthly rent ÷ price</th>
                  <th className="text-left p-3 font-bold text-foreground">Gross yield</th>
                  <th className="text-left p-3 font-bold text-foreground">GRM</th>
                  <th className="text-left p-3 font-bold text-foreground">Cap @ 50% expenses</th>
                  <th className="text-left p-3 font-bold text-foreground">Cap @ 40% expenses</th>
                </tr>
              </thead>
              <tbody className="[&_td]:p-3 [&_td]:border-b [&_td]:border-border [&_tr:last-child_td]:border-0 [&_td]:font-mono">
                <tr><td>0.50%</td><td>6%</td><td>16.7</td><td>3.0%</td><td>3.6%</td></tr>
                <tr><td>0.67%</td><td>8%</td><td>12.5</td><td>4.0%</td><td>4.8%</td></tr>
                <tr><td>0.83%</td><td>10%</td><td>10.0</td><td>5.0%</td><td>6.0%</td></tr>
                <tr><td>1.00%</td><td>12%</td><td>8.3</td><td>6.0%</td><td>7.2%</td></tr>
                <tr><td>1.17%</td><td>14%</td><td>7.1</td><td>7.0%</td><td>8.4%</td></tr>
                <tr><td>2.00%</td><td>24%</td><td>4.2</td><td>12.0%</td><td>14.4%</td></tr>
              </tbody>
            </table>
          </div>
          <p>
            Read across any row and you&apos;re looking at one property quoted
            four ways. The familiar screening rules fall out of the table: the
            1% rule is the 12%-gross / 8.3-GRM row, and the near-extinct 2%
            rule is the bottom row. (Both rules are the same rent-to-price
            screen at different bars — the{" "}
            <Link href="/blog/2-percent-rule-vs-1-percent-rule" className="text-primary font-semibold hover:underline">
              full comparison
            </Link>{" "}
            works that math.)
          </p>

          <h2 className="text-2xl sm:text-3xl">Where the gross quotes lie: the identical-twin trap</h2>
          <p>
            Here&apos;s the failure mode that makes gross yield dangerous as
            anything more than a screen. Take our $250,000 duplex and its
            identical twin one county over: same price, same $28,800 rent,
            same insurance, maintenance, management, vacancy. One difference —
            the twin sits in a high-tax jurisdiction paying $7,200 a year
            instead of $3,750.
          </p>
          <div className="not-prose overflow-x-auto rounded-xl border border-border bg-card my-6">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left p-3 font-bold text-foreground">Metric</th>
                  <th className="text-left p-3 font-bold text-foreground">Duplex A · low-tax</th>
                  <th className="text-left p-3 font-bold text-foreground">Duplex B · high-tax</th>
                </tr>
              </thead>
              <tbody className="[&_td]:p-3 [&_td]:border-b [&_td]:border-border [&_tr:last-child_td]:border-0 [&_td]:font-mono">
                <tr><td>Gross yield</td><td>11.5%</td><td>11.5%</td></tr>
                <tr><td>GRM</td><td>8.7</td><td>8.7</td></tr>
                <tr><td>Property taxes</td><td>$3,750</td><td>$7,200</td></tr>
                <tr><td>NOI</td><td>$15,962</td><td>$12,512</td></tr>
                <tr><td>Cap rate</td><td>6.4%</td><td>5.0%</td></tr>
              </tbody>
            </table>
          </div>
          <p>
            Gross yield and GRM score these buildings as identical. The cap
            rate says Duplex B earns $3,450 a year less — a 22% haircut on
            NOI. Capitalize that shortfall at Duplex A&apos;s 6.4% rate and
            Duplex B is worth roughly <strong>$196,000</strong>, not
            $250,000: a $54,000 valuation gap that two &ldquo;identical&rdquo;
            gross yields cannot see. Taxes are the cleanest example, but the
            same trap hides in flood-zone insurance premiums, 40-year-old
            roofs that inflate the capex reserve, and self-managed listings
            whose pro formas omit management entirely.
          </p>

          <h2 className="text-2xl sm:text-3xl">So which metric should you use?</h2>
          <h3>Screening a list: GRM or gross yield</h3>
          <p>
            When you&apos;re triaging forty listings, you have two numbers per
            property — price and asking rent — and that&apos;s exactly what
            the gross metrics consume. Divide, rank, and cut everything below
            your line (in most 2026 markets, leveraged deals stop penciling
            somewhere below 8-10% gross, i.e. GRM above 10-12). Whether you
            use GRM or gross yield is pure preference — they carry identical
            information. The{" "}
            <Link href="/tools/gross-rent-multiplier-calculator" className="text-primary font-semibold hover:underline">
              GRM calculator
            </Link>{" "}
            runs either direction, and the{" "}
            <Link href="/blog/gross-rent-multiplier-explained" className="text-primary font-semibold hover:underline">
              GRM deep dive
            </Link>{" "}
            covers benchmarks by market type.
          </p>
          <h3>Underwriting and comparing: cap rate</h3>
          <p>
            The moment a property survives the screen, switch to cap rate.
            It&apos;s the first metric in the stack that reflects operating
            reality, the number appraisers and commercial lenders speak, and
            the only fair way to compare buildings across tax and insurance
            regimes — as the twin duplexes show. What counts as a good cap
            rate varies by market and asset class;{" "}
            <Link href="/blog/what-is-a-good-cap-rate" className="text-primary font-semibold hover:underline">
              our benchmarks post
            </Link>{" "}
            breaks down the 2026 ranges.
          </p>
          <h3>Deciding with a loan: neither</h3>
          <p>
            All three metrics in this post are unlevered — they don&apos;t
            know your mortgage exists. A 6.4% cap rate financed at 7% is
            negative leverage; the same cap rate financed at 5% cash flows.
            Once debt enters, you graduate to cash-on-cash return and DSCR,
            which is{" "}
            <Link href="/blog/cap-rate-vs-cash-on-cash-vs-dscr" className="text-primary font-semibold hover:underline">
              its own three-way comparison
            </Link>
            . The full ladder: gross metrics to shortlist, cap rate to
            underwrite the building, levered metrics to underwrite{" "}
            <em>your deal</em> on the building.
          </p>

          <h2 className="text-2xl sm:text-3xl">Three rules for reading quoted yields</h2>
          <p>
            <strong>First: always ask gross or net.</strong> A seller quoting
            &ldquo;8% yield&rdquo; on a turnkey listing is almost always
            quoting gross — which is roughly a 4% cap at normal expenses. If
            your buy box says &ldquo;6%,&rdquo; make sure both numbers live on
            the same side of the expense line before you conclude the deal
            clears it.
          </p>
          <p>
            <strong>Second: distrust pro-forma NOI.</strong> A quoted cap rate
            is only as honest as the expense budget under it. Listing pro
            formas routinely assume 5% vacancy in a soft market, zero
            management, and maintenance numbers from a fresh renovation.
            Rebuild NOI from your own line items — it takes ten minutes and
            it&apos;s where the twin-duplex gap gets caught.
          </p>
          <p>
            <strong>Third: never let a screen make a buy decision.</strong>{" "}
            Gross yield and GRM decide what&apos;s worth an hour of your time.
            Cap rate decides what the building earns. Whether <em>you</em>{" "}
            should buy it — at your rate, your down payment, your reserves —
            is a levered question the screening metrics were never built to
            answer.
          </p>

          <div className="not-prose">
            <Link
              href="/"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-3 rounded-xl font-bold hover:opacity-95 transition-opacity"
            >
              <Calculator className="w-4 h-4" />
              Underwrite a deal in 60 seconds
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>

          <h2 className="text-2xl sm:text-3xl">FAQ</h2>
          {FAQS.map((f, i) => (
            <details key={i} className="not-prose bg-card border border-border rounded-xl p-4 sm:p-5 mb-3">
              <summary className="cursor-pointer font-bold text-foreground">
                {f.q}
              </summary>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                {f.a}
              </p>
            </details>
          ))}
        </article>

        <RelatedBlogPosts currentSlug={SLUG} />
        <div className="max-w-3xl mx-auto px-4 sm:px-6"><NewsletterSignup variant="expanded" source="blog" /></div>

        <footer className="mt-12 pt-8 border-t border-border">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Related:{" "}
            <Link href="/blog/gross-rent-multiplier-explained" className="font-bold text-foreground hover:underline">Gross rent multiplier explained →</Link>{" "}
            ·{" "}
            <Link href="/blog/what-is-a-good-cap-rate" className="font-bold text-foreground hover:underline">What is a good cap rate? →</Link>
          </p>
        </footer>
      </main>
      <SiteFooter />
      <ScrollDepthTracker />
      <BlogStickyCta />
    </div>
  );
}
