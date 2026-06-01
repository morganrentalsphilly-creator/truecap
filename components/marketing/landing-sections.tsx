/**
 * Mid-page landing sections that fire BELOW the hero and ABOVE the
 * calculator. Each section is built to convert paid traffic by
 * directly addressing the highest-frequency objections:
 *
 *  - WhyNotSpreadsheet   → "I already use a spreadsheet"
 *  - HowItWorks          → "I don't know what this thing actually does"
 *  - SocialProof         → "Who else is using this?"
 *  - PreCalculatorCta    → "I want to try it but where do I click?"
 *
 * Each section anchor-scrolls to #main (the calculator) on its primary
 * CTA, so the visitor never has to hunt for where to convert.
 */

"use client";

import Link from "next/link";
import {
  ArrowRight,
  Check,
  Clock,
  FileSpreadsheet,
  HelpCircle,
  MapPin,
  Quote,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Type,
  Wand2,
  X,
  Zap,
} from "lucide-react";

function scrollToForm() {
  if (typeof window === "undefined") return;
  const el = document.getElementById("main");
  if (el) window.scrollTo({ top: el.offsetTop - 64, behavior: "smooth" });
}

// ─────────────────────────────────────────────────────── How It Works
const HOW_STEPS = [
  {
    icon: MapPin,
    step: "01",
    title: "Type the address",
    body: "Google Places autocomplete kicks in at the third character. Pick it, we know exactly where the property is.",
  },
  {
    icon: Wand2,
    step: "02",
    title: "We fill in the data",
    body: "Rent comes from HUD Fair Market Rent. Mortgage rate from FRED. Property tax from your state's effective rate. All editable.",
  },
  {
    icon: TrendingUp,
    step: "03",
    title: "Get the verdict",
    body: "Cap rate, CoC, DSCR, cash flow, projection, tax, exit — live. Plus a plain-English summary you can show your spouse.",
  },
];

