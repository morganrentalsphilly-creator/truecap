/**
 * /embed — the hub page where real estate bloggers, agents, and
 * content creators grab copy-paste code to embed TrueCap calculators
 * on their own sites.
 *
 * Each embed = a permanent backlink + brand exposure + occasional
 * conversion of their visitors into TrueCap users. Distribution is
 * passive after launch: list the page, email a few partners, then
 * the embed code spreads on its own.
 *
 * This page is on TrueCap proper (not the iframe), so it gets the
 * normal SiteFooter + nav.
 *
 * Layout (DESIGN.md, 2026-09 design pass): PageHero with the four facts as
 * a ruled strip and the steps as a StepList in its wider column (the
 * homepage's 5/7 grid from 1024px), each calculator as a ruled row (not a
 * card) holding its printed code block, the questions through FaqSection on
 * the same 5/7 grid, and the close on the heavy rule.
 */

import type { ReactNode } from "react";
import type { Metadata } from "next";
import Link from "next/link";
// Internal links other than a first-screen primary action prefetch on hover
// or keyboard focus, not as they scroll into view; /analyze links stay
// next/link with prefetch={false} (lib/__tests__/intent-prefetch-shared.test.ts).
import { IntentPrefetchLink } from "@/components/marketing/intent-prefetch-link";
import { isAgentProConfigured } from "@/lib/stripe/plan-prices";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SiteFooter } from "@/components/marketing/site-footer";
import { FaqSection } from "@/components/marketing/landing-sections";
import {
  ActionRow,
  CloseSection,
  PageHero,
  StepList,
} from "@/components/marketing/page-parts";
import { Section, SectionHeading } from "@/components/marketing/section";
import { buttonVariants } from "@/components/ui/button";
import { EmbedCodeBlock } from "@/components/embed/embed-code-block";
import { EMBED_LIST } from "@/lib/embed-registry";
import {
  CALCULATOR_COUNT,
  CALCULATOR_REGISTRY,
  EMBEDDABLE_COUNT,
} from "@/lib/calculator-registry";
import { CANONICAL_HOST, CANONICAL_SITE_URL, getSiteUrl } from "@/lib/site-url";
import { Header } from "@/components/investcalc/header";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Embed TrueCap Calculators on Your Site (Free)",
  description: `Embed ${EMBEDDABLE_COUNT} of TrueCap's free real estate calculators on your blog, agent website, or course platform. Copy-paste iframe code. Auto-resizing. Free to use.`,
  alternates: { canonical: "/embed" },
  openGraph: {
    title: "Embed free real estate calculators — TrueCap",
    description: `${EMBEDDABLE_COUNT} free embeddable calculators for real estate blogs, agent sites, and educational platforms.`,
    url: "/embed",
    type: "website",
    images: [
      {
        url: "/home.jpg",
        width: 1200,
        height: 630,
        alt: "TrueCap embeddable calculators",
      },
    ],
  },
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
};

/** Released calculators with no iframe widget, named from the registry so the
 *  hub never claims a different split than the one it renders. */
const PAGE_ONLY_CALCULATORS = CALCULATOR_REGISTRY.filter((c) => !c.embeddable);

function joinTitles(titles: string[]): string {
  if (titles.length <= 2) return titles.join(" and ");
  return `${titles.slice(0, -1).join(", ")}, and ${titles[titles.length - 1]}`;
}

/** The hub's questions, verbatim. FaqSection renders them as ruled details
 *  rows and emits the one FAQPage node that mirrors them. */
