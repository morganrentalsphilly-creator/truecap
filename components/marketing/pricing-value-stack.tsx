/**
 * Pricing value stack — the paid tiers presented as outcomes, not features.
 *
 * Sits ABOVE the feature-comparison table on /pricing (2026-08 offer
 * rollout): the stack sells the decision system, the table below stays as
 * the exhaustive reference. Every line here must stay truthful against
 * lib/entitlements-catalog.ts — outcome phrasing is fine, invented dollar
 * anchors and unverifiable claims are not (trust-language-guards.test.ts).
 *
 * Server component: no state, renders from props resolved by the page.
 */

import { Target, Activity, ShieldCheck, BarChart3, GitCompareArrows, FileText, Users, Handshake } from "lucide-react";

const PRO_STACK = [
  [Target, "Max Offer Engine", "The exact highest price that still hits your targets — your walk-away line, computed on every deal."],
  [Activity, "Downside Stress Test", "See the deal at higher vacancy, higher rates, and lower rent — before the bank does."],
  [ShieldCheck, "Buy Box Autopilot", "Your criteria screen every deal automatically — instant pass/fail, with reasons."],
  [BarChart3, "10-Year Wealth View", "Cash flow, equity, and illustrative tax impact across a decade of ownership."],
  [GitCompareArrows, "Comparison + Pipeline", "Every candidate ranked side by side, and nothing slips between research and offer."],
  [FileText, "Lender-Ready Reports", "Walk into the bank with an underwrite, not a hunch."],
] as const;

const AGENT_PRO_STACK = [
  [Users, "Client Rosters", "Up to 100 clients, each screened against their own Buy Box."],
  [Handshake, "Co-Branded Reports", "Every analysis you send carries your name — and comes back to you."],
] as const;

export function PricingValueStack({
  proOfferName,
  agentProConfigured,
}: {
  proOfferName: string;
  agentProConfigured: boolean;
}) {
  return (
    <div className="mx-auto mb-10 max-w-3xl">
      <div className="rounded-3xl border-2 border-primary/25 bg-gradient-to-br from-[var(--brand-blue-light)] via-card to-card p-6 shadow-[0_12px_36px_rgba(0,112,196,0.10)] sm:p-8">
        <p className="text-[11px] font-bold uppercase tracking-widest text-primary">
          What {proOfferName} actually buys
        </p>
        <h3 className="mt-1 text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
          A decision system, not a feature list.
        </h3>
        <ul className="mt-5 space-y-4">
          {PRO_STACK.map(([Icon, name, outcome]) => (
            <li key={name} className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-blue-light)] text-primary">
                <Icon aria-hidden className="size-4" />
              </span>
              <p className="text-sm leading-relaxed">
                <strong className="font-bold text-foreground">{name}</strong>
                <span className="text-muted-foreground"> — {outcome}</span>
              </p>
            </li>
          ))}
        </ul>
        {agentProConfigured ? (
          <>
            <p className="mt-6 text-[11px] font-bold uppercase tracking-widest text-primary">
              Agent Pro adds
            </p>
            <ul className="mt-3 space-y-4">
              {AGENT_PRO_STACK.map(([Icon, name, outcome]) => (
                <li key={name} className="flex items-start gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon aria-hidden className="size-4" />
                  </span>
                  <p className="text-sm leading-relaxed">
                    <strong className="font-bold text-foreground">{name}</strong>
                    <span className="text-muted-foreground"> — {outcome}</span>
                  </p>
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </div>
    </div>
  );
}
