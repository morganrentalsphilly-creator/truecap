/**
 * /vs/rentspree — competitor comparison landing page.
 *
 * Target queries: "rentspree alternative", "rentspree vs", "rentspree pricing", "rentspree review", "tenant screening service".
 * RentSpree is tenant screening + rental applications, popular with realtors who run rentals for clients. TransUnion-backed screening reports. Different audience than TrueCap but agents look at both.
 */

import { TRIAL_LABEL } from "@/lib/trial";
import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Calculator,
  Check,
  Minus,
  Sparkles,
  X,
} from "lucide-react";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SiteFooter } from "@/components/marketing/site-footer";
import { ScrollToFormButton } from "@/components/marketing/scroll-to-form-button";
import { ComparisonFaq, type FaqItem } from "@/components/marketing/comparison-faq";
import { getSiteUrl } from "@/lib/site-url";
import { VsBreadcrumbSchema } from "@/components/marketing/vs-breadcrumb-schema";

export const metadata: Metadata = {
  title: "RentSpree vs TrueCap (2026): Screening vs Analysis",
  description:
    "RentSpree screens your tenants. TrueCap underwrites your deals. Different jobs in the rental workflow — and how realtors use both.",
  keywords: [
    "rentspree alternative",
    "rentspree vs",
    "rentspree pricing",
    "rentspree review",
    "tenant screening service",
  ],
  alternates: { canonical: "/vs/rentspree" },
  openGraph: {
    title: "RentSpree vs TrueCap (2026): Screening vs Analysis",
    description:
      "RentSpree screens tenants. TrueCap underwrites deals. Different jobs in the rental workflow.",
    url: "/vs/rentspree",
    type: "website",
    images: [{ url: "/home.jpg", width: 1200, height: 630, alt: "TrueCap vs RentSpree" }],
  },
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
};

type Verdict = "truecap" | "rentspree" | "tie";
type Row = { feature: string; truecap: string; rentspree: string; winner: Verdict };

const MATRIX: Row[] = [
  { feature: "Primary use", truecap: "Pre-purchase underwriting (cap rate, DSCR, cash flow)", rentspree: "Tenant screening + rental applications", winner: "tie" },
  { feature: "Cap rate / CoC / DSCR analysis", truecap: "Yes — full engine, free tier", rentspree: "Not modeled", winner: "truecap" },
  { feature: "10-year projection", truecap: "Pro — rent + expense + appreciation", rentspree: "Not modeled", winner: "truecap" },
  { feature: "Illustrative tax impact", truecap: "Pro — depreciation + interest + modeled after-tax CF", rentspree: "Not modeled", winner: "truecap" },
  { feature: "Deal score + verdict", truecap: "Free — 0-100 score + plain-English verdict", rentspree: "Not applicable", winner: "truecap" },
  { feature: "Address auto-fill (rent/rate/tax)", truecap: "Yes — HUD + FRED + state property tax", rentspree: "Not applicable", winner: "truecap" },
  { feature: "Tenant credit / criminal reports", truecap: "No", rentspree: "Yes — TransUnion-backed", winner: "rentspree" },
  { feature: "Online rental applications", truecap: "No", rentspree: "Yes — customizable", winner: "rentspree" },
  { feature: "Eviction records check", truecap: "No", rentspree: "Yes — court records", winner: "rentspree" },
  { feature: "Agent / brokerage workflow", truecap: "Yes — agent persona page exists", rentspree: "Yes — built for realtor-managed rentals", winner: "tie" },
  { feature: "Free tier", truecap: "Yes — full underwriting math", rentspree: "Yes — tenant pays for screening (typical)", winner: "tie" },
  { feature: "Pricing model", truecap: "Free; Pro $29.99/mo", rentspree: "Tenant typically pays $30-40 per application", winner: "tie" },
  { feature: "Shareable read-only analysis", truecap: "Free — read-only public link; Pro adds co-branding", rentspree: "N/A", winner: "truecap" },
];

