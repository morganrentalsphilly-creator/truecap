/**
 * Blog post: How much down payment for an investment property.
 *
 * Targets queries: "down payment for investment property", "how much
 * down payment for a rental property", "investment property down
 * payment requirements", "15% vs 20% vs 25% down rental", "minimum
 * down payment investment property 2026", "how much down to buy a
 * rental".
 */

import type { Metadata } from "next";
import Link from "next/link";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SiteFooter } from "@/components/marketing/site-footer";
import { BlogStickyCta } from "@/components/marketing/blog-sticky-cta";
import { RelatedBlogPosts } from "@/components/marketing/related-blog-posts";
import { NewsletterSignup } from "@/components/marketing/newsletter-signup";
import { getSiteUrl } from "@/lib/site-url";

const SLUG = "how-much-down-payment-investment-property";
const TITLE =
  "How much down payment do you need for an investment property? (2026)";
const DESCRIPTION =
  "Conventional investment loans need 15% down on a single-family, 25% on 2–4 units. The full 2026 breakdown, worked cash-on-cash and DSCR math, and the house-hack shortcut.";
const PUBLISHED_AT = "2026-06-18";
const MODIFIED_AT = "2026-06-18";
const READING_TIME = 11;

export const metadata: Metadata = {
  title: `${TITLE} | TrueCap`,
  description: DESCRIPTION,
  keywords: [
    "down payment for investment property",
    "how much down payment for a rental property",
    "investment property down payment requirements 2026",
    "minimum down payment investment property",
    "15 vs 20 vs 25 percent down rental",
    "how much down to buy a rental property",
    "house hack down payment",
  ],
  alternates: { canonical: `/blog/${SLUG}` },
  openGraph: {
    title: TITLE,
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
    q: "How much down payment do you need for an investment property?",
    a: "For a conventional loan on a property you will not live in, plan on 15% down for a single-family rental and 25% down for a 2–4 unit building. On a $250,000 single-family that is $37,500; on a $250,000 duplex it is $62,500. The big exception is owner-occupancy: if you live in one unit, FHA lets you buy a 1–4 unit property with 3.5% down, and a VA-eligible buyer can do it with nothing down.",
  },
  {
    q: "Can you put 15% down on an investment property?",
    a: "Yes — but only on a one-unit conventional investment loan, and only if you are not living in it. Fannie Mae and Freddie Mac allow 85% loan-to-value on a single-family rental. You will pay a rate add-on for the low down payment, and unlike an owner-occupied loan there is no PMI option to bridge the gap, so 15% is a hard floor. Two-to-four-unit investment properties require 25% down regardless of credit.",
  },
  {
    q: "Is it better to put 20% or 25% down on a rental?",
    a: "It depends entirely on whether your borrowing cost is above or below the property's cap rate. At June 2026 investment-loan rates near 7.25%, the loan constant (annual debt service ÷ loan balance) runs about 8.2% — higher than a typical 6–7.5% cap rate. When the loan constant exceeds the cap rate you have negative leverage, and every extra borrowed dollar drags your cash-on-cash down. In that environment 25% down produces both a higher cash-on-cash return and a stronger DSCR than 20%. Run your own numbers before assuming less-down is better.",
  },
  {
    q: "How can I buy an investment property with little money down?",
    a: "The cleanest legal path is to house-hack: buy a 2–4 unit, live in one unit for a year, and use FHA (3.5% down) or a VA loan (0% down) to finance it. Other routes include partnering with someone who funds the down payment, seller financing, or tapping a HELOC on a property you already own for the down payment. Each adds cost or risk — a HELOC, for example, stacks a second monthly payment on top of the new mortgage.",
  },
  {
    q: "Do you pay PMI on an investment property?",
    a: "No. Private mortgage insurance is only offered on owner-occupied conventional loans with less than 20% down. Investment-property lenders do not offer it — that is precisely why the down-payment floor sits at 15–25% instead. If you live in the property and put down less than 20%, you will pay PMI (conventional) or MIP (FHA), which is a real monthly cost you have to underwrite.",
  },
];

