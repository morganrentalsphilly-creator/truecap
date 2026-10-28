/**
 * The plan cards' answer rows: one source for the homepage's plans
 * (components/home/plans-toggle.tsx through landing-sections.tsx) and
 * /pricing (components/marketing/pricing-toggle-plans.tsx), so the two pages
 * cannot describe a tier differently at the moment someone decides to pay.
 *
 * Every row that maps to an entitlement is gated on lib/entitlements-catalog
 * (the single source of truth for what each tier includes) and any limit in
 * it is the catalog's own qualifier, never typed here. The Agent Pro rows
 * state the caps the code enforces: 100 clients
 * (app/actions/agent-clients.ts MAX_CLIENTS) and 100 Buy Boxes per Agent Pro account
 * (app/actions/user-buy-boxes.ts MAX_BUY_BOXES); lib/__tests__ pins both to
 * the constants. No price lives here: amounts come from lib/public-pricing.ts
 * and Stripe through the cadence toggle.
 *
 * Plain TypeScript (no JSX, no client directive), so a server section and a
 * client island import the same rows.
 */

import type { PlanCardAnswer } from "@/components/marketing/plan-card";
import { featuresForTier, ladderCellsForFeature, type FeatureKey } from "@/lib/entitlements-catalog";

/** A tier's cell from the catalog ladder: the free column is index 0, Pro index 2. */
function freeCell(key: FeatureKey): boolean | string {
  return ladderCellsForFeature(key)[0];
}
function proCell(key: FeatureKey): boolean | string {
  return ladderCellsForFeature(key)[2];
}

/** Free: the complete first decision, what every deal after it shows, sharing, and the save cap. */
export function freePlanAnswers(): PlanCardAnswer[] {
  const saves = freeCell("save_deal");
  return [
    {
      term: "Your first decision",
      detail:
        "Complete: cash flow, cap rate, CoC, DSCR, Buy Box fit, the Offer Ceiling, downside checks, and next steps.",
    },
    ...(freeCell("cash_flow") === true && freeCell("deal_score") === true
      ? [{ term: "Every deal after that", detail: "Cash flow, cap rate, CoC, DSCR, and the 0–100 Deal score." }]
      : []),
    ...(freeCell("share_links") === true ? [{ term: "Shareable read-only deal links" }] : []),
    // Free can create saves up to its cap; editing a saved deal is Pro
    // (app/actions/saved-analyses.ts), and the row says so.
    ...(typeof saves === "string" ? [{ term: "Saved deals", detail: `${saves} (editing saved deals is Pro).` }] : []),
  ];
}

/** Pro: the four questions it answers on every deal, each row gated on the catalog. */
export function proPlanAnswers(): PlanCardAnswer[] {
  const compares = proCell("compare_deals");
  return [
    ...(proCell("buy_box") === true ? [{ term: "Does it meet my criteria?", detail: "Buy Box fit on every deal, with up to 12 Buy Boxes for your strategies and markets." }] : []),
    ...(proCell("mao") === true
      ? [{ term: "What is my Offer Ceiling?", detail: "The highest price that still meets your targets, on every deal." }]
      : []),
    ...(proCell("sensitivity") === true ? [{ term: "What could make it fail?", detail: "Downside sensitivity checks." }] : []),
    {
      term: "Can I defend the analysis?",
      detail:
        typeof compares === "string"
          ? `The decision memo, and deals side by side (${compares.toLowerCase()}).`
          : "The decision memo.",
    },
  ];
}

/**
 * Agent-only entitlements the rows below already spell out: the catalog's
 * one-line label would repeat them.
 */
const AGENT_PRO_WORKFLOW_FEATURES = new Set<FeatureKey>(["client_buy_box"]);

/**
 * Agent Pro: only what it adds to Pro, with the caps the code enforces, plus
 * the label of any other shipped agent-only entitlement the catalog gains
 * (an unshipped one is never advertised: `shipped: false` fails closed).
 * Co-branding is Pro too, so it is the card's note, not a row.
 */
export function agentProPlanAnswers(): PlanCardAnswer[] {
  const catalogRows: PlanCardAnswer[] = featuresForTier("agent_pro")
    .filter((f) => !f.tiers.includes("pro"))
    .filter((f) => f.shipped !== false)
    .filter((f) => !AGENT_PRO_WORKFLOW_FEATURES.has(f.key))
    .map((f) => ({ term: f.label }));
  return [
    { term: "Client Buy Boxes", detail: "Up to 100 clients on your roster; up to 100 Buy Boxes per account." },
    {
      term: "Deals screened to their targets",
      detail: "Screen one saved property against your active clients' targets and financing; save each match separately.",
    },
    { term: "Client-report share links", detail: "Open without an account; the address stays hidden unless you include it." },
    ...catalogRows,
  ];
}
