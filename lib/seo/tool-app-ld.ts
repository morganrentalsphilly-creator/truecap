/**
 * The application entity of a /tools/<slug> page (F4).
 *
 * Before F4 most tool pages emitted TWO app entities (a WebApplication and a
 * SoftwareApplication, each with its own Offer, neither with an @id, the
 * second with an inline publisher Organization), and three emitted a
 * SoftwareApplication beside a WebPage. Each tool page (the redirected,
 * unreleased ones too, so releasing one cannot bring the old markup back)
 * now emits exactly one WebApplication (a SoftwareApplication subtype for software
 * that runs in the browser) with a stable `@id` of
 * `${siteUrl}/tools/<slug>#app`, the publisher as the site Organization's
 * @id, and dateModified from the lastmod map. A page's other nodes (its
 * WebPage, if it has one) point at it by that @id.
 *
 * lib/__tests__/structured-data-f4.test.tsx renders every tool page,
 * released or not, and checks it carries exactly one application entity with
 * this @id.
 *
 * Pure: no React, no server-only.
 */

import { lastmodFor } from "@/lib/seo/lastmod";

export type ToolAppInput = {
  /** The /tools/<slug> segment. */
  slug: string;
  /** The tool's name, without the brand (the publisher carries it). */
  name: string;
  description: string;
  /** What the tool does, in a few short phrases. */
  featureList?: readonly string[];
};

/** The stable @id of a tool's application entity. */
export function toolAppId(siteUrl: string, slug: string): string {
  return `${siteUrl}/tools/${slug}#app`;
}

export function buildToolAppLd(siteUrl: string, input: ToolAppInput) {
  const path = `/tools/${input.slug}`;
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "@id": toolAppId(siteUrl, input.slug),
    name: input.name,
    description: input.description,
    url: `${siteUrl}${path}`,
    applicationCategory: "FinanceApplication",
    applicationSubCategory: "Real Estate Calculator",
    operatingSystem: "Web",
    dateModified: lastmodFor(path),
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
    },
    publisher: { "@id": `${siteUrl}/#organization` },
    ...(input.featureList && input.featureList.length > 0 ? { featureList: [...input.featureList] } : {}),
  };
}
