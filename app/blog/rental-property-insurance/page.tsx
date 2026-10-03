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
import {
  ARTICLE_HEADER,
  ARTICLE_LEDE,
  ARTICLE_META,
  ARTICLE_META_LINK,
  ARTICLE_TITLE,
  ArticleBody,
  ArticleEnd,
  ArticleMain,
  ArticlePage,
  UnderTitleAnalyzeLink,
} from "@/components/marketing/article";
import { BlogByline } from "@/components/marketing/blog-byline";
import { BlogStickyCta } from "@/components/marketing/blog-sticky-cta";
import { FaqSection } from "@/components/marketing/faq-section";
import { RelatedBlogPosts } from "@/components/marketing/related-blog-posts";
import { RelatedContent } from "@/components/marketing/related-content";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SiteFooter } from "@/components/marketing/site-footer";
import { getSiteUrl } from "@/lib/site-url";
import { Header } from "@/components/investcalc/header";
import { lastmodFor } from "@/lib/seo/lastmod";
import { JsonLd } from "@/components/seo/json-ld";
import { PostSources } from "@/components/blog/post-sources";

const SLUG = "rental-property-insurance";
const TITLE = "Rental property insurance: coverage, quotes, and underwriting";
// SERP-facing title (metadata/og only): kept ≤50 chars so the root
// layout's "%s | TrueCap" template stays inside the ~60-char SERP
// window. The on-page <h1> keeps the longer editorial TITLE.
const SERP_TITLE = "Rental property insurance: coverage & quotes";
const DESCRIPTION =
  "How to collect property-specific landlord-insurance evidence, compare coverage and exclusions, and test a verified premium in NOI, cash flow, and DSCR.";
