/**
 * Blog post: debt-to-income ratio for an investment property.
 *
 * Targets queries: "debt to income ratio investment property", "does
 * rental income count toward DTI", "how do lenders count rental income",
 * "75% rule rental income", "DTI for rental property", "how much rental
 * income to qualify for a mortgage", "front-end vs back-end DTI",
 * "rental income to offset mortgage payment".
 *
 * Angle: conventional and FHA loans qualify you on DTI, and rental
 * income is counted — but through a 75% vacancy haircut and a
 * net-against-PITIA mechanic that surprises most buyers. The post works
 * the standalone-rental case, the house-hack case (where the same rule
 * runs in your favor), the Schedule E add-back documentation path, and
 * the DSCR-loan escape hatch when personal DTI won't clear. This is the
 * canonical explainer the financing cluster points to for "how lenders
 * count rental income."
 */

import type { Metadata } from "next";
import Link from "next/link";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SiteFooter } from "@/components/marketing/site-footer";
import { BlogStickyCta } from "@/components/marketing/blog-sticky-cta";
import { RelatedBlogPosts } from "@/components/marketing/related-blog-posts";
import { NewsletterSignup } from "@/components/marketing/newsletter-signup";
import { getSiteUrl } from "@/lib/site-url";

const SLUG = "debt-to-income-ratio-investment-property";
const TITLE =
  "Debt-to-income ratio for an investment property: how lenders count rental income (2026)";
// SERP-facing title (metadata/og only): kept ≤50 chars so the root
// layout's "%s | TrueCap" template stays inside the ~60-char SERP
// window. The on-page <h1> keeps the longer editorial TITLE.
const SERP_TITLE = "Debt-to-income ratio for investment property";
const DESCRIPTION =
  "Lenders count rental income at 75%, then net it against the payment. Here's the DTI math for a rental, the house-hack version, and the DSCR escape hatch.";
const PUBLISHED_AT = "2026-07-04";
const MODIFIED_AT = "2026-07-04";
const READING_TIME = 11;

export const metadata: Metadata = {
  title: SERP_TITLE,
  description: DESCRIPTION,
  keywords: [
    "debt to income ratio investment property",
    "does rental income count toward DTI",
    "how do lenders count rental income",
    "75% rule rental income",
    "DTI for rental property",
    "how much rental income to qualify",
    "front-end vs back-end DTI",
    "rental income to offset mortgage",
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
    q: "Does rental income count toward my debt-to-income ratio?",
    a: "Yes, but not dollar-for-dollar. For a 1–4 unit property, conventional and FHA lenders count 75% of the gross rent — the 25% haircut covers vacancy and maintenance — then subtract the property's full monthly payment (principal, interest, taxes, insurance, and any HOA). A positive net is added to your income; a negative net is added to your monthly debts. So a rental only helps your DTI when 75% of its rent exceeds its full housing payment.",
  },
  {
    q: "What is the 75% rule for rental income?",
    a: "The 75% rule is the vacancy-and-maintenance factor lenders apply to gross rent when qualifying you. Rather than ask for your actual vacancy history, they discount the rent by a flat 25% and use the remaining 75% as the income figure. On $2,000 of monthly rent, a lender credits $1,500. It applies to the property you are buying and to rentals you already own, and it is the single reason a property that cash-flows in real life can still read as a small negative on a loan application.",
  },
  {
    q: "What DTI do I need to buy an investment property in 2026?",
    a: "Most conventional (Fannie Mae / Freddie Mac) programs cap the back-end ratio around 45%, stretching to 50% when the automated underwriting engine approves the file on strong compensating factors — reserves, credit score, low loan-to-value. FHA is more permissive and can approve above 50%, but only on a property you'll occupy, such as a house hack. If your ratio won't clear those limits, a DSCR loan qualifies on the property's cash flow instead of your personal DTI.",
  },
  {
    q: "How do lenders count rental income if I have no landlord history?",
    a: "For a property you're buying with no prior rental history, the lender orders a market-rent appraisal — Form 1007 for a single unit, Form 1025 for a 2–4 unit — and uses the appraiser's opinion of market rent, generally the lower of that figure and a signed lease. They still apply the 75% factor. Once the rental appears on two years of Schedule E, they switch to the tax-return method that nets your reported income after adding back depreciation and other non-cash items.",
  },
  {
    q: "Does an existing rental hurt my DTI when I buy the next one?",
    a: "It can, but usually less than the raw numbers suggest. Lenders don't use the loss at the bottom of your Schedule E as-is — they add back depreciation, interest, tax, and insurance, then subtract the property's actual payment. Because depreciation is a paper deduction, a rental showing a tax loss often nets to roughly breakeven for qualifying; a cash-flowing one adds income and improves your DTI for the next purchase.",
  },
];

