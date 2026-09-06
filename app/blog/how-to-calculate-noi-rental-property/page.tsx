/**
 * How-to blog post — How to calculate NOI (net operating income).
 *
 * Targets high-intent calculator-adjacent queries:
 *   - "how to calculate noi"
 *   - "net operating income formula"
 *   - "what is noi in real estate"
 *   - "noi rental property"
 *   - "noi vs cash flow"
 *   - "net operating income calculator"
 *   - "does noi include mortgage"
 *   - "operating expenses rental property"
 *
 * NOI is the hub metric: cap rate, DSCR, and the income-approach
 * valuation of 5+ unit buildings all key off it. This post fills the
 * gap between the noi-calculator tool and the cap-rate / DSCR posts.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { BlogStickyCta } from "@/components/marketing/blog-sticky-cta";
import { RelatedBlogPosts } from "@/components/marketing/related-blog-posts";
import { RelatedContent } from "@/components/marketing/related-content";
import { NewsletterSignup } from "@/components/marketing/newsletter-signup";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SiteFooter } from "@/components/marketing/site-footer";
import { getSiteUrl } from "@/lib/site-url";

const SLUG = "how-to-calculate-noi-rental-property";
const TITLE =
  "How to calculate NOI (net operating income) on a rental property — 2026 guide";
// SERP-facing title (metadata/og only): kept ≤50 chars so the root
// layout's "%s | TrueCap" template stays inside the ~60-char SERP
// window. The on-page <h1> keeps the longer editorial TITLE.
const SERP_TITLE = "How to calculate NOI on a rental property (2026)";
const DESCRIPTION =
  "NOI = gross income minus operating expenses, before the mortgage. The formula, a full $250K duplex worked example, and how NOI drives cap rate and DSCR.";
const PUBLISHED_AT = "2026-06-16";
const MODIFIED_AT = "2026-06-16";
const READING_TIME_MIN = 10;

export const metadata: Metadata = {
  title: SERP_TITLE,
  description: DESCRIPTION,
  keywords: [
    "how to calculate noi",
    "net operating income formula",
    "what is noi in real estate",
    "noi rental property",
    "noi vs cash flow",
    "net operating income calculator",
    "does noi include mortgage",
    "operating expenses rental property",
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
    q: "What is the NOI formula in one line?",
    a: "NOI = effective gross income − operating expenses. Effective gross income is gross potential rent minus vacancy and credit loss, plus any other income (laundry, pet rent, storage). Operating expenses are everything it costs to run the building — taxes, insurance, management, maintenance, reserves, owner-paid utilities — but NOT the mortgage, depreciation, or income tax. NOI is a pre-financing, pre-tax number.",
  },
  {
    q: "Does NOI include the mortgage payment?",
    a: "No. The mortgage (principal and interest) is debt service, not an operating expense. NOI is deliberately financing-blind so that two buyers looking at the same building — one paying cash, one borrowing 75% — compute the same NOI. Subtract debt service from NOI and you get pre-tax cash flow, which is a different number. If a broker's NOI looks suspiciously high, check whether they also quietly left out vacancy, management, and reserves.",
  },
  {
    q: "Does NOI include capital expenditures (CapEx) and maintenance reserves?",
    a: "Maintenance is always an operating expense. CapEx is the gray area. Purists and conservative underwriters fund a CapEx reserve inside NOI; appraisers and most commercial lenders treat CapEx as a below-the-line capital item and leave it out of NOI. Both are defensible — just be consistent and know which convention a quoted cap rate assumes. The cash leaving your account is identical either way; only the label and the cap rate change.",
  },
  {
    q: "What is the difference between NOI and cash flow?",
    a: "NOI is the building's income before financing. Cash flow is what is left after the mortgage: cash flow = NOI − annual debt service (and minus any one-time capital projects). A property can have a healthy positive NOI and still be cash-flow negative if it is highly leveraged or the interest rate is above the cap rate. NOI measures the asset; cash flow measures your position in it.",
  },
  {
    q: "What is a good NOI?",
    a: "NOI is an absolute dollar figure, not a ratio, so there is no universal 'good' number. Relate it to price through cap rate and review the operating-expense ratio, but do not use a generic expense band as proof. An unusually low modeled expense ratio is a prompt to verify taxes, insurance, utilities, management, maintenance, vacancy, and capital needs against property evidence.",
  },
  {
    q: "How does NOI set the value of a small apartment building?",
    a: "For 5+ unit and commercial property, value = NOI ÷ market cap rate. At a 6.5% market cap, every $1 of recurring annual NOI is worth about $15.40 of value, so a $2,400/year rent increase that drops ~$2,200 to NOI can add roughly $34,000 in value. (One-to-four-unit homes are still valued mostly by sales comps, not NOI — but NOI is what tells you whether the comp price actually cash-flows.)",
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
  const howToLd = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How to calculate NOI on a rental property",
    description:
      "Five-step process to compute net operating income correctly: build effective gross income, subtract every operating expense, and stop before the mortgage.",
    step: [
      {
        "@type": "HowToStep",
        name: "Start with gross potential rent",
        text: "Monthly market rent for every unit × 12. Use signed-lease rent if occupied, comparable market rent if vacant.",
      },
      {
        "@type": "HowToStep",
        name: "Subtract vacancy and credit loss",
        text: "Typically 5–8% of gross rents to cover turnover gaps and the occasional non-paying tenant.",
      },
      {
        "@type": "HowToStep",
        name: "Add other income",
        text: "Laundry, pet rent, storage, parking, application fees — small but real.",
      },
      {
        "@type": "HowToStep",
        name: "Subtract operating expenses",
        text: "Taxes, insurance, management, maintenance, reserves, owner-paid utilities, HOA, lawn/snow. NOT the mortgage, depreciation, or income tax.",
      },
      {
        "@type": "HowToStep",
        name: "The result is NOI",
        text: "Effective gross income minus operating expenses equals net operating income — the pre-financing earning power of the building.",
      },
    ],
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToLd) }}
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
          <p className="text-base sm:text-lg text-muted-foreground mt-4 leading-relaxed">
            Net operating income is the number every other rental metric is
            built on — cap rate, DSCR, and the value of any 5+ unit building all
            key off it. Get NOI wrong and everything downstream is wrong too.
            Here&apos;s the formula, a full line-by-line example on a $250K
            duplex, and the two directions people get it wrong.
          </p>
        </header>

        <article className="prose prose-slate max-w-none [&_p]:leading-relaxed [&_p]:text-foreground [&_h2]:font-extrabold [&_h2]:text-foreground [&_h2]:mt-10 [&_h2]:mb-3 [&_h3]:font-bold [&_h3]:text-foreground [&_h3]:mt-6 [&_h3]:mb-2 [&_li]:text-foreground [&_li]:leading-relaxed [&_strong]:text-foreground">
          <h2 className="text-2xl sm:text-3xl">The NOI formula</h2>
          <div className="bg-card border border-border rounded-xl p-5 sm:p-6 my-4 text-center">
            <div className="text-base sm:text-lg font-mono">
              <span className="font-bold">NOI</span> = Effective gross income −
              Operating expenses
            </div>
          </div>
          <p>
            Two moving parts, and the whole game is in defining each one
            honestly. Effective gross income is what the building actually
            collects in a normal year — not the rosy &ldquo;every unit, every
            month, forever&rdquo; number. Operating expenses are everything it
            costs to keep the lights on and the building standing, with one
            giant, deliberate exclusion: the mortgage. NOI stops <em>before</em>{" "}
            debt service. That single rule is what makes NOI useful — it
            describes the property, not your particular loan.
          </p>
          <p>
            Because NOI ignores financing, a cash buyer and a buyer borrowing
            75% compute the exact same NOI on the same building. That is the
            point. Their{" "}
            <Link
              href="/blog/cap-rate-vs-cash-on-cash-vs-dscr"
              className="text-primary font-semibold hover:underline"
            >
              cash-on-cash returns and DSCRs
            </Link>{" "}
            will differ wildly, but the asset&apos;s earning power is one
            number, and that number is NOI.
          </p>

          <h2 className="text-2xl sm:text-3xl">
            Step 1: Build effective gross income
          </h2>
          <p>
            Most people start NOI from gross rent. That is already a mistake,
            because gross potential rent assumes 100% occupancy and 100%
            collection — neither of which happens. Effective gross income (EGI)
            is the realistic top line:
          </p>
          <ul>
            <li>
              <strong>Gross potential rent.</strong> Every unit&apos;s monthly
              market rent × 12. Use the in-place lease rent if it is occupied
              and at market; use comparable rents if it is vacant or
              under-rented.
            </li>
            <li>
              <strong>Minus vacancy and credit loss.</strong> Even a great
              property turns over. A reasonable default is 5–8% of gross rents —
              and you should{" "}
              <Link
                href="/blog/vacancy-rate-rental-property"
                className="text-primary font-semibold hover:underline"
              >
                derive vacancy from turnover math
              </Link>{" "}
              rather than guessing 5%. Credit loss (a tenant who stops paying
              before you evict) lives in the same line.
            </li>
            <li>
              <strong>Plus other income.</strong> Coin laundry, pet rent,
              parking, storage, application and late fees. Individually small,
              but on a multi-unit it adds up and it is real, recurring income.
            </li>
          </ul>
          <p>
            EGI is gross potential rent, minus the rent you will not collect,
            plus the non-rent dollars you will. It is the honest number every
            operating expense gets measured against.
          </p>

          <h2 className="text-2xl sm:text-3xl">
            Step 2: Subtract every operating expense
          </h2>
          <p>
            An operating expense is any recurring cost of running the property.
            The list is longer than most pro formas admit, and the omitted lines
            are exactly the ones that make a deal look better than it is:
          </p>
          <ul>
            <li>
              <strong>Property taxes.</strong> Use the figure you will actually
              pay — many jurisdictions reassess to the sale price, so the
              seller&apos;s current bill can understate yours badly.
            </li>
            <li>
              <strong>Insurance.</strong> A landlord (dwelling) policy, not a
              homeowner&apos;s policy. Premiums have jumped in much of the
              country; get a real quote, do not copy the seller&apos;s.
            </li>
            <li>
              <strong>Property management.</strong> Typically 8–10% of collected
              rent. Budget it even if you self-manage — your time is not free,
              and you will eventually want to hand the property off.
            </li>
            <li>
              <strong>Maintenance and repairs.</strong> Turn-make-ready, the
              leaky valve, the failed appliance. A common default is 5–10% of
              rent, or a per-door dollar figure scaled to the building&apos;s
              age.
            </li>
            <li>
              <strong>Owner-paid utilities.</strong> Water, sewer, and trash are
              frequently the landlord&apos;s on small multifamily; common-area
              electric and gas too. Submetered or tenant-paid? Then it is zero —
              but confirm, do not assume.
            </li>
            <li>
              <strong>
                HOA / condo dues, lawn, snow, pest control, licensing,
                bookkeeping.
              </strong>{" "}
              The miscellaneous tail that individually looks trivial and
              collectively is not.
            </li>
          </ul>
          <p>
            The one genuinely debated line is the{" "}
            <Link
              href="/blog/capex-maintenance-reserves-rental-property"
              className="text-primary font-semibold hover:underline"
            >
              CapEx reserve
            </Link>{" "}
            — money set aside for the roof, HVAC, water heater, and kitchen that
            wear out on a multi-year clock. We will treat it two ways in the
            example below, because how you classify it changes the cap rate you
            quote (though not the cash that leaves your account).
          </p>

          <h2 className="text-2xl sm:text-3xl">What is NOT in NOI</h2>
          <p>
            Four things people wrongly subtract. Memorize the exclusions and you
            will out-underwrite half the listings you read:
          </p>
          <ul>
            <li>
              <strong>The mortgage (principal &amp; interest).</strong> Debt
              service is financing, not operations. It comes out <em>after</em>{" "}
              NOI to get cash flow.
            </li>
            <li>
              <strong>Depreciation.</strong> A non-cash tax deduction. It
              belongs on your{" "}
              <Link
                href="/blog/schedule-e-rental-property"
                className="text-primary font-semibold hover:underline"
              >
                Schedule E
              </Link>
              , not in NOI.
            </li>
            <li>
              <strong>Income tax.</strong> NOI is pre-tax by definition. Your
              personal tax situation does not change the building&apos;s NOI.
            </li>
            <li>
              <strong>One-time capital projects.</strong> Replacing the roof
              this year is a capital event, not an annual operating cost. (The
              recurring <em>reserve</em> for that roof is the gray area; the
              lump-sum replacement is clearly below the line.)
            </li>
          </ul>

          <h2 className="text-2xl sm:text-3xl">
            Worked example: a $250K duplex
          </h2>
          <p>
            Two units at $1,250/month each, $250,000 purchase price. Let&apos;s
            build NOI from the top down.
          </p>
          <h3>Effective gross income</h3>
          <ul>
            <li>
              Gross potential rent: $2,500 × 12 = <strong>$30,000</strong>
            </li>
            <li>Vacancy &amp; credit loss (6%): −$1,800</li>
            <li>Other income (laundry): +$300</li>
            <li>
              <strong>Effective gross income: $28,500</strong>
            </li>
          </ul>
          <h3>Operating expenses</h3>
          <ul>
            <li>Property taxes: −$3,600</li>
            <li>Insurance: −$1,500</li>
            <li>Management (8% of collected rent): −$2,250</li>
            <li>Maintenance &amp; repairs: −$1,800</li>
            <li>CapEx reserve: −$2,500</li>
            <li>Owner-paid water / sewer / trash: −$1,500</li>
            <li>Lawn / snow / pest: −$600</li>
            <li>Licensing / bookkeeping: −$450</li>
            <li>
              <strong>Total operating expenses: $14,200</strong>
            </li>
          </ul>
          <div className="bg-card border border-border rounded-xl p-5 sm:p-6 my-4 text-center">
            <div className="text-base sm:text-lg font-mono">
              <span className="font-bold">NOI</span> = $28,500 − $14,200 ={" "}
              <span className="font-bold">$14,300</span>
            </div>
          </div>
          <p>
            That $14,300 is the building&apos;s pre-financing earning power.
            Note the operating expense ratio: $14,200 ÷ $28,500 =
            <strong> 50%</strong>. That is right in the normal band for a small,
            owner-paid-utility multifamily — which is the quick sanity check
            that tells you no big line item got skipped. The old{" "}
            <Link
              href="/blog/50-percent-rule-rentals"
              className="text-primary font-semibold hover:underline"
            >
              50% rule
            </Link>{" "}
            is exactly this expense-ratio heuristic in disguise.
          </p>

          <h2 className="text-2xl sm:text-3xl">
            The CapEx classification trap
          </h2>
          <p>
            Watch what happens to the same building under the two conventions:
          </p>
          <ul>
            <li>
              <strong>Owner / conservative view:</strong> fund the $2,500 CapEx
              reserve inside NOI. NOI = $14,300, cap rate = $14,300 ÷ $250,000 ={" "}
              <strong>5.7%</strong>.
            </li>
            <li>
              <strong>Appraiser / lender view:</strong> CapEx is a below-NOI
              capital item. NOI = $16,800, cap rate = <strong>6.7%</strong>.
            </li>
          </ul>
          <p>
            Same property, two cap rates a full point apart — and the entire
            difference is one $2,500 line and where you file it. Neither is
            &ldquo;wrong.&rdquo; What is wrong is comparing a broker&apos;s 6.7%
            (reserves excluded) against your own 5.7% (reserves included) and
            concluding the broker&apos;s deal is better. When you read a cap
            rate, always ask which NOI it sits on. Crucially, the actual cash
            you must set aside for that roof is $2,500 either way — the
            classification is a labeling choice, not a cash choice.
          </p>

          <h2 className="text-2xl sm:text-3xl">
            NOI drives cap rate, DSCR, and value
          </h2>
          <p>
            NOI is not an end in itself; it is the input to the three numbers
            that actually decide deals.
          </p>
          <h3>Cap rate = NOI ÷ price</h3>
          <p>
            We just did it: $14,300 ÷ $250,000 = 5.7%. That is the unleveraged
            yield, and it is how you compare two buildings on equal footing. The
            full method — and the tricks brokers use to inflate it — is in{" "}
            <Link
              href="/blog/how-to-calculate-cap-rate"
              className="text-primary font-semibold hover:underline"
            >
              how to calculate cap rate
            </Link>
            .
          </p>
          <h3>DSCR = NOI ÷ debt service</h3>
          <p>
            Finance the duplex with 25% down ($62,500) at 7% on a 30-year loan
            and the principal-and-interest payment is about $1,247/month, or
            $14,970/year. Honest DSCR = $14,300 ÷ $14,970 ={" "}
            <strong>0.96</strong> — under 1.0, meaning the building does not
            quite cover its own mortgage once you fund real reserves. Yet a{" "}
            <Link
              href="/blog/dscr-loans-explained"
              className="text-primary font-semibold hover:underline"
            >
              DSCR lender
            </Link>{" "}
            who computes coverage as gross rent ÷ PITIA gets $2,500 ÷ $1,672 ={" "}
            <strong>1.50</strong> and happily approves it. The gap between 0.96
            and 1.50 is vacancy, management, and reserves — the exact lines the
            lender&apos;s shortcut ignores. Both numbers are &ldquo;DSCR;&rdquo;
            only one reflects how the property will actually live.
          </p>
          <h3>Value = NOI ÷ market cap rate (5+ units)</h3>
          <p>
            For commercial-scale property, NOI literally <em>is</em> the
            valuation. At a 6.5% market cap, value = NOI ÷ 0.065, so every $1 of
            recurring NOI is worth about $15.40 of price. Raise rents $100/month
            on both units — $2,400/year, of which roughly $2,200 survives to NOI
            after a little extra management — and value climbs $2,200 ÷ 0.065 ≈{" "}
            <strong>$34,000</strong>. That multiplier is why operators obsess
            over small, durable NOI gains: on commercial property they are not
            worth their face value, they are worth ~15× their face value.
            (One-to-four-unit homes are still priced by sales comps, so this
            lever is weaker there — but NOI still tells you whether the comp
            price cash-flows.)
          </p>

          <h2 className="text-2xl sm:text-3xl">
            NOI vs cash flow: the last step
          </h2>
          <p>
            NOI is the building; cash flow is your seat in it. Subtract debt
            service from NOI:
          </p>
          <div className="bg-card border border-border rounded-xl p-5 sm:p-6 my-4 text-center">
            <div className="text-base sm:text-lg font-mono">
              Cash flow = $14,300 − $14,970 ={" "}
              <span className="font-bold">−$670 / year</span>
            </div>
          </div>
          <p>
            So this &ldquo;5.7% cap&rdquo; duplex is mildly cash-flow negative
            at 25% down and 7% — not because the building is bad, but because
            the interest rate sits above the cap rate, so leverage works against
            you. This is the difference between analyzing a <em>property</em>{" "}
            (NOI, cap rate) and analyzing an <em>investment</em> (cash flow,
            cash-on-cash, DSCR). You need both. A building with strong NOI and a
            punishing loan can still bleed cash; a thinner-NOI building bought
            right can print it. NOI tells you whether the asset earns; the
            financing tells you whether <em>you</em> do.
          </p>

          <h2 className="text-2xl sm:text-3xl">
            Three ways people get NOI wrong
          </h2>
          <ul>
            <li>
              <strong>Starting from gross rent, not EGI.</strong> Skipping
              vacancy and collection loss inflates NOI before the first expense
              is even subtracted.
            </li>
            <li>
              <strong>Omitting the boring lines.</strong> Management (especially
              when self-managing), reserves, and owner-paid utilities are common
              omissions. An unusually low expense ratio is a prompt to verify
              every property-specific line; no generic band proves the pro forma
              is complete.
            </li>
            <li>
              <strong>Sneaking the mortgage in.</strong> The most common
              beginner error. The moment debt service is inside
              &ldquo;NOI,&rdquo; you have computed something else — and your cap
              rate and any value derived from it are garbage.
            </li>
          </ul>

          <div className="not-prose"></div>

          <p className="text-sm text-muted-foreground mt-6">
            Related reading:{" "}
            <Link
              href="/blog/how-to-calculate-cap-rate"
              className="text-primary font-semibold hover:underline"
            >
              How to calculate cap rate
            </Link>
            ,{" "}
            <Link
              href="/blog/how-to-calculate-dscr"
              className="text-primary font-semibold hover:underline"
            >
              How to calculate DSCR
            </Link>
            ,{" "}
            <Link
              href="/blog/capex-maintenance-reserves-rental-property"
              className="text-primary font-semibold hover:underline"
            >
              CapEx &amp; maintenance reserves
            </Link>
            ,{" "}
            <Link
              href="/glossary/noi"
              className="text-primary font-semibold hover:underline"
            >
              NOI (glossary)
            </Link>
            .
          </p>

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
            Don&apos;t want to assemble the OpEx stack by hand? TrueCap builds
            NOI from the same line items above, then computes cap rate,
            cash-on-cash, DSCR, and a 10-year projection in one pass — and flags
            the expenses most calculators quietly skip.{" "}
          </p>
        </footer>
      </main>
      <SiteFooter />
      <ScrollDepthTracker />
      <BlogStickyCta />
    </div>
  );
}
