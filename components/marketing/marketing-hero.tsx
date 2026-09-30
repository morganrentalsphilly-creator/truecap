/**
 * The homepage hero for cold visitors: the sample deal's Verdict Ledger is the
 * visual (DESIGN.md "The ledger as the hero"; direction contract in
 * .impeccable/surfaces/app-page-tsx.md).
 *
 * Desktop: a 5/7 grid from 1024px, headline and the address form on the
 * left, the ledger in the wider column. The display size eases between 900
 * and 1280px (--text-display) so the headline keeps to four lines and the
 * investor cue stays in the first screen of a 1095x760 window. Phones: one
 * column in reading order, so the investor cue sits above the fold at 390px
 * and the ledger starts under it.
 *
 * SERVER COMPONENT. The ledger is set from the engine's own sample-deal output
 * at build time (lib/sample-deal-ledger.ts) and ships as HTML: no screenshot,
 * no client JS. The only client island is <HeroAddressForm />.
 */

import Link from "next/link";
import { HeroAddressForm } from "@/components/marketing/hero-address-form";
import { VerdictLedger } from "@/components/ledger/verdict-ledger";
import { LedgerFigure, LedgerVerdict } from "@/components/ledger/ledger-parts";
import { PAGE_CONTAINER } from "@/components/marketing/section";
import { getMarketingOfferConfig } from "@/lib/marketing-offer-config";
import { buildSampleDealLedger, formatLedgerDollars } from "@/lib/sample-deal-ledger";
import { cn } from "@/lib/utils";

/** The walkthrough section's anchor (HowTrueCapWorks in landing-sections). */
export const HOMEPAGE_WALKTHROUGH_ID = "how-it-works";

export function MarketingHero() {
  const { homepageHeadline, newHomepagePositioningEnabled } =
    getMarketingOfferConfig();
  const ledger = buildSampleDealLedger();
  return (
    // data-page-hero: this bottom rule is the one rule under the hero; the
    // walkthrough Section after it drops its own (components/marketing/section.tsx).
    <section data-page-hero="" className="truecap-marketing-shell border-b border-border bg-background">
      <div
        className={cn(
          PAGE_CONTAINER,
          "grid grid-cols-[minmax(0,1fr)] gap-x-12 gap-y-10 pb-12 pt-4 sm:pb-16 sm:pt-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start lg:pb-18 lg:pt-8 xl:gap-x-16 xl:pt-14",
        )}
      >
        <div className="min-w-0">
          {/* break-words + hyphens-auto: at zoom-sensitive widths (a 195px
              column) a ten-letter word like "forwarding" is wider than the
              line; the browser may then break or hyphenate it rather than
              overflow (e2e/public-product.spec.ts "reading order"). No effect
              at any width where the words fit. */}
          <h1 className="font-display hyphens-auto break-words text-balance text-display-sm text-foreground lg:text-display">
            {homepageHeadline}
          </h1>
          <p className="mt-4 max-w-[46ch] text-pretty text-lg leading-normal text-foreground sm:mt-5">
            {newHomepagePositioningEnabled
              ? "Paste the rental listing. In about 60 seconds, see whether it clears your client's Buy Box, the highest price that still does (the Offer Ceiling), and what could break the deal. Send it co-branded."
              : "Enter an address for a first-pass screen with labeled, editable assumptions. Pro adds the Offer Ceiling: the highest price that still meets your targets."}
          </p>
          {/* Phones only: the ledger's verdict in one sentence, before the
              form, so a phone's first screen shows the answer and not only the
              claim (the full ledger starts under the fold there). Set from the
              same engine output as the ledger. It takes the metrics strip's
              place below 640px, which keeps the investor cue above the fold
              with the cookie banner up. */}
          {ledger ? (
            <p data-hero-verdict-line="" className="mt-3 text-base leading-snug sm:hidden">
              Sample deal. Meets the Buy Box:{" "}
              <LedgerVerdict pass={ledger.meetsTargets.asking}>
                {ledger.meetsTargets.asking ? "yes" : "no"}
              </LedgerVerdict>{" "}
              at <LedgerFigure>{formatLedgerDollars(ledger.askingPrice)}</LedgerFigure> asking,{" "}
              <LedgerVerdict pass={ledger.meetsTargets.ceiling}>
                {ledger.meetsTargets.ceiling ? "yes" : "no"}
              </LedgerVerdict>{" "}
              at the <LedgerFigure>{formatLedgerDollars(ledger.offerCeiling)}</LedgerFigure> Offer Ceiling.
            </p>
          ) : null}
          {/* The math supports the decision; it is not the headline. */}
          {newHomepagePositioningEnabled ? (
            <p
              data-hero-supporting-metrics=""
              className={cn(
                "mt-2 text-sm font-medium text-muted-foreground",
                ledger && "hidden sm:block",
              )}
            >
              Cash flow · Cap rate · Cash-on-cash return · DSCR · Editable
              assumptions
            </p>
          ) : null}

          {/* The one primary action; its secondary is the sample-deal link. */}
          <HeroAddressForm />

          {/* The full risk reversal stays next to the primary action at every
              viewport: paid mobile traffic must not have to infer account or
              card requirements. */}
          <p className="text-sm text-muted-foreground">
            Free. No account. Your first full decision is included.
          </p>
          {/* The investor cue (2026-09 agent-first pass): the hero addresses
              the agent, so the investor buying for their own portfolio gets
              one unmissable line in the first screen, on desktop and at
              390px, pointing at the investor hub. */}
          <p
            data-hero-investor-cue=""
            className="mt-4 border-t border-rule-soft pt-2.5 text-base"
          >
            Buying for your own portfolio? Same analyzer, your own Buy Box.{" "}
            {/* A 44px tap target from padding that the negative margin takes
                back out of the line box, so the cue keeps its body leading. */}
            <Link href="/for-investors" className="tc-link -my-3 inline-block py-3">
              For investors
            </Link>
          </p>
        </div>

        {ledger ? (
          <div className="min-w-0 lg:pt-1.5">
            <VerdictLedger ledger={ledger} walkthroughHref={`#${HOMEPAGE_WALKTHROUGH_ID}`} />
          </div>
        ) : null}
      </div>
    </section>
  );
}
