/**
 * /reviews — proof and methodology.
 *
 * Renders ONLY what is real right now: sourced-data disclosures, the public
 * versioned methodology, and — once records pass the lib/proof-records.ts
 * verification + approval gate — customer testimonials.
 * The testimonial section self-hides at zero published records; nothing on
 * this page is ever fabricated, and Product/AggregateRating schema is
 * deliberately ABSENT until real reviews exist (adding rating markup over
 * zero records is a fabricated-claim risk and a Google penalty risk).
 *
 * Static + hourly ISR like the homepage.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { Database, FileCheck2 } from "lucide-react";
import { Header } from "@/components/investcalc/header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { TestimonialStrip } from "@/components/marketing/testimonial-card";
import {
  VERIFIED_TESTIMONIALS,
  VERIFIED_AGENT_PROOF,
  isPublicationReady,
} from "@/lib/proof-records";
import { getSiteUrl } from "@/lib/site-url";
import { getRequestUser } from "@/lib/request-auth";

export const revalidate = 3600;

export function generateMetadata(): Metadata {
  const description =
    "How TrueCap earns trust: labeled starting references, a public versioned methodology, and customer quotes only after verification.";
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

export default async function ReviewsPage() {
  // Only to suppress the footer's Sign in / Create account column for a
  // signed-in visitor — no gating, no personalization.
  const user = await getRequestUser();

  const siteUrl = getSiteUrl();
  const publishedCount =
    VERIFIED_TESTIMONIALS.filter((r) => isPublicationReady(r, "homepage"))
      .length +
    VERIFIED_AGENT_PROOF.filter((r) => isPublicationReady(r, "homepage"))
      .length;

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
      <main id="main" className="bg-background">
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-border bg-gradient-to-b from-[var(--brand-blue-light)] via-background to-background">
          <div className="mx-auto max-w-3xl px-4 py-14 text-center sm:px-6 sm:py-20">
            <p className="text-[11px] font-bold uppercase tracking-widest text-primary">
              Proof &amp; methodology
            </p>
            <h1 className="mt-2 text-balance text-3xl font-extrabold leading-[1.1] tracking-tight text-foreground sm:text-5xl">
              Only what we can substantiate.
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-balance text-base leading-relaxed text-muted-foreground sm:text-lg">
              No invented praise, no stock-photo customers. Public math,
              source-labeled operating figures, and customer quotes only after
              verification and publication approval.
            </p>
          </div>
        </section>

        {/* Verified customer quotes — self-hides until records exist. */}
        {publishedCount > 0 ? (
          <section className="border-b border-border bg-card/40">
            <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
              <h2 className="text-center text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
                Verified customer quotes
              </h2>
              <div className="mt-8">
                <TestimonialStrip limit={9} />
              </div>
              <div className="mt-6">
                <TestimonialStrip segment="agent" limit={3} />
              </div>
            </div>
          </section>
        ) : null}

        {/* What's verifiable today */}
        <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
          <h2 className="text-center text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
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
                Rent can start from HUD benchmarks and rates from FRED. Property
                tax is a manual local input with a disclosed generic fallback
                when blank — every field is labeled and editable.
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
                Our math is published and versioned — audit every formula at{" "}
                <Link
                  href="/methodology"
                  className="font-semibold text-primary hover:underline"
                >
                  /methodology
                </Link>
                , including its limitations.
              </p>
            </div>
          </div>
          <p className="mx-auto mt-8 max-w-2xl text-center text-xs leading-relaxed text-muted-foreground">
            How quotes get here: after a real workflow moment (an exported
            report, a third saved deal) we ask one question in the product. A
            quote is published only after we verify it with the customer and
            they approve publication — that policy is enforced in code, not just
            promised.
          </p>
        </section>

        {/* CTA */}
        <section className="border-t border-border">
          <div className="mx-auto max-w-3xl px-4 py-12 text-center sm:px-6 sm:py-16">
            <h2 className="text-balance text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
              The best proof is your own deal.
            </h2>
            <Link
              href="/#main"
              className="mt-6 inline-flex h-12 items-center gap-1.5 rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground shadow-[0_12px_28px_rgba(0,112,196,0.28)] transition-transform hover:-translate-y-0.5"
            >
              Analyze a property free
            </Link>
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
