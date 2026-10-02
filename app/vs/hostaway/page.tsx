/**
 * /vs/hostaway — competitor comparison landing page.
 *
 * Target queries: "hostaway alternative", "hostaway vs hostfully", "hostaway vs guesty", "hostaway pricing", "short term rental software".
 * Hostaway is short-term rental property management software — channel manager, automation, dynamic pricing. Direct competitor to Hostfully, Guesty. Sweet spot is 3-100 STR properties.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { IntentPrefetchLink } from "@/components/marketing/intent-prefetch-link";
import { AuthorBio } from "@/components/marketing/author-bio";
import { BlogByline } from "@/components/marketing/blog-byline";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { ProductShot } from "@/components/marketing/product-shot";
import { SiteFooter } from "@/components/marketing/site-footer";
import { RelatedContent } from "@/components/marketing/related-content";
import { AnalyzeCtaLink } from "@/components/marketing/analyze-cta-link";
import {
  ComparisonFaq,
  type FaqItem,
} from "@/components/marketing/comparison-faq";
import { ActionRow, CloseSection } from "@/components/marketing/page-parts";
import { Section, SectionHeading } from "@/components/marketing/section";
import {
  VS_ACTIONS,
  VS_H1,
  VS_INTRO,
  VS_LEDE,
  VS_LINK_ROW,
  VS_NOTE,
  VS_PROSE,
  VS_SOURCES,
  VS_TLDR_GRID,
  VS_TLDR_LABEL,
  VS_TLDR_LIST,
  VsHero,
  VsMatrixTable,
} from "@/components/marketing/vs-page";
import { getSiteUrl } from "@/lib/site-url";
import { VsBreadcrumbSchema } from "@/components/marketing/vs-breadcrumb-schema";
import { buttonVariants } from "@/components/ui/button";
import { ScrollX } from "@/components/ui/scroll-x";
import { Header } from "@/components/investcalc/header";
import { lastmodFor } from "@/lib/seo/lastmod";
import { JsonLd } from "@/components/seo/json-ld";

export const metadata: Metadata = {
  title: "Hostaway vs TrueCap (2026): STR PM vs Deal Math",
  description:
    "Hostaway runs your STR portfolio after closing. TrueCap underwrites the deal before you buy. How the two fit together.",
  keywords: [
    "hostaway alternative",
    "hostaway vs hostfully",
    "hostaway vs guesty",
    "hostaway pricing",
    "short term rental software",
  ],
  alternates: { canonical: "/vs/hostaway" },
  openGraph: {
    title: "Hostaway vs TrueCap (2026): STR PM vs Deal Math",
    description:
      "Hostaway manages STRs after closing. TrueCap underwrites the deal before. Different stages.",
    url: "/vs/hostaway",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

type Verdict = "truecap" | "hostaway" | "tie";
type Row = {
  feature: string;
  truecap: string;
  hostaway: string;
  winner?: Verdict;
};

const MATRIX: Row[] = [
  {
    feature: "Lifecycle stage",
    truecap: "Pre-purchase — underwrite the STR deal",
    hostaway: "Post-purchase — host + manage STRs",
    winner: "tie",
  },
  {
    feature: "Cap rate / CoC / DSCR analysis",
    truecap: "Yes — full engine, editable rent input for STR scenarios",
    hostaway:
      "Not among Hostaway's listed features; its free tools cover Airbnb fees and rental arbitrage profit",
    winner: "truecap",
  },
  {
    feature: "10-year projection",
    truecap: "Pro — rent + expense + appreciation",
    hostaway: "Not among Hostaway's listed features",
    winner: "truecap",
  },
  {
    feature: "Deal score (0–100)",
    truecap: "Free — 0–100 score with factor breakdown",
    hostaway: "Not among Hostaway's listed features",
    winner: "truecap",
  },
  {
    feature: "Starting values (rent/rate/tax)",
    truecap: "HUD rent + FRED rate + manual local property tax",
    hostaway: "Not among Hostaway's listed features",
    winner: "truecap",
  },
  {
    feature: "Channel manager (Airbnb, Vrbo, Booking)",
    truecap: "No",
    hostaway: "Yes: channel manager, multi-calendar and unified inbox",
    winner: "hostaway",
  },
  {
    feature: "Guest messaging automation",
    truecap: "No",
    hostaway: "Yes: automated messages and AI replies",
    winner: "hostaway",
  },
  {
    feature: "Dynamic pricing",
    truecap: "No",
    hostaway:
      "Yes: its own Dynamic Pricing, plus PriceLabs, Wheelhouse and Beyond in its marketplace",
    winner: "hostaway",
  },
  {
    feature: "Cleaning + vendor scheduling",
    truecap: "No",
    hostaway:
      "Yes: automated tasks, plus Turno and Breezeway in its marketplace",
    winner: "hostaway",
  },
  {
    feature: "Mobile app",
    truecap: "PWA",
    hostaway: "Mobile app",
    winner: "tie",
  },
  {
    feature: "Free tier",
    truecap: "Yes — core cap rate, CoC, DSCR, and cash flow",
    hostaway:
      "No free plan; Hostaway quotes each portfolio and does not publish prices",
  },
  {
    feature: "Pricing model",
    truecap: "Free core; paid Pro — see live pricing",
    hostaway: "Custom quote based on listing count; no public price list",
  },
];

export default function VsHostawayPage() {
  const siteUrl = getSiteUrl();
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Hostaway vs TrueCap (2026): STR PM vs Deal Math",
    url: `${siteUrl}/vs/hostaway`,
    description:
      "Hostaway runs your STR portfolio after closing. TrueCap underwrites the deal before you buy. How the two fit together.",
    dateModified: lastmodFor("/vs/hostaway"),
    publisher: { "@id": `${siteUrl}/#organization` },
  };

  return (
    // relative + overflow-x-clip, as on the homepage and the /vs hub: no
    // descendant can make the phone page scroll sideways.
    <div className="relative overflow-x-clip">
      <Header initialUser={null} initialEntitlements={null} />
      <JsonLd data={structuredData} />
      <VsBreadcrumbSchema
        vsPath="/vs/hostaway"
        pageName="TrueCap vs Hostaway"
      />
      <main id="main" tabIndex={-1} className="min-w-0 outline-none">
        <VsHero>
          <h1 className={VS_H1}>
            TrueCap vs Hostaway:{" "}
            underwrite the STR, then run the portfolio
          </h1>
          <BlogByline />
          <p className={VS_LEDE}>
            Hostaway is a short-term rental management platform: a channel
            manager across Airbnb, Vrbo and Booking.com, automated guest
            messaging, dynamic pricing, and task automation.
            TrueCap models the property&apos;s pre-purchase economics from
            user-reviewed assumptions. TrueCap&apos;s Short-term Rental mode is
            a beta revenue screen: it models revenue as nightly rate ×
            occupancy and does not fully model platform fees, turnover, lodging
            tax, seasonality, or local STR eligibility. Different stages,
            complementary tools.
          </p>
          <ActionRow className={VS_ACTIONS}>
            <AnalyzeCtaLink analyticsSource="vs_hero" className={buttonVariants({ size: "cta" })}>
              Run a deal — 60 seconds
            </AnalyzeCtaLink>
            <Link
              href="/pricing"
              className={buttonVariants({ variant: "outline", size: "cta" })}
            >
              See TrueCap pricing
            </Link>
          </ActionRow>
          <p className={VS_NOTE}>
            Free analyzer: no card or signup
          </p>
        </VsHero>

        {/* Real product screenshot from the free sample deal, set as a
            document (no fake browser frame). */}
        <Section rule="none" rhythm="tight" aria-label="What the decision looks like">
          <ProductShot
            shot="verdict"
            frame="document"
            priority
            sizes="(min-width: 768px) 768px, 100vw"
            className="max-w-3xl"
            alt="TrueCap's decision view for the sample deal: the Offer Ceiling beside the asking price, cash flow after reserves, and DSCR"
            caption={<>Real output from the free sample deal. <Link href="/analyze?sample=1" prefetch={false} className="tc-link">Run it yourself</Link></>}
          />
        </Section>

        {/* TL;DR */}
        <Section rhythm="tight" aria-labelledby="vs-tldr-heading">
          <SectionHeading id="vs-tldr-heading">
            TL;DR
          </SectionHeading>
          <div className={VS_TLDR_GRID}>
            <div className="min-w-0">
              <h3 className={VS_TLDR_LABEL}>
                Use TrueCap when
              </h3>
              <ul className={VS_TLDR_LIST}>
                <li>You&apos;re evaluating a property as a potential STR.</li>
                <li>You want cap rate, DSCR, cash flow before buying.</li>
                <li>
                  You want to compare LTR and STR scenarios on the same
                  property.
                </li>
                <li>You&apos;re not yet hosting guests.</li>
              </ul>
            </div>
            <div className="min-w-0">
              <h3 className={VS_TLDR_LABEL}>
                Use Hostaway when
              </h3>
              <ul className={VS_TLDR_LIST}>
                <li>You own or are about to own a short-term rental.</li>
                <li>You host guests and need a channel manager and automation.</li>
                <li>
                  You want a unified inbox across Airbnb / Vrbo / Booking.com.
                </li>
                <li>
                  You want dynamic pricing and task automation in the same
                  system.
                </li>
              </ul>
            </div>
          </div>
        </Section>

        {/* Matrix */}
        <Section aria-labelledby="vs-matrix-heading">
          <SectionHeading id="vs-matrix-heading">
            Feature-by-feature
          </SectionHeading>
          <p className={VS_INTRO}>
            Side-by-side on every dimension that matters for a
            comparison-shopping investor.
          </p>
          <ScrollX label="Comparison table" className="mt-8 max-w-5xl">
            <VsMatrixTable
              head={["Feature", "TrueCap", "Hostaway"]}
              rows={MATRIX.map((row) => ({
                label: row.feature,
                truecap: row.truecap,
                competitor: row.hostaway,
                winner: row.winner === "hostaway" ? "competitor" : row.winner,
              }))}
            />
          </ScrollX>
          <p className={VS_SOURCES}>
            Hostaway features were checked against hostaway.com in October
            2026. Hostaway does not publish prices: its{" "}
            <a
              href="https://www.hostaway.com/pricing/"
              target="_blank"
              rel="noopener"
              className="tc-link"
            >
              pricing page
            </a>{" "}
            is a quote form that starts with your listing count.
          </p>
        </Section>

        {/* Complementary workflow */}
        <Section aria-labelledby="vs-fit-heading">
          <SectionHeading id="vs-fit-heading">
            How TrueCap and Hostaway fit together
          </SectionHeading>
          <div className={VS_PROSE}>
            <ol>
              <li>
                <strong>Source the property.</strong> MLS, off-market, or existing
                STR being sold.
              </li>
              <li>
                <strong>Model the STR underwrite in TrueCap.</strong> Enter the
                monthly revenue you expect in the rent field, or a nightly rate
                and occupancy in the Short-term Rental mode. Use figures you
                can support. Run cap rate, DSCR, cash flow.
              </li>
              <li>
                <strong>If the deal pencils, close.</strong> Take ownership.
              </li>
              <li>
                <strong>Set up the STR in Hostaway.</strong> Import to Airbnb /
                Vrbo / Booking; configure dynamic pricing; automate guest messages
                and cleaning turnover.
              </li>
              <li>
                <strong>Operate.</strong> Hostaway runs day-to-day. Pair with
                PriceLabs (pricing), Turno (cleaning), and Stessa or Baselane
                (accounting).
              </li>
            </ol>
            <p>
              Only need the underwriting half? Our walkthroughs on{" "}
              <IntentPrefetchLink
                href="/blog/how-to-calculate-cap-rate"
                className="tc-link"
              >
                how to calculate cap rate
              </IntentPrefetchLink>{" "}
              and{" "}
              <IntentPrefetchLink
                href="/blog/how-to-calculate-dscr"
                className="tc-link"
              >
                how to calculate DSCR
              </IntentPrefetchLink>{" "}
              show where each number comes from, and the{" "}
              <IntentPrefetchLink
                href="/blog/short-term-rental-underwriting-playbook"
                className="tc-link"
              >
                short-term rental underwriting playbook
              </IntentPrefetchLink>{" "}
              covers the STR-specific adjustments — seasonality, cleaning, and
              turnover. When you want cap rate, DSCR and cash flow computed from an
              address instead of by hand, run the full{" "}
              <Link
                href="/analyze" prefetch={false}
                className="tc-link"
              >
                TrueCap analyzer
              </Link>
              .
            </p>
          </div>
        </Section>

        <ComparisonFaq
          competitorName="Hostaway"
          items={HOSTAWAY_FAQ}
          reviewedDate="October 2026"
        />

        {/* Pricing CTA */}
        <CloseSection
          headingId="vs-close-heading"
          heading={<>Underwrite the next deal — free.</>}
          lede={
            <>
              TrueCap free covers cap rate, CoC, DSCR, and monthly cash flow.
              Pro adds 10-year cash-flow and equity projections, sensitivity, the
              Offer Ceiling, co-branded share links, and PDF reports; see live
              pricing for current terms. No card to start.
            </>
          }
          actions={
            <ActionRow>
              <Link
                href="/analyze" prefetch={false}
                className={buttonVariants({ size: "cta" })}
              >
                Run a deal now
              </Link>
              <IntentPrefetchLink
                href="/pricing"
                className={buttonVariants({ variant: "outline", size: "cta" })}
              >
                See Pro pricing
              </IntentPrefetchLink>
            </ActionRow>
          }
        />

        <Section rule="none" rhythm="tight">
          <div className="max-w-5xl">
            <RelatedContent kind="vs" slug="hostaway" />
            <AuthorBio />

            <footer className="mt-10 border-t border-border pt-6">
              <p className="text-lg font-semibold">Other comparisons:</p>
              <ul className="mt-2 grid gap-x-8 sm:grid-cols-2">
                <li>
                  <IntentPrefetchLink
                    href="/vs/hostfully"
                    className={VS_LINK_ROW}
                  >
                    TrueCap vs Hostfully
                  </IntentPrefetchLink>
                </li>
                <li>
                  <IntentPrefetchLink
                    href="/vs/mashvisor"
                    className={VS_LINK_ROW}
                  >
                    TrueCap vs Mashvisor
                  </IntentPrefetchLink>
                </li>
                <li>
                  <IntentPrefetchLink
                    href="/vs/roofstock"
                    className={VS_LINK_ROW}
                  >
                    TrueCap vs Roofstock
                  </IntentPrefetchLink>
                </li>
              </ul>
            </footer>
          </div>
        </Section>
      </main>
      <SiteFooter />
      <ScrollDepthTracker />
    </div>
  );
}

