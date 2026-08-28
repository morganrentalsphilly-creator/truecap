/**
 * Blog post: Closing costs on an investment property — full breakdown.
 *
 * Targets queries: "closing costs investment property", "how much are
 * closing costs on a rental property", "investment property closing
 * costs breakdown", "closing costs vs down payment", "rental property
 * closing costs estimate", "what are closing costs on a rental".
 */

import type { Metadata } from "next";
import Link from "next/link";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SiteFooter } from "@/components/marketing/site-footer";
import { BlogStickyCta } from "@/components/marketing/blog-sticky-cta";
import { RelatedBlogPosts } from "@/components/marketing/related-blog-posts";
import { NewsletterSignup } from "@/components/marketing/newsletter-signup";
import { getSiteUrl } from "@/lib/site-url";

const SLUG = "closing-costs-investment-property";
const TITLE =
  "Closing costs on an investment property — the full breakdown (2026)";
// SERP-facing title (metadata/og only): kept ≤50 chars so the root
// layout's "%s | TrueCap" template stays inside the ~60-char SERP
// window. The on-page <h1> keeps the longer editorial TITLE.
const SERP_TITLE = "Closing costs on an investment property (2026)";
const DESCRIPTION =
  "Every line item in investment-property closing costs, with real 2026 dollar figures on a $250k rental. What's negotiable, what isn't, and how to fold it into your cash-to-close.";
const PUBLISHED_AT = "2026-06-09";
const MODIFIED_AT = "2026-06-09";
const READING_TIME = 11;

export const metadata: Metadata = {
  title: SERP_TITLE,
  description: DESCRIPTION,
  keywords: [
    "closing costs investment property",
    "how much are closing costs on a rental property",
    "investment property closing costs breakdown",
    "rental property closing costs estimate",
    "closing costs vs down payment",
    "what are closing costs on a rental",
    "buyer closing costs 2026",
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
    q: "How much are closing costs on an investment property?",
    a: "Plan on 2–5% of the purchase price for a financed investment property, on top of your down payment. On a $250,000 rental that's roughly $5,000–$12,500. Lender-related fees (origination, points, appraisal) make up the largest chunk, followed by title and government recording/transfer taxes. The exact figure swings widely by state because transfer taxes and title insurance pricing are state-specific.",
  },
  {
    q: "Are closing costs higher on an investment property than a primary residence?",
    a: "Usually a little. The line items are the same, but investment-property loans carry rate add-ons (loan-level price adjustments) that often get bought down with points, and some lenders charge a slightly higher origination fee on non-owner-occupied loans. The appraisal can also cost more because lenders frequently order a rent schedule (Form 1007) alongside the standard appraisal.",
  },
  {
    q: "Can you roll closing costs into an investment property loan?",
    a: "Generally no — not the way you can on some refinances. On a purchase, closing costs are paid out of pocket at the table. You can sometimes reduce them with lender credits (accepting a higher rate in exchange for the lender covering fees) or seller concessions, but conventional investment-property loans cap seller-paid costs at 2% of the price.",
  },
  {
    q: "Are investment property closing costs tax deductible?",
    a: "Some are deductible in year one, some get added to your cost basis and depreciated, and some are amortized over the life of the loan. Prepaid property taxes and prorated mortgage interest are typically deductible immediately. Title fees, recording fees, and transfer taxes are added to basis. Loan points and lender fees are amortized over the loan term. Confirm the specifics with your CPA — this isn't tax advice.",
  },
  {
    q: "Do you pay closing costs on a cash purchase?",
    a: "Yes, just fewer of them. A cash purchase skips every lender fee — origination, points, appraisal, lender's title policy — but you still pay title search, owner's title insurance, escrow/settlement fees, recording fees, and transfer taxes. Cash closing costs usually land around 1–2% of the price instead of 2–5%.",
  },
];

