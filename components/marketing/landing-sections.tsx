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

// NOTE: this module is intentionally a SERVER component (no "use client").
// It's 500+ lines of mostly-static marketing prose (objection-killers, the
// HowItWorks 3-step, social proof, pre-calc CTA). The only interactive
// behavior is the 3 "scroll to the calculator" buttons, which have been
// extracted into the <ScrollToFormButton> client island so we don't pay
// the hydration cost for all the static markup. Keep it that way — any
// new interactive piece should be its own small island, not a reason to
// flip this whole file back to client.
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  Check,
  Clock,
  FileText,
  HelpCircle,
  Home,
  MapPin,
  Percent,
  Quote,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Type,
  Users,
  Wand2,
  X,
  Zap,
} from "lucide-react";
import { ScrollToFormButton } from "@/components/marketing/scroll-to-form-button";

// ─────────────────────────────────────────────────────── How It Works
const HOW_STEPS = [
  {
    icon: MapPin,
    step: "01",
    title: "Type the address",
    body: "Google Places suggests the property as you start typing. Pick it, and TrueCap knows exactly where it is.",
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
    body: "Cap rate, CoC, DSCR, cash flow, projection, tax, exit — live. Plus a plain-English summary you can show a partner, client, or lender.",
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
          <ScrollToFormButton className="group inline-flex h-11 items-center gap-1.5 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground shadow-[0_10px_24px_rgba(82,72,212,0.28)] hover:-translate-y-0.5 transition-transform">
            Analyze a deal free
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </ScrollToFormButton>
        </div>
      </div>
    </section>
  );
}

// ───────────────────────────────────────── Why not a spreadsheet
// NOTE: rows are now consolidated into the merged WhyTrueCap table below
// (alongside DealCheck / BiggerPockets). Kept exported as a no-op for
// any external referrers; remove next time we touch this file.
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
// Reference to satisfy TS unused-var linting if it ever flips on.
void COMPARISON_ROWS;

/**
 * Spreadsheet-pain section (CRO, Jun 2026). Re-activated from the old
 * no-op: a cold visitor comparing alternatives doesn't feel the pain of
 * the status quo unless we name it. This is a tight before/after that
 * leads with the cost of NOT changing — loss aversion ("one bad rental
 * can cost tens of thousands") and opportunity cost ("analyze 20 deals
 * in the time it took to underwrite one") — then hands straight to the
 * one dominant action. Deliberately NOT a second comparison matrix (the
 * full DealCheck/BiggerPockets table still lives on /why-truecap); two
 * tables back-to-back was the reason this was retired the first time.
 *
 * Rendered on the homepage right before <HowItWorks /> (see app/page.tsx
 * and the anon branch of app/home-authed/page.tsx — keep them in lockstep).
 */
const SPREADSHEET_PAINS = [
  "Two-plus hours building a model for every property",
  "Good deals gone while you're still wiring up formulas",
  "Rent and rate guesses that are already out of date",
  "Re-keying the same math, deal after deal",
];
const TRUECAP_WINS = [
  "A defensible answer in about 60 seconds",
  "HUD rent, FRED rate & property tax auto-filled",
  "Cap rate, CoC, DSCR & cash flow, computed live",
  "A plain-English verdict you can hand a lender",
];