const HOSTAWAY_FAQ: FaqItem[] = [
  {
    question: "Is TrueCap a Hostaway alternative?",
    answer: (
      <>
        No — different stages of the STR lifecycle. Hostaway manages STRs you
        already own. TrueCap underwrites the entered assumptions before
        purchase; the investor makes the decision. STR investors may use both.
      </>
    ),
  },
  {
    question: "Hostaway vs Hostfully vs Guesty — which one?",
    answer: (
      <>
        Compare Hostaway, Hostfully, and Guesty on current channel coverage,
        automation, accounting, API, support, implementation, and pricing.
        Guesty currently publishes Lite for 1-3 listings, Pro for 4-199, and
        Enterprise for 200+. TrueCap remains the pre-purchase underwriting
        layer.
      </>
    ),
  },
  {
    question: "Does TrueCap have STR-specific data?",
    answer: (
      <>
        Not natively — TrueCap pre-fills HUD long-term rent and lets you
        override it. For STR-specific data (ADR, occupancy rate, RevPAR by
        market), you&apos;d use AirDNA or Mashvisor. Plug their projected
        monthly revenue into TrueCap&apos;s rent field and run the underwrite
        from there.
      </>
    ),
  },
  {
    question: "Does Hostaway have a free tier?",
    answer: (
      <>
        No. Hostaway has no free plan and does not publish prices: its pricing
        page is a quote form that starts with how many listings you manage. Ask
        Hostaway for a quote for your listing count.
      </>
    ),
  },
  {
    question: "Can TrueCap model both LTR and STR for the same property?",
    answer: (
      <>
        Yes — run two separate analyses with different rent inputs. One with
        the long-term rent you can support from leases or comps (the HUD
        benchmark is only a starting placeholder), one with your STR projected
        monthly revenue (gross income ÷ 12 conservatively discounted). Then
        compare the cap rate, cash flow, and DSCR of the two; Pro compares
        saved deals side by side.
      </>
    ),
  },
];