export default function ClosingCostsPost() {
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
              Most first-time investors budget for the down payment, then get blindsided at the closing table by a second pile of cash they didn&apos;t fully price in. Closing costs on an investment property run 2–5% of the purchase price — on a $250,000 rental, that&apos;s $5,000 to $12,500 of additional cash to close. Here&apos;s every line item, what each one actually costs in 2026, what&apos;s negotiable, and how to fold it into your underwriting so it never surprises you.
            </p>
          </header>

          <div className="prose prose-neutral max-w-none text-foreground space-y-6 leading-relaxed">
            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              The short answer
            </h2>
            <p>
              For a financed investment property, budget <strong>2–5% of the purchase price</strong> in closing costs, paid at the table on top of your down payment. The range is wide because two of the biggest line items — title insurance and transfer taxes — are priced by your state, not your lender. A buyer in a low-tax state might pay 2%; a buyer in a high transfer-tax state (New York, Pennsylvania, Delaware) can clear 5%.
            </p>
            <p>
              For a cash purchase, drop every lender fee and budget closer to <strong>1–2%</strong>. You still owe title, escrow, recording, and transfer taxes — there&apos;s no such thing as a fee-free close.
            </p>
            <p>
              One framing that keeps investors honest: closing costs are sunk the moment you sign. Unlike a down payment, which becomes equity you can recover at sale or refinance, most closing costs — origination, appraisal, title, transfer tax — are gone for good. That&apos;s exactly why they belong in your return math up front rather than as an afterthought. A deal that needs every dollar of projected cash flow to pencil can&apos;t absorb a surprise $12,000 at the table.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              The worked example: a $250k duplex, 25% down
            </h2>
            <p>
              Let&apos;s anchor everything to one deal so the numbers stay concrete. A $250,000 duplex, financed at 75% loan-to-value (25% down is the standard minimum for a non-owner-occupied conventional loan), 7% interest on a 30-year fixed. Down payment: $62,500. Loan amount: $187,500.
            </p>
            <p>
              Here&apos;s a realistic closing-cost stack for that deal in a mid-tax state:
            </p>
            <ul>
              <li><strong>Loan origination fee (1%):</strong> $1,875</li>
              <li><strong>Discount points (1 point to buy down the rate):</strong> $1,875</li>
              <li><strong>Appraisal + rent schedule (Form 1007):</strong> $650</li>
              <li><strong>Credit report, flood cert, tax service:</strong> $150</li>
              <li><strong>Lender&apos;s title insurance policy:</strong> $700</li>
              <li><strong>Owner&apos;s title insurance policy:</strong> $1,100</li>
              <li><strong>Title search + settlement/escrow fee:</strong> $900</li>
              <li><strong>Recording fees:</strong> $150</li>
              <li><strong>State/county transfer tax (~1%):</strong> $2,500</li>
              <li><strong>Prepaid homeowners insurance (1 yr):</strong> $1,400</li>
              <li><strong>Prepaid property tax escrow (~3 months):</strong> $900</li>
              <li><strong>Prepaid/prorated mortgage interest:</strong> $400</li>
            </ul>
            <p>
              Total: roughly <strong>$12,600</strong>, or about 5% of the purchase price. Skip the discount point and use a lower-tax state and the same deal closes nearer $8,000 (3.2%). That spread — $8k to $12.6k on an identical price — is why a single national &quot;closing costs are X%&quot; number is close to useless. You have to build the stack line by line.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              Group 1: Lender fees (the negotiable pile)
            </h2>
            <p>
              <strong>Origination fee.</strong> Usually 0.5–1% of the loan amount. This is the lender&apos;s charge for processing and underwriting your loan, and it&apos;s the most negotiable line item on the entire sheet. Get loan estimates from two or three lenders and the origination number alone can move $1,000+.
            </p>
            <p>
              <strong>Discount points.</strong> Each point costs 1% of the loan amount and buys your rate down by roughly 0.25%. On a $187,500 loan, one point is $1,875 to shave the rate from, say, 7.0% to 6.75%. Whether that&apos;s worth it is pure break-even math: divide the cost of the point by your monthly payment savings to get the months-to-recoup. Run both rate scenarios through the{" "}
              <Link href="/tools/mortgage-payment-calculator" className="text-primary font-semibold hover:underline">
                mortgage payment calculator
              </Link>{" "}
              before you decide — on a long hold, points often pay off; on a property you plan to refinance in two years, they rarely do.
            </p>
            <p>
              <strong>Appraisal.</strong> $500–$800 for a standard residential appraisal, more for 2–4 unit properties. Investment-property lenders almost always order a Form 1007 rent schedule alongside it so they can verify market rent — that&apos;s an extra $100–$200 but it&apos;s genuinely useful data for your own underwriting.
            </p>
            <p>
              <strong>Junk fees.</strong> Processing fee, underwriting fee, document prep, application fee — these vary wildly and some are pure padding. They show up on the loan estimate&apos;s &quot;Section A.&quot; Ask the lender to itemize and waive what they can; a competitive lender will trim a few hundred dollars to win your business.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              Group 2: Title &amp; settlement (mostly fixed)
            </h2>
            <p>
              <strong>Lender&apos;s title insurance.</strong> Required by your lender, sized to the loan amount, protects the lender if a title defect surfaces later. Non-negotiable if you&apos;re financing.
            </p>
            <p>
              <strong>Owner&apos;s title insurance.</strong> Optional in theory, strongly recommended in practice — it protects <em>you</em> against liens, boundary disputes, and ownership claims the title search missed. Sized to the purchase price. In some states pricing is regulated and identical across providers; in others you can shop it.
            </p>
            <p>
              <strong>Title search &amp; settlement/escrow fee.</strong> The cost of the actual title examination plus the closing agent or attorney who runs the table. In attorney-state closings (much of the Northeast and Southeast) this shows up as a legal fee instead. Combined, expect $700–$1,200.
            </p>
            <p>
              <strong>Recording fees.</strong> What the county charges to record the deed and mortgage in public records. Small and fixed — typically $50–$250.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              Group 3: Government transfer taxes (the wild card)
            </h2>
            <p>
              This is the line item that makes closing costs unpredictable across markets. Transfer tax (sometimes called deed tax, documentary stamp tax, or conveyance tax) is a percentage of the sale price charged by the state, county, or city — sometimes all three. On a $250,000 purchase, a half-point swing in the combined transfer-tax rate is $1,250 of cash — enough to flip a marginal deal. A few examples of the spread in 2026:
            </p>
            <ul>
              <li>Several states (Texas, parts of the Mountain West) charge <strong>no transfer tax at all</strong>.</li>
              <li>Pennsylvania runs ~2% combined state + local — $5,000 on our $250k duplex, often split with the seller by local custom.</li>
              <li>Delaware and parts of New York City can exceed 3–4%.</li>
            </ul>
            <p>
              Who pays — buyer, seller, or split — is set by local custom and negotiable in the contract. Before you write an offer in a new market, ask your agent or title company for the local transfer-tax rate and who customarily pays it. It can swing your cash-to-close by thousands.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              Group 4: Prepaids &amp; escrows (not really &quot;costs&quot;)
            </h2>
            <p>
              Prepaids are the sneaky part of the closing disclosure, because they inflate your cash-to-close even though they aren&apos;t money lost — they&apos;re expenses you&apos;d pay anyway, just front-loaded.
            </p>
            <p>
              <strong>Prepaid homeowners insurance.</strong> Lenders require the first full year paid upfront — $1,000–$2,000 for a typical rental, more on the coast.
            </p>
            <p>
              <strong>Property tax escrow.</strong> The lender collects 2–6 months of property taxes upfront to seed the escrow account. On a property with $3,600/yr in taxes, a 3-month cushion is $900.
            </p>
            <p>
              <strong>Prorated/prepaid interest.</strong> Interest from your closing date to the end of the month, collected at the table. Close on the 28th and it&apos;s trivial; close on the 2nd and it&apos;s nearly a full month.
            </p>
            <p>
              The distinction matters for underwriting: these prepaids belong in your <em>cash-to-close</em> but not in your annual operating expenses — you&apos;ll double-count if you include the insurance both here and in your{" "}
              <Link href="/blog/rental-property-pro-forma-explained" className="text-primary font-semibold hover:underline">
                pro forma operating expenses
              </Link>
              .
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              How closing costs hit your actual returns
            </h2>
            <p>
              Here&apos;s the part most guides skip: closing costs don&apos;t change your monthly cash flow — but they absolutely change your return. Cash-on-cash return divides annual pre-tax cash flow by total cash invested, and closing costs are part of that denominator.
            </p>
            <p>
              On our duplex: $62,500 down + $12,600 closing = <strong>$75,100 cash in</strong>. If the property throws off $6,000/yr in cash flow, your{" "}
              <Link href="/#main" className="text-primary font-semibold hover:underline">
                cash-on-cash return
              </Link>{" "}
              is 8.0% against total cash invested — not the 9.6% you&apos;d get if you only counted the down payment. Investors who ignore closing costs systematically overstate their returns by a point or more. Read{" "}
              <Link href="/blog/how-to-calculate-cash-on-cash-return" className="text-primary font-semibold hover:underline">
                how to calculate cash-on-cash return
              </Link>{" "}
              for the full formula and why the denominator is where most people cheat.
            </p>
            <p>
              Closing costs don&apos;t touch your{" "}
              <Link href="/#main" className="text-primary font-semibold hover:underline">
                DSCR
              </Link>{" "}
              — that ratio is about debt service vs. operating income and ignores how much cash you brought to the table — but they do extend the time it takes to recoup your investment. Always underwrite the all-in number, not the down payment.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              How to lower your closing costs
            </h2>
            <p>
              <strong>Shop lenders.</strong> The single biggest lever. Pull loan estimates from three lenders and compare Section A line by line. Origination, points, and junk fees are all negotiable; title and government fees mostly aren&apos;t.
            </p>
            <p>
              <strong>Ask for seller concessions.</strong> In a buyer&apos;s market, request the seller cover some closing costs. Conventional investment-property loans cap seller-paid costs at 2% of the purchase price — $5,000 on our duplex — so structure the offer accordingly.
            </p>
            <p>
              <strong>Consider lender credits.</strong> The inverse of buying points: accept a slightly higher rate and the lender credits you cash toward closing. Good move if you&apos;re short on cash now or plan to{" "}
              <Link href="/blog/how-to-refinance-a-rental-property" className="text-primary font-semibold hover:underline">
                refinance the property
              </Link>{" "}
              within a couple of years anyway.
            </p>
            <p>
              <strong>Shop title and pick your closing date.</strong> In non-regulated states, title and escrow fees are shoppable. And closing late in the month shrinks the prorated interest line.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              Build it into the deal, not after it
            </h2>
            <p>
              The cleanest habit: estimate closing costs <em>before</em> you write the offer, fold them into your cash-to-close, and judge the deal on the all-in number. A property that pencils on a $62,500 down payment can look very different at $75,100 all-in — and that&apos;s the figure your money actually feels.
            </p>
            <p>
              Estimate your stack with the{" "}
              <Link href="/tools/closing-cost-calculator" className="text-primary font-semibold hover:underline">
                closing cost calculator
              </Link>
              , then drop the full deal — price, financing, rent, expenses, and closing costs — into{" "}
              <Link href="/" className="text-primary font-semibold hover:underline">
                TrueCap
              </Link>{" "}
              to see cash flow, cap rate, cash-on-cash, and DSCR on the real all-in basis in about 60 seconds. For the rest of the underwrite, see{" "}
              <Link href="/blog/how-to-underwrite-a-rental-property-in-60-seconds" className="text-primary font-semibold hover:underline">
                how to underwrite a rental in 60 seconds
              </Link>{" "}
              and the{" "}
              <Link href="/blog/rental-property-pro-forma-explained" className="text-primary font-semibold hover:underline">
                pro forma guide
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
