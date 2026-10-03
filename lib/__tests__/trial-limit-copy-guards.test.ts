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
 *  - P1-10: comps are "up to 50" a month.
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
  const RERUN = /A rerun with changed inputs counts as a new (?:analysis|one)\./;

  it("the homepage Pro card", () => {
    const landing = flat(read("components/marketing/landing-sections.tsx"));
    expect(landing).toContain(
      '{PRODUCT_EVALUATION_DEAL_LIMIT} Pro analyses and{" "} {PRODUCT_EVALUATION_COMPARISON_LIMIT} comparison. A rerun with changed inputs counts as a new analysis.',
    );
  });

  it("the homepage FAQ answers and the /for-investors hero note", () => {
    // Wave 6 integration: the two investor FAQ answers and the hero note
    // said "up to N Pro deals" / "completed Pro deals" beside a Pro card
    // that said "Pro analyses".
    const landing = read("components/marketing/landing-sections.tsx");
    expect(landing).toContain(
      "free trial with no card: ${PRODUCT_EVALUATION_DEAL_LIMIT} Pro analyses and ${PRODUCT_EVALUATION_COMPARISON_LIMIT} comparison. A rerun with changed inputs counts as a new analysis.",
    );
    expect(landing).toContain(
      "days, ${PRODUCT_EVALUATION_DEAL_LIMIT} Pro analyses and ${PRODUCT_EVALUATION_COMPARISON_LIMIT} comparison. A rerun with changed inputs counts as a new analysis.",
    );
    expect(landing).not.toMatch(/Pro deals\b[^\n]*comparison/);
    const investors = flat(read("app/for-investors/page.tsx"));
    expect(investors).toContain(
      '{PRODUCT_EVALUATION_DEAL_LIMIT} Pro analyses and{" "} {PRODUCT_EVALUATION_COMPARISON_LIMIT} comparison, no card. A rerun with changed inputs counts as a new analysis.',
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

  it("llms-full.txt", () => {
    const route = read("app/llms-full.txt/route.ts");
    expect(route).toContain(
      "covering ${planFacts.evaluationDealLimit} Pro analyses and ${planFacts.evaluationComparisonLimit} comparison. A rerun with changed inputs counts as a new analysis.",
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
    ).toContain("a rerun with changed inputs counts as a new analysis");
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

  it("the metering key is still the whole validated form", () => {
    // The copy above is true only while this holds. If metering moves to the
    // property, these sentences change with it.
    const key = read("lib/evaluation-resource-key.ts");
    expect(key).toContain(
      'buildEvaluationResourceKey("deal", JSON.stringify(parsed.data))',
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
    expect(input).toContain("{priceLookupRefused ? (");
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

describe("comps are up to 50 a month (P1-10)", () => {
  it("the /vs and blog sentences say up to", () => {
    for (const file of [
      "app/vs/rentometer/page.tsx",
      "app/vs/bricked/page.tsx",
      "app/vs/rentcast/page.tsx",
      "app/vs/mashvisor/page.tsx",
      "app/vs/privy/page.tsx",
      "app/blog/dealcheck-vs-biggerpockets-vs-truecap/page.tsx",
      "app/blog/best-free-rental-property-calculator-2026/page.tsx",
      "app/blog/dealcheck-vs-stessa-vs-truecap/page.tsx",
    ]) {
      const source = flat(read(file));
      const mentions = source.match(/.{0,12}\b50 (?:per month|comps? lookups per month)/g) ?? [];
      expect(mentions.length, file).toBeGreaterThan(0);
      for (const mention of mentions) {
        expect(mention, file).toMatch(/up to 50 /);
      }
    }
  });
});
