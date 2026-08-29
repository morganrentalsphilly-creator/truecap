/**
 * Blog post: how to calculate rental property depreciation.
 *
 * Targets queries: "rental property depreciation", "how to calculate
 * depreciation on rental property", "27.5 year depreciation", "rental
 * property depreciation example", "land value depreciation split",
 * "mid-month convention rental property", "depreciable basis rental".
 *
 * Angle: the biggest deduction on Schedule E is the one investors most
 * often compute wrong — or not at all. The three-step calculation
 * (basis → land split → 27.5-year schedule with the mid-month
 * convention), a full worked $250K duplex example, the cash-flow-vs-
 * taxable-income bridge, improvements vs repairs, and the
 * allowed-or-allowable trap. Sits between the Schedule E walkthrough
 * (where the number lands) and the recapture / bonus depreciation
 * posts (what happens later and how to accelerate).
 */

import type { Metadata } from "next";
import Link from "next/link";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SiteFooter } from "@/components/marketing/site-footer";
import { BlogStickyCta } from "@/components/marketing/blog-sticky-cta";
import { RelatedBlogPosts } from "@/components/marketing/related-blog-posts";
import { NewsletterSignup } from "@/components/marketing/newsletter-signup";
import { getSiteUrl } from "@/lib/site-url";

const SLUG = "how-to-calculate-rental-property-depreciation";
const TITLE_PLAIN =
  "How to calculate depreciation on a rental property: the 27.5-year math, step by step (2026)";
// SERP-facing title (metadata/og only): kept ≤50 chars so the root
// layout's "%s | TrueCap" template stays inside the ~60-char SERP
// window. The on-page <h1> keeps the longer editorial TITLE_PLAIN.
const SERP_TITLE = "How to calculate rental property depreciation";
const DESCRIPTION =
  "Rental property depreciation, worked end to end: depreciable basis, the land-vs-building split, the 27.5-year schedule, and the mid-month convention.";
const PUBLISHED_AT = "2026-07-14";
const MODIFIED_AT = "2026-07-14";
const READING_TIME = 11;

export const metadata: Metadata = {
  title: SERP_TITLE,
  description: DESCRIPTION,
  keywords: [
    "rental property depreciation",
    "how to calculate depreciation on rental property",
    "27.5 year depreciation",
    "rental property depreciation example",
    "depreciable basis rental property",
    "land value depreciation split",
    "mid-month convention",
    "MACRS residential rental property",
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
    q: "Is taking depreciation on a rental property optional?",
    a: "No — and this is the single most expensive misunderstanding in rental taxation. The tax code reduces your basis by the depreciation that was allowed or allowable, meaning that when you sell, the IRS computes depreciation recapture as if you had claimed the deduction every year, whether or not you actually did. Skipping depreciation gets you the recapture bill without the annual deductions. If you've owned a rental for years without depreciating it, the fix is IRS Form 3115 (a change in accounting method), which lets you catch up all the missed depreciation in a single year — talk to a CPA, because the catch-up deduction is usually large.",
  },
  {
    q: "How do I figure out how much of the purchase price is land?",
    a: "The most common defensible method is the tax assessor's ratio: your county assessment splits the property into land and improvement values, and you apply that same percentage split to your actual purchase basis. If the assessor says the land is $50,000 of a $200,000 total assessment (25%), you treat 25% of your basis as non-depreciable land. Alternatives that also hold up: a line-item land value in your purchase appraisal, or a qualified appraisal done for this purpose. What doesn't hold up is picking a conveniently tiny land percentage with no support — land ratios vary from under 10% in rural markets to 40%+ in expensive coastal metros, and the ratio you use directly scales your deduction.",
  },
  {
    q: "Which closing costs get added to my depreciable basis?",
    a: "Costs of acquiring the property are capitalized into basis: title insurance and title search, transfer taxes and recording fees, legal fees, surveys, and most seller-paid items you reimburse. Costs of obtaining the loan are not basis — points, origination fees, and lender fees are amortized separately over the life of the loan. Prepaids and escrows (property tax, insurance) are neither; they're either currently deductible operating expenses or simply deposits. On a typical purchase, capitalizable closing costs add 1.5–3% to your basis, which is real money over 27.5 years — don't leave them out.",
  },
  {
    q: "What happens to all this depreciation when I sell?",
    a: "It comes back as depreciation recapture: the portion of your gain created by the basis reduction is taxed at your ordinary rate up to a 25% cap, separately from the long-term capital gains rate on the rest. On a rental that claimed roughly $7,000 a year for ten years, that's about $70,000 of recaptured depreciation and up to $17,500 of tax at sale. Deferral tools exist — a 1031 exchange carries the basis forward, and holding until death steps up basis for heirs — but on an ordinary sale, recapture is part of the exit math and should be underwritten from day one.",
  },
];

