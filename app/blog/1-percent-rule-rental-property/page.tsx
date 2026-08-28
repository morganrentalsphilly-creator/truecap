/**
 * Blog post: The 1% rule for rental property — does it still work in 2026?
 *
 * Targets queries: "1% rule real estate", "1 percent rule rental
 * property", "what is the 1% rule", "does the 1% rule still work",
 * "1% rule calculator", "2% rule real estate", "rent to price ratio",
 * "1% rule vs 2% rule".
 *
 * Fills the obvious gap in the screening-metric cluster: the blog
 * already covers the 50% rule, GRM, cap rate, DSCR, and cash-on-cash,
 * but not the single most-Googled rule of thumb in REI — and there is
 * a /tools/1-percent-rule-calculator begging for an explainer to link.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SiteFooter } from "@/components/marketing/site-footer";
import { BlogStickyCta } from "@/components/marketing/blog-sticky-cta";
import { RelatedBlogPosts } from "@/components/marketing/related-blog-posts";
import { NewsletterSignup } from "@/components/marketing/newsletter-signup";
import { getSiteUrl } from "@/lib/site-url";

const SLUG = "1-percent-rule-rental-property";
const TITLE = "The 1% rule for rental property: does it still work in 2026?";
// SERP-facing title (metadata/og only): kept ≤50 chars so the root
// layout's "%s | TrueCap" template stays inside the ~60-char SERP
// window. The on-page <h1> keeps the longer editorial TITLE.
const SERP_TITLE = "The 1% rule for rental property in 2026";
const DESCRIPTION =
  "The 1% rule says a rental's monthly rent should be at least 1% of its price. How it works, why 2026 rates made it harder to pass, and what it hides.";
const PUBLISHED_AT = "2026-06-23";
const MODIFIED_AT = "2026-06-23";
const READING_TIME = 10;

export const metadata: Metadata = {
  title: SERP_TITLE,
  description: DESCRIPTION,
  keywords: [
    "1% rule real estate",
    "1 percent rule rental property",
    "what is the 1% rule",
    "does the 1% rule still work",
    "1% rule calculator",
    "2% rule real estate",
    "rent to price ratio",
    "1% rule vs 2% rule",
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
    q: "What is the 1% rule in real estate?",
    a: "The 1% rule is a screening shortcut that says a rental's gross monthly rent should be at least 1% of its purchase price. A $200,000 property would need to rent for $2,000/month to pass. Rearranged, it caps your price at 100 times the monthly rent. It is a triage filter, not an underwrite — it tells you which listings are worth a closer look, not whether a deal actually makes money once taxes, insurance, vacancy, and financing are in the picture.",
  },
  {
    q: "Does the 1% rule still work in 2026?",
    a: "As a quick filter, yes — but with two caveats. First, higher rates raised the bar: at a 7% investment-property rate, a typical financed rental breaks even at roughly 0.76% rent-to-price, versus about 0.57% back when loans were 3.5%, so a 1% deal cash-flows on a thinner margin than it used to. Second, 1% deals have gotten scarce in appreciation and coastal markets, where many listings sit at 0.4–0.6%. The rule still works, but passing it is now necessary, not sufficient.",
  },
  {
    q: "What's the difference between the 1% rule and the 2% rule?",
    a: "Same formula, higher bar. The 2% rule wants monthly rent of at least 2% of price — a $100,000 house renting for $2,000/month. In 2026 that is essentially extinct outside deep-discount, low-value, or heavy-management properties (think sub-$80k homes in soft markets), and a listing that clears 2% usually signals a rough neighborhood, heavy capex, or a rent number that won't hold. Most investors today treat 1% as the aspirational screen and anything above it as a flag to look harder, not a green light.",
  },
  {
    q: "Does the 1% rule use rent before or after expenses?",
    a: "Gross rent, before any expenses, against the purchase price. That is exactly why it can mislead: two properties can both hit 1% and throw off very different cash flow once you account for property tax (which ranges from under 0.5% to over 2.2% of value by state), insurance, HOA dues, and condition. For a fixer or BRRRR deal, use your all-in cost — price plus rehab — as the denominator, or the rule will flatter a property you haven't finished paying for.",
  },
  {
    q: "Is a property that fails the 1% rule always a bad deal?",
    a: "No. The 1% rule is blind to appreciation, rent growth, tax benefits, and below-market rents you can raise. Plenty of properties in strong appreciation markets sit at 0.6–0.8% and still win over a 10-year hold on equity growth and forced appreciation. The rule is a cash-flow screen, so it's most useful when cash flow is your goal. If your thesis is appreciation or a value-add, run the full underwrite and don't let a single ratio veto the deal.",
  },
];

export default function OnePercentRulePost() {
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
    isPartOf: { "@id": `${siteUrl}/blog#blog` },
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
              Glance at a listing price and a rent figure and you can screen a
              rental in about three seconds: is the monthly rent at least 1% of
              the purchase price? That is the 1% rule — the most-Googled rule of
              thumb in real estate investing, and the first filter most investors
              run before they bother opening a spreadsheet. It is fast, it is
              famous, and in 2026 it is more contested than ever, because the
              rule was calibrated in an era of 3–4% mortgages and today money
              costs nearly twice that. Here is exactly how it works, what it
              quietly ignores, and how to use it without letting it talk you into
              a bad deal.
            </p>
          </header>

          <div className="prose prose-neutral max-w-none text-foreground space-y-6 leading-relaxed">
            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              What the 1% rule actually says
            </h2>
            <p>
              The rule is one division: take the gross monthly rent, divide by
              the purchase price, and check whether the result is 1% or more.
            </p>
            <p>
              <strong>Monthly rent ÷ purchase price ≥ 1%.</strong>
            </p>
            <p>
              Flip it around and it becomes a rule-of-thumb Offer Ceiling:
              <strong>100 × the monthly rent</strong>. This is a screening boundary,
              not a recommended offer. A house that rents
              for $1,800/month &quot;passes&quot; at any price up to $180,000; one
              that rents for $2,500 passes up to $250,000. That is the whole
              mechanic — no financing, no expenses, no condition. Which is the
              point: the 1% rule exists to kill obviously bad listings in seconds
              so you only spend real time on the survivors. Run a few through the{" "}
              <Link
                href="/tools/1-percent-rule-calculator"
                className="text-primary font-semibold hover:underline"
              >
                1% rule calculator
              </Link>{" "}
              and you&apos;ll feel how brutally fast the filter is.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              A 60-second screen: three listings
            </h2>
            <p>
              Say you pull three properties off the MLS on a Saturday morning:
            </p>
            <ul>
              <li>
                <strong>Listing A</strong> — a $220,000 single-family home renting
                for $2,200/month. Ratio: $2,200 ÷ $220,000 ={" "}
                <strong>1.00%</strong>. Passes.
              </li>
              <li>
                <strong>Listing B</strong> — a $250,000 duplex pulling $2,600/month
                across both units. Ratio: <strong>1.04%</strong>. Passes.
              </li>
              <li>
                <strong>Listing C</strong> — a $350,000 house in a nicer suburb
                renting for $2,400/month. Ratio: <strong>0.69%</strong>. Fails.
              </li>
            </ul>
            <p>
              Two pass, one fails, in under a minute and without a calculator
              app. Notice the pattern already forming: the cheaper, blue-collar
              properties clear the bar, and the pricier suburban house — the one
              that will probably appreciate fastest — doesn&apos;t come close.
              That tension between cash flow and appreciation is the rule&apos;s
              entire personality. The 1% rule is the opening move in the{" "}
              <Link
                href="/blog/how-to-underwrite-a-rental-property-in-60-seconds"
                className="text-primary font-semibold hover:underline"
              >
                60-second underwrite
              </Link>
              , not the closing argument.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              Where the 1% comes from — it&apos;s really a rent-to-price ratio
            </h2>
            <p>
              The 1% threshold isn&apos;t magic; it&apos;s a proxy. The idea is
              that if gross rent is about 1% of price each month — 12% of price a
              year — there&apos;s usually enough income to cover the mortgage,
              taxes, insurance, vacancy, and repairs with a little left over,{" "}
              <em>at the interest rates that were normal when the rule caught
              on.</em> It is a rent-to-price ratio dressed up as a pass/fail test.
            </p>
            <p>
              That makes it a cousin of the{" "}
              <Link
                href="/blog/gross-rent-multiplier-explained"
                className="text-primary font-semibold hover:underline"
              >
                gross rent multiplier
              </Link>
              . Watch the algebra: if price = 100 × monthly rent, then price =
              100 ÷ 12 = <strong>8.3 × annual rent</strong>. So &quot;passes the
              1% rule&quot; is the same statement as &quot;has a gross rent
              multiplier of about 8.3 or lower.&quot; (The 100 is the price-to-{""}
              <em>monthly</em>-rent multiple; the GRM you&apos;ll see quoted uses
              annual rent, which is why the two numbers look so different.) If you
              prefer thinking in GRM, the{" "}
              <Link
                href="/tools/gross-rent-multiplier-calculator"
                className="text-primary font-semibold hover:underline"
              >
                GRM calculator
              </Link>{" "}
              gets you to the same screen from the other direction.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              The 2026 problem: the bar quietly moved
            </h2>
            <p>
              Here is the part most &quot;1% rule&quot; articles skip. The rule
              uses a fixed yardstick — 1% — to measure something that moves with
              interest rates. When the cost of debt doubles, the rent-to-price
              ratio you need just to break even moves with it.
            </p>
            <p>
              Work it per $100,000 of price, with 25% down, taxes at 1.2%,
              insurance around 0.6% of value, and 15% of rent set aside for
              vacancy and reserves (self-managed, no property manager):
            </p>
            <ul>
              <li>
                <strong>At a 3.5% loan</strong> (the 2021 world): principal and
                interest on the $75,000 borrowed run about $337/month, plus $150
                of taxes and insurance — roughly $487 of fixed carry. Cover that
                plus reserves and you break even at about{" "}
                <strong>0.57% rent-to-price</strong>.
              </li>
              <li>
                <strong>At a 7% loan</strong> (2026 investment-property pricing):
                P&amp;I on the same $75,000 jumps to about $499/month, plus the
                same $150 — about $649 of fixed carry. Break-even climbs to
                roughly <strong>0.76% rent-to-price</strong>.
              </li>
            </ul>
            <p>
              So the floor moved from ~0.57% to ~0.76% purely because rates
              changed. A property at the full 1% still cash-flows — but the
              cushion between &quot;passes the rule&quot; and &quot;loses
              money&quot; shrank from a comfortable 0.43 points to a thin 0.24.
              The deals that quietly broke in this shift are the 0.7–0.8%
              properties that gushed cash at 3.5% and now barely tread water. This
              is the same negative-leverage trap that makes a once-safe{" "}
              <Link
                href="/blog/what-is-a-good-cap-rate"
                className="text-primary font-semibold hover:underline"
              >
                cap rate look fine and still lose to the loan constant
              </Link>
              . The 1% rule didn&apos;t get wrong — the world underneath it moved,
              and the rule, being a fixed number, didn&apos;t notice.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              Passing the 1% rule is not the same as a good return
            </h2>
            <p>
              Even when a property clears 1%, the rule says nothing about how good
              the return is — because it never looks at the costs that vary most
              between properties. Take two homes that both hit exactly 1%:
            </p>
            <ul>
              <li>
                <strong>Property X:</strong> $150,000, rents for $1,500/month, in
                a state with a 0.85% property-tax rate.
              </li>
              <li>
                <strong>Property Y:</strong> $300,000, rents for $3,000/month, in
                a state with a 1.8% property-tax rate.
              </li>
            </ul>
            <p>
              Both pass the screen identically. But underwrite them with 25% down
              at 7%, self-managed, with 5% vacancy and 10% for maintenance and
              capital reserves:
            </p>
            <ul>
              <li>
                <strong>Property X</strong> carries about $954 of PITI ($748
                P&amp;I + $106 taxes + $100 insurance) plus $225 of reserves —
                roughly $1,179 against $1,500 rent, or{" "}
                <strong>+$321/month</strong>. On about $42,000 all-in (down
                payment plus closing), that&apos;s a{" "}
                <strong>~9% cash-on-cash return</strong>.
              </li>
              <li>
                <strong>Property Y</strong> carries about $2,097 of PITI ($1,497
                P&amp;I + $450 taxes + $150 insurance) plus $450 of reserves —
                roughly $2,547 against $3,000 rent, or{" "}
                <strong>+$453/month</strong>. But on about $84,000 all-in, that is
                only a <strong>~6.5% cash-on-cash return</strong>.
              </li>
            </ul>
            <p>
              Same ratio, returns nearly 40% apart — driven mostly by a
              property-tax line the 1% rule never reads. That is why you finish
              the job with the metric that actually accounts for your cash:{" "}
              <Link
                href="/#main"
                className="text-primary font-semibold hover:underline"
              >
                cash-on-cash
              </Link>
              . If you&apos;re fuzzy on which metric answers which question, the
              guide on{" "}
              <Link
                href="/blog/cap-rate-vs-cash-on-cash-vs-dscr"
                className="text-primary font-semibold hover:underline"
              >
                cap rate vs cash-on-cash vs DSCR
              </Link>{" "}
              draws the lines.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              What the rule ignores — both halves of the fraction
            </h2>
            <p>
              The numerator and the denominator both hide traps.
            </p>
            <p>
              <strong>The denominator should be all-in cost, not list price.</strong>{" "}
              On a fixer or a{" "}
              <Link
                href="/blog/brrrr-method-explained"
                className="text-primary font-semibold hover:underline"
              >
                BRRRR deal
              </Link>
              , a $120,000 house that needs $40,000 of work and then rents for
              $1,400 looks like a screaming 1.17% against the purchase price — but
              against your true $160,000 all-in, it&apos;s 0.875% and fails.
              Always run the rule on price plus rehab, or it will flatter a
              property you haven&apos;t finished paying for.
            </p>
            <p>
              <strong>The numerator should be real market rent, not the
              listing&apos;s hopeful number.</strong> Sellers and pro formas quote
              rents that are often 5–15% above what the unit will actually fetch.
              Pull comps before you trust a rent figure, because a 10% haircut on
              rent drops a 1.0% property straight to 0.9%. And the rule is silent
              on everything that decides whether you keep that rent: condition,
              tenant quality, neighborhood trajectory, the interest rate on your
              specific loan, and how much you put down. A ratio can&apos;t see any
              of that.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              1% vs 2% rule, and what&apos;s realistic in 2026
            </h2>
            <p>
              The 2% rule is the same test with the bar doubled: monthly rent of
              at least 2% of price — a $100,000 house renting for $2,000. In 2026
              that is effectively extinct outside deep-discount, low-value, or
              management-intensive properties. When a listing genuinely clears 2%,
              it&apos;s usually telling you something — a rough block, deferred
              capex, or a rent number that won&apos;t survive a real lease-up — not
              that you&apos;ve found a unicorn.
            </p>
            <p>
              Where do 1% deals actually live now? Overwhelmingly in the Midwest
              and South, and in the sub-$200,000 price tiers — Ohio, Indiana,
              Alabama, parts of Texas and the Carolinas. In coastal and high-growth
              metros (San Diego, Denver, Austin, Seattle), most rentals pencil at
              0.4–0.6%, and investors there are explicitly betting on appreciation
              rather than monthly cash flow. Neither approach is wrong; they&apos;re
              different games, and the 1% rule is only scoring one of them. If
              cash flow isn&apos;t your goal, a failing ratio isn&apos;t a verdict.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              How to use the 1% rule without getting burned
            </h2>
            <p>
              Treat it as the first gate, not the decision. A practical workflow:
            </p>
            <ul>
              <li>
                <strong>Screen fast.</strong> Run the ratio on every listing. In
                2026&apos;s rate environment, give yourself margin — treat 1.0% as
                the floor for a cash-flow deal, not the target, since break-even
                already sits near 0.76%.
              </li>
              <li>
                <strong>Use all-in cost and real rent.</strong> Price plus rehab
                on the bottom, comped market rent on top.
              </li>
              <li>
                <strong>Then actually underwrite the survivors.</strong> Layer in
                full PITI, vacancy, maintenance, capital reserves, and management,
                and check cash-on-cash and DSCR before you write an offer. A deal
                that passes the 1% rule and then clears a real underwrite is worth
                pursuing; one that passes only the ratio is worth a second look,
                not a check.
              </li>
            </ul>
            <p>
              That last step is the whole reason TrueCap exists. Drop in a price
              and a rent and the{" "}
              <Link href="/" className="text-primary font-semibold hover:underline">
                free analyzer
              </Link>{" "}
              pulls a current rate, estimates taxes and insurance from the
              address, layers in vacancy and reserves, and hands back cash flow,
              cap rate, cash-on-cash, DSCR, and selected-rule fit — the
              entire underwrite the 1% rule was only ever pretending to be a
              stand-in for. The rule is the napkin; this is the spreadsheet.
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
              The 1% rule earns its fame: it&apos;s the fastest honest screen in
              real estate, and on a cheap, cash-flow-market rental it still flags
              the right deals in seconds. But it&apos;s a rent-to-price ratio with
              a fixed threshold in a world where rates move, and in 2026 the
              break-even floor has crept up to roughly 0.76%, leaving far less
              daylight between &quot;passes&quot; and &quot;bleeds.&quot; Use it to
              decide what to look at, never what to buy. Screen on all-in cost and
              real rent, then run the survivors through a full underwrite — PITI,
              reserves,{" "}
              <Link
                href="/blog/cap-rate-vs-cash-on-cash-vs-dscr"
                className="text-primary font-semibold hover:underline"
              >
                cash-on-cash, and DSCR
              </Link>{" "}
              — and the 1% rule goes back to doing the one job it&apos;s good at:
              getting you to a &quot;maybe&quot; fast.
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
