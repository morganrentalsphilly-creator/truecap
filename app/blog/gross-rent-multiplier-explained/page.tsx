/**
 * Blog post: Gross rent multiplier (GRM) explained.
 *
 * Targets queries: "gross rent multiplier", "gross rent multiplier
 * explained", "what is GRM real estate", "GRM formula", "what is a
 * good GRM", "GRM vs cap rate", "how to calculate gross rent
 * multiplier", "gross rent multiplier example".
 */

import type { Metadata } from "next";
import Link from "next/link";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SiteFooter } from "@/components/marketing/site-footer";
import { BlogStickyCta } from "@/components/marketing/blog-sticky-cta";
import { RelatedBlogPosts } from "@/components/marketing/related-blog-posts";
import { RelatedContent } from "@/components/marketing/related-content";
import { NewsletterSignup } from "@/components/marketing/newsletter-signup";
import { getSiteUrl } from "@/lib/site-url";

const SLUG = "gross-rent-multiplier-explained";
const TITLE =
  "Gross rent multiplier (GRM) explained: how to screen rentals fast (2026)";
// SERP-facing title (metadata/og only): kept ≤50 chars so the root
// layout's "%s | TrueCap" template stays inside the ~60-char SERP
// window. The on-page <h1> keeps the longer editorial TITLE.
const SERP_TITLE = "Gross rent multiplier (GRM) explained (2026)";
const DESCRIPTION =
  "GRM = price ÷ annual gross rent — the fastest rental screen. The formula, 2026 worked examples, GRM vs cap rate, a good GRM range, and where it lies.";
const PUBLISHED_AT = "2026-06-17";
const MODIFIED_AT = "2026-06-17";
const READING_TIME = 10;

export const metadata: Metadata = {
  title: SERP_TITLE,
  description: DESCRIPTION,
  keywords: [
    "gross rent multiplier",
    "gross rent multiplier explained",
    "what is GRM real estate",
    "GRM formula",
    "what is a good GRM",
    "GRM vs cap rate",
    "how to calculate gross rent multiplier",
    "gross rent multiplier example",
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
    q: "What is the gross rent multiplier (GRM)?",
    a: "GRM is the simplest valuation ratio in real estate: property price ÷ annual gross rent. It tells you how many years of gross rent it would take to pay for the property at the asking price, before any expenses. A GRM of 8 means the price equals eight years of gross rent. Lower is cheaper relative to income. It deliberately ignores operating costs so you can screen 20 listings in a few minutes instead of underwriting each one.",
  },
  {
    q: "What is a good gross rent multiplier?",
    a: "It is market-dependent, not universal. A rough 2026 guide: under 6 is very strong (usually distressed), 6-10 is healthy cash-flow territory (the Midwest, parts of the Sun Belt), 10-14 is balanced, 14-20 signals an appreciation market where the thesis is price growth over cash flow, and above 20 is luxury territory where current yield is minimal. Always derive the 'good' number from recent sold comps in the submarket.",
  },
  {
    q: "What is the difference between GRM and cap rate?",
    a: "Cap rate uses NOI (gross rent minus operating expenses); GRM uses gross rent only. Cap rate is more accurate because it accounts for taxes, insurance, maintenance, vacancy, and management. GRM is faster because you do not need an expense breakdown — handy when screening listings where operating costs are not disclosed. The two are linked: cap rate = (1 − operating expense ratio) ÷ GRM, so at a 50% expense ratio a GRM of 10 equals a 5% cap rate. Use GRM to shortlist, cap rate to underwrite.",
  },
  {
    q: "How do you calculate GRM from monthly rent?",
    a: "Multiply monthly rent by 12 for annual gross rent, then divide the price by it. A $250,000 duplex renting for $2,600/month has $31,200 of annual gross rent and a GRM of 250,000 ÷ 31,200 = 8.0. A 'monthly GRM' (price ÷ monthly rent) would be 96 here, but the annual version is the convention used in comps.",
  },
  {
    q: "Can you use GRM to value a property?",
    a: "Yes, for small multifamily where rent drives value. Take the market GRM from three or four recently sold comps and multiply it by the subject's annual gross rent. If duplex comps sold at GRMs of 9.0-9.5 and the subject grosses $36,000/year, the implied value is roughly 9.2 × 36,000 ≈ $331,000. Treat it as a sanity check that frames a price range, not a substitute for a full underwrite.",
  },
];

