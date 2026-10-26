import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { AGENT_FAQS } from "@/lib/agent-faqs";
import {
  ANONYMOUS_DECISION_INPUT_BOUND_NOTE,
  anonymousDecisionUsedDescription,
} from "@/lib/anonymous-decision-copy";
import {
  PRODUCT_EVALUATION_COMPARISON_LIMIT,
  PRODUCT_EVALUATION_DEAL_LIMIT,
} from "@/lib/product-access";

/**
 * 2026-10 go-to-market audit, fix batch 18: copy that states the trial, the
 * no-signup decision and plan limits says what the code does.
 *
 *  - P1-07: the trial meters distinct input sets (lib/evaluation-resource-key
 *    hashes the whole validated form), so the surfaces say "Pro analyses" and
 *    that a rerun with changed inputs counts as a new one.
 *  - P1-38: the no-signup exact Offer Ceiling is bound to the inputs first run.
 *  - P1-39: the listing price lookup needs Pro or Agent Pro and its refusal is shown.
 *  - P1-58 / P2-119: two agent FAQ answers.
 *  - P1-71: the range sentence is true for a deal that misses its targets.
 *  - P2-156: the blurred Pro preview is hidden from assistive technology.
 *  - P1-10: comps lookups carry no monthly number (the shared RentCast pool
 *    is 50 requests a period site-wide); they are "subject to monthly availability".
 */

const read = (file: string) =>
  readFileSync(path.join(process.cwd(), file), "utf8");
const flat = (source: string) => source.replace(/\s+/g, " ");
const answer = (question: string) => {
  const faq = AGENT_FAQS.find((item) => item.q === question);
  if (!faq) throw new Error(`missing agent FAQ: ${question}`);
  return faq.a;
};

