/**
 * /vs/propstream — competitor comparison landing page.
 *
 * Target queries: "propstream alternative", "propstream vs", "propstream pricing", "propstream review", "cheaper than propstream".
 * PropStream is a real-estate lead-generation + property data platform — skip-tracing, list-pulling, motivated-seller filters. Investors searching 'propstream alternative' are usually looking for a cheaper way to find off-market leads OR realize they need underwriting too.
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
import { ScrollToFormButton } from "@/components/marketing/scroll-to-form-button";
import {
  ComparisonFaq,
  type FaqItem,
} from "@/components/marketing/comparison-faq";
import { getSiteUrl } from "@/lib/site-url";
import { VsBreadcrumbSchema } from "@/components/marketing/vs-breadcrumb-schema";

export const metadata: Metadata = {
  title: "PropStream vs TrueCap (2026): Find vs Underwrite",
  description:
    "PropStream finds properties. TrueCap models their cash flow from the assumptions you review. An honest side-by-side of where each fits.",
  keywords: [
    "propstream alternative",
    "propstream vs",
    "propstream pricing",
    "propstream review",
    "cheaper than propstream",
  ],
  alternates: { canonical: "/vs/propstream" },
  openGraph: {
    title: "PropStream vs TrueCap (2026): Find vs Underwrite",
    description:
      "PropStream finds leads. TrueCap underwrites them. Different jobs in the same workflow — most investors use both.",
    url: "/vs/propstream",
    type: "website",
    images: [
      {
        url: "/home.jpg",
        width: 1200,
        height: 630,
        alt: "TrueCap vs PropStream",
      },
    ],
  },
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
};

type Verdict = "truecap" | "propstream" | "tie";
type Row = {
  feature: string;
  truecap: string;
  propstream: string;
  winner: Verdict;
};

const MATRIX: Row[] = [
  {
    feature: "Lifecycle stage",
    truecap: "Underwriting — does this deal pencil?",
    propstream: "Lead generation — find motivated sellers",
    winner: "tie",
  },
  {
    feature: "Cap rate / CoC / DSCR analysis",
    truecap: "Yes — full engine, free tier",
    propstream: "Not modeled",
    winner: "truecap",
  },
  {
    feature: "10-year projection",
    truecap: "Pro — rent + expense + appreciation",
    propstream: "Not modeled",
    winner: "truecap",
  },
  {
    feature: "Deal score (0–100)",
    truecap: "Free — 0–100 score with factor breakdown",
    propstream: "Not applicable",
    winner: "truecap",
  },
  {
    feature: "Starting values (rent/rate/tax)",
    truecap: "HUD rent + FRED rate + manual local property tax",
    propstream: "Property data only — no underwriting",
    winner: "truecap",
  },
  {
    feature: "Skip tracing",
    truecap: "No",
    propstream: "Yes — owner phone + email lookup",
    winner: "propstream",
  },
  {
    feature: "Motivated-seller lists",
    truecap: "No",
    propstream: "Yes — pre-foreclosure, probate, vacant, tax delinquent",
    winner: "propstream",
  },
  {
    feature: "Public records data",
    truecap: "Limited (HUD FMR + FRED)",
    propstream: "Yes — 150M+ properties",
    winner: "propstream",
  },
  {
    feature: "List builder / direct mail integration",
    truecap: "No",
    propstream: "Yes — full marketing stack",
    winner: "propstream",
  },
  {
    feature: "Mobile-first UX",
    truecap: "Yes — PWA installable",
    propstream: "Mobile app exists",
    winner: "tie",
  },
  {
    feature: "Pricing (entry tier)",
    truecap: "Free core; paid Pro — see live pricing",
    propstream: "~$99/mo (as of 2026), no real free tier",
    winner: "truecap",
  },
  {
    feature: "Free tier",
    truecap: "Yes — core cap rate, CoC, DSCR, and cash flow",
    propstream: "No — paid only",
    winner: "truecap",
  },
  {
    feature: "Shareable read-only deal link",
    truecap: "Free — read-only public link; Pro adds co-branding",
    propstream: "Internal-only data",
    winner: "truecap",
  },
  {
    feature: "PDF deal report",
    truecap: "Included with Pro",
    propstream: "Not the use case",
    winner: "truecap",
  },
];

export default function VsPropstreamPage() {
  const siteUrl = getSiteUrl();
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "PropStream vs TrueCap (2026): Find vs Underwrite",
    url: `${siteUrl}/vs/propstream`,
    description:
      "PropStream finds properties. TrueCap models their cash flow from the assumptions you review. An honest side-by-side of where each fits.",
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
        vsPath="/vs/propstream"
        pageName="TrueCap vs PropStream"
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
            TrueCap vs PropStream:{" "}
            <span className="text-primary">
              find the leads vs underwrite the deals
            </span>
          </h1>
          <p className="mt-4 max-w-2xl text-base sm:text-lg leading-relaxed text-muted-foreground">
            PropStream is the heavyweight in real-estate lead generation — skip
            tracing, list-pulling, motivated-seller filters across 150M+
            properties. TrueCap underwrites the user-reviewed assumptions for an
            individual lead. Different jobs: PropStream sources; TrueCap models
            the economics.
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
                  You&apos;ve found a property and need to know if it cash
                  flows.
                </li>
                <li>
                  You want a defensible analysis to send to a lender or partner.
                </li>
                <li>
                  You don&apos;t need to source leads — you have a deal in hand.
                </li>
                <li>You want a free tier that covers real underwriting.</li>
              </ul>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                Use PropStream when
              </p>
              <ul className="space-y-1.5 text-sm leading-relaxed text-foreground">
                <li>You source off-market deals as part of your strategy.</li>
                <li>
                  You need motivated-seller lists (pre-foreclosure, probate,
                  vacant).
                </li>
                <li>You want owner phone / email for direct outreach.</li>
                <li>
                  You&apos;re spending real money on direct mail or cold call
                  campaigns.
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
                    PropStream
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
                        <WinnerBadge winner={row.winner} side="propstream" />
                        <span>{row.propstream}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            PropStream details based on publicly available product info as of
            2026. See{" "}
            <a
              href="https://propstream.com"
              target="_blank"
              rel="noopener"
              className="underline"
            >
              propstream.com
            </a>{" "}
            for their current state.
          </p>
        </section>

        {/* Complementary workflow */}
        <section className="mb-12 sm:mb-16 rounded-2xl border border-[var(--brand-green)]/25 bg-[var(--brand-green-light)] p-6 sm:p-8">
          <h2 className="text-xl sm:text-2xl font-extrabold text-[var(--brand-green)] mb-3">
            How most investors use both
          </h2>
          <ol className="space-y-2.5 text-sm sm:text-base leading-relaxed text-foreground list-decimal pl-5">
            <li>
              <strong>Source the deal in PropStream.</strong> Build
              motivated-seller lists; skip-trace; pull contact info; send mail
              or text.
            </li>
            <li>
              <strong>Get a callback / motivated seller responds.</strong> Now
              you have an address.
            </li>
            <li>
              <strong>Underwrite in TrueCap.</strong> Paste the address. HUD
              area rent and the FRED owner-occupied rate can pre-fill as
              editable benchmarks; enter property tax from a local bill or
              reviewed rate. Run the analysis and review the Offer Ceiling under
              your targets.
            </li>
            <li>
              <strong>Verify, then record your decision.</strong> TrueCap&apos;s
              Offer Ceiling (Pro) works backward from your targets: the highest
              price that still meets them.
            </li>
            <li>
              <strong>
                Close, save the deal, track actuals in your accounting tool.
              </strong>{" "}
              TrueCap doesn&apos;t do operations — pair with Stessa or your
              bookkeeping system.
            </li>
          </ol>
          <p className="mt-4 text-sm leading-relaxed text-foreground">
            Just want the underwriting half? The free{" "}
            <Link
              href="/tools/1-percent-rule-calculator"
              className="font-semibold text-primary hover:underline"
            >
              1% rule calculator
            </Link>{" "}
            screens a list of skip-traced addresses down to the handful worth
            modeling, and our guide to{" "}
            <Link
              href="/blog/how-to-underwrite-a-rental-property-in-60-seconds"
              className="font-semibold text-primary hover:underline"
            >
              60-second underwriting
            </Link>{" "}
            shows what happens next. When one survives the screen, the full{" "}
            <Link
              href="/"
              className="font-semibold text-primary hover:underline"
            >
              TrueCap analyzer
            </Link>{" "}
            prices it — cap rate, DSCR, cash flow — from the address alone.
          </p>
        </section>

        <ComparisonFaq competitorName="PropStream" items={PROPSTREAM_FAQ} />

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

        <footer className="border-t border-border pt-6 text-sm text-muted-foreground leading-relaxed">
          Other comparisons:{" "}
          <Link
            href="/vs/dealcheck"
            className="font-bold text-foreground hover:underline"
          >
            TrueCap vs DealCheck
          </Link>
          {" · "}
          <Link
            href="/vs/stessa"
            className="font-bold text-foreground hover:underline"
          >
            TrueCap vs Stessa
          </Link>
          {" · "}
          <Link
            href="/vs/mashvisor"
            className="font-bold text-foreground hover:underline"
          >
            TrueCap vs Mashvisor
          </Link>
        </footer>
      </main>
      <SiteFooter />
      <ScrollDepthTracker />
    </div>
  );
}

