/**
 * Renders Schema.org BreadcrumbList JSON-LD for any /tools/* subpage.
 *
 * Why this matters: without breadcrumb schema, Google shows a flat URL
 * like `usetruecap.com › tools › cap-rate-calculator` in SERPs. With
 * it, Google renders a clickable breadcrumb trail with friendly names
 * ("TrueCap › Free Tools › Cap rate calculator"). That single change
 * typically lifts SERP CTR by 5-15% on the affected pages — a free
 * win once the schema is in place.
 *
 * Usage (inside an /tools/<slug>/page.tsx file):
 *   import { ToolBreadcrumbSchema } from "@/components/marketing/tool-breadcrumb-schema";
 *   ...
 *   <ToolBreadcrumbSchema toolPath="/tools/cap-rate-calculator" toolName="Cap rate calculator" />
 *
 * Renders only the <script type="application/ld+json"> tag — no
 * visible UI. Pair with a real visible breadcrumb (the back-link
 * pattern most /tools pages already use) so the schema accurately
 * reflects on-page content (Google's spec requires this).
 */

import { getSiteUrl } from "@/lib/site-url";

type Props = {
  /** Path starting with /tools/ (no trailing slash, no full URL). */
  toolPath: string;
  /** Friendly tool name as it appears in the SERP breadcrumb. */
  toolName: string;
};

export function ToolBreadcrumbSchema({ toolPath, toolName }: Props) {
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
        name: "Free Tools",
        item: `${siteUrl}/tools`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: toolName,
        item: `${siteUrl}${toolPath}`,
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
