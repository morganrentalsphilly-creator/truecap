import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/investcalc/header";
import { SiteFooter } from "@/components/marketing/site-footer";
import {
  HomepageFaq,
  VsCompetitors,
} from "@/components/marketing/landing-sections";
import {
  ActionRow,
  CloseSection,
  PageHero,
} from "@/components/marketing/page-parts";
import { buttonVariants } from "@/components/ui/button";

/**
 * Dedicated "Why TrueCap" page: the workflow comparison (spreadsheets,
 * traditional analysis software, TrueCap, then a fair word on DealCheck and
 * BiggerPockets) and the agent and investor questions that used to live on
 * the homepage. Moved off the homepage to keep the landing minimal, but kept
 * for its SEO value: the comparison ranks for "TrueCap vs ..." intent.
 *
 * Neither FAQ list emits FAQPage JSON-LD here (structuredData={false}):
 * /for-agents claims the agent set and the homepage its curated eight, and
 * only one URL should claim a given question.
 *
 * Static — no per-user data. The Header self-corrects to the real session
 * client-side, same as the homepage.
 */
export const metadata: Metadata = {
  title: { absolute: "Why TrueCap for Rental Property Analysis" },
  description:
    "Compare TrueCap with spreadsheets and rental analysis tools, including workflow, assumptions, Offer Ceiling, reports, and where each approach fits.",
  alternates: { canonical: "/why-truecap" },
  // Own OG/Twitter card so shares of this "vs competitor" money page show the
  // comparison intent, not the generic homepage card from layout.tsx. Mirrors
  // the /for-agents pattern; /home.jpg already exists.
  openGraph: {
    title: "Why TrueCap for Rental Property Analysis",
    description:
      "Compare TrueCap with spreadsheets and rental analysis tools, including workflow, assumptions, Offer Ceiling, reports, and where each approach fits.",
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
  twitter: {
    card: "summary_large_image",
    title: "Why TrueCap for Rental Property Analysis",
    description:
      "Compare TrueCap with spreadsheets and rental analysis tools, including workflow, assumptions, Offer Ceiling, reports, and where each approach fits.",
    images: ["/home.jpg"],
  },
};

export default function WhyTrueCapPage() {
  // The page's one analyzer action, set in the hero and again in the close.
  // A plain link, not AnalyzeCtaLink: that island fires the homepage's CTA
  // event, which would mislabel clicks from here.
  const analyzeAction = (
    <ActionRow>
      <Link
        href="/analyze"
        prefetch={false}
        className={buttonVariants({ size: "cta" })}
      >
        Analyze a property free
      </Link>
    </ActionRow>
  );

  return (
    <>
      <Header initialUser={null} initialEntitlements={null} />
      <main id="main">
        {/* The page's one H1, in the display voice; every section heading
            below stays an H2 under it. Its text is the one the 2026-08-02 SEO
            baseline added as an sr-only H1 (it echoes the OG image alt, not
            the <title>). The lede is the comparison's own introduction; the
            action and risk line repeat the close's, so the first screen
            carries the purpose, the case and the action. */}
        <PageHero
          title="Why TrueCap — vs spreadsheets, DealCheck & BiggerPockets"
          lede="These tools overlap. The meaningful difference is how they move you from a listing to a decision—not whether one can win every feature row."
          actions={analyzeAction}
          note="No card, no signup."
        />
        <VsCompetitors />
        <HomepageFaq structuredData={false} />
        <CloseSection
          heading="See it on your own deal."
          headingId="why-truecap-close-heading"
          lede={
            <>
              Type an address — get cap rate, cash flow, DSCR, and a
              plain-English verdict in 60 seconds. No card, no signup.
            </>
          }
          actions={analyzeAction}
        />
      </main>
      <SiteFooter />
    </>
  );
}
