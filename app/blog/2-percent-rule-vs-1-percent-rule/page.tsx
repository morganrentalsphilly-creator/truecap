/**
 * Backlog post — "2% rule vs 1% rule" (2026-07-20)
 *
 * Targets the comparison SERP:
 *   - "2% rule vs 1% rule"
 *   - "1% rule vs 2% rule real estate"
 *   - "what is the 2 percent rule in real estate"
 *   - "does the 2 percent rule still work"
 *
 * Both screening rules now have their own calculators
 * (/tools/1-percent-rule-calculator, /tools/2-percent-rule-calculator),
 * so this post owns the "which one applies to me" question with the
 * GRM/cap-rate bridge and a same-dollar worked comparison. Complements
 * /blog/1-percent-rule-rental-property (single-rule deep dive) and
 * /blog/gross-rent-multiplier-explained (the ratio underneath both).
 */

import type { Metadata } from "next";
import Link from "next/link";
import { BlogByline } from "@/components/marketing/blog-byline";
import { BlogStickyCta } from "@/components/marketing/blog-sticky-cta";
import { RelatedBlogPosts } from "@/components/marketing/related-blog-posts";
import { RelatedContent } from "@/components/marketing/related-content";
import { NewsletterSignup } from "@/components/marketing/newsletter-signup";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SiteFooter } from "@/components/marketing/site-footer";
import { getSiteUrl } from "@/lib/site-url";

const SLUG = "2-percent-rule-vs-1-percent-rule";
const TITLE =
  "2% rule vs 1% rule: which rental screen actually applies in 2026?";
// SERP-facing title (metadata/og only): kept ≤50 chars so the root
// layout's "%s | TrueCap" template stays inside the ~60-char SERP window.
// The on-page <h1> keeps the longer editorial TITLE.
const SERP_TITLE = "2% Rule vs 1% Rule for Rentals (2026)";
const DESCRIPTION =
  "The 1% and 2% rules are the same rent-to-price screen at two bars. What each one really tests, why the 2% rule is nearly extinct, and worked numbers.";
const PUBLISHED_AT = "2026-07-20";
const MODIFIED_AT = "2026-07-20";
const READING_TIME_MIN = 10;

