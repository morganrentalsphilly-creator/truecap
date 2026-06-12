/**
 * Schema.org BreadcrumbList JSON-LD for /vs/* comparison pages —
 * sibling of ToolBreadcrumbSchema (see that file for the why: friendly
 * SERP breadcrumb trails typically lift CTR 5-15%).
 *
 * Deliberately TWO levels (TrueCap › TrueCap vs X), not three: the /vs
 * hub is noindex by design, and breadcrumb items should point at
 * indexable pages.
 *
 * Usage (inside an /vs/<slug>/page.tsx file):
 *   <VsBreadcrumbSchema vsPath="/vs/dealcheck" pageName="TrueCap vs DealCheck" />
 */

import { getSiteUrl } from "@/lib/site-url";

type Props = {
  /** Path starting with /vs/ (no trailing slash, no full URL). */
  vsPath: string;
  /** Friendly page name as it appears in the SERP breadcrumb. */
  pageName: string;
};

export function VsBreadcrumbSchema({ vsPath, pageName }: Props) {
  const siteUrl = getSiteUrl();

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
        name: pageName,
        item: `${siteUrl}${vsPath}`,
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
    />
  );
}
