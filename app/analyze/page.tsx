/**
 * /analyze — the no-account first-decision flow, on its own route.
 *
 * STATIC (ISR, hourly) like the homepage: reads no cookies, so the edge serves
 * cached HTML. Signed-in visitors never see this file — proxy.ts rewrites
 * /analyze to /home-authed when an auth cookie is present, and that route
 * sends verified users to /dashboard/new (carrying `?address=`).
 *
 * The homepage keeps only the hero capture and must not import the analyzer
 * bundle; this route is where the ~470 KB calculator lives now.
 */

import type { Metadata } from "next";
import { Header } from "@/components/investcalc/header";
import {
  ANON_ANALYZER_PROPS,
  AnalyzePageContent,
} from "@/components/marketing/analyze-page-content";
import { SiteFooter } from "@/components/marketing/site-footer";
import { JsonLd } from "@/components/seo/json-ld";
import { getSiteUrl } from "@/lib/site-url";
import { OPEN_GRAPH_BASE } from "@/lib/seo/open-graph-base";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: { absolute: "Analyze a Rental Property Free | TrueCap" },
  description:
    "Enter an address or paste a listing link. See cash flow, DSCR, and the highest price that still meets your targets, every assumption editable. No account.",
  alternates: { canonical: "/analyze" },
  // A page-level openGraph REPLACES the root's wholesale (see app/page.tsx),
  // so the site name, locale, type and a matching twitter block are declared
  // here, or the share card carries the root's twitter:title. No `images` on
  // either block: the sibling opengraph-image.tsx is this page's card, and
  // Next serves a file card only when the page names no image of its own.
  openGraph: {
    ...OPEN_GRAPH_BASE,
    title: "Analyze a Rental Property Free | TrueCap",
    description:
      "Cash flow, DSCR, and the highest price that still meets your targets, from an address. No account.",
    url: "/analyze",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Analyze a Rental Property Free | TrueCap",
    description:
      "Cash flow, DSCR, and the highest price that still meets your targets, from an address. No account.",
  },
};

export default function AnalyzePage() {
  const siteUrl = getSiteUrl();
  // The analyzer on this route IS the homepage's SoftwareApplication
  // (app/page.tsx, @id /#software): point at that entity by @id instead of
  // declaring a second copy of it (F4).
  const webPageLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${siteUrl}/analyze#webpage`,
    url: `${siteUrl}/analyze`,
    name: "Analyze a Rental Property Free",
    isPartOf: { "@id": `${siteUrl}/#website` },
    mainEntity: { "@id": `${siteUrl}/#software` },
    publisher: { "@id": `${siteUrl}/#organization` },
  };
  return (
    <div className="relative overflow-x-clip">
      <JsonLd data={webPageLd} />
      <Header initialUser={null} initialEntitlements={null} />
      <AnalyzePageContent analyzerProps={ANON_ANALYZER_PROPS} />
      <SiteFooter disclaimer={false} />
    </div>
  );
}
