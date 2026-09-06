/**
 * Blog post: exit cap rate (terminal / reversion cap rate) for a rental.
 *
 * Targets queries: "exit cap rate", "terminal cap rate", "reversion cap
 * rate", "what exit cap rate to use", "exit cap rate assumption",
 * "going-in vs exit cap rate", "how to determine exit cap rate", "exit
 * cap rate real estate".
 *
 * Angle: the exit cap rate is the single highest-leverage guess in any
 * multi-year hold model — projected sale price = exit-year NOI ÷ exit
 * cap rate — and most investors pick it in seconds. Give the formula,
 * the reciprocal reason it dominates the return, a full worked 2026
 * example with a sale-price + IRR sensitivity table, what actually moves
 * exit caps, the exit ≥ entry rule, the residential-vs-commercial
 * caveat, and the mistakes. Slots into the cap-rate / pro-forma / IRR
 * cluster and funnels into the cap-rate + NOI calculators and analyzer.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SiteFooter } from "@/components/marketing/site-footer";
import { BlogStickyCta } from "@/components/marketing/blog-sticky-cta";
import { RelatedBlogPosts } from "@/components/marketing/related-blog-posts";
import { RelatedContent } from "@/components/marketing/related-content";
import { NewsletterSignup } from "@/components/marketing/newsletter-signup";
import { getSiteUrl } from "@/lib/site-url";

const SLUG = "exit-cap-rate-rental-property";
const TITLE_PLAIN =
  "Exit cap rate: how to pick the number that sets your sale price (2026)";
// SERP-facing title (metadata/og only): kept ≤50 chars so the root
// layout's "%s | TrueCap" template stays inside the ~60-char SERP
// window. The on-page <h1> keeps the longer editorial TITLE_PLAIN.
const SERP_TITLE = "Exit cap rate: how to pick the number (2026)";
const DESCRIPTION =
  "Exit cap rate = exit-year NOI ÷ the cap rate a future buyer pays. Why it drives your sale price and IRR more than any input, plus a worked 2026 example.";
const PUBLISHED_AT = "2026-07-08";
const MODIFIED_AT = "2026-07-08";
const READING_TIME = 11;

export const metadata: Metadata = {
  title: SERP_TITLE,
  description: DESCRIPTION,
  keywords: [
    "exit cap rate",
    "terminal cap rate",
    "reversion cap rate",
    "what exit cap rate to use",
    "exit cap rate assumption",
    "going-in vs exit cap rate",
    "how to determine exit cap rate",
    "exit cap rate real estate",
  ],
  alternates: { canonical: `/blog/${SLUG}` },
  openGraph: {
    title: SERP_TITLE,
    description: DESCRIPTION,
    url: `/blog/${SLUG}`,
    type: "article",
    publishedTime: PUBLISHED_AT,
    modifiedTime: MODIFIED_AT,
    images: [{ url: "/home.jpg", width: 1200, height: 630, alt: TITLE_PLAIN }],
  },
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
};

const FAQS = [
  {
    q: "What is an exit cap rate?",
    a: "The exit cap rate — also called the terminal or reversion cap rate — is the cap rate you assume a future buyer will pay when you sell. You use it to project the sale price: exit-year net operating income divided by the exit cap rate. If a property throws off $22,000 of NOI in the year you sell and you assume a 7% exit cap, you're modeling a sale price of about $314,000. It's a forward-looking assumption about the market on your exit date, not something you can calculate from today's numbers.",
  },
  {
    q: "Should the exit cap rate be higher than the going-in cap rate?",
    a: "As a default, yes. The building is older and more depreciated on your exit date than the day you bought it, and you cannot forecast that interest rates will be lower when you sell — so assuming the market pays a lower cap rate (compression) is optimistic. A common, conservative convention is to add roughly 0.1 percentage point of exit cap for every year you hold: a 6.5% going-in cap over a five-year hold becomes about a 7.0% exit cap. If a deal only works when you assume the exit cap compresses below your entry cap, you're underwriting a bet on rates, not a rental.",
  },
  {
    q: "What is a good exit cap rate assumption for 2026?",
    a: "There's no universal number, because cap rates are local and move with interest rates. The defensible approach in 2026's higher-rate environment is to start from your going-in cap rate, add 0.5 point or so for a typical five-year hold, and then stress-test the deal at your entry cap, entry + 0.5, and entry + 1.0. If the return survives the middle case and doesn't turn into a loss at entry + 1.0, the deal stands on its own. Assuming compression to hit a target IRR is the most common way pro formas flatter a mediocre deal.",
  },
  {
    q: "Does the exit cap rate matter for a single-family or small multifamily rental?",
    a: "Less directly than for commercial property. A 2–4 unit or single-family home is usually resold to an owner-occupant or a small investor who prices it on comparable sales and price per square foot, not on a cap rate — cap-rate pricing is really a 5+ unit and commercial convention. Use the exit cap as one lens on resale value for small residential, and cross-check it against comp-based appreciation. For a 5+ unit building, the exit cap is the lens, because that's exactly how the next buyer's lender and appraiser will value it.",
  },
];

export default function ExitCapRatePost() {
  const siteUrl = getSiteUrl();
  const canonicalUrl = `${siteUrl}/blog/${SLUG}`;

  const articleLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: TITLE_PLAIN,
    description: DESCRIPTION,
    datePublished: PUBLISHED_AT,
    dateModified: MODIFIED_AT,
    url: canonicalUrl,
    author: { "@type": "Person", "@id": `${siteUrl}/about#morgan`, name: "Morgan Page", url: `${siteUrl}/about` },
    publisher: { "@id": `${siteUrl}/#organization` },
    mainEntityOfPage: canonicalUrl,
    image: [`${siteUrl}/home.jpg`],
  };
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "TrueCap", item: `${siteUrl}/` },
      { "@type": "ListItem", position: 2, name: "Blog", item: `${siteUrl}/blog` },
      { "@type": "ListItem", position: 3, name: TITLE_PLAIN, item: canonicalUrl },
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
        <article>
          <div className="mb-2">
            <Link
              href="/blog"
              className="text-xs uppercase tracking-widest text-muted-foreground font-bold hover:text-foreground"
            >
              ← Blog
            </Link>
          </div>
          <header className="mb-8">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground leading-tight tracking-tight text-balance">
              Exit cap rate: how to pick the number that sets your sale price
              (2026)
            </h1>
            <p className="mt-3 text-[11px] uppercase tracking-widest text-muted-foreground font-bold">
              {new Date(PUBLISHED_AT).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}{" "}
              · {READING_TIME} min read
            </p>
            <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
              Every projection of what a rental returns five or ten years out
              rests on a number most investors pick in about four seconds and
              never revisit: the exit cap rate. It&apos;s the cap rate you assume
              a future buyer will pay when you sell, and because your projected
              sale price is exit-year net operating income divided by that rate,
              it quietly sets the biggest line in any multi-year return — the
              proceeds from the sale. Miss it by half a point and the sale price
              moves tens of thousands of dollars. Miss it by a full point and it
              can flip a deal from a double-digit return to a loss, without
              changing a single thing about how the property actually operates.
              Here&apos;s what the exit cap rate is, why it deserves more scrutiny
              than any other assumption in the model, a worked 2026 example, and
              how to pick a number you can defend.
            </p>
          </header>

          <div className="prose prose-neutral max-w-none text-foreground space-y-6 leading-relaxed">
            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              What the exit cap rate is
            </h2>
            <p>
              Start with the cap rate you already know. The{" "}
              <strong>going-in cap rate</strong> (or entry cap rate) is year-one{" "}
              <Link
                href="/blog/how-to-calculate-noi-rental-property"
                className="text-primary font-semibold hover:underline"
              >
                net operating income
              </Link>{" "}
              divided by the purchase price — what the property yields the day you
              buy it. The <strong>exit cap rate</strong> is the same idea pointed
              at the future: the cap rate you assume the market will pay when
              it&apos;s your turn to sell. You don&apos;t compute it from data you
              have today; you assume it, and then you use it to turn a future
              year&apos;s NOI into a sale price:
            </p>
            <div className="rounded-xl border border-border bg-muted/30 p-5">
              <code className="text-sm sm:text-base text-foreground font-mono">
                Projected sale price = Exit-year NOI ÷ Exit cap rate
              </code>
            </div>
            <p>
              It goes by several names that all mean the same thing —{" "}
              <strong>terminal cap rate</strong> and{" "}
              <strong>reversion cap rate</strong> are the two you&apos;ll see most
              in a pro forma or a lender&apos;s model. One refinement the pros
              build in: a buyer on your exit date is really pricing next
              year&apos;s income, so a careful model divides the{" "}
              <em>forward</em> NOI (the year after you sell) by the exit cap, not
              the trailing number. For a clean example we&apos;ll use the
              exit-year NOI, but keep the nuance in your pocket — at a big
              denominator, even that one-year difference is real money. If you
              want to see how the cap rate and NOI move together on today&apos;s
              side of the trade first, the{" "}
              <Link
                href="/blog/how-to-calculate-cap-rate"
                className="text-primary font-semibold hover:underline"
              >
                guide to calculating cap rate
              </Link>{" "}
              walks the going-in version step by step, and the free{" "}
              <Link
                href="/analyze"
                className="text-primary font-semibold hover:underline"
              >
                TrueCap analyzer
              </Link>{" "}
              does it live on a real address.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              Why it matters more than any other input
            </h2>
            <p>
              On a buy-and-hold deal, the money comes from two places: the cash
              flow you collect each year, and the lump sum you net when you sell.
              For a typical five-to-ten-year hold, that sale — the reversion —
              is usually <strong>60% to 80% of the entire return</strong>. And
              the sale price runs entirely through the exit cap rate. So the one
              assumption you can&apos;t check against any real data is also the
              one that controls most of your profit.
            </p>
            <p>
              It gets worse, because the relationship isn&apos;t gentle.
              Value is NOI <em>divided</em> by the cap rate, so the sale price
              moves with the reciprocal of the rate — a small change in the
              denominator levers into a large change in the price, and the effect
              accelerates as caps fall. Going from a 7.0% to a 6.5% exit cap
              (half a point) lifts value about 7.7%; going from 6.5% to 6.0%
              lifts it about 8.3%. Compare that to the inputs investors actually
              obsess over. A quarter-point on your mortgage rate or five points of
              vacancy moves cash flow by a few dollars a month. The exit cap moves
              the biggest check the deal will ever cut. It deserves the most
              scrutiny and usually gets the least.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              A worked example: the $300K duplex
            </h2>
            <p>
              Take a $300,000 duplex bought with 25% down ($75,000) plus about
              $9,000 in closing costs, so <strong>$84,000 of cash in</strong>. The
              $225,000 loan at 7% over 30 years runs $1,497 a month, or $17,963 a
              year in debt service. Assume a{" "}
              <strong>6.5% going-in cap rate</strong>, which puts year-one NOI at
              $19,500 and year-one cash flow at $1,537. Let NOI grow 3% a year, a
              reasonable rent-and-expense drift. By the time you sell at the end of
              year five, NOI has climbed to <strong>$21,947</strong> — up 12.6%
              from where it started — and the loan has amortized down to about
              $211,796.
            </p>
            <p>
              Now hold everything about the property fixed and change only the
              exit cap rate. Here&apos;s the sale price, the net proceeds after a
              7% cost of sale and the loan payoff, and the five-year internal rate
              of return on your $84,000:
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-left">Exit cap rate</th>
                    <th className="text-right">Sale price</th>
                    <th className="text-right">Net proceeds</th>
                    <th className="text-right">5-yr IRR</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>6.0% (compression)</td>
                    <td className="text-right">$365,790</td>
                    <td className="text-right">$128,389</td>
                    <td className="text-right">11.5%</td>
                  </tr>
                  <tr>
                    <td>6.5% (held flat)</td>
                    <td className="text-right">$337,653</td>
                    <td className="text-right">$102,221</td>
                    <td className="text-right">6.9%</td>
                  </tr>
                  <tr>
                    <td>7.0% (mild expansion)</td>
                    <td className="text-right">$313,535</td>
                    <td className="text-right">$79,791</td>
                    <td className="text-right">2.3%</td>
                  </tr>
                  <tr>
                    <td>7.5% (real expansion)</td>
                    <td className="text-right">$292,632</td>
                    <td className="text-right">$60,352</td>
                    <td className="text-right">−2.6%</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p>
              Read down that table slowly, because it&apos;s the whole point of
              the article. The property is identical in every row — same rent,
              same expenses, same 12.6% of NOI growth, same loan. The only thing
              that changes is the number you guessed for the buyer&apos;s cap rate
              years from now. If you assume the cap rate holds flat at your entry
              6.5%, you net $102,221 and earn a 6.9% IRR — a real but modest
              return that leans on $37,653 of appreciation the NOI growth
              produced. Let the market compress half a point to 6.0% and the IRR
              jumps to 11.5%. Let it expand a full point to 7.5% and the sale
              price actually lands <em>below</em> your $300,000 purchase price
              despite NOI growing almost 13%, and your five-year IRR goes{" "}
              <strong>negative</strong>. That&apos;s a $73,000 swing in sale price
              and a 14-point swing in IRR — all of it riding on a single
              assumption you can&apos;t look up.
            </p>
            <p>
              The equity multiple tells the same story in one figure: 1.69x of
              your cash back at a 6.0% exit, 1.38x at 6.5%, 1.11x at 7.0%, and
              0.88x — a loss — at 7.5%. If you want to feel how the going-in side
              of this drives the exit, rebuild the NOI line in the{" "}
              <Link
                href="/analyze"
                className="text-primary font-semibold hover:underline"
              >
                TrueCap analyzer
              </Link>{" "}
              and watch the exit-year number move.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              What actually moves exit cap rates
            </h2>
            <p>
              If the exit cap is that important, it&apos;s worth knowing what
              pushes it around. Three forces do most of the work. First and
              biggest, <strong>interest rates</strong>: cap rates loosely track
              the cost of debt, so when the ten-year Treasury and mortgage rates
              rise, buyers demand higher yields and cap rates drift up. The 2022–26
              rate climb is exactly why so many deals underwritten on 2021
              compression assumptions disappointed. Second, the{" "}
              <strong>building ages</strong>: a property that&apos;s five years
              older at sale has five more years of wear and a shorter remaining
              life, which argues — all else equal — for a slightly higher exit
              cap than entry. Third, <strong>the local market and cycle</strong>:
              rent growth, employment, supply, and where you sit in the cycle all
              feed the cap rate the next buyer will accept.
            </p>
            <p>
              The honest conclusion from that list is humbling: you cannot
              forecast the biggest driver. Nobody reliably predicts where rates
              sit in five years. So the disciplined move isn&apos;t to guess
              precisely — it&apos;s to refuse to assume the market bails you out.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              How to pick a number you can defend
            </h2>
            <p>
              Three rules keep you honest. <strong>One: exit cap ≥ going-in
              cap.</strong> Make your default assumption that the cap rate you
              sell at is at least the one you bought at. A widely used convention
              is to add about 0.1 percentage point of exit cap for each year of
              the hold — a 6.5% entry over five years becomes a ~7.0% exit. That
              isn&apos;t pessimism; it&apos;s declining to assume a rally you have
              no way to predict. <strong>Two: never underwrite compression to make
              a deal pencil.</strong> The instant a marginal deal only clears your
              return hurdle because you typed a lower exit cap than your entry cap,
              stop — you&apos;ve stopped analyzing a rental and started
              speculating on interest rates. <strong>Three: stress-test the
              exit.</strong> Run the deal at your entry cap, entry + 0.5, and entry
              + 1.0, and make sure it survives the middle case and doesn&apos;t
              become a loss at the top. A deal that only works at your rosiest
              exit cap is fragile by construction.
            </p>
            <p>
              This is the same discipline that separates a real underwrite from a
              seller&apos;s{" "}
              <Link
                href="/blog/rental-property-pro-forma-explained"
                className="text-primary font-semibold hover:underline"
              >
                pro forma
              </Link>
              . When a marketing package advertises an 18% projected IRR, the
              first thing to check is the exit cap buried in the assumptions. If
              it&apos;s lower than the going-in cap, the model is quietly baking in
              a market rally, and the headline return is a forecast of rates
              dressed up as a forecast of the building. The reversion is where
              that sleight of hand hides, which is also why exit cap sits at the
              heart of the difference between{" "}
              <Link
                href="/blog/cash-on-cash-vs-irr"
                className="text-primary font-semibold hover:underline"
              >
                cash-on-cash and IRR
              </Link>{" "}
              — cash-on-cash ignores the sale entirely, while IRR lives or dies on
              it.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              The residential caveat that matters
            </h2>
            <p>
              One honest wrinkle for TrueCap&apos;s core audience. Cap-rate pricing
              is really a commercial and 5+ unit convention. When you sell a
              single-family rental or a 2–4 unit, the buyer is usually an
              owner-occupant or a small investor, and their lender appraises the
              property on <strong>comparable sales and price per square foot</strong>,
              not on a cap rate. So for small residential, treat the exit-cap
              reversion as one useful lens on resale value — and cross-check it
              against straightforward comp-based appreciation, the kind you can
              reason about in a{" "}
              <Link
                href="/blog/cash-flow-vs-appreciation"
                className="text-primary font-semibold hover:underline"
              >
                cash-flow-versus-appreciation
              </Link>{" "}
              frame. For a 5+ unit building the exit cap isn&apos;t just a lens,
              it&apos;s the lens: that&apos;s exactly how the next buyer&apos;s
              appraiser and lender will set the price, so the discipline above
              applies with full force.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              Five ways people get the exit cap wrong
            </h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Assuming compression to hit a target.</strong> Typing an
                exit cap below your entry cap so the IRR clears your hurdle is the
                cardinal sin. It converts a rental analysis into a rate bet you
                didn&apos;t mean to place.
              </li>
              <li>
                <strong>Dividing the wrong NOI.</strong> The exit cap applies to a
                forward-looking income figure. Using a lowball or a stale NOI at
                that huge denominator throws the sale price off by thousands.
              </li>
              <li>
                <strong>Forgetting the costs of selling.</strong> A projected sale
                price isn&apos;t proceeds. Net out 6–8% for commissions and closing
                plus your loan payoff before you call it a return.
              </li>
              <li>
                <strong>Applying a commercial cap to small residential.</strong> A
                duplex that will actually resell on comps doesn&apos;t take a
                strict cap-rate reversion at face value. Sanity-check against
                price per square foot.
              </li>
              <li>
                <strong>Letting a low exit cap paper over weak cash flow.</strong>{" "}
                A deal that loses money every month but &quot;wins on the exit&quot;
                is betting the whole thesis on the one number you can&apos;t
                control. Make it stand up on cash flow first.
              </li>
            </ul>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              FAQ
            </h2>
            {FAQS.map((f) => (
              <div key={f.q}>
                <h3 className="text-xl font-bold text-foreground mt-6 mb-2">
                  {f.q}
                </h3>
                <p>{f.a}</p>
              </div>
            ))}

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              The bottom line
            </h2>
            <p>
              The exit cap rate is the highest-leverage guess in any hold model —
              a number you can&apos;t look up that nonetheless controls most of
              your return. Treat it with the respect it deserves: default to an
              exit cap at least as high as your going-in cap, add a tenth of a
              point per year of hold, stress-test the deal a full point wider, and
              never let a compressing exit cap rescue a deal that doesn&apos;t work
              on its own. Do that and your projected return becomes a statement
              about the building instead of a bet on interest rates. Let the{" "}
              <Link href="/" className="text-primary font-semibold hover:underline">
                TrueCap analyzer
              </Link>{" "}
              carry your NOI, financing, and cap-rate assumptions straight through
              to cash flow, DSCR, and the projected sale — so the exit you assume
              and the modeled result always come from the same set of numbers.
              None of this is investment advice; confirm the actual rents,
              expenses, and comparable sales on any specific property before you
              rely on a projected exit.
            </p>
          </div>
        </article>
        <RelatedContent kind="blog" slug={SLUG} title={TITLE_PLAIN} className="mt-10" />
      </main>
      <RelatedBlogPosts currentSlug={SLUG} />
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <NewsletterSignup variant="expanded" source="blog" />
      </div>
      <BlogStickyCta />
      <SiteFooter />
      <ScrollDepthTracker />
    </div>
  );
}
