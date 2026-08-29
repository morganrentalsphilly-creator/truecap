/**
 * Blog post: The BRRRR method — complete numbers walkthrough.
 *
 * Targets queries: "BRRRR method", "BRRRR method explained", "BRRRR
 * real estate", "BRRRR refinance LTV", "how much can you cash out
 * BRRRR", "BRRRR method example with numbers", "is BRRRR dead 2026".
 */

import type { Metadata } from "next";
import Link from "next/link";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SiteFooter } from "@/components/marketing/site-footer";
import { BlogByline } from "@/components/marketing/blog-byline";
import { BlogStickyCta } from "@/components/marketing/blog-sticky-cta";
import { RelatedBlogPosts } from "@/components/marketing/related-blog-posts";
import { NewsletterSignup } from "@/components/marketing/newsletter-signup";
import { getSiteUrl } from "@/lib/site-url";

const SLUG = "brrrr-method-explained";
const TITLE = "The BRRRR method in 2026: the complete numbers walkthrough";
// SERP-facing title (metadata/og only): kept ≤50 chars so the root
// layout's "%s | TrueCap" template stays inside the ~60-char SERP
// window. The on-page <h1> keeps the longer editorial TITLE.
const SERP_TITLE = "The BRRRR method in 2026: numbers walkthrough";
const DESCRIPTION =
  "An illustrative BRRRR walkthrough using stated financing assumptions. LTV, seasoning, DSCR, credit, reserves, appraisal, and approval vary by program and lender.";
const PUBLISHED_AT = "2026-06-07";
const MODIFIED_AT = "2026-08-15";
const READING_TIME = 11;

export const metadata: Metadata = {
  title: SERP_TITLE,
  description: DESCRIPTION,
  keywords: [
    "BRRRR method",
    "BRRRR method explained",
    "BRRRR real estate",
    "BRRRR refinance LTV",
    "BRRRR method example",
    "how much can you cash out BRRRR",
    "BRRRR strategy 2026",
    "buy rehab rent refinance repeat",
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
    q: "How much can you cash out on a BRRRR refinance in 2026?",
    a: "There is no universal BRRRR cash-out ceiling. This article illustrates a program permitting 75% of lender-accepted appraised value and using a 1.25 rent-to-PITIA threshold. Actual leverage, value basis, coverage calculation, loan amount, and approval depend on the selected program and full underwriting; verify them in a current written lender quote.",
  },
  {
    q: "How long do you have to wait before the cash-out refinance (seasoning)?",
    a: "Seasoning and the eligible value basis vary by loan program, transaction history, property type, and lender. Conventional, delayed-financing, portfolio, and DSCR rules are not interchangeable. Before relying on a refinance timeline, ask the lender to confirm in writing the required ownership period, value basis, documentation, and maximum leverage for this property.",
  },
  {
    q: "Do you need a hard money loan to BRRRR?",
    a: "No. Cash or short-term financing may fund a BRRRR purchase. The figures below use hypothetical bridge-loan terms; actual leverage, rate, points, draw rules, fees, and total cost vary. Compare written term sheets, include every financing cost in the all-in basis, and consider the opportunity cost of tying up cash.",
  },
  {
    q: "Is the BRRRR method dead in 2026?",
    a: "BRRRR outcomes depend on purchase basis, rehab execution, lender-accepted value, available refinance terms, and stabilized cash flow. Stress-test each deal using a current written refinance quote, conservative appraisal and rent assumptions, and delayed, lower-value, lower-leverage, and no-refinance scenarios. An appraisal or refinance should never be assumed to rescue a thin deal.",
  },
  {
    q: "What DSCR and credit score do BRRRR refinance lenders require?",
    a: "There is no single DSCR-loan credit-score requirement. Minimum score, coverage, leverage, reserves, pricing, documentation, and exceptions vary by lender and file. Ask for the current program matrix and a property-specific written quote; meeting one threshold does not guarantee approval.",
  },
];