export default function DtiInvestmentPropertyPost() {
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
              A conventional or FHA lender approves you on one ratio above
              almost all others: debt-to-income. And the question that decides
              whether you clear it on an investment property is a specific one —
              how much of the rent does the bank actually let you count?
              Investors assume the answer is &quot;all of it,&quot; reason that a
              rental paying $2,100 a month more than covers a $1,650 payment,
              and are baffled when the loan officer says the property is
              <em> lowering</em> their income. The rule is knowable and the same
              at every lender. Here is how rental income is counted toward DTI in
              2026, the 75% haircut that trips people up, the worked math for a
              standalone rental and a house hack, and what to do when your ratio
              still won&apos;t clear the line.
            </p>
          </header>

          <div className="prose prose-neutral max-w-none text-foreground space-y-6 leading-relaxed">
            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              What DTI actually measures
            </h2>
            <p>
              Debt-to-income ratio is your recurring monthly debt divided by
              your gross (pre-tax) monthly income, expressed as a percentage.
              Lenders look at two versions. The <strong>front-end</strong> ratio
              is just your housing payment over your income. The{" "}
              <strong>back-end</strong> ratio — the one that actually gates the
              loan — adds every other obligation that shows on your credit
              report: the new mortgage plus car loans, student loans, minimum
              credit-card payments, child support, and any other rental
              payments. Groceries, utilities, and insurance you pay out of
              pocket don&apos;t count; only debts do.
            </p>
            <div className="rounded-xl border border-border bg-muted/30 p-5">
              <code className="text-sm sm:text-base text-foreground font-mono">
                Back-end DTI = Total monthly debt payments ÷ Gross monthly income
              </code>
            </div>
            <p>
              In 2026 the ceilings are roughly where they have sat for years.
              Conventional loans backed by Fannie Mae and Freddie Mac generally
              want the back-end ratio at or below <strong>45%</strong>, and will
              stretch toward <strong>50%</strong> when the automated
              underwriting engine blesses the file on the strength of reserves,
              a high credit score, or a low loan-to-value. FHA runs looser —
              its automated system approves well above 50% on the right file —
              but FHA financing is only available on a home you will live in,
              which for an investor means a house hack, not a pure rental. The
              exact cutoff matters less than the mechanism, because the whole
              game on an investment property is how the rent moves the two
              numbers in that fraction.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              The 75% rule: the vacancy haircut every lender applies
            </h2>
            <p>
              Here is the rule that surprises people. A lender does not credit
              you the full rent. On a one-to-four-unit property they count{" "}
              <strong>75% of the gross rent</strong> and throw away the other
              25%. That discount is a standing allowance for vacancy and
              maintenance — the underwriter&apos;s blunt substitute for the{" "}
              <Link
                href="/tools/vacancy-rate-calculator"
                className="text-primary font-semibold hover:underline"
              >
                vacancy and repair reserves
              </Link>{" "}
              you would model yourself. They do not ask for your actual vacancy
              history and they do not care that your unit has been full for three
              years. Every rental, everywhere, gets the same flat 25% haircut.
            </p>
            <p>
              But the 75% is only the first half of the calculation. Once the
              lender has the credited rent, they subtract the property&apos;s
              entire monthly housing cost — principal, interest, taxes,
              insurance, and any HOA dues, together abbreviated{" "}
              <Link
                href="/blog/piti-explained-rental-property"
                className="text-primary font-semibold hover:underline"
              >
                PITIA
              </Link>
              . What is left is your <strong>net rental income</strong>, and its
              sign is everything:
            </p>
            <div className="rounded-xl border border-border bg-muted/30 p-5 space-y-1">
              <code className="block text-sm sm:text-base text-foreground font-mono">
                Net rental income = (0.75 × Gross rent) − PITIA
              </code>
              <code className="block text-sm sm:text-base text-foreground font-mono">
                Positive → added to your income
              </code>
              <code className="block text-sm sm:text-base text-foreground font-mono">
                Negative → added to your debts
              </code>
            </div>
            <p>
              Read that twice, because it is the trap. A rental helps your DTI
              only when 75% of its rent clears its <em>full</em> payment
              including taxes and insurance — not the loan payment alone. Plenty
              of properties that throw off real, positive cash flow still net to
              a small negative on a loan application, because the 25% the lender
              discarded was exactly the margin that made them cash-flow.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              Worked example: buying a standalone rental
            </h2>
            <p>
              Take a $250,000 single-family rental, 25% down, a $187,500 loan at
              7.25% (investment-property rates run a little above owner-occupied)
              over 30 years. The principal-and-interest payment is about $1,279 a
              month — you can confirm it on the{" "}
              <Link
                href="/tools/mortgage-payment-calculator"
                className="text-primary font-semibold hover:underline"
              >
                mortgage payment calculator
              </Link>{" "}
              — plus $250 of property tax and $125 of landlord insurance, for a
              PITIA of <strong>$1,654</strong>. It rents for $2,100.
            </p>
            <div className="rounded-xl border border-border bg-muted/30 p-5 space-y-1">
              <code className="block text-sm sm:text-base text-foreground font-mono">
                Credited rent = 0.75 × $2,100 = $1,575
              </code>
              <code className="block text-sm sm:text-base text-foreground font-mono">
                Net rental income = $1,575 − $1,654 = −$79/mo
              </code>
            </div>
            <p>
              That $79 shortfall gets added to your monthly debts. Now suppose
              you earn $8,000 a month gross and already carry $3,100 of other
              obligations — your own home&apos;s payment, a car note, and student
              loans. Fold the rental in:
            </p>
            <div className="rounded-xl border border-border bg-muted/30 p-5">
              <code className="text-sm sm:text-base text-foreground font-mono">
                DTI = ($3,100 + $79) ÷ $8,000 = 39.7%
              </code>
            </div>
            <p>
              At 39.7% you clear a conventional 45% ceiling with room to spare —
              the deal finances. But notice what the property did: it added
              nothing to your income and a small drag to your debt, despite
              renting for $446 a month more than its payment. In your own{" "}
              <Link
                href="/tools/cash-on-cash-calculator"
                className="text-primary font-semibold hover:underline"
              >
                cash-on-cash math
              </Link>{" "}
              that $446 is real money; to the lender it evaporated in the 25%
              haircut. The property is a strong performer that reads as neutral
              on the application.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              What the 25% haircut actually costs you
            </h2>
            <p>
              To see the haircut&apos;s bite, run the same property both ways —
              once crediting the full rent, once at 75%:
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-left">Method</th>
                    <th className="text-right">Credited rent</th>
                    <th className="text-right">Net vs PITIA</th>
                    <th className="text-right">Resulting DTI</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Full rent (100%)</td>
                    <td className="text-right">$2,100</td>
                    <td className="text-right">+$446 → income</td>
                    <td className="text-right">36.7%</td>
                  </tr>
                  <tr>
                    <td>Lender method (75%)</td>
                    <td className="text-right">$1,575</td>
                    <td className="text-right">−$79 → debt</td>
                    <td className="text-right">39.7%</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p>
              Three points of DTI hang on that one convention. On a thin file —
              a borrower already in the low 40s — three points is the difference
              between approval and denial. It is also why you should never assume
              the rent &quot;covers itself&quot;: underwrite your qualifying
              income the way the underwriter will — 75% of rent, minus the whole
              payment, and only the leftover moves the needle.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              House hacking flips the same rule in your favor
            </h2>
            <p>
              The 75% rule feels like a tax until you buy a property you live in.
              On an owner-occupied two-to-four unit — the classic{" "}
              <Link
                href="/blog/house-hacking-explained"
                className="text-primary font-semibold hover:underline"
              >
                house hack
              </Link>{" "}
              — the rent from the units you don&apos;t occupy is credited at 75%
              and added straight to your income, while the full building payment
              counts as your housing expense. That added income is often what
              makes an otherwise-unaffordable payment qualify.
            </p>
            <p>
              Say you buy a $350,000 duplex with 5% down on an owner-occupied
              conventional loan — a $332,500 loan at 6.75%, about $2,157 in
              principal and interest, plus $365 tax, $150 insurance, and $139 of
              PMI for low-down-payment financing: a $2,810 PITIA. You live in one
              side; the other rents for $1,700.
            </p>
            <div className="rounded-xl border border-border bg-muted/30 p-5 space-y-1">
              <code className="block text-sm sm:text-base text-foreground font-mono">
                Rental credit = 0.75 × $1,700 = $1,275 → added to income
              </code>
              <code className="block text-sm sm:text-base text-foreground font-mono">
                Qualifying income = $6,500 + $1,275 = $7,775/mo
              </code>
            </div>
            <p>
              With $700 of other monthly debts, your back-end ratio is
              ($2,810 + $700) ÷ $7,775 = <strong>45.2%</strong> — squeaking under
              the wire with automated approval. Strip the rental credit out and
              qualify on your $6,500 salary alone, and the same ratio balloons to
              <strong> 54%</strong>, well past any conventional or FHA ceiling.
              The tenant&apos;s rent is the entire reason the loan works. This is
              the structural edge house hacking has over a standalone rental
              purchase: the rent counts as income against a low owner-occupant
              down payment, instead of merely netting against the payment on an
              investment loan.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              How you prove the rent
            </h2>
            <p>
              The lender won&apos;t take your word for the rent figure. Which
              document they rely on depends on whether the property has a track
              record:
            </p>
            <p>
              <strong>A property you&apos;re buying, no history.</strong> The
              appraiser fills out a market-rent addendum — Form 1007 for a single
              unit, Form 1025 for a 2–4 unit — giving an independent opinion of
              market rent. The lender generally uses the lower of that figure and
              a signed lease, then applies the 75% — so a below-market lease you
              inherit from the seller can cap your qualifying income even when the
              unit is worth more.
            </p>
            <p>
              <strong>A rental you already own.</strong> Once the property has
              appeared on two years of{" "}
              <Link
                href="/blog/schedule-e-rental-property"
                className="text-primary font-semibold hover:underline"
              >
                Schedule E
              </Link>
              , the lender switches to your tax returns — and this is where new
              landlords panic for no reason. They don&apos;t use the loss at the
              bottom of the schedule. They start from your reported net income
              and <strong>add back</strong> the non-cash and already-counted
              lines:{" "}
              <Link
                href="/blog/rental-property-tax-deductions"
                className="text-primary font-semibold hover:underline"
              >
                depreciation
              </Link>
              , mortgage interest, property taxes, insurance, HOA dues, and
              one-time expenses — then subtract the property&apos;s actual
              payment. Because depreciation never left your bank account, a
              rental showing a $5,200 tax <em>loss</em> can add back roughly
              $23,000 and net to about breakeven for qualifying — a wash, not a
              weight. A profitable rental adds income and makes your{" "}
              <em>next</em> purchase easier.
            </p>
            <p>
              One thing DTI doesn&apos;t capture but your lender checks
              separately: <strong>reserves.</strong> Financed investment
              properties typically require several months of PITIA in the bank
              per property — it won&apos;t change your ratio, but a file that
              clears DTI can still stall without them.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              When DTI blocks you: the DSCR escape hatch
            </h2>
            <p>
              Sooner or later a serious investor hits the wall. You add a fourth
              or fifth financed property, your back-end ratio creeps past 50%
              even with the rent counted, and the conventional door closes — not
              because the deals are bad, but because your personal income
              can&apos;t stretch over that much debt on paper. That is precisely
              the problem{" "}
              <Link
                href="/blog/dscr-loans-explained"
                className="text-primary font-semibold hover:underline"
              >
                DSCR loans
              </Link>{" "}
              exist to solve. A DSCR lender ignores your personal DTI entirely
              and qualifies the loan on the property&apos;s own coverage —
              whether its rent covers its debt service, measured by the{" "}
              <Link
                href="/tools/dscr-calculator"
                className="text-primary font-semibold hover:underline"
              >
                debt-service-coverage ratio
              </Link>
              . No pay stubs, no tax returns, no ratio built from your salary.
            </p>
            <p>
              You pay for that freedom: DSCR loans usually run half a point to a
              point and a half above a comparable conventional loan and want more
              down. But once DTI is the binding constraint, the trade is often
              what separates a portfolio that stops at three doors from one that
              keeps growing. The{" "}
              <Link
                href="/blog/hard-money-vs-dscr-loan"
                className="text-primary font-semibold hover:underline"
              >
                choice between hard money and a DSCR loan
              </Link>{" "}
              turns on the same idea — matching the loan product to which
              constraint is actually binding, your income or the deal&apos;s
              economics.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              Five ways to get under the line
            </h2>
            <p>
              If a conventional approval is close but not there, the levers are
              mechanical. <strong>Pay down or pay off a revolving debt</strong> —
              killing a $450 car payment does more per dollar than shaving the
              purchase price, because it strikes the numerator directly.{" "}
              <strong>Put more down</strong> to shrink the payment, which lowers
              the PITIA in the rental calculation and, on a house hack, your
              housing expense. <strong>Buy the property with the best
              rent-to-payment ratio</strong>, since a rental whose 75%-credited
              rent clears its PITIA flips from a debt to an income line.{" "}
              <strong>Document all your income</strong> — bonus, overtime, and
              side income a lender averages over two years all enlarge the
              denominator. And when none of that is enough,{" "}
              <strong>step to a DSCR loan.</strong> Notice the first three are the
              same move you make when you{" "}
              <Link
                href="/blog/how-much-down-payment-investment-property"
                className="text-primary font-semibold hover:underline"
              >
                size a down payment
              </Link>
              : less debt, smaller payment, better coverage.
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
              Rental income counts toward your debt-to-income ratio, but through
              a specific and unforgiving filter: 75% of the gross rent, minus the
              property&apos;s entire payment, with only the leftover moving your
              ratio — up if it&apos;s positive, down if it&apos;s negative. On a
              standalone rental that usually nets close to zero, so the property
              you thought would boost your borrowing power mostly just avoids
              hurting it. On a house hack the same rule runs the other way and
              the tenant&apos;s rent becomes the income that makes the loan
              possible. Underwrite your qualifying income the way the underwriter
              will before you ever call a lender, and when your personal ratio
              becomes the ceiling, remember the deal itself can still qualify on
              a DSCR loan. The{" "}
              <Link href="/" className="text-primary font-semibold hover:underline">
                TrueCap analyzer
              </Link>{" "}
              runs the property&apos;s payment, coverage, and cash flow off the
              same inputs a lender will use, so you can see how a deal reads on an
              application before you fill one out. None of this is lending or
              financial advice — confirm the exact guidelines with your loan
              officer against your own file before you make an offer.
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
