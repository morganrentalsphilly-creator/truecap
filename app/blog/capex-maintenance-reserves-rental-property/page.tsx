/**
 * Blog post: CapEx and maintenance reserves — how much to budget.
 *
 * Targets queries: "capex rental property", "maintenance reserve rental
 * property", "how much to budget for repairs rental property", "capex
 * vs repairs rental", "capital expenditures rental property", "rental
 * property reserve fund".
 */

import type { Metadata } from "next";
import Link from "next/link";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SiteFooter } from "@/components/marketing/site-footer";
import { BlogStickyCta } from "@/components/marketing/blog-sticky-cta";
import { RelatedBlogPosts } from "@/components/marketing/related-blog-posts";
import { NewsletterSignup } from "@/components/marketing/newsletter-signup";
import { getSiteUrl } from "@/lib/site-url";

const SLUG = "capex-maintenance-reserves-rental-property";
const TITLE =
  "CapEx and maintenance reserves: how much to actually budget for a rental (2026)";
// SERP-facing title (metadata/og only): kept ≤50 chars so the root
// layout's "%s | TrueCap" template stays inside the ~60-char SERP
// window. The on-page <h1> keeps the longer editorial TITLE.
const SERP_TITLE = "CapEx & maintenance reserves for rentals (2026)";
const DESCRIPTION =
  "The component-lifespan method for capex and maintenance reserves, worked numbers on a $220K rental, and what honest reserves do to NOI, DSCR, and cash flow.";
const PUBLISHED_AT = "2026-06-11";
const MODIFIED_AT = "2026-06-11";
const READING_TIME = 10;

export const metadata: Metadata = {
  title: SERP_TITLE,
  description: DESCRIPTION,
  keywords: [
    "capex rental property",
    "maintenance reserve rental property",
    "how much to budget for repairs rental property",
    "capex vs repairs rental",
    "capital expenditures rental property",
    "rental property reserve fund",
    "capex budget single family rental",
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
    q: "How much should I budget for capex on a rental property?",
    a: "Derive it from component lifespans rather than picking a percentage. Sum each big-ticket item's replacement cost divided by its useful life — roof, HVAC, water heater, kitchen, baths, flooring, paint, windows, exterior — and you'll land around $330-400/month full-cycle on a typical 1,400 sq ft single-family, before routine maintenance. Most percent-of-rent defaults (5-10%) understate that badly on low-rent properties, because a roof costs the same whether the house rents for $1,100 or $2,800.",
  },
  {
    q: "What is the difference between maintenance and capital expenditures?",
    a: "Maintenance (repairs) keeps the property in its current condition — fixing a leak, patching drywall, servicing the furnace. CapEx replaces or improves whole components — a new roof, new HVAC, a kitchen renovation. The IRS treats them differently too: repairs are deductible in the year you pay them, while capital improvements are depreciated over 27.5 years (with a de minimis safe harbor that lets you expense items up to $2,500 per invoice). In your underwrite, budget both: roughly $80-150/month for routine maintenance plus a separate capex reserve.",
  },
  {
    q: "Is the 1% rule a good way to estimate maintenance costs?",
    a: "The old heuristic — budget 1% of property value per year for maintenance — is a tolerable sanity check on mid-priced properties but breaks at the extremes. On a $150K Midwest rental it suggests $1,500/year, which won't cover one water heater plus a service call in a bad year. On an $800K coastal property it suggests $8,000/year, which likely overshoots. Component math beats value math because components, not prices, are what wear out.",
  },
  {
    q: "Does capex count against NOI?",
    a: "By appraisal convention, no — NOI is calculated before capital expenditures, which is why listing pro formas love it. In your own underwrite, you should absolutely model a capex reserve as a recurring monthly cost, because the cash leaves your account either way. Just know which convention a number uses before you compare cap rates: a seller's 7% cap with zero capex and your 7% cap with $250/month reserved are not the same deal.",
  },
  {
    q: "How big should my cash reserve be at closing?",
    a: "A practical floor is six months of PITIA (principal, interest, taxes, insurance, association dues) plus an age-weighted capex fund: for each major component, multiply replacement cost by its age divided by its lifespan, and hold the shortfall. A 9-year-old water heater on a 10-year life means you should already have ~90% of its $1,800 replacement banked on day one. Many DSCR lenders also require 3-6 months of PITIA in verified reserves just to close.",
  },
];

