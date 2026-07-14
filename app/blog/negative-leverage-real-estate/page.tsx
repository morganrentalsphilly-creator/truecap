/**
 * Blog post: negative leverage in real estate.
 *
 * Targets queries: "negative leverage real estate", "what is negative
 * leverage", "positive vs negative leverage", "loan constant", "loan
 * constant vs cap rate", "does leverage increase returns real estate",
 * "negative leverage rental property", "cap rate vs cost of debt".
 *
 * Angle: leverage only boosts returns when the asset out-earns the debt.
 * The hinge is the loan constant (annual debt service / loan), not the
 * note rate. When the cap rate sits below the loan constant — the default
 * in 2026, with ~8% loan constants against 5.5–7% residential cap rates —
 * a mortgage drags cash-on-cash below the unlevered yield, and it does so
 * even on deals that still cash-flow and still pass a DSCR lender. The
 * "negative-leverage trap" is referenced across the catalog; this is the
 * canonical explainer it points to.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SiteFooter } from "@/components/marketing/site-footer";
import { BlogStickyCta } from "@/components/marketing/blog-sticky-cta";
import { RelatedBlogPosts } from "@/components/marketing/related-blog-posts";
import { NewsletterSignup } from "@/components/marketing/newsletter-signup";
import { getSiteUrl } from "@/lib/site-url";

const SLUG = "negative-leverage-real-estate";
const TITLE =
  "Negative leverage in real estate: when borrowing lowers your return (2026)";
// SERP-facing title (metadata/og only): kept ≤50 chars so the root
// layout's "%s | TrueCap" template stays inside the ~60-char SERP
// window. The on-page <h1> keeps the longer editorial TITLE.
const SERP_TITLE = "Negative leverage in real estate, explained (2026)";
const DESCRIPTION =
  "Negative leverage is when a mortgage lowers your return. Here's the loan constant vs cap rate rule, with worked 2026 examples and the deals it quietly traps.";
const PUBLISHED_AT = "2026-06-28";
const MODIFIED_AT = "2026-06-28";
const READING_TIME = 11;

export const metadata: Metadata = {
  title: SERP_TITLE,
  description: DESCRIPTION,
  keywords: [
    "negative leverage real estate",
    "what is negative leverage",
    "positive vs negative leverage",
    "loan constant",
    "loan constant vs cap rate",
    "negative leverage rental property",
    "does leverage increase returns real estate",
    "cap rate vs cost of debt",
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
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
};

const FAQS = [
  {
    q: "What is negative leverage in real estate?",
    a: "Negative leverage is when borrowing money to buy a property lowers your return instead of raising it. It happens when the property's cap rate — its unlevered yield — sits below the loan constant, which is the all-in annual cost of the debt as a percentage of the loan. When that is true, every borrowed dollar earns less than it costs to borrow, so adding a mortgage drags your cash-on-cash return below the cap rate you would have earned paying cash.",
  },
  {
    q: "How do you calculate the loan constant?",
    a: "Divide the annual debt service — twelve monthly principal-and-interest payments — by the original loan amount. A $225,000 loan at 7% over 30 years costs about $17,963 a year, so the loan constant is 17,963 ÷ 225,000 ≈ 7.98%. It is higher than the 7% note rate because the payment also repays principal. On an interest-only loan, where nothing amortizes, the loan constant equals the interest rate exactly.",
  },
  {
    q: "Is negative leverage always a bad deal?",
    a: "Not automatically — but you should never enter it by accident. Cash-on-cash ignores two real sources of return: the principal your tenant pays down every month and any appreciation. An investor buying in a strong-growth market may knowingly accept negative leverage on day one because they expect those two to carry the total return. The mistake is stumbling into it while believing the mortgage is helping. Know your number, then decide.",
  },
  {
    q: "What cap rate do I need to avoid negative leverage?",
    a: "A cap rate above your loan constant. In 2026, with 30-year investor loans roughly 7% to 7.5%, the loan constant lands near 8% to 8.4%, so you generally need a cap rate of 8% or higher for leverage to add to your return. Below that line, the more you borrow, the lower your cash-on-cash falls relative to the unlevered yield.",
  },
  {
    q: "Does a bigger down payment fix negative leverage?",
    a: "No — it only dilutes it. Putting more cash down shrinks the debt that is earning less than it costs, so your cash-on-cash drifts back toward the cap rate, but it never rises above the cap rate as long as the cap rate stays below the loan constant. The only true fixes change the spread itself: negotiate a lower price or raise income to lift the cap rate, or buy down the rate to lower the loan constant.",
  },
];

export default function NegativeLeveragePost() {
  const siteUrl = getSiteUrl();
  const canonicalUrl = `${siteUrl}/blog/${SLUG}`;

  const articleLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: TITLE,
    description: DESCRIPTION,
    datePublished: PUBLISHED_AT,
    dateModified: MODIFIED_AT,
    url: canonicalUrl,
    author: { "@type": "Person", name: "Morgan Page", url: siteUrl },
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
              {TITLE}
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
              &quot;Use leverage and the returns go up&quot; is the first thing
              most investors learn, and for a decade of cheap money it was true
              by default. It is not a law. Leverage is a multiplier with a sign,
              and the sign flips the moment your borrowing costs more than the
              property earns. When that happens you have <em>negative leverage</em>
              : a mortgage that drags your return <em>below</em> what you would
              have made paying cash. In 2026 it is not an exotic edge case — at
              today&apos;s rates it is the starting condition for most
              residential deals. Here is the one number that decides which way
              leverage cuts, the worked math, and the trap where a deal still
              cash-flows and still passes its lender while quietly destroying
              return.
            </p>
          </header>

          <div className="prose prose-neutral max-w-none text-foreground space-y-6 leading-relaxed">
            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              Leverage is conditional, not automatic
            </h2>
            <p>
              Borrowing amplifies whatever spread exists between what the asset
              yields and what the debt costs. If the property out-earns the
              loan, that gap is positive and leverage stretches it into a bigger
              return on your smaller slice of cash — <strong>positive
              leverage</strong>. If the loan costs more than the property earns,
              the gap is negative and leverage stretches <em>that</em> instead,
              pulling your return down — <strong>negative leverage</strong>. Same
              machine, opposite directions, and the only thing that sets the
              direction is which of the two numbers is larger.
            </p>
            <p>
              The reason it surprises people is that for years the question
              never came up. With 30-year loans at 3.5% to 4%, debt was so cheap
              that almost any property out-earned it, and &quot;more leverage,
              more return&quot; hardened into a rule. That rule was really just a
              description of a low-rate world — move the cost of debt up two or
              three points, which is exactly what happened, and it starts handing
              out the wrong answer.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              The number that decides it: the loan constant
            </h2>
            <p>
              The cost of your debt is not the interest rate. It is the{" "}
              <strong>loan constant</strong> — your annual debt service as a
              percentage of the loan balance:
            </p>
            <div className="rounded-xl border border-border bg-muted/30 p-5">
              <code className="text-sm sm:text-base text-foreground font-mono">
                Loan constant = Annual debt service ÷ Loan amount
              </code>
            </div>
            <p>
              Take a $225,000 loan at 7% over 30 years. The principal-and-interest
              payment is about $1,497 a month, or $17,963 a year (you can confirm
              it on the{" "}
              <Link
                href="/tools/mortgage-payment-calculator"
                className="text-primary font-semibold hover:underline"
              >
                mortgage payment calculator
              </Link>
              ). Divide that by the $225,000 balance and the loan constant is
              roughly <strong>7.98%</strong> — almost a full point above the 7%
              note rate. That gap is not a mistake. Your monthly payment does two
              jobs: it pays interest <em>and</em> it repays principal, and both
              are cash leaving your pocket this year. The loan constant captures
              the total drain; the interest rate captures only half of it.
            </p>
            <p>
              This is why you compare a property&apos;s yield to the loan
              constant, never to the headline rate. The one exception is an{" "}
              <strong>interest-only</strong> loan: with no amortization, the whole
              payment is interest, so the loan constant collapses back to the note
              rate. That is why interest-only structures make negative leverage
              look milder — they strip out the principal portion that pushes the
              constant above the rate. The principal does not vanish, though; you
              have just moved it off the cash-flow statement onto the balance
              sheet.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              The rule: cap rate vs loan constant
            </h2>
            <p>
              The property&apos;s unlevered yield is its{" "}
              <Link
                href="/tools/cap-rate-calculator"
                className="text-primary font-semibold hover:underline"
              >
                cap rate
              </Link>{" "}
              — net operating income divided by price, the return you would earn
              if you bought it for all cash. Set that against the loan constant
              and the whole question resolves to a single comparison:
            </p>
            <div className="rounded-xl border border-border bg-muted/30 p-5 space-y-1">
              <code className="block text-sm sm:text-base text-foreground font-mono">
                Cap rate &gt; Loan constant → positive leverage
              </code>
              <code className="block text-sm sm:text-base text-foreground font-mono">
                Cap rate &lt; Loan constant → negative leverage
              </code>
              <code className="block text-sm sm:text-base text-foreground font-mono">
                Cap rate = Loan constant → neutral
              </code>
            </div>
            <p>
              You can make this exact rather than directional. Your levered{" "}
              <Link
                href="/tools/cash-on-cash-calculator"
                className="text-primary font-semibold hover:underline"
              >
                cash-on-cash return
              </Link>{" "}
              decomposes cleanly into the cap rate plus a leverage term:
            </p>
            <div className="rounded-xl border border-border bg-muted/30 p-5">
              <code className="text-sm sm:text-base text-foreground font-mono">
                Levered CoC = Cap rate + (Loan ÷ Equity) × (Cap rate − Loan
                constant)
              </code>
            </div>
            <p>
              Read that second term carefully, because it is the entire story.
              The factor in parentheses — cap rate minus loan constant — is the{" "}
              <strong>spread</strong>, and its sign decides whether leverage adds
              or subtracts. The factor in front of it — loan divided by equity,
              your debt-to-equity ratio — is the <strong>amplifier</strong>. When
              the spread is positive, more debt multiplies a good thing. When the
              spread is negative, more debt multiplies a bad thing. Leverage
              never has an opinion of its own; it just makes the spread louder.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              One property, five cap rates
            </h2>
            <p>
              Hold the financing fixed and vary only the income. A $300,000
              property, 25% down ($75,000 equity), $225,000 borrowed at 7% over
              30 years — a loan constant of 7.98%. Now walk the cap rate from 5%
              up to 9% and watch what leverage does to the same $75,000 of cash:
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-left">Cap rate (NOI)</th>
                    <th className="text-right">All-cash return</th>
                    <th className="text-right">Levered CoC</th>
                    <th className="text-right">DSCR</th>
                    <th className="text-right">Cash flow / mo</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>5.0% ($15,000)</td>
                    <td className="text-right">5.0%</td>
                    <td className="text-right">−3.95%</td>
                    <td className="text-right">0.84</td>
                    <td className="text-right">−$246</td>
                  </tr>
                  <tr>
                    <td>6.0% ($18,000)</td>
                    <td className="text-right">6.0%</td>
                    <td className="text-right">0.05%</td>
                    <td className="text-right">1.00</td>
                    <td className="text-right">+$3</td>
                  </tr>
                  <tr>
                    <td>7.0% ($21,000)</td>
                    <td className="text-right">7.0%</td>
                    <td className="text-right">4.05%</td>
                    <td className="text-right">1.17</td>
                    <td className="text-right">+$253</td>
                  </tr>
                  <tr>
                    <td>7.98% ($23,950)</td>
                    <td className="text-right">7.98%</td>
                    <td className="text-right">7.98%</td>
                    <td className="text-right">1.33</td>
                    <td className="text-right">+$498</td>
                  </tr>
                  <tr>
                    <td>9.0% ($27,000)</td>
                    <td className="text-right">9.0%</td>
                    <td className="text-right">
                      <strong>12.05%</strong>
                    </td>
                    <td className="text-right">1.50</td>
                    <td className="text-right">+$753</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p>
              The crossover sits exactly at the 7.98% loan constant. Below it,
              the levered return is <em>worse</em> than buying for cash: at a 6%
              cap rate, an all-cash buyer earns 6% while the leveraged buyer
              earns 0.05% — the mortgage ate essentially the entire return. At a
              5% cap rate the leveraged return goes negative outright. Above the
              constant, leverage finally pays: at a 9% cap rate it lifts a 9%
              unlevered yield to a 12% cash-on-cash. The property did not change
              its character at 7.98% — that is just where your cost of debt and
              the asset&apos;s yield meet.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              The trap: it still cash-flows, it still passes the lender
            </h2>
            <p>
              Here is what makes negative leverage dangerous rather than obvious.
              Look at the 7% cap-rate row: the property throws off{" "}
              <strong>+$253 a month</strong> of cash flow and carries a{" "}
              <strong>1.17 DSCR</strong>. It is profitable. It is within shouting
              distance of the 1.20 to 1.25{" "}
              <Link
                href="/tools/dscr-calculator"
                className="text-primary font-semibold hover:underline"
              >
                debt-service-coverage ratio
              </Link>{" "}
              most lenders want. By the two checks investors lean on hardest —
              &quot;does it cash-flow?&quot; and &quot;will it finance?&quot; —
              it looks like a deal. And yet its 4.05% cash-on-cash is nearly
              three full points below the 7% you would have earned in all cash.
              The leverage is quietly destroying return on a deal that passes
              every surface test.
            </p>
            <p>
              The reason the two ideas diverge is that they measure different
              lines. DSCR hits 1.0 when net operating income merely equals debt
              service — the property just barely covers its own loan. The{" "}
              <em>leverage</em> breakeven sits much higher, at the cap rate where
              your return equals the unlevered yield, which in this example lands
              at a DSCR of 1.33. That gap between DSCR 1.0 and DSCR 1.33 is a
              wide grey band where a property pays its bills, satisfies a{" "}
              <Link
                href="/blog/dscr-loans-explained"
                className="text-primary font-semibold hover:underline"
              >
                DSCR lender
              </Link>
              , shows positive monthly cash flow — and is still leveraged
              backward. A lender approving on coverage is asking &quot;can this
              loan get paid?&quot;, not &quot;is borrowing making this investor
              money?&quot; Those are not the same question, and only one of them
              is yours to answer.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              More leverage makes it worse, not better
            </h2>
            <p>
              The instinct, once a deal looks thin, is to stretch the financing —
              put less down, borrow more, &quot;use leverage.&quot; Under
              negative leverage that is exactly backwards. Keep the 6% cap-rate
              property ($18,000 of NOI) and change only the down payment:
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-left">Financing</th>
                    <th className="text-right">Loan</th>
                    <th className="text-right">Cash-on-cash</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>All cash</td>
                    <td className="text-right">$0</td>
                    <td className="text-right">6.00%</td>
                  </tr>
                  <tr>
                    <td>50% down</td>
                    <td className="text-right">$150,000</td>
                    <td className="text-right">4.02%</td>
                  </tr>
                  <tr>
                    <td>25% down</td>
                    <td className="text-right">$225,000</td>
                    <td className="text-right">0.05%</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p>
              The return moves the <em>opposite</em> way to the textbook. Every
              extra dollar borrowed is a dollar earning 6% (the property&apos;s
              yield) but costing 7.98% (the loan constant), so the more you
              borrow, the deeper the drag. This is the precise inverse of how
              leverage behaves on a good deal, where piling on debt pushes the
              return up — see the same mechanic running the right direction in
              the{" "}
              <Link
                href="/blog/how-much-down-payment-investment-property"
                className="text-primary font-semibold hover:underline"
              >
                down-payment breakdown
              </Link>
              . The lesson is not &quot;use less leverage&quot; as a blanket
              rule; it is that the down-payment decision is downstream of the
              spread. Get the spread positive first.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              Why 2026 made negative leverage the default
            </h2>
            <p>
              Plot the loan constant against the rate environment and you can see
              why this went from a rare warning to the base case. The constant
              moves with the rate, but it always sits above it because of
              amortization:
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-left">30-yr rate</th>
                    <th className="text-right">Loan constant</th>
                    <th className="text-left">Typical residential cap rate</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>3.5%</td>
                    <td className="text-right">5.39%</td>
                    <td>5.5%–7% → leverage usually positive</td>
                  </tr>
                  <tr>
                    <td>4.0%</td>
                    <td className="text-right">5.73%</td>
                    <td>5.5%–7% → leverage usually positive</td>
                  </tr>
                  <tr>
                    <td>7.0%</td>
                    <td className="text-right">7.98%</td>
                    <td>5.5%–7% → leverage usually negative</td>
                  </tr>
                  <tr>
                    <td>7.5%</td>
                    <td className="text-right">8.39%</td>
                    <td>5.5%–7% → leverage usually negative</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p>
              In the cheap-money era a 5.4% loan constant sat comfortably below
              the 5.5% to 7% cap rates of ordinary rental markets, so leverage
              added to returns almost everywhere and nobody had to think about
              it. In 2026 the constant has climbed to roughly 8%, but cap rates
              on bread-and-butter residential property have barely moved — they
              are sticky, anchored to what owner-occupants and yield-starved
              buyers will pay. The loan constant now sits <em>above</em> the cap
              rate across most of the market. That single crossing is why so many
              deals that &quot;worked&quot; on a 2021 spreadsheet pencil
              negative today on identical rent and price. It is also why pre-2022
              cap-rate intuition is{" "}
              <Link
                href="/blog/what-is-a-good-cap-rate"
                className="text-primary font-semibold hover:underline"
              >
                quietly buying investors into negative leverage
              </Link>
              .
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              What to do when a deal is negatively leveraged
            </h2>
            <p>
              You have four real levers, and all of them work by closing the
              spread between the cap rate and the loan constant. First,{" "}
              <strong>lower the price.</strong> Cap rate is NOI over price, so
              paying less lifts the yield directly; a $300,000 building bought at
              $265,000 on the same $18,000 of NOI jumps from a 6.0% to a 6.8% cap
              rate, shrinking the gap. Second, <strong>raise the NOI</strong> —
              higher rent, lower operating costs, a unit brought to market — which
              moves the cap rate up the same way. Third, <strong>lower the loan
              constant</strong> by buying down the rate, taking a shorter focus
              on points, or in some cases an interest-only period, which strips
              the amortization back out of the constant. Fourth, and most
              honestly, <strong>accept it on purpose.</strong>
            </p>
            <p>
              That last option is real, not a cop-out. Cash-on-cash deliberately
              ignores two things your tenant is buying you: the loan principal
              they pay down each month, and any appreciation. An investor in a
              high-growth market may take a negatively leveraged deal anyway,
              betting paydown and price growth more than offset a thin early cash
              yield — a perfectly sound bet, and exactly the{" "}
              <Link
                href="/blog/cash-flow-vs-appreciation"
                className="text-primary font-semibold hover:underline"
              >
                cash flow versus appreciation
              </Link>{" "}
              trade-off. The only unforgivable version is the one you did not
              know about. Taken knowingly, with reserves to fund the gap,
              negative leverage is a strategy; discovered eighteen months in,
              when you wonder why a &quot;cash-flowing&quot; rental never built
              any cash, it is a mistake.
            </p>
            <p>
              It is also why cap rate and cash-on-cash have to be read{" "}
              <Link
                href="/blog/cap-rate-vs-cash-on-cash-vs-dscr"
                className="text-primary font-semibold hover:underline"
              >
                together rather than in isolation
              </Link>
              : the cap rate is what the asset earns, the cash-on-cash is what
              your money earns after the debt takes its cut, and the distance
              between them is the leverage working for or against you. Watch both
              numbers side by side and negative leverage stops being a hidden
              trap.
            </p>

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
              Leverage is not a tailwind you switch on; it is a multiplier whose
              sign you have to check. Compare the cap rate to the loan constant —
              not the interest rate — and you know immediately which way it
              cuts. When the cap rate is higher, borrowing stretches a good
              return into a better one. When it is lower, as it is across most of
              the 2026 residential market, every dollar of debt earns less than
              it costs and your cash-on-cash sinks below the unlevered yield —
              even on deals that still show positive cash flow and still clear a
              DSCR lender. The fix is never &quot;more leverage&quot;; it is a
              wider spread, or a clear-eyed decision to accept the gap for
              paydown and appreciation. The full{" "}
              <Link href="/" className="text-primary font-semibold hover:underline">
                TrueCap analyzer
              </Link>{" "}
              runs cap rate, loan constant, cash-on-cash, and DSCR off the same
              inputs, so the moment a deal tips into negative leverage you see it
              on screen — before you wire the down payment, not after. None of
              this is investment advice; run your own numbers against your own
              terms before you buy.
            </p>
          </div>
        </article>
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
