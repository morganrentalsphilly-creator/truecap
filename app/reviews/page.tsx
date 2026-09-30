/**
 * /reviews — proof, not praise (docs/site-overhaul.md Phase 5.8).
 *
 * The page has to make sense WITH or WITHOUT quotes. Everything it renders
 * unconditionally is something a visitor can check: three facts with a link
 * to verify each, the rules a quote must pass, the sourced-assumption and
 * public-methodology rows, and a real link to the analyzer. (The founder
 * card and the proof strip were retired on 2026-09-07.) The two data-backed
 * blocks — <Testimonials /> and the usage counter — render NOTHING at zero
 * rows: no placeholders, no placeholder text, no stars, no empty boxes.
 * Product/AggregateRating schema is deliberately ABSENT (rating markup over
 * zero records is a fabricated-claim risk and a Google penalty risk).
 *
 * Static + hourly ISR like the homepage: the page must NOT read cookies or
 * the request session (no request-user helper, no server Supabase client),
 * or Next silently renders it dynamically on every request and the declared
 * `revalidate` is a lie. The footer shows its account column like every
 * other prerendered marketing page; the Header self-corrects client-side.
 *
 * Set on the ledger grammar (DESIGN.md, 2026-09 design pass): paper, rules
 * instead of cards, the shared hero, step list and close from page-parts.
 */

import type { Metadata } from "next";
import Link from "next/link";
// Internal links other than a first-screen primary action prefetch on hover
// or keyboard focus, not as they scroll into view; /analyze links stay
// next/link with prefetch={false} (lib/__tests__/intent-prefetch-shared.test.ts).
import { IntentPrefetchLink } from "@/components/marketing/intent-prefetch-link";
import { Header } from "@/components/investcalc/header";
import { AnalyzeCtaLink } from "@/components/marketing/analyze-cta-link";
import {
  ActionRow,
  CloseSection,
  PageHero,
  RuledList,
  StepList,
} from "@/components/marketing/page-parts";
import { Section, SectionHeading } from "@/components/marketing/section";
import { SiteFooter } from "@/components/marketing/site-footer";
import { Testimonials } from "@/components/marketing/testimonials";
import {
  UsageCounter,
  loadUsageLabel,
} from "@/components/marketing/usage-counter";
import { buttonVariants } from "@/components/ui/button";
import { getSiteUrl } from "@/lib/site-url";
import {
  MIN_SAVED_DEALS_FOR_PUBLISH,
  PUBLISH_DELAY_HOURS,
} from "@/lib/testimonials/rules";
import { JsonLd } from "@/components/seo/json-ld";

export const revalidate = 3600;

export function generateMetadata(): Metadata {
  const description =
    "How TrueCap earns trust: sourced assumptions, public math, and quotes only from real users who chose to be named.";
  return {
    title: "Proof & methodology",
    description: description,
    alternates: { canonical: "/reviews" },
    openGraph: {
      title: "TrueCap Proof & methodology",
      description,
      url: "/reviews",
      type: "website",
      images: [
        { url: "/home.jpg", width: 1200, height: 630, alt: "TrueCap proof" },
      ],
    },
    twitter: { card: "summary_large_image", images: ["/home.jpg"] },
  };
}

/** A standalone link under a column: the link style, with a 44px target. */
const COLUMN_LINK_CLASS =
  "tc-link mt-3 inline-flex min-h-11 items-center self-start text-base";

/** The real flow a quote takes, in order (StepList: a true sequence). */
const QUOTE_FLOW_STEPS = [
  "After you export a report or save a third deal, TrueCap asks you one question. Once.",
  "You decide whether TrueCap may publish your answer with your first name, role, and market. If you say no, it stays private.",
  `A quote goes live only after a ${PUBLISH_DELAY_HOURS}-hour hold, and only if the account has real activity: at least ${MIN_SAVED_DEALS_FOR_PUBLISH} saved deals or an exported report.`,
  "Nothing is edited, purchased, or invented. The founder can take any quote down.",
] as const;