describe("trial wording says what is metered (P1-07)", () => {
  const RERUN = /Revisions to the same property do not use another trial analysis\./;

  it("the homepage Pro card", () => {
    const landing = flat(read("components/marketing/landing-sections.tsx"));
    expect(landing).toContain(
      '{PRODUCT_EVALUATION_DEAL_LIMIT} Pro analyses and{" "} {PRODUCT_EVALUATION_COMPARISON_LIMIT} comparison. Revisions to the same property do not use another trial analysis.',
    );
  });

  it("the homepage FAQ answers and the /for-investors hero note", () => {
    // Wave 6 integration: the two investor FAQ answers and the hero note
    // said "up to N Pro deals" / "completed Pro deals" beside a Pro card
    // that said "Pro analyses".
    const landing = read("components/marketing/landing-sections.tsx");
    expect(landing).toContain(
      "free trial with no card: ${PRODUCT_EVALUATION_DEAL_LIMIT} Pro analyses and ${PRODUCT_EVALUATION_COMPARISON_LIMIT} comparison. Revisions to the same property do not use another trial analysis.",
    );
    expect(landing).toContain(
      "days, ${PRODUCT_EVALUATION_DEAL_LIMIT} Pro analyses and ${PRODUCT_EVALUATION_COMPARISON_LIMIT} comparison. Revisions to the same property do not use another trial analysis.",
    );
    expect(landing).not.toMatch(/Pro deals\b[^\n]*comparison/);
    const investors = flat(read("app/for-investors/page.tsx"));
    expect(investors).toContain(
      '{PRODUCT_EVALUATION_DEAL_LIMIT} Pro analyses and{" "} {PRODUCT_EVALUATION_COMPARISON_LIMIT} comparison, no card. Revisions to the same property do not use another trial analysis.',
    );
    expect(investors).not.toMatch(/Pro deals\b/);
    expect(investors).not.toMatch(/\b\d+ Pro (?:analyses|deals)\b/);
  });

  it("/for-agents, in the pricing lede and the free-trial cell", () => {
    const page = flat(read("app/for-agents/page.tsx"));
    expect(page).toContain("{PRODUCT_EVALUATION_DEAL_LIMIT} Pro analyses and");
    expect(page).toContain("{PRODUCT_EVALUATION_DEAL_LIMIT} Pro analyses, no card.");
    expect(page.match(new RegExp(RERUN, "g"))?.length).toBe(2);
    expect(page).not.toMatch(/Pro deals\b/);
  });

  it("/pricing: the description, the card, the lede, the FAQ answer and the terms line", () => {
    const page = read("app/pricing/page.tsx");
    const card = read("app/pricing/opengraph-image.tsx");
    const plans = flat(read("components/marketing/pricing-toggle-plans.tsx"));
    expect(page).toContain(
      "-day free trial with ${EVALUATION_FACTS.dealLimit} Pro analyses and ${EVALUATION_FACTS.comparisonLimit} comparison.`",
    );
    expect(card).toContain(
      "-day free trial with ${PRODUCT_EVALUATION_DEAL_LIMIT} Pro analyses and ${PRODUCT_EVALUATION_COMPARISON_LIMIT} comparison.`",
    );
    expect(page).toContain(
      "days, ${EVALUATION_FACTS.dealLimit} ${proOfferName} analyses, and ${EVALUATION_FACTS.comparisonLimit} comparison",
    );
    expect(page).toContain(
      "days, ${EVALUATION_FACTS.dealLimit} Pro analyses and ${EVALUATION_FACTS.comparisonLimit} comparison. Revisions to the same property do not use another trial analysis.",
    );
    expect(plans).toContain(
      "{PRODUCT_EVALUATION_DEAL_LIMIT} Pro analyses and {PRODUCT_EVALUATION_COMPARISON_LIMIT} comparison. Revisions to the same property do not use another trial analysis.",
    );
    for (const source of [page, card, plans]) {
      expect(source).not.toMatch(/(?:Pro|proOfferName\}) deals\b[^\n]*comparison/);
      expect(source).not.toMatch(/Pro deal analyses/);
      expect(source).not.toMatch(/\b\d+ Pro (?:analyses|deals)\b/);
    }
  });

  it("llms-full.txt", () => {
    const route = read("app/llms-full.txt/route.ts");
    expect(route).toContain(
      "covering ${planFacts.evaluationDealLimit} Pro analyses and ${planFacts.evaluationComparisonLimit} comparison. Revisions to the same property do not use another trial analysis.",
    );
  });

  it("the agent FAQ answers that state the trial", () => {
    const source = read("lib/agent-faqs.ts");
    expect(source).not.toMatch(/Pro deals\b[^\n]*comparison/);
    expect(
      answer("What does the free trial include, and do I need a card?"),
    ).toMatch(
      new RegExp(
        `covers ${PRODUCT_EVALUATION_DEAL_LIMIT} Pro analyses and ${PRODUCT_EVALUATION_COMPARISON_LIMIT} comparison`,
      ),
    );
    expect(
      answer("What does the free trial include, and do I need a card?"),
    ).toContain("revisions to the same property do not use another trial analysis");
  });

  it("no number in these sentences is typed by hand", () => {
    for (const file of [
      "components/marketing/landing-sections.tsx",
      "app/for-agents/page.tsx",
      "app/llms-full.txt/route.ts",
      "lib/agent-faqs.ts",
    ]) {
      expect(flat(read(file))).not.toMatch(/\b\d+ Pro (?:analyses|deals)\b/);
    }
  });

  it("trial metering uses property identity while exact-result keys remain available", () => {
    // The copy above is true only while this holds. If metering moves to the
    // property, these sentences change with it.
    const key = read("lib/evaluation-resource-key.ts");
    expect(key).toContain(
      'property-v1',
    );
  });
});