const PUBLISHED_AT = "2026-06-23";
const MODIFIED_AT = lastmodFor("/blog/rental-property-insurance") ?? PUBLISHED_AT;
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
  },
  twitter: {
    card: "summary_large_image",
    title: SERP_TITLE,
    description: DESCRIPTION,
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
    author: { "@type": "Organization", "@id": `${siteUrl}/#organization`, name: "TrueCap", url: siteUrl },
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
        item: siteUrl,
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
    <ArticlePage>
      <Header initialUser={null} initialEntitlements={null} />
      <JsonLd data={articleLd} />
      <JsonLd data={breadcrumbLd} />
      <JsonLd data={faqLd} />

      <ArticleMain>
        <article>
          <header className={ARTICLE_HEADER}>
            <h1 className={ARTICLE_TITLE}>{TITLE}</h1>
            <p className={ARTICLE_META}>
              <Link href="/blog" className={ARTICLE_META_LINK}>
                Blog
              </Link>{" "}
              ·{" "}
              {new Date(PUBLISHED_AT).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}{" "}
              · {READING_TIME_MIN} min read
            </p>
            <BlogByline />
            <UnderTitleAnalyzeLink />
            <p className={ARTICLE_LEDE}>
              {DESCRIPTION}
            </p>
          </header>

          <ArticleBody>
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
              className="tc-link"
            >
              PITI
            </Link>{" "}
            into{" "}
            <Link
              href="/blog/how-to-calculate-noi-rental-property"
              className="tc-link"
            >
              NOI
            </Link>
            , cash flow, and{" "}
            <Link
              href="/glossary/dscr"
              className="tc-link"
            >
              DSCR
            </Link>
            .
          </p>

          <h2>
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

          <h2>
            What a landlord policy actually covers
          </h2>
          <p>
            Four buckets matter:
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
            activities.{" "}
            <a
              href="https://www.fema.gov/flood-insurance"
              className="tc-link"
            >
              FEMA notes that most homeowners insurance does not cover flood
              damage
            </a>
            . Coverage and separate-policy requirements vary. Read the quoted
            forms, endorsements, deductibles, and exclusions, and have the
            agent answer material questions in writing.
          </p>

          <h2>
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

          <h2>
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
              className="tc-link"
            >
              TrueCap
            </Link>
            , insurance and property tax remain visible, editable assumptions
            rather than hidden costs. Enter a current local tax figure and
            replace the preliminary insurance assumption with a real quote as
            soon as you have one.
          </p>

          <h2>
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
                className="tc-link"
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
            model, that cuts monthly cash flow by the same ~$167 and lowers{" "}
            <Link
              href="/glossary/dscr"
              className="tc-link"
            >
              DSCR
            </Link>
            . The figures are illustrative inputs, not local premium benchmarks
            or a lender decision. Compare the output with the lender&apos;s
            written coverage calculation and threshold.
          </p>

          <h2>
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
              form includes them. FEMA notes that{" "}
              <a
                href="https://www.fema.gov/flood-insurance"
                className="tc-link"
              >
                homes in high-risk flood areas with mortgages from
                government-backed lenders are required to have flood
                insurance, and an NFIP policy typically has a 30-day waiting
                period
              </a>{" "}
              (with exceptions, such as lender-required coverage).
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

          <p>
            TrueCap keeps insurance visible and editable so you can replace a
            preliminary assumption with a current property-specific quote and
            compare how the input changes cap rate, cash flow, and DSCR.
            Premiums allocable to a rental activity may be deductible, and if
            you prepay more than a year of coverage,{" "}
            <a
              href="https://www.irs.gov/publications/p527"
              className="tc-link"
            >
              IRS Publication 527 has you deduct only the part of the premium
              that applies to each year
            </a>
            . Beyond that, tax treatment depends on allocation, accounting
            method, use, and other facts; review it with the{" "}
            <Link
              href="/blog/schedule-e-rental-property"
              className="tc-link"
            >
              Schedule E guide
            </Link>{" "}
            and a qualified professional. Insurance also belongs in the same
            evidence and reserve review as{" "}
            <Link
              href="/blog/capex-maintenance-reserves-rental-property"
              className="tc-link"
            >
              CapEx and maintenance reserves
            </Link>
            .
          </p>
          </ArticleBody>

          {/* faqLd above is the one FAQPage node for these rows. */}
          <FaqSection
            id="faq"
            variant="inline"
            heading="FAQ"
            items={FAQS}
            structuredData={false}
            contact={null}
          />

          <ArticleBody className="mt-10">
          <p className="text-sm text-muted-foreground">
            This is general educational information, not insurance advice.
            Coverage, exclusions, and pricing vary by carrier, state, and
            property — confirm specifics with a licensed insurance agent before
            you buy.
          </p>
          </ArticleBody>
        </article>
        <PostSources
          sources={[
            {
              title: "FEMA, Flood Insurance",
              url: "https://www.fema.gov/flood-insurance",
            },
            {
              title: "IRS Publication 527 (2025), Residential Rental Property",
              url: "https://www.irs.gov/publications/p527",
            },
          ]}
        />
        <RelatedContent kind="blog" slug={SLUG} title={TITLE} className="mt-10" />

        <RelatedBlogPosts currentSlug={SLUG} />

        <footer className="mt-12 pt-8 border-t border-border">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Related:{" "}
            <Link
              href="/blog/piti-explained-rental-property"
              className="tc-link"
            >
              PITI explained →
            </Link>{" "}
            ·{" "}
            <Link
              href="/blog/how-to-calculate-noi-rental-property"
              className="tc-link"
            >
              How to calculate NOI →
            </Link>{" "}
            ·{" "}
            <Link
              href="/blog/capex-maintenance-reserves-rental-property"
              className="tc-link"
            >
              CapEx &amp; reserves →
            </Link>
          </p>
        </footer>
      </ArticleMain>
      <ArticleEnd>
        <BlogStickyCta inArticleColumn />
      </ArticleEnd>
      <SiteFooter />
      <ScrollDepthTracker />
    </ArticlePage>
  );
}