export const metadata: Metadata = {
  title: SERP_TITLE,
  description: DESCRIPTION,
  keywords: [
    "2% rule vs 1% rule",
    "2 percent rule real estate",
    "1 percent rule vs 2 percent rule",
    "does the 2 percent rule still work",
    "what is the 2 percent rule",
    "rent to price ratio rental property",
    "2 percent rule 2026",
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
    q: "What is the difference between the 1% rule and the 2% rule?",
    a: "They are the same rent-to-price screen at two different bars. The 1% rule says a rental's monthly rent should be at least 1% of the purchase price; the 2% rule doubles that bar to 2%. On a $150,000 property, the 1% rule wants $1,500/month and the 2% rule wants $3,000/month. The 2% rule is far stricter, and in 2026 almost nothing in a normal market clears it.",
  },
  {
    q: "Does the 2% rule still work in 2026?",
    a: "As a filter it still 'works', but almost no property passes it anymore. A 2% rent-to-price ratio implies a gross rent multiplier of about 4.2 and a cap rate near 12% at typical expenses — numbers you only see in deeply distressed, low-price, high-risk markets. For the overwhelming majority of listings the 2% rule just returns 'no', so it stops being useful as a screen.",
  },
  {
    q: "Is the 1% rule still realistic with 7% mortgage rates?",
    a: "Barely, and only in cash-flow markets. At 2026 borrowing costs, break-even rent-to-price sits around 0.76% before you clear a dollar of profit, so a property that exactly hits 1% is a thin deal, not a slam dunk. In appreciation metros where prices sit at 0.4-0.6% of rent, the 1% rule fails almost everything — which is a signal about the market, not necessarily a reason to skip it.",
  },
  {
    q: "Which rule should I use to screen deals?",
    a: "Use the 1% rule as your everyday triage in most markets and treat the 2% rule as a label for a specific, higher-risk niche rather than a target. The rule is only a screen: it tells you what to underwrite next, never whether to buy. A property can pass the 1% rule and still lose money once real vacancy, maintenance, management, and capital reserves show up.",
  },
  {
    q: "What cap rate does the 1% rule imply?",
    a: "About 6% at a 50% operating-expense ratio. Cap rate roughly equals (1 − expense ratio) × annual gross yield, and the 1% rule is a 12% annual gross yield (1% a month × 12). So (1 − 0.50) × 12% = 6%. The 2% rule doubles the gross yield to 24% and implies roughly a 12% cap rate at the same expense ratio.",
  },
  {
    q: "Do these rules include operating expenses?",
    a: "No — that's their biggest blind spot. Both rules compare gross rent to price and ignore taxes, insurance, vacancy, maintenance, management, and capital expenditures entirely. That's why two properties can hit the identical rent-to-price ratio and one cash flows while the other bleeds. Always follow the screen with a real underwrite on net operating income.",
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
      {
        "@type": "ListItem",
        position: 1,
        name: "TrueCap",
        item: `${siteUrl}/`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Blog",
        item: `${siteUrl}/blog`,
      },
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />

      <main id="main" className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <header className="mb-8 sm:mb-10">
          <Link
            href="/blog"
            className="text-xs uppercase tracking-widest text-muted-foreground font-bold hover:text-foreground"
          >
            ← TrueCap Blog
          </Link>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground mt-2 leading-tight text-balance">
            {TITLE}
          </h1>
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-bold mt-3">
            {new Date(PUBLISHED_AT).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}{" "}
            · {READING_TIME_MIN} min read
          </p>
          <BlogByline />
          <p className="text-base sm:text-lg text-muted-foreground mt-4 leading-relaxed">
            {DESCRIPTION}
          </p>
        </header>

        <article className="prose prose-slate max-w-none [&_p]:leading-relaxed [&_p]:text-foreground [&_h2]:font-extrabold [&_h2]:text-foreground [&_h2]:mt-10 [&_h2]:mb-3 [&_h3]:font-bold [&_h3]:text-foreground [&_h3]:mt-6 [&_h3]:mb-2 [&_li]:text-foreground [&_li]:leading-relaxed [&_strong]:text-foreground">
          <p>
            The 1% rule and the 2% rule get talked about like two different
            tools. They aren&apos;t. They&apos;re the same measurement — monthly
            rent as a fraction of purchase price — with the bar set at two
            different heights. Understanding that they&apos;re one screen with
            two settings is the whole game, because it tells you exactly when
            each one is useful and when it&apos;s quietly lying to you. This
            post works both bars with real 2026 numbers, shows you the cap-rate
            and{" "}
            <Link
              href="/blog/gross-rent-multiplier-explained"
              className="text-primary font-semibold hover:underline"
            >
              gross rent multiplier
            </Link>{" "}
            math hiding underneath them, and lands on which one you should
            actually screen with.
          </p>

          <h2 className="text-2xl sm:text-3xl">
            The two rules, in one sentence each
          </h2>
          <p>
            The <strong>1% rule</strong> says a rental&apos;s gross monthly rent
            should be at least 1% of the purchase price. The{" "}
            <strong>2% rule</strong> doubles that: monthly rent should be at
            least 2% of the price. Both are pass/fail filters you can run in
            your head on a listing before you open a spreadsheet.
          </p>
          <div className="bg-card border border-border rounded-xl p-5 sm:p-6 my-4 text-center">
            <div className="text-sm sm:text-base font-mono">
              <strong>1% rule:</strong> monthly rent ÷ price ≥ 1%
            </div>
            <div className="text-sm sm:text-base font-mono mt-2">
              <strong>2% rule:</strong> monthly rent ÷ price ≥ 2%
            </div>
          </div>
          <p>
            On a $200,000 property, the 1% rule wants $2,000/month in rent. The
            2% rule wants $4,000/month for the exact same building. That&apos;s
            the entire difference — a factor of two on the same ratio.
            Everything else in this post is a consequence of that gap.
          </p>

          <h2 className="text-2xl sm:text-3xl">
            The ratio underneath both: GRM and cap rate
          </h2>
          <p>
            Rent-to-price is just the{" "}
            <Link
              href="/tools/gross-rent-multiplier-calculator"
              className="text-primary font-semibold hover:underline"
            >
              gross rent multiplier
            </Link>{" "}
            flipped over. A 1% monthly ratio is a 12% annual gross yield, which
            is a GRM of about <strong>8.3</strong> (100 ÷ 12). A 2% monthly
            ratio is a 24% annual gross yield — a GRM of about{" "}
            <strong>4.2</strong>. Buying at a 4.2 GRM means the property&apos;s
            gross rent pays back the purchase price in roughly four years,
            before expenses. That alone should tell you how rare a true 2%
            property is.
          </p>
          <p>
            The bridge to profitability runs through the{" "}
            <Link
              href="/blog/what-is-a-good-cap-rate"
              className="text-primary font-semibold hover:underline"
            >
              cap rate
            </Link>
            . A useful approximation:
          </p>
          <div className="bg-card border border-border rounded-xl p-5 sm:p-6 my-4 text-center">
            <div className="text-sm sm:text-base font-mono">
              cap rate ≈ (1 − operating-expense ratio) × annual gross yield
            </div>
          </div>
          <p>
            At a 50% expense ratio — the{" "}
            <Link
              href="/blog/50-percent-rule-rentals"
              className="text-primary font-semibold hover:underline"
            >
              50% rule
            </Link>{" "}
            benchmark — a 1% property pencils to a <strong>6% cap rate</strong>{" "}
            ((1 − 0.50) × 12%), while a 2% property implies a{" "}
            <strong>12% cap rate</strong> ((1 − 0.50) × 24%). Both of those are
            gross approximations, but they frame the stakes: the 1% rule is
            aiming at an ordinary, financeable cash-flow deal; the 2% rule is
            aiming at a yield that, in 2026, only distressed or deeply
            unglamorous property produces.
          </p>

          <h2 className="text-2xl sm:text-3xl">
            What each bar demands by price tier
          </h2>
          <p>
            The rules feel abstract until you attach dollar rents to them. Here
            is what the 1% and 2% bars ask for across three common price points,
            next to the kind of rent those properties actually command in 2026:
          </p>
          <div className="not-prose overflow-x-auto rounded-xl border border-border bg-card my-6">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left p-3 font-bold text-foreground">
                    Price
                  </th>
                  <th className="text-left p-3 font-bold text-foreground">
                    1% rent target
                  </th>
                  <th className="text-left p-3 font-bold text-foreground">
                    2% rent target
                  </th>
                  <th className="text-left p-3 font-bold text-foreground">
                    Typical real rent
                  </th>
                  <th className="text-left p-3 font-bold text-foreground">
                    Which bar it clears
                  </th>
                </tr>
              </thead>
              <tbody className="[&_td]:p-3 [&_td]:border-b [&_td]:border-border [&_tr:last-child_td]:border-0">
                <tr>
                  <td className="font-mono">$100,000</td>
                  <td className="font-mono">$1,000</td>
                  <td className="font-mono">$2,000</td>
                  <td className="font-mono">~$1,100</td>
                  <td className="text-muted-foreground">
                    Clears 1%, misses 2%
                  </td>
                </tr>
                <tr>
                  <td className="font-mono">$250,000</td>
                  <td className="font-mono">$2,500</td>
                  <td className="font-mono">$5,000</td>
                  <td className="font-mono">~$2,000</td>
                  <td className="text-muted-foreground">
                    Misses both (marginal on 1%)
                  </td>
                </tr>
                <tr>
                  <td className="font-mono">$450,000</td>
                  <td className="font-mono">$4,500</td>
                  <td className="font-mono">$9,000</td>
                  <td className="font-mono">~$2,700</td>
                  <td className="text-muted-foreground">Misses both badly</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p>
            The pattern is the story. In cheaper, cash-flow-oriented markets the
            1% rule is a live screen — plenty of properties near it, a few over.
            In median and appreciation markets even the 1% bar is a stretch, and
            the 2% bar is science fiction: a $450,000 house renting for $9,000 a
            month doesn&apos;t exist in a normal neighborhood. The 2% rule
            isn&apos;t wrong; it&apos;s just describing a corner of the market
            most investors never shop in.
          </p>

          <h2 className="text-2xl sm:text-3xl">
            A same-dollar worked comparison
          </h2>
          <p>
            Abstract ratios hide the trade-off. Let&apos;s underwrite two real
            deals that each sit right on their respective rule, both financed at
            25% down, 7%, 30 years, so you can see what &ldquo;passing 2%&rdquo;
            actually buys you — and what it costs.
          </p>

          <h3>Deal A — a 1% property at $250,000</h3>
          <p>
            A $250,000 duplex renting for $2,500/month ($30,000/year) hits the
            1% rule exactly. You put $62,500 down and finance $187,500. At 7%
            over 30 years the payment is about <strong>$1,247/month</strong>
            ($14,969/year). (Size any loan with the{" "}
            <Link
              href="/tools/mortgage-payment-calculator"
              className="text-primary font-semibold hover:underline"
            >
              mortgage payment calculator
            </Link>
            .) Run expenses at roughly 50% of rent — $15,000/year — and net
            operating income lands near <strong>$15,000</strong>. That&apos;s a
            6% cap rate, right on the approximation. Cash flow after the
            mortgage is about <strong>$31/year</strong> — call it breakeven —
            for a cash-on-cash return near <strong>0%</strong>.
          </p>

          <h3>Deal B — a 2% property at $75,000</h3>
          <p>
            A $75,000 house in a class-C, cash-flow market renting for
            $1,500/month ($18,000/year) hits the 2% rule. You put $18,750 down
            and finance $56,250. The payment is about{" "}
            <strong>$374/month</strong> ($4,489/year). But cheaper properties in
            weaker neighborhoods run
            <em> higher</em> expense ratios — more turnover, more repairs, more
            delinquency — so use 58%: $10,440/year. NOI is about{" "}
            <strong>$7,560</strong>, a 10.1% cap rate, and cash flow after the
            mortgage is roughly <strong>$3,071/year</strong> ($256/month). On
            $18,750 invested that&apos;s a <strong>16.4% cash-on-cash</strong>{" "}
            return.
          </p>
          <div className="not-prose overflow-x-auto rounded-xl border border-border bg-card my-6">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left p-3 font-bold text-foreground">
                    Metric
                  </th>
                  <th className="text-left p-3 font-bold text-foreground">
                    Deal A · 1% · $250K
                  </th>
                  <th className="text-left p-3 font-bold text-foreground">
                    Deal B · 2% · $75K
                  </th>
                </tr>
              </thead>
              <tbody className="[&_td]:p-3 [&_td]:border-b [&_td]:border-border [&_tr:last-child_td]:border-0 [&_td]:font-mono">
                <tr>
                  <td>Rent-to-price</td>
                  <td>1.0%</td>
                  <td>2.0%</td>
                </tr>
                <tr>
                  <td>Expense ratio</td>
                  <td>50%</td>
                  <td>58%</td>
                </tr>
                <tr>
                  <td>Cap rate</td>
                  <td>6.0%</td>
                  <td>10.1%</td>
                </tr>
                <tr>
                  <td>Monthly cash flow</td>
                  <td>~$3</td>
                  <td>~$256</td>
                </tr>
                <tr>
                  <td>Cash-on-cash</td>
                  <td>~0%</td>
                  <td>~16.4%</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p>
            On the numbers alone, the 2% deal buries the 1% deal — higher cap
            rate, real cash flow, a return you can retire on. So why
            doesn&apos;t everyone chase 2% properties? Because the spreadsheet
            doesn&apos;t price the risk.
          </p>

          <h2 className="text-2xl sm:text-3xl">
            Why the 2% rule is nearly extinct
          </h2>
          <p>
            A 2% rent-to-price ratio is a market&apos;s way of telling you why
            the property is cheap. Properties that rent for 2% of a low price
            cluster in neighborhoods with soft or negative appreciation, higher
            tenant turnover, more deferred maintenance, longer eviction
            timelines, and thinner buyer demand when you go to sell. The
            &ldquo;10% cap rate&rdquo; is real, but so is the vacancy month you
            didn&apos;t model, the $9,000 roof on a $75,000 house (that&apos;s
            12% of the purchase price in one repair), and the property manager
            who won&apos;t take the account. Class-C cash flow is a job, not a
            coupon.
          </p>
          <p>
            There&apos;s also a simple math reason the 2% rule went quiet. In
            the cheap-money era, a 2% property financed at 4% threw off enormous
            leveraged returns, so investors evangelized the rule. At 2026
            borrowing costs the deals that clear 2% are scarcer, and the ones
            that exist come with the risk profile above. The rule didn&apos;t
            stop working — the market that produced it thinned out.
          </p>

          <h2 className="text-2xl sm:text-3xl">
            Why even the 1% rule needs an asterisk in 2026
          </h2>
          <p>
            The 1% rule is the one you&apos;ll actually use, but 7% rates moved
            its meaning. Break-even rent-to-price — the ratio at which a
            leveraged property covers its mortgage and operating costs with
            nothing left over — has climbed to roughly <strong>0.76%</strong> at
            today&apos;s rates. That means a property sitting exactly at 1.0%
            has only a slim margin above breakeven, not the comfortable buffer
            the rule implied when money was cheap. Deal A above makes the point:
            a textbook 1% property that cash-flows about three dollars a month.
          </p>
          <p>
            So the 1% rule in 2026 is a &ldquo;keep looking&rdquo; line, not a
            &ldquo;buy&rdquo; line. Clearing it means the deal is worth a full
            underwrite; it does not mean the deal is good. For the deeper dive
            on how the rule shifted and the two 1% properties whose returns sit
            40% apart, see our{" "}
            <Link
              href="/blog/1-percent-rule-rental-property"
              className="text-primary font-semibold hover:underline"
            >
              full breakdown of the 1% rule
            </Link>
            .
          </p>

          <h2 className="text-2xl sm:text-3xl">
            The blind spot both rules share
          </h2>
          <p>
            Here&apos;s the trap that sinks investors who lean on either rule:
            both compare <em>gross</em> rent to price and ignore every expense.
            Two properties can hit the identical rent-to-price ratio while one
            cash flows and the other bleeds, because one has $2,800 taxes and
            the other $6,000, or one needs $400/month in capital reserves and
            the other $150. The rule can&apos;t see any of that. It&apos;s a
            first-pass filter — a way to decide what&apos;s worth underwriting —
            and nothing more.
          </p>
          <p>
            The fix is to treat the screen and the underwrite as two separate
            steps. Run the 1% rule (or the 2% rule, if you shop that niche) to
            triage a list of listings down to a shortlist. Then take the
            survivors to real{" "}
            <Link
              href="/blog/how-to-calculate-noi-rental-property"
              className="text-primary font-semibold hover:underline"
            >
              net operating income
            </Link>{" "}
            — rent minus vacancy, taxes, insurance, maintenance, management, and
            reserves — and judge them on cap rate, cash-on-cash, and DSCR
            instead.
          </p>

          <h2 className="text-2xl sm:text-3xl">Which rule should you use?</h2>
          <p>
            For almost everyone:{" "}
            <strong>
              the 1% rule as a daily screen, the 2% rule as a label.
            </strong>{" "}
            The 1% rule maps to the ordinary financeable cash-flow deal most
            investors are hunting, and it&apos;s calibrated close enough to
            today&apos;s break-even that clearing it actually means something.
            The 2% rule is best understood not as a target you&apos;ll hit but
            as a description of a specific, higher-risk corner of the market —
            useful vocabulary, not a filter you&apos;ll run on Zillow and get
            results from.
          </p>
          <p>
            Whichever you reach for, remember what the rule is: a five-second
            triage that tells you where to spend your next hour. It never tells
            you whether to buy. That answer lives in the full underwrite. You
            can run either screen instantly here —{" "}
            <Link
              href="/tools/1-percent-rule-calculator"
              className="text-primary font-semibold hover:underline"
            >
              1% rule calculator
            </Link>{" "}
            and{" "}
            <Link
              href="/tools/2-percent-rule-calculator"
              className="text-primary font-semibold hover:underline"
            >
              2% rule calculator
            </Link>{" "}
            — and then take the ones that pass to the full analyzer.
          </p>

          <div className="not-prose"></div>

          <h2 className="text-2xl sm:text-3xl">FAQ</h2>
          {FAQS.map((f, i) => (
            <details
              key={i}
              className="not-prose bg-card border border-border rounded-xl p-4 sm:p-5 mb-3"
            >
              <summary className="cursor-pointer font-bold text-foreground">
                {f.q}
              </summary>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                {f.a}
              </p>
            </details>
          ))}
        </article>
        <RelatedContent kind="blog" slug={SLUG} title={TITLE} className="mt-10" />

        <RelatedBlogPosts currentSlug={SLUG} />
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <NewsletterSignup variant="expanded" source="blog" />
        </div>

        <footer className="mt-12 pt-8 border-t border-border">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Related:{" "}
            <Link
              href="/blog/1-percent-rule-rental-property"
              className="font-bold text-foreground hover:underline"
            >
              The 1% rule in 2026 →
            </Link>{" "}
            ·{" "}
            <Link
              href="/blog/gross-rent-multiplier-explained"
              className="font-bold text-foreground hover:underline"
            >
              Gross rent multiplier explained →
            </Link>
          </p>
        </footer>
      </main>
      <SiteFooter />
      <ScrollDepthTracker />
      <BlogStickyCta />
    </div>
  );
}