const EMBED_FAQS: { q: string; a: string }[] = [
  {
    q: "Can I customize the calculator's look?",
    a: "No. Inside the frame the calculator uses TrueCap's own styling, and the embed has no color, font, or branding settings. On your page, the snippet's inline styles only lay out the frame (full width up to 640px, a starting height that then adjusts to the calculator, no border, on its own line) and set the small gray text of the credit line under it.",
  },
  {
    q: "Do I have to keep the 'Powered by TrueCap' credit?",
    a: "The credit inside the calculator's footer is part of the embedded page, so it always shows. The snippet also puts a one-line 'Powered by TrueCap' credit under the frame, linking to that calculator's page on TrueCap. Keeping that line is the one thing we ask in return for a free, hosted calculator.",
  },
  {
    q: "How does the embed affect page loading?",
    a: 'The iframe uses loading="lazy" and renders in its own document, which limits initial work in supporting browsers. Actual performance depends on the host page, browser, placement, and content-security settings, so measure the published page.',
  },
  {
    q: "Can I track conversions from my embed?",
    a: "Not through TrueCap: there are no per-site reports. Snippets copied from this page load the frame with no referrer, so loading the calculator does not tell TrueCap which page it sits on. The 'Underwrite a full property in TrueCap' link inside the calculator carries utm_source=embed, utm_medium=referral, and a calculator-specific utm_campaign, so TrueCap can count embed traffic in aggregate. No link carries your site's identity or anything a visitor enters.",
  },
  {
    q: "What if the calculator changes?",
    a: "The iframe loads the currently released TrueCap implementation, so reviewed updates appear without replacing the snippet. Snippets for the calculators listed on this page keep working. If we withdraw a calculator, a frame that still points at it shows TrueCap's 'page not found' page instead. Keep the credit line intact and check the embed as part of your own site checks.",
  },
];

/** One cell of the facts strip: two cells a row on phones, four from 640px,
 *  and two again from 1024px, where the strip sits in the hero's 5/12
 *  column. The dl's top Rule opens the strip; soft rules run between rows
 *  and between columns (DESIGN.md: "Soft rule between rows"). From 640px the
 *  last row drops its soft rule and the dl's own bottom Rule closes the
 *  strip; from 1024px the first row keeps a soft rule under it, and the
 *  left-hand cells (odd) lose their column rule. */
const FACT_CELL =
  "min-w-0 border-b border-rule-soft py-3 pr-4 even:border-l even:pl-4 sm:border-b-0 sm:border-l sm:pl-4 sm:first:border-l-0 sm:first:pl-0 lg:nth-[-n+2]:border-b lg:odd:border-l-0 lg:odd:pl-0";

/** A display title with each hyphenated compound held on one line, so a
 *  heading line never ends on "(After-". The spans only stop the break: the
 *  text itself is the registry title, byte for byte, so the h3 (and the
 *  Preview link that is described by it) reads exactly as before. */
function holdCompounds(title: string): ReactNode {
  return title.split(/(\S+-\S+)/).map((part, index) =>
    index % 2 === 1 ? (
      <span key={index} className="whitespace-nowrap">
        {part}
      </span>
    ) : (
      part
    ),
  );
}

