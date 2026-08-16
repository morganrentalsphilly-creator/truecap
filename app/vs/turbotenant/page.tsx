/**
 * /vs/turbotenant — competitor comparison landing page.
 *
 * Target queries: "turbotenant alternative", "turbotenant vs", "turbotenant review", "turbotenant pricing", "free landlord software".
 * TurboTenant is landlord ops — listing, screening, leases, rent collection. Direct competitor to Avail and RentRedi. Strong free tier, popular with small landlords.
 */

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
  title: "TurboTenant vs TrueCap (2026): Manage vs Analyze",
  description:
    "TurboTenant runs your rentals after you buy them. TrueCap decides if you should buy. Honest comparison and how DIY landlords use both.",
  keywords: [
    "turbotenant alternative",
    "turbotenant vs",
    "turbotenant review",
    "turbotenant pricing",
    "free landlord software",
  ],
  alternates: { canonical: "/vs/turbotenant" },
  openGraph: {
    title: "TurboTenant vs TrueCap (2026): Manage vs Analyze",
    description:
      "TurboTenant runs your rentals after closing. TrueCap underwrites them before. Different lifecycle stages.",
    url: "/vs/turbotenant",
    type: "website",
    images: [{ url: "/home.jpg", width: 1200, height: 630, alt: "TrueCap vs TurboTenant" }],
  },
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
};

type Verdict = "truecap" | "turbotenant" | "tie";
type Row = { feature: string; truecap: string; turbotenant: string; winner: Verdict };

const MATRIX: Row[] = [
  { feature: "Lifecycle stage", truecap: "Pre-purchase — underwrite the deal", turbotenant: "Post-purchase — operate the property", winner: "tie" },
  { feature: "Cap rate / CoC / DSCR analysis", truecap: "Yes — full engine, free tier", turbotenant: "Not modeled", winner: "truecap" },
  { feature: "10-year projection", truecap: "Pro — rent + expense + appreciation", turbotenant: "Not modeled", winner: "truecap" },
  { feature: "Illustrative tax impact", truecap: "Pro — depreciation + interest + modeled after-tax CF", turbotenant: "Not modeled", winner: "truecap" },
  { feature: "Deal score + verdict", truecap: "Free — 0-100 score + plain-English verdict", turbotenant: "Not applicable", winner: "truecap" },
  { feature: "Sensitivity grid", truecap: "Pro — rent ±10%, vacancy ±5pp, rate ±1pp", turbotenant: "Not modeled", winner: "truecap" },
  { feature: "Rental listing distribution", truecap: "No", turbotenant: "Yes — syndicated to Zillow, Realtor, etc.", winner: "turbotenant" },
  { feature: "Online rental application", truecap: "No", turbotenant: "Yes — customizable forms", winner: "turbotenant" },
  { feature: "Tenant screening", truecap: "No", turbotenant: "Yes — TransUnion-backed", winner: "turbotenant" },
  { feature: "Online lease signing", truecap: "No", turbotenant: "Yes — state-specific templates", winner: "turbotenant" },
  { feature: "Online rent collection", truecap: "No", turbotenant: "Yes — ACH free, card fee", winner: "turbotenant" },
  { feature: "Maintenance request workflow", truecap: "No", turbotenant: "Yes — tenant portal", winner: "turbotenant" },
  { feature: "Free tier", truecap: "Yes — core cap rate, CoC, DSCR, and cash flow", turbotenant: "Yes — listings + lease + ACH rent collection", winner: "tie" },
  { feature: "Address auto-fill (rent/rate/tax)", truecap: "Yes — HUD + FRED + state property tax", turbotenant: "Not applicable", winner: "truecap" },
  { feature: "Multi-property dashboard", truecap: "Yes — portfolio rollup of saved deals", turbotenant: "Yes — multi-unit ops dashboard", winner: "tie" },
  { feature: "Pricing (paid tier)", truecap: "Paid Pro; see live pricing for current rates and limits", turbotenant: "Premium ~$8-12/mo per unit (as of 2026)", winner: "tie" },
];

