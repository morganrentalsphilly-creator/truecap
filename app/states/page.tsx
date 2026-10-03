/**
 * /states — index linking to source-first state verification pages.
 *
 * Only registry identity fields render here while exact tax, legal, insurance,
 * market, and strategy records remain STALE_REVIEW_REQUIRED.
 */

import type { Metadata } from "next";
import { IntentPrefetchLink } from "@/components/marketing/intent-prefetch-link";
import { Header } from "@/components/investcalc/header";
import { PageHero, UnderTitleAnalyzeLink } from "@/components/marketing/page-parts";
import { DATA_PAGE_MAIN_CLASS, DATA_PAGE_ROOT_CLASS } from "@/components/marketing/safe-market-page";
import { Section } from "@/components/marketing/section";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SiteFooter } from "@/components/marketing/site-footer";
import { STATES, STATE_COUNT } from "@/lib/states";
import { linkableStates } from "@/lib/seo/link-policy";
import { getSiteUrl } from "@/lib/site-url";
import { JsonLd } from "@/components/seo/json-ld";
import { BreadcrumbSchema } from "@/components/marketing/breadcrumb-schema";
import { OPEN_GRAPH_BASE } from "@/lib/seo/open-graph-base";

export const metadata: Metadata = {
  title: "Rental-property verification guides by state",
  description: `${STATE_COUNT} source-first state guides for verifying parcel tax, insurance, local rules, property evidence, and financing without unsourced statewide verdicts.`,
  keywords: [
    "best states for rental property investors",
    "rental property by state",
    "real estate investing by state",
    "landlord friendly states",
    "rental property tax by state",
  ],
  alternates: { canonical: "/states" },
  openGraph: {
    ...OPEN_GRAPH_BASE,
    title: "Rental-property verification guides by state",
    description: `${STATE_COUNT} source-first state verification guides.`,
    url: "/states",
    type: "website",
    images: [
      {
        url: "/home.jpg",
        width: 1200,
        height: 630,
        alt: "TrueCap state-by-state investing guide",
      },
    ],
  },
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
};

export default function StatesIndexPage() {
  const siteUrl = getSiteUrl();
  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Rental-property verification by state — ${STATE_COUNT} guides`,
    itemListElement: Object.values(STATES).map((s, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${siteUrl}/states/${s.slug}`,
      name: s.name,
    })),
  };

  return (
    <div className={DATA_PAGE_ROOT_CLASS}>
      <JsonLd data={itemListLd} />
      <BreadcrumbSchema items={[{ name: "States", path: "/states" }]} />
      <Header />

      <main id="main" tabIndex={-1} className={DATA_PAGE_MAIN_CLASS}>
        {/* The hero's action is the one short analyzer link under the H1
            (P2-80): this page had no analyzer link outside the header and
            the footer. */}
        <PageHero
          title="Rental-property verification by state"
          lede={
            <p>
              {STATE_COUNT} state guides for collecting property-specific tax,
              insurance, legal, condition, expense, rent, and financing evidence.
              These guides don&apos;t publish statewide tax rates, eviction
              timelines, or landlord rankings.
            </p>
          }
          actions={<UnderTitleAnalyzeLink />}
        />

        {/* The directory as a ruled list of whole-row links (the /vs hub's
            grammar), not a grid of cards: the state's name leads the row in
            the link style, the lines under it are its meta. The hero's bottom rule
            opens the section. */}
        <Section rule="none" rhythm="tight">
          <ul className="grid grid-cols-[minmax(0,1fr)] border-t-2 border-foreground sm:grid-cols-2 sm:gap-x-12 lg:grid-cols-3">
            {linkableStates(Object.values(STATES))
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((s) => (
                <li key={s.slug} className="flex min-w-0 flex-col border-b border-rule-soft">
                  <IntentPrefetchLink
                    href={`/states/${s.slug}`}
                    className="flex flex-1 flex-col py-4"
                  >
                    <p className="tc-link text-lg font-semibold">
                      {s.name}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {s.abbr} · Verification guide
                    </p>
                    <p className="mt-1 text-pretty text-sm leading-relaxed text-muted-foreground">
                      Parcel tax · insurance · controlling law · condition · rent ·
                      financing
                    </p>
                  </IntentPrefetchLink>
                </li>
              ))}
          </ul>
        </Section>
      </main>

      <SiteFooter />
      <ScrollDepthTracker />
    </div>
  );
}
