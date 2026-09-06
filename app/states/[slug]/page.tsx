/**
 * Dynamic state verification page at /states/[slug].
 *
 * The state registry contains hand-curated tax, legal, insurance, market, and
 * strategy notes that are explicitly classified STALE_REVIEW_REQUIRED. Until
 * each claim has an authoritative state/county dependency and as-of date, this
 * template may use only the record's identity fields (name, abbreviation, and
 * slug). Exact registry facts must not enter visible copy or JSON-LD.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/investcalc/header";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SeoAnalyzerCta } from "@/components/marketing/seo-analyzer-cta";
import { SiteFooter } from "@/components/marketing/site-footer";
import { getSiteUrl } from "@/lib/site-url";
import { STATES, getStateBySlug } from "@/lib/states";

export async function generateStaticParams() {
  return Object.values(STATES).map((state) => ({ slug: state.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const state = getStateBySlug(slug);
  if (!state) return { title: "State not found" };

  const title = `${state.name} rental-property verification guide`;
  const description = `Review the property-specific rent, tax, insurance, legal, condition, expense, and financing evidence needed for a ${state.name} rental screen.`;

  return {
    title,
    description,
    keywords: [
      `${state.name.toLowerCase()} rental property analysis`,
      `${state.name.toLowerCase()} property tax verification`,
      `${state.name.toLowerCase()} landlord law sources`,
      `${state.abbr.toLowerCase()} rental property`,
    ],
    alternates: { canonical: `/states/${state.slug}` },
    openGraph: {
      title,
      description,
      url: `/states/${state.slug}`,
      type: "article",
      images: [
        {
          url: "/home.jpg",
          width: 1200,
          height: 630,
          alt: `${state.name} rental-property verification guide`,
        },
      ],
    },
    twitter: { card: "summary_large_image", images: ["/home.jpg"] },
  };
}

export default async function StatePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const state = getStateBySlug(slug);
  if (!state) notFound();

  const siteUrl = getSiteUrl();
  const canonicalUrl = `${siteUrl}/states/${state.slug}`;
  const description = `A source-first checklist for reviewing a specific ${state.name} rental property. This page doesn't publish statewide tax, legal, insurance, return, or strategy estimates.`;

  const placeLd = {
    "@context": "https://schema.org",
    "@type": "Place",
    name: state.name,
    url: canonicalUrl,
    address: {
      "@type": "PostalAddress",
      addressRegion: state.abbr,
      addressCountry: "US",
    },
  };
  const webPageLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${canonicalUrl}#page`,
    name: `${state.name} rental-property verification guide`,
    description,
    url: canonicalUrl,
    dateModified: "2026-08-29",
    inLanguage: "en-US",
    isPartOf: { "@id": `${siteUrl}/#website` },
  };
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
      {
        "@type": "ListItem",
        position: 2,
        name: "States",
        item: `${siteUrl}/states`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: state.name,
        item: canonicalUrl,
      },
    ],
  };
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: `Does this page say whether ${state.name} is a good rental-property market?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `No. A state label doesn't establish a property's economics. Review the specific address, asking price, rent, expenses, condition, financing, and the rules that apply.`,
        },
      },
      {
        "@type": "Question",
        name: `What property-tax figure should I use for a ${state.name} property?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `Use the current parcel bill or a reviewed local effective rate, then check the assessment, exemption, transfer, and appeal rules with state and local sources. TrueCap does not auto-fill property tax; enter your local number.`,
        },
      },
      {
        "@type": "Question",
        name: `Does TrueCap summarize ${state.name} landlord law?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `No. TrueCap doesn't publish a legal summary for ${state.name}. Check the controlling statute, court rules, agency guidance, and local ordinances with qualified counsel before relying on a legal timeline or classification.`,
        },
      },
    ],
  };

  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(placeLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />
      <Header />

      <main id="main" className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
        <nav aria-label="Breadcrumb" className="mb-6 text-xs">
          <ol className="flex flex-wrap items-center gap-2 text-muted-foreground">
            <li>
              <Link href="/" className="hover:text-foreground">
                Home
              </Link>
            </li>
            <li aria-hidden="true">›</li>
            <li>
              <Link href="/states" className="hover:text-foreground">
                States
              </Link>
            </li>
            <li aria-hidden="true">›</li>
            <li className="font-semibold text-foreground">{state.name}</li>
          </ol>
        </nav>

        <p className="text-[11px] font-bold uppercase tracking-widest text-primary">
          {state.abbr} · Source-first state guide
        </p>
        <h1 className="mt-2 text-3xl font-extrabold leading-[1.05] tracking-tight text-foreground sm:text-5xl">
          {state.name} rental-property verification guide
        </h1>
        <p className="mt-5 text-lg leading-relaxed text-foreground">
          A statewide average or label can&apos;t determine a property&apos;s
          rent, tax, insurance, legal constraints, operating costs, financing,
          or investment fit. This page shows you what to verify. It doesn&apos;t
          publish statewide tax rates, eviction timelines, or landlord rankings.
        </p>

        <section className="mt-10 rounded-2xl border border-border bg-card p-6">
          <h2 className="text-xl font-extrabold text-foreground">
            Evidence to collect for a {state.name} property
          </h2>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-foreground">
            <li>
              Current comparable leases, the existing lease, and collection
              history.
            </li>
            <li>
              The parcel bill plus the responsible assessor and taxing
              jurisdictions.
            </li>
            <li>
              Applicable assessment, exemption, transfer, appeal, and income-tax
              rules from authoritative sources.
            </li>
            <li>
              Property-specific insurance quotes, covered perils, exclusions,
              deductibles, and replacement-cost assumptions.
            </li>
            <li>
              Condition, inspections, utilities, HOA or association terms,
              management scope, and planned work.
            </li>
            <li>
              Written loan terms and the lender&apos;s own income, expense,
              DSCR, reserve, and approval method.
            </li>
            <li>
              Controlling state statutes, court rules, agency guidance, and
              local ordinances reviewed with qualified counsel.
            </li>
          </ul>
        </section>

        <section className="mt-8 rounded-2xl border border-amber-500/30 bg-amber-50/40 p-6">
          <h2 className="text-base font-extrabold text-foreground">
            What this page doesn&apos;t publish
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-foreground">
            Property-tax percentages, income-tax rates, eviction timelines,
            landlord ratings, insurance trends, city rankings, strategy labels,
            and market narratives are not on this page. A generic source list
            doesn&apos;t back up state-specific claims, so we don&apos;t publish
            them until each one has an official source and a fresh review.
          </p>
        </section>

        <div className="mt-12">
          <SeoAnalyzerCta
            context={`a ${state.name} property`}
            utmSource="state-page"
            supportingText={`Enter a supported address and asking price to start from labeled rent and rate benchmarks with editable assumptions. Enter ${state.name} property tax and insurance from local evidence.`}
          />
        </div>

        <section className="mt-10 rounded-2xl border border-border bg-card p-6 sm:p-8">
          <h2 className="text-base font-extrabold text-foreground">
            Review a {state.name} property in three steps
          </h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-foreground">
            <li>
              Collect the property-specific evidence above and record each
              source and its date.
            </li>
            <li>
              Enter a supported address and asking price in the{" "}
              <Link
                href="/#main"
                className="font-semibold text-primary hover:underline"
              >
                TrueCap analyzer
              </Link>
              , then replace every generic or area-level starting assumption.
            </li>
            <li>
              Read the{" "}
              <Link
                href="/methodology"
                className="font-semibold text-primary hover:underline"
              >
                Methodology
              </Link>{" "}
              for how the model works, and get local tax, legal, insurance,
              condition, and lending advice where you need it.
            </li>
          </ol>
        </section>

        <section className="mt-12 border-t border-border pt-6">
          <p className="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Other state verification guides
          </p>
          <div className="flex flex-wrap gap-2 text-sm">
            {Object.values(STATES)
              .filter((candidate) => candidate.slug !== state.slug)
              .map((candidate) => (
                <Link
                  key={candidate.slug}
                  href={`/states/${candidate.slug}`}
                  className="rounded-full border border-border bg-card px-3 py-1.5 font-semibold text-foreground/80 hover:border-primary/40 hover:text-primary"
                >
                  {candidate.name}
                </Link>
              ))}
          </div>
        </section>
      </main>

      <SiteFooter />
      <ScrollDepthTracker />
    </div>
  );
}