describe("no-signup decision binding is said on the page (P1-38)", () => {
  it("states the binding and the way back, with limits from the constants", () => {
    expect(ANONYMOUS_DECISION_INPUT_BOUND_NOTE).toContain(
      "tied to the inputs you first ran in this browser",
    );
    expect(ANONYMOUS_DECISION_INPUT_BOUND_NOTE).toContain(
      "restoring the original inputs brings the exact figure back",
    );
    // A changed-input rerun can also read "No feasible downside case" or
    // "No feasible range", so the note must not promise a range.
    expect(ANONYMOUS_DECISION_INPUT_BOUND_NOTE).toContain(
      "shows a range at most, not the exact figure",
    );
    expect(ANONYMOUS_DECISION_INPUT_BOUND_NOTE).not.toContain(
      "shows the Offer Ceiling as a range",
    );
    const toast = anonymousDecisionUsedDescription();
    expect(toast).toContain("tied to the inputs you first ran");
    expect(toast).toContain("Restore the original inputs to get it back");
    expect(toast).toContain(
      `${PRODUCT_EVALUATION_DEAL_LIMIT} Pro analyses and ${PRODUCT_EVALUATION_COMPARISON_LIMIT} comparison, no card.`,
    );
    expect(read("lib/anonymous-decision-copy.ts")).not.toMatch(
      /\b\d+ Pro analyses\b|\b\d+ comparisons?\b/,
    );
  });

  it("the analyzer shows its own text for LIMIT_REACHED and the note beside Recalculate", () => {
    const analyzer = read("components/investcalc/investcalc-page.tsx");
    expect(flat(analyzer)).toContain(
      'anonymousGrant.code === "LIMIT_REACHED" ? anonymousDecisionUsedDescription() : anonymousGrant.message',
    );
    const bannerStart = analyzer.indexOf("{isEditingAssumptions && analysisResult ? (");
    const banner = analyzer.slice(
      bannerStart,
      analyzer.indexOf('data-edit-live-readout="true"', bannerStart),
    );
    expect(banner).toContain("{!isAuthenticated && anonymousDecisionClaimSeen ? (");
    expect(banner).toContain("{ANONYMOUS_DECISION_INPUT_BOUND_NOTE}");
    expect(banner).toContain("{primaryActionLabel}");
  });

  it("the server action still binds to the exact input set", () => {
    const action = read("app/actions/anonymous-decision.ts");
    expect(action).toContain("if (current.resourceKey !== resourceKey) {");
    expect(action).toContain("repeated: true");
  });
});

describe("listing paste says who gets the price (P1-39)", () => {
  it("the refusal is surfaced where the price is needed", () => {
    const analyzer = flat(read("components/investcalc/investcalc-page.tsx"));
    expect(analyzer).toContain(
      '!r.ok && r.code === "ENTITLEMENT_REQUIRED" && handoffStillCurrent()',
    );
    expect(analyzer).toContain("setListingLookupRefusedToken(detail.token);");
    const input = flat(read("components/investcalc/listing-link-input.tsx"));
    // The refusal note yields to the paused-pool note (2026-10-19): while the
    // shared RentCast pool is empty, no plan fills the price, so /pricing is
    // not offered there.
    expect(input).toContain("{priceLookupRefused && priceLookupPausedUntil == null ? (");
    expect(input).toContain(
      "Filling the asking price and property facts from a listing link needs a Pro or Agent Pro subscription.",
    );
    // A one-time purchase is not a subscription and is still refused, so the
    // line names the plans instead of saying "a paid plan".
    expect(input).not.toContain("needs a paid plan");
    expect(input).toContain('href="/pricing"');
  });

  it("the lookup is still refused without a paid subscription", () => {
    const comps = read("app/actions/property-comps.ts");
    expect(comps).toContain("if (parsed.data.proOnly && freeUser) {");
  });
});

describe("agent FAQ answers (P1-58, P2-119)", () => {
  it("cancelling promises only what a downgraded account keeps", () => {
    const a = answer("Can I cancel?");
    expect(a).not.toContain("saved work stays readable");
    expect(a).toContain("Your saved deals stay readable.");
    expect(a).toContain(
      "Your client roster and Buy Boxes are kept but are not shown on Free, and they return when you resubscribe.",
    );
    // The gates the sentence describes.
    expect(read("app/dashboard/clients/page.tsx")).toContain(
      '!hasPlanFeature(entitlements, "client_buy_box")',
    );
    expect(read("app/actions/agent-clients.ts")).toContain(
      "Client rosters are an Agent Pro feature.",
    );
  });

  it("the investment-advice answer states what TrueCap does, not a verdict on the agent", () => {
    const a = answer("Am I giving investment advice?");
    expect(a).not.toMatch(/^No\b/);
    expect(a).toMatch(/^TrueCap does not give investment advice:/);
    expect(a).toContain("your license and your brokerage");
  });
});