export default function RentalPropertyDepreciationPost() {
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
      {
        "@type": "ListItem",
        position: 3,
        name: TITLE_PLAIN,
        item: canonicalUrl,
      },
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
              How to calculate depreciation on a rental property: the 27.5-year
              math, step by step (2026)
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
              Depreciation is usually the largest single deduction a rental
              investor gets — bigger than repairs, insurance, and property
              management combined — and it&apos;s the only one that costs no
              cash. It&apos;s also the deduction investors most often compute
              wrong: the land split guessed at, the closing costs left out of
              basis, the first-year convention ignored. The calculation is three
              steps — build the depreciable basis, carve out the land, divide by
              27.5 years with a mid-month adjustment in year one — and this
              guide works all three on a $250,000 duplex, then follows the
              number through your tax return: how a property that puts $200 a
              month in your pocket shows a loss to the IRS, what the deduction
              is worth in your bracket, and the allowed-or-allowable trap that
              bills you at sale for deductions you never claimed.
            </p>
          </header>

          <div className="prose prose-neutral max-w-none text-foreground space-y-6 leading-relaxed">
            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              What depreciation actually is (and why 27.5 years)
            </h2>
            <p>
              The tax code treats a rental building as a machine that wears out:
              you bought an income-producing asset with a finite life, so you
              deduct its cost gradually over that life instead of all at once.
              For residential rental property, Congress set that life at{" "}
              <strong>27.5 years</strong>, recovered on a straight line —
              roughly{" "}
              <strong>3.636% of the building&apos;s cost every year</strong>.
              Two things in the purchase never depreciate: the{" "}
              <strong>land</strong> (dirt doesn&apos;t wear out, in the
              IRS&apos;s view) and your own labor. Everything else about the
              deduction follows from one number, the{" "}
              <strong>depreciable basis</strong> — so that&apos;s where the math
              starts. Get basis right and the rest is division; get it wrong and
              every year of the schedule inherits the error.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              Step 1 — build the depreciable basis
            </h2>
            <p>
              Basis starts with the purchase price and adds the costs of{" "}
              <em>acquiring</em> the property: title insurance, transfer taxes,
              recording and legal fees, survey costs. It does{" "}
              <strong>not</strong> include the costs of obtaining the loan —
              points, origination, and lender fees amortize separately over the
              loan term — and it doesn&apos;t include prepaid taxes or insurance
              escrows, which are operating items. (The{" "}
              <Link
                href="/blog/closing-costs-investment-property"
                className="text-primary font-semibold hover:underline"
              >
                closing costs breakdown
              </Link>{" "}
              sorts every line on the settlement statement into these buckets.)
              Concretely: you buy a duplex for <strong>$250,000</strong> and
              your capitalizable closing costs — title, transfer tax, legal,
              recording — come to <strong>$6,000</strong>. Your total basis is{" "}
              <strong>$256,000</strong>. Investors who skip this step and
              depreciate the bare purchase price donate the deduction on that
              $6,000 — about $218 a year, every year, for 27.5 years.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              Step 2 — carve out the land
            </h2>
            <p>
              Only the building depreciates, so you need a defensible split
              between land and improvements. The standard method is the{" "}
              <strong>tax assessor&apos;s ratio</strong>: your county already
              splits its assessment into land and improvement values, and you
              apply that percentage to your actual basis. Say the assessment
              shows land at $50,000 of a $200,000 total —{" "}
              <strong>25% land</strong>. Applied to the $256,000 basis: $64,000
              of land, and a depreciable building basis of{" "}
              <strong>$192,000</strong>. An appraisal with a line-item land
              value works too; picking a flattering number with no support does
              not.
            </p>
            <p>
              The ratio matters more than most investors realize, because it
              scales the deduction linearly for three decades. At 20% land, the
              building basis is $204,800 and the annual deduction{" "}
              <strong>$7,447</strong>; at 25%, $192,000 and{" "}
              <strong>$6,982</strong>; at 30%, $179,200 and{" "}
              <strong>$6,516</strong>. That&apos;s a{" "}
              <strong>$931-a-year swing</strong> between the 20% and 30%
              assumptions — roughly $220 of real tax annually in a 24% bracket,
              compounding over the life of the hold. In dense coastal metros the
              assessor may put land at 40% or more; in much of the Midwest
              it&apos;s 10–15%. Use your parcel&apos;s actual ratio, not a rule
              of thumb.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              Step 3 — divide by 27.5 (and the mid-month convention)
            </h2>
            <p>
              From year two onward the math is one line:{" "}
              <strong>$192,000 ÷ 27.5 = $6,982 a year</strong> — $582 a month of
              deduction for owning the same building. Year one is smaller,
              because residential rental uses the{" "}
              <strong>mid-month convention</strong>: the property is treated as
              placed in service at the midpoint of the month it was ready and
              available to rent, no matter the actual day. Place the duplex in
              service in <strong>March</strong> and year one counts 9.5 months:
              $192,000 × 3.636% × 9.5/12 ≈ <strong>$5,528</strong>. A January
              start yields about $6,691; a December closing gets half a month,
              about <strong>$291</strong>. Note the trigger is{" "}
              <em>ready and available</em> — the day the unit is habitable and
              listed, not the day a lease starts. If you close in October and
              advertise in November, depreciation starts in November even if the
              tenant moves in come January.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              What it does to your taxes: the paper-loss bridge
            </h2>
            <p>
              Now follow the number through the return. Suppose the duplex,
              financed with 25% down at 7%, clears about{" "}
              <strong>+$200 a month</strong> after vacancy, operating expenses,
              and the mortgage — $2,400 a year of real cash flow (pressure-test
              your own deal&apos;s number in the{" "}
              <Link
                href="/#main"
                className="text-primary font-semibold hover:underline"
              >
                TrueCap analyzer
              </Link>
              ). Taxable income is a different animal: start from cash flow, add
              back the ~<strong>$1,900</strong> of year-one principal paydown
              (cash out the door, but not deductible), then subtract{" "}
              <strong>$6,982</strong> of depreciation. Result: $2,400 + $1,900 −
              $6,982 = <strong>−$2,682</strong>. The property pays you $2,400 in
              cash and reports a $2,682 modeled loss before applying
              taxpayer-level limitations. Multiplying the $6,982 deduction by an
              assumed 24% rate produces $1,676, but that is only a rate
              sensitivity—not a current tax-saving estimate. Whether any loss is
              usable now depends on passive-activity, basis, at-risk,
              personal-use, and other rules. The{" "}
              <Link
                href="/blog/schedule-e-rental-property"
                className="text-primary font-semibold hover:underline"
              >
                Schedule E walkthrough
              </Link>{" "}
              traces that bridge line by line; a qualified adviser can apply it
              to your return and holding structure.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              Improvements, repairs, and the shorter schedules
            </h2>
            <p>
              The 27.5-year clock covers what you bought. What you spend
              afterward splits three ways. <strong>Repairs</strong> — fixing
              what broke, at comparable quality — deduct in full the year you
              pay them. <strong>Improvements</strong> — a new roof, an addition,
              a full kitchen renovation — are capitalized and start their{" "}
              <em>own</em> 27.5-year schedules from their in-service dates: a
              $12,000 roof in year three adds $436 a year, on its own clock,
              alongside the building&apos;s. And some components aren&apos;t
              27.5-year property at all:{" "}
              <strong>
                appliances, carpet, and furniture recover over 5 years; fences,
                driveways, and landscaping over 15
              </strong>
              . Two practical escape hatches keep small items out of the
              capitalization maze: the <strong>de minimis safe harbor</strong>{" "}
              lets you expense items up to $2,500 per invoice line (a $1,800
              fridge is a same-year deduction, not a 5-year schedule), and those
              shorter-life components are exactly what a cost segregation study
              accelerates — the strategy, and what&apos;s restored 100% bonus
              deduction for qualifying property acquired and placed in service
              after January 19, 2025, is covered in the{" "}
              <Link
                href="/blog/bonus-depreciation-rental-property-2026"
                className="text-primary font-semibold hover:underline"
              >
                bonus depreciation guide
              </Link>
              .
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              The allowed-or-allowable trap
            </h2>
            <p>
              Here&apos;s the part that makes depreciation mandatory in
              everything but name: when you sell, the IRS reduces your basis by
              the depreciation that was <strong>allowed or allowable</strong> —
              the deductions you were <em>entitled</em> to, whether or not you
              claimed them. Skip depreciation for ten years on the duplex and
              you still owe{" "}
              <Link
                href="/blog/depreciation-recapture-rental-property"
                className="text-primary font-semibold hover:underline"
              >
                depreciation recapture
              </Link>{" "}
              — at up to 25% — on roughly $70,000 of deductions you never took.
              Worst of both worlds: no annual benefit, full exit bill. If
              you&apos;ve been under-claiming, the repair is{" "}
              <strong>Form 3115</strong>, a change in accounting method that
              catches up all missed depreciation as a single deduction in the
              current year — one of the few genuinely retroactive fixes in the
              tax code, and well worth a CPA&apos;s fee. The same logic means
              depreciation belongs in your underwriting from day one: it&apos;s
              a real return stream while you hold and a real liability when you
              exit, and deals should be compared with both sides priced in.
              (Depreciation is also just one of the fourteen deductions on the
              schedule — the{" "}
              <Link
                href="/blog/rental-property-tax-deductions"
                className="text-primary font-semibold hover:underline"
              >
                full deduction list
              </Link>{" "}
              covers the rest.)
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              Five mistakes investors make with depreciation
            </h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>
                  Depreciating the purchase price instead of the basis.
                </strong>{" "}
                Leaving out capitalizable closing costs forfeits real
                deductions; leaving <em>in</em> the land invites an audit
                adjustment. Build basis first, split second.
              </li>
              <li>
                <strong>Guessing the land ratio.</strong> A 20%-vs-30% land
                assumption moves the deduction $931 a year on this duplex. Pull
                the assessor&apos;s actual split for your parcel — it takes five
                minutes and it&apos;s the number that survives scrutiny.
              </li>
              <li>
                <strong>Starting the clock at lease signing.</strong> The
                in-service date is when the unit is ready and advertised, not
                when rent starts flowing. A November listing with a January
                move-in is two extra months of deduction.
              </li>
              <li>
                <strong>
                  Capitalizing repairs (or expensing improvements).
                </strong>{" "}
                A $400 water heater repair is a same-year deduction; a $12,000
                roof is a 27.5-year asset. Misclassifying in either direction
                misstates income — and the de minimis safe harbor exists
                precisely so small items stay simple.
              </li>
              <li>
                <strong>
                  Skipping depreciation to &quot;avoid recapture later.&quot;
                </strong>{" "}
                Recapture is computed on allowed <em>or allowable</em>{" "}
                depreciation — you pay it either way. Not claiming the deduction
                is pure loss.
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
              Depreciation is three steps of arithmetic sitting on one carefully
              built number: purchase price plus acquisition costs, minus the
              assessor&apos;s land share, divided by 27.5 — with a mid-month
              convention in year one. On the worked duplex, simple full-year
              arithmetic produces $6,982 before conventions and limitations.
              That is a deduction input, not cash flow, a promised return, or a
              universal tax saving. Screen the property&apos;s price, rent,
              financing, and operating expenses through the{" "}
              <Link
                href="/"
                className="text-primary font-semibold hover:underline"
              >
                TrueCap analyzer
              </Link>{" "}
              and keep any tax scenario separate until a qualified adviser has
              confirmed basis, eligibility, timing, and limitations. None of
              this is tax advice.
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
