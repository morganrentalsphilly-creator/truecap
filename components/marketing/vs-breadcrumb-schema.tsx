/**
 * Schema.org BreadcrumbList JSON-LD for /vs/* comparison pages — sibling of
 * ToolBreadcrumbSchema (see that file for the why: friendly SERP breadcrumb
 * trails instead of a flat URL).
 *
 * Three levels: TrueCap › Comparisons (/vs) › TrueCap vs X. It used to stop at
 * two because the /vs hub was noindex; the hub is indexable and in the sitemap
 * now (lib/__tests__/public-metadata-contract.test.ts), so the trail names it
 * (F4). The hub itself carries TrueCap › Comparisons (app/vs/page.tsx).
 *
 * Usage (inside an /vs/<slug>/page.tsx file):
 *   <VsBreadcrumbSchema vsPath="/vs/dealcheck" pageName="TrueCap vs DealCheck" />
 */

import { BreadcrumbSchema } from "@/components/marketing/breadcrumb-schema";

/** The /vs hub's crumb, shared with the hub's own BreadcrumbList. */
export const VS_HUB_CRUMB = { name: "Comparisons", path: "/vs" } as const;

type Props = {
  /** Path starting with /vs/ (no trailing slash, no full URL). */
  vsPath: string;
  /** Friendly page name as it appears in the SERP breadcrumb. */
  pageName: string;
};

export function VsBreadcrumbSchema({ vsPath, pageName }: Props) {
  return <BreadcrumbSchema items={[VS_HUB_CRUMB, { name: pageName, path: vsPath }]} />;
}