export default async function ReviewsPage() {
  // Decide whether the "Real usage" block exists at all, so an empty
  // counter never leaves an empty box behind. (Same cached read as
  // <UsageCounter />, so this costs nothing extra.)
  const usageLabel = await loadUsageLabel();

  const siteUrl = getSiteUrl();

  const reviewsLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${siteUrl}/reviews#page`,
    url: `${siteUrl}/reviews`,
    name: "TrueCap Proof & methodology",
    isPartOf: { "@id": `${siteUrl}/#website` },
    about: { "@id": `${siteUrl}/#organization` },
    inLanguage: "en-US",
  };

  return (
    <>
      <Header initialUser={null} initialEntitlements={null} />
      <main id="main" tabIndex={-1} className="bg-background outline-none">
        {/* (a) Hero, with the page's primary action in the first screen.
            A plain link, not AnalyzeCtaLink: that island fires the
            homepage's CTA event, and a new source value for it would be an
            analytics change. */}
        <PageHero
          title="Proof, not praise."
          lede="Everything on this page is something you can check yourself."
          actions={
            <ActionRow>
              <Link
                href="/analyze"
                prefetch={false}
                className={buttonVariants({ size: "cta" })}
              >
                Analyze a deal free
              </Link>
            </ActionRow>
          }
        />

        {/* (b) Three facts a visitor can verify by clicking — always renders.
            Each column states something true today and links to where it
            can be checked; none of them depends on a database row. PageHero
            already draws the rule under the head, so this Section adds none,
            and it runs the tight rhythm so the facts sit close under the
            hero. Three columns only from 1024px: narrower, the columns fall
            to 19-24ch and the headings wrap unevenly, so tablets get full
            rows. */}
        <Section rhythm="tight" rule="none" aria-labelledby="verify-title">
          <SectionHeading id="verify-title">
            Three things you can check right now
          </SectionHeading>
          <div className="mt-8 grid border-t-2 border-foreground lg:grid-cols-3 lg:gap-x-12">
            <div className="flex flex-col border-b border-rule-soft py-4">
              <h3 className="text-lg font-semibold">The math is public</h3>
              <p className="mt-1 max-w-[64ch] flex-1 text-pretty text-base leading-relaxed text-muted-foreground">
                Every formula behind a verdict is written down with its
                limits: cash flow, cap rate, DSCR, and the Offer Ceiling.
                Nothing is hidden inside a model you cannot read.
              </p>
              <IntentPrefetchLink href="/methodology" className={COLUMN_LINK_CLASS}>
                Read the methodology
              </IntentPrefetchLink>
            </div>
            <div className="flex flex-col border-b border-rule-soft py-4">
              <h3 className="text-lg font-semibold">Every assumption is labeled</h3>
              <p className="mt-1 max-w-[64ch] flex-1 text-pretty text-base leading-relaxed text-muted-foreground">
                In the analyzer, each input says where it came from: HUD Fair
                Market Rent, the FRED mortgage rate, or a labeled local
                default you can replace with your own number.
              </p>
              <AnalyzeCtaLink
                analyticsSource="reviews-verify"
                className={COLUMN_LINK_CLASS}
              >
                Open the analyzer
              </AnalyzeCtaLink>
            </div>
            <div className="flex flex-col border-b border-rule-soft py-4">
              <h3 className="text-lg font-semibold">Any quote can come down</h3>
              <p className="mt-1 max-w-[64ch] flex-1 text-pretty text-base leading-relaxed text-muted-foreground">
                A quote is held for {PUBLISH_DELAY_HOURS} hours before it
                appears, publishes only after {MIN_SAVED_DEALS_FOR_PUBLISH}{" "}
                saved deals or an exported report. The founder can remove
                a quote; contact{" "}
                <a href="mailto:hello@usetruecap.com" className="tc-link">
                  hello@usetruecap.com
                </a>{" "}
                if you want yours taken down.
              </p>
              <a href="#quotes-flow-title" className={COLUMN_LINK_CLASS}>
                See how quotes get here
              </a>
            </div>
          </div>
        </Section>

        {/* (c) How quotes get here — the real flow, stated plainly. The id
            is the target of the "See how quotes get here" link above. On
            the homepage FAQ's 5/7 grid from 1024px, so the 68ch step list
            fills the row instead of leaving an empty right column between
            two full-width ruled grids. */}
        <Section rhythm="tight" aria-labelledby="quotes-flow-title">
          <div className="grid gap-x-16 gap-y-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
            <SectionHeading id="quotes-flow-title">How quotes get here</SectionHeading>
            <StepList steps={QUOTE_FLOW_STEPS} />
          </div>
        </Section>

        {/* (d) Published quotes — renders nothing at zero rows, by design. */}
        <Testimonials limit={100} heading="What people said" />

        {/* (e) Methodology proof */}
        <Section rhythm="tight" aria-labelledby="check-title">
          <SectionHeading id="check-title">Proof you can check yourself</SectionHeading>
          <RuledList
            columns={2}
            className="mt-8"
            items={[
              {
                key: "sourced-assumptions",
                term: "Sourced assumptions",
                detail:
                  "Rent can start from HUD Fair Market Rent and the rate from FRED. Property tax is your local number; leave it blank and a labeled default fills in. Every field says where it came from, and you can edit every one.",
              },
              {
                key: "public-methodology",
                term: "Public methodology",
                detail: (
                  <>
                    Every formula is published, with its limits. Read it at{" "}
                    <IntentPrefetchLink href="/methodology" className="tc-link">
                      /methodology
                    </IntentPrefetchLink>
                    .
                  </>
                ),
              },
            ]}
          />
        </Section>

        {/* (f) Real usage — the whole block is absent when the counter is null. */}
        {usageLabel ? (
          <Section rhythm="tight" aria-labelledby="usage-title">
            <SectionHeading id="usage-title">Real usage</SectionHeading>
            <UsageCounter className="mt-3 text-2xl" />
            <p className="mt-2 text-pretty text-base text-muted-foreground">
              Deals saved by real accounts. Counted, not typed in.
            </p>
          </Section>
        ) : null}

        {/* What this page will never show — stated so the absence of quotes
            reads as a policy, not a gap. Set in ink: it is the policy. */}
        <Section rhythm="tight" aria-labelledby="not-published-title">
          <SectionHeading id="not-published-title">What you will not find here</SectionHeading>
          <ul className="mt-8 grid border-t-2 border-foreground text-pretty text-base leading-relaxed sm:grid-cols-2 sm:gap-x-12">
            <li className="border-b border-rule-soft py-3">Star ratings or an average score. No one is asked to rate anything.</li>
            <li className="border-b border-rule-soft py-3">Logos, badges, or press strips.</li>
            <li className="border-b border-rule-soft py-3">User counts or &ldquo;deals analyzed&rdquo; figures that are not computed from the database.</li>
            <li className="border-b border-rule-soft py-3">Quotes edited for effect, paid for, or written by anyone but the person named.</li>
            <li className="border-b border-rule-soft py-3">Case studies without the customer&apos;s written approval of every number.</li>
            <li className="border-b border-rule-soft py-3">Stock photos of &ldquo;customers.&rdquo; If there is a face on this site, it is a real person who agreed to it.</li>
          </ul>
        </Section>

        {/* (h) Final CTA: the close on the heavy rule. ActionRow runs the
            button full width on phones, as on the sibling pages' closes. */}
        <CloseSection
          headingId="cta-title"
          heading="The best proof is your own deal."
          lede="Paste an address. Every assumption is labeled and editable."
          actions={
            <ActionRow>
              <AnalyzeCtaLink
                analyticsSource="reviews"
                className={buttonVariants({ size: "cta" })}
              >
                Analyze a deal free
              </AnalyzeCtaLink>
            </ActionRow>
          }
        />
      </main>
      <SiteFooter />
      <JsonLd data={reviewsLd} />
    </>
  );
}