export default function VsTurbotenantPage() {
  const siteUrl = getSiteUrl();
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "TurboTenant vs TrueCap (2026): Manage vs Analyze",
    url: `${siteUrl}/vs/turbotenant`,
    description:
      "TurboTenant runs your rentals after you buy them. TrueCap decides if you should buy. Honest comparison and how DIY landlords use both.",
    dateModified: "2026-06-07",
    publisher: { "@id": `${siteUrl}/#organization` },
  };

  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <VsBreadcrumbSchema vsPath="/vs/turbotenant" pageName="TrueCap vs TurboTenant" />
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
            TrueCap vs TurboTenant:{" "}
            <span className="text-primary">underwrite the deal, then manage the tenant</span>
          </h1>
          <p className="mt-4 max-w-2xl text-base sm:text-lg leading-relaxed text-muted-foreground">
            TurboTenant handles the landlord operations stack after you own the property — listing, screening, leases, rent collection, maintenance requests. TrueCap is the pre-purchase underwriting calculator that decides whether the property is worth buying in the first place. They don&apos;t compete; they cover different halves of the rental lifecycle.
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
            Free analyzer: no card or signup
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
                <li>You&apos;re evaluating a property before making an offer.</li>
                <li>You want cap rate, DSCR, cash flow, 10-year projection.</li>
                <li>You want a deal score + plain-English verdict.</li>
                <li>You&apos;re comparing 2-3 deals side-by-side before deciding.</li>
              </ul>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                Use TurboTenant when
              </p>
              <ul className="space-y-1.5 text-sm leading-relaxed text-foreground">
                <li>You already own a rental and need to list it for tenants.</li>
                <li>You want online applications + tenant screening through TransUnion.</li>
                <li>You want online rent collection (ACH free) + maintenance request tracking.</li>
                <li>You need state-compliant lease templates with e-signature.</li>
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
                    TurboTenant
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
                        <WinnerBadge winner={row.winner} side="turbotenant" />
                        <span>{row.turbotenant}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            TurboTenant details based on publicly available product info as of 2026.
            See{" "}
            <a href="https://turbotenant.com" target="_blank" rel="noopener" className="underline">
              turbotenant.com
            </a>{" "}
            for their current state.
          </p>
        </section>

        {/* Complementary workflow */}
        <section className="mb-12 sm:mb-16 rounded-2xl border border-[var(--brand-green)]/25 bg-[var(--brand-green-light)] p-6 sm:p-8">
          <h2 className="text-xl sm:text-2xl font-extrabold text-[var(--brand-green)] mb-3">
            How DIY landlords use both
          </h2>
          <ol className="space-y-2.5 text-sm sm:text-base leading-relaxed text-foreground list-decimal pl-5">
            <li>
              <strong>Source the deal.</strong> Zillow, MLS, wholesaler, off-market.
            </li>
            <li>
              <strong>Underwrite in TrueCap.</strong> Address auto-fills HUD rent, FRED rate, state tax. Check cap rate, CoC, DSCR. Sensitize the inputs. Save the deal.
            </li>
            <li>
              <strong>Make the offer and close.</strong> TrueCap is done; your transaction takes over.
            </li>
            <li>
              <strong>Set up the property in TurboTenant.</strong> List the unit, accept applications, screen tenants with TransUnion, sign a state-specific lease online.
            </li>
            <li>
              <strong>Operate in TurboTenant.</strong> Collect rent via ACH (free), handle maintenance requests through the tenant portal, track payment history.
            </li>
            <li>
              <strong>Annual review in TrueCap.</strong> Revisit the saved analysis to compare actuals vs the original underwrite. Apply that learning to the next acquisition.
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

        <ComparisonFaq competitorName="TurboTenant" items={TURBOTENANT_FAQ} />

        {/* Pricing CTA */}
        <section className="mb-12 sm:mb-16 rounded-2xl bg-primary p-6 sm:p-8 text-primary-foreground">
          <h2 className="text-2xl sm:text-3xl font-extrabold mb-2">
            Underwrite the next deal — free.
          </h2>
          <p className="text-sm sm:text-base opacity-90 mb-5 max-w-2xl">
            TrueCap free covers cap rate, CoC, DSCR, NCF, and monthly cash flow.
            Pro unlocks projections, sensitivity, illustrative tax impact, modeled exit comparisons,
            MAO, and co-branded share links. Pro includes PDFs, and a one-time
            PDF option is available; see live pricing for current terms.
            No card to start.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 bg-primary-foreground text-primary px-4 py-2.5 rounded-xl font-bold hover:opacity-90 transition-opacity"
            >
              See Pro pricing
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
          <Link href="/vs/avail" className="font-bold text-foreground hover:underline">TrueCap vs Avail</Link>
          {" · "}
          <Link href="/vs/rentredi" className="font-bold text-foreground hover:underline">TrueCap vs RentRedi</Link>
          {" · "}
          <Link href="/vs/stessa" className="font-bold text-foreground hover:underline">TrueCap vs Stessa</Link>
        </footer>
      </main>
      <SiteFooter />
      <ScrollDepthTracker />
    </div>
  );
}