export default function BrrrrMethodPost() {
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
    // Author points at the /about Person entity (E-E-A-T anchor @id).
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
          <BlogByline />
          <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
            BRRRR — buy, rehab, rent, refinance, repeat — is the strategy of
            recycling one pile of capital through multiple rentals instead of
            saving a fresh down payment for each. The concept gets explained
            everywhere. The numbers rarely do. This is the full walkthrough of
            one hypothetical deal, start to finish, using stated financing
            assumptions. Actual lender terms and approval can differ.
          </p>
        </header>

        <div className="prose prose-neutral max-w-none text-foreground space-y-6 leading-relaxed">
          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
            The five steps in one paragraph
          </h2>
          <p>
            You <strong>buy</strong> a distressed property below market value,{" "}
            <strong>rehab</strong> it to rent-ready condition,{" "}
            <strong>rent</strong> it to a tenant, then{" "}
            <strong>seek a refinance</strong> that may use a lender-accepted
            appraised value and may return part of your original cash — then
            <strong>repeat</strong> only if the refinance closes as planned. Done
            right, you end up owning a stabilized rental with very little of
            your own money left in it. Done wrong, you end up with an
            over-leveraged property that loses money every month. The
            difference is arithmetic, so let&apos;s do the arithmetic.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
            The worked example: a $145k single-family
          </h2>
          <p>
            A 3BR/1BA single-family in a working-class neighborhood, bought
            off-market from a tired landlord:
          </p>
          <ul>
            <li>
              <strong>Purchase price:</strong> $145,000 (comparable renovated
              homes sell for ~$245,000)
            </li>
            <li>
              <strong>Rehab budget:</strong> $40,000 — kitchen, bath, paint,
              flooring, one HVAC replacement. Estimate yours with the{" "}
              <Link
                href="/tools/rehab-cost-estimator"
                className="text-primary font-semibold hover:underline"
              >
                rehab cost estimator
              </Link>{" "}
              and read{" "}
              <Link
                href="/blog/how-to-estimate-rehab-costs"
                className="text-primary font-semibold hover:underline"
              >
                how to estimate rehab costs
              </Link>{" "}
              before trusting any contractor&apos;s first quote.
            </li>
            <li>
              <strong>Closing + holding costs:</strong> $10,000 — purchase
              closing, 7 months of taxes, insurance, utilities, and (if you
              used hard money) interest and points.
            </li>
            <li>
              <strong>All-in basis:</strong> $195,000
            </li>
            <li>
              <strong>Modeled after-repair value (ARV):</strong> $245,000,
              based on preliminary renovated comps; the lender&apos;s appraisal may differ
            </li>
            <li>
              <strong>Post-rehab rent:</strong> $2,100/month
            </li>
          </ul>
          <p>
            The illustration models $50,000 of value ($245,000 assumed ARV
            minus $195,000 all-in). That is estimated equity, not a guaranteed
            appraisal or refinance proceed. The remaining sections show what
            the stated assumptions would imply.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
            Financing the buy and the rehab
          </h2>
          <p>
            The example above assumes cash. For a separate financing
            illustration, assume a private bridge lender offers 85% of purchase
            price plus 100% of rehab in draws, at 11% interest-only with 2
            points. These are hypothetical inputs, not current market terms or
            an approval; actual leverage, draw rules, fees, and recourse vary.
          </p>
          <p>
            Under those assumptions, the modeled lender advance is $123,250 of the purchase and the
            $40,000 rehab in draws. Two points on the ~$163,000 total
            commitment is about $3,300 up front. Interest-only payments start
            around $1,080/month and climb toward $1,430 as draws fund — call
            it $8,500-9,000 over a 7-month hold. Your actual cash into the
            deal is the $21,750 down payment, purchase closing costs, points,
            and the monthly carry: roughly <strong>$35,000-38,000</strong>{" "}
            instead of $195,000.
          </p>
          <p>
            The catch: the points and interest don&apos;t disappear — they add
            $11,000-12,000 to your all-in basis, which comes straight out of
            your cash-out at the end. Hard money buys you velocity with less
            capital; it does not make the deal better. If the spread only
            works on the cash version, it doesn&apos;t work.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
            The refinance is the whole game
          </h2>
          <p>
            This example focuses on two common constraints — seasoning and LTV
            — but approval and loan size can also depend on credit, reserves,
            borrower documentation, appraisal, property eligibility, DSCR or
            DTI, insurance, title, and lender overlays.
          </p>
          <p>
            <strong>Seasoning.</strong> Required ownership period and eligible
            value basis vary by program, transaction history, property, and
            lender. Conventional, delayed-financing, portfolio, and{" "}
            <Link
              href="/blog/dscr-loans-explained"
              className="text-primary font-semibold hover:underline"
            >
              DSCR
            </Link>{" "}
            rules are not interchangeable. Obtain written confirmation of the
            timeline, documentation, value basis, and leverage before relying
            on a refinance exit.
          </p>
          <p>
            <strong>Modeled LTV constraint.</strong> For this example only,
            assume the selected program permits 75% LTV on a lender-accepted
            $245,000 appraisal. That produces a modeled gross loan of{" "}
            <strong>$183,750</strong> before other underwriting constraints,
            payoff, fees, reserves, and closing costs.
          </p>
          <p>
            But the LTV ceiling is only the first constraint. The second one is
            the one that surprises people.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
            The second modeled constraint: property coverage
          </h2>
          <p>
            Many DSCR programs compare eligible rent with a lender-defined
            housing-payment measure, but rent treatment, PITIA components, and
            minimum coverage vary. This illustration assumes{" "}
            <strong>rent ÷ PITIA</strong>, a 1.25 threshold, and a hypothetical
            7.25% 30-year rate on the full $183,750:
          </p>
          <ul>
            <li>
              <strong>P&amp;I:</strong> ~$1,253/month (check any loan with the{" "}
              <Link
                href="/tools/mortgage-payment-calculator"
                className="text-primary font-semibold hover:underline"
              >
                mortgage payment calculator
              </Link>
              )
            </li>
            <li>
              <strong>Taxes + insurance:</strong> $230 + $100 = $330/month
            </li>
            <li>
              <strong>PITIA:</strong> $1,583/month
            </li>
            <li>
              <strong>DSCR:</strong> $2,100 ÷ $1,583 = <strong>1.33</strong> —
              exceeds the illustration&apos;s 1.25 coverage threshold
            </li>
          </ul>
          <p>
            Under these assumptions, the modeled ratio exceeds the stated
            threshold; that does not establish eligibility or approval. If rent
            were $1,800 instead of $2,100, a program using a 1.25-DSCR
            lender would cap PITIA at $1,440, which backs into a loan of
            roughly $162,000 — about 66% LTV. The DSCR floor, not the LTV
            ceiling, would decide your cash-out. Run your own deal through the{" "}
            <Link
              href="/#main"
              className="text-primary font-semibold hover:underline"
            >
              TrueCap analyzer
            </Link>{" "}
            before you assume the example&apos;s leverage, then verify the lender&apos;s
            actual formula and full program matrix.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
            How the deal lands: max cash-out vs one notch down
          </h2>
          <p>
            <strong>Illustrative Option A — approved at 75% ($183,750 gross principal):</strong> The model returns
            out $183,750 against $195,000 all-in, leaving{" "}
            <strong>$11,250</strong> in the deal while holding $61,250 of
            equity. But check the monthly: $2,100 rent minus $1,583 PITIA minus
            8% vacancy ($168), 10% maintenance/capex ($210), and 8% property
            management ($168) is <strong>−$29/month</strong>. With
            professional management, max leverage turns this deal slightly
            negative. Self-managed it makes about $139/month.
          </p>
          <p>
            <strong>Illustrative Option B — approved at 70% ($171,500 gross principal):</strong> P&amp;I
            drops to ~$1,170, PITIA to $1,500. Same expense assumptions:{" "}
            <strong>+$54/month with PM, +$222 self-managed</strong>. You leave
            $23,500 in the deal — and on the self-managed numbers that&apos;s
            roughly an 11%{" "}
            <Link
              href="/#main"
              className="text-primary font-semibold hover:underline"
            >
              cash-on-cash return
            </Link>{" "}
            on the capital still inside, plus the equity and debt paydown.
          </p>
          <p>
            Notice the trap in the comparison: Option A shows a{" "}
            <em>higher</em> cash-on-cash percentage (a small cash flow divided
            by a tiny denominator), which is exactly how max-leverage BRRRR
            deals look great in a spreadsheet while being one vacancy away from
            feeding the property out of pocket. The percentage is not the
            point. The margin of safety is.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
            The example&apos;s 75% assumption as a purchase ceiling
          </h2>
          <p>
            If an investor chooses an &quot;all-in at or below 75% of
            ARV&quot; target for this scenario, its modeled purchase-price formula is:
          </p>
          <p>
            <strong>
              Max purchase = (ARV × 0.75) − rehab − closing/holding costs
            </strong>
          </p>
          <p>
            For our deal: $183,750 − $40,000 − $10,000 ={" "}
            <strong>$133,750</strong>. We paid $145,000, which is why $11,250
            stayed in the deal even at max leverage. That&apos;s a fine
            outcome — leaving five figures in a cash-flowing rental with $60k+
            of equity is not failure. But know the number before you offer,
            because every dollar you pay above the ceiling is a dollar that
            stays trapped.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
            The five ways BRRRR breaks
          </h2>
          <p>
            <strong>1. The appraisal misses.</strong> Under the example&apos;s assumed 75% LTV, every
            $10,000 the appraisal comes in below your ARV estimate is $7,500
            less cash out. A $230,000 appraisal instead of $245,000 doubles the
            capital left in our example deal. Use sold renovated comps, not
            list prices, and be honest about condition deltas.
          </p>
          <p>
            <strong>2. The rehab overruns.</strong> A 30% overrun ($40,000 →
            $52,000) pushes all-in to $207,000 and more than doubles the
            trapped capital. Budget a 25% contingency on day one — overruns are
            the norm on first-time rehabs, not the exception.
          </p>
          <p>
            <strong>3. Rates move during your rehab window.</strong> You
            don&apos;t lock the refi rate at purchase. If rates rise 0.5%
            during a 7-month rehab + seasoning window, P&amp;I on the full
            loan goes up roughly $63/month — which wipes out the entire Option
            B cash-flow margin with management. This example tests a rate half
            a point higher; use the current lender quote and additional stresses
            appropriate to your risk.
          </p>
          <p>
            <strong>4. The DSCR constraint cuts the modeled loan.</strong> A
            lender&apos;s coverage test may constrain the loan below the stated LTV.
            The applicable formula and result vary by program.
          </p>
          <p>
            <strong>5. The deal cash flows negative at max leverage and you
            take the cash anyway.</strong> The strategy&apos;s siren song is
            &quot;infinite return&quot; — all capital out, return on zero
            invested. Chasing it produces portfolios of properties that each
            lose $50-150/month and one roof replacement from a forced sale.
            If the deal only works with zero left in and self-management
            forever, it doesn&apos;t work.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
            The repeat: what capital recycling actually looks like
          </h2>
          <p>
            The fifth R depends on each earlier refinance occurring, so treat
            this as a hypothetical projection. Say you start with $60,000 and use the
            hard-money structure above, putting ~$36,000 of cash into each
            deal during the rehab phase. Cycle one takes 7-9 months
            (purchase through refinance), returns most of your cash at the
            refi, and leaves $11,000-24,000 of it in the stabilized property
            depending on which LTV you take.
          </p>
          <p>
            If every rehabilitation and refinance completes on the modeled
            schedule and terms, the projection completes roughly three cycles
            in 24-30 months. The modeled outcome is three stabilized rentals,
            $35,000-70,000 of your original
            capital converted into trapped-but-working equity, $150,000+ of
            created equity across the portfolio, and your remaining cash still
            liquid for cycle four. The same $60,000 deployed as a single 25%
            down payment buys exactly one turnkey property and then stops.
            That is the entire argument for BRRRR — and it only holds if every
            deal in the chain clears its target-dependent Offer Ceiling. One
            overpriced deal doesn&apos;t just underperform; it traps the
            capital that was supposed to fund the next cycle. Actual timing,
            appraisal, approval, proceeds, and portfolio outcome may differ.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
            Two tax notes worth knowing
          </h2>
          <p>
            <strong>Cash-out proceeds are not income.</strong> The $183,750
            you pull out at the refinance is loan principal, not taxable gain
            — you&apos;re borrowing against value, not selling it. This is one
            of the quiet advantages BRRRR has over flipping, where the same
            $50,000 spread would be taxed as ordinary income in the year of
            sale.
          </p>
          <p>
            <strong>Rehab costs are capitalized, not deducted.</strong> The
            $40,000 renovation isn&apos;t a year-one expense — it&apos;s added
            to your depreciable basis and recovered over 27.5 years (faster
            for appliances and some components via cost segregation). Repairs
            made <em>after</em> the property is in service follow the normal
            deduction rules — see the{" "}
            <Link
              href="/blog/rental-property-tax-deductions"
              className="text-primary font-semibold hover:underline"
            >
              rental property tax deductions guide
            </Link>{" "}
            for the full Schedule E breakdown.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
            BRRRR vs just buying a turnkey rental
          </h2>
          <p>
            With the same ~$50,000 of starting capital you could buy one
            turnkey rental with 25% down — or run the BRRRR above, finish with
            $11,000-24,000 left in the deal, and redeploy the rest into the
            next one. Over a few cycles that&apos;s the difference between
            owning two properties and owning four or five. The price you pay
            for that velocity: rehab execution risk, appraisal risk, rate risk
            during the hold, and a lot more of your time. BRRRR is a
            part-time job that pays in equity. Turnkey is a purchase. Neither
            is wrong — but only one of them should be attempted on a thin
            spread.
          </p>

          <p className="text-sm text-muted-foreground">
            General educational information, not a lender quote, appraisal, or
            approval. Verify current written rate, points, fees, credit,
            leverage, DSCR method, reserves, seasoning, value basis,
            documentation, property eligibility, recourse, and timing with
            both the acquisition and refinance lenders.
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
            Run your own BRRRR before you offer
          </h2>
          <p>
            Every number in this post is a knob, and the deal lives or dies on
            how they interact. The{" "}
            <Link
              href="/tools/rehab-cost-estimator"
              className="text-primary font-semibold hover:underline"
            >
              rehab cost estimator
            </Link>{" "}
            helps anchor one early-stage input. TrueCap&apos;s integrated BRRRR
            lifecycle model is not currently released; the core{" "}
            <Link href="/" className="text-primary font-semibold hover:underline">
              TrueCap analyzer
            </Link>{" "}
            stress-tests the stabilized rental afterward. Related reading:{" "}
            <Link
              href="/blog/how-to-refinance-a-rental-property"
              className="text-primary font-semibold hover:underline"
            >
              how to refinance a rental property
            </Link>
            ,{" "}
            <Link
              href="/blog/dscr-loans-explained"
              className="text-primary font-semibold hover:underline"
            >
              DSCR loans explained
            </Link>
            , and{" "}
            <Link
              href="/blog/how-to-estimate-rehab-costs"
              className="text-primary font-semibold hover:underline"
            >
              how to estimate rehab costs
            </Link>
            .
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