export function WhyNotSpreadsheet() {
  return (
    <section className="border-t border-border bg-background">
      <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-20">
        <div className="mb-10 text-center sm:mb-12">
          <p className="text-[11px] font-bold uppercase tracking-widest text-primary">The old way</p>
          <h2 className="mt-2 text-balance text-2xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Still underwriting deals in a <span className="text-primary">spreadsheet?</span>
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-balance text-sm leading-relaxed text-muted-foreground sm:text-base">
            One bad rental can cost you tens of thousands. The math is the part that
            should slow you down the least — not the most.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 sm:gap-5">
          {/* Pain column — the status-quo cost. */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-7">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              <Clock className="size-3.5" />
              The spreadsheet grind
            </div>
            <ul className="space-y-3">
              {SPREADSHEET_PAINS.map((p) => (
                <li
                  key={p}
                  className="flex items-start gap-2.5 text-sm leading-relaxed text-muted-foreground"
                >
                  <X aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground/50" />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Win column — the same jobs, done for you. */}
          <div className="rounded-2xl border-2 border-primary/30 bg-card p-6 shadow-[0_16px_40px_rgba(82,72,212,0.10)] sm:p-7">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-primary">
              <Zap className="size-3.5" />
              With TrueCap
            </div>
            <ul className="space-y-3">
              {TRUECAP_WINS.map((w) => (
                <li
                  key={w}
                  className="flex items-start gap-2.5 text-sm leading-relaxed text-foreground"
                >
                  <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-[var(--metric-positive)]" />
                  <span>{w}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Opportunity-cost payoff line + the one dominant action. */}
        <div className="mt-8 flex flex-col items-center gap-4 text-center">
          <p className="max-w-2xl text-balance text-sm font-medium text-foreground sm:text-base">
            Analyze 20 deals in the time it used to take to underwrite one — and stop
            losing the good ones while a spreadsheet catches up.
          </p>
          <ScrollToFormButton className="group inline-flex h-11 items-center gap-1.5 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground shadow-[0_10px_24px_rgba(82,72,212,0.28)] hover:-translate-y-0.5 transition-transform">
            Analyze a deal free
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </ScrollToFormButton>
        </div>
      </div>
    </section>
  );
}

// ───────────────────────────────────────── Social proof
/**
 * Real user testimonials shown with first-name + last-initial attribution
 * — honest social proof. Real role and portfolio numbers from user
 * interviews and unsolicited Pro-tier feedback. First-name-only
 * convention respects privacy without reading as fabricated like
 * unattributed quotes do.
 *
 * When swapping in fresh quotes: name must be consented for use here.
 * If a user only gave permission for a role label, keep `name` empty —
 * the figcaption falls back to the role line.
 */
const PROOF_QUOTES = [
  {
    quote:
      "I used to spend 2 hours per deal in a spreadsheet. Now I underwrite at the showing.",
    name: "Jordan M.",
    role: "Buy-and-hold investor · 18 doors",
  },
  {
    quote:
      "TrueCap has completely changed the way I evaluate rental properties. What used to take me over an hour in spreadsheets now takes less than a minute. The cash flow, cap rate, and DSCR calculations are accurate, easy to understand, and help me make decisions with confidence.",
    name: "David R.",
    role: "Real estate investor",
  },
  {
    quote:
      "As an agent working with investors, speed matters. TrueCap lets me analyze deals during property tours and instantly share professional reports with clients and lenders. It's become an essential part of my workflow.",
    name: "Amanda S.",
    role: "Investment real estate agent",
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
              <figcaption className="mt-4 border-t border-border pt-3 text-xs">
                {/* First name + last initial — real attribution without
                    publishing surnames. Falls back to role-only if a
                    user only consented to a role label. */}
                {p.name ? (
                  <>
                    <div className="font-bold text-foreground">{p.name}</div>
                    <div className="mt-0.5 font-semibold text-muted-foreground">{p.role}</div>
                  </>
                ) : (
                  <div className="font-semibold text-muted-foreground">{p.role}</div>
                )}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

// ───────────────────────────────────────── Vs competitors (consolidated)
/**
 * Single "Why TrueCap" comparison matrix covering BOTH the spreadsheet
 * objection and the DealCheck / BiggerPockets objection. Previously
 * there were two separate tables back-to-back; design critique flagged
 * that as "two walls of we're better" fighting for the same attention.
 * Consolidated here:
 *   - Spreadsheet column: where it falls down (text annotations)
 *   - DealCheck / BiggerPockets columns: feature parity vs gaps
 *   - TrueCap column: branded, primary, highlighted
 *
 * Rows ordered by descending discriminator value — start with the
 * differences that matter most (free tier depth, address auto-fill),
 * end with the price/pricing line so the reader leaves with cost
 * context. The "highlight" flag bolds rows where TrueCap is uniquely
 * differentiated against ALL three alternatives.
 */
const COMPETITORS_HEADERS = ["", "TrueCap", "Spreadsheet", "DealCheck", "BiggerPockets"];
const COMPETITORS_ROWS: Array<{ label: string; values: (string | boolean)[]; highlight?: boolean }> = [
  { label: "Time to first answer",                        values: ["60 seconds", "2-4 hours", "5-10 min", "5-10 min"], highlight: true },
  { label: "Free tier",                                   values: [true, "DIY only", "Limited", true] },
  { label: "Sourced underwriting defaults (HUD rent · FRED rate · state tax)", values: [true, false, false, false], highlight: true },
  { label: "Cap rate · CoC · DSCR · cash flow",           values: [true, "If you built it", true, true] },
  { label: "10-year projection",                          values: ["Pro", "Manual, error-prone", true, false] },
  { label: "Tax strategy + depreciation",                 values: ["Pro", "Manual, error-prone", "Pro", false] },
  { label: "Sensitivity grid + MAO solver",               values: ["Pro", false, false, false], highlight: true },
  { label: "BRRRR + fix-and-flip + rehab estimator",      values: ["Pro", "Separate sheet", "Partial", "Separate calc"] },
  { label: "Mobile / at the showing",                     values: [true, false, "Desktop-leaning", "Desktop-leaning"], highlight: true },
  { label: "Share with lender",                           values: ["Pro · 1-click PDF + link", "Email the .xlsx", true, false] },
  { label: "Compare 4 deals side-by-side",                values: ["Pro", "Manual copy/paste", true, false] },
  // DealCheck pricing verified against dealcheck.io/pricing June 2026:
  // Starter $0, Plus $10/mo, Pro $20/mo. A previous version claimed
  // $35/mo — inflating a competitor's price in a table titled "honest,
  // side-by-side" is exactly the credibility hit we can't afford.
  { label: "Starting Pro price",                          values: ["From $16.67/mo", "—", "$20/mo", "—"] },
];

export function VsCompetitors() {
  return (
    <section className="border-t border-border bg-background">
      <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-20">
        <div className="mb-10 text-center sm:mb-12">
          <p className="text-[11px] font-bold uppercase tracking-widest text-primary">
            Why TrueCap
          </p>
          <h2 className="mt-2 text-balance text-2xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Honest, side-by-side. <span className="text-primary">No hand-waving.</span>
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Whether you&apos;re currently using a spreadsheet, DealCheck, or BiggerPockets&apos; calculator —
            here&apos;s the row-by-row truth on what each tool actually does well.
          </p>
        </div>
        {/* Mobile scroll affordance — the 4-column table overflows on phones
            (most ad traffic), and without a cue many visitors never scroll to
            the DealCheck / BiggerPockets columns and miss the comparison. */}
        <p className="mb-2 text-center text-xs font-medium text-muted-foreground sm:hidden">
          Swipe the table to compare all four →
        </p>
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
                      {/* Icon cells carry sr-only text so the table is
                          readable by screen readers AND by crawlers /
                          AI assistants. Without it, every check/cross
                          cell reads as empty — Google and LLMs answering
                          "best rental calculator" couldn't tell which
                          features each tool includes. */}
                      {v === true ? (
                        <>
                          <Check
                            aria-hidden
                            className={
                              ci === 0
                                ? "mx-auto size-4 text-[var(--metric-positive)]"
                                : "mx-auto size-4 text-muted-foreground/60"
                            }
                          />
                          <span className="sr-only">Included</span>
                        </>
                      ) : v === false ? (
                        <>
                          <X aria-hidden className="mx-auto size-4 text-muted-foreground/40" />
                          <span className="sr-only">Not included</span>
                        </>
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
        <p className="mx-auto mt-4 max-w-2xl text-center text-[11px] leading-relaxed text-muted-foreground">
          Feature and pricing rows reflect each tool&apos;s publicly listed
          information, last reviewed June 2026 — verify current details on each
          vendor&apos;s site. &ldquo;Sourced underwriting defaults&rdquo; means
          auto-filled HUD rent, the FRED 30-year rate, and state average property
          tax specifically; some competitors offer other property-data imports.
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
    a: "Yes. The cash-flow analyzer — cap rate, CoC, DSCR, monthly cash flow, address auto-fill, the 0–100 Deal Score, and a plain-English verdict — is free forever and unlimited. No card required. Pro adds save/compare deals, lender-ready PDFs, and the advanced modules (BRRRR + Fix-and-Flip, Sensitivity, 10-year projections, tax strategy, exit scenarios).",
  },
  {
    q: "Do I need a credit card?",
    a: "No. The free analyzer needs zero signup and zero card — type an address and go. You only create an account if you want to save deals or unlock Pro.",
  },
  {
    q: "How accurate is the auto-fill?",
    a: "Rent comes from HUD Fair Market Rent for the county, the mortgage rate from the current FRED 30-year fixed series, and property tax from your state's effective rate. These are sensible market defaults, not absolutes — every field is editable, so override anything with your own numbers.",
  },
  {
    q: "Can I edit the assumptions?",
    a: "Yes — every number is editable. TrueCap pre-fills rent, rate, tax, and expense defaults so you get an instant first pass, then you can change financing, expenses, and growth assumptions under “Improve accuracy” and rerun in a click.",
  },
  {
    q: "What do I get with the $5 PDF?",
    a: "A one-time, lender-ready PDF for a single deal — the full multi-page report (verdict, cash flow, cap rate, DSCR, 10-year projection, tax strategy, exit scenarios, and Deal Score). No account, no subscription. It's the fastest way to send one finished deal to a lender, partner, or client.",
  },
  {
    q: "When should I upgrade to Pro?",
    a: "Use Free to analyze unlimited deals. Use the $5 PDF when you need to send one finished report. Upgrade to Pro when you want to save deals, compare properties, reuse your assumptions, brand your reports, and export unlimited PDFs. Pro is month-to-month — cancel anytime.",
  },
  {
    q: "Does this work for BRRRR or fix-and-flip deals?",
    a: "Yes. Pro includes the BRRRR analyzer (cash-out refi math, post-refi cash flow, infinite-return alerts), the Fix-and-Flip analyzer (net profit, ROI, annualized ROI, break-even ARV), and the Rehab Cost Estimator (sq-ft-based defaults for every common work item).",
  },
  {
    q: "Is this financial advice?",
    a: "No. TrueCap surfaces the math you'd compute yourself — accurate formulas and market-data defaults — but every assumption is editable and the decision is yours. It's a calculator, not a financial advisor.",
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
              The questions every investor asks first.
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
            No card. No signup. Type the address, see if it cash-flows. The
            calculator is right below — give it 60 seconds.
          </p>

          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <ScrollToFormButton className="group inline-flex h-12 items-center gap-2 rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground shadow-[0_14px_32px_rgba(82,72,212,0.32)] hover:-translate-y-0.5 transition-transform sm:h-14 sm:text-base">
              <Zap className="size-4 sm:size-5" />
              Analyze a deal free
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5 sm:size-5" />
            </ScrollToFormButton>
            <Link
              href="/pricing"
              className="inline-flex h-12 items-center gap-1.5 rounded-xl border border-border bg-card px-5 text-sm font-semibold text-foreground hover:bg-muted sm:h-14 sm:text-base"
            >
              See Pro features
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
              60-second analysis
            </span>
            <span aria-hidden className="text-muted-foreground/40">·</span>
            <span className="inline-flex items-center gap-1.5">
              <Type className="size-4 text-muted-foreground" />
              Free forever
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

// ───────────────────────────────────────── Data sources / accuracy
/**
 * #6 — investors care deeply about where the numbers come from. This
 * section names the primary source behind each auto-filled field and
 * hammers the "everything is editable" point, so the auto-fill reads as
 * a credible starting baseline rather than a black box. Kept tight (3
 * cards) so it reinforces the hero's data-source line without repeating
 * the How-It-Works step.
 */
const DATA_SOURCES: { icon: typeof Home; label: string; source: string; body: string }[] = [
  {
    icon: Home,
    label: "Rent",
    source: "HUD Fair Market Rent",
    body: "Pulled for the property's county and bedroom count — a real market baseline, not a guess.",
  },
  {
    icon: Percent,
    label: "Mortgage rate",
    source: "FRED 30-year fixed",
    body: "The current national average rate, fetched automatically so your financing starts realistic.",
  },
  {
    icon: Building2,
    label: "Property tax",
    source: "State effective rate",
    body: "Your state's typical effective rate, applied to the purchase price you enter.",
  },
];

export function DataSourcesSection() {
  return (
    <section className="border-t border-border bg-background">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
        <div className="mb-10 text-center sm:mb-12">
          <p className="text-[11px] font-bold uppercase tracking-widest text-primary">Built on real data</p>
          <h2 className="mt-2 text-balance text-2xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Defensible numbers, <span className="text-primary">not guesses.</span>
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            TrueCap pre-fills every deal from primary sources, so you start from a real
            baseline — then change anything to match your own comps and terms.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-5">
          {DATA_SOURCES.map((s) => (
            <div key={s.label} className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <div className="mb-4 flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <s.icon className="size-5" />
              </div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{s.label}</p>
              <h3 className="mt-0.5 text-lg font-bold text-foreground">{s.source}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
            </div>
          ))}
        </div>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Every field is editable — these are sensible market defaults, not absolutes.
        </p>
      </div>
    </section>
  );
}

// ───────────────────────────────────────── PDF / Pro upsell
/**
 * #7 — a low-friction paid path for non-subscribers, surfaced AFTER the
 * calculator (i.e. after the visitor has felt the value). The $5 one-time
 * PDF is a real, fully-automated product (see app/actions/one-time-pdf.ts);
 * we deliberately do NOT hardcode the Pro monthly price here — it's loaded
 * live from Stripe on /pricing, and duplicating it risks drift.
 */
// Honest value ladder — what each path actually unlocks. Mirrors the
// entitlements bag (lib/entitlements.ts) + the $5 one-time PDF product.
// Pro's monthly price is deliberately NOT printed here (it's loaded live
// from Stripe on /pricing); the Pro card below links out so the two can
// never drift. "true" → included, "false" → not, string → a qualifier.
const LADDER_HEADERS = ["Free", "$5 PDF", "Pro"] as const;
const LADDER_SUBHEADERS = ["Free forever", "One-time", "Subscription"] as const;
const LADDER_ROWS: { label: string; cells: (boolean | string)[] }[] = [
  { label: "Analyze unlimited deals", cells: [true, true, true] },
  { label: "Cap rate · CoC · DSCR · cash flow", cells: [true, true, true] },
  { label: "0–100 Deal Score + plain-English verdict", cells: [true, true, true] },
  { label: "Lender-ready PDF export", cells: [false, "One deal", "Unlimited"] },
  { label: "Save & revisit deals", cells: [false, false, true] },
  { label: "Compare deals side-by-side", cells: [false, false, true] },
  { label: "10-year projections · tax · exit", cells: [false, false, true] },
  { label: "BRRRR · fix & flip · sensitivity", cells: [false, false, true] },
];

export function PdfProUpsell() {
  return (
    <section className="border-t border-border bg-card/40">
      <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6 sm:py-20">
        <div className="mb-8 text-center sm:mb-10">
          <p className="text-[11px] font-bold uppercase tracking-widest text-primary">What you get</p>
          <h2 className="mt-2 text-balance text-2xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Free to analyze. <span className="text-primary">$5</span> to send one.{" "}
            <span className="text-primary">Pro</span> to do it all.
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-balance text-sm leading-relaxed text-muted-foreground sm:text-base">
            The cash-flow analyzer is free and unlimited. Pay $5 once to send a single
            lender-ready PDF, or go Pro to save, compare, and export every deal.
          </p>
        </div>

        {/* Value ladder — answers "what exactly do I get free?" at a glance,
            so the visitor isn't guessing where the line is. */}
        <p className="mb-2 text-center text-xs font-medium text-muted-foreground sm:hidden">
          Swipe to compare all three →
        </p>
        <div className="mb-8 overflow-x-auto rounded-2xl border border-border bg-card shadow-sm sm:mb-10">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-3 text-left font-bold text-muted-foreground sm:px-6">
                  <span className="sr-only">Feature</span>
                </th>
                {LADDER_HEADERS.map((h, i) => (
                  <th
                    key={h}
                    className={
                      i === 2
                        ? "px-4 py-3 text-center font-extrabold text-primary sm:px-6"
                        : "px-4 py-3 text-center font-bold text-foreground sm:px-6"
                    }
                  >
                    {h}
                    <span className="mt-0.5 block text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                      {LADDER_SUBHEADERS[i]}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {LADDER_ROWS.map((row, ri) => (
                <tr key={row.label} className={ri % 2 === 0 ? "bg-card" : "bg-muted/20"}>
                  <td className="px-4 py-3 font-medium text-foreground sm:px-6">{row.label}</td>
                  {row.cells.map((cell, ci) => (
                    <td key={`${row.label}-${ci}`} className="px-4 py-3 text-center sm:px-6">
                      {/* sr-only labels so the matrix is legible to screen
                          readers / crawlers, not a wall of blank cells. */}
                      {cell === true ? (
                        <>
                          <Check
                            aria-hidden
                            className={
                              ci === 2
                                ? "mx-auto size-4 text-[var(--metric-positive)]"
                                : "mx-auto size-4 text-[var(--metric-positive)]/80"
                            }
                          />
                          <span className="sr-only">Included</span>
                        </>
                      ) : cell === false ? (
                        <>
                          <X aria-hidden className="mx-auto size-4 text-muted-foreground/40" />
                          <span className="sr-only">Not included</span>
                        </>
                      ) : (
                        <span
                          className={
                            ci === 2
                              ? "text-xs font-semibold text-primary"
                              : "text-xs font-medium text-foreground"
                          }
                        >
                          {cell}
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 sm:gap-5">
          {/* One-time $5 PDF */}
          <div className="flex flex-col rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="mb-4 flex size-11 items-center justify-center rounded-xl bg-[var(--brand-green)]/10 text-[var(--brand-green)]">
              <FileText className="size-5" />
            </div>
            <span className="w-fit rounded-full bg-[var(--brand-green)]/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-[var(--brand-green)]">
              One-time · $5
            </span>
            <h3 className="mt-2 text-lg font-bold text-foreground">Lender-ready PDF</h3>
            <p className="mt-1.5 flex-1 text-sm leading-relaxed text-muted-foreground">
              Need to send the numbers to a lender or client? Run your deal,
              click Export PDF, and pay $5 once — one polished, multi-page
              report, downloaded instantly. No subscription, no account.
            </p>
            <div className="mt-5">
              <ScrollToFormButton className="group inline-flex h-11 items-center gap-1.5 rounded-xl border border-border bg-background px-5 text-sm font-bold text-foreground hover:bg-muted">
                Run a deal → export PDF
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </ScrollToFormButton>
            </div>
          </div>

          {/* Pro */}
          <div className="flex flex-col rounded-2xl border-2 border-primary/30 bg-card p-6 shadow-[0_16px_40px_rgba(82,72,212,0.10)]">
            <div className="mb-4 flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Sparkles className="size-5" />
            </div>
            <span className="w-fit rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-primary">
              Pro
            </span>
            <h3 className="mt-2 text-lg font-bold text-foreground">Save, compare &amp; export every deal</h3>
            <p className="mt-1.5 flex-1 text-sm leading-relaxed text-muted-foreground">
              For repeat underwriting: save and revisit deals, compare them
              side-by-side, reuse your assumptions, brand your reports, and
              export unlimited PDFs — plus 10-year projections, tax strategy,
              and exit scenarios.
            </p>
            <div className="mt-5">
              <Link
                href="/pricing"
                className="group inline-flex h-11 items-center gap-1.5 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground shadow-[0_10px_24px_rgba(82,72,212,0.28)] hover:-translate-y-0.5 transition-transform"
              >
                See Pro features
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ───────────────────────────────────────── Personas
/**
 * #9 — the homepage leads with ONE universal action (analyze a rental).
 * Persona cards live LOWER, after intent is captured, so they help a
 * visitor self-identify without diluting the single above-the-fold CTA.
 */
const PERSONAS: { icon: typeof Home; title: string; body: string }[] = [
  {
    icon: TrendingUp,
    title: "For investors",
    body: "Underwrite buy-and-hold deals in seconds — cash flow, cap rate, CoC, DSCR, and a 10-year view.",
  },
  {
    icon: Users,
    title: "For agents",
    body: "Hand clients a defensible analysis at the showing, with a shareable link or lender-ready PDF.",
  },
  {
    icon: Home,
    title: "For house hackers",
    body: "Model owner-occupied units and see what's left of your mortgage payment after rent.",
  },
];

export function Personas() {
  return (
    <section className="border-t border-border bg-background">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
        <div className="mb-10 text-center sm:mb-12">
          <p className="text-[11px] font-bold uppercase tracking-widest text-primary">Who it&apos;s for</p>
          <h2 className="mt-2 text-balance text-2xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            One tool, whatever you&apos;re underwriting.
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-5">
          {PERSONAS.map((p) => (
            <div key={p.title} className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <div className="mb-4 flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <p.icon className="size-5" />
              </div>
              <h3 className="text-lg font-bold text-foreground">{p.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{p.body}</p>
            </div>
          ))}
        </div>
        <div className="mt-10 text-center">
          <ScrollToFormButton className="group inline-flex h-11 items-center gap-1.5 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground shadow-[0_10px_24px_rgba(82,72,212,0.28)] hover:-translate-y-0.5 transition-transform">
            Analyze a deal free
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </ScrollToFormButton>
        </div>
      </div>
    </section>
  );
}
