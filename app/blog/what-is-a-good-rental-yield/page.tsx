/**
 * Backlog post — "Rental yield calculator / what is a good rental yield"
 * (2026-07-22)
 *
 * Targets the question/benchmark SERP:
 *   - "what is a good rental yield"
 *   - "good rental yield percentage"
 *   - "how to calculate rental yield"
 *   - "gross rental yield vs net rental yield"
 *
 * The audit flagged this SERP as weak (an AI-built site ranks #1) —
 * post first, tool later per the backlog note. Complements
 * /blog/cap-rate-vs-gross-yield (metric comparison — this one answers
 * the benchmark question), /blog/what-is-a-good-cap-rate, and
 * /blog/2-percent-rule-vs-1-percent-rule.
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

const SLUG = "what-is-a-good-rental-yield";
const TITLE =
  "What is a good rental yield? 2026 benchmarks, the gross-vs-net trap, and the financed test that actually decides";
// SERP-facing title (metadata/og only): kept ≤50 chars so the root
// layout's "%s | TrueCap" template stays inside the ~60-char SERP window.
// The on-page <h1> keeps the longer editorial TITLE.
const SERP_TITLE = "What Is a Good Rental Yield? 2026 Benchmarks";
const DESCRIPTION =
  "In most 2026 US markets, 8-12% gross rental yield is where deals start to pencil. Benchmarks by market type, a worked $220K example, and the DSCR test.";
const PUBLISHED_AT = "2026-07-22";
const MODIFIED_AT = "2026-07-22";
const READING_TIME_MIN = 10;

export const metadata: Metadata = {
  title: SERP_TITLE,
  description: DESCRIPTION,
  keywords: [
    "what is a good rental yield",
    "good rental yield percentage",
    "how to calculate rental yield",
    "gross rental yield vs net rental yield",
    "rental yield calculator",
    "average rental yield by city",
    "rental yield vs cap rate",
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
    q: "What is a good rental yield in the US in 2026?",
    a: "As a screening bar, 8-12% gross yield (roughly $667-$1,000 of monthly rent per $100,000 of price) is where leveraged long-term rentals start to pencil in most US markets. Below about 7% gross, a property financed at 2026 rates almost never covers its own mortgage and expenses; above 13-14% you're usually being paid to take on property-class or neighborhood risk. Net of operating expenses, the same band works out to roughly a 4.5-6.5% net yield.",
  },
  {
    q: "How do I calculate rental yield?",
    a: "Gross rental yield = annual rent ÷ purchase price × 100. A $220,000 house renting for $1,850/month collects $22,200 a year, so its gross yield is 10.1%. Net rental yield subtracts operating expenses first: after vacancy, taxes, insurance, maintenance, management, and reserves, that same house nets about $11,948, for a 5.4% net yield. US investors usually call the net figure the cap rate.",
  },
  {
    q: "Is a 5% rental yield good?",
    a: "A 5% gross yield is a poor cash-flow deal in 2026 — at a typical 45-50% expense ratio it implies roughly a 2.5-2.8% net yield, far below current mortgage rates, so a financed buyer loses money every month. Investors who buy at 5% gross are making an appreciation bet, not an income bet. A 5% net yield (cap rate) is a different story: that's within the normal range for decent long-term rentals in mid-priced metros.",
  },
  {
    q: "What is the difference between gross and net rental yield?",
    a: "Gross yield divides annual rent by price and ignores every cost of running the property. Net yield subtracts operating expenses — vacancy, property taxes, insurance, maintenance, management, capital reserves — before dividing. On a typical US rental running a 45-50% expense ratio, net yield is roughly half of gross yield. UK and Australian listings quote yields routinely; in US vocabulary, net yield is essentially the cap rate.",
  },
  {
    q: "Is rental yield the same as ROI?",
    a: "No. Rental yield is a property-level income ratio that ignores your loan. ROI (and cash-on-cash return) measures what your actual invested cash earns after debt service — and leverage can push it far above or below the yield. A 10.1% gross yield property bought with 25% down at 7% can produce a negative cash-on-cash return, while the same property bought at a discount with cheap debt could return 15%+ on cash invested.",
  },
  {
    q: "What rental yield do I need to cash flow with a mortgage?",
    a: "At 25% down and a 7% 30-year rate, with a typical mid-40s expense ratio, break-even (DSCR 1.0) lands around a 10.5-11% gross yield — and hitting the 1.20-1.25 DSCR most investment-property lenders require takes roughly a 12.5-13% gross yield. Bigger down payments, lower-tax counties, or cheaper debt pull that bar down toward 8-9%. That's why the yield alone can't clear a deal: the financing math has to run underneath it.",
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
            Here&apos;s the short answer, because the question deserves one: in
            most 2026 US markets, a <strong>gross rental yield of 8-12%</strong>{" "}
            — roughly $667 to $1,000 of monthly rent per $100,000 of purchase
            price — is the zone where a leveraged long-term rental starts to
            pencil. Net of operating expenses, that band works out to about a
            4.5-6.5% net yield. Below 7% gross, a financed property almost
            never carries its own mortgage; above 13-14%, the market is
            usually paying you to absorb risk the yield number can&apos;t see.
          </p>
          <p>
            The long answer is that no single yield number is
            &ldquo;good&rdquo; on its own — because the same 10% quote can
            describe a deal that cash flows and a deal that bleeds $100 a
            month, depending on what sits underneath it. This post defines
            gross and net yield, works both on a real $220,000 example, gives
            you benchmark ranges by market type, and then runs the financed
            test — the step that actually decides whether a yield is good{" "}
            <em>for you</em>.
          </p>

          <h2 className="text-2xl sm:text-3xl">Rental yield, defined (and the vocabulary trap)</h2>
          <p>
            <strong>Gross rental yield</strong> is annual rent divided by
            purchase price:
          </p>
          <div className="bg-card border border-border rounded-xl p-5 sm:p-6 my-4 text-center">
            <div className="text-sm sm:text-base font-mono">
              <strong>Gross yield</strong> = (annual rent ÷ purchase price) × 100
            </div>
            <div className="text-sm sm:text-base font-mono mt-2">
              <strong>Net yield</strong> = ((annual rent − operating expenses) ÷ purchase price) × 100
            </div>
          </div>
          <p>
            <strong>Net rental yield</strong> subtracts operating expenses —
            vacancy, property taxes, insurance, maintenance, management,
            capital reserves — from rent before dividing. Everything except
            the mortgage comes out. If that sounds familiar, it should: net
            yield is what US investors call the{" "}
            <Link href="/blog/what-is-a-good-cap-rate" className="text-primary font-semibold hover:underline">
              cap rate
            </Link>
            . The &ldquo;yield&rdquo; vocabulary is more common in UK,
            Australian, and international listings, which is exactly why it
            trips people up: a British listing quoting &ldquo;7% yield&rdquo;
            and a US broker quoting &ldquo;7% cap&rdquo; are describing very
            different properties. The gap between gross and net is typically
            40-50% of the number, so the first question to ask about any
            quoted yield is always <em>gross or net?</em>
          </p>
          <p>
            One more translation: gross yield is the reciprocal of the gross
            rent multiplier, and it&apos;s the same screen as the 1% rule
            wearing different clothes. A 12% gross yield is a GRM of 8.3 is
            &ldquo;1% of price in monthly rent.&rdquo; If you already think in
            those terms, nothing here is new —{" "}
            <Link href="/blog/cap-rate-vs-gross-yield" className="text-primary font-semibold hover:underline">
              the full three-way conversion
            </Link>{" "}
            between yield, GRM, and cap rate has its own post.
          </p>

          <h2 className="text-2xl sm:text-3xl">Both yields on a real deal</h2>
          <p>
            Take a $220,000 single-family renting for $1,850 a month —
            $22,200 a year. The gross yield takes five seconds:
          </p>
          <ul>
            <li>
              <strong>Gross yield:</strong> $22,200 ÷ $220,000 ={" "}
              <strong>10.1%</strong> (a GRM of 9.9 — about 0.84% of price in
              monthly rent)
            </li>
          </ul>
          <p>
            The net yield takes an expense budget. Underwrite it line by
            line: 5% vacancy ($1,110), property taxes at 1.4% of value
            ($3,080), insurance ($1,400), 8% maintenance ($1,776), 8%
            management ($1,776), and 5% capital reserves ($1,110). Total
            operating expenses: <strong>$10,252</strong> — a 46.2% expense
            ratio, right in the neighborhood the{" "}
            <Link href="/blog/50-percent-rule-rentals" className="text-primary font-semibold hover:underline">
              50% rule
            </Link>{" "}
            predicts. That leaves net operating income of $22,200 − $10,252 ={" "}
            <strong>$11,948</strong>, and a net yield of:
          </p>
          <ul>
            <li>
              <strong>Net yield:</strong> $11,948 ÷ $220,000 ={" "}
              <strong>5.4%</strong>
            </li>
          </ul>
          <p>
            Same house, same day: a 10.1% quote and a 5.4% quote. Neither is
            wrong — but only one of them knows the property has a roof, a tax
            bill, and occasional empty months. (Run your own line items in
            the{" "}
            <Link href="/tools/noi-calculator" className="text-primary font-semibold hover:underline">
              NOI calculator
            </Link>{" "}
            if you want to stress the expense budget.)
          </p>

          <h2 className="text-2xl sm:text-3xl">Benchmarks: what yields look like by market type</h2>
          <p>
            Rental yield is mostly a function of the rent-to-price ratio of
            the metro you&apos;re shopping, which is why national averages are
            useless. Here&apos;s the honest 2026 map, with the net-yield
            equivalent at a typical mid-40s expense ratio:
          </p>
          <div className="not-prose overflow-x-auto rounded-xl border border-border bg-card my-6">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left p-3 font-bold text-foreground">Market type</th>
                  <th className="text-left p-3 font-bold text-foreground">Gross yield</th>
                  <th className="text-left p-3 font-bold text-foreground">Rent per $100K</th>
                  <th className="text-left p-3 font-bold text-foreground">≈ Net yield</th>
                </tr>
              </thead>
              <tbody className="[&_td]:p-3 [&_td]:border-b [&_td]:border-border [&_tr:last-child_td]:border-0">
                <tr><td>Coastal appreciation metros</td><td className="font-mono">4-6%</td><td className="font-mono">$333-500/mo</td><td className="font-mono">2.2-3.3%</td></tr>
                <tr><td>Sun Belt growth metros</td><td className="font-mono">6-8%</td><td className="font-mono">$500-667/mo</td><td className="font-mono">3.3-4.4%</td></tr>
                <tr><td>Balanced mid-size metros</td><td className="font-mono">8-10%</td><td className="font-mono">$667-833/mo</td><td className="font-mono">4.4-5.5%</td></tr>
                <tr><td>Midwest / South cash-flow markets</td><td className="font-mono">10-13%</td><td className="font-mono">$833-1,083/mo</td><td className="font-mono">5.5-7.2%</td></tr>
                <tr><td>Low-price / C-class stock</td><td className="font-mono">14%+</td><td className="font-mono">$1,167+/mo</td><td className="font-mono">7.7%+</td></tr>
              </tbody>
            </table>
          </div>
          <p>
            Two readings of that table matter more than the numbers
            themselves. First, <strong>yield and appreciation trade off</strong>.
            A $500,000 house renting for $2,100 a month is a 5% gross yield —
            deeply cash-flow-negative when financed at 2026 rates — and the
            people buying it know that. They&apos;re underwriting equity
            growth, not income, which is a legitimate strategy with its own
            math (
            <Link href="/blog/cash-flow-vs-appreciation" className="text-primary font-semibold hover:underline">
              cash flow vs appreciation
            </Link>{" "}
            works that comparison). A yield benchmark only applies if income
            is the goal.
          </p>
          <p>
            Second, <strong>the top of the yield table is not free money</strong>.
            A 16% gross yield on an $80,000 house is the market pricing in
            older mechanicals, tougher tenant pools, thinner exit liquidity,
            and expense ratios that routinely blow past 50% — the same forces
            that killed the 2% rule as a national screen. High yield is
            compensation, not charity.
          </p>

          <h2 className="text-2xl sm:text-3xl">The financed test: where &ldquo;good&rdquo; actually gets decided</h2>
          <p>
            Here&apos;s the part most yield explainers skip. Yield — gross or
            net — is an unlevered, property-level number. It has no idea your
            mortgage exists. But almost every individual investor buys with
            debt, so whether a yield is good depends on whether it clears
            your financing. Run our $220,000 house through a standard 2026
            deal structure: 25% down ($55,000) and a 30-year loan at 7% on
            the remaining $165,000.
          </p>
          <ul>
            <li>
              <strong>Annual debt service:</strong> $1,098/month ×12 ={" "}
              <strong>$13,172</strong>
            </li>
            <li>
              <strong>NOI:</strong> $11,948
            </li>
            <li>
              <strong>Cash flow:</strong> $11,948 − $13,172 ={" "}
              <strong>−$1,224/year</strong> (about −$102/month)
            </li>
            <li>
              <strong>DSCR:</strong> $11,948 ÷ $13,172 = <strong>0.91</strong>
            </li>
          </ul>
          <p>
            A 10.1% gross yield — comfortably inside the
            &ldquo;good&rdquo; band — <em>loses money every month</em> at 25%
            down and 7%. The DSCR of 0.91 also means most investment-property
            lenders wouldn&apos;t write the loan as-is: they want NOI to cover
            debt service by 1.20-1.25×. Work the algebra backwards (fixed
            costs stay fixed; the percentage expenses scale with rent) and
            this house needs roughly <strong>$1,990/month</strong> of rent —
            a 10.8% gross yield — just to break even, and about{" "}
            <strong>$2,360/month</strong> — a 12.9% gross yield — to hit DSCR
            1.25. Check any deal&apos;s coverage in the{" "}
            <Link href="/tools/dscr-calculator" className="text-primary font-semibold hover:underline">
              DSCR calculator
            </Link>
            ; the levers that move the bar are down payment, rate, and the
            expense ratio, and small changes in any of them swing the answer.
          </p>
          <p>
            That&apos;s the honest resolution of the headline question. The
            8-12% band is where deals <em>start</em> to pencil — where the
            financed math becomes winnable. Whether a specific deal inside
            that band actually wins depends on its tax county, its insurance
            premium, your rate, and your down payment. The{" "}
            <Link href="/tools/rental-cash-flow-calculator" className="text-primary font-semibold hover:underline">
              cash flow calculator
            </Link>{" "}
            runs the whole stack — rent to NOI to debt service to monthly
            cash flow — in about a minute.
          </p>

          <h2 className="text-2xl sm:text-3xl">Why two identical yields aren&apos;t identical</h2>
          <p>
            One last failure mode before the checklist. Gross yield treats
            every rent dollar as equal, but operating costs vary wildly
            between properties with the same rent-to-price ratio. Our example
            house pays $3,080 a year in property tax; its twin across a
            county line might pay $6,500. Same 10.1% gross yield — but the
            twin&apos;s NOI drops to about $8,500, its net yield to 3.9%, and
            its financed cash flow from −$102 to roughly −$390 a month. Taxes
            are the cleanest example; flood-zone insurance, a 30-year-old
            roof, and self-managed pro formas that omit management do the
            same damage. The yield gets you to the front door. The expense
            budget decides what&apos;s behind it.
          </p>

          <h2 className="text-2xl sm:text-3xl">How to actually use rental yield</h2>
          <h3>1. Screen with gross yield — ruthlessly</h3>
          <p>
            Yield&apos;s real job is triage. Price and asking rent are the
            only two numbers you have for forty listings at once, and gross
            yield ranks them in seconds. Set your line — in most financed
            scenarios that&apos;s somewhere around 8-10% gross — and cut
            everything below it without guilt. A 6% gross property is not
            going to underwrite its way into cash flow at 2026 rates.
          </p>
          <h3>2. Underwrite survivors with net yield (cap rate)</h3>
          <p>
            For anything that passes the screen, build the expense budget
            line by line and compute the real NOI. This is where the
            twin-property gaps surface, where pro-forma fantasy vacancy gets
            corrected, and where a{" "}
            <Link href="/tools/cap-rate-calculator" className="text-primary font-semibold hover:underline">
              cap rate
            </Link>{" "}
            you&apos;d actually defend gets built.
          </p>
          <h3>3. Decide with the levered numbers</h3>
          <p>
            Run your actual financing and read cash flow, cash-on-cash
            return, and DSCR. That&apos;s the tier of metrics that knows what{" "}
            <em>you</em> paid and what <em>you</em> borrowed — and
            it&apos;s the only tier that can tell you whether this yield, on
            this house, with this loan, is good.
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
            <Link href="/blog/cap-rate-vs-gross-yield" className="font-bold text-foreground hover:underline">Cap rate vs gross yield vs GRM →</Link>{" "}
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
