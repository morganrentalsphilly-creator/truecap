import { getSiteUrl } from "@/lib/site-url";

/**
 * Generic schema.org BreadcrumbList (docs/site-overhaul.md Phase 8.3).
 * Items point at INDEXABLE pages only; pass the trail from the homepage to
 * the current page. Sibling of VsBreadcrumbSchema, which stays for /vs.
 *
 *   <BreadcrumbSchema items={[{ name: "Free calculators", path: "/tools" }, { name: "Cap rate", path: "/tools/cap-rate-calculator" }]} />
 */
export function BreadcrumbSchema({ items }: { items: Array<{ name: string; path: string }> }) {
  const siteUrl = getSiteUrl();
  const ld = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "TrueCap", item: `${siteUrl}/` },
      ...items.map((item, index) => ({
        "@type": "ListItem",
        position: index + 2,
        name: item.name,
        item: `${siteUrl}${item.path}`,
      })),
    ],
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />;
}
