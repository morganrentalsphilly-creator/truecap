/**
 * /vs/avail — competitor comparison landing page.
 *
 * Target queries: "Avail alternative", "Avail vs ...", "Avail review",
 * "Avail unlimited plus", "Realtor.com Avail" (after the Realtor.com
 * acquisition). Avail is landlord ops: listing, screening, leases,
 * rent collection. Post-purchase, like RentRedi.
 *
 * Same complementary positioning as the RentRedi page — TrueCap is
 * pre-purchase underwrite, Avail is post-purchase operations.
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
  title: "Avail vs TrueCap (2026): Manage vs Underwrite",
  description:
    "Avail manages your rentals after closing. TrueCap underwrites them before. Honest side-by-side of when each fits, plus how the two fit together.",
  keywords: [
    "avail alternative",
    "avail vs truecap",
    "avail review",
    "avail unlimited plus",
    "realtor.com avail",
    "rental property analyzer",
  ],
  alternates: { canonical: "/vs/avail" },
  openGraph: {
    title: "Avail vs TrueCap (2026): Manage vs Underwrite",
    description:
      "Avail is post-purchase landlord ops. TrueCap is pre-purchase underwriting. Different halves of the DIY-landlord lifecycle.",
    url: "/vs/avail",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

type Verdict = "truecap" | "avail" | "tie";
type Row = { feature: string; truecap: string; avail: string; winner: Verdict };

const MATRIX: Row[] = [
  {
    feature: "Lifecycle stage",
    truecap: "Pre-purchase — underwrite the deal",
    avail: "Post-purchase — operate the property",
    winner: "tie",
  },
  {
    feature: "Cap rate / CoC / DSCR analysis",
    truecap: "Yes — full engine, free tier",
    avail:
      "Avail publishes a rental property calculator (cap rate, cash-on-cash, debt coverage ratio, IRR, GRM)",
    winner: "tie",
  },
  {
    feature: "Cash flow projection",
    truecap: "Pro — 10-year with rent + expense + appreciation",
    avail:
      "Its calculator lists monthly income and IRR as outputs and takes a growth-rate input; no year-by-year projection is listed",
    winner: "truecap",
  },
  {
    feature: "Sensitivity grid",
    truecap: "Pro — rent ±10%, vacancy ±5pp, rate ±1pp",
    avail: "No sensitivity output is listed; you change the inputs and re-run",
    winner: "truecap",
  },
  {
    feature: "Deal score (0–100)",
    truecap: "Free — 0–100 score with factor breakdown",
    avail: "Not applicable",
    winner: "truecap",
  },
  {
    feature: "Rental listing distribution",
    truecap: "No",
    avail:
      "Yes: syndicated to Realtor.com, Redfin, Zumper and other sites (19 in total, per Avail)",
    winner: "avail",
  },
  {
    feature: "Online rental application",
    truecap: "No",
    avail:
      "Yes: standard application on the free plan; custom questions on Unlimited Plus",
    winner: "avail",
  },
  {
    feature: "Tenant screening (credit/criminal)",
    truecap: "No",
    avail: "Yes — TransUnion-powered",
    winner: "avail",
  },
  {
    feature: "Online lease signing",
    truecap: "No",
    avail: "Yes — state-specific lease templates",
    winner: "avail",
  },
  {
    feature: "Online rent collection",
    truecap: "No",
    avail:
      "Yes: bank transfer and card; on the free plan tenants pay $2.50 per bank transfer, waived on Unlimited Plus",
    winner: "avail",
  },
  {
    feature: "Maintenance request workflow",
    truecap: "No",
    avail: "Yes — tenant portal",
    winner: "avail",
  },
  {
    feature: "Pricing (entry tier)",
    truecap: "Free for underwriting",
    avail:
      "Free Unlimited plan; Unlimited Plus $9 per unit per month (as of October 2026)",
    winner: "tie",
  },
  {
    feature: "Free tier covers core job",
    truecap: "Yes — core cap rate, CoC, DSCR, and cash flow",
    avail: "Yes: listings, state-specific leases, online rent collection",
    winner: "tie",
  },
  {
    feature: "Starting values (rent, rate, tax)",
    truecap: "HUD rent + FRED rate + manual local property tax",
    avail: "Its calculator tries to pull in some data from the address",
    winner: "tie",
  },
  {
    feature: "Multi-property dashboard",
    truecap: "Yes — portfolio rollup of saved deals",
    avail: "Yes: unlimited units on one account",
    winner: "tie",
  },
  {
    feature: "Owned by Realtor.com",
    truecap: "No (independent)",
    avail: "Yes (since 2020)",
    winner: "tie",
  },
];

export default function VsAvailPage() {
  const siteUrl = getSiteUrl();
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Avail vs TrueCap (2026): Manage vs Underwrite",
    url: `${siteUrl}/vs/avail`,
    description:
      "Side-by-side comparison of TrueCap (rental underwriting calculator) and Avail (DIY landlord operations).",
    dateModified: lastmodFor("/vs/avail"),
    publisher: { "@id": `${siteUrl}/#organization` },
  };

  return (
    // relative + overflow-x-clip, as on the homepage and the /vs hub: no
    // descendant can make the phone page scroll sideways.
    <div className="relative overflow-x-clip">
      <Header initialUser={null} initialEntitlements={null} />
      <JsonLd data={structuredData} />
      <VsBreadcrumbSchema vsPath="/vs/avail" pageName="TrueCap vs Avail" />
      <main id="main" tabIndex={-1} className="min-w-0 outline-none">
        <VsHero>
          <h1 className={VS_H1}>
            TrueCap vs Avail:{" "}
            underwrite the deal, then run the rental
          </h1>
          <BlogByline />
          <p className={VS_LEDE}>
            Avail is the DIY-landlord stack: list the unit, screen tenants, sign
            a state-specific lease, collect rent online, handle maintenance.
            TrueCap models whether the reviewed assumptions produce cash flow.
            TrueCap fits due diligence; Avail fits what comes after closing.
          </p>
          <ActionRow className={VS_ACTIONS}>
            <AnalyzeCtaLink analyticsSource="vs_hero" className={buttonVariants({ size: "cta" })}>
              Underwrite a deal free
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
                Use TrueCap for
              </h3>
              <ul className={VS_TLDR_LIST}>
                <li>Underwriting before you make an offer.</li>
                <li>Comparing 2–3 deals you&apos;re seriously considering.</li>
                <li>10-year cash flow + appreciation projection.</li>
                <li>Stress-testing rent, vacancy, and rate assumptions.</li>
                <li>
                  Generating a shareable read-only deal analysis for partners or
                  lenders.
                </li>
              </ul>
            </div>
            <div className="min-w-0">
              <h3 className={VS_TLDR_LABEL}>
                Use Avail for
              </h3>
              <ul className={VS_TLDR_LIST}>
                <li>Listing a vacant unit across major rental sites.</li>
                <li>
                  Online rental applications + TransUnion-powered screening.
                </li>
                <li>State-specific lease templates with online signing.</li>
                <li>
                  Online rent collection (tenants pay $2.50 per bank transfer on
                  the free plan; no fee on Unlimited Plus).
                </li>
                <li>Tenant maintenance requests + ongoing ops.</li>
              </ul>
            </div>
          </div>
          <div className={VS_PROSE}>
            <p>
              One way to think about it:{" "}
              <strong>
                TrueCap is the diligence tool you use during the LOI / inspection
                period.
              </strong>{" "}
              Avail is the operations stack you set up the week after you close.
            </p>
          </div>
        </Section>

        {/* Matrix */}
        <Section aria-labelledby="vs-matrix-heading">
          <SectionHeading id="vs-matrix-heading">
            Feature-by-feature
          </SectionHeading>
          <p className={VS_INTRO}>
            Most rows show clear specialization — TrueCap for underwrite, Avail
            for ops. Where both have something, the difference is usually scope.
          </p>
          <ScrollX label="Comparison table" className="mt-8 max-w-5xl">
            <VsMatrixTable
              head={["Feature", "TrueCap", "Avail"]}
              rows={MATRIX.map((row) => ({
                label: row.feature,
                truecap: row.truecap,
                competitor: row.avail,
                winner: row.winner === "avail" ? "competitor" : row.winner,
              }))}
            />
          </ScrollX>
          <p className={VS_SOURCES}>
            Avail details checked against avail.com&apos;s pricing, rental
            listings, and rental property calculator pages in October 2026. See{" "}
            <a
              href="https://www.avail.com/pricing"
              target="_blank"
              rel="noopener"
              className="tc-link"
            >
              Avail&apos;s pricing page
            </a>{" "}
            for current plans.
          </p>
        </Section>

        {/* Complementary workflow */}
        <Section aria-labelledby="vs-fit-heading">
          <SectionHeading id="vs-fit-heading">
            The DIY landlord workflow: TrueCap + Avail
          </SectionHeading>
          <div className={VS_PROSE}>
            <ol>
              <li>
                <strong>Source the deal</strong> (Zillow, MLS, wholesaler,
                off-market).
              </li>
              <li>
                <strong>Underwrite in TrueCap.</strong> Paste the address; HUD
                area rent and the FRED owner-occupied rate can pre-fill; property
                tax remains a manual local input. Check cap rate, CoC, DSCR,
                monthly cash flow against benchmarks. Sensitize the inputs. Save
                the deal.
              </li>
              <li>
                <strong>
                  Verify the material inputs and record your decision.
                </strong>{" "}
                If you proceed, the transaction and closing workflow happens
                outside TrueCap.
              </li>
              <li>
                <strong>Set up the property in Avail.</strong> List vacant units,
                accept online applications, screen tenants with TransUnion, sign a
                state-specific lease online.
              </li>
              <li>
                <strong>Collect rent + handle ops in Avail.</strong> Rent
                collection is included; on the free plan the tenant pays $2.50
                per bank transfer. Tenants submit maintenance requests through
                the portal.
              </li>
              <li>
                <strong>Annual review back in TrueCap.</strong> Re-run the
                underwrite with actuals from Avail to see how the property is
                performing vs the original projection — and feed that learning
                into the next acquisition.
              </li>
            </ol>
            <p>
              Want to start with just the underwrite? Two free screens — the{" "}
              <IntentPrefetchLink
                href="/tools/1-percent-rule-calculator"
                className="tc-link"
              >
                1% rule calculator
              </IntentPrefetchLink>{" "}
              and the{" "}
              <IntentPrefetchLink
                href="/tools/gross-rent-multiplier-calculator"
                className="tc-link"
              >
                gross rent multiplier calculator
              </IntentPrefetchLink>{" "}
              — size up a listing in seconds, and the full{" "}
              <Link
                href="/analyze" prefetch={false}
                className="tc-link"
              >
                TrueCap analyzer
              </Link>{" "}
              computes cap rate, cash-on-cash, and DSCR from an address. Our guide
              on{" "}
              <IntentPrefetchLink
                href="/blog/how-to-underwrite-a-rental-property-in-60-seconds"
                className="tc-link"
              >
                60-second underwriting
              </IntentPrefetchLink>{" "}
              walks through exactly what to do.
            </p>
          </div>
        </Section>

        <ComparisonFaq
          competitorName="Avail"
          items={AVAIL_FAQ}
          reviewedDate="October 2026"
        />

        {/* Pricing CTA */}
        <CloseSection
          headingId="vs-close-heading"
          heading={<>Underwrite the next deal — free.</>}
          lede={
            <>
              TrueCap free covers cap rate, CoC, DSCR, monthly cash flow, and
              plain read-only share links. Pro adds 10-year cash-flow and
              equity projections, sensitivity, Offer Ceiling, co-branding, and
              included PDFs. New one-time PDF checkout is temporarily unavailable.
              No card to start.
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
            <RelatedContent kind="vs" slug="avail" />
            <AuthorBio />

            <footer className="mt-10 border-t border-border pt-6">
              <p className="text-lg font-semibold">Other comparisons:</p>
              <ul className="mt-2 grid gap-x-8 sm:grid-cols-2">
                <li>
                  <IntentPrefetchLink
                    href="/vs/rentredi"
                    className={VS_LINK_ROW}
                  >
                    TrueCap vs RentRedi
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
                <li>
                  <IntentPrefetchLink
                    href="/vs/dealcheck"
                    className={VS_LINK_ROW}
                  >
                    TrueCap vs DealCheck
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

const AVAIL_FAQ: FaqItem[] = [
  {
    question: "Is TrueCap an Avail alternative?",
    answer: (
      <>
        No — they cover different stages. Avail is post-purchase landlord
        operations: listing, screening, leases, rent collection, maintenance.
        TrueCap is pre-purchase underwriting: cap rate, CoC, DSCR, projection,
        Deal score. The two cover different stages and can be used together.
      </>
    ),
  },
  {
    question: "Can TrueCap do what Avail's listing or screening does?",
    answer: (
      <>
        No. TrueCap doesn&apos;t distribute listings, run credit reports, or
        store rental applications. Those are FCRA-regulated workflows we
        don&apos;t build. Avail (and similar tools) are the right place for
        that. TrueCap is explicitly the pre-purchase underwriting layer.
      </>
    ),
  },
  {
    question: "Is Avail free? Is TrueCap?",
    answer: (
      <>
        Avail&apos;s &quot;Unlimited&quot; plan is free for landlords and
        includes listings, lease signing, and online rent collection; on that
        plan tenants pay $2.50 per bank transfer. &quot;Unlimited Plus&quot; is
        $9 per unit per month (as of October 2026) and waives the bank-transfer
        fee. TrueCap is free for core underwriting math; Pro adds 10-year
        cash-flow and equity projections, sensitivity, co-branded share links,
        and included PDFs. New one-time PDF checkout is temporarily unavailable;
        see TrueCap&apos;s live pricing page for current terms.
      </>
    ),
  },
  {
    question: "Does Avail's calculator replace TrueCap?",
    answer: (
      <>
        Avail publishes a rental property calculator; its page says it
        calculates cap rate, cash-on-cash return, debt coverage ratio, IRR, and
        gross rent multiplier from the inputs you enter. TrueCap starts from
        labeled values (an editable HUD rent benchmark and the FRED rate) and
        adds a Deal score. Your first complete decision also shows the Offer
        Ceiling, the highest price that still meets your targets; Pro keeps it
        on every deal, with the sensitivity grid and a 10-year projection.
      </>
    ),
  },
  {
    question: "Avail is owned by Realtor.com — does that matter?",
    answer: (
      <>
        Functionally not much: the operator of Realtor.com acquired Avail in
        December 2020 and the product has continued. It does mean Avail
        listings are syndicated to Realtor.com. TrueCap is independent, with no
        listing-side incentive (we don&apos;t benefit from any deal happening,
        only from giving you a good number on it).
      </>
    ),
  },
];

