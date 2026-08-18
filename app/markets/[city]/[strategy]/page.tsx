/**
 * Dynamic city + strategy combo page at /markets/[city]/[strategy].
 *
 * Each entry in CITY_STRATEGY_COMBOS becomes a dedicated long-tail SEO
 * page. Targets queries like:
 *   - "BRRRR Philadelphia"
 *   - "cash flow Cleveland"
 *   - "house hacking Indianapolis"
 *   - "Section 8 Memphis"
 *   - "turnkey Memphis"
 *
 * Each combo gets a unique ranking URL with sharply-focused intent.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, X } from "lucide-react";
import { Header } from "@/components/investcalc/header";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SiteFooter } from "@/components/marketing/site-footer";
import {
  CITY_STRATEGY_COMBOS,
  getCityStrategyCombo,
} from "@/lib/city-strategy-combos";
import { getSiteUrl } from "@/lib/site-url";
import { buildAnalyzerHandoffUrl } from "@/lib/analyzer-handoff";
import { truncateMetaDescription } from "@/lib/utils";

export async function generateStaticParams() {
  return CITY_STRATEGY_COMBOS.map((c) => ({
    city: c.citySlug,
    strategy: c.strategy,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ city: string; strategy: string }>;
}): Promise<Metadata> {
  const { city, strategy } = await params;
  const combo = getCityStrategyCombo(city, strategy);
  if (!combo) return { title: "Combo not found" };
  // Keyword-first ("house hacking philadelphia"-class query) + year,
  // trimmed to the SERP window: longest combo is 46 chars, so with the
  // layout's " | TrueCap" the title never gets clipped.
  const title = `${combo.strategyLabel} investing in ${combo.cityName} (2026)`;
  return {
    title,
    description: truncateMetaDescription(combo.pitch),
    keywords: [
      `${combo.strategy} ${combo.cityName.toLowerCase()}`,
      `${combo.strategyLabel.toLowerCase()} ${combo.cityName.toLowerCase()}`,
      `${combo.cityName.toLowerCase()} ${combo.strategy}`,
      `${combo.strategyLabel.toLowerCase()} investing in ${combo.cityName.toLowerCase()}`,
      `${combo.cityName.toLowerCase()} rental property ${combo.strategyLabel.toLowerCase()}`,
      `${combo.strategyLabel.toLowerCase()} in ${combo.state.toLowerCase()}`,
    ],
    alternates: { canonical: `/markets/${combo.citySlug}/${combo.strategy}` },
    openGraph: {
      title,
      description: combo.pitch,
      url: `/markets/${combo.citySlug}/${combo.strategy}`,
      type: "article",
      images: [{ url: "/home.jpg", width: 1200, height: 630, alt: title }],
    },
    twitter: { card: "summary_large_image", images: ["/home.jpg"] },
  };
}

export default async function CityStrategyPage({
  params,
}: {
  params: Promise<{ city: string; strategy: string }>;
}) {
  const { city, strategy } = await params;
  const combo = getCityStrategyCombo(city, strategy);
  if (!combo) notFound();

  const siteUrl = getSiteUrl();
  const canonicalUrl = `${siteUrl}/markets/${combo.citySlug}/${combo.strategy}`;

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
      { "@type": "ListItem", position: 2, name: "Markets", item: `${siteUrl}/markets` },
      { "@type": "ListItem", position: 3, name: combo.cityName, item: `${siteUrl}/markets/${combo.citySlug}` },
      { "@type": "ListItem", position: 4, name: combo.strategyLabel, item: canonicalUrl },
    ],
  };

  const webPageLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${canonicalUrl}#page`,
    name: `${combo.strategyLabel} investing in ${combo.cityName}`,
    description: combo.pitch,
    url: canonicalUrl,
    dateModified: "2026-08-15",
    inLanguage: "en-US",
    isPartOf: { "@id": `${siteUrl}/#website` },
  };

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: `What should I verify before using ${combo.strategyLabel} in ${combo.cityName}?`,
        acceptedAnswer: { "@type": "Answer", text: combo.pitch },
      },
      {
        "@type": "Question",
        name: `What areas in ${combo.cityName} should I research for ${combo.strategyLabel}?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `Areas to research for ${combo.strategyLabel} in ${combo.cityName}: ${combo.neighborhoods.map((n) => n.name).join(", ")}. Verify the block, property, rent, expenses, and local rules before relying on any area-level description.`,
        },
      },
      {
        "@type": "Question",
        name: `What illustrative screening ranges are shown for ${combo.strategyLabel} in ${combo.cityName}?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `Illustrative screen only. Purchase: ${combo.typicalNumbers.purchasePrice}. Monthly rent: ${combo.typicalNumbers.monthlyRent}. Cap rate: ${combo.typicalNumbers.capRate}. ${combo.typicalNumbers.notes} Replace every range with current property-specific evidence before making an investment or financing decision.`,
        },
      },
    ],
  };

  return (
    <div className="min-h-screen bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <Header />

      <main className="mx-auto max-w-4xl px-4 sm:px-6 py-8 sm:py-12">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="mb-6 text-xs">
          <ol className="flex flex-wrap items-center gap-2 text-muted-foreground">
            <li><Link href="/" className="hover:text-foreground">Home</Link></li>
            <li aria-hidden="true">›</li>
            <li><Link href={`/markets/${combo.citySlug}`} className="hover:text-foreground">{combo.cityName}</Link></li>
            <li aria-hidden="true">›</li>
            <li className="font-semibold text-foreground">{combo.strategyLabel}</li>
          </ol>
        </nav>

        <p className="text-[11px] uppercase tracking-widest text-primary font-bold">
          {combo.cityName}, {combo.state} · {combo.strategyLabel}
        </p>
        <h1 className="mt-2 text-3xl sm:text-5xl font-extrabold text-foreground leading-[1.05] tracking-tight">
          {combo.strategyLabel.charAt(0).toUpperCase() + combo.strategyLabel.slice(1)} investing in {combo.cityName}
        </h1>
        <p className="mt-5 text-lg leading-relaxed text-muted-foreground">{combo.pitch}</p>

        {/* Why here, why now */}
        <section className="mt-12">
          <h2 className="text-2xl font-extrabold text-foreground mb-3">Why investors screen {combo.strategyLabel} in {combo.cityName}</h2>
          <p className="text-base leading-relaxed text-foreground">{combo.whyHereWhyNow}</p>
        </section>

        {/* Typical numbers */}
        <section className="mt-10 rounded-2xl border border-border bg-card p-6">
          <p className="text-[11px] uppercase tracking-widest text-primary font-bold mb-3">Illustrative {combo.strategyLabel} screening ranges in {combo.cityName}</p>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Purchase price</p>
              <p className="mt-1 text-lg font-extrabold text-foreground">{combo.typicalNumbers.purchasePrice}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Monthly rent</p>
              <p className="mt-1 text-lg font-extrabold text-foreground">{combo.typicalNumbers.monthlyRent}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Cap rate</p>
              <p className="mt-1 text-lg font-extrabold text-foreground">{combo.typicalNumbers.capRate}</p>
            </div>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            {combo.typicalNumbers.notes} These are orientation ranges, not a forecast, appraisal,
            quote, or promise of achievable performance. Replace them with current address-level
            rent comps, taxes, insurance, condition, financing terms, and local requirements.
          </p>
        </section>

        {/* Neighborhoods */}
        <section className="mt-12">
          <h2 className="text-2xl font-extrabold text-foreground mb-4">Areas to research for {combo.strategyLabel} in {combo.cityName}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {combo.neighborhoods.map((n) => (
              <article key={n.name} className="rounded-xl border border-border bg-card p-5">
                <p className="text-base font-bold text-foreground">{n.name}</p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{n.why}</p>
              </article>
            ))}
          </div>
        </section>

        {/* Pitfalls */}
        <section className="mt-12 rounded-2xl border border-amber-500/30 bg-amber-50/40 p-6">
          <h2 className="text-xl font-extrabold text-foreground mb-3">Common pitfalls to avoid</h2>
          <ul className="space-y-2">
            {combo.pitfalls.map((p) => (
              <li key={p} className="flex items-start gap-2 text-sm leading-relaxed text-foreground">
                <X className="mt-0.5 size-4 shrink-0 text-amber-600" />
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Tool CTA */}
        <section className="mt-12 rounded-2xl bg-primary p-6 sm:p-8 text-primary-foreground">
          <h2 className="text-xl sm:text-2xl font-extrabold mb-2">Run a {combo.cityName} {combo.strategyLabel} deal in 60 seconds</h2>
          <p className="text-sm sm:text-base opacity-90 mb-5">
            Paste an address into TrueCap and get cap rate, cash-on-cash, DSCR, and a 10-year scenario — pre-loaded with {combo.cityName}-area screening defaults that you can replace with property-specific evidence.
          </p>
          <Link
            // Geo + strategy handoff: brrrr/house-hack map 1:1 to analyzer
            // plays; the other combo strategies land on buy-and-hold.
            // #main lands them ON the analyzer, not the top of the homepage.
            href={`${buildAnalyzerHandoffUrl(
              {
                address: `${combo.cityName}, ${combo.state}`,
                strategy:
                  combo.strategy === "brrrr" || combo.strategy === "house-hack"
                    ? combo.strategy
                    : "buy-hold",
              },
              { utmSource: "combo-page" }
            )}#main`}
            className="inline-flex items-center gap-2 bg-primary-foreground text-primary px-4 py-2.5 rounded-xl font-bold hover:opacity-90 transition-opacity"
          >
            Get My Max Offer <ArrowRight className="size-4" />
          </Link>
        </section>

        {/* Related posts */}
        {combo.relatedPosts && combo.relatedPosts.length > 0 ? (
          <section className="mt-12 border-t border-border pt-6">
            <p className="text-xs uppercase tracking-widest text-muted-foreground font-bold mb-3">Related reading</p>
            <ul className="space-y-1.5 text-sm">
              {combo.relatedPosts.map((slug) => (
                <li key={slug}>
                  <Link href={`/blog/${slug}`} className="text-primary font-semibold hover:underline">
                    /blog/{slug.replaceAll("-", " ")} →
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {/* Other strategies in this city */}
        <section className="mt-12 border-t border-border pt-6">
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-bold mb-3">Other {combo.cityName} guides</p>
          <div className="flex flex-wrap gap-2 text-sm">
            <Link href={`/markets/${combo.citySlug}`} className="rounded-full border border-border bg-card px-3 py-1.5 font-semibold text-foreground/80 hover:border-primary/40 hover:text-primary">
              {combo.cityName} market overview
            </Link>
            {CITY_STRATEGY_COMBOS.filter((c) => c.citySlug === combo.citySlug && c.strategy !== combo.strategy).map((c) => (
              <Link key={c.strategy} href={`/markets/${c.citySlug}/${c.strategy}`} className="rounded-full border border-border bg-card px-3 py-1.5 font-semibold text-foreground/80 hover:border-primary/40 hover:text-primary">
                {c.strategyLabel} in {c.cityName}
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