export default function EmbedHubPage() {
  const agentProConfigured = isAgentProConfigured();
  const siteUrl = getSiteUrl();
  // A partner pastes a snippet once and never updates it, so the hub must
  // never hand out an iframe src on a non-canonical origin (a stale-env build
  // once emitted truecap-pink.vercel.app here). Same rule as ToolEmbedInvite:
  // the exact canonical host or no snippet at all.
  let snippetHost: string | null = null;
  try {
    snippetHost = new URL(siteUrl).host.toLowerCase();
  } catch {
    snippetHost = null;
  }
  const snippetsAvailable = snippetHost === CANONICAL_HOST;

  return (
    // relative + overflow-x-clip, as on the homepage: no descendant (a long
    // snippet line included) can make the phone page scroll sideways.
    <div className="relative overflow-x-clip">
      <Header initialUser={null} initialEntitlements={null} />
      <main id="main" tabIndex={-1} className="min-w-0 outline-none">
        <PageHero
          // In the hero's 5/12 column from 1024px "Embed our calculators" is
          // wider than the line (about 417px at 1095 against 396px), and the
          // H1's hyphens-auto may then split "calculators" to keep two lines.
          // Manual hyphens here, so it wraps to three whole-word lines. The
          // text is unchanged.
          title={<span className="hyphens-manual">Embed our calculators on your site</span>}
          lede={
            <p>
              Real estate bloggers, agents, course creators, and finance writers:
              grab the iframe code below and put any of our {EMBEDDABLE_COUNT}{" "}
              embeddable calculators on your site
              {PAGE_ONLY_CALCULATORS.length > 0 ? (
                <>
                  {" "}— {EMBEDDABLE_COUNT} of our {CALCULATOR_COUNT} free
                  calculators (the{" "}
                  {joinTitles(PAGE_ONLY_CALCULATORS.map((c) => c.title))}{" "}
                  {PAGE_ONLY_CALCULATORS.length === 1 ? "runs" : "run"} on
                  TrueCap only)
                </>
              ) : null}
              . Free to use, no signup. Each one shows a small &ldquo;Powered by
              TrueCap&rdquo; credit that links to that calculator&apos;s page on
              TrueCap, so you get a free calculator and we get a link back.
            </p>
          }
          aside={
            // Quick-start instructions: a real sequence (pick, copy, paste,
            // save), so numbered. They sit in the hero's wider column from
            // 1024px (the homepage ledger's slot), so the procedure is on
            // the first screen and the calculator list starts a section
            // sooner; on phones they follow the facts strip.
            <section aria-labelledby="how-to-embed-heading">
              <SectionHeading id="how-to-embed-heading">How to embed</SectionHeading>
              <StepList
                className="mt-8"
                steps={[
                  "Pick the calculator below that fits your post or page.",
                  'Click "Copy" on the embed code.',
                  "Paste the HTML into a custom-code or embed block in a CMS that permits third-party iframes. Platform and security settings vary, so preview the published page before relying on it.",
                  "Save. The calculator renders on your page with auto-sized height.",
                ]}
              />
            </section>
          }
        >
          {/* The four facts as one ruled strip, FRED's metadata grammar: the
              fact at 600, its detail under it in Ink 2, hairline column
              rules, closed by its own Rule from 640px. Each count stays in
              one text run with its word. */}
          <dl className="mt-8 grid grid-cols-2 border-t border-border sm:grid-cols-4 sm:border-b lg:grid-cols-2">
            <div className={FACT_CELL}>
              <dt className="text-base font-semibold">
                {EMBEDDABLE_COUNT} embeddable
              </dt>
              <dd className="mt-0.5 text-sm text-muted-foreground">
                Of {CALCULATOR_COUNT} TrueCap calculators
              </dd>
            </div>
            <div className={FACT_CELL}>
              <dt className="text-base font-semibold">Auto-resizing</dt>
              <dd className="mt-0.5 text-sm text-muted-foreground">
                No nested scrollbars on your page
              </dd>
            </div>
            <div className={FACT_CELL}>
              <dt className="text-base font-semibold">Mobile-friendly</dt>
              <dd className="mt-0.5 text-sm text-muted-foreground">
                Fills your content column, up to 640px wide
              </dd>
            </div>
            <div className={FACT_CELL}>
              <dt className="text-base font-semibold">No account needed</dt>
              <dd className="mt-0.5 text-sm text-muted-foreground">
                No API key or signup for the published embeds
              </dd>
            </div>
          </dl>
        </PageHero>

        {/* The calculators: ruled rows opened by the heavy rule, two columns
            from 1024px. The hero's bottom rule opens the section, so it
            draws no rule of its own (two adjacent rules read as one heavy
            one). Each row is ruled from the top (the first row, and the
            second from 1024px, sit on the heavy rule) and the grid's own
            Rule closes the table, so an odd last row still ends on a rule
            across the full width. minmax(0,1fr) and min-w-0 let a
            snippet's long lines scroll inside its code block instead of
            widening the page. */}
        <Section rule="none" aria-labelledby="pick-heading">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
            <SectionHeading id="pick-heading">Pick a calculator</SectionHeading>
            <p className="text-base text-muted-foreground">
              {EMBEDDABLE_COUNT} available
            </p>
          </div>
          {/* Off the canonical host there is no snippet to hand out; say so
              once for the list, not once per calculator. */}
          {snippetsAvailable ? null : (
            <p className="mt-4 max-w-[68ch] text-pretty text-base text-muted-foreground">
              Embed code is issued from{" "}
              <a href={`${CANONICAL_SITE_URL}/embed`} className="tc-link">
                {CANONICAL_HOST}/embed
              </a>{" "}
              so partner snippets always point at the live site.
            </p>
          )}

          <div className="mt-8 grid grid-cols-[minmax(0,1fr)] gap-x-12 border-b border-t-2 border-b-border border-t-foreground lg:grid-cols-2">
            {EMBED_LIST.map((entry) => (
              <article
                key={entry.slug}
                aria-labelledby={`embed-${entry.slug}-title`}
                className="min-w-0 border-t border-border py-6 first:border-t-0 lg:nth-2:border-t-0"
              >
                <div className="flex items-baseline justify-between gap-4">
                  <h3
                    id={`embed-${entry.slug}-title`}
                    className="font-display text-balance text-h3-sm text-foreground sm:text-2xl"
                  >
                    {holdCompounds(entry.title)}
                  </h3>
                  {/* Nine links share the name "Preview"; the title tells
                      them apart without changing the label. */}
                  <IntentPrefetchLink
                    href={entry.toolUrl}
                    aria-describedby={`embed-${entry.slug}-title`}
                    className="tc-link inline-flex min-h-11 shrink-0 items-center text-base"
                  >
                    Preview
                  </IntentPrefetchLink>
                </div>
                <p
                  className={cn(
                    "mt-2 max-w-[62ch] text-pretty text-base leading-relaxed text-muted-foreground",
                    snippetsAvailable && "mb-5",
                  )}
                >
                  {entry.description}
                </p>
                {snippetsAvailable ? (
                  <EmbedCodeBlock
                    slug={entry.slug}
                    title={entry.title}
                    siteUrl={siteUrl}
                    defaultHeight={entry.defaultHeight}
                  />
                ) : null}
              </article>
            ))}
          </div>
          {/* Answers "not in this list", so it follows the list. */}
          <p className="mt-6 max-w-[68ch] text-pretty text-base text-muted-foreground">
            Want a calculator we don&apos;t have here?{" "}
            <a
              href="mailto:hello@usetruecap.com?subject=Embed%20request"
              className="tc-link -my-3 inline-block py-3"
            >
              Send us a note
            </a>{" "}
            — we&apos;ll consider adding it.
          </p>
        </Section>

        {/* Agents (2026-09 agent-first pass): a working calculator on an
            agent site is a credibility piece, not a lead machine — the FAQ
            below is explicit that there is no per-site tracking or lead
            capture, and that stays true. */}
        <Section rhythm="tight" aria-labelledby="agents-heading">
          <div className="max-w-[68ch]">
            <SectionHeading id="agents-heading">
              For agents who work with investors
            </SectionHeading>
            <p className="mt-4 text-pretty text-lg leading-relaxed text-muted-foreground">
              A calculator on your own site shows investor visitors you speak
              their language before they ever call. It is a credibility piece:
              the embed collects nothing and reports nothing back to you, so use
              it beside your contact details, not instead of them. When a client
              is real, run their deals against their own Buy Box with{" "}
              {agentProConfigured ? (
                <IntentPrefetchLink href="/for-agents" className="tc-link">
                  TrueCap for agents
                </IntentPrefetchLink>
              ) : (
                <IntentPrefetchLink href="/pricing#plans" className="tc-link">
                  Agent Pro
                </IntentPrefetchLink>
              )}
              .
            </p>
          </div>
        </Section>

        {/* The page's one FAQPage node comes from FaqSection and mirrors
            these rows exactly. The hub already offers a mailto above, so the
            shared contact line is left off. layout="split": the heading
            beside the ruled rows from 1024px, as on the homepage, /pricing
            and /for-agents, so the rows run to the calculator grid's edge. */}
        <FaqSection
          id="questions"
          heading="Questions"
          items={EMBED_FAQS}
          contact={null}
          layout="split"
          // The hub never carried FAQPage markup; the restyle keeps its
          // structured data as it was (a new rich-result claim is an SEO
          // decision, not a design one).
          structuredData={false}
        />

        {/* "real estate" held on one line: in the 5/12 cell at 1095px the
            balanced break otherwise splits the compound. */}
        <CloseSection
          heading={
            <>
              Have a <span className="whitespace-nowrap">real estate</span> audience?
            </>
          }
          headingId="embed-close-heading"
          lede="Embed a calculator and write a short post around it. Your readers get a working tool without leaving your page, and we get a credit link back."
          actions={
            <ActionRow>
              <Link
                href="/analyze?from=embed-hub-cta"
                prefetch={false}
                className={buttonVariants({ size: "cta" })}
              >
                Try the full TrueCap analyzer
              </Link>
            </ActionRow>
          }
        />
      </main>
      <SiteFooter />
      <ScrollDepthTracker />
    </div>
  );
}
