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

export const revalidate = 3600;

export const metadata: Metadata = {
  title: { absolute: "Analyze a Rental Property Free | TrueCap" },
  description:
    "Enter an address or paste a listing link. See cash flow, DSCR, and the highest price that still meets your targets, every assumption editable. No account.",
  alternates: { canonical: "/analyze" },
  openGraph: {
    title: "Analyze a Rental Property Free | TrueCap",
    description:
      "Cash flow, DSCR, and the highest price that still meets your targets, from an address. No account.",
    url: "/analyze",
  },
};

export default function AnalyzePage() {
  return (
    <div className="relative overflow-x-clip">
      <Header initialUser={null} initialEntitlements={null} />
      <AnalyzePageContent analyzerProps={ANON_ANALYZER_PROPS} />
      <SiteFooter />
    </div>
  );
}