describe("range state is true for a deal that misses its targets (P1-71)", () => {
  const summary = read("components/investcalc/focused-decision-summary.tsx");

  it("no longer says the range meets the targets", () => {
    expect(summary).not.toContain("still meets your targets");
    expect(summary).toContain(
      "On your return targets, the modeled Offer Ceiling falls between ${money(rangePreview.lower)} and ${money(rangePreview.upper)}; this preview does not show the exact number.",
    );
    expect(summary).toContain(
      "On the return criteria shown, the highest price that still meets them falls in this range.",
    );
    // The caption says "this range" only when the headline prints the range.
    expect(summary).toContain(": offerCeilingHeadlineIsRange");
    const flag = summary.slice(
      summary.indexOf("const offerCeilingHeadlineIsRange ="),
      summary.indexOf("const offerCeilingHeadline = "),
    );
    for (const condition of [
      'targetResolutionState !== "loading"',
      'targetResolutionState !== "error"',
      "!isOfferCeilingLoading",
      "!offerCeilingError",
      "!canShowPriceCeiling",
      "rangePreview?.downsideFeasible",
    ]) {
      expect(flag).toContain(condition);
    }
  });

  it("the preview is still solved on the return targets alone", () => {
    const ceiling = read("lib/offer-ceiling.ts");
    expect(ceiling).toContain("maxPurchasePrice: _ignoredCallerCap,");
    expect(ceiling).toContain("maxCashRequired: _ignoredCallerCashCap,");
  });
});

describe("blurred Pro preview is hidden from assistive technology (P2-156)", () => {
  it("the blurred layer is aria-hidden and inert", () => {
    const dashboard = flat(read("components/investcalc/analysis-dashboard.tsx"));
    expect(dashboard).toContain(
      '<div aria-hidden="true" inert data-pro-preview-blur="" className="pointer-events-none select-none space-y-5 blur-[3px] opacity-70" >',
    );
  });
});

describe("comps carry no monthly allowance number (P1-10, re-anchored 2026-10-19)", () => {
  // The RentCast subscription moved to the free Developer plan: 50 REQUESTS a
  // billing period for the whole site (about 25 lookups). "Up to 50 comps
  // lookups per month" per account is false, so no page may name a monthly
  // comps number; they say "included, subject to monthly availability".
  const SURFACES = [
    "app/vs/rentometer/page.tsx",
    "app/vs/bricked/page.tsx",
    "app/vs/rentcast/page.tsx",
    "app/vs/mashvisor/page.tsx",
    "app/vs/privy/page.tsx",
    "app/blog/dealcheck-vs-biggerpockets-vs-truecap/page.tsx",
    "app/blog/best-free-rental-property-calculator-2026/page.tsx",
    "app/blog/dealcheck-vs-stessa-vs-truecap/page.tsx",
    "app/pricing/page.tsx",
    "app/actions/property-comps.ts",
    "components/investcalc/property-comps-card.tsx",
    "components/investcalc/investcalc-page.tsx",
    "lib/entitlements-catalog.ts",
  ];

  it("no surface promises a number of comps lookups per month", () => {
    for (const file of SURFACES) {
      const source = flat(read(file));
      expect(source, file).not.toMatch(
        /\b\d+ (?:comps? )?lookups? (?:per|a) month|\bup to \d+ (?:per month|comps?|lookups?)|\d+ ?\/ ?mo\b.{0,40}comps|comps.{0,60}\d+ ?\/ ?mo\b/i,
      );
    }
  });

  it("the /vs and blog sentences say the lookups are subject to monthly availability", () => {
    for (const file of SURFACES.slice(0, 8)) {
      expect(flat(read(file)), file).toMatch(/subject to monthly availability/);
    }
  });

  it("the /pricing table cell says included, subject to availability, in the Pro and Agent Pro columns", () => {
    // The Agent Pro column inherits the Pro cell (AGENT_PRO_CELLS has no
    // comps entry), so one cell covers both paid columns.
    const page = read("app/pricing/page.tsx");
    expect(page).toContain(
      '["Sale + rent comps from the address", "1 free", "Included, subject to availability"],',
    );
    expect(page).not.toMatch(/"Sale \+ rent comps from the address":/);
    expect(read("lib/entitlements-catalog.ts")).toContain(
      'proLimit: "included, subject to availability"',
    );
  });
});