const PROPSTREAM_FAQ: FaqItem[] = [
  {
    question: "Is TrueCap a PropStream alternative?",
    answer: (
      <>
        Not really — they solve different problems. PropStream finds
        motivated-seller leads with skip-tracing and public-records data.
        TrueCap underwrites a specific property once you have an address. Most
        serious investors use both: PropStream to source, TrueCap to underwrite.
      </>
    ),
    plainTextAnswer:
      "Not really — different problems. PropStream finds motivated-seller leads with skip-tracing and public-records data. TrueCap underwrites a specific property. Investors use both: PropStream to source, TrueCap to underwrite.",
  },
  {
    question: "Can TrueCap do skip tracing or pull property lists?",
    answer: (
      <>
        No. TrueCap focuses on per-deal underwriting and uses HUD area rent and
        the FRED owner-occupied 30-year rate as editable benchmarks; property
        tax is a manual local input. For lead generation, list pulls, and owner
        contact info, PropStream or DealMachine are the right tools.
      </>
    ),
    plainTextAnswer:
      "No. TrueCap focuses on per-deal underwriting using editable HUD rent and FRED rate benchmarks plus manual local property tax. For lead gen, lists, and owner contact info, use PropStream or DealMachine.",
  },
  {
    question: "Is PropStream worth $99/month?",
    answer: (
      <>
        It depends on volume. If you send direct mail to 1,000+ addresses a
        month or run a wholesaling operation, the lists and skip-tracing pay for
        themselves quickly. If you&apos;re a buy-and-hold investor who buys 1-3
        properties a year through MLS or your network, PropStream is overkill —
        the data you need (rent, tax, property details) is already in TrueCap or
        your MLS access.
      </>
    ),
    plainTextAnswer:
      "Depends on volume. If you send 1,000+ direct mail pieces/month or wholesale, lists + skip-tracing pay for themselves. If you buy 1-3 properties/year via MLS or your network, PropStream is overkill.",
  },
  {
    question: "Does TrueCap have a free tier? PropStream doesn&apos;t.",
    answer: (
      <>
        Yes — TrueCap&apos;s free, no-account screen covers cap rate,
        cash-on-cash, DSCR, cash flow, and labeled address starting assumptions.
        No card is required. Complete-decision allowances and Pro terms are
        shown on TrueCap&apos;s live pricing page. PropStream is paid-only
        beyond its current trial terms.
      </>
    ),
    plainTextAnswer:
      "Yes. TrueCap provides free, no-account screens with cap rate, CoC, DSCR, cash flow, and labeled address starting assumptions. Complete-decision allowances and Pro terms are on the live pricing page. Verify PropStream's current trial and paid terms on its official site.",
  },
  {
    question: "What&apos;s the best PropStream alternative for finding deals?",
    answer: (
      <>
        If you specifically want lead generation, look at DealMachine
        (mobile-first driving for dollars), BatchLeads (similar volume to
        PropStream, sometimes cheaper), or Reonomy (commercial-leaning). TrueCap
        isn&apos;t in that category — we&apos;re the underwriting layer
        you&apos;d use after any of those finds you a property.
      </>
    ),
    plainTextAnswer:
      "For lead gen: DealMachine (mobile-first), BatchLeads (similar to PropStream), or Reonomy (commercial). TrueCap is the underwriting layer you&apos;d use after any of those finds a property.",
  },
];

function WinnerBadge({
  winner,
  side,
}: {
  winner: Verdict;
  side: "row" | "truecap" | "propstream";
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
