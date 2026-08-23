import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Header } from "@/components/investcalc/header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { HomepageFaq, VsCompetitors } from "@/components/marketing/landing-sections";

/**
 * Dedicated "Why TrueCap" page — houses the competitor comparison matrix
 * and the FAQ that used to live on the homepage. Moved off the homepage to
 * keep the landing minimal, but kept (not deleted) so they retain their SEO
 * value: the comparison content ranks for "TrueCap vs ..." intent and the FAQ
 * carries its FAQPage JSON-LD here for rich-result eligibility.
 *
 * Static — no per-user data. The Header self-corrects to the real session
 * client-side, same as the homepage.
 */
export const metadata: Metadata = {
  title: "Why TrueCap — vs Spreadsheets, DealCheck & BiggerPockets",
  description:
    "Compare the workflows behind spreadsheets, traditional rental-analysis software, and TrueCap—then choose the approach that fits how you invest.",
  alternates: { canonical: "/why-truecap" },
  // Own OG/Twitter card so shares of this "vs competitor" money page show the
  // comparison intent, not the generic homepage card from layout.tsx. Mirrors
  // the /for-agents pattern; /home.jpg already exists.
  openGraph: {
    title: "Why TrueCap — vs Spreadsheets, DealCheck & BiggerPockets",
    description:
      "A fair workflow comparison of spreadsheets, traditional rental-analysis software, and TrueCap.",
    url: "/why-truecap",
    type: "website",
    images: [
      {
        url: "/home.jpg",
        width: 1200,
        height: 630,
        alt: "Why TrueCap vs spreadsheets, DealCheck, and BiggerPockets",
      },
    ],
  },
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
};

export default function WhyTrueCapPage() {
  return (
    <>
      <Header initialUser={null} initialEntitlements={null} />
      <main id="main">
        {/* Single page-level H1 for the document outline. The visual lede is the
            VsCompetitors eyebrow ("Why TrueCap") + its H2, which reads well but
            left this page opening on an H2 with NO H1 — an a11y/SEO gap (screen
            readers and crawlers use the H1 as the page's name). Rendered sr-only
            so the existing layout is untouched; every section heading below stays
            an H2 nested under it. Mirrors the page <title>. */}
        <h1 className="sr-only">Why TrueCap — vs spreadsheets, DealCheck &amp; BiggerPockets</h1>
        <VsCompetitors />
        <HomepageFaq structuredData={false} />
        <section className="border-t border-border bg-background">
          <div className="mx-auto max-w-3xl px-4 py-14 text-center sm:px-6 sm:py-20">
            <h2 className="text-balance text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
              See it on your own deal.
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
              Type an address — get cap rate, cash flow, DSCR, and a plain-English
              verdict in 60 seconds. No card, no signup.
            </p>
            <Link
              href="/"
              className="mt-6 inline-flex h-12 items-center gap-2 rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground shadow-sm transition hover:-translate-y-0.5 sm:text-base"
            >
              Analyze a property free
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
