/**
 * Blog post: How to read a rent roll.
 *
 * Targets queries: "rent roll", "how to read a rent roll", "what is a
 * rent roll", "rent roll meaning", "rent roll real estate", "rent roll
 * example", "rent roll template", "how to verify a rent roll", "rent
 * roll vs pro forma", "loss to lease".
 */

import type { Metadata } from "next";
import Link from "next/link";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SiteFooter } from "@/components/marketing/site-footer";
import { BlogStickyCta } from "@/components/marketing/blog-sticky-cta";
import { RelatedBlogPosts } from "@/components/marketing/related-blog-posts";
import { NewsletterSignup } from "@/components/marketing/newsletter-signup";
import { getSiteUrl } from "@/lib/site-url";

const SLUG = "how-to-read-a-rent-roll";
const TITLE =
  "How to read a rent roll: verify a rental's income before you buy (2026)";
// SERP-facing title (metadata/og only): kept ≤50 chars so the root
// layout's "%s | TrueCap" template stays inside the ~60-char SERP
// window. The on-page <h1> keeps the longer editorial TITLE.
const SERP_TITLE = "How to read a rent roll before you buy (2026)";
const DESCRIPTION =
  "How to read a rent roll: a worked fourplex example, the five places rent rolls mislead, and how to verify in-place rent before you buy a rental in 2026.";
const PUBLISHED_AT = "2026-06-30";
const MODIFIED_AT = "2026-06-30";
const READING_TIME = 11;

export const metadata: Metadata = {
  title: SERP_TITLE,
  description: DESCRIPTION,
  keywords: [
    "rent roll",
    "how to read a rent roll",
    "what is a rent roll",
    "rent roll meaning",
    "rent roll real estate",
    "rent roll example",
    "rent roll template",
    "how to verify a rent roll",
    "rent roll vs pro forma",
    "loss to lease",
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
    q: "What is a rent roll?",
    a: "A rent roll is a snapshot of a rental property's income: one line per unit listing the tenant, lease start and end dates, current monthly rent, the security deposit held, and an occupancy status. For a small multifamily building it is the single most important income document a seller provides, because it shows the rent actually contracted and collected today — not the market rent a listing advertises. A single-family rental has a one-line rent roll; a fourplex has four.",
  },
  {
    q: "What is the difference between a rent roll and a pro forma?",
    a: "A rent roll is fact: the leases in place right now and what they pay. A pro forma is projection: how the seller thinks the property will perform after rents are raised to market and the vacant unit is filled. Sellers price off the pro forma. You should underwrite off the rent roll, then decide which of the pro forma's assumptions you actually believe and what it costs to achieve them.",
  },
  {
    q: "How do you verify a rent roll?",
    a: "Do not take it at face value. As a condition of closing, ask for copies of every lease, the last 12 months of bank deposits or a property-management owner statement, and tenant estoppel certificates — a signed tenant confirmation of their rent, deposit, and lease terms. Cross-check the rent roll's rents against the leases, the leases against the deposits, and the deposits against actual bank activity. Any gap is both a risk and negotiating leverage.",
  },
  {
    q: "What is loss-to-lease?",
    a: "Loss-to-lease is the gap between market rent and the lower rent a sitting tenant actually pays. If a unit would rent for $1,400 but a long-term tenant pays $1,150, the loss-to-lease is $250 a month, or $3,000 a year. It is real 'upside' only if you can realistically raise the rent — which usually means waiting for the lease to expire, a turn, or an eviction, each with a cost and a vacancy gap. Never underwrite loss-to-lease as if it were free money already in the bank.",
  },
  {
    q: "Does a single-family rental have a rent roll?",
    a: "Yes — just a short one: a single line with the tenant, lease dates, rent, and deposit. The verification discipline is identical: confirm the lease and that the rent is actually being collected. Loss-to-lease, unit mix, and economic vacancy analysis simply matter far more on 2-4 unit and small multifamily, where several leases at different rents and expiration dates stack up into a number that is easy to dress up.",
  },
];