export default function CapexReservesPost() {
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
            CapEx is where marginal deals go to die. A property can
            &quot;cash flow&quot; $150 a month for three years and then hand
            the entire gain back in one afternoon when the HVAC fails.
            Sellers omit the line entirely; most investors copy a 5%
            default that has nothing to do with the age of the roof.
            Here&apos;s the component math that produces a number you can
            defend — and what that number does to NOI, DSCR, and the deal.
          </p>
        </header>

        <div className="prose prose-neutral max-w-none text-foreground space-y-6 leading-relaxed">
          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
            Maintenance vs CapEx: two budgets, two tax treatments
          </h2>
          <p>
            <strong>Maintenance</strong> (repairs) keeps the property in its
            current condition: the $180 service call, the $90 garbage
            disposal, the drywall patch after a tenant moves out. It&apos;s
            frequent, individually small, and — usefully — deductible in the
            year you pay it.
          </p>
          <p>
            <strong>Capital expenditures</strong> replace or improve whole
            components: a roof, a furnace, a kitchen. They&apos;re rare,
            individually large, and depreciated over 27.5 years rather than
            deducted immediately (the de minimis safe harbor lets you expense
            items up to $2,500 per invoice, which catches appliances and
            water heaters for most small landlords). The distinction matters
            at tax time — the full breakdown is in{" "}
            <Link
              href="/blog/rental-property-tax-deductions"
              className="text-primary font-semibold hover:underline"
            >
              rental property tax deductions
            </Link>{" "}
            — but it matters even more in underwriting, because the two
            lines behave differently. Maintenance is a smooth, predictable
            drip. CapEx is a cliff. Budgeting them as one blended
            &quot;repairs&quot; percentage is how investors end up surprised
            by an expense they could have scheduled five years in advance.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
            Why percent-of-rent rules quietly fail
          </h2>
          <p>
            The common defaults — 5% of rent for maintenance, 5-10% for capex
            — share one fatal assumption: that wear scales with rent. It
            doesn&apos;t. A 30-year architectural shingle roof on a 1,400 sq
            ft house costs about $11,000 to replace whether that house rents
            for $1,100 in Cleveland or $2,800 in Phoenix. At 8% of rent, the
            Cleveland house banks $1,056/year toward capex; the Phoenix house
            banks $2,688 — for the same roof, the same furnace, the same
            water heater on the same clock.
          </p>
          <p>
            The result is systematic: <strong>percentage rules understate
            capex on cheap properties and overstate it on expensive ones</strong>.
            And since low-price, high-yield properties are exactly where
            spreadsheet cash flow looks best, the error concentrates in the
            deals that can least afford it. This is the same family of
            mistake as treating the{" "}
            <Link
              href="/blog/50-percent-rule-rentals"
              className="text-primary font-semibold hover:underline"
            >
              50% rule
            </Link>{" "}
            as an underwrite instead of a triage tool — fine for a first
            pass, dangerous as a final answer.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
            The component method: derive the reserve, don&apos;t guess it
          </h2>
          <p>
            For each big-ticket component, divide replacement cost by useful
            life. Here&apos;s the full schedule for a typical 1,400 sq ft,
            3-bed single-family at 2026 contractor prices:
          </p>
          <ul>
            <li>
              <strong>Roof (architectural shingle):</strong> $11,000 ÷ 25
              years = $440/year
            </li>
            <li>
              <strong>HVAC (furnace + condenser):</strong> $9,000 ÷ 18 years
              = $500/year
            </li>
            <li>
              <strong>Water heater:</strong> $1,800 ÷ 10 years = $180/year
            </li>
            <li>
              <strong>Kitchen (cabinets, counters, appliances):</strong>{" "}
              $14,000 ÷ 20 years = $700/year
            </li>
            <li>
              <strong>Bathrooms (2 × $7,000):</strong> $14,000 ÷ 20 years =
              $700/year
            </li>
            <li>
              <strong>Flooring (LVP throughout):</strong> $7,000 ÷ 12 years ≈
              $583/year
            </li>
            <li>
              <strong>Interior paint (full repaint):</strong> $3,500 ÷ 6
              years ≈ $583/year
            </li>
            <li>
              <strong>Windows:</strong> $9,000 ÷ 30 years = $300/year
            </li>
            <li>
              <strong>Exterior (siding, gutters, driveway allowance):</strong>{" "}
              $8,000 ÷ 25 years = $320/year
            </li>
            <li>
              <strong>Electrical / plumbing allowance:</strong> $6,000 ÷ 30
              years = $200/year
            </li>
          </ul>
          <p>
            Total: <strong>about $4,500/year, or ~$375/month</strong> —
            before a dollar of routine maintenance. On a $1,600/month rent,
            that&apos;s 23% of gross income for capex alone, which is why
            the 5-10% defaults feel comfortable and underwrite wrong. Add
            $80-150/month for routine maintenance (more for older systems
            and rougher tenant classes) and the honest combined line on this
            archetype runs <strong>$450-500/month full-cycle</strong>.
          </p>
          <p>
            Two fair adjustments before you panic. First, full-cycle assumes
            you own through every replacement; if you buy a house with a
            5-year-old roof and sell in year ten, the roof never hits your
            ledger — though it hits your sale price instead, because the
            buyer&apos;s inspector runs the same math. Second, a recently
            renovated property genuinely earns a lower near-term reserve —
            which is the legitimate version of the argument every listing
            agent makes. The way to capture both: walk the property,
            estimate each component&apos;s <em>remaining</em> life, and
            re-run the division. The{" "}
            <Link
              href="/tools/rehab-cost-estimator"
              className="text-primary font-semibold hover:underline"
            >
              rehab cost estimator
            </Link>{" "}
            prices the component replacements, and the framework in{" "}
            <Link
              href="/blog/how-to-estimate-rehab-costs"
              className="text-primary font-semibold hover:underline"
            >
              how to estimate rehab costs
            </Link>{" "}
            covers the walkthrough itself.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
            What honest reserves do to a real deal
          </h2>
          <p>
            A $220,000 single-family renting for $1,950/month. 25% down,
            $165,000 loan at 7% over 30 years (P&amp;I ≈ $1,098/month).
            Fixed expenses: $230/month taxes, $110 insurance, 7% vacancy
            ($136), 8% property management ($156).
          </p>
          <ul>
            <li>
              <strong>With the listing-flyer assumption ($100/month
              maintenance + capex):</strong> NOI ≈ $14,616/year, cap rate
              6.6%, cash flow ≈ <strong>+$120/month</strong>, DSCR ≈{" "}
              <strong>1.11</strong>
            </li>
            <li>
              <strong>With component-derived reserves ($300/month on this
              property&apos;s actual ages):</strong> NOI ≈ $12,216/year, cap
              rate 5.6%, cash flow ≈ <strong>−$80/month</strong>, DSCR ≈{" "}
              <strong>0.93</strong>
            </li>
          </ul>
          <p>
            One line item moved this deal from &quot;modest cash flow&quot;
            to &quot;pays you nothing and doesn&apos;t cover its own debt on
            collected income.&quot; That&apos;s not an argument that the
            deal is bad — it&apos;s an argument that the reserve assumption{" "}
            <em>is</em> the underwrite on marginal deals, the same way the
            vacancy line is in{" "}
            <Link
              href="/blog/vacancy-rate-rental-property"
              className="text-primary font-semibold hover:underline"
            >
              what vacancy rate to assume
            </Link>
            . Run your own numbers both ways in the{" "}
            <Link
              href="/tools/cash-on-cash-calculator"
              className="text-primary font-semibold hover:underline"
            >
              cash-on-cash calculator
            </Link>{" "}
            before trusting either one.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
            The NOI convention trap
          </h2>
          <p>
            Here&apos;s a wrinkle that bites investors comparing cap rates:
            by appraisal convention, <strong>NOI is calculated before
            capital expenditures</strong>. Brokers and seller pro formas
            follow that convention enthusiastically, because excluding capex
            inflates NOI and therefore the implied value at any given cap
            rate. Your own underwrite should reserve for capex anyway — the
            cash leaves your account regardless of where accountants file it
            — but when you compare your numbers to a listing&apos;s, make
            sure both sides use the same convention. A seller&apos;s
            &quot;7% cap&quot; with no capex line and your 7% cap with
            $300/month reserved describe two very different properties. The{" "}
            <Link
              href="/tools/noi-calculator"
              className="text-primary font-semibold hover:underline"
            >
              NOI calculator
            </Link>{" "}
            and{" "}
            <Link
              href="/tools/cap-rate-calculator"
              className="text-primary font-semibold hover:underline"
            >
              cap rate calculator
            </Link>{" "}
            keep the definitions straight, and{" "}
            <Link
              href="/blog/rental-property-pro-forma-explained"
              className="text-primary font-semibold hover:underline"
            >
              reading a pro forma
            </Link>{" "}
            covers the other six places seller math drifts optimistic.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
            How much cash to hold, and when to fund it
          </h2>
          <p>
            The monthly reserve answers &quot;what does this property really
            earn?&quot; A separate question is &quot;how much cash do I need
            in the account?&quot; — because capex doesn&apos;t arrive
            smoothly. Three layers:
          </p>
          <ul>
            <li>
              <strong>Liquidity floor: six months of PITIA.</strong> On the
              deal above, roughly $8,600. This is the buffer that turns a
              dead HVAC plus a vacant month from a crisis into a bad
              quarter. Many DSCR lenders independently require 3-6 months of
              verified reserves at closing.
            </li>
            <li>
              <strong>Age-weighted capex funding at purchase.</strong> For
              each component: replacement cost × (age ÷ lifespan). A
              9-year-old water heater on a 10-year life means ~$1,620 of its
              $1,800 replacement should be banked on day one — the previous
              owner consumed that life, and the inspection is where you
              find out. Sum the shortfalls across components; on older
              properties this number routinely hits $8,000-15,000 and
              belongs in your cash-to-close math right next to{" "}
              <Link
                href="/blog/closing-costs-investment-property"
                className="text-primary font-semibold hover:underline"
              >
                closing costs
              </Link>
              .
            </li>
            <li>
              <strong>The monthly drip.</strong> Auto-transfer the
              component-derived amount to a separate account every month and
              treat it as spent. If it sits in the operating account, it
              reads as cash flow — and gets spent as cash flow.
            </li>
          </ul>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
            Four mistakes that show up constantly
          </h2>
          <p>
            <strong>Double-counting with the 50% rule.</strong> The classic
            heuristic already includes maintenance, capex, and vacancy.
            Applying 50% <em>and</em> itemizing a reserve counts the roof
            twice and kills deals that pencil. Pick one structure per pass.
          </p>
          <p>
            <strong>Letting the rehab subsidize the reserve — forever.</strong>{" "}
            A full gut renovation legitimately buys you low capex for 5-10
            years. It does not buy you a $50/month capex line for a 30-year
            hold, because flooring, paint, and appliances cycle two or three
            times in that window even when they start new.
          </p>
          <p>
            <strong>Scaling single-family numbers to multifamily by
            doormat count.</strong> A duplex shares one roof but carries two
            kitchens, two baths, and often two furnaces and water heaters.
            Per-unit capex on small multifamily runs 75-90% of a comparable
            single-family — not 50%. The shared-structure discount is real
            but smaller than it looks.
          </p>
          <p>
            <strong>Confusing deferred maintenance with capex.</strong> The
            $12,000 of work the inspector finds is not a reserve item —
            it&apos;s purchase price. Negotiate it, fund it at closing, or
            walk. Reserves are for the components that are fine today and
            won&apos;t be in 2031.
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
            Put the reserve in context
          </h2>
          <p>
            CapEx is one line, but it compounds through everything
            downstream — NOI, cap rate, cash flow, DSCR, and whether the
            modeled return still holds after a future roof. The full{" "}
            <Link href="/" className="text-primary font-semibold hover:underline">
              TrueCap analyzer
            </Link>{" "}
            carries your maintenance and capex assumptions through the
            entire underwrite in one pass, so you can flip between the
            listing&apos;s number and the component math and watch the whole
            picture move. Related reading:{" "}
            <Link
              href="/blog/how-to-underwrite-a-rental-property-in-60-seconds"
              className="text-primary font-semibold hover:underline"
            >
              how to underwrite a rental in 60 seconds
            </Link>
            ,{" "}
            <Link
              href="/blog/how-to-estimate-rehab-costs"
              className="text-primary font-semibold hover:underline"
            >
              estimating rehab costs
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
