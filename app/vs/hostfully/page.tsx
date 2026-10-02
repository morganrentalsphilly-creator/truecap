/**
 * /vs/hostfully — competitor comparison landing page.
 *
 * Target queries: "hostfully alternative", "hostfully vs", "hostfully pricing", "hostfully review", "short term rental software".
 * Hostfully is short-term rental / Airbnb property management software — channel manager, guest messaging, dynamic pricing. STR-only. TrueCap users evaluate it once they own an STR.
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
  title: "Hostfully vs TrueCap (2026): Manage vs Underwrite",
  description:
    "Hostfully manages short-term rentals after you buy them. TrueCap underwrites them before. Honest comparison and how the two fit together.",
  keywords: [
    "hostfully alternative",
    "hostfully vs",
    "hostfully pricing",
    "hostfully review",
    "short term rental software",
  ],
  alternates: { canonical: "/vs/hostfully" },
  openGraph: {
    title: "Hostfully vs TrueCap (2026): Manage vs Underwrite",
    description:
      "Hostfully runs your STR after closing. TrueCap underwrites the deal before. Different stages of the STR lifecycle.",
    url: "/vs/hostfully",
    type: "website",
    images: [
      {
        url: "/home.jpg",
        width: 1200,
        height: 630,
        alt: "TrueCap vs Hostfully",
      },
    ],
  },
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
};

type Verdict = "truecap" | "hostfully" | "tie";
type Row = {
  feature: string;
  truecap: string;
  hostfully: string;
  winner?: Verdict;
};

const MATRIX: Row[] = [
  {
    feature: "Lifecycle stage",
    truecap: "Pre-purchase — underwrite the STR deal",
    hostfully: "Post-purchase — host + manage the STR",
    winner: "tie",
  },
  {
    feature: "Cap rate / CoC / DSCR analysis",
    truecap: "Yes — full engine (long-term rental model)",
    hostfully:
      "Not among Hostfully's listed features; its free tools compare mid-term and short-term revenue and rate a listing",
    winner: "truecap",
  },
  {
    feature: "Underwriting math (purchase decision)",
    truecap: "Yes — full engine + Pro projections",
    hostfully: "Not among Hostfully's listed features",
    winner: "truecap",
  },
  {
    feature: "Starting values (rent/rate/tax)",
    truecap: "HUD rent + FRED rate + manual local property tax",
    hostfully: "Not among Hostfully's listed features",
    winner: "truecap",
  },
  {
    feature: "Channel manager (Airbnb, Vrbo)",
    truecap: "No",
    hostfully: "Yes: channel manager, central calendar and unified inbox",
    winner: "hostfully",
  },
  {
    feature: "Dynamic pricing",
    truecap: "No",
    hostfully: "Through integration partners such as PriceLabs",
    winner: "hostfully",
  },
  {
    feature: "Guest messaging automation",
    truecap: "No",
    hostfully: "Yes: unified inbox with InboxAI, plus automation tools",
    winner: "hostfully",
  },
  {
    feature: "Cleaning / vendor scheduling",
    truecap: "No",
    hostfully:
      "Task management built in; cleaning and turnover through integration partners",
    winner: "hostfully",
  },
  {
    feature: "Free tier",
    truecap: "Yes — core cap rate, CoC, DSCR, and cash flow",
    hostfully: "No free plan and no free trial; a free demo",
  },
  {
    feature: "STR-specific underwriting (ADR, occupancy)",
    truecap: "Inputs editable; not auto-pulled",
    hostfully: "Not among Hostfully's listed features",
    winner: "truecap",
  },
  {
    feature: "Pricing model",
    truecap: "Free core; paid Pro — see live pricing",
    hostfully:
      "From $15 per property per month (Growth) or $25 (Pro), plus a platform fee; Enterprise is quoted (as of October 2026)",
  },
];

export default function VsHostfullyPage() {
  const siteUrl = getSiteUrl();
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Hostfully vs TrueCap (2026): Manage vs Underwrite",
    url: `${siteUrl}/vs/hostfully`,
    description:
      "Hostfully manages short-term rentals after you buy them. TrueCap underwrites them before. Honest comparison and how the two fit together.",
    dateModified: lastmodFor("/vs/hostfully"),
    publisher: { "@id": `${siteUrl}/#organization` },
  };

  return (
    // relative + overflow-x-clip, as on the homepage and the /vs hub: no
    // descendant can make the phone page scroll sideways.
    <div className="relative overflow-x-clip">
      <Header initialUser={null} initialEntitlements={null} />
      <JsonLd data={structuredData} />
      <VsBreadcrumbSchema
        vsPath="/vs/hostfully"
        pageName="TrueCap vs Hostfully"
      />
      <main id="main" tabIndex={-1} className="min-w-0 outline-none">
        <VsHero>
          <h1 className={VS_H1}>
            TrueCap vs Hostfully:{" "}
            underwrite the STR, then host it
          </h1>
          <BlogByline />
          <p className={VS_LEDE}>
            Hostfully is short-term rental management software: a channel
            manager (Airbnb, Vrbo, Booking.com), a unified guest inbox,
            automation, and dynamic pricing through integration partners.
            TrueCap models the property&apos;s pre-purchase
            economics from user-reviewed assumptions. Different stages,
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
                <li>
                  You&apos;re evaluating a property as a potential short-term
                  rental.
                </li>
                <li>
                  You want to model cap rate, DSCR, cash flow before buying.
                </li>
                <li>
                  You want to compare LTR (long-term) and STR scenarios for the
                  same property.
                </li>
                <li>You&apos;re not yet hosting guests.</li>
              </ul>
            </div>
            <div className="min-w-0">
              <h3 className={VS_TLDR_LABEL}>
                Use Hostfully when
              </h3>
              <ul className={VS_TLDR_LIST}>
                <li>You own or are about to own a short-term rental.</li>
                <li>
                  You list on Airbnb + Vrbo + Booking.com and want one inbox.
                </li>
                <li>
                  You want a unified inbox, automation, and pricing and
                  cleaning integrations.
                </li>
                <li>
                  You want one system to run day-to-day hosting operations.
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
              head={["Feature", "TrueCap", "Hostfully"]}
              rows={MATRIX.map((row) => ({
                label: row.feature,
                truecap: row.truecap,
                competitor: row.hostfully,
                winner: row.winner === "hostfully" ? "competitor" : row.winner,
              }))}
            />
          </ScrollX>
          <p className={VS_SOURCES}>
            Hostfully plans, prices and features were checked against its
            pricing and FAQ pages in October 2026. See{" "}
            <a
              href="https://www.hostfully.com/pricing/"
              target="_blank"
              rel="noopener"
              className="tc-link"
            >
              hostfully.com/pricing
            </a>{" "}
            for current terms.
          </p>
        </Section>

        {/* Complementary workflow */}
        <Section aria-labelledby="vs-fit-heading">
          <SectionHeading id="vs-fit-heading">
            How TrueCap and Hostfully fit together
          </SectionHeading>
          <div className={VS_PROSE}>
            <ol>
              <li>
                <strong>Source the property.</strong> Could be MLS, off-market, or
                an existing STR being sold.
              </li>
              <li>
                <strong>Model the STR underwrite in TrueCap.</strong> Use a
                conservative monthly-equivalent rent (e.g. 75% of expected gross
                STR revenue / 12 to account for vacancy and cleaning). Run the cap
                rate, DSCR, cash flow.
              </li>
              <li>
                <strong>If the deal pencils — buy.</strong> Close the property.
              </li>
              <li>
                <strong>Set up the STR in Hostfully.</strong> Connect Airbnb, Vrbo
                and Booking.com, add a pricing integration, and set up guest
                messaging.
              </li>
              <li>
                <strong>Operate.</strong> Hostfully runs the day-to-day. Pair with
                PriceLabs (pricing), Turno (cleaning), and a property accounting
                tool (Stessa / Baselane) for the financial side.
              </li>
            </ol>
            <p>
              Not ready for a full underwrite? The free{" "}
              <IntentPrefetchLink
                href="/tools/gross-rent-multiplier-calculator"
                className="tc-link"
              >
                gross rent multiplier calculator
              </IntentPrefetchLink>{" "}
              triages a listing in seconds from price and gross revenue, and our{" "}
              <IntentPrefetchLink
                href="/blog/short-term-rental-underwriting-playbook"
                className="tc-link"
              >
                short-term rental underwriting playbook
              </IntentPrefetchLink>{" "}
              explains which STR assumptions actually move the answer. When you
              need the cap rate, cash-on-cash and DSCR behind that screen, the
              full{" "}
              <Link
                href="/analyze" prefetch={false}
                className="tc-link"
              >
                TrueCap analyzer
              </Link>{" "}
              computes them from an address.
            </p>
          </div>
        </Section>

        <ComparisonFaq
          competitorName="Hostfully"
          items={HOSTFULLY_FAQ}
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
            <RelatedContent kind="vs" slug="hostfully" />
            <AuthorBio />

            <footer className="mt-10 border-t border-border pt-6">
              <p className="text-lg font-semibold">Other comparisons:</p>
              <ul className="mt-2 grid gap-x-8 sm:grid-cols-2">
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
                <li>
                  <IntentPrefetchLink
                    href="/vs/stessa"
                    className={VS_LINK_ROW}
                  >
                    TrueCap vs Stessa
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

