/**
 * Backlog post — "What is a good DSCR for a rental property?" (2026-07-18)
 *
 * Targets the question SERP:
 *   - "what is a good dscr for a rental property"
 *   - "what is a good dscr"
 *   - "is 1.25 dscr good"
 *   - "dscr requirements rental property"
 *
 * The SERP is dominated by DSCR-loan lenders doing lead-gen. This post
 * owns the investor-analysis angle instead: what 1.25 actually means
 * for YOUR offer price, with a max-loan-at-1.25 worked example and the
 * lender-DSCR (rent/PITIA) vs investor-DSCR (NOI/debt service)
 * distinction. Complements /tools/dscr-calculator (computational),
 * /blog/how-to-calculate-dscr (formula how-to), and
 * /blog/dscr-loans-explained (loan product).
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

const SLUG = "what-is-a-good-dscr";
const TITLE = "What is a good DSCR for a rental property? (And what 1.25 means for your offer)";
// SERP-facing title (metadata/og only): kept ≤50 chars so the root
// layout's "%s | TrueCap" template stays inside the ~60-char SERP
// window. The on-page <h1> keeps the longer editorial TITLE.
const SERP_TITLE = "What is a good DSCR for a rental property? (2026)";
const DESCRIPTION =
  "1.25 is a common lender screen, not an investor guarantee. DSCR bands explained, plus worked examples for loan size and a target-dependent Offer Ceiling.";
const PUBLISHED_AT = "2026-07-18";
const MODIFIED_AT = "2026-08-25";
const READING_TIME_MIN = 10;

export const metadata: Metadata = {
  title: SERP_TITLE,
  description: DESCRIPTION,
  keywords: [
    "what is a good dscr",
    "good dscr for rental property",
    "is 1.25 dscr good",
    "dscr requirements rental property",
    "minimum dscr for investment property",
    "dscr 1.25 meaning",
    "debt service coverage ratio benchmarks",
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
    q: "What is a good DSCR for a rental property?",
    a: "1.25 or higher is the standard benchmark — the property's net operating income covers its annual debt payments 1.25 times over, leaving a 25% cushion. 1.0-1.25 means the property covers its debt but with thin margin; below 1.0 means the property loses money every month before you even think about capital expenditures. Above 1.5 is strong and usually reflects a high-yield market, a large down payment, or both.",
  },
  {
    q: "Is a DSCR of 1.0 good?",
    a: "No — 1.0 is break-even, not good. At exactly 1.0, NOI equals debt service, so one vacant month, one furnace repair, or one insurance premium hike pushes the property into negative cash flow. Most investors treat 1.0-1.15 as a 'yellow zone': acceptable only with a specific plan to raise rents or refinance, never as a steady state.",
  },
  {
    q: "What DSCR do lenders require in 2026?",
    a: "Requirements vary by lender, program, borrower, property, state, and date. Ask for the current written DSCR formula, minimum, rent evidence, leverage, pricing, reserves, credit, entity, and documentation rules. Conventional underwriting also varies and can consider income, assets, liabilities, credit, property, and program-specific rental treatment.",
  },
  {
    q: "How do lenders calculate DSCR differently from investors?",
    a: "DSCR lenders typically divide gross monthly rent by PITIA (principal, interest, taxes, insurance, association dues). Investors should divide NOI — rent minus vacancy, maintenance, management, and reserves — by annual debt service. The lender version ignores most operating expenses, so a property can score 1.5 with the lender while its true NOI-based DSCR sits near 1.1. Always compute both.",
  },
  {
    q: "Can a DSCR be too high?",
    a: "Not in a risk sense — a 2.0+ DSCR property is very safe from a debt-coverage standpoint. But an unusually high DSCR can signal under-leverage: if a big down payment is what's producing the ratio, your cash-on-cash return may be lower than deploying that equity across two properties. It can also flag a high-yield, higher-risk market where lenders demand the extra cushion for a reason.",
  },
  {
    q: "What is the DSCR on a cash purchase?",
    a: "Undefined — with no loan there's no debt service, so the ratio has no denominator. Analysis tools (TrueCap included) report DSCR as N/A on cash deals rather than showing a misleading number. For a cash purchase, judge the deal on cap rate and cash-on-cash return instead.",
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
    // Author points at the /about Person entity (E-E-A-T anchor @id).
    author: { "@type": "Person", "@id": `${siteUrl}/about#morgan`, name: "Morgan Page", url: `${siteUrl}/about` },
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
            Google &ldquo;what is a good <Link href="/glossary/dscr" className="text-primary font-semibold hover:underline">DSCR</Link>&rdquo; and nearly every result
            is a lender trying to sell you a DSCR loan. They&apos;ll tell you
            the magic number is 1.25, hand you a rate quote form, and stop
            there. That answer isn&apos;t wrong — it&apos;s just the
            lender&apos;s half of the story. The investor&apos;s half is what
            1.25 actually does to your deal: it caps how much you can borrow,
            which caps how much you can pay for the property. This post covers
            both halves, with the worked math.
          </p>

          <h2 className="text-2xl sm:text-3xl">The short answer</h2>
          <p>
            A good DSCR for a rental property is <strong>1.25 or higher</strong>.
            That means the property&apos;s net operating income covers its
            annual loan payments 1.25 times over — a 25% cushion between what
            the property earns and what it owes. Between 1.0 and 1.25 the
            property covers its debt with little margin for error. Below 1.0,
            the property doesn&apos;t earn enough to pay its own mortgage, and
            you make up the difference from your paycheck every month.
          </p>
          <div className="not-prose overflow-x-auto rounded-xl border border-border bg-card my-6">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left p-3 font-bold text-foreground">DSCR band</th>
                  <th className="text-left p-3 font-bold text-foreground">What it means for you</th>
                  <th className="text-left p-3 font-bold text-foreground">What it means to a lender</th>
                </tr>
              </thead>
              <tbody className="[&_td]:p-3 [&_td]:border-b [&_td]:border-border [&_tr:last-child_td]:border-0">
                <tr><td className="font-mono">Below 1.0</td><td className="text-muted-foreground">Modeled income is below modeled debt service under this formula</td><td className="text-muted-foreground">Program-specific; request written requirements</td></tr>
                <tr><td className="font-mono">1.0 – 1.15</td><td className="text-muted-foreground">Thin modeled coverage; stress vacancy and expenses</td><td className="text-muted-foreground">Program-specific; request written requirements</td></tr>
                <tr><td className="font-mono">1.15 – 1.25</td><td className="text-muted-foreground">Some modeled cushion; test property downside</td><td className="text-muted-foreground">Program-specific; request written requirements</td></tr>
                <tr><td className="font-mono">1.25 – 1.50</td><td className="text-muted-foreground">Larger modeled cushion under this formula</td><td className="text-muted-foreground">Does not establish approval, pricing, or leverage</td></tr>
                <tr><td className="font-mono">1.50+</td><td className="text-muted-foreground">Higher modeled coverage; verify every input</td><td className="text-muted-foreground">Does not establish approval, pricing, or leverage</td></tr>
              </tbody>
            </table>
          </div>
          <p>
            The 1.25 convention isn&apos;t arbitrary. It&apos;s roughly the
            cushion that lets a property absorb a vacant month, a repair bill,
            and a tax reassessment in the same year without missing a mortgage
            payment. Lenders converged on it across decades of commercial
            underwriting because portfolios above 1.25 rarely default and
            portfolios below 1.1 default often.
          </p>
          <p>
            How hard 1.25 is to clear also depends on where you&apos;re
            buying. Higher cap-rate metros like{" "}
            <Link href="/markets/cleveland" className="text-primary font-semibold hover:underline">
              Cleveland
            </Link>{" "}
            produce more NOI per dollar of purchase price, so plenty of
            at-asking deals clear 1.25 without touching the down payment. In
            a low cap-rate coastal metro, the same ratio usually needs the
            leverage lever below.
          </p>

          <h2 className="text-2xl sm:text-3xl">A 60-second refresher on the formula</h2>
          <p>
            DSCR is <Link href="/glossary/noi" className="text-primary font-semibold hover:underline">net operating income</Link> divided by annual debt service:
          </p>
          <div className="bg-card border border-border rounded-xl p-5 sm:p-6 my-4 text-center">
            <div className="text-sm sm:text-base font-mono">
              <strong>DSCR = NOI ÷ annual debt service</strong>
            </div>
            <div className="text-xs sm:text-sm text-muted-foreground mt-2">
              NOI = gross rent − vacancy − operating expenses (before the mortgage)
            </div>
          </div>
          <p>
            If the property has no mortgage, there&apos;s no denominator —
            DSCR on a cash purchase is undefined, and honest tools report it
            as N/A rather than pretending it&apos;s infinite. For the full
            walkthrough of the formula, including which expenses belong in
            NOI, see our{" "}
            <Link href="/blog/how-to-calculate-dscr" className="text-primary font-semibold hover:underline">
              guide to calculating DSCR
            </Link>. Here we&apos;ll focus on what the number means once you
            have it.
          </p>

          <h2 className="text-2xl sm:text-3xl">Worked example: a $250K duplex at 7% with 25% down</h2>
          <p>
            Say you&apos;re underwriting a $250,000 duplex renting for $1,300
            per unit — $2,600/month, $31,200/year gross. You put 25% down
            ($62,500) and finance $187,500 at 7% over 30 years. The monthly
            principal-and-interest payment is <strong>$1,247</strong>, or{" "}
            <strong>$14,969/year</strong> in debt service. (Check any loan
            with our <Link href="/tools/mortgage-payment-calculator" className="text-primary font-semibold hover:underline">mortgage payment calculator</Link>.)
          </p>
          <p>Now build NOI with honest expense assumptions:</p>
          <ul>
            <li>Gross rent: <strong>$31,200</strong></li>
            <li><Link href="/glossary/vacancy" className="text-primary font-semibold hover:underline">Vacancy</Link> (8%): −$2,496</li>
            <li>Property taxes (1.5% of price): −$3,750</li>
            <li>Insurance: −$1,600</li>
            <li>Repairs &amp; maintenance (8%): −$2,496</li>
            <li>CapEx reserve (5%): −$1,560</li>
            <li>Property management (8%): −$2,496</li>
          </ul>
          <p>
            Total operating expenses: $14,398. NOI:{" "}
            <strong>$16,802/year</strong> — about $1,400/month.
          </p>
          <div className="bg-card border border-border rounded-xl p-5 sm:p-6 my-4 text-center">
            <div className="text-sm sm:text-base font-mono">
              DSCR = $16,802 ÷ $14,969 = <strong>1.12</strong>
            </div>
          </div>
          <p>
            The property covers its mortgage — barely. At 1.12, roughly $153
            of monthly cash flow stands between you and feeding the deal. It
            clears break-even but fails the 1.25 bar, which puts it squarely
            in the &ldquo;thin but workable&rdquo; band. So what would it take
            to make this deal pass? That&apos;s the question the lender
            SERP never answers.
          </p>

          <h2 className="text-2xl sm:text-3xl">What 1.25 means for your loan: the max-loan calculation</h2>
          <p>
            Flip the formula around. Instead of asking &ldquo;what&apos;s my
            DSCR at this loan amount,&rdquo; ask &ldquo;what loan amount gets
            me to 1.25?&rdquo; Divide NOI by the target ratio:
          </p>
          <div className="bg-card border border-border rounded-xl p-5 sm:p-6 my-4 text-center">
            <div className="text-sm sm:text-base font-mono">
              Max debt service = $16,802 ÷ 1.25 = <strong>$13,442/year</strong> ($1,120/mo)
            </div>
          </div>
          <p>
            At 7% over 30 years, every $100,000 borrowed costs $665.30/month.
            A $1,120 payment therefore supports a loan of about{" "}
            <strong>$168,400</strong> — not the $187,500 you planned to
            borrow. To buy this duplex at $250,000 with a 1.25 DSCR,
            you&apos;d need roughly <strong>$81,600 down (32.7%)</strong>{" "}
            instead of $62,500 (25%). That extra $19,100 of equity is the
            real-world price of the cushion.
          </p>

          <h2 className="text-2xl sm:text-3xl">What 1.25 means for your offer price</h2>
          <p>
            Or hold the down payment at 25% and solve for price instead. At
            25% down, the loan is 75% of the purchase price, and at 7%/30yr
            that loan costs about 5.99% of the purchase price in annual debt
            service. Setting that equal to the $13,442 maximum:
          </p>
          <div className="bg-card border border-border rounded-xl p-5 sm:p-6 my-4 text-center">
            <div className="text-sm sm:text-base font-mono">
              Max price = $13,442 ÷ 0.0599 ≈ <strong>$224,500</strong>
            </div>
          </div>
          <p>
            To hit a modeled 1.25 DSCR with 25% down, the Offer Ceiling on this
            duplex is about <strong>$224,500 — roughly $25,500 (10%) below
            asking</strong>. (A lower price also trims property taxes
            slightly, which nudges NOI up — so $224,500 is mildly
            conservative.) This is the negotiating math that a DSCR target
            actually gives you: not a pass/fail grade on the listing, but a
            defensible ceiling on what you can pay. Our{" "}
            <Link href="/tools/dscr-calculator" className="text-primary font-semibold hover:underline">
              free DSCR calculator
            </Link>{" "}
            runs this in both directions — DSCR at your numbers, and the
            max loan at any target ratio.
          </p>

          <h2 className="text-2xl sm:text-3xl">The down-payment lever: how each 5% moves DSCR</h2>
          <p>
            Price and loan size are two handles on the same ratio. Hold the
            $250,000 price fixed and walk the down payment up in 5-point
            steps, and you can watch the duplex climb toward 1.25. Same NOI
            ($16,802), same 7% / 30-year loan — only the amount borrowed
            changes:
          </p>
          <div className="not-prose overflow-x-auto rounded-xl border border-border bg-card my-6">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left p-3 font-bold text-foreground">Down payment</th>
                  <th className="text-left p-3 font-bold text-foreground">Loan amount</th>
                  <th className="text-left p-3 font-bold text-foreground">Annual debt service</th>
                  <th className="text-left p-3 font-bold text-foreground">DSCR</th>
                </tr>
              </thead>
              <tbody className="[&_td]:p-3 [&_td]:border-b [&_td]:border-border [&_tr:last-child_td]:border-0 [&_td]:font-mono">
                <tr><td>20% ($50,000)</td><td>$200,000</td><td>$15,967</td><td>1.05</td></tr>
                <tr><td>25% ($62,500)</td><td>$187,500</td><td>$14,969</td><td>1.12</td></tr>
                <tr><td>30% ($75,000)</td><td>$175,000</td><td>$13,971</td><td>1.20</td></tr>
                <tr><td>35% ($87,500)</td><td>$162,500</td><td>$12,973</td><td>1.29</td></tr>
              </tbody>
            </table>
          </div>
          <p>
            Every extra 5% down buys roughly <strong>0.07–0.08 of DSCR</strong>{" "}
            here, and the 1.25 bar falls between the 30% and 35% rows — the
            same ~33% down the max-loan math landed on. But &ldquo;just put
            more down&rdquo; isn&apos;t free. The $25,000 that moves you from
            25% to 35% is cash that now sits in the walls earning the
            property&apos;s return instead of yours: it lifts DSCR while it
            drags your{" "}
            <Link href="/tools/cash-on-cash-calculator" className="text-primary font-semibold hover:underline">
              cash-on-cash return
            </Link>, and when the loan constant tops the cap rate you can buy
            your way into{" "}
            <Link href="/blog/negative-leverage-real-estate" className="text-primary font-semibold hover:underline">
              negative leverage
            </Link>{" "}
            doing it. The right amount down is the one that clears the
            lender&apos;s bar with a little room to spare — not the maximum you
            can scrape together.
          </p>

          <h2 className="text-2xl sm:text-3xl">The lender&apos;s DSCR is not your DSCR</h2>
          <p>
            Here&apos;s the trap in taking the lender&apos;s number at face
            value. Some DSCR programs use a rent-to-PITIA calculation
            rather than the investor&apos;s NOI-based ratio. A common form is:
          </p>
          <div className="bg-card border border-border rounded-xl p-5 sm:p-6 my-4 text-center">
            <div className="text-sm sm:text-base font-mono">
              <strong>Lender DSCR = gross monthly rent ÷ PITIA</strong>
            </div>
            <div className="text-xs sm:text-sm text-muted-foreground mt-2">
              PITIA = principal + interest + taxes + insurance + association dues
            </div>
          </div>
          <p>
            On our duplex: PITIA is $1,247 (P&amp;I) + $313 (taxes) + $133
            (insurance) = $1,693. Lender DSCR = $2,600 ÷ $1,693 ={" "}
            <strong>1.54</strong>. The same hypothetical property scores
            1.12 under the article&apos;s NOI-based operating scenario.
            The difference comes from the selected numerator and denominator;
            confirm the actual program&apos;s treatment rather than assuming it
            excludes every operating item.
          </p>
          <p>
            This is why &ldquo;the lender approved it&rdquo; and &ldquo;the
            deal is good&rdquo; are different claims. The lender is
            underwriting their downside (foreclosure recovery), not your
            return. A program ratio can look stronger than an operating
            ratio when the formulas use different inputs, so approval should
            not be treated as validation of the property&apos;s cash flow. If
            you&apos;re comparing loan products themselves, our{" "}
            <Link href="/blog/dscr-loans-explained" className="text-primary font-semibold hover:underline">
              DSCR loans guide
            </Link>{" "}
            covers rates, LTV tiers, and when they beat conventional
            financing.
          </p>

          <h2 className="text-2xl sm:text-3xl">Stress-test the ratio, not just the snapshot</h2>
          <p>
            A DSCR is a photograph of one set of assumptions. Before trusting
            it, poke it:
          </p>
          <ul>
            <li>
              <strong>Rent −10%:</strong> our duplex&apos;s NOI drops to about
              $14,587 and DSCR falls to <strong>0.97</strong> — under water.
              A deal that starts at 1.12 has an 8% rent cushion before it
              stops covering its own mortgage (break-even rent here is about
              $2,385/month).
            </li>
            <li>
              <strong>Rate +1 point:</strong> at 8%, the same $187,500 loan
              costs $1,376/month and the DSCR at asking drops from 1.12 to{" "}
              <strong>1.02</strong>. If you&apos;re buying with a
              rate-and-term refinance thesis, run the exit rate, not the
              teaser.
            </li>
            <li>
              <strong>Taxes reassessed:</strong> many counties reassess on
              sale. If taxes jump from the seller&apos;s $2,800 to your
              $3,750, that alone moves DSCR by about 0.06 on this deal.
            </li>
          </ul>
          <p>
            A good DSCR isn&apos;t just 1.25 today — it&apos;s a ratio that
            stays above 1.0 in the bad year. That&apos;s the standard
            commercial underwriters actually apply, and it&apos;s free to
            apply yourself with a{" "}
            <Link href="/tools/rental-cash-flow-calculator" className="text-primary font-semibold hover:underline">
              cash flow calculator
            </Link>{" "}
            and ten minutes of pessimism.
          </p>

          <h2 className="text-2xl sm:text-3xl">When a sub-1.25 DSCR is still a buy</h2>
          <p>
            The 1.25 bar is a lending convention, not a law of investing.
            Legitimate reasons to buy below it:
          </p>
          <ul>
            <li>
              <strong>A concrete rent-growth path.</strong> Inherited tenants
              at $1,050 against a $1,300 market rate is a 1.12-today,
              1.35-at-turnover story. Underwrite the turnover cost and
              timeline, not just the destination.
            </li>
            <li>
              <strong>House hacking.</strong> Owner-occupants measure the
              deal against their current rent, not against a DSCR. A duplex
              that scores 0.9 as a pure rental can still cut your housing
              cost in half.
            </li>
            <li>
              <strong>A value-add you control.</strong> BRRRR and rehab deals
              are priced on the stabilized DSCR, not the as-is one. Just be
              honest about which number the lender will see at refinance.
            </li>
          </ul>
          <p>
            What&apos;s not a reason: hoping. A 1.05 DSCR with no story is a
            property that pays its mortgage only when nothing goes wrong —
            and something always goes wrong.
          </p>

          <h2 className="text-2xl sm:text-3xl">Check your own deal</h2>
          <p>
            Type in a price, rent, rate, and down payment, and TrueCap
            computes the DSCR alongside cash flow, cap rate, and
            cash-on-cash — then stress-tests the whole underwrite and gives
            you a selected-rule fit and secondary Screening Index. Takes about 60 seconds.
          </p>

          <div className="not-prose">
            <Link
              href="/"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-3 rounded-xl font-bold hover:opacity-95 transition-opacity"
            >
              <Calculator className="w-4 h-4" />
              Analyze a real deal in 60 seconds
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>

          <p>
            Or, if you just want the standalone ratio:{" "}
            <Link href="/tools/dscr-calculator" className="text-primary font-semibold hover:underline">
              free DSCR calculator →
            </Link>
          </p>

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
            Related: <Link href="/blog/how-to-calculate-dscr" className="font-bold text-foreground hover:underline">How to calculate DSCR →</Link>{" "}
            ·{" "}
            <Link href="/blog/dscr-loans-explained" className="font-bold text-foreground hover:underline">DSCR loans explained →</Link>
          </p>
        </footer>
      </main>
      <SiteFooter />
      <ScrollDepthTracker />
      <BlogStickyCta />
    </div>
  );
}
