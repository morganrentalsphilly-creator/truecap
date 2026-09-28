import { getSiteUrl } from "@/lib/site-url";
import { JsonLd } from "@/components/seo/json-ld";

/**
 * Generic schema.org BreadcrumbList (docs/site-overhaul.md Phase 8.3).
 * Items point at INDEXABLE pages only; pass the trail from the homepage to
 * the current page. The homepage crumb ("TrueCap") is added here.
 *
 *   <BreadcrumbSchema items={[{ name: "Free Tools", path: "/tools" }, { name: "Cap rate", path: "/tools/cap-rate-calculator" }]} />
 *
 * Used by the hubs (/blog, /tools, /vs, /markets, /states, /glossary: TrueCap ›
 * Hub, F4) and by VsBreadcrumbSchema (TrueCap › Comparisons › page).
 */
export function BreadcrumbSchema({ items }: { items: ReadonlyArray<{ name: string; path: string }> }) {
  const siteUrl = getSiteUrl();
  const ld = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "TrueCap", item: siteUrl },
      ...items.map((item, index) => ({
        "@type": "ListItem",
        position: index + 2,
        name: item.name,
        item: `${siteUrl}${item.path}`,
      })),
    ],
  };
  return <JsonLd data={ld} />;
}