export default function VsRentspreePage() {
  const siteUrl = getSiteUrl();
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "RentSpree vs TrueCap (2026): Screening vs Analysis",
    url: `${siteUrl}/vs/rentspree`,
    description:
      "RentSpree screens your tenants. TrueCap underwrites your deals. Different jobs in the rental workflow — and how realtors use both.",
    dateModified: "2026-06-07",
    publisher: { "@id": `${siteUrl}/#organization` },
  };

  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <VsBreadcrumbSchema vsPath="/vs/rentspree" pageName="TrueCap vs RentSpree" />
      <main id="main" className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="mb-2">
          <Link
            href="/"
            className="text-xs uppercase tracking-widest text-muted-foreground font-bold hover:text-foreground"
          >
            ← TrueCap
          </Link>
        </div>

        {/* Hero */}
        <section className="mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-card px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-primary mb-4">
            <Sparkles className="size-3" />
            Honest comparison
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-foreground leading-[1.05] tracking-tight text-balance">
            TrueCap vs RentSpree:{" "}
            <span className="text-primary">underwrite the deal vs screen the tenant</span>
          </h1>
          <p className="mt-4 max-w-2xl text-base sm:text-lg leading-relaxed text-muted-foreground">
            RentSpree is the go-to tenant screening service for real-estate agents and small landlords — TransUnion credit + criminal + eviction reports, online rental applications, agent-friendly workflow. TrueCap is the pre-purchase underwriting calculator that decides whether the property is a good deal in the first place. Different jobs. Many agents and investors use both.
          </p>
          <div className="mt-7 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            <ScrollToFormButton
              className="group inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground shadow-[0_12px_28px_rgba(0,112,196,0.28)] transition-transform hover:-translate-y-0.5"
            >
              <Calculator className="size-4" />
              Run a deal — 60 seconds
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </ScrollToFormButton>
            <Link
              href="/pricing"
              className="inline-flex h-12 items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-5 text-sm font-semibold text-foreground hover:bg-muted"
            >
              See TrueCap pricing
            </Link>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            No card · No signup · Cancel anytime
          </p>
        </section>

        {/* TL;DR */}
        <section className="mb-12 sm:mb-16 rounded-2xl border border-border bg-card p-6 sm:p-8">
          <h2 className="text-xl sm:text-2xl font-extrabold text-foreground mb-3">
            TL;DR
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-primary mb-2">
                Use TrueCap when
              </p>
              <ul className="space-y-1.5 text-sm leading-relaxed text-foreground">
                <li>You&apos;re underwriting a property before making an offer.</li>
                <li>You&apos;re an agent sending a deal analysis to a buyer client.</li>
                <li>You want cap rate, DSCR, projection, deal score.</li>
                <li>You&apos;re not the one screening the tenant.</li>
              </ul>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                Use RentSpree when
              </p>
              <ul className="space-y-1.5 text-sm leading-relaxed text-foreground">
                <li>You own the property (or manage it for an owner) and need to screen applicants.</li>
                <li>You want TransUnion-backed credit + criminal + eviction reports.</li>
                <li>You want tenants to pay for their own application + screening.</li>
                <li>You&apos;re a realtor managing rentals on behalf of clients.</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Matrix */}
        <section className="mb-12 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground mb-2">
            Feature-by-feature
          </h2>
          <p className="text-base text-muted-foreground mb-6 leading-relaxed">
            Side-by-side on every dimension that matters for a comparison-shopping investor.
          </p>
          <div className="overflow-x-auto rounded-2xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr className="text-left">
                  <th className="py-3 px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Feature
                  </th>
                  <th className="py-3 px-3 text-[10px] font-bold uppercase tracking-widest text-primary">
                    TrueCap
                  </th>
                  <th className="py-3 px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    RentSpree
                  </th>
                </tr>
              </thead>
              <tbody>
                {MATRIX.map((row) => (
                  <tr key={row.feature} className="border-t border-border align-top">
                    <td className="py-3 px-3 text-sm font-semibold text-foreground">
                      <div className="flex items-center gap-2">
                        <WinnerBadge winner={row.winner} side="row" />
                        {row.feature}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-xs leading-relaxed text-foreground/85">
                      <div className="flex items-start gap-2">
                        <WinnerBadge winner={row.winner} side="truecap" />
                        <span>{row.truecap}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-xs leading-relaxed text-foreground/85">
                      <div className="flex items-start gap-2">
                        <WinnerBadge winner={row.winner} side="rentspree" />
                        <span>{row.rentspree}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            RentSpree details based on publicly available product info as of 2026.
            See{" "}
            <a href="https://rentspree.com" target="_blank" rel="noopener" className="underline">
              rentspree.com
            </a>{" "}
            for their current state.
          </p>
        </section>

        {/* Complementary workflow */}
        <section className="mb-12 sm:mb-16 rounded-2xl border border-[var(--brand-green)]/25 bg-[var(--brand-green-light)] p-6 sm:p-8">
          <h2 className="text-xl sm:text-2xl font-extrabold text-[var(--brand-green)] mb-3">
            How agents + landlords use both
          </h2>
          <ol className="space-y-2.5 text-sm sm:text-base leading-relaxed text-foreground list-decimal pl-5">
            <li>
              <strong>Underwrite the deal in TrueCap.</strong> Either you (the agent) or your buyer client runs the address. Generates a defensible analysis to share.
            </li>
            <li>
              <strong>Buyer makes the offer + closes.</strong> TrueCap&apos;s job is done.
            </li>
            <li>
              <strong>List the unit + accept applications in RentSpree.</strong> Agent or owner posts the listing; applicants submit + pay for their own screening.
            </li>
            <li>
              <strong>Review screening reports + select a tenant.</strong> TransUnion-backed credit, criminal, eviction records arrive in your inbox.
            </li>
            <li>
              <strong>Sign the lease.</strong> RentSpree integrates with several lease providers; pair with TurboTenant or Avail for state-specific templates.
            </li>
          </ol>
          <p className="mt-4 text-sm leading-relaxed text-foreground">
            Want to see just the underwriting half? Try the{" "}
            <Link href="/tools/cap-rate-calculator" className="font-semibold text-primary hover:underline">
              cap rate calculator
            </Link>{" "}
            or the full{" "}
            <Link href="/" className="font-semibold text-primary hover:underline">
              TrueCap analyzer
            </Link>
            . Our guide on{" "}
            <Link href="/blog/how-to-underwrite-a-rental-property-in-60-seconds" className="font-semibold text-primary hover:underline">
              60-second underwriting
            </Link>{" "}
            walks through the workflow end-to-end.
          </p>
        </section>

        <ComparisonFaq competitorName="RentSpree" items={RENTSPREE_FAQ} />

        {/* Pricing CTA */}
        <section className="mb-12 sm:mb-16 rounded-2xl bg-primary p-6 sm:p-8 text-primary-foreground">
          <h2 className="text-2xl sm:text-3xl font-extrabold mb-2">
            Underwrite the next deal — free.
          </h2>
          <p className="text-sm sm:text-base opacity-90 mb-5 max-w-2xl">
            TrueCap free covers cap rate, CoC, DSCR, NCF, and monthly cash flow.
            Pro unlocks projections, sensitivity, illustrative tax impact, modeled exit comparisons,
            MAO, PDF exports, and co-branded share links.
            No card to start.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 bg-primary-foreground text-primary px-4 py-2.5 rounded-xl font-bold hover:opacity-90 transition-opacity"
            >
              Start a {TRIAL_LABEL}
              <ArrowUpRight className="w-4 h-4" />
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-2 border border-primary-foreground/40 bg-primary-foreground/10 text-primary-foreground px-4 py-2.5 rounded-xl font-bold hover:bg-primary-foreground/20 transition-colors"
            >
              <Calculator className="w-4 h-4" />
              Run a deal now
            </Link>
          </div>
        </section>

        <footer className="border-t border-border pt-6 text-sm text-muted-foreground leading-relaxed">
          Other comparisons:{" "}
          <Link href="/vs/turbotenant" className="font-bold text-foreground hover:underline">TrueCap vs TurboTenant</Link>
          {" · "}
          <Link href="/vs/avail" className="font-bold text-foreground hover:underline">TrueCap vs Avail</Link>
          {" · "}
          <Link href="/vs/rentredi" className="font-bold text-foreground hover:underline">TrueCap vs RentRedi</Link>
        </footer>
      </main>
      <SiteFooter />
      <ScrollDepthTracker />
    </div>
  );
}

const RENTSPREE_FAQ: FaqItem[] = [
  {
    question: "Is TrueCap a RentSpree alternative?",
    answer: (
      <>
        No — different jobs. RentSpree is tenant screening + rental applications for properties you own or manage. TrueCap is pre-purchase underwriting for properties you&apos;re considering buying. Agents who help clients with both ends of the workflow often use both.
      </>
    ),
    plainTextAnswer:
      "No — different jobs. RentSpree screens tenants for properties you own/manage. TrueCap underwrites properties you&apos;re considering. Agents working both ends use both.",
  },
  {
    question: "Does TrueCap screen tenants?",
    answer: (
      <>
        No — we don&apos;t pull credit, criminal, or eviction reports. That&apos;s FCRA-regulated and outside our scope. For tenant screening, RentSpree, TurboTenant, Avail, RentRedi, or TransUnion direct are the right tools.
      </>
    ),
    plainTextAnswer:
      "No — we don&apos;t pull credit, criminal, or eviction reports (FCRA-regulated, outside scope). For screening, use RentSpree, TurboTenant, Avail, RentRedi, or TransUnion direct.",
  },
  {
    question: "Is RentSpree really free?",
    answer: (
      <>
        It&apos;s free for the landlord/agent — the tenant typically pays $30-40 per screening package. RentSpree also offers premium tiers for agents that bundle additional tools (e-signature, listing syndication, etc.) starting around $20/month.
      </>
    ),
    plainTextAnswer:
      "Free for the landlord/agent — tenant pays $30-40 per screening package. RentSpree has premium agent tiers (e-signature, listing syndication, etc.) starting ~$20/mo.",
  },
  {
    question: "RentSpree vs TurboTenant — which one?",
    answer: (
      <>
        TurboTenant bundles screening into a broader landlord stack (listings, applications, leases, rent collection). RentSpree is more focused on screening + applications and is popular with realtors managing rentals on behalf of clients. Both are reasonable for small landlords; agents lean RentSpree.
      </>
    ),
    plainTextAnswer:
      "TurboTenant bundles screening into broader landlord ops (listings, leases, rent collection). RentSpree focuses on screening + applications, popular with realtors managing for clients. Agents lean RentSpree.",
  },
  {
    question: "Can a realtor use both TrueCap + RentSpree?",
    answer: (
      <>
        Yes — that&apos;s a common combination. Use TrueCap to underwrite + send a deal analysis to your buyer client at the showing; use RentSpree to screen tenants once they own the property and it&apos;s time to fill the unit. Both are agent-friendly.
      </>
    ),
    plainTextAnswer:
      "Yes — common combo. TrueCap for the buyer-side analysis at the showing; RentSpree for tenant screening once the property is owned and ready to fill.",
  },
];

function WinnerBadge({
  winner,
  side,
}: {
  winner: Verdict;
  side: "row" | "truecap" | "rentspree";
}) {
  if (side === "row") return null;
  if (winner === "tie") {
    return <Minus className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/60" />;
  }
  if (winner === side) {
    return <Check className="mt-0.5 size-3.5 shrink-0 text-[var(--brand-green)]" />;
  }
  return <X className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/50" />;
}