const HOSTFULLY_FAQ: FaqItem[] = [
  {
    question: "Is TrueCap a Hostfully alternative?",
    answer: (
      <>
        No — different stages of the STR lifecycle. Hostfully manages an STR you
        already own (channel sync, pricing, guest messages, cleaning). TrueCap
        underwrites the entered assumptions before purchase; the investor makes
        the decision. STR investors may use both.
      </>
    ),
  },
  {
    question: "Can TrueCap model short-term rental revenue?",
    answer: (
      <>
        Yes, but indirectly — every input is editable, so you can plug in your
        expected monthly STR revenue (gross income ÷ 12, conservatively
        discounted for vacancy and cleaning) as the rent value, then run the
        full underwrite. TrueCap doesn&apos;t auto-pull AirDNA or Mashvisor STR
        data — for that you&apos;d use those tools alongside.
      </>
    ),
  },
  {
    question: "Hostfully vs Guesty — which one?",
    answer: (
      <>
        Both are STR property-management platforms. Guesty currently publishes
        Lite for 1-3 listings, Pro for 4-199, and Enterprise for 200+. Compare
        Hostfully&apos;s and Guesty&apos;s current features, quotes, and terms
        for the portfolio; TrueCap remains the pre-purchase underwriting layer.
      </>
    ),
  },
  {
    question: "Does TrueCap support the STR tax loophole?",
    answer: (
      <>
        No. TrueCap does not currently expose a tax-specific analysis module and
        does not determine STR eligibility, material participation, REPS, cost
        segregation, or bonus depreciation. Use a qualified tax professional and
        taxpayer-specific model for those decisions.
      </>
    ),
  },
  {
    question: "How much does Hostfully cost?",
    answer: (
      <>
        Hostfully prices per property: from $15 per property per month on
        Growth (1 to 50 listings) and from $25 on Pro (1 to 199 listings), each
        plus a platform fee, with Enterprise quoted for 200 or more listings
        (as of October 2026). There is no free plan. Hostfully says it does not
        offer free trials and offers a free demo instead. See{" "}
        <a
          href="https://www.hostfully.com/pricing/"
          target="_blank"
          rel="noopener"
          className="tc-link"
        >
          Hostfully&apos;s pricing page
        </a>{" "}
        for current terms.
      </>
    ),
  },
];

