/**
 * /reviews — proof, not praise (docs/site-overhaul.md Phase 5.8).
 *
 * The page has to make sense WITH or WITHOUT quotes. Everything it renders
 * unconditionally is something a visitor can check: the proof strip, the
 * rules a quote must pass, the sourced-assumption and public-methodology
 * cards, the founder, and a real link to the analyzer. The two data-backed
 * blocks — <Testimonials /> and the usage counter — render NOTHING at zero
 * rows: no placeholders, no placeholder text, no stars, no empty boxes.
 * Product/AggregateRating schema is deliberately ABSENT (rating markup over
 * zero records is a fabricated-claim risk and a Google penalty risk).
 *
 * Static + hourly ISR like the homepage.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { Database, FileCheck2 } from "lucide-react";
import { Header } from "@/components/investcalc/header";
import { AnalyzeCtaLink } from "@/components/marketing/analyze-cta-link";
import { FounderCard } from "@/components/marketing/founder-card";
import { ProofStrip } from "@/components/marketing/proof-strip";
import { SiteFooter } from "@/components/marketing/site-footer";
import { Testimonials } from "@/components/marketing/testimonials";
import {
  UsageCounter,
  loadUsageLabel,
} from "@/components/marketing/usage-counter";
import { getRequestUser } from "@/lib/request-auth";
import { getSiteUrl } from "@/lib/site-url";
import {
  MIN_SAVED_DEALS_FOR_PUBLISH,
  PUBLISH_DELAY_HOURS,
} from "@/lib/testimonials/rules";

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

const LINK_CLASS =
  "inline-flex min-h-11 items-center font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

export default async function ReviewsPage() {
  // Only to suppress the footer's Sign in / Create account column for a
  // signed-in visitor — no gating, no personalization.
  const user = await getRequestUser();

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
        {/* (a) Hero */}
        <section className="relative overflow-hidden border-b border-border bg-gradient-to-b from-[var(--brand-blue-light)] via-background to-background">
          <div className="mx-auto max-w-3xl px-4 py-14 text-center sm:px-6 sm:py-20">
            <p className="text-[11px] font-bold uppercase tracking-widest text-primary">
              Proof &amp; methodology
            </p>
            <h1 className="mt-2 text-balance text-3xl font-extrabold leading-[1.1] tracking-tight text-foreground sm:text-5xl">
              Proof, not praise.
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-balance text-base leading-relaxed text-muted-foreground sm:text-lg">
              Everything on this page is something you can check yourself.
            </p>
          </div>
        </section>

        {/* (b) Three facts a visitor can verify by clicking — always renders. */}
        <section
          aria-labelledby="facts-title"
          className="border-b border-border bg-card/40"
        >
          <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
            <h2 id="facts-title" className="sr-only">
              Facts you can check
            </h2>
            <ProofStrip />
          </div>
        </section>

        {/* (c) How quotes get here — the real flow, stated plainly. */}
        <section aria-labelledby="quotes-flow-title">
          <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
            <h2
              id="quotes-flow-title"
              className="text-balance text-center text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl"
            >
              How quotes get here
            </h2>
            <ol className="mt-8 space-y-4 text-base leading-relaxed text-foreground">
              <li className="flex gap-4">
                <span
                  aria-hidden
                  className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-extrabold text-primary"
                >
                  1
                </span>
                <p>
                  After you export a report or save a third deal, TrueCap asks
                  you one question. Once.
                </p>
              </li>
              <li className="flex gap-4">
                <span
                  aria-hidden
                  className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-extrabold text-primary"
                >
                  2
                </span>
                <p>
                  You decide whether TrueCap may publish your answer with your
                  first name, role, and market. If you say no, it stays
                  private.
                </p>
              </li>
              <li className="flex gap-4">
                <span
                  aria-hidden
                  className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-extrabold text-primary"
                >
                  3
                </span>
                <p>
                  A quote goes live only after a {PUBLISH_DELAY_HOURS}-hour
                  hold, and only if the account has real activity: at least{" "}
                  {MIN_SAVED_DEALS_FOR_PUBLISH} saved deals or an exported
                  report.
                </p>
              </li>
              <li className="flex gap-4">
                <span
                  aria-hidden
                  className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-extrabold text-primary"
                >
                  4
                </span>
                <p>
                  Nothing is edited, purchased, or invented. The founder can
                  take any quote down.
                </p>
              </li>
            </ol>
          </div>
        </section>

        {/* (d) Published quotes — renders nothing at zero rows, by design. */}
        <Testimonials
          limit={100}
          heading="What people said"
          className="border-t border-border bg-card/40"
        />

        {/* (e) Methodology proof */}
        <section
          aria-labelledby="check-title"
          className="border-t border-border"
        >
          <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
            <h2
              id="check-title"
              className="text-balance text-center text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl"
            >
              Proof you can check yourself
            </h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-border bg-card p-5">
                <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Database aria-hidden className="size-5" />
                </span>
                <h3 className="mt-4 font-extrabold text-foreground">
                  Sourced assumptions
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  Rent can start from HUD Fair Market Rent and the rate from
                  FRED. Property tax is your local number; leave it blank and a
                  labeled default fills in. Every field says where it came
                  from, and you can edit every one.
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-card p-5">
                <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <FileCheck2 aria-hidden className="size-5" />
                </span>
                <h3 className="mt-4 font-extrabold text-foreground">
                  Public methodology
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  Every formula is published, with its limits. Read it at{" "}
                  <Link href="/methodology" className={LINK_CLASS}>
                    /methodology
                  </Link>
                  .
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* (f) Real usage — the whole block is absent when the counter is null. */}
        {usageLabel ? (
          <section
            aria-labelledby="usage-title"
            className="border-t border-border bg-card/40"
          >
            <div className="mx-auto max-w-3xl px-4 py-10 text-center sm:px-6 sm:py-12">
              <h2
                id="usage-title"
                className="text-sm font-bold uppercase tracking-widest text-primary"
              >
                Real usage
              </h2>
              <UsageCounter className="mt-3 text-2xl sm:text-3xl" />
              <p className="mt-2 text-sm text-muted-foreground">
                Deals saved by real accounts. Counted, not typed in.
              </p>
            </div>
          </section>
        ) : null}

        {/* What this page will never show — stated so the absence of quotes
            reads as a policy, not a gap. */}
        <section aria-labelledby="not-published-title" className="border-t border-border">
          <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-12">
            <h2 id="not-published-title" className="text-xl font-extrabold tracking-tight text-foreground">
              What you will not find here
            </h2>
            <ul className="mt-3 grid gap-2 text-sm leading-relaxed text-muted-foreground sm:grid-cols-2">
              <li>Star ratings or an average score. No one is asked to rate anything.</li>
              <li>Logos, badges, or press strips.</li>
              <li>User counts or &ldquo;deals analyzed&rdquo; figures that are not computed from the database.</li>
              <li>Quotes edited for effect, paid for, or written by anyone but the person named.</li>
              <li>Case studies without the customer&apos;s written approval of every number.</li>
              <li>Stock photos of &ldquo;customers.&rdquo; If there is a face on this site, it is a real person who agreed to it.</li>
            </ul>
          </div>
        </section>

        {/* (g) Founder */}
        <section
          aria-label="Who built this"
          className="border-t border-border"
        >
          <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-12">
            <FounderCard />
          </div>
        </section>

        {/* (h) Final CTA */}
        <section aria-labelledby="cta-title" className="border-t border-border">
          <div className="mx-auto max-w-3xl px-4 py-12 text-center sm:px-6 sm:py-16">
            <h2
              id="cta-title"
              className="text-balance text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl"
            >
              The best proof is your own deal.
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-balance text-base text-muted-foreground">
              Paste an address. Every assumption is labeled and editable.
            </p>
            <AnalyzeCtaLink
              analyticsSource="reviews"
              className="mt-6 inline-flex min-h-12 items-center gap-1.5 rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground shadow-[0_12px_28px_rgba(0,112,196,0.28)] transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              Analyze a deal free
            </AnalyzeCtaLink>
          </div>
        </section>
      </main>
      <SiteFooter hideAccountLinks={Boolean(user)} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(reviewsLd) }}
      />
    </>
  );
}
