/**
 * /vs/hostfully — competitor comparison landing page.
 *
 * Target queries: "hostfully alternative", "hostfully vs", "hostfully pricing", "hostfully review", "short term rental software".
 * Hostfully is short-term rental / Airbnb property management software — channel manager, guest messaging, dynamic pricing. STR-only. TrueCap users evaluate it once they own an STR.
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
import { ProductShot } from "@/components/marketing/product-shot";
import { SiteFooter } from "@/components/marketing/site-footer";
import { RelatedContent } from "@/components/marketing/related-content";
import { ScrollToFormButton } from "@/components/marketing/scroll-to-form-button";
import {
  ComparisonFaq,
  type FaqItem,
} from "@/components/marketing/comparison-faq";
import { getSiteUrl } from "@/lib/site-url";
import { VsBreadcrumbSchema } from "@/components/marketing/vs-breadcrumb-schema";

export const metadata: Metadata = {
  title: "Hostfully vs TrueCap (2026): Manage vs Underwrite",
  description:
    "Hostfully manages short-term rentals after you buy them. TrueCap underwrites them before. Honest comparison and how STR investors use both.",
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
  winner: Verdict;
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
    hostfully: "Not modeled",
    winner: "truecap",
  },
  {
    feature: "Underwriting math (purchase decision)",
    truecap: "Yes — full engine + Pro projections",
    hostfully: "Not modeled",
    winner: "truecap",
  },
  {
    feature: "Starting values (rent/rate/tax)",
    truecap: "HUD rent + FRED rate + manual local property tax",
    hostfully: "Not applicable",
    winner: "truecap",
  },
  {
    feature: "Channel manager (Airbnb, Vrbo)",
    truecap: "No",
    hostfully: "Yes — unified inbox + calendar",
    winner: "hostfully",
  },
  {
    feature: "Dynamic pricing",
    truecap: "No",
    hostfully: "Yes — integrations with PriceLabs etc.",
    winner: "hostfully",
  },
  {
    feature: "Guest messaging automation",
    truecap: "No",
    hostfully: "Yes — automated booking + check-in flows",
    winner: "hostfully",
  },
  {
    feature: "Cleaning / vendor scheduling",
    truecap: "No",
    hostfully: "Yes — turn-over automation",
    winner: "hostfully",
  },
  {
    feature: "Free tier",
    truecap: "Yes — core cap rate, CoC, DSCR, and cash flow",
    hostfully: "No — trial only, $109+/mo (as of 2026)",
    winner: "truecap",
  },
  {
    feature: "STR-specific underwriting (ADR, occupancy)",
    truecap: "Inputs editable; not auto-pulled",
    hostfully: "Not the use case",
    winner: "truecap",
  },
  {
    feature: "Pricing model",
    truecap: "Free core; paid Pro — see live pricing",
    hostfully: "$109+/mo for STR managers (as of 2026)",
    winner: "truecap",
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
      "Hostfully manages short-term rentals after you buy them. TrueCap underwrites them before. Honest comparison and how STR investors use both.",
    dateModified: "2026-06-07",
    publisher: { "@id": `${siteUrl}/#organization` },
  };

  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <VsBreadcrumbSchema
        vsPath="/vs/hostfully"
        pageName="TrueCap vs Hostfully"
      />
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
            TrueCap vs Hostfully:{" "}
            <span className="text-primary">
              underwrite the STR, then host it
            </span>
          </h1>
          <p className="mt-4 max-w-2xl text-base sm:text-lg leading-relaxed text-muted-foreground">
            Hostfully is short-term rental management software — channel manager
            (Airbnb, Vrbo, Booking.com), guest messaging, dynamic pricing,
            automation. TrueCap models the property&apos;s pre-purchase
            economics from user-reviewed assumptions. Different stages,
            complementary tools.
          </p>
          <div className="mt-7 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            <ScrollToFormButton className="group inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground shadow-[0_12px_28px_rgba(0,112,196,0.28)] transition-transform hover:-translate-y-0.5">
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

        {/* Real product screenshot from the free sample deal. */}
        <section className="mb-12 sm:mb-16" aria-label="What the decision looks like">
          <ProductShot
            shot="verdict"
            alt="TrueCap's decision view for the sample deal: the Offer Ceiling beside the asking price, cash flow after reserves, and DSCR"
            caption={<>Real output from the free sample deal. <Link href="/analyze?sample=1" prefetch={false} className="font-semibold text-primary underline underline-offset-4">Run it yourself →</Link></>}
          />
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
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                Use Hostfully when
              </p>
              <ul className="space-y-1.5 text-sm leading-relaxed text-foreground">
                <li>You own or are about to own a short-term rental.</li>
                <li>
                  You list on Airbnb + Vrbo + Booking.com and want one inbox.
                </li>
                <li>
                  You want dynamic pricing, guest messaging, cleaning
                  automation.
                </li>
                <li>
                  You&apos;re managing 2+ STRs and need to scale operations.
                </li>
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
            Side-by-side on every dimension that matters for a
            comparison-shopping investor.
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
                    Hostfully
                  </th>
                </tr>
              </thead>
              <tbody>
                {MATRIX.map((row) => (
                  <tr
                    key={row.feature}
                    className="border-t border-border align-top"
                  >
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
                        <WinnerBadge winner={row.winner} side="hostfully" />
                        <span>{row.hostfully}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            Hostfully details based on publicly available product info as of
            2026. See{" "}
            <a
              href="https://hostfully.com"
              target="_blank"
              rel="noopener"
              className="underline"
            >
              hostfully.com
            </a>{" "}
            for their current state.
          </p>
        </section>

        {/* Complementary workflow */}
        <section className="mb-12 sm:mb-16 rounded-2xl border border-[var(--brand-green)]/25 bg-[var(--brand-green-light)] p-6 sm:p-8">
          <h2 className="text-xl sm:text-2xl font-extrabold text-[var(--brand-green)] mb-3">
            How STR investors use both
          </h2>
          <ol className="space-y-2.5 text-sm sm:text-base leading-relaxed text-foreground list-decimal pl-5">
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
              <strong>Set up the STR in Hostfully.</strong> Import to
              Airbnb/Vrbo/Booking, set dynamic pricing, automate guest messages
              and check-in.
            </li>
            <li>
              <strong>Operate.</strong> Hostfully runs the day-to-day. Pair with
              PriceLabs (pricing), Turno (cleaning), and a property accounting
              tool (Stessa / Baselane) for the financial side.
            </li>
          </ol>
          <p className="mt-4 text-sm leading-relaxed text-foreground">
            Not ready for a full underwrite? The free{" "}
            <Link
              href="/tools/gross-rent-multiplier-calculator"
              className="font-semibold text-primary hover:underline"
            >
              gross rent multiplier calculator
            </Link>{" "}
            triages a listing in seconds from price and gross revenue, and our{" "}
            <Link
              href="/blog/short-term-rental-underwriting-playbook"
              className="font-semibold text-primary hover:underline"
            >
              short-term rental underwriting playbook
            </Link>{" "}
            explains which STR assumptions actually move the answer. When you
            need the cap rate, cash-on-cash and DSCR behind that screen, the
            full{" "}
            <Link
              href="/"
              className="font-semibold text-primary hover:underline"
            >
              TrueCap analyzer
            </Link>{" "}
            computes them from an address.
          </p>
        </section>

        <ComparisonFaq competitorName="Hostfully" items={HOSTFULLY_FAQ} />

        {/* Pricing CTA */}
        <section className="mb-12 sm:mb-16 rounded-2xl bg-primary p-6 sm:p-8 text-primary-foreground">
          <h2 className="text-2xl sm:text-3xl font-extrabold mb-2">
            Underwrite the next deal — free.
          </h2>
          <p className="text-sm sm:text-base opacity-90 mb-5 max-w-2xl">
            TrueCap free covers cap rate, CoC, DSCR, NCF, and monthly cash flow.
            Pro adds 10-year cash-flow and equity projections, sensitivity,
            Offer Ceiling, co-branded share links, and PDF reports with Pro; see
            live pricing for current terms. No card to start.
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

        <RelatedContent kind="vs" slug="hostfully" className="mt-10" />

        <footer className="border-t border-border pt-6 text-sm text-muted-foreground leading-relaxed">
          Other comparisons:{" "}
          <Link
            href="/vs/mashvisor"
            className="font-bold text-foreground hover:underline"
          >
            TrueCap vs Mashvisor
          </Link>
          {" · "}
          <Link
            href="/vs/roofstock"
            className="font-bold text-foreground hover:underline"
          >
            TrueCap vs Roofstock
          </Link>
          {" · "}
          <Link
            href="/vs/stessa"
            className="font-bold text-foreground hover:underline"
          >
            TrueCap vs Stessa
          </Link>
        </footer>
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
    plainTextAnswer:
      "No — different stages. Hostfully manages an STR you own. TrueCap underwrites whether to buy. STR investors use both.",
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
    plainTextAnswer:
      "Yes — every input is editable. Plug in expected monthly STR revenue (gross ÷ 12, discounted for vacancy/cleaning) as the rent value, then run the full underwrite. TrueCap doesn&apos;t auto-pull AirDNA or Mashvisor STR data.",
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
    plainTextAnswer:
      "Both are STR property-management platforms. Guesty currently publishes Lite for 1-3 listings, Pro for 4-199, and Enterprise for 200+. Compare current features, quotes, and terms; TrueCap is the pre-purchase underwriting layer.",
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
    plainTextAnswer:
      "No. TrueCap does not currently expose a tax-specific module or determine STR eligibility, material participation, REPS, cost segregation, or bonus depreciation. Use a qualified tax professional.",
  },
  {
    question: "How much does Hostfully cost?",
    answer: (
      <>
        Hostfully&apos;s pricing starts around $109/month (as of 2026) for STR
        operators, scaling up with the number of properties. There&apos;s no
        free tier — they offer a trial. For 1-2 STR properties, the cost can be
        heavy; many solo STR hosts use Hostfully alternatives like Lodgify,
        Smoobu, or just direct Airbnb tools until they scale.
      </>
    ),
    plainTextAnswer:
      "Hostfully starts ~$109/mo (2026), scaling with property count. No free tier, just a trial. For 1-2 STRs, heavy cost; solo hosts often use Lodgify, Smoobu, or direct Airbnb tools until scaling.",
  },
];

function WinnerBadge({
  winner,
  side,
}: {
  winner: Verdict;
  side: "row" | "truecap" | "hostfully";
}) {
  if (side === "row") return null;
  if (winner === "tie") {
    return (
      <Minus className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/60" />
    );
  }
  if (winner === side) {
    return (
      <Check className="mt-0.5 size-3.5 shrink-0 text-[var(--brand-green)]" />
    );
  }
  return <X className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/50" />;
}
