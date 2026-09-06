import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, MapPin } from "lucide-react";
import { CityStrategyGuides } from "@/components/marketing/city-strategy-guides";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SeoAnalyzerCta } from "@/components/marketing/seo-analyzer-cta";
import { SiteFooter } from "@/components/marketing/site-footer";
import { getSiteUrl } from "@/lib/site-url";

export type SafeMarketPageIdentity = {
  city: string;
  stateCode: string;
  stateName: string;
  stateSlug: string;
  slug: string;
  /** Optional analyzer address when the display city names a wider metro. */
  analyzerAddress?: string;
};

export function buildSafeMarketMetadata({
  city,
  stateCode,
  slug,
}: SafeMarketPageIdentity): Metadata {
  const title = `${city} rental property analysis`;
  const description = `Start a preliminary ${city}, ${stateCode} rental-property screen with editable assumptions. Verify asking price, rent, property tax, insurance, financing, and local rules before relying on the result.`;
  return {
    title,
    description,
    alternates: { canonical: `/markets/${slug}` },
    openGraph: {
      title,
      description,
      url: `/markets/${slug}`,
      type: "website",
      images: [
        {
          url: "/home.jpg",
          width: 1200,
          height: 630,
          alt: `TrueCap ${city} rental analysis`,
        },
      ],
    },
    twitter: { card: "summary_large_image", images: ["/home.jpg"] },
  };
}

const VERIFICATION_STEPS = [
  "Replace any price placeholder with the current asking price or reviewed acquisition basis.",
  "Compare the rent assumption with recent, relevant local evidence for the property type and condition.",
  "Enter the parcel-specific property-tax bill or a locally reviewed post-sale estimate.",
  "Replace the national owner-occupied rate benchmark with an investment-property lender quote.",
  "Confirm insurance, HOA, licensing, zoning, rental, and short-term-rental restrictions with the responsible local sources.",
] as const;

export function SafeMarketPage(identity: SafeMarketPageIdentity) {
  const { city, stateCode, stateName, stateSlug, slug } = identity;
  const siteUrl = getSiteUrl();
  const canonicalUrl = `${siteUrl}/markets/${slug}`;
  const address = identity.analyzerAddress ?? `${city}, ${stateCode}`;
  const title = `${city} rental property analysis`;
  const description = `Start a ${city}, ${stateCode} rental-property screen with labeled, editable assumptions. TrueCap doesn't publish local market ranges or legal claims for ${city}; verify those locally.`;
  const webpageLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${canonicalUrl}#page`,
    name: title,
    description,
    url: canonicalUrl,
    inLanguage: "en-US",
    isPartOf: { "@id": `${siteUrl}/#website` },
    about: {
      "@type": "Place",
      name: `${city}, ${stateCode}`,
      address: {
        "@type": "PostalAddress",
        addressLocality: city,
        addressRegion: stateCode,
        addressCountry: "US",
      },
    },
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
        name: "Markets",
        item: `${siteUrl}/markets`,
      },
      { "@type": "ListItem", position: 3, name: city, item: canonicalUrl },
    ],
  };

  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webpageLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <main id="main" className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="mb-2">
          <Link
            href="/markets"
            className="text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground"
          >
            ← Rental markets
          </Link>
        </div>

        <header className="mb-10">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-card px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-primary">
            <MapPin className="size-3" />
            {city}, {stateCode}
          </div>
          <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-foreground sm:text-4xl">
            {city} rental property analysis
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Use this page to start an editable property screen—not as a market
            report. TrueCap can show labeled HUD area-rent and FRED national
            owner-occupied rate benchmarks when available. Asking price,
            property tax, insurance, financing, and local requirements still
            need property-specific verification.
          </p>
        </header>

        <section className="mb-10 rounded-2xl border border-border bg-card p-5 sm:p-6">
          <h2 className="text-xl font-extrabold text-foreground">
            What this page doesn&apos;t publish
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            TrueCap doesn&apos;t publish cap-rate, rent, appreciation,
            population, tax, insurance, landlord-law, or neighborhood rankings
            for {city}. Those values change and can differ parcel by parcel,
            so verify them locally.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-extrabold text-foreground">
            What to verify for a {city} property
          </h2>
          <ul className="mt-4 space-y-3">
            {VERIFICATION_STEPS.map((step) => (
              <li
                key={step}
                className="flex gap-3 text-sm leading-relaxed text-muted-foreground"
              >
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>{step}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            For state-level verification context, see the{" "}
            <Link
              href={`/states/${stateSlug}`}
              className="font-semibold text-primary hover:underline"
            >
              {stateName} analysis guide
            </Link>
            . It leaves local facts to your own verification, too.
          </p>
        </section>

        <SeoAnalyzerCta
          context={`a ${city} property`}
          handoff={{ address }}
          utmSource="market"
          supportingText={`Start with ${address} in the address field. Review every labeled starting assumption and replace it with property-specific evidence.`}
        />

        <CityStrategyGuides citySlug={slug} cityName={city} />
      </main>
      <SiteFooter />
      <ScrollDepthTracker />
    </div>
  );
}