const TURBOTENANT_FAQ: FaqItem[] = [
  {
    question: "Is TrueCap a TurboTenant alternative?",
    answer: (
      <>
        No — different stages. TurboTenant operates rentals you own (listing, screening, leases, rent collection). TrueCap underwrites rentals you&apos;re considering buying (cap rate, CoC, DSCR, cash flow, projection). Most DIY landlords end up using both.
      </>
    ),
    plainTextAnswer:
      "No — different stages. TurboTenant operates rentals you own (listing, screening, leases, rent collection). TrueCap underwrites rentals you&apos;re buying. Most DIY landlords use both.",
  },
  {
    question: "Is TurboTenant really free?",
    answer: (
      <>
        TurboTenant&apos;s core landlord features (listings, applications, ACH rent collection, basic lease) are free. They monetize through premium add-ons (~$8-12/unit/month for advanced features like financial reporting, maintenance tracking, and faster ACH) and tenant-paid services (screening fees, card payment fees). For most small landlords, the free tier is usable.
      </>
    ),
    plainTextAnswer:
      "Yes — TurboTenant&apos;s core features (listings, applications, ACH rent collection, basic lease) are free. Premium add-ons are ~$8-12/unit/month. Tenants pay screening + card fees. Most small landlords stay on free.",
  },
  {
    question: "Does TrueCap have rent collection or tenant screening?",
    answer: (
      <>
        No, and we&apos;re not planning to. Rent collection is a regulated payments product (NACHA rules, late-fee automation) and tenant screening is FCRA-regulated. We don&apos;t build there. TurboTenant, RentRedi, and Avail all specialize in those workflows.
      </>
    ),
    plainTextAnswer:
      "No, not planned. Rent collection is regulated payments (NACHA), tenant screening is FCRA-regulated. We don&apos;t build there. TurboTenant, RentRedi, and Avail specialize in those.",
  },
  {
    question: "Is TurboTenant or Avail better?",
    answer: (
      <>
        Close call. TurboTenant has a stronger free tier; Avail (acquired by Realtor.com) has slightly tighter listing distribution. Both are solid choices for small landlords. The decision usually comes down to feel of the UI — try the free tier of each. TrueCap is upstream of both regardless.
      </>
    ),
    plainTextAnswer:
      "Close call. TurboTenant has stronger free tier; Avail has tighter listing distribution. Try both free tiers. TrueCap is upstream of both regardless.",
  },
  {
    question: "Can I afford TrueCap + TurboTenant?",
    answer: (
      <>
        The free tiers can cover portions of underwriting and operations. If you need TrueCap Pro or TurboTenant Premium, compare both live pricing pages and add the current rates for the units and features you actually need.
      </>
    ),
    plainTextAnswer:
      "The free tiers can cover portions of underwriting and operations. If you need paid features, compare both live pricing pages and add the current rates for the units and features you need.",
  },
];

function WinnerBadge({
  winner,
  side,
}: {
  winner: Verdict;
  side: "row" | "truecap" | "turbotenant";
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