export default function GrossRentMultiplierPost() {
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
          <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
            Gross rent multiplier is the first number a working investor
            computes on a listing — one division, no spreadsheet, no expense
            breakdown. It will not tell you whether a deal is good, only — in
            about ten seconds — whether it is worth the twenty minutes a real
            underwrite takes. Here is the formula, a good GRM range for 2026, how
            it maps onto cap rate and the 1% rule, and the exact place it quietly
            lies to you.
          </p>
        </header>

        <div className="prose prose-neutral max-w-none text-foreground space-y-6 leading-relaxed">
          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
            The formula
          </h2>
          <p>
            <strong>GRM = property price ÷ annual gross rent.</strong> That is
            the whole thing. Gross rent means the rent before a single dollar of
            expense comes out — no taxes, no insurance, no vacancy, no
            management. A $250,000 duplex where each side rents for $1,300/month
            grosses $2,600/month, or $31,200/year. Its GRM is 250,000 ÷ 31,200 ={" "}
            <strong>8.0</strong>.
          </p>
          <p>
            Read that as &quot;the price equals eight years of gross rent.&quot;
            The flip side is just as useful: the inverse of GRM is the gross
            yield. 1 ÷ 8.0 = 0.125, so this property throws off a{" "}
            <strong>12.5% gross yield</strong> on price. A GRM of 10 is a 10%
            gross yield; a GRM of 5 is a 20% gross yield. Lower GRM, higher
            yield, cheaper relative to the rent it produces.
          </p>
          <p>
            One convention to nail down: GRM almost always uses{" "}
            <em>annual</em> gross rent. A &quot;monthly GRM&quot; (price ÷
            monthly rent) exists — 96 here — but the annual figure of 8.0 is what
            brokers, appraisers, and comps use, so default to it.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
            Why a screen exists at all
          </h2>
          <p>
            The point of GRM is triage. Cap rate, cash-on-cash, and DSCR all
            need an operating-expense estimate, and a careful one takes real
            time — pulling the tax bill, quoting insurance, sizing capex
            reserves. You cannot do that for every listing. So you screen with
            the one ratio that needs only two numbers you already have: list
            price and asking rent. GRM lets you rank twenty listings, drop the
            dozen obviously overpriced relative to rent, and spend your
            underwriting time on the survivors — the same job the{" "}
            <Link
              href="/blog/spot-bad-rental-in-60-seconds"
              className="text-primary font-semibold hover:underline"
            >
              60-second red-flag triage
            </Link>{" "}
            does, with one number instead of seven.
          </p>
          <p>
            Here is a screen in practice. Three duplex listings in the same
            metro:
          </p>
          <ul>
            <li>
              <strong>Listing A:</strong> $250,000, $2,600/month → $31,200/year →
              GRM <strong>8.0</strong>
            </li>
            <li>
              <strong>Listing B:</strong> $340,000, $3,000/month → $36,000/year →
              GRM <strong>9.4</strong>
            </li>
            <li>
              <strong>Listing C:</strong> $190,000, $1,650/month → $19,800/year →
              GRM <strong>9.6</strong>
            </li>
          </ul>
          <p>
            The cheapest building (C, at $190k) has the <em>worst</em> GRM, and
            the priciest (B) sits in the middle. Sticker price told you nothing;
            GRM told you Listing A buys the most rent per dollar. It does not yet
            say A is a good deal — only that A tops the underwrite pile and C
            sinks to the bottom. Run any of these in the{" "}
            <Link
              href="/tools/gross-rent-multiplier-calculator"
              className="text-primary font-semibold hover:underline"
            >
              GRM calculator
            </Link>{" "}
            and you have your shortlist before you have finished your coffee.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
            What counts as a good GRM in 2026
          </h2>
          <p>
            There is no universal &quot;good&quot; GRM — it bakes in whatever
            rent-to-price relationship a market carries. A reasonable national
            frame:
          </p>
          <ul>
            <li>
              <strong>Under 6</strong> — very strong. Usually distressed, deeply
              discounted, or a rough submarket. Verify why it is this cheap.
            </li>
            <li>
              <strong>6 to 10</strong> — healthy cash-flow territory. The
              Midwest, much of the Sun Belt, and older small multifamily live
              here.
            </li>
            <li>
              <strong>10 to 14</strong> — balanced. Cash flow is thin at today&apos;s
              rates; the deal leans on modest cash flow plus appreciation.
            </li>
            <li>
              <strong>14 to 20</strong> — appreciation market. The return thesis
              is price growth and rent growth, not current yield. Coastal and
              Tier-1 metros.
            </li>
            <li>
              <strong>Above 20</strong> — luxury or ultra-coastal. Current yield
              is essentially zero; you are betting entirely on the asset.
            </li>
          </ul>
          <p>
            The honest way to set a target is local: pull the GRMs of recently{" "}
            <em>sold</em> comparable buildings (not active listings, which are
            asking-price wishful thinking). If sold duplex comps cluster around
            9, then a 9 is &quot;market,&quot; an 8 is a relative win, and an 11
            means you are paying up. A national benchmark is the starting point;
            the comp set is the answer.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
            Turning GRM into an Offer Ceiling
          </h2>
          <p>
            Because GRM is just price over rent, you can rearrange it into a
            an Offer Ceiling once you select a target multiple:
          </p>
          <p>
            <strong>Max price = target GRM × annual gross rent.</strong>
          </p>
          <p>
            Say your market trades at a GRM of 9 and you want to buy a half-point
            better, at 8.5. A duplex grossing $2,600/month ($31,200/year) gives a
            modeled Offer Ceiling of 8.5 × 31,200 = <strong>$265,200</strong>. Want a GRM of
            8 flat? 8 × 31,200 = $249,600 — which is why $250,000 felt right for
            Listing A. Far faster than working backward from a target cash flow:
            set your opening number, then let the full{" "}
            <Link
              href="/blog/how-to-underwrite-a-rental-property-in-60-seconds"
              className="text-primary font-semibold hover:underline"
            >
              60-second underwrite
            </Link>{" "}
            confirm it.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
            GRM vs cap rate: the bridge most people miss
          </h2>
          <p>
            GRM and{" "}
            <Link
              href="/blog/what-is-a-good-cap-rate"
              className="text-primary font-semibold hover:underline"
            >
              cap rate
            </Link>{" "}
            are not rivals — they are the same idea at two levels of effort. Cap
            rate divides{" "}
            <Link
              href="/blog/how-to-calculate-noi-rental-property"
              className="text-primary font-semibold hover:underline"
            >
              NOI
            </Link>{" "}
            by price; GRM divides gross rent by price (inverted). The only
            difference is operating expenses, which gives a clean conversion:
          </p>
          <p>
            <strong>Cap rate = (1 − operating expense ratio) ÷ GRM.</strong>
          </p>
          <p>
            If expenses eat 50% of gross rent — the classic{" "}
            <Link
              href="/blog/50-percent-rule-rentals"
              className="text-primary font-semibold hover:underline"
            >
              50% rule
            </Link>{" "}
            assumption — then a GRM of 10 implies a cap rate of 0.50 ÷ 10 ={" "}
            <strong>5.0%</strong>. Our GRM-8 duplex at a 50% expense ratio implies
            0.50 ÷ 8 = <strong>6.25%</strong>. Tighten expenses to 40% of rent and
            the same GRM of 8 becomes a 7.5% cap; loosen them to 58% and it falls
            to 5.25%. Same multiplier, very different cap rate — which is exactly
            why GRM screens but does not decide.
          </p>
          <p>
            The practical rule: GRM and cap rate only agree when two properties
            share an expense ratio. The instant taxes, insurance, or management
            costs diverge, two buildings with an identical GRM stop being equally
            good deals — which is the next section.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
            Where GRM lies: two identical GRMs, two different deals
          </h2>
          <p>
            Take two duplexes. Both cost $250,000, both gross $2,600/month, both
            therefore carry a GRM of exactly 8.0. By GRM alone they are twins.
            Now add the operating reality:
          </p>
          <ul>
            <li>
              <strong>Property X</strong> — low-tax state, newer roof and
              systems. Operating expenses run 38% of gross rent: $11,856/year.
              NOI = $31,200 − $11,856 = <strong>$19,344</strong>. Cap rate ={" "}
              19,344 ÷ 250,000 = <strong>7.7%</strong>.
            </li>
            <li>
              <strong>Property Y</strong> — high property-tax county, older
              building, full management. Expenses run 58% of gross rent:
              $18,096/year. NOI = $31,200 − $18,096 ={" "}
              <strong>$13,104</strong>. Cap rate = 13,104 ÷ 250,000 ={" "}
              <strong>5.2%</strong>.
            </li>
          </ul>
          <p>
            Identical GRM, and a $6,240/year ($520/month) gap in NOI. Now layer
            on financing at a ~7% investment-property rate, 25% down ($187,500
            loan): principal and interest run about <strong>$1,247/month</strong>{" "}
            (check any scenario in the{" "}
            <Link
              href="/tools/mortgage-payment-calculator"
              className="text-primary font-semibold hover:underline"
            >
              mortgage payment calculator
            </Link>
            ).
          </p>
          <ul>
            <li>
              <strong>Property X:</strong> $19,344 ÷ 12 = $1,612 NOI/month −
              $1,247 = <strong>+$365/month</strong> before debt paydown.
            </li>
            <li>
              <strong>Property Y:</strong> $13,104 ÷ 12 = $1,092 NOI/month −
              $1,247 = <strong>−$155/month</strong>.
            </li>
          </ul>
          <p>
            Same price, same rent, same GRM, same loan — and one property pays
            you $365 a month while the other bleeds $155. GRM never saw that
            $520/month gap because it never looked at expenses. That is not a
            flaw to fix; it is the price of speed — just never let a good GRM end
            the conversation.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
            The four things GRM cannot see
          </h2>
          <p>
            <strong>1. Operating expenses.</strong> Covered above — taxes,
            insurance, maintenance, vacancy, and management can swing the real
            return by two full cap-rate points on the same GRM. High-tax states
            (New Jersey, Illinois, Texas) punish GRM-only thinking hardest.
          </p>
          <p>
            <strong>2. Condition and capex.</strong> A turnkey duplex and a gut
            job can list at the same GRM. One needs $5,000 of make-ready; the
            other needs a $14,000 roof and a $9,000 sewer line in year two. GRM
            treats deferred maintenance as invisible because it never appears in
            gross rent. Pair the screen with a real{" "}
            <Link
              href="/blog/capex-maintenance-reserves-rental-property"
              className="text-primary font-semibold hover:underline"
            >
              capex reserve estimate
            </Link>
            .
          </p>
          <p>
            <strong>3. Financing.</strong> GRM is a pre-financing, unlevered
            ratio. Two investors buying the same GRM-8 building at 25% down
            versus all-cash get wildly different cash-on-cash returns and DSCR
            outcomes. For anything leverage-dependent you need{" "}
            <Link
              href="/blog/cap-rate-vs-cash-on-cash-vs-dscr"
              className="text-primary font-semibold hover:underline"
            >
              cash-on-cash and DSCR
            </Link>
            , not GRM.
          </p>
          <p>
            <strong>4. Whether the rent is real.</strong> The sneaky one.
            Brokers quote pro-forma or &quot;market&quot; rent, not what is
            actually collected. If a listing advertises $2,600/month but the
            in-place leases are $2,300, your GRM of 8.0 is fiction — the real GRM
            on collected rent is 250,000 ÷ 27,600 = <strong>9.1</strong>. Always
            screen on in-place rent, and read{" "}
            <Link
              href="/blog/rental-property-pro-forma-explained"
              className="text-primary font-semibold hover:underline"
            >
              how to read a pro forma
            </Link>{" "}
            before you trust a seller&apos;s rent roll.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
            GRM and the 1% rule are the same rule
          </h2>
          <p>
            Investors who swear by the{" "}
            <Link
              href="/tools/1-percent-rule-calculator"
              className="text-primary font-semibold hover:underline"
            >
              1% rule
            </Link>{" "}
            are using GRM without knowing it. The 1% rule says monthly rent
            should be at least 1% of price. Flip it: rent ÷ price ≥ 0.01 per
            month means annual rent ÷ price ≥ 0.12, which means price ÷ annual
            rent ≤ 8.33. <strong>The 1% rule is just &quot;GRM of 8.33 or
            lower.&quot;</strong> The old 2% rule is a GRM of 4.17 — which is why
            almost nothing clears it anymore.
          </p>
          <p>
            Our Listing A at $250,000 and $2,600/month is at 1.04% (a GRM of
            8.0), so it passes the 1% rule with a hair to spare. Seeing the two
            heuristics as one number is clarifying: both are gross-rent screens,
            both ignore the same expenses, and both fail in exactly the same
            high-cost, low-yield markets. If you have an opinion on a good GRM,
            you already have an opinion on the 1% rule.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
            A sharper variant: the effective gross income multiplier
          </h2>
          <p>
            Appraisers sometimes use a refinement called the effective gross
            income multiplier (EGIM): price ÷ <em>effective</em> gross income,
            where effective gross income is gross rent minus a vacancy allowance
            plus other income (laundry, parking, pet rent). On a building
            grossing $31,200 with 6% vacancy and $600 of laundry income, that is
            $29,928, for an EGIM of 250,000 ÷ 29,928 = 8.35. It counts the rent
            you will not actually collect, so when comparing a full building
            against a half-empty one it stops you from rewarding the better{" "}
            <em>story</em> over the better income. For fast screening, plain GRM
            is fine.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
            How to actually use GRM in a buying workflow
          </h2>
          <p>
            Slot it in as step zero, not the decision. The sequence that works:
          </p>
          <ul>
            <li>
              <strong>Screen.</strong> Compute GRM on in-place rent for every
              listing. Rank them. Kill anything materially above your market
              comp GRM.
            </li>
            <li>
              <strong>Shortlist.</strong> For survivors, calculate an Offer Ceiling with
              max price = target GRM × annual rent.
            </li>
            <li>
              <strong>Underwrite.</strong> On the two or three you would actually
              buy, drop GRM and run real numbers — NOI, cap rate, cash-on-cash,
              DSCR — with estimated expenses, financing, and reserves. Convert
              GRM to an expected cap rate with (1 − expense ratio) ÷ GRM and
              check the underwrite against it.
            </li>
            <li>
              <strong>Decide.</strong> The full analysis, not the screen, tells
              you whether to offer.
            </li>
          </ul>
          <p>
            GRM earns its keep precisely because it is shallow: it is the
            cheapest possible filter, so you run it first and often. The mistake
            is not using GRM — it is stopping at GRM.
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
            Screen fast, then underwrite for real
          </h2>
          <p>
            GRM is the ten-second look that decides where your twenty minutes
            go. Compute it in the{" "}
            <Link
              href="/tools/gross-rent-multiplier-calculator"
              className="text-primary font-semibold hover:underline"
            >
              GRM calculator
            </Link>
            , translate the multiple into an{" "}
            <Link
              href="/glossary/cap-rate"
              className="text-primary font-semibold hover:underline"
            >
              implied cap rate
            </Link>
            , and when a listing survives the screen, run the whole thing — NOI,
            cash flow, DSCR, projections, and Buy Box fit — through
            the{" "}
            <Link href="/" className="text-primary font-semibold hover:underline">
              TrueCap analyzer
            </Link>
            . Related reading:{" "}
            <Link
              href="/blog/what-is-a-good-cap-rate"
              className="text-primary font-semibold hover:underline"
            >
              what is a good cap rate
            </Link>
            ,{" "}
            <Link
              href="/blog/how-to-calculate-noi-rental-property"
              className="text-primary font-semibold hover:underline"
            >
              how to calculate NOI
            </Link>
            , and{" "}
            <Link
              href="/blog/cap-rate-vs-cash-on-cash-vs-dscr"
              className="text-primary font-semibold hover:underline"
            >
              cap rate vs cash-on-cash vs DSCR
            </Link>
            .
          </p>
        </div>
        </article>
        <RelatedContent kind="blog" slug={SLUG} title={TITLE} className="mt-10" />
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
