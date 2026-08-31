/**
 * Blog post: Rental property insurance — landlord coverage, cost, and
 * how it flows into the underwrite.
 *
 * Content-gap post (Jun 2026). Targets "landlord insurance", "rental
 * property insurance", "how much is landlord insurance", "dwelling fire
 * policy", "loss of rent coverage". This post connects property-specific
 * quotes and coverage terms to NOI, cash flow, and DSCR modeling.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { Umbrella } from "lucide-react";
import { BlogStickyCta } from "@/components/marketing/blog-sticky-cta";
import { RelatedBlogPosts } from "@/components/marketing/related-blog-posts";
import { NewsletterSignup } from "@/components/marketing/newsletter-signup";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SiteFooter } from "@/components/marketing/site-footer";
import { getSiteUrl } from "@/lib/site-url";

const SLUG = "rental-property-insurance";
const TITLE = "Rental property insurance: coverage, quotes, and underwriting";
// SERP-facing title (metadata/og only): kept ≤50 chars so the root
// layout's "%s | TrueCap" template stays inside the ~60-char SERP
// window. The on-page <h1> keeps the longer editorial TITLE.
const SERP_TITLE = "Rental property insurance: coverage & quotes";
const DESCRIPTION =
  "How to collect property-specific landlord-insurance evidence, compare coverage and exclusions, and test a verified premium in NOI, cash flow, and DSCR.";
const PUBLISHED_AT = "2026-06-23";
const MODIFIED_AT = "2026-08-29";
const READING_TIME_MIN = 11;

export const metadata: Metadata = {
  title: SERP_TITLE,
  description: DESCRIPTION,
  keywords: [
    "rental property insurance",
    "landlord insurance",
    "how much is landlord insurance",
    "landlord insurance cost",
    "dwelling fire policy",
    "DP-3 policy",
    "loss of rent coverage",
    "rental property insurance quote",
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
    q: "How much does landlord insurance cost?",
    a: "There is no reliable nationwide placeholder for a specific property. Premium and eligibility depend on address, construction, roof and systems, occupancy, use, limits, valuation, deductibles, perils, prior losses, carrier, owner profile, and current market conditions. Obtain written quotes for the actual ownership and occupancy plan and compare the full coverage, exclusions, deductibles, and fees—not premium alone.",
  },
  {
    q: "Does my homeowners policy cover a rental property?",
    a: "Do not assume an owner-occupied policy covers a tenant-occupied use. Occupancy, rental duration, unit count, business activity, endorsements, and policy language can affect eligibility and claims. Disclose the actual use to a licensed agent or carrier and obtain written confirmation of the quoted policy, endorsements, and material conditions before relying on coverage.",
  },
  {
    q: "What is loss of rent (fair rental value) coverage?",
    a: "Some policies or endorsements cover defined lost rental income after a covered loss, subject to limits, waiting periods, restoration periods, exclusions, proof requirements, and the policy's valuation method. Ask the agent to show the exact provision and test its limit against supported rent and more than one repair-duration scenario.",
  },
  {
    q: "Is landlord insurance tax deductible?",
    a: "Premiums allocable to a rental activity may be deductible subject to the policy period, accounting method, mixed use, capitalization, allocation, and other tax rules. Flood, umbrella, prepaid, or multi-property coverage can require additional allocation. Confirm the amount and timing under current tax guidance with a qualified professional.",
  },
  {
    q: "Do I need separate flood insurance?",
    a: "Flood coverage and lender requirements depend on the policy, flood determination, loan program, location, building, and current rules. Do not infer coverage from a general landlord-policy label or map zone. Obtain the lender's written requirement and separate written flood-coverage options, including limits, deductibles, exclusions, waiting periods, and building-versus-contents treatment.",
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
    author: { "@type": "Person", name: "Morgan Page", url: siteUrl },
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
            {DESCRIPTION}
          </p>
        </header>

        <article className="prose prose-slate max-w-none [&_p]:leading-relaxed [&_p]:text-foreground [&_h2]:font-extrabold [&_h2]:text-foreground [&_h2]:mt-10 [&_h2]:mb-3 [&_h3]:font-bold [&_h3]:text-foreground [&_h3]:mt-6 [&_h3]:mb-2 [&_li]:text-foreground [&_li]:leading-relaxed [&_strong]:text-foreground">
          <p>
            Insurance is a property-specific input, not a safe national average.
            The seller&apos;s policy, an online estimate, and a quote for a
            different occupancy or ownership structure may not describe the
            coverage or premium available to the buyer.
          </p>
          <p>
            This guide focuses on the evidence to collect, how to compare
            coverage and exclusions, and how a supported premium flows through{" "}
            <Link
              href="/blog/piti-explained-rental-property"
              className="text-primary font-semibold hover:underline"
            >
              PITI
            </Link>{" "}
            into{" "}
            <Link
              href="/blog/how-to-calculate-noi-rental-property"
              className="text-primary font-semibold hover:underline"
            >
              NOI
            </Link>
            , cash flow, and{" "}
            <Link
              href="/glossary/dscr"
              className="text-primary font-semibold hover:underline"
            >
              DSCR
            </Link>
            .
          </p>

          <h2 className="text-2xl sm:text-3xl">
            Landlord insurance is not homeowners insurance
          </h2>
          <p>
            Do not assume an owner-occupied policy covers a rental use. A change
            in occupancy, rental duration, unit count, services, or ownership
            can affect eligibility and claim treatment under the actual
            contract. Disclose the intended use and obtain written carrier or
            agent confirmation before closing or changing occupancy.
          </p>
          <p>
            Products are often described as landlord or dwelling policies, but
            form labels alone do not establish coverage. Ask the agent to
            compare the quoted forms, endorsements, valuation, and exclusions.
            For orientation only, DP labels are commonly used as follows:
          </p>
          <ul>
            <li>
              <strong>DP-1</strong> — may use a narrower named-peril form and a
              different valuation basis.
            </li>
            <li>
              <strong>DP-2</strong> — may cover a broader set of named perils.
            </li>
            <li>
              <strong>DP-3</strong> — may use broader dwelling-peril language.
            </li>
          </ul>

          <h2 className="text-2xl sm:text-3xl">
            What a landlord policy actually covers
          </h2>
          <p>
            Four buckets matter, and one of them is the one investors forget:
          </p>
          <ol>
            <li>
              <strong>Dwelling + other structures</strong> — the building itself
              (and detached garage, fence) up to your coverage limit, ideally at
              replacement cost.
            </li>
            <li>
              <strong>Liability</strong> — review covered persons, premises,
              activities, exclusions, defense, occurrence and aggregate limits,
              and how any umbrella applies.
            </li>
            <li>
              <strong>Lost rental income</strong> — review the covered cause,
              limit, waiting period, restoration period, proof, and valuation
              language.
            </li>
            <li>
              <strong>Optional endorsements</strong> — ask about ordinance or
              law, water, vandalism, equipment, service line, and other
              property-specific exposures.
            </li>
          </ol>
          <p>
            Do not assume the policy covers tenant property, flood, wind, named
            storms, water backup, ordinance upgrades, vacancy, or business
            activities. Coverage and separate-policy requirements vary. Read the
            quoted forms, endorsements, deductibles, and exclusions, and have
            the agent answer material questions in writing.
          </p>

          <h2 className="text-2xl sm:text-3xl">
            Why a national cost range is not enough
          </h2>
          <p>
            Premium comparisons are meaningful only when they use the same
            address, building and roof data, occupancy, ownership, valuation,
            limits, deductibles, endorsements, fees, and effective date. A lower
            premium can reflect less coverage rather than a better quote.
          </p>
          <p>Ask each agent or carrier to document at least:</p>
          <ul>
            <li>
              The rating address, construction, roof and system data, occupancy,
              and intended use.
            </li>
            <li>
              Dwelling valuation, liability and rental-income limits,
              deductibles, excluded perils, and optional endorsements.
            </li>
            <li>
              Any wind, flood, wildfire, vacancy, short-term-rental, or other
              separate-policy requirement.
            </li>
            <li>
              Whether the quote is bindable, what can change after inspection or
              underwriting, and when it expires.
            </li>
          </ul>
          <p>
            Treat the seller&apos;s premium and any screening placeholder as
            unverified. Obtain current written quotes for the actual transaction
            early enough to evaluate coverage and contingencies.
          </p>

          <h2 className="text-2xl sm:text-3xl">
            How to screen before a quote arrives
          </h2>
          <p>
            If a preliminary model needs an insurance input, label it as an
            assumption and test more than one scenario. Do not convert a
            percentage of property value or a national premium into a claimed
            local quote. Record the source and as-of date, then replace it with
            current written coverage as soon as possible.
          </p>
          <p>
            When you run an address in{" "}
            <Link
              href="/"
              className="text-primary font-semibold hover:underline"
            >
              TrueCap
            </Link>
            , insurance and property tax remain visible, editable assumptions
            rather than hidden costs. Enter a current local tax figure and
            replace the preliminary insurance assumption with a real quote as
            soon as you have one.
          </p>

          <h2 className="text-2xl sm:text-3xl">
            Where the premium actually lands in the underwrite
          </h2>
          <p>
            Insurance appears in both the housing payment and operating-expense
            view:
          </p>
          <ul>
            <li>
              It&apos;s the <strong>&quot;I&quot; in PITI</strong> — part of the
              monthly payment your lender (and your DSCR) cares about.
            </li>
            <li>
              It&apos;s an <strong>operating expense in NOI</strong>, so it
              directly lowers your{" "}
              <Link
                href="/glossary/cap-rate"
                className="text-primary font-semibold hover:underline"
              >
                cap rate
              </Link>{" "}
              and cash flow.
            </li>
          </ul>
          <p>
            For a hypothetical sensitivity, take a $250,000 property, $1,650
            monthly rent, 25% down, and an entered 7% loan rate. If all other
            assumptions are held constant, changing the annual insurance input
            from $1,500 to $3,500 adds about $167 per month of expense. In this
            model, that moves cash flow from roughly +$150 to −$17 per month and
            lowers{" "}
            <Link
              href="/glossary/dscr"
              className="text-primary font-semibold hover:underline"
            >
              DSCR
            </Link>
            . The figures are illustrative inputs, not local premium benchmarks
            or a lender decision. Compare the output with the lender&apos;s
            written coverage calculation and threshold.
          </p>

          <h2 className="text-2xl sm:text-3xl">
            Five insurance checks before relying on an underwrite
          </h2>
          <ol>
            <li>
              <strong>Seller&apos;s premium:</strong> treat it as history, not
              the buyer&apos;s quote.
            </li>
            <li>
              <strong>Flood, wind, wildfire, and water:</strong> obtain written
              coverage and lender requirements rather than assuming the dwelling
              form includes them.
            </li>
            <li>
              <strong>Valuation:</strong> ask how the dwelling limit was
              developed and how replacement-cost, actual-cash-value,
              coinsurance, and loss-settlement terms apply.
            </li>
            <li>
              <strong>Lost rental income:</strong> compare the policy limit and
              restoration terms with supported rent and multiple repair-duration
              scenarios.
            </li>
            <li>
              <strong>Liability and umbrella:</strong> have a licensed
              professional review limits, exclusions, named insureds, entities,
              locations, and how policies coordinate.
            </li>
          </ol>

          <div className="not-prose"></div>

          <p>
            TrueCap keeps insurance visible and editable so you can replace a
            preliminary assumption with a current property-specific quote and
            compare how the input changes cap rate, cash flow, and DSCR. Tax
            treatment depends on allocation, policy period, accounting method,
            use, and other facts; review it with the{" "}
            <Link
              href="/blog/schedule-e-rental-property"
              className="text-primary font-semibold hover:underline"
            >
              Schedule E guide
            </Link>{" "}
            and a qualified professional. Insurance also belongs in the same
            evidence and reserve review as{" "}
            <Link
              href="/blog/capex-maintenance-reserves-rental-property"
              className="text-primary font-semibold hover:underline"
            >
              CapEx and maintenance reserves
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

          <p className="text-sm text-muted-foreground">
            <Umbrella className="inline w-4 h-4 mr-1 align-text-bottom" />
            This is general educational information, not insurance advice.
            Coverage, exclusions, and pricing vary by carrier, state, and
            property — confirm specifics with a licensed insurance agent before
            you buy.
          </p>
        </article>

        <RelatedBlogPosts currentSlug={SLUG} />
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <NewsletterSignup variant="expanded" source="blog" />
        </div>

        <footer className="mt-12 pt-8 border-t border-border">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Related:{" "}
            <Link
              href="/blog/piti-explained-rental-property"
              className="font-bold text-foreground hover:underline"
            >
              PITI explained →
            </Link>{" "}
            ·{" "}
            <Link
              href="/blog/how-to-calculate-noi-rental-property"
              className="font-bold text-foreground hover:underline"
            >
              How to calculate NOI →
            </Link>{" "}
            ·{" "}
            <Link
              href="/blog/capex-maintenance-reserves-rental-property"
              className="font-bold text-foreground hover:underline"
            >
              CapEx &amp; reserves →
            </Link>
          </p>
        </footer>
      </main>
      <SiteFooter />
      <ScrollDepthTracker />
      <BlogStickyCta />
    </div>
  );
}