export default function HowToReadARentRollPost() {
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
            A rent roll is where a seller&apos;s story meets the leases. It is the
            one page that tells you what a rental actually collects this month —
            not the market rent a listing advertises, not the stabilized number on
            a pro forma, but the contracted rent from the tenants who live there
            now. Read it well and you catch the inflated rent, the vacant unit
            hiding behind a &quot;market&quot; figure, and the long-term tenant
            paying $250 under market — all before you wire an earnest-money
            deposit. Here is what a rent roll contains, a worked fourplex example,
            the five places rent rolls quietly mislead, and how to verify every
            line.
          </p>
        </header>

        <div className="prose prose-neutral max-w-none text-foreground space-y-6 leading-relaxed">
          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
            What a rent roll actually is
          </h2>
          <p>
            A rent roll is the income half of a property&apos;s books at a single
            moment in time. The expense half lives in the operating statement; the
            rent roll covers what comes in. A complete one carries, for every unit:
            a unit identifier, the unit type (beds/baths or square footage), the
            tenant, the lease start and end dates (or &quot;month-to-month&quot;),
            the current monthly rent, the security deposit being held, and a status
            column — occupied, vacant, delinquent, or voucher-assisted.
          </p>
          <p>
            That last detail matters: a one-column list of &quot;rents&quot; with
            no lease dates and no deposits is not a rent roll, it is marketing.
            Lease dates tell you when each rent can actually be reset; deposits are
            a liability you inherit; the status column is where vacancy and
            delinquency hide. If a broker sends you a single number — &quot;grosses
            $5,300/month&quot; — your first job is to make them turn it into a real
            rent roll, line by line.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
            A worked example: a 2026 fourplex
          </h2>
          <p>
            Here is the rent roll for a fourplex listed at <strong>$520,000</strong>.
            Market rent in this submarket is about $1,400 for the 2-bedroom units
            and $1,100 for the 1-bedroom. Read the table, then we will pull three
            very different numbers out of it.
          </p>

          <div className="not-prose my-6 overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-muted text-left">
                  <th className="border border-border px-3 py-2 font-bold text-foreground">
                    Unit
                  </th>
                  <th className="border border-border px-3 py-2 font-bold text-foreground">
                    Type
                  </th>
                  <th className="border border-border px-3 py-2 font-bold text-foreground">
                    Lease ends
                  </th>
                  <th className="border border-border px-3 py-2 font-bold text-foreground">
                    Rent / mo
                  </th>
                  <th className="border border-border px-3 py-2 font-bold text-foreground">
                    Deposit
                  </th>
                  <th className="border border-border px-3 py-2 font-bold text-foreground">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="text-muted-foreground">
                <tr>
                  <td className="border border-border px-3 py-2">1</td>
                  <td className="border border-border px-3 py-2">2BR / 1BA</td>
                  <td className="border border-border px-3 py-2">
                    Month-to-month
                  </td>
                  <td className="border border-border px-3 py-2">$1,150</td>
                  <td className="border border-border px-3 py-2">$1,000</td>
                  <td className="border border-border px-3 py-2">
                    Occupied (since 2019)
                  </td>
                </tr>
                <tr>
                  <td className="border border-border px-3 py-2">2</td>
                  <td className="border border-border px-3 py-2">2BR / 1BA</td>
                  <td className="border border-border px-3 py-2">2026-11-30</td>
                  <td className="border border-border px-3 py-2">$1,375</td>
                  <td className="border border-border px-3 py-2">$1,375</td>
                  <td className="border border-border px-3 py-2">Occupied</td>
                </tr>
                <tr>
                  <td className="border border-border px-3 py-2">3</td>
                  <td className="border border-border px-3 py-2">1BR / 1BA</td>
                  <td className="border border-border px-3 py-2">2027-02-28</td>
                  <td className="border border-border px-3 py-2">$1,050</td>
                  <td className="border border-border px-3 py-2">$1,050</td>
                  <td className="border border-border px-3 py-2">Occupied</td>
                </tr>
                <tr>
                  <td className="border border-border px-3 py-2">4</td>
                  <td className="border border-border px-3 py-2">2BR / 1BA</td>
                  <td className="border border-border px-3 py-2">—</td>
                  <td className="border border-border px-3 py-2">
                    $0 ($1,400 ask)
                  </td>
                  <td className="border border-border px-3 py-2">$0</td>
                  <td className="border border-border px-3 py-2">
                    Vacant / listed
                  </td>
                </tr>
                <tr className="bg-muted font-semibold text-foreground">
                  <td className="border border-border px-3 py-2">Total</td>
                  <td className="border border-border px-3 py-2">4 units</td>
                  <td className="border border-border px-3 py-2">
                    3 of 4 occupied
                  </td>
                  <td className="border border-border px-3 py-2">$3,575</td>
                  <td className="border border-border px-3 py-2">$3,425</td>
                  <td className="border border-border px-3 py-2">75% occ.</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
            The bottom line is three numbers, not one
          </h2>
          <p>
            The single most common rent-roll mistake is reading one total when
            there are really three. Pull all three from the table above:
          </p>
          <ul>
            <li>
              <strong>Gross potential rent (GPR)</strong> — every unit at market,
              fully occupied. Three 2-bedrooms at $1,400 plus one 1-bedroom at
              $1,100 = <strong>$5,300/month, or $63,600/year.</strong> This is the
              number the seller leads with.
            </li>
            <li>
              <strong>Contract (in-place) rent</strong> — what the signed leases
              actually say: $1,150 + $1,375 + $1,050 = <strong>$3,575/month</strong>{" "}
              on the three occupied units. Unit 4 contributes nothing because no one
              lives there.
            </li>
            <li>
              <strong>Collected rent</strong> — what hits the bank after
              delinquency and concessions. Here, assuming all three tenants pay,
              it equals contract rent: <strong>$3,575/month, or $42,900/year.</strong>{" "}
              On many real rent rolls this is lower than contract rent, and the gap
              is the story.
            </li>
          </ul>
          <p>
            The distance between GPR ($63,600) and collected ($42,900) is{" "}
            <strong>$20,700 a year</strong> — a third of the headline income that
            does not exist today. Decompose it and you learn exactly what you are
            buying:
          </p>
          <ul>
            <li>
              <strong>Vacancy loss:</strong> Unit 4 empty at $1,400/month ={" "}
              <strong>$16,800/year.</strong>
            </li>
            <li>
              <strong>Loss-to-lease:</strong> the three occupied units sit below
              market by $250 + $25 + $50 = $325/month ={" "}
              <strong>$3,900/year.</strong>
            </li>
          </ul>
          <p>
            $16,800 + $3,900 = $20,700, and the two halves are not equal in
            quality. The vacancy is curable fast — fill Unit 4 and you add $1,400 a
            month. The loss-to-lease is slower and partly stuck: Unit 1&apos;s
            tenant has been there since 2019 on a month-to-month, paying $250 under
            market, and raising them risks a turn and a vacancy gap. Treat the two
            buckets differently, because the seller will quote you the sum as if it
            were one easy win.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
            The five places a rent roll misleads
          </h2>
          <p>
            <strong>1. &quot;Market&quot; rent dressed up as in-place rent.</strong>{" "}
            The oldest trick is listing the asking rent for a vacant or
            soon-vacant unit in the same column as signed leases, so the eye reads
            $5,300 in monthly rent when only $3,575 is contracted. Always confirm
            which lines are leases and which are hopes. Compare every in-place rent
            against{" "}
            <Link
              href="/blog/how-to-estimate-rent-rental-property"
              className="text-primary font-semibold hover:underline"
            >
              an independent market-rent estimate
            </Link>{" "}
            — a rent that sits well <em>above</em> your comps is as suspicious as
            one well below.
          </p>
          <p>
            <strong>2. The vacant unit counted at full price.</strong> A unit that
            has been empty for four months is not worth its asking rent until it is
            leased — it is worth zero today and a question mark tomorrow. Ask how
            long Unit 4 has been vacant and why. A single long-standing vacancy in
            an otherwise full building often signals a unit problem (condition,
            layout, a rent set above what the market will bear), not just bad luck.
            Fold a realistic{" "}
            <Link
              href="/blog/vacancy-rate-rental-property"
              className="text-primary font-semibold hover:underline"
            >
              economic vacancy assumption
            </Link>{" "}
            into your own numbers rather than trusting a stabilized 5%.
          </p>
          <p>
            <strong>3. Below-market tenants whose upside is not free.</strong> The
            $3,900/year of loss-to-lease looks like money on the table, and brokers
            will frame it that way. But capturing it costs something: a lease has to
            roll, you may need to renovate to justify market rent, and an
            entrenched tenant may leave (a turn) or fight (an eviction). Each path
            has a dollar cost and a vacancy gap. Underwrite the upside at the rent
            you can defend on day one, and treat the rest as a plan with a price —
            not a number you get to keep.
          </p>
          <p>
            <strong>4. Delinquency and concessions hidden inside contract rent.</strong>{" "}
            Contract rent says $1,375; collected rent is whatever the tenant
            actually pays. A tenant three months behind, or one getting
            &quot;first month free&quot; on a fresh lease, still shows full rent on
            a sloppy rent roll. This is why you reconcile the rent roll against{" "}
            <em>bank deposits</em>, not against itself. The gap between contracted
            and collected is the truest measure of management quality you will find.
          </p>
          <p>
            <strong>5. Deposits you inherit as a liability.</strong> That $3,425 of
            security deposits is not income — it is money you owe back to the
            tenants. At closing it should be credited to you so you hold the funds
            you are legally on the hook to return. If the seller cannot actually
            transfer them, you have inherited a liability with no cash behind it.
            Confirm the total moves to you on the settlement statement.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
            From rent roll to underwrite
          </h2>
          <p>
            The rent roll feeds the top of your income statement. The build-up to
            effective gross income (EGI) — the number that drives{" "}
            <Link
              href="/blog/how-to-calculate-noi-rental-property"
              className="text-primary font-semibold hover:underline"
            >
              NOI
            </Link>
            , cap rate, and everything downstream — runs: gross potential rent,
            minus vacancy and credit loss, plus other income. Two honest versions
            of this fourplex:
          </p>
          <ul>
            <li>
              <strong>Today, as-is:</strong> collected rent $42,900 + laundry income
              $960 = <strong>$43,860 EGI.</strong> This is what the building earns
              the day you take the keys.
            </li>
            <li>
              <strong>Stabilized at market:</strong> GPR $63,600, minus a 6%
              economic vacancy allowance ($3,816), plus $960 of other income ={" "}
              <strong>$60,744 EGI</strong> — but only after you fill Unit 4 and roll
              every lease to market.
            </li>
          </ul>
          <p>
            The ~$16,900/year spread between those two is the <em>entire</em>{" "}
            value-add thesis for this deal, and it is exactly what a seller prices
            into the $520,000 ask. Buy on the stabilized number and you have paid
            today for work you have not done yet. Send the EGI into the{" "}
            <Link
              href="/tools/noi-calculator"
              className="text-primary font-semibold hover:underline"
            >
              NOI calculator
            </Link>{" "}
            with real operating expenses, and decide whether the path from $43,860
            to $60,744 is worth what it costs to walk it.
          </p>
          <p>
            One fast sanity check ties the rent roll straight to price. The{" "}
            <Link
              href="/tools/gross-rent-multiplier-calculator"
              className="text-primary font-semibold hover:underline"
            >
              gross rent multiplier
            </Link>{" "}
            on the seller&apos;s GPR is $520,000 ÷ $63,600 = <strong>8.2</strong> —
            a number that looks like a healthy cash-flow deal. On rent actually
            being collected, $520,000 ÷ $42,900 = <strong>12.1</strong>, which is
            appreciation-market pricing. Same building, same page, two stories. The
            verified rent roll is what tells you which one you are paying for.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
            How to verify a rent roll
          </h2>
          <p>
            A rent roll is a seller&apos;s representation until you prove it.
            Because value moves directly with income, every overstated line is
            dollars added to the price — verification is price protection, not
            paperwork. The sequence that works:
          </p>
          <ul>
            <li>
              <strong>Get every lease.</strong> Match each lease to its rent-roll
              line: rent, term, deposit, and any concessions or addenda. A
              rent-roll figure with no lease behind it is a vacancy in disguise.
            </li>
            <li>
              <strong>Pull the trailing 12 months of deposits.</strong> Bank
              statements or a property-management owner statement show what was
              actually collected, month by month. This is where phantom rent and
              chronic late-payers surface.
            </li>
            <li>
              <strong>Require estoppel certificates as a closing condition.</strong>{" "}
              An estoppel is a short form each tenant signs confirming their rent,
              deposit, lease dates, and that they have no side deals with the
              seller. It converts the seller&apos;s claim into the tenant&apos;s
              confirmation — the strongest verification you can get.
            </li>
            <li>
              <strong>Reconcile the deposits.</strong> Confirm the total security
              deposit on the rent roll matches the leases and is credited to you at
              closing. Verify any{" "}
              <Link
                href="/blog/section-8-rental-property-investing"
                className="text-primary font-semibold hover:underline"
              >
                housing-voucher (Section 8) payments
              </Link>{" "}
              against the housing authority&apos;s contract, since part of that rent
              comes from the agency, not the tenant.
            </li>
          </ul>
          <p>
            Where the verified numbers fall short of the rent roll, you have two
            options, and both are wins: re-trade the price down to the income you
            can prove, or walk. What you never do is close on the headline number
            and discover the gap from your own bank account.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
            Single-family and small multifamily
          </h2>
          <p>
            A single-family rental still has a rent roll — it is just one line, and
            the discipline is the same: confirm the lease and that the rent is
            genuinely being collected. The rent roll earns its keep on{" "}
            <Link
              href="/blog/single-family-vs-multi-family-rental"
              className="text-primary font-semibold hover:underline"
            >
              2-4 unit and small multifamily
            </Link>
            , where several leases at different rents and expiration dates stack
            into a total that is easy to inflate and hard to eyeball. A
            house-hacker buying a duplex or fourplex is reading a rent roll whether
            they call it that or not — the in-place rent on the units you won&apos;t
            occupy is what your whole underwrite leans on.
          </p>
          <p>
            The rent roll is the factual sibling of the{" "}
            <Link
              href="/blog/rental-property-pro-forma-explained"
              className="text-primary font-semibold hover:underline"
            >
              pro forma
            </Link>
            : one shows what is, the other shows what could be. Buy on the rent
            roll, negotiate on the gap, and let the pro forma be a plan you choose
            to execute — not a price you agree to pay up front.
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
            Verify the income, then underwrite it
          </h2>
          <p>
            A rent roll decides whether the income you are buying is real. Read all
            three numbers — gross potential, contract, collected — split the gap
            into vacancy and loss-to-lease, and verify every line against leases,
            deposits, and estoppels before you trust a total. Then take the income
            you can actually prove into the{" "}
            <Link
              href="/tools/noi-calculator"
              className="text-primary font-semibold hover:underline"
            >
              NOI calculator
            </Link>
            , sanity-check the price with the{" "}
            <Link
              href="/tools/gross-rent-multiplier-calculator"
              className="text-primary font-semibold hover:underline"
            >
              GRM calculator
            </Link>
            , and run the whole deal — cash flow, cap rate, DSCR, projections, and a
            selected-rule fit — through the{" "}
            <Link href="/" className="text-primary font-semibold hover:underline">
              TrueCap analyzer
            </Link>
            . Related reading:{" "}
            <Link
              href="/blog/rental-property-pro-forma-explained"
              className="text-primary font-semibold hover:underline"
            >
              how to read a pro forma
            </Link>
            ,{" "}
            <Link
              href="/blog/how-to-estimate-rent-rental-property"
              className="text-primary font-semibold hover:underline"
            >
              how to estimate rent
            </Link>
            , and{" "}
            <Link
              href="/blog/vacancy-rate-rental-property"
              className="text-primary font-semibold hover:underline"
            >
              what vacancy rate to assume
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