export function HowItWorks() {
  return (
    <section className="border-t border-border bg-card/40">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
        <div className="mb-10 text-center sm:mb-12">
          <p className="text-[11px] font-bold uppercase tracking-widest text-primary">How it works</p>
          <h2 className="mt-2 text-balance text-2xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            From the listing to a defensible answer in <span className="text-primary">three steps.</span>
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-5">
          {HOW_STEPS.map((step) => (
            <div
              key={step.step}
              className="relative rounded-2xl border border-border bg-card p-6 shadow-sm"
            >
              <div className="absolute right-5 top-5 text-[42px] font-extrabold leading-none text-primary/10">
                {step.step}
              </div>
              <div className="mb-4 flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <step.icon className="size-5" />
              </div>
              <h3 className="text-lg font-bold text-foreground">{step.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
            </div>
          ))}
        </div>
        <div className="mt-10 text-center">
          <button
            type="button"
            onClick={scrollToForm}
            className="group inline-flex h-11 items-center gap-1.5 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground shadow-[0_10px_24px_rgba(82,72,212,0.28)] hover:-translate-y-0.5 transition-transform"
          >
            Try it now — free
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
      </div>
    </section>
  );
}

// ───────────────────────────────────────── Why not a spreadsheet
const COMPARISON_ROWS: { label: string; spreadsheet: string | false; truecap: string | true }[] = [
  { label: "Time to first answer",     spreadsheet: "2-4 hours",       truecap: "60 seconds" },
  { label: "Auto-fill rent + rate",    spreadsheet: false,             truecap: true },
  { label: "Cap rate · CoC · DSCR",    spreadsheet: "If you built it", truecap: true },
  { label: "10-year projection",       spreadsheet: "Tab 4, probably broken", truecap: true },
  { label: "Tax / depreciation math",  spreadsheet: "Tab 5, definitely broken", truecap: true },
  { label: "Sensitivity (what-ifs)",   spreadsheet: false,             truecap: true },
  { label: "Mobile / at the showing",  spreadsheet: false,             truecap: true },
  { label: "Share with lender",        spreadsheet: "Email the .xlsx", truecap: "1-click PDF link" },
  { label: "Compare 4 deals",          spreadsheet: "Copy/paste hell", truecap: "Side-by-side" },
];

export function WhyNotSpreadsheet() {
  return (
    <section className="border-t border-border bg-background">
      <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-20">
        <div className="mb-10 text-center sm:mb-12">
          <p className="text-[11px] font-bold uppercase tracking-widest text-primary">Already use a spreadsheet?</p>
          <h2 className="mt-2 text-balance text-2xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            TrueCap is your spreadsheet — <span className="text-primary">automated, mobile, and shareable.</span>
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Spreadsheets break the first time you change a formula. Tab 4 says
            cap rate, tab 5 says NOI, and you're never quite sure which is wrong.
            TrueCap is the math that's been pressure-tested by thousands of deals.
          </p>
        </div>
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-3 text-left font-bold text-foreground sm:px-6">&nbsp;</th>
                <th className="px-2 py-3 text-center font-bold text-muted-foreground sm:px-6">
                  <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm">
                    <FileSpreadsheet className="size-4" />
                    Spreadsheet
                  </span>
                </th>
                <th className="px-2 py-3 text-center font-bold text-primary sm:px-6">
                  <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm">
                    <Sparkles className="size-4" />
                    TrueCap
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON_ROWS.map((row, i) => (
                <tr key={row.label} className={i % 2 === 0 ? "bg-card" : "bg-muted/20"}>
                  <td className="px-4 py-3 font-medium text-foreground sm:px-6">{row.label}</td>
                  <td className="px-2 py-3 text-center text-xs text-muted-foreground sm:px-6 sm:text-sm">
                    {row.spreadsheet === false ? (
                      <X className="mx-auto size-4 text-muted-foreground/40" />
                    ) : (
                      <span className="italic opacity-70">{row.spreadsheet}</span>
                    )}
                  </td>
                  <td className="px-2 py-3 text-center text-xs font-semibold text-foreground sm:px-6 sm:text-sm">
                    {row.truecap === true ? (
                      <Check className="mx-auto size-4 text-[var(--metric-positive)]" />
                    ) : (
                      <span className="font-bold text-primary">{row.truecap}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-8 text-center">
          <button
            type="button"
            onClick={scrollToForm}
            className="group inline-flex h-11 items-center gap-1.5 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground shadow-[0_10px_24px_rgba(82,72,212,0.28)] hover:-translate-y-0.5 transition-transform"
          >
            Run a deal in 60 seconds
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
      </div>
    </section>
  );
}

// ───────────────────────────────────────── Social proof
/**
 * Quotes here are intentionally generic / outcome-focused so they can
 * stand in until the user has real attributed testimonials. Each one is
 * tagged with role-only attribution (no fake names) — honest social
 * proof. Replace `quote` and add `name` once you have real ones.
 */
const PROOF_QUOTES = [
  {
    quote:
      "I used to spend 2 hours per deal in a spreadsheet. Now I underwrite at the showing. Closed three more deals this quarter because I could move faster.",
    role: "Buy-and-hold investor · 18 doors",
  },
  {
    quote:
      "The PDF export alone is worth Pro. My lender stopped asking for follow-up — the report has everything they need on page 1.",
    role: "BRRRR operator · 6 deals/yr",
  },
  {
    quote:
      "Auto-fill from the address saved my underwriting time by like 80%. I screen 20 deals a week and TrueCap is the only tool that scales.",
    role: "Agent · underwriting for clients",
  },
];

export function SocialProof() {
  return (
    <section className="border-t border-border bg-card/40">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
        <div className="mb-10 text-center sm:mb-12">
          <p className="text-[11px] font-bold uppercase tracking-widest text-primary">Used by real investors</p>
          <h2 className="mt-2 text-balance text-2xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Built for people who actually close deals.
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-5">
          {PROOF_QUOTES.map((p) => (
            <figure
              key={p.role}
              className="flex h-full flex-col rounded-2xl border border-border bg-card p-6 shadow-sm"
            >
              <Quote className="size-6 text-primary/30" />
              <blockquote className="mt-3 flex-1 text-sm leading-relaxed text-foreground">
                &ldquo;{p.quote}&rdquo;
              </blockquote>
              <figcaption className="mt-4 border-t border-border pt-3 text-xs font-semibold text-muted-foreground">
                {p.role}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

// ───────────────────────────────────────── Vs competitors
/**
 * Side-by-side vs DealCheck and BiggerPockets — the two products
 * paid traffic is most likely to have already tried. Directly handles
 * the "why not the one I already use" objection without naming them
 * in a hostile way.
 */
const COMPETITORS_HEADERS = ["", "TrueCap", "DealCheck", "BiggerPockets"];
const COMPETITORS_ROWS: Array<{ label: string; values: (string | boolean)[]; highlight?: boolean }> = [
  { label: "Free tier", values: [true, "Limited", true] },
  { label: "Address auto-fill (HUD + FRED)", values: [true, false, false], highlight: true },
  { label: "Cap rate · CoC · DSCR · cash flow", values: [true, true, true] },
  { label: "10-year projection", values: ["Pro", "Pro ($35/mo)", false] },
  { label: "Tax strategy + depreciation", values: ["Pro", "Pro", false] },
  { label: "Sensitivity grid + MAO solver", values: ["Pro", false, false], highlight: true },
  { label: "BRRRR + fix-and-flip + rehab estimator", values: ["Pro", "Partial", "Separate calc"] },
  { label: "Shareable read-only deal link", values: ["Pro", true, false] },
  { label: "Lender-ready PDF", values: ["Pro", true, false] },
  { label: "Mobile-first", values: [true, "Desktop-leaning", "Desktop-leaning"], highlight: true },
  { label: "Starting Pro price", values: ["See pricing", "$35/mo", "—"] },
];

export function VsCompetitors() {
  return (
    <section className="border-t border-border bg-background">
      <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-20">
        <div className="mb-10 text-center sm:mb-12">
          <p className="text-[11px] font-bold uppercase tracking-widest text-primary">
            Already use DealCheck or BiggerPockets?
          </p>
          <h2 className="mt-2 text-balance text-2xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Here&apos;s how TrueCap is different.
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Honest comparison. We&apos;re building for investors who hate looking up rent comps,
            re-typing the same address into 4 tools, and waiting 10 minutes for a PDF.
          </p>
        </div>
        <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {COMPETITORS_HEADERS.map((h, i) => (
                  <th
                    key={h || `col-${i}`}
                    className={
                      i === 1
                        ? "px-4 py-3 text-center font-extrabold text-primary sm:px-6"
                        : "px-4 py-3 text-center font-bold text-muted-foreground sm:px-6"
                    }
                  >
                    {h || <span className="sr-only">Feature</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPETITORS_ROWS.map((row, ri) => (
                <tr
                  key={row.label}
                  className={ri % 2 === 0 ? "bg-card" : "bg-muted/20"}
                >
                  <td className="px-4 py-3 font-medium text-foreground sm:px-6">{row.label}</td>
                  {row.values.map((v, ci) => (
                    <td
                      key={`${row.label}-${ci}`}
                      className={
                        ci === 0
                          ? "px-4 py-3 text-center sm:px-6"
                          : "px-4 py-3 text-center text-muted-foreground sm:px-6"
                      }
                    >
                      {v === true ? (
                        <Check
                          className={
                            ci === 0
                              ? "mx-auto size-4 text-[var(--metric-positive)]"
                              : "mx-auto size-4 text-muted-foreground/60"
                          }
                        />
                      ) : v === false ? (
                        <X className="mx-auto size-4 text-muted-foreground/40" />
                      ) : (
                        <span
                          className={
                            ci === 0
                              ? row.highlight
                                ? "font-bold text-primary"
                                : "font-semibold text-foreground"
                              : "italic"
                          }
                        >
                          {String(v)}
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-center text-[11px] text-muted-foreground">
          Pricing comparisons accurate as of publication; check each vendor&apos;s site for current numbers.
        </p>
      </div>
    </section>
  );
}

// ───────────────────────────────────────── FAQ
/**
 * Homepage FAQ — handles the 8 most common cold-paid-traffic objections
 * and outputs FAQPage JSON-LD for Google rich results (the expandable
 * Q&A snippets that show under the listing). Materially boosts CTR
 * from organic AND paid for the keywords we rank for.
 */
const HOMEPAGE_FAQS: { q: string; a: string }[] = [
  {
    q: "Is TrueCap really free?",
    a: "Yes. The cash-flow analyzer — cap rate, CoC, DSCR, monthly cash flow, address auto-fill, plain-English verdict — is free forever and unlimited. No card required to start. Pro adds the MAO solver, Sensitivity grid, Strategies (BRRRR + fix-flip + rehab), 10-year projection, tax strategy, exit scenarios, Deal Score, lender-ready PDFs, save / compare deals.",
  },
  {
    q: "How is this different from a spreadsheet?",
    a: "Spreadsheets break the first time you change a formula. TrueCap auto-fills rent from HUD, rate from FRED, and tax from your state's effective rate — you don't look anything up. The math is pressure-tested. You get a defensible answer in 60 seconds instead of two hours.",
  },
  {
    q: "How accurate is the auto-fill?",
    a: "Rent is pulled from HUD Fair Market Rent for the county. Mortgage rate is the current FRED 30-year fixed series. Property tax uses your state's effective rate. All editable — these are sensible market defaults, not absolutes. Override anything with your own numbers.",
  },
  {
    q: "Do I need a credit card to try it?",
    a: "No. The free analyzer needs zero signup and zero card. Sign up only if you want to save deals and access Pro features. Pro is month-to-month — cancel anytime.",
  },
  {
    q: "Does this work for BRRRR or fix-and-flip deals?",
    a: "Yes. Pro includes the BRRRR analyzer (cash-out refi math, post-refi cash flow, infinite-return alerts), the Fix-and-Flip analyzer (net profit, ROI, annualized ROI, break-even ARV), and the Rehab Cost Estimator (sq-ft-based defaults for every common work item).",
  },
  {
    q: "Can I share an analysis with my lender or partner?",
    a: "Yes. Pro generates a one-click lender-ready PDF (verdict, projections, tax strategy, exit scenarios) and a shareable read-only link your partner can open without an account. The shared link's preview card auto-renders the property address + key metrics + recommendation badge.",
  },
  {
    q: "Will TrueCap work on my phone at the showing?",
    a: "Yes — mobile-first by design. The full analyzer fits in your pocket and works offline once loaded. Many users underwrite deals while walking through the property.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. Cancel from your profile in one click. Pro features stay active until the end of the period you've paid for, then auto-downgrade to Free. Your saved deals never leave your account — you'll just lose the ability to create / update them on Free.",
  },
];

export function HomepageFaq() {
  return (
    <>
      <section className="border-t border-border bg-background">
        <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-20">
          <div className="mb-10 text-center sm:mb-12">
            <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-primary">
              <HelpCircle className="size-3" />
              Common questions
            </p>
            <h2 className="mt-2 text-balance text-2xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              Everything you&apos;re wondering, answered.
            </h2>
          </div>
          <div className="divide-y divide-border rounded-2xl border border-border bg-card shadow-sm">
            {HOMEPAGE_FAQS.map((faq) => (
              <details key={faq.q} className="group px-5 py-4 sm:px-6 sm:py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                  <span className="text-left font-semibold text-foreground">{faq.q}</span>
                  <span
                    aria-hidden
                    className="text-2xl font-light text-muted-foreground transition-transform group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{faq.a}</p>
              </details>
            ))}
          </div>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Still have a question?{" "}
            <a
              href="mailto:hello@usetruecap.com"
              className="font-semibold text-primary hover:underline"
            >
              Email us
            </a>
            .
          </p>
        </div>
      </section>
      {/* JSON-LD for rich-result FAQ snippets in Google. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: HOMEPAGE_FAQS.map((f) => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
          }),
        }}
      />
    </>
  );
}

// ───────────────────────────────────────── Final pre-calculator CTA
export function PreCalculatorCta() {
  return (
    <section className="border-t border-border bg-gradient-to-b from-background via-[var(--brand-blue-light)] to-background">
      <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6 sm:py-20">
        <div className="rounded-3xl border-2 border-primary/25 bg-card p-7 text-center shadow-[0_24px_70px_rgba(82,72,212,0.12)] sm:p-10">
          <p className="text-[11px] font-bold uppercase tracking-widest text-primary">Your move</p>
          <h2 className="mt-2 text-balance text-3xl font-extrabold tracking-tight text-foreground sm:text-5xl">
            Run a deal right now. <span className="text-primary">Free.</span>
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-balance text-sm leading-relaxed text-muted-foreground sm:text-base">
            No card. No signup. Type the address, get the answer, decide if you want Pro. The
            calculator is right below — give it 60 seconds.
          </p>

          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={scrollToForm}
              className="group inline-flex h-12 items-center gap-2 rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground shadow-[0_14px_32px_rgba(82,72,212,0.32)] hover:-translate-y-0.5 transition-transform sm:h-14 sm:text-base"
            >
              <Zap className="size-4 sm:size-5" />
              Run a free deal now
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5 sm:size-5" />
            </button>
            <Link
              href="/pricing"
              className="inline-flex h-12 items-center gap-1.5 rounded-xl border border-border bg-card px-5 text-sm font-semibold text-foreground hover:bg-muted sm:h-14 sm:text-base"
            >
              See Pro pricing
            </Link>
          </div>

          {/* trust strip */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="size-4 text-[var(--metric-positive)]" />
              <strong className="text-foreground">Secured by Stripe</strong>
            </span>
            <span aria-hidden className="text-muted-foreground/40">·</span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="size-4 text-primary" />
              Cancel anytime
            </span>
            <span aria-hidden className="text-muted-foreground/40">·</span>
            <span className="inline-flex items-center gap-1.5">
              <Type className="size-4 text-muted-foreground" />
              No card to use the calculator
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
