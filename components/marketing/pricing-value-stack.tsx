/**
 * Pricing value stack — the paid tiers presented as outcomes, not features.
 *
 * Sits ABOVE the feature-comparison table on /pricing (2026-08 offer
 * rollout): the stack sells repeatable underwriting, the table below stays as
 * the exhaustive reference. Every line here must stay truthful against
 * lib/entitlements-catalog.ts — outcome phrasing is fine, invented dollar
 * anchors and unverifiable claims are not (trust-language-guards.test.ts).
 *
 * Set as its own section on ruled rows (DESIGN.md "Chrome": no card around a
 * list, no icon tiles, no eyebrow above the heading).
 *
 * Server component: no state, renders from props resolved by the page.
 */

import Link from "next/link";
import { RuledList } from "@/components/marketing/page-parts";
import { Section, SectionHeading } from "@/components/marketing/section";

const PRO_STACK = [
  ["Offer Ceiling", "The highest price that still meets your targets."],
  ["Downside stress test", "See the deal at higher vacancy, higher rates, and lower rent — before the bank does."],
  ["Buy Box screening", "Your targets screen every deal automatically — pass or miss, with reasons."],
  ["10-year wealth view", "Modeled cash flow and equity across a decade of ownership."],
  ["Comparison + pipeline", "Every candidate ranked side by side, and nothing slips between research and offer."],
  ["Lender-facing review reports", "Bring a transparent input summary for your lender to review."],
  // custom_branding is a Pro feature (lib/entitlements-catalog.ts), not an
  // Agent Pro exclusive — an earlier version of this stack sold it under
  // "Agent Pro adds", which the catalog does not support.
  ["Co-branded share pages + PDFs", "Your logo, brand color, and contact details on what you send; TrueCap's methodology stays named."],
] as const;

const AGENT_PRO_STACK = [
  ["Client rosters", "Up to 100 clients, each with a Buy Box assigned to them and deals screened against it."],
  ["Client-report share links", "Open without an account, address hidden unless you include it, and a miss names the criterion."],
] as const;

export function PricingValueStack({
  agentProConfigured,
}: {
  agentProConfigured: boolean;
}) {
  return (
    <Section aria-labelledby="pricing-value-title">
      <SectionHeading id="pricing-value-title" className="max-w-3xl">
        Repeatable underwriting, not another spreadsheet.
      </SectionHeading>
      <RuledList
        className="mt-8"
        columns={2}
        items={PRO_STACK.map(([name, outcome]) => ({ key: name, term: name, detail: outcome }))}
      />
      {agentProConfigured ? (
        <>
          <h3 className="font-display mt-12 text-h3-sm sm:text-2xl">Agent Pro adds</h3>
          <RuledList
            className="mt-4"
            columns={2}
            items={AGENT_PRO_STACK.map(([name, outcome]) => ({ key: name, term: name, detail: outcome }))}
          />
          {/* /for-agents is the only page that lays out client rosters,
              per-client Buy Boxes, deal assignment and co-branded delivery —
              and it had no inbound link from anywhere on the site. This
              section is where someone is actually weighing $59.99 against
              $29.99, so it is where the fuller argument has to be reachable. */}
          <Link href="/for-agents" className="tc-link mt-4 inline-flex min-h-11 items-center">
            See how agents use it
          </Link>
        </>
      ) : null}
    </Section>
  );
}