export default function DownPaymentPost() {
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
              &quot;How much do I need to put down?&quot; is the first real question
              every new rental investor hits, and the internet&apos;s favorite answer —
              &quot;20%&quot; — is wrong more often than it&apos;s right. The honest answer
              depends on three things: whether you&apos;ll live in the property, how many
              units it has, and what loan you use. This guide walks the full 2026 menu,
              with the worked cash-on-cash and DSCR math that shows why putting <em>more</em>{" "}
              down can actually be the higher-return move at today&apos;s rates.
            </p>
          </header>

          <div className="prose prose-neutral max-w-none text-foreground space-y-6 leading-relaxed">
            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              The short answer
            </h2>
            <p>
              If you are buying a property you will <strong>not</strong> live in, a
              conventional loan requires <strong>15% down on a single-family rental</strong>{" "}
              and <strong>25% down on a 2–4 unit building</strong>. Those are Fannie Mae
              and Freddie Mac floors, and they don&apos;t move with your credit score — a
              780 FICO still puts 25% down on a fourplex.
            </p>
            <p>
              If you <em>will</em> live in the property — even just one unit of a duplex,
              triplex, or fourplex for a year — the whole table changes. Owner-occupied
              financing opens up: <strong>FHA at 3.5% down</strong> on a 1–4 unit, a{" "}
              <strong>VA loan at 0% down</strong> for eligible veterans, or conventional
              owner-occupied as low as 5%. That single distinction — investor vs.
              owner-occupant — is the biggest lever on your cash-to-close, often a 7x
              difference on the same building.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              The full down-payment menu (2026)
            </h2>
            <p>
              Here&apos;s the practical range by loan type. &quot;Owner-occupied&quot; means you
              live in the property as your primary residence; lenders typically require you
              to move in within 60 days and stay at least 12 months.
            </p>
            <ul>
              <li><strong>FHA, owner-occupied (1–4 units):</strong> 3.5% down with a 580+ score. The low-down workhorse for house hackers.</li>
              <li><strong>VA, owner-occupied (1–4 units):</strong> 0% down for eligible veterans and service members. No PMI, but a one-time funding fee applies.</li>
              <li><strong>Conventional, owner-occupied 1-unit:</strong> 3–5% down. Under 20% you pay PMI until you reach 20% equity.</li>
              <li><strong>Conventional, owner-occupied 2-unit:</strong> as little as 5% down; 3–4 units run higher (commonly 15%+).</li>
              <li><strong>Conventional, investment single-family (1-unit):</strong> 15% down minimum (85% LTV).</li>
              <li><strong>Conventional, investment 2–4 units:</strong> 25% down minimum (75% LTV).</li>
              <li><strong>Second home (not a rental):</strong> 10% down — but you can&apos;t rent it full-time and call it a second home.</li>
              <li><strong><Link href="/blog/dscr-loans-explained" className="text-primary font-semibold hover:underline">DSCR loan</Link> (investment):</strong> typically 20–25% down (75–80% LTV), qualified on the property&apos;s rent rather than your income.</li>
            </ul>
            <p>
              Notice what&apos;s missing from the investment rows: there&apos;s no &quot;3% down with
              PMI&quot; option. That brings us to the most misunderstood part of the whole
              topic.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              Why there&apos;s no PMI on a rental
            </h2>
            <p>
              On an owner-occupied loan, private mortgage insurance lets you put down less
              than 20% — the insurer covers the lender&apos;s risk in exchange for a monthly
              premium. <strong>That product simply doesn&apos;t exist for investment
              properties.</strong> Lenders price the higher default risk of a non-owner-occupied
              loan directly into the down payment instead, which is why 15% (single-family)
              and 25% (multi) are hard floors rather than negotiable starting points.
            </p>
            <p>
              The flip side: if you house-hack with less than 20% down, you <em>do</em> pay
              mortgage insurance. FHA charges an annual MIP around 0.55% of the loan — on a
              $241,250 FHA balance that&apos;s roughly $1,327 a year, about $110 a month — and
              it sticks for the life of the loan on most FHA loans. Conventional PMI at 5%
              down is similar in size but drops off automatically at 20% equity. Either way,
              that premium is a real operating cost you have to fold into your underwriting,
              not a footnote.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              Worked example: a $250k single-family at 15% vs. 20% vs. 25% down
            </h2>
            <p>
              Let&apos;s make this concrete. A $250,000 single-family rental, 30-year fixed at
              7.25% (a realistic <Link href="/blog/dscr-loans-explained" className="text-primary font-semibold hover:underline">investment rate</Link> in
              June 2026), renting for $2,500/month — right at the{" "}
              <Link href="/tools/cap-rate-calculator" className="text-primary font-semibold hover:underline">
                1% rule
              </Link>{" "}
              line. After honest operating expenses (5% vacancy, 8% management, 5%
              maintenance, 5% capex reserves, $3,000 taxes, $1,450 insurance), the property
              throws off about <strong>$18,650 of net operating income</strong> — a 7.46% cap
              rate. Now watch what the down payment does:
            </p>
            <ul>
              <li><strong>15% down — $37,500:</strong> $212,500 loan, $1,450/mo P&amp;I. Cash flow ≈ <strong>+$105/mo</strong> ($1,255/yr). With ~$9,000 closing costs, cash in is $46,500 → <strong>cash-on-cash 2.7%</strong>, <strong>DSCR 1.07</strong>.</li>
              <li><strong>20% down — $50,000:</strong> $200,000 loan, $1,364/mo P&amp;I. Cash flow ≈ <strong>+$190/mo</strong> ($2,278/yr). Cash in $59,000 → <strong>cash-on-cash 3.9%</strong>, <strong>DSCR 1.14</strong>.</li>
              <li><strong>25% down — $62,500:</strong> $187,500 loan, $1,279/mo P&amp;I. Cash flow ≈ <strong>+$275/mo</strong> ($3,301/yr). Cash in $71,500 → <strong>cash-on-cash 4.6%</strong>, <strong>DSCR 1.22</strong>.</li>
            </ul>
            <p>
              Reproduce any row in seconds with the{" "}
              <Link href="/tools/mortgage-payment-calculator" className="text-primary font-semibold hover:underline">
                mortgage payment calculator
              </Link>{" "}
              and the{" "}
              <Link href="/tools/cash-on-cash-calculator" className="text-primary font-semibold hover:underline">
                cash-on-cash calculator
              </Link>
              . The pattern is the surprising part.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              The counterintuitive part: more down, higher return
            </h2>
            <p>
              For a decade of cheap money, the gospel was &quot;put as little down as possible
              and let leverage juice your return.&quot; Look at the table again: cash-on-cash
              <em>rises</em> from 2.7% to 4.6% as the down payment goes <em>up</em>. That&apos;s
              not a typo — it&apos;s what happens when borrowing costs climb above the
              property&apos;s yield.
            </p>
            <p>
              The mechanism is the <strong>loan constant</strong>: annual debt service
              divided by the loan balance. At 7.25% on a 30-year note, the constant is about
              <strong> 8.2%</strong> ($15,349 ÷ $187,500). Compare that to the property&apos;s
              7.46% cap rate. When the loan constant is <em>higher</em> than the cap rate, you
              have <strong>negative leverage</strong> — every borrowed dollar earns 7.46% on
              the asset but costs 8.2% to service, so it bleeds the difference. Borrowing more
              (less down) amplifies that drag; borrowing less (more down) reduces it.
            </p>
            <p>
              This reverses the moment the cap rate clears the loan constant — a higher-yield
              market, a value-add that lifts NOI, or a lower rate all flip leverage back to
              positive, and suddenly the 15%-down row wins on cash-on-cash. The takeaway
              isn&apos;t &quot;always put 25% down.&quot; It&apos;s that the right down payment is a math
              question, not a rule of thumb, and the answer changes with rates. Compare your
              deal&apos;s cap rate to its loan constant before you assume minimum-down is optimal —
              the{" "}
              <Link href="/blog/how-to-calculate-cash-on-cash-return" className="text-primary font-semibold hover:underline">
                cash-on-cash guide
              </Link>{" "}
              walks the full formula.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              The house-hack shortcut
            </h2>
            <p>
              If the 25%-down wall on a multifamily feels impossible, owner-occupancy is the
              door around it. Take the <em>same</em> $250,000 duplex three ways:
            </p>
            <ul>
              <li><strong>FHA, owner-occupied, 3.5% down:</strong> $8,750 down, $241,250 loan at ~6.5%, ~$1,525/mo P&amp;I (plus ~$110/mo MIP).</li>
              <li><strong>Conventional, owner-occupied, 5% down:</strong> $12,500 down, $237,500 loan at ~6.5%, ~$1,501/mo P&amp;I (plus PMI).</li>
              <li><strong>Conventional, investment, 25% down:</strong> $62,500 down, $187,500 loan at ~7.25%, ~$1,279/mo P&amp;I.</li>
            </ul>
            <p>
              The owner-occupied routes get you into the building for <strong>$8,750 instead
              of $62,500</strong> — roughly one-seventh the cash — and at a lower interest rate,
              because owner-occupied loans price better than investor loans. The trade is that
              you live there for at least a year, carry a bigger loan balance, and pay mortgage
              insurance. For most first-timers it&apos;s the single fastest way into rental real
              estate. The full playbook is in{" "}
              <Link href="/blog/house-hacking-explained" className="text-primary font-semibold hover:underline">
                house hacking explained
              </Link>
              .
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              The cash the down payment hides: closing costs and reserves
            </h2>
            <p>
              Your down payment is not your cash-to-close. Two more piles sit on top of it,
              and skipping them is how new investors end up short at the table:
            </p>
            <p>
              <strong>Closing costs.</strong> Budget 2–5% of the price for a financed deal —
              roughly $5,000–$12,500 on our $250k rental — covering lender fees, title,
              transfer taxes, and prepaids. They&apos;re sunk the day you sign, so they belong in
              your return math up front. The full line-by-line breakdown is in{" "}
              <Link href="/blog/closing-costs-investment-property" className="text-primary font-semibold hover:underline">
                closing costs on an investment property
              </Link>
              , and you can estimate yours with the{" "}
              <Link href="/tools/closing-cost-calculator" className="text-primary font-semibold hover:underline">
                closing cost calculator
              </Link>
              .
            </p>
            <p>
              <strong>Reserves.</strong> Conventional investment loans require you to <em>have</em>{" "}
              about six months of PITI (principal, interest, taxes, insurance) in the bank after
              closing — money you don&apos;t spend but must prove. On the 25%-down case that&apos;s
              roughly $1,650/mo PITI × 6 ≈ $9,900 sitting in reserve. Add it up: $62,500 down +
              $9,000 closing + $9,900 reserves means the deal really needs about{" "}
              <strong>$81,400 of liquidity</strong>, not the $62,500 the down-payment line implies.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              So how much should <em>you</em> put down?
            </h2>
            <p>
              There&apos;s no universal answer, but there is a decision order. First, the floor is
              set for you — 15% or 25% conventional investment, 3.5% FHA owner-occupied — so
              start from what you actually qualify for. Then weigh four things:
            </p>
            <ul>
              <li><strong>Leverage sign.</strong> If your cap rate beats the loan constant, less down lifts your cash-on-cash. If it doesn&apos;t (the common case at 2026 rates), more down does. Check it deal by deal.</li>
              <li><strong>DSCR headroom.</strong> Lenders and your own safety both want{" "}
              <Link href="/tools/dscr-calculator" className="text-primary font-semibold hover:underline">
                DSCR
              </Link>{" "}
              comfortably above 1.0 — 1.20+ is a healthy buffer. More down raises DSCR; if a deal only clears 1.0 at 25% down, that&apos;s the market telling you it&apos;s thin.</li>
              <li><strong>Opportunity cost.</strong> $125,000 buys one fourplex at 25% down — or two single-families at 15%. Spreading capital across more doors can beat concentrating it, if you can manage the extra properties.</li>
              <li><strong>Reserves after closing.</strong> Never put down so much that you close with an empty bank account. A vacancy and a furnace in the same quarter is a normal year, not a black swan.</li>
            </ul>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              Run your actual deal
            </h2>
            <p>
              The cleanest habit is to stop guessing at &quot;20%&quot; and model the specific
              property at two or three down-payment levels before you write an offer. Drop the
              price, rent, expenses, and each financing scenario into{" "}
              <Link href="/" className="text-primary font-semibold hover:underline">
                TrueCap
              </Link>{" "}
              and you&apos;ll see cash flow, cap rate, cash-on-cash, and DSCR side by side in about
              60 seconds — including the all-in cash the deal really needs. For the rest of the
              underwrite, see{" "}
              <Link href="/blog/how-to-underwrite-a-rental-property-in-60-seconds" className="text-primary font-semibold hover:underline">
                how to underwrite a rental in 60 seconds
              </Link>
              .
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              FAQs
            </h2>
            {FAQS.map((f) => (
              <div key={f.q}>
                <h3 className="text-xl font-bold text-foreground mt-6 mb-2">
                  {f.q}
                </h3>
                <p>{f.a}</p>
              </div>
            ))}
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
