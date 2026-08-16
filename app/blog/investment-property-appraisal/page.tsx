/**
 * Blog post: investment property appraisals.
 *
 * Targets queries: "investment property appraisal", "rental property
 * appraisal", "appraisal came in low investment property", "1007 rent
 * schedule", "appraisal gap investment property", "reconsideration of
 * value", "how do appraisals work rental property".
 *
 * Angle: the appraisal is the one number in every purchase, refinance,
 * and DSCR loan that the investor doesn't control — yet most investors
 * only learn how it works after one comes in low. Explain the forms
 * (1004 / 1025 / 1007), the lower-of rule, a worked low-appraisal gap
 * example, the 1007's effect on DSCR pricing, and the full playbook
 * when the value misses. Slots into the ARV / refinance / DSCR cluster
 * and funnels into the DSCR and mortgage payment calculators.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SiteFooter } from "@/components/marketing/site-footer";
import { BlogStickyCta } from "@/components/marketing/blog-sticky-cta";
import { RelatedBlogPosts } from "@/components/marketing/related-blog-posts";
import { NewsletterSignup } from "@/components/marketing/newsletter-signup";
import { getSiteUrl } from "@/lib/site-url";

const SLUG = "investment-property-appraisal";
const TITLE_PLAIN =
  "Investment property appraisals: how they work — and what to do when the value comes in low (2026)";
// SERP-facing title (metadata/og only): kept ≤50 chars so the root
// layout's "%s | TrueCap" template stays inside the ~60-char SERP
// window. The on-page <h1> keeps the longer editorial TITLE_PLAIN.
const SERP_TITLE = "How investment property appraisals work (2026)";
const DESCRIPTION =
  "How investment property appraisals work: the forms, the 1007 rent schedule, the lower-of rule, worked low-appraisal gap math, and the rebuttal playbook.";
const PUBLISHED_AT = "2026-07-11";
const MODIFIED_AT = "2026-08-15";
const READING_TIME = 11;

export const metadata: Metadata = {
  title: SERP_TITLE,
  description: DESCRIPTION,
  keywords: [
    "investment property appraisal",
    "rental property appraisal",
    "appraisal came in low investment property",
    "1007 rent schedule",
    "appraisal gap investment property",
    "reconsideration of value",
    "how do rental property appraisals work",
    "appraisal lower than offer",
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
    q: "How is an investment property appraisal different from a regular home appraisal?",
    a: "The valuation method is mostly the same — recent comparable sales, adjusted to the subject — but investment appraisals add income documentation. On a single-family rental, most lenders order a 1007 comparable rent schedule alongside the standard 1004 appraisal, so the appraiser opines on market rent as well as value. On a 2–4 unit property, the appraisal itself moves to Form 1025, which includes rental comps and a gross rent multiplier analysis. Expect a somewhat higher fee than an owner-occupant appraisal, and expect the rent opinion to matter as much as the value if you're using a DSCR loan.",
  },
  {
    q: "What happens if the appraisal comes in lower than my offer?",
    a: "The lender sizes the loan off the lower of the purchase price and the appraised value, so a low appraisal shrinks your loan, not your price. You have five levers, in roughly this order: renegotiate the price down to (or toward) the appraised value, bring extra cash to cover the gap, file a reconsideration of value with better comps, switch lenders to trigger a new appraisal, or walk if your contract has an appraisal contingency. The math on each option is in the worked example above — often a hybrid (seller drops part way, you cover the rest) is where deals actually land.",
  },
  {
    q: "Can I challenge a low appraisal?",
    a: "Yes — the process is called a reconsideration of value (ROV), and it goes through your lender, not directly to the appraiser. It works when you can point to specific, factual problems: a renovated comp the appraiser missed, an error in the subject's square footage or bed/bath count, or comps pulled from across a boundary that changes value. It does not work as a generic complaint that the number feels low. Send two or three better closed comps with a short factual note. Expect a modest adjustment when you win — a few percent, not a rewrite — and a response inside one to two weeks.",
  },
  {
    q: "What is a 1007 rent schedule and why does my lender want one?",
    a: "Form 1007 is the single-family comparable rent schedule: the appraiser pulls three or so nearby rental comps and gives an opinion of the subject's market rent. Conventional lenders use it to count rental income toward your qualification; DSCR lenders use it to compute the debt-service-coverage ratio itself, and most will underwrite to the lower of your actual lease and the 1007 market rent. A 1007 that comes in under your lease can push your DSCR below a pricing tier and cost you real basis points — which is why you should underwrite to a defensible market rent, not the most optimistic listing you found.",
  },
];

export default function InvestmentPropertyAppraisalPost() {
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
              Investment property appraisals: how they work — and what to do
              when the value comes in low (2026)
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
              Every financed rental deal has one number the investor
              doesn&apos;t control: the appraisal. You can negotiate the price,
              shop the rate, and pad the rehab budget, but the appraised value
              — and on many loans, the appraiser&apos;s opinion of market rent
              — is handed down by a stranger a few weeks before closing, and
              your loan is sized off it. Most investors learn how the process
              works the expensive way, the first time a value comes in
              $12,000 light. Here&apos;s the whole machine: which forms get
              ordered and what&apos;s in them, how the lower-of rule turns a
              low appraisal into a cash call, what the 1007 rent schedule does
              to a DSCR loan&apos;s pricing, and the exact playbook — with
              worked numbers — for when the appraisal misses.
            </p>
          </header>

          <div className="prose prose-neutral max-w-none text-foreground space-y-6 leading-relaxed">
            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              Where appraisals ambush a rental deal
            </h2>
            <p>
              You&apos;ll face an appraisal at three points in an investing
              career, and the stakes differ at each one. On a{" "}
              <strong>purchase</strong>, the appraisal referees the price you
              negotiated: come in low and the lender shrinks your loan, so you
              either renegotiate, bring cash, or walk. On a{" "}
              <strong>refinance</strong> — including the refi leg of a BRRRR —
              the appraisal <em>is</em> the deal: the cash-out loan is a
              straight percentage of appraised value, so every dollar the
              appraiser shaves off costs you 70–75 cents of proceeds. (That
              forecast-versus-referee dynamic is the core of the{" "}
              <Link
                href="/blog/how-to-calculate-arv"
                className="text-primary font-semibold hover:underline"
              >
                ARV guide
              </Link>
              .) And on a <strong>DSCR loan</strong>, a second, quieter number
              rides along with the value: the appraiser&apos;s opinion of
              market rent, which can move your rate tier even when the value
              comes in fine. Expect to pay roughly $500–$800 for a
              single-family appraisal and $700–$1,200 for a 2–4 unit, ordered
              by the lender through an appraisal management company — you pay
              for it, but you don&apos;t pick the appraiser, by design.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              The paperwork: 1004, 1025, and the 1007 rent schedule
            </h2>
            <p>
              For a single-family rental, the appraisal itself is the same
              form an owner-occupant gets — the URAR, Fannie Mae Form 1004 —
              built almost entirely on the <strong>sales comparison
              approach</strong>: three to six recent closed sales, adjusted
              toward the subject for condition, size, and features, then
              reconciled to a value. What makes it an investment appraisal is
              the attachment: most lenders also order{" "}
              <strong>Form 1007</strong>, the single-family comparable rent
              schedule, in which the appraiser pulls nearby rental comps and
              opines on the subject&apos;s market rent. If you&apos;ve built a
              rent estimate the way the{" "}
              <Link
                href="/blog/how-to-estimate-rent-rental-property"
                className="text-primary font-semibold hover:underline"
              >
                rent estimation guide
              </Link>{" "}
              lays out, the 1007 is the appraiser running your same play — and
              it should land near your number.
            </p>
            <p>
              Two-to-four unit properties move to <strong>Form 1025</strong>,
              the small residential income property report. It keeps the sales
              comparison approach but adds an income section: rental comps for
              each unit type and a{" "}
              <Link
                href="/blog/gross-rent-multiplier-explained"
                className="text-primary font-semibold hover:underline"
              >
                gross rent multiplier
              </Link>{" "}
              analysis, where the appraiser multiplies the property&apos;s
              market rent by the GRM extracted from comparable sales as a
              cross-check on the comps-based value. A duplex grossing $2,900 a
              month in a market where small multifamily trades around an 8.2
              GRM pencils to roughly $285,000 by the income approach — if the
              sales comps say $260,000, the appraiser reconciles, usually
              leaning on the sales side for 2–4 units. The third method, the
              cost approach (land plus replacement cost minus depreciation),
              rarely drives residential values; it exists mostly as a sanity
              check and for new construction. The practical takeaway: on
              small residential, <em>comps decide the value and rents decide
              the loan</em> — your cap-rate math matters to you, not to the
              appraiser.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              Why the 1007 can cost you more than the value
            </h2>
            <p>
              On a{" "}
              <Link
                href="/blog/dscr-loans-explained"
                className="text-primary font-semibold hover:underline"
              >
                DSCR loan
              </Link>
              , property coverage is the primary ratio under many programs,
              but borrower and property requirements still apply. The rent
              used in that ratio is not necessarily your lease. Some programs
              use the lower of an eligible lease and appraiser market rent;
              others define acceptable rent differently. Confirm the written
              program method before relying on either number. Run the
              numbers on a $240,000 single-family purchase with 25% down: a
              $180,000 loan at 7.25% carries a principal-and-interest payment
              of about $1,228; add $250 of monthly taxes and $110 of insurance
              and PITIA is roughly <strong>$1,588</strong>. Your tenant pays
              $2,000, so you compute DSCR at 2,000 ÷ 1,588 ={" "}
              <strong>1.26</strong>. But if the 1007 pegs market rent at
              $1,850 — maybe your tenant is above market, maybe the rental
              comps skew small — the lender&apos;s DSCR is 1,850 ÷ 1,588 ={" "}
              <strong>1.17</strong>. Many DSCR rate sheets break at 1.20:
              cross it going down and the same deal prices 25–50 basis points
              worse, or the lender trims leverage until the ratio clears.
              Nothing about the property changed — one opinion of rent moved
              your cost of capital. Check where your deal sits with the{" "}
              <Link
                href="/tools/dscr-calculator"
                className="text-primary font-semibold hover:underline"
              >
                DSCR calculator
              </Link>{" "}
              before the appraisal does it for you.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              The lower-of rule: worked gap math
            </h2>
            <p>
              Purchase loans are sized against the <strong>lower</strong> of
              the contract price and the appraised value. That asymmetry is
              worth staring at: an appraisal $15,000 <em>above</em> your price
              changes nothing (you don&apos;t get a bigger loan, though you do
              get free equity), while an appraisal $12,000 <em>below</em> is
              an immediate cash call. Concretely: you&apos;re under contract
              at <strong>$240,000</strong> with 25% down — a $180,000 loan and
              $60,000 down. The appraisal lands at{" "}
              <strong>$228,000</strong>. The lender now lends 75% of $228,000
              = <strong>$171,000</strong>, but you still owe the seller
              $240,000, so your cash to close jumps from $60,000 to{" "}
              <strong>$69,000</strong>. The consolation prizes are small: the
              payment drops about $61 a month (run variations through the{" "}
              <Link
                href="/tools/mortgage-payment-calculator"
                className="text-primary font-semibold hover:underline"
              >
                mortgage payment calculator
              </Link>
              ), and your loan-to-value improves. The injury is that $9,000 of
              extra cash is now buried in a property the market&apos;s referee
              just said is worth $12,000 less than you agreed to pay — and
              your cash-on-cash return recomputes against the bigger
              denominator.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              The low-appraisal playbook, in order
            </h2>
            <p>
              <strong>First, renegotiate.</strong> The appraisal is leverage —
              a documented, third-party opinion that the price is wrong, and
              the seller knows the next financed buyer will likely hit the
              same number. Ask for $228,000; settle anywhere above it and
              you&apos;ve recovered real money. A common landing spot is the
              split: seller comes down to $234,000, you cover the remaining
              $6,000 gap — cash to close rises $4,500 instead of $9,000.{" "}
              <strong>Second, pay the gap</strong> — but only if your own
              comps genuinely support the contract price and the appraisal is
              the outlier, not your optimism. Be honest about which is more
              likely. <strong>Third, file a reconsideration of value.</strong>{" "}
              An ROV goes through the lender and works only on facts: a
              renovated comp the appraiser missed, a square-footage or
              bed/bath error, comps pulled from across a school-district or
              highway boundary. Send two or three better closed sales and a
              short note; expect an answer in one to two weeks and a modest
              move when you win. <strong>Fourth, switch lenders.</strong> A
              new lender means a new appraisal — a legitimate reset if the
              first was sloppy, at the cost of a fresh fee and two to three
              weeks. It&apos;s the standard move on refinances, where
              there&apos;s no contract deadline forcing your hand.{" "}
              <strong>Fifth, walk.</strong> If your contract has an appraisal
              contingency, a low value is a clean exit with your earnest money
              back. On investment purchases, waiving that contingency is a
              real concession — waive it only when you&apos;d happily pay the
              gap, because you&apos;re promising exactly that.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              Appraisal-proofing your underwriting
            </h2>
            <p>
              You can&apos;t pick the appraiser, but you can make the
              appraisal boring. Underwrite value from closed, truly
              comparable sales — never from list prices or an algorithm&apos;s
              guess — so the appraiser&apos;s comp set and yours overlap
              before anyone drives to the property. Underwrite rent to a
              defensible market number rather than the hottest listing on the
              block, so the 1007 confirms instead of corrects. On a purchase,
              stress the deal at 5% below contract price: if $9,000 of gap
              cash kills the investment, the margin was never there. On a
              refinance, the{" "}
              <Link
                href="/blog/how-to-refinance-a-rental-property"
                className="text-primary font-semibold hover:underline"
              >
                refinance guide
              </Link>{" "}
              covers the equivalent haircut on cash-out proceeds. And when the
              appraisal is scheduled, help the facts along: send the agent or
              appraiser a one-page packet — recent improvements with costs,
              the rent roll, and the two or three comps that best support the
              price. Appraisers can ignore it, but a factual packet beats a
              hopeful phone call, and it seeds the record you&apos;ll need if
              an ROV becomes necessary.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              Five mistakes investors make with appraisals
            </h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Treating the appraisal as the market&apos;s verdict on
                the investment.</strong> It&apos;s a collateral opinion for
                the lender, anchored to closed sales. A property can appraise
                perfectly and still be a bad rental — and occasionally the
                reverse. Cash flow math is your job, not the appraiser&apos;s.
              </li>
              <li>
                <strong>Waiving the appraisal contingency to win a bidding
                war, without gap cash.</strong> That clause is what converts
                a low value from a crisis into a decision. Waive it only with
                the cash — and the willingness — to cover the worst-case gap.
              </li>
              <li>
                <strong>Ignoring the 1007 until closing week.</strong> On DSCR
                loans the rent opinion moves pricing tiers. If your underwrite
                needs above-market rent to clear 1.20, the appraisal is where
                that assumption gets repriced.
              </li>
              <li>
                <strong>Filing an emotional ROV.</strong> &quot;It should be
                worth more&quot; loses; &quot;the appraiser used a 1,050 sq ft
                dated sale and missed the renovated 1,400 sq ft closing on the
                same street&quot; wins. Facts, comps, brevity.
              </li>
              <li>
                <strong>Forgetting the appraisal expires.</strong> Most are
                valid for about 120 days. Let a closing drift past the window
                and you&apos;re paying for — and risking — a second opinion
                in whatever the market has become since.
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
              An appraisal is a referee&apos;s call built from closed comps —
              plus, on rentals, an opinion of market rent that can quietly
              reprice your loan. The lower-of rule means a low value never
              costs the seller first; it costs you, in gap cash or lost
              cash-out proceeds, at 70–75 cents per appraised dollar. So
              underwrite like the appraiser is looking over your shoulder:
              comp-supported value, defensible market rent, and a deal that
              survives the value coming in 5% light. When one misses anyway,
              work the playbook in order — renegotiate, gap, ROV, new lender,
              walk — and let the contingency do the job you kept it for. Run
              the full picture — price, rent, financing, and the DSCR your
              lender will compute — through the{" "}
              <Link href="/" className="text-primary font-semibold hover:underline">
                TrueCap analyzer
              </Link>{" "}
              before the appraisal is ordered, so the referee&apos;s number is
              a confirmation, not a surprise. None of this is investment or
              lending advice; appraisal forms, LTV limits, and DSCR tiers vary
              by lender and program — verify terms on your specific deal.
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
